- Start Date: 2020-04-19
- RFC PR: [#64284](https://github.com/elastic/kibana/pull/64284)
- Kibana Issue: [#61657](https://github.com/elastic/kibana/issues/61657)

# Summary

A core API exposed on both public and server sides, allowing to search for various objects and
register result providers.

# Basic example

- registering a result provider:

```ts
coreSetup.globalSearch.registerResultProvider({
  id: 'my_provider',
  find: (term, options, context) => {
    const resultPromise = myService.search(term, context.core.savedObjects.client);
    return from(resultPromise);
  },
});
```

- using the `find` API from the client-side:

```ts
coreStart.globalSearch.find('some term').subscribe(({ results, complete }) => {
    showAsyncSearchIndicator(!complete);
    updateResults(results);
});
```

# Motivation

Kibana should do it's best to assist users searching for and navigating to the various objects present on the Kibana platform.

We should expose an API to make it possible for plugins to search for the various objects present on a Kibana instance.

The first consumer of this API will be the global search bar [#57576](https://github.com/elastic/kibana/issues/57576). This API
should still be generic to answer similar needs from any other consumer, either client or server side.

# Detailed design

## API Design

### Result provider API

#### common types

```ts
/**
 * Static list of all the possible result types.
 * Ordinal value matters here, as it will be used to sort results of different types.
 */
enum SEARCH_TYPE {
  // non-exhaustive
  applications = 10,
  dashboard = 20,
  visualization = 30,
  search = 40,
}

/** @public */
type GlobalSearchResultType = keyof typeof SEARCH_TYPE;

/**
 * Options provided to {@link GlobalSearchResultProvider | result providers} `find` method.
 * Currently empty and only present to keep the API future-proof.
 */
interface GlobalSearchOptions {}

/**
 * Representation of a result returned by a {@linlkGlobalSearchResultProvider | result provider}
 */
interface GlobalSearchResult {
  /** an id that should be unique for an individual provider's results */
  id: string;
  /** the title/label of the result */
  title: string;
  /** the type of result */
  type: GlobalSearchResultType;
  /** an optional EUI icon name to associate with the search result. If not specified, will use a default icon */
  icon?: string;
  /** The url to navigate to this result. This can be either an absolute url, or a path relative to the performing request's basePath */
  url: string;
  /** the score of the result, from 1 (lowest) to 100 (highest) */
  score: number;
  /** an optional record of metadata for this result */
  meta?: Record<string, any>;
}
```

#### server

```ts
/**
 * Context passed to server-side {@GlobalSearchResultProvider | result provider}'s `find` method.
 */
export interface GlobalSearchProviderContext {
  request: KibanaRequest;
  core: {
    savedObjects: {
      client: SavedObjectsClientContract;
      typeRegistry: ISavedObjectTypeRegistry;
    };
    elasticsearch: {
      legacy: {
        client: IScopedClusterClient;
      };
    };
    uiSettings: {
      client: IUiSettingsClient;
    };
  };
}

/**
 * GlobalSearch result provider, to be registered using the {@link GlobalSearchSetup | global search API}
 */
type GlobalSearchResultProvider = {
  id: string;
  find(
    term: string,
    options: GlobalSearchOptions,
    context: GlobalSearchProviderContext
  ): Observable<GlobalSearchResult[]>;
};
```

Notes: 
- initial implementation will only provide a static / non extensible `GlobalSearchProviderContext` context.
It would be possible to allow plugins to register their own context providers as it's done for `RequestHandlerContext`,
but this will not be done until the need arises.
- Because of the previous point, the performing `request` object is also exposed on the context to allow result providers
to scope their custom services if needed.

#### public

```ts
/**
 * GlobalSearch result provider, to be registered using the {@link GlobalSearchSetup | global search API}
 */
type GlobalSearchResultProvider = {
  id: string;
  find(
    term: string,
    options: GlobalSearchOptions,
  ): Observable<GlobalSearchResult[]>;
};
```

Notes: 
- The client-side version of `GlobalSearchResultProvider` is slightly difference than the 
server one, as there is no `context` parameter on the `find` signature.

### Plugin API

#### common types

```ts
/**
 * Response returned from the {@link GlobalSearchServiceStart | global search service}'s `find` API
 */
type GlobalSearchResponse<ResultType extends GlobalSearchResult = GlobalSearchResult> = {
  /**
   * Current results fetched from the providers.
   */
  results: ResultType[];
  /**
   * Is the search complete. Will only be true during the last emission of the `GlobalSearchServiceStart.search` result observable.
   * A search is considered complete either when all underlying providers completed their observable, or when the timeout is reached.
   */
  complete: boolean;
};
```

#### server API

```ts
/** @public */
interface GlobalSearchServiceSetup {
  registerResultProvider(provider: GlobalSearchResultProvider);
}

/** @public */
interface GlobalSearchServiceStart {
  find(
    term: string,
    options: GlobalSearchOptions,
    request: KibanaRequest
  ): Observable<GlobalSearchResponse>;
}
```

#### public API

```ts
/**
 * Enhanced {@link GlobalSearchResult | result type} for the client-side,
 * to allow navigating to a given result.
 */
interface NavigableGlobalSearchResult extends GlobalSearchResult {
  /**
   * Navigate to this result's associated url. If the result is on this kibana instance, user will be redirected to it 
   * in a SPA friendly way using `application.navigateTo`, else, a full page refresh will be performed.
   */
  navigateTo: () => void;
}

/** @public */
interface GlobalSearchServiceSetup {
  registerResultProvider(provider: GlobalSearchResultProvider);
}

/** @public */
interface GlobalSearchServiceStart {
  find(
    term: string,
    options: GlobalSearchOptions,
  ): Observable<GlobalSearchResponse<NavigableGlobalSearchResult>>;
}
```

Notes: 
- The public API is very similar to its server counterpart. The differences are:
  - The `registerResultProvider` setup APIs share the same signature, however the input `GlobalSearchResultProvider` 
  types are different on the client and server.
  - The `find` start API signature got a `KibanaRequest` for `server`, when this parameter is not present for `public`.
- The `find` API returns a observable of `NavigableGlobalSearchResult` instead of plain `GlobalSearchResult`. This type 
is here to enhance results with a `navigateTo` method to let `core` handle the navigation logic, which is 
non-trivial. See the [Redirecting to a result](#redirecting-to-a-result) section for more info.

#### http API

An HTTP API will be exposed on `/api/core/global_search/find` to allow the client-side `GlobalSearchService` 
to fetch results from the server-side result providers.

It should be very close to:

```ts
router.post(
  {
    path: '/api/core/global_search/find',
    validate: {
      body: schema.object({
        term: schema.string(),
        options: schema.maybe(schema.object({})),
      }),
    },
  },
  async (ctx, req, res) => {
    const { term, options } = req.body;
    const results = await ctx.core.globalSearch
      .find(term, options)
      .pipe(last())
      .toPromise();
    return res.ok({
      body: {
        results,
      },
    });
  }
);
```

Notes: 
- A new `globalSearch` service will be exposed on core's `RequestHandlerContext` to wrap a `find` call with current request.
- This API should be considered internal until we'll officially need to expose it for external consumers such as ChatOps.
- Initial implementation will await for all results and then return them as a single response.  As it's supported by 
  the service, it could theoretically be possible to stream the results instead, however that makes the consumption of
  the API from the client more difficult. If this become important at some point, a new `/api/core/global_search/find/async` 
  endpoint could be added.
  
## Functional behavior

### summary

- `coreSetup.globalService` exposes an API to be able to register result providers (`GlobalSearchResultProvider`). 
  These providers can be registered from either public or server side, even if the interface for each side is not 
  exactly the same.
- `coreStart.globalService` exposes an API to be able to search for objects. This API is available from both public
  and server sides. 
  - When using the server `find` API, only results from providers registered from the server will be returned. 
  - When using the public `find` API, results from provider registered from either server and public sides will be returned.
- During a `find` call, the service will call all the registered result providers and collect their result observables.
  Every time a result provider emits some new results, the `globalSearch` service will:
  - Consolidate/enhance them
  - Merge them with the already present results
  - Sort and order the new aggregated results
  - Emit this up to date list of results

### result provider registration

Due to the fact that some kind of results (i.e `application`, and maybe later `management_section`) only exists on 
the public side of Kibana and therefor are not known on the server side, the `registerResultProvider` API will be 
available both from the public and the server counterpart of the `GlobalSearchService`.

However, as results from providers registered from the client-side will not be available from the server's `find` API, 
registering result providers from the client should only be done to answer this specific use case and will be 
discouraged, by providing appropriated jsdoc and documentation explaining that it should only
be used when it is not technically possible to register it from the server side instead.

### results url consolidation

When retrieving results from providers, the GS service will always start by consolidating them. The most notable (and
currently only) step is to convert the result url to an absolute one.

#### absolute url conversion logic

Results returned from the GlobalSearch's `find` programmatic and HTTP APIs will all contains absolute urls for the following
reasons:
- It would not be usable by external consumers otherwise. 
- Some result providers are supposed to be returning results from outside of the current `basePath`, or even from outside of the
  Kibana instance (ie: results from another space, results from another Kibana instance in a cloud cluster)

However, as forging absolute urls can be a tedious process for the plugins, the `url` property of results returned by
a result provider can be either an absolute url or an url path relative to the executing request's `basePath`.

I.E are considered valid:
- `https://my-other-kibana-instance/some/result`
- `/app/kibana#/dashboard/some-id`

When consolidating the result, the logic regarding the `url` property is:
- if the `url` is absolute, return it unchanged
- if the `url` is a relative path (starts with `/`), it will be converted to an absolute url by prepending the Kibana
instance's newly introduced `publicAddress`.

#### server.publicAddress

Given the fact that some Kibana deployments have complex architecture (proxies, rewrite rules...), there is currently
no reliable way to know for sure what the public address used to access kibana is (at least from the server-side).

A new `server.publicAddress` property will be added to the kibana configuration, allowing ops to explicitly define the public
address to instance is accessible from. This property is only meant to be used to generate 'links' to arbitrary resources
and will not be used to configure the http server in any way.

When not explicitly defined, this property will be computed using the known `server` configuration values:

```ts
const defaultPublicAddress = removeTrailingSlash(
  `${getServerInfo().protocol}://${httpConfig.host}:${httpConfig.port}/${httpConfig.basePath}`
);

const getPublicAddress = () => httpConfig.publicAddress ?? defaultPublicAddress;
```

A new `getAbsoluteUrl` api will also be added to the core `http` service contract:

```ts
const getAbsoluteUrl = (path: string, request: KibanaRequest) => {
  const publicUrl = getPublicAddress();
  const absoluteUrl = joinRemovingDuplicateAndTrailingSlash(
    publicUrl,
    // note: this is actually wrong. We would need the `requestScopePath` here
    // as this currently returns `${this.serverBasePath}${requestScopePath}` and the basePath
    // is already included in `publicAddress`
    serverContract.basePath.get(request), 
    path
  );
}
```

Search results will then be consolidated before being returned to convert relative urls to absolute ones:

```ts
const consolidateResult(result: GlobalSearchResult, request: KibanaRequest) {
  if(isUrlPath(result.url)) {
    result.url = http.getAbsoluteUrl(result.url, request)
  }
}
```

#### Redirecting to a result

Having absolute urls in GS results is a necessity for external consumers, and makes the API more consistent than mixing
relative and absolute urls, however this makes it less trivial for UI consumers to redirect to a given result in a SPA
friendly way (using `application.navigateTo` instead of triggering a full page refresh).

This is why `NavigableGlobalSearchResult.navigateTo` has been introduced, to let `core` handles this navigation logic.

When using `navigateTo` from a result instance, the following logic will be executed:

If all 3 of these criteria are true for `result.url`:
- The domain of the URL  matches the domain of the `publicUrl`
- The pathname of the URL starts with the current basePath (eg. /mybasepath/s/my-space)
- The pathname segment after the basePath matches an application route (eg. /app/<id>/)

Then: match the pathname segment to the corresponding application and do the SPA navigation to that application using 
the remaining pathname segment

Otherwise: do a full page navigation (`window.location.assign()`)

### searching from the server side

When calling `GlobalSearchServiceStart.find` from the server-side service:

- the service will call `find` on each server-side registered result provider and collect the resulting result observables

- then, the service will merge every result observable and trigger the next step on every emission until either
    - A predefined timeout duration is reached
    - All result observables are completed
   
- on every emission of the merged observable, the results will be aggregated to the existing list and sorted following 
the logic defined in the [results aggregation](#results-aggregation) section

A very naive implementation of this behavior would be:

```ts
search(
  term: string,
  options: GlobalSearchOptions,
  request: KibanaRequest
): Observable<GlobalSearchResponse> {
  const fromProviders$ = this.providers.map(p =>
    p.find(term, options, contextFromRequest(request))
  );
  const results: GlobalSearchResult[] = [];
  return merge([...fromProviders$]).pipe(
    takeUntil(timeout$),
    map(newResults => {
      results.push(...newResults);
      return order(results);
    }),
  );
}
```

### searching from the client side

When calling `GlobalSearchServiceStart.find` from the public-side service:

- The service will call:
  - the server-side API via an http call to fetch results from the server-side result providers
  - `find` on each client-side registered result provider and collect the resulting observables

- Then, the service will merge every result observable and trigger the next step on every emission until either
  - A predefined timeout duration is reached
  - All result observables are completed
   
- On every emission of the merged observable, the results will be aggregated to the existing list and sorted following 
the logic defined in the [results aggregation](#results-aggregation) section

A very naive implementation of this behavior would be:

```
search(
  term: string,
  options: GlobalSearchOptions,
): Observable<GlobalSearchResponse> {
  const fromProviders$ = this.providers.map(p =>
    p.find(term, options)
  );
  const fromServer$ = of(this.fetchServerResults(term, options))

  const results: GlobalSearchResult[] = [];
  return merge([...fromProviders$, fromServer$]).pipe(
    takeUntil(timeout$),
    map(newResults => {
      results.push(...newResults);
      return order(results);
    }),
  );
}
```

Notes: 
- Due to the complexity of the process, the initial implementation will not be streaming results from the server,
meaning that all results from server-side registered providers will all be fetched at the same time (via a 'classic' 
http call to the GS endpoint). The observable-based API architecture is ready for this however, and the enhancement 
could be added at a later time.

### results aggregation

On every emission of an underlying provider, the service will aggregate the new results with the existing list and 
sort the results following this logic before emitting them:

- Results will be sorted by ascending `type` ordinal value.
- Results of a same `type` will then be sorted by descending `score` value.

This is an equivalent of the following lodash call:

```ts
const sorted = _.sortBy(unsorted, [r => SEARCH_TYPE[r.type], 'score'], ['asc', 'desc']);
```

For example, given this list of unsorted results:

```ts
const unsorted = [
  { id: 'viz-1', type: 'visualization', score: 100 },
  { id: 'dash-2', type: 'dashboard', score: 25 },
  { id: 'app-1', type: 'application', score: 50 },
  { id: 'dash-1', type: 'dashboard', score: 50 },
  { id: 'app-1', type: 'application', score: 100 },
];
```

the resulting sorted results would be:

```ts
const sorted = [
  { id: 'app-1', type: 'application', score: 100 },
  { id: 'app-1', type: 'application', score: 50 },
  { id: 'dash-1', type: 'dashboard', score: 50 },
  { id: 'dash-2', type: 'dashboard', score: 25 },
  { id: 'viz-1', type: 'visualization', score: 100 },
];
```

#### Note on score value

Due to the fact that the results will be coming from various providers, from multiple ES queries or even not from ES,
using a centralized scoring mechanism is not possible.

the `GlobalSearchResult` contains a `score` field, with an expected value going from 1 (lowest) to 100 (highest).
How this field is populated from each individual provider is considered an implementation detail.

### Search cancellation

In initial implementation, once triggered, a given call to `GlobalSearchServiceStart.find` 
(and underlying search provider's `find` method) cannot be canceled, neither from the public nor server API.

# Drawbacks

See alternatives.

# Alternatives

## Result providers could be only registrable from the server-side API

The fact that some kind of results, and therefor some result providers, must be on the client-side complexifies the API,
while making these results not available from the server-side and HTTP APIs.

We could decide to only allow providers registration from the server-side. It would reduce API exposure, while simplifying
the service implementation. However to do that, we would need to find a solution to be able to implement a server-side
 result provider for `application` (and later `management_section`) type provider.

I will directly exclude the option to move the `application` registration (`core.application.register`) from client 
to server-side, as it's going the opposite way of the KP philosophy while also being an heavy breaking change.

### AST parsing

One option to make the `application` results 'visible' from the server-side would be to parse the client code at build time
using AST to find all usages to `application.register` inspect the parameters, and generates a server file 
containing the applications. The server-side `application` result provider would then just read this file and uses it 
to return application results.

However
- At the parsing would be done at build time, we would not be able to generate entries for any 3rd party plugins
- As entries for every existing applications would be generated, the search provider would to be able to know which
applications are actually enabled/accessible at runtime to filter them, which is all but easy
- It will also not contains test plugin apps, making it really hard to FTR
- AST parsing is a complex mechanism for an already unsatisfactory alternative
 
### Duplicated server-side `application.register` API 
 
One other option would be to duplicate the `application.register` API on the server side, with a subset of the 
client-side metadata.

```ts
core.application.register({
  id: 'app_status',
  title: 'App Status',
  euiIconType: 'snowflake'
});
```

This way, the applications could be searchable from the server using this server-side `applications` registry.

However
- It forces plugin developers to add this API call. In addition to be a very poor developer experience, it can also
  very easily be forgotten, making a given app non searchable
- client-side only plugins would need to add a server-side part to their plugin just to register their application on
  the server side
  
## `GlobalSearchResult.url` could be a struct instead of a url for internal results.

The initial idea for `GlobalSearchResult.url` was to have a polymorphic structure instead of just a string:

```ts
url: { absUrl: string } | { application: string; path?: string };
```

That was making it way easier to redirect to an internal result from the UI, as we could directly call
`application.navigateTo(application, { path })`.

However, that didn't bring answer for the (future) need to be able to search for and redirect to object in 
different spaces. We could then have changed the structure to

```ts
url: { absUrl: string } | { application: string; path?: string, space?: string };
```

But this had some caveats:
- `space` is an xpack plugin, adding this `space` property in an oss part of the code is problematic
- The `space` API is not callable from core or oss, meaning that we would have to 'forge' the url to this space anyway
- this is really not generic. If another plugin was to alter the basepath in another way, we would have needed to add it another property 

So even if the 'parsable absolute url' approach seems fragile, it still felt better than this alternative.

## We could use plain string instead of an enum for `GlobalSearchResult.type`

The current static enum used for type

```ts
enum SEARCH_TYPE {
  // non-exhaustive
  applications = 10,
  dashboard = 20,
  visualization = 30,
  search = 40,
}

/** @public */
type GlobalSearchResultType = keyof typeof SEARCH_TYPE;

interface GlobalSearchResult {
  // [...]
  type: GlobalSearchResultType;
}
```

has some limitations:
- It forces the enum to be modified every time a new type is added
- 3rd party plugins cannot introduce new types

We could change the API to accept plain strings for `GlobalSearchResult.type`. However, atm this enum approach 
is needed as the ordinal values of the entries is used in results sorting. Changing to plain strings forces to find 
an alternative sorting logic.

## triggered searches could be cancelable

In current specifications, once a search has been triggered, it's not possible to cancel it (see [Search cancellation](#search-cancellation))

Main drawback of this decision is that if a `find` API consumer is going to perform multiple `find` requests and 
only uses the last one (For example in the UI, a debounced `find` triggered on end-user keypress: On every new keypress,
a new search is performed and the previous, potentially still executing, `find` call will still be executed), it can't
cancel the previous active search, resulting on potential useless http calls and resources consumption.

We could add an optional cancellation signal or observable in `GlobalSearchOptions` and propagate it to result providers.
That way `find` calls could be aborted.

However result providers would still have to manually handles this signal to cancel any http call or 
other asynchronous task that could be pending. 

Notes:
- As this can be implemented with an additional option, this would be a non-breaking change and so could be done at 
  a later time (even if it means that existing result provider would not handles this option until they implements it).

## The GlobalSearch service could be provided as a plugin instead of a core service

The GlobalSearch API could be provided and exposed from a plugin instead of `core`.

Pros:
- Less `core` API exposure

Cons:
- We know our initial consumer of this API is going to use it from/for the chrome header component, and because this component 
  is in `core`, that would mean creating a bridge of some kind to be able to use the service from core, as plugin APIs
  are not usable here.
- The platform team is going to provide the base result providers for SO and application search results, so having the GS
  service in a plugin would mean creating yet another plugin for these providers instead of having them self contained
  in core. 
- We are probably going to be adding internal SO APIs for the SO result provider, as current APIs are not sufficient to
  search for multiple type of SO at the same time. It would be better if these APIs were kept internal, which would
  not be possible if the SO provider is in a plugin instead of core.

# Adoption strategy

The `globalSearch` service is a new feature provided by the `core` API. Also, the base providers
used to search for saved objects and applications will be implemented by the platform team, meaning
that by default, plugin developers won't have to do anything.

Plugins that wish to expose additional result providers will easily be able to do so by using the exposed APIs and
documentation.

# How we teach this

This follows the same patterns we have used for other Core APIs: Observables subscriptions, etc.

This should be taught using the same channels we've leveraged for other Kibana Platform APIs, API documentation mostly.

# Unresolved questions

## terminology / naming

Are the current types, services and api names acceptable:
   - `GlobalSearch` ts prefix
   - `core.globalSearch` / `GlobalSearchService`
   - `GlobalSearchResultProvider`
   - `core.globalSearch.find`

     