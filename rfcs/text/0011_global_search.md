- Start Date: 2020-04-19
- RFC PR: (leave this empty)
- Kibana Issue: [#61657](https://github.com/elastic/kibana/issues/61657)

# Summary

A core API exposed on both public and server sides, allowing to search for arbitrary objects and
register result providers.

# Basic example

- registering a result provider

```ts
coreSetup.globalSearch.registerResultProvider({
  id: 'my_provider',
  search: (term, options, context) => {
    const resultPromise = myService.search(term, context.core.savedObjects.client);
    return from(resultPromise);
  },
});
```

- using the `find` API

```ts
coreStart.globalSearch.find('some term', { type: ['dashboard', 'application'] });
```

# Motivation

The main goal of this feature is to power the global search bar [#57576](https://github.com/elastic/kibana/issues/57576).

While this first point remains the priority, this API should also provide a solution for alternative needs regarding
searching for arbitrary objects from a Kibana instance.

# Detailed design

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

## API Design

### Types

```ts
type GlobalSearchResultType = 'dashboard' | 'visualization' | 'search' | 'application';

/**
 * Representation
 */
interface GlobalSearchResult {
  /* the title of the result */
  title: string;
  /* the type of result / object  */
  type: GlobalSearchResultType;
  /* an optional EUI icon name to associate with the search result. If not specified, will use a default icon */
  icon?: string;
  /* The url to navigate to this result. This can be either an absolute url, or a path relative to the server's publishUrl */
  url: string;
  /* the score of the result, from 1 to 100. used for ordering individual results of a same type */
  score: number;
}

/**
 * Response returned from a {@link GlobalSearchResultProvider | result provider}
 */
type GlobalSearchResultProviderResponse =
  | {
      success: true;
      /** list of matching results */
      results: GlobalSearchResult[];
    }
  | {
      success: false;
      /** error message of the failure cause */
      error?: string;
    };

/**
 * Options provided to {@link GlobalSearchResultProvider | result providers}
 * Currently empty and only present for keeping the API future-proof.
 */
interface GlobalSearchOptions {}

/**
 * GlobalSearch result provider, to be registered using the {@link GlobalSearchSetup | global search API}
 */
type GlobalSearchResultProvider = {
  search(term: string, options: GlobalSearchOptions): Promise<GlobalSearchResultProviderResponse>;
};
```

### Plugin API

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

Optional, but suggested for first drafts. What parts of the design are still
TBD?
