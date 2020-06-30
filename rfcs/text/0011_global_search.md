- Start Date: 2020-04-19
- RFC PR: [#64284](https://github.com/elastic/kibana/pull/64284)
- Kibana Issue: [#61657](https://github.com/elastic/kibana/issues/61657)

# Summary

A new Kibana plugin exposing an API on both public and server side, to allow consumers to search for various objects and
register result providers.

Note: whether this will be an oss or xpack plugin still depends on https://github.com/elastic/dev/issues/1404.

# Basic example

- registering a result provider:

```ts
setupDeps.globalSearch.registerResultProvider({
  id: 'my_provider',
  find: (term, options, context) => {
    const resultPromise = myService.search(term, context.core.savedObjects.client);
    return from(resultPromise);
  },
});
```

- using the `find` API from the client-side:

```ts
startDeps.globalSearch.find('some term').subscribe(
  ({ results }) => {
    updateResults(results);
  },
  () => {},
  () => {
    showAsyncSearchIndicator(false);
  }
);
```

# Motivation

Kibana should do its best to assist users searching for and navigating to the various objects present on the Kibana platform.

We should expose an API to make it possible for plugins to search for the various objects present on a Kibana instance.

The first consumer of this API will be the global search bar [#57576](https://github.com/elastic/kibana/issues/57576). This API
should still be generic to answer similar needs from any other consumer, either client or server side.

# Detailed design

## API Design

### Result provider API

#### common types

```ts
/**
 * Static, non exhaustive list of the common search types.
 * Only present to allow consumers and result providers to have aliases to the most common types.
 */
enum GlobalSearchCommonResultTypes {
  application = 'application',
  dashboard = 'dashboard',
  visualization = 'visualization',
  search = 'search',
}

/**
 * Options provided to {@link GlobalSearchResultProvider | result providers} `find` method.
 */
interface GlobalSearchProviderFindOptions {
  /**
   * A custom preference token associated with a search 'session' that should be used to get consistent scoring
   * when performing calls to ES. Can also be used as a 'session' token for providers returning data from elsewhere
   * than an elasticsearch cluster.
   */
  preference: string;
  /**
   * Observable that emit once if and when the `find` call has been aborted by the consumer, or when the timeout period as been reached.
   * When a `find` request is aborted, the service will stop emitting any new result to the consumer anyway, but
   * this can (and should) be used to cancel any pending asynchronous task and complete the result observable.
   */
  aborted$: Observable<void>;
  /**
   * The total maximum number of results (including all batches / emissions) that should be returned by the provider for a given `find` request.
   * Any result emitted exceeding this quota will be ignored by the service and not emitted to the consumer. 
   */
  maxResults: number;
}

/**
 * Representation of a result returned by a {@link GlobalSearchResultProvider | result provider}
 */
interface GlobalSearchProviderResult {
  /** an id that should be unique for an individual provider's results */
  id: string;
  /** the title/label of the result */
  title: string;
  /** the type of result */
  type: string;
  /** an optional EUI icon name to associate with the search result */
  icon?: string;
  /**
   * The url associated with this result.
   * This can be either an absolute url, a path relative to the basePath, or a structure specifying if the basePath should be prepended.
   *
   * @example
   * `result.url = 'https://kibana-instance:8080/base-path/app/my-app/my-result-type/id';`
   * `result.url = '/app/my-app/my-result-type/id';`
   * `result.url = { path: '/base-path/app/my-app/my-result-type/id', prependBasePath: false };`
  */
  url: string | { path: string; prependBasePath: boolean };
  /** the score of the result, from 1 (lowest) to 100 (highest) */
  score: number;
  /** an optional record of metadata for this result */
  meta?: Record<string, Serializable>;
}
```

Notes:

- The `Serializable` type should be implemented and exposed from `core`. A basic implementation could be:

```ts
type Serializable = string | number | boolean | PrimitiveArray | PrimitiveRecord;
interface PrimitiveArray extends Array<Serializable> {}
interface PrimitiveRecord extends Record<string, Serializable> {}
```

#### server

```ts
/**
 * Context passed to server-side {@GlobalSearchResultProvider | result provider}'s `find` method.
 */
export interface GlobalSearchProviderContext {
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
    options: GlobalSearchProviderFindOptions,
    context: GlobalSearchProviderContext
  ): Observable<GlobalSearchProviderResult[]>;
};
```

Notes:

- Initial implementation will only provide a static / non extensible `GlobalSearchProviderContext` context.
  It would be possible to allow plugins to register their own context providers as it's done for `RequestHandlerContext`,
  but this will not be done until the need arises.
- The performing `request` object could also be exposed on the context to allow result providers
  to scope their custom services if needed. However as the previous option, this should only be done once needed.

#### public

```ts
/**
 * GlobalSearch result provider, to be registered using the {@link GlobalSearchSetup | global search API}
 */
type GlobalSearchResultProvider = {
  id: string;
  find(
    term: string,
    options: GlobalSearchProviderFindOptions
  ): Observable<GlobalSearchProviderResult[]>;
};
```

Notes:

- The client-side version of `GlobalSearchResultProvider` is slightly different than the
  server one, as there is no `context` parameter on the `find` signature.

### Plugin API

#### Common types

```ts
/**
 * Representation of a result returned by the {@link GlobalSearchPluginStart.find | `find` API}
 */
type GlobalSearchResult = Omit<GlobalSearchProviderResult, 'url'> & {
  /**
   * The url associated with this result.
   * This can be either an absolute url, or a relative path including the basePath
   */
  url: string;
};


/**
 * Response returned from the {@link GlobalSearchServiceStart | global search service}'s `find` API
 */
type GlobalSearchBatchedResults = {
  /**
   * Results for this batch
   */
  results: GlobalSearchResult[];
};
```

#### server API

```ts
/**
 * Options for the server-side {@link GlobalSearchServiceStart.find | find API}
 */
interface GlobalSearchFindOptions {
  /**
   * a custom preference token associated with a search 'session' that should be used to get consistent scoring
   * when performing calls to ES. Can also be used as a 'session' token for providers returning data from elsewhere
   * than an elasticsearch cluster.
   * If not specified, a random token will be generated and used when callingn the underlying result providers.
   */
  preference?: string;
  /**
   * Optional observable to notify that the associated `find` call should be canceled.
   * If/when provided and emitting, the result observable will be completed and no further result emission will be performed.
   */
  aborted$?: Observable<void>;
}

/** @public */
interface GlobalSearchPluginSetup {
  registerResultProvider(provider: GlobalSearchResultProvider);
}

/** @public */
interface GlobalSearchPluginStart {
  find(
    term: string,
    options: GlobalSearchFindOptions,
    request: KibanaRequest
  ): Observable<GlobalSearchBatchedResults>;
}
```

#### public API

```ts
/**
 * Options for the client-side {@link GlobalSearchServiceStart.find | find API}
 */
interface GlobalSearchFindOptions {
  /**
   * Optional observable to notify that the associated `find` call should be canceled.
   * If/when provided and emitting, the result observable will be completed and no further result emission will be performed.
   */
  aborted$?: Observable<void>;
}

/** @public */
interface GlobalSearchPluginSetup {
  registerResultProvider(provider: GlobalSearchResultProvider);
}

/** @public */
interface GlobalSearchPluginStart {
  find(term: string, options: GlobalSearchFindOptions): Observable<GlobalSearchBatchedResults>;
}
```

Notes:

- The public API is very similar to its server counterpart. The differences are:
  - The `registerResultProvider` setup APIs share the same signature, however the input `GlobalSearchResultProvider`
    types are different on the client and server.
  - The `find` start API signature got a `KibanaRequest` for `server`, when this parameter is not present for `public`.

#### http API

An internal HTTP API will be exposed on `/internal/global_search/find` to allow the client-side `GlobalSearch` plugin
to fetch results from the server-side result providers.

It should be very close to:

```ts
router.post(
  {
    path: '/internal/global_search/find',
    validate: {
      body: schema.object({
        term: schema.string(),
        options: schema.maybe(
          schema.object({
            preference: schema.maybe(schema.string()),
          })
        ),
      }),
    },
  },
  async (ctx, req, res) => {
    const { term, options } = req.body;
    const results = await ctx.globalSearch
      .find(term, { ...options, $aborted: req.events.aborted$ })
      .pipe(reduce((acc, results) => [...acc, ...results]))
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

- This API is only for internal use and communication between the client and the server parts of the `GS` API. When
  the need to expose an API for external consumers will appear, a new public API will be exposed for that.
- A new `globalSearch` context will be exposed on core's `RequestHandlerContext` to wrap a `find` call with current request.
- Example implementation is awaiting for all results and then returns them as a single response. Ideally, we would
  leverage the `bfetch` plugin to stream the results to the client instead.

## Functional behavior

### summary

- the `GlobalSearch` plugin setup contract exposes an API to be able to register result providers (`GlobalSearchResultProvider`).
  These providers can be registered from either public or server side, even if the interface for each side is not
  exactly the same.
- the `GlobalSearch` plugin start contract exposes an API to be able to search for objects. This API is available from both public
  and server sides.
  - When using the server `find` API, only results from providers registered from the server will be returned.
  - When using the public `find` API, results from provider registered from both server and public sides will be returned.
- During a `find` call, the service will call all the registered result providers and collect their result observables.
  Every time a result provider emits some new results, the `globalSearch` service will:
  - process them to convert their url to the expected output format
  - emit the processed results

### result provider registration

Due to the fact that some kind of results (i.e `application`, and maybe later `management_section`) only exists on
the public side of Kibana and therefor are not known on the server side, the `registerResultProvider` API will be
available both from the public and the server counterpart of the `GlobalSearchPluginSetup` contract.

However, as results from providers registered from the client-side will not be available from the server's `find` API,
registering result providers from the client should only be done to answer this specific use case and will be
discouraged, by providing appropriated jsdoc and documentation explaining that it should only
be used when it is not technically possible to register it from the server side instead.

### results url processing

When retrieving results from providers, the GS service will convert them from the provider's `GlobalSearchProviderResult`
result type to `GlobalSeachResult`, which is the structure returned from the `GlobalSearchPluginStart.find` observable.

In current specification, the only conversion step is to transform the `result.url` property following this logic:

- if `url` is an absolute url, it will not be modified
- if `url` is a relative path, the basePath will be prepended using `basePath.prepend`
- if `url` is a `{ path: string; prependBasePath: boolean }` structure:
  - if `prependBasePath` is true, the basePath will be prepended to the given `path` using `basePath.prepend`
  - if `prependBasePath` is false, the given `path` will be returned unmodified

#### redirecting to a result

Parsing a relative or absolute result url to perform SPA navigation can be non trivial. This is why `ApplicationService.navigateToUrl` has been introduced on the client-side core API

When using `navigateToUrl` with the url of a result instance, the following logic will be executed:

If all these criteria are true for `url`:

- (only for absolute URLs) The origin of the URL matches the origin of the browser's current location
- The pathname of the URL starts with the current basePath (eg. /mybasepath/s/my-space)
- The pathname segment after the basePath matches any known application route (eg. /app/<id>/ or any application's `appRoute` configuration)

Then: match the pathname segment to the corresponding application and do the SPA navigation to that application using
`application.navigateToApp` using the remaining pathname segment for the `path` option.

Otherwise: do a full page navigation using `window.location.assign`

### searching from the server side

When calling `GlobalSearchPluginStart.find` from the server-side service:

- the service will call `find` on each server-side registered result provider and collect the resulting result observables

- then, the service will merge every result observable and trigger the next step on every emission until either
  - A predefined timeout duration is reached
  - All result observables are completed

- on every emission of the merged observable, the results will be processed then emitted.

A very naive implementation of this behavior would be:

```ts
search(
  term: string,
  options: GlobalSearchFindOptions,
  request: KibanaRequest
): Observable<GlobalSearchResponse> {
  const aborted$ = merge(timeout$, options.$aborted).pipe(first())
  const fromProviders$ = this.providers.map(p =>
    p.find(term, { ...options, aborted$ }, contextFromRequest(request))
  );
  return merge([...fromProviders$]).pipe(
    takeUntil(aborted$),
    map(newResults => {
      return process(newResults);
    }),
  );
}
```

### searching from the client side

When calling `GlobalSearchPluginStart.find` from the public-side service:

- The service will call:

  - the server-side API via an http call to fetch results from the server-side result providers
  - `find` on each client-side registered result provider and collect the resulting observables

- Then, the service will merge every result observable and trigger the next step on every emission until either

  - A predefined timeout duration is reached
  - All result observables are completed

- on every emission of the merged observable, the results will be processed then emitted.

A very naive implementation of this behavior would be:

```
search(
  term: string,
  options: GlobalSearchFindOptions,
): Observable<GlobalSearchResponse> {
  const aborted$ = merge(timeout$, options.$aborted).pipe(first())
  const fromProviders$ = this.providers.map(p =>
    p.find(term, { ...options, aborted$ })
  );
  const fromServer$ = of(this.fetchServerResults(term, options, aborted$))
  return merge([...fromProviders$, fromServer$]).pipe(
    takeUntil(aborted$),
    map(newResults => {
      return process(newResults);
    }),
  );
}
```

Notes:

- The example implementation is not streaming results from the server, meaning that all results from server-side 
  registered providers will all be fetched and emitted in a single batch. Ideally, we would leverage the `bfetch` plugin 
  to stream the results to the client instead.

### results sorting

As the GS `find` API is 'streaming' the results from the result providers by emitting the results in batches, sorting results in
each individual batch, even if technically possible, wouldn't provide much value as the consumer will need to sort the
aggregated results on each emission anyway. This is why the results emitted by the `find` API should be considered as
unsorted. Consumers should implement sorting themselves, using either the `score` attribute, or any other arbitrary logic.

#### Note on score value

Due to the fact that the results will be coming from various providers, from multiple ES queries or even not from ES,
using a centralized scoring mechanism is not possible.

the `GlobalSearchResult` contains a `score` field, with an expected value going from 1 (lowest) to 100 (highest).
How this field is populated from each individual provider is considered an implementation detail.

### Search cancellation

Consumers can cancel a `find` call at any time by providing a cancellation observable with
the `GlobalSearchFindOptions.aborted$` option and then emitting from it.

When this observable is provided and emitting, the GS service will complete the result observable.

This observable will also be passed down to the underlying result providers, that can leverage it to cancel any pending
asynchronous task and perform cleanup if necessary.

# Drawbacks

See alternatives.

# Alternatives

## Result providers could be only registrable from the server-side API

The fact that some kinds of results, and therefore some result providers, must be on the client-side makes the API more complex,
while making these results not available from the server-side and HTTP APIs.

We could decide to only allow providers registration from the server-side. It would reduce API exposure, while simplifying
the service implementation. However to do that, we would need to find a solution to be able to implement a server-side
result provider for `application` (and later `management_section`) type provider.

I will directly exclude the option to move the `application` registration (`core.application.register`) from client
to server-side, as it's a very heavy impacting (and breaking) change to `core` APIs that would requires more reasons
than just this RFC/API to consider.

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
  euiIconType: 'snowflake',
});
```

This way, the applications could be searchable from the server using this server-side `applications` registry.

However

- It forces plugin developers to add this API call. In addition to be a very poor developer experience, it can also
  very easily be forgotten, making a given app non searchable
- client-side only plugins would need to add a server-side part to their plugin just to register their application on
  the server side

# Adoption strategy

The `globalSearch` service is a new feature provided by the `core` API. Also, the base providers
used to search for saved objects and applications will be implemented by the platform team, meaning
that by default, plugin developers won't have to do anything.

Plugins that wish to expose additional result providers will easily be able to do so by using the exposed APIs and
documentation.

# How we teach this

This follows the same patterns we have used for other Core APIs: Observables subscriptions, etc.

This should be taught using the same channels we've leveraged for other Kibana Platform APIs, API documentation and
example plugins.

# Unresolved questions

N/A
