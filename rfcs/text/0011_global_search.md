- Start Date: 2020-04-19
- RFC PR: (leave this empty)
- Kibana Issue: [#61657](https://github.com/elastic/kibana/issues/61657)

# Summary

A core API exposed on both public and server sides, allowing to search for arbitrary objects and
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

The main goal of this feature is to power the global search bar [#57576](https://github.com/elastic/kibana/issues/57576).

While this first point remains the priority, this API should also provide a solution for alternative needs regarding
searching for arbitrary objects from a Kibana instance.

# Detailed design

## API Design

### Types

#### common

```ts
/**
 * Static list of all the possible types of results.
 * Ordinal value matter here, as it will used to sort results of different types.
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
 * Options provided to {@link GlobalSearchResultProvider | result providers} `find` method
 * Currently empty and only present for keeping the API future-proof.
 */
interface GlobalSearchOptions {}

/**
 * Representation of a result returned by a {@linlkGlobalSearchResultProvider | result provider}
 */
interface GlobalSearchResult {
  /* an arbitrary id that should be unique for an individual provider's results */
  id: string;
  /* the title/label of the result */
  title: string;
  /* the type of result / object  */
  type: GlobalSearchResultType;
  /* an optional EUI icon name to associate with the search result. If not specified, will use a default icon */
  icon?: string;
  /* The url to navigate to this result. This can be either an absolute url, or a path relative to the server's publishUrl */
  url: string;
  /* the score of the result, used for ordering individual results of a same type */
  score: number;
}
```

#### server

```ts
/**
 * Context for the server-side result providers.
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
    options: GlobalSearchOptions,
    context: GlobalSearchProviderContext
  ): Observable<GlobalSearchResult[]>;
};
```

Notes: 
- even if initial implementation will provide a static version of `GlobalSearchProviderContext`,
it could be possible to allow plugins to register contexts as it's currently done for `RequestHandlerContext`.
This will not be done until the need arises.

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

/**
 * Enhanced {@link GlobalSearchResult | result type} for the client-side,
 * to allow navigating to a given result.
 */
interface NavigableGlobalSearchResult extends GlobalSearchResult {
  navigateTo: () => void;
}
```

Notes: 
- The client-side version of `GlobalSearchResultProvider` is slightly difference than the 
server one, as there is no `context` parameter passed to `find`.
- `NavigableGlobalSearchResult` is here to enhanced results with a `navigateTo` method to 
allow `core` to handle the navigation mechanism for the results, which is non-trivial.
See the [Redirecting to a result](#redirecting-to-a-result) section for more info.

### Plugin API

#### common types

```ts
/**
 * Response returned from a {@link GlobalSearchResultProvider | result provider}
 */
type GlobalSearchResponse<ResultType extends GlobalSearchResult = GlobalSearchResult> = {
  /**
   * Current results fetched from the providers.
   */
  results: ResultType[];
  /**
   * Is the search complete. Will only be true during the last emission of the `GlobalSearchServiceStart.search` observable.
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

Notes: the public API looks quite similar to the server one. The differences are:
- the `registerResultProvider` setup API got the same signature, however the `GlobalSearchResultProvider` types is different
than the server one
- the `find` start API signature got a `KibanaRequest` for `server`, where this parameter is not present for  `public`.

#### http API

// TODO

Note: this is the API that will consumed by the client-side `GlobalSearchService` to retrieve server-side results. It should
not be considered a public and supported API until the need to do so arises.

## Functional behavior

### Summary

- `core` exposes an setup API to be able to register result providers (`GlobalSearchResultProvider`). These providers
  can be registered from either public or server side, even if the interface for each sides is not exactly the same.
- `core` exposes a start API to be able to search for objects. This API is available from both public and server sides.
- when a search is triggered, the `GS` service will query all registered providers and then returns an aggregated result

### result provider registration

Due to the fact that some kind of results (i.e `application`) can currently only be retrieved from the public side of Kibana,
the `registerResultProvider` API will be available both from the public and the server counterpart of the `GlobalSearchService`.
However, as results from providers registered from the client-side will not be available from the server's `find` API, 
registration of result providers from the client will be discouraged with proper documentation stating that it should
only be used when it is not technically possible to expose it from the server side instead.

### publicUrl

To be usable from external services (such as ChatOps), results returned from the GlobalSearch public HTTP API should all contains absolute urls, as
relative paths would not be usable from outside of the instance.

However, given the fact that some Kibana deployments can have complex architecture, there is currently
no reliable way to know for sure what the public address used to access kibana is.

A new `server.publicAddress` property will be added to the kibana configuration.

When not manually defined in the configuration, this property will be constructed using the known `server` configuration values:

```ts
const publicAddress = removeTrailingSlash(
  `${getServerInfo().protocol}://${httpConfig.host}:${httpConfig.port}/${httpConfig.basePath}`
);
```

// TODO: example

### Redirecting to a result

// TODO

### searching from the server side

When calling `GlobalSearchServiceStart.search` from the server-side service:

- the service will call `find` on each server-side registered result provider and collect the resulting result observables

- then, the service will combine every result observable and trigger the next step on every emission until either
    - the predefined timeout duration is reached
    - Every providers result observable are completed
   
- on every emission of the combined observable, the results will be aggregated and sorted following 
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

  return combineLatest([...fromProviders$]).pipe(
    takeUntil(timeout$)
    map(resultLists => {
      return mergeAndOrder(resultLists);
    })
  );
}
```

### searching from the client side

When calling `GlobalSearchServiceStart.search` from the public-side service:

- the service will call:
  - the server-side API via an http call to fetch results from the server-side result providers
  - `find` on each client-side registered result provider and collect the resulting observables

- then, the service will combine every result observable and trigger the next step on every emission until either
    - the predefined timeout duration is reached
    - Every providers result observable are completed
   
- on every emission of the combined observable, the results will be aggregated and sorted following 
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

  return combineLatest([...fromProviders$, fromServer$]).pipe(
    takeUntil(timeout$)
    map(resultLists => {
      return mergeAndOrder(resultLists);
    })
  );
}
```

Note: due to the complexity of the process, the initial implementation will not be streaming results from the server,
meaning that all results from server-side registered providers will all be fetched at the same time (via a 'classic' http call to the GS endpoint). 
The observable-based API architecture is ready for this however, and the enhancement could be added at a later time.

### results aggregation

On every emission of an underlying provider, the service will aggregate and sort the results following this logic before emitting them:

- results from all providers will be merged in a single list.
- results will be sorted by ascending `type` ordinal value.
- results of a same `type` will then be sorted by descending `score` value.

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

Due to the fact that the results will be coming from various providers, from distinct ES queries or even not from ES,
using a centralized scoring mechanism is not possible.

the `GlobalSearchResult` contains a `score` field, with an expected value from 1 (lowest) to 100 (highest).
How this field is populated from each individual provider is considered an implementation detail.

### Search cancellation

Once triggered, a given call to `GlobalSearchServiceStart.find` (and underlying search provider's `find` method)
cannot be canceled, neither from the public nor server API.

# Drawbacks

- The fact that some result providers must be on the client-side...

# Alternatives

- could only allow to register result providers from the server-side for the public API
- could have a struct instead of a url for internal results.
- use plain string instead of enum for result `type`
- should we pass a signal or a `canceled$` observable to the providers to allow search cancellation?

# Adoption strategy

The `globalSearch` service is a new feature provided by the `core` API. Also, the base providers
used to search for saved objects and applications will be implemented by the platform team, meaning
that by default, plugin developers won't have to do anything.

Plugins that wish to expose more detail about their availability will easily be able to do so,
including providing detailed information such as links to documentation to resolve the problem.

# How we teach this

This follows the same patterns we have used for other Core APIs: Observables subscriptions, etc.

This should be taught using the same channels we've leveraged for other Kibana Platform APIs, API documentation mostly.

# Unresolved questions

## terminology / naming

Are the current types, services and api names acceptable:
   - `GlobalSearch` ts prefix
   - `core.globalSearch` / `GlobalSearchService`
   - `GlobalSearchResultProvider`

     