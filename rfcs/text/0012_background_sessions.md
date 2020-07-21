- Start Date: (fill me in with today's date, YYYY-MM-DD)
- RFC PR: (leave this empty)
- Kibana Issue: (leave this empty)

- Architecture diagram: https://app.lucidchart.com/documents/edit/cf35b512-616a-4734-bc72-43dde70dbd44/0_0
- Mockups: https://www.figma.com/proto/FD2M7MUpLScJKOyYjfbmev/ES-%2F-Query-Management-v4?node-id=440%3A1&viewport=984%2C-99%2C0.09413627535104752&scaling=scale-down
- Old issue: https://github.com/elastic/kibana/issues/53335
- Background search roadmap: https://github.com/elastic/kibana/issues/61738
- POC: https://github.com/elastic/kibana/pull/64641   

# Summary

Background Sessions will enable Kibana applications and solutions to start a group of related search requests (such as
those coming from a single load of a dashboard or SIEM timeline), navigate away or close the browser, then retrieve the
results when they have completed.

# Basic example

At its core, background sessions are enabled via several new APIs:
- Start a session, associating multiple search requests with a single entity
- Save the session (and continue search requests in the background)
- Restore the background session

```ts
const searchService = dataPluginStart.search;

if (appState.sessionId) {
  // If we are restoring a session, set the session ID in the search service
  searchService.session.set(sessionId);
} else {
  // Otherwise, start a new background session to associate our search requests
  appState.sessionId = searchService.session.start();
} 

// Search using the generated session ID. If this is a restored session and the search requests have already completed,
// this should return quickly.
const response$ = await searchService.search({
  params,
  sessionId,
  options,
});

// When the user decides to send to background and move on, create the saved object associated with this session.
// Make sure to store any app state needed to restore this view and the exact search requests from before.
searchService.session.save({
  appState,
  restoreUrl,
});
```

# Motivation

Kibana is great at providing fast results from large sets of "hot" data. However, there is an increasing number of use
cases where cost is more of a concern than speed (such as year-over-year reports, historical or audit data, batch
queries, etc.). When running slower searches on "cold" storage or frozen indices, users encounter timeouts after 30
seconds by default.

In 7.7, with the introduction of the `_async_search` API in Elasticsearch, we provided Kibana users a way to bypass the
timeout, but users still need to remain on-screen for the entire duration of the search requests.

By default, when a user navigates away before search requests finish, we cancel them. This is a good default behavior,
since there currently isn't any way for the user to later return to the results.

The primary motivation of this RFC is to enable users to do the following without needing to keep Kibana open, or while
moving onto other work inside Kibana:

- Run long search requests (beyond 30 seconds)
- View their status (complete/incomplete)
- Cancel incomplete search requests
- Retrieve completed search request results 

# Detailed design

Because a single view (such as a dashboard with multiple visualizations) can initiate multiple search requests, we need
a way to associate the search requests together in a single entity. We call this entity a `session`, and when a user
decides that they want to continue running the search requests while moving onto other work, we will create a saved
object corresponding with that specific `session`.

We will expose a new `session` service inside of the `data` plugin `search` service. The service will expose APIs for 
the following:

- Starting a new session (generating a unique identifier for this specific grouping of search requests)
- Saving a session (creating the saved object using that ID)
- Getting a list of sessions for the current user (including status, any necessary application data, and a URL to
restore the view)
- Cancelling an incomplete session (deleting the saved object and cancelling any incomplete search requests)
- Restoring a session (allowing search requests to resume instead of restart)

We will also modify the existing `search` API exposed by the `data` plugin `search` service to optionally accept an
additional parameter, the `sessionId`, which will allow search requests to *resume* instead of *restart*. When
"restoring" a session, it is crucial that search requests are sent with *identical* search request parameters as were
sent originally. (For example, relative date ranges should be converted to absolute before passing the request to the
`search` service.)

Applications query data from Elasticsearch on behalf of the end user in a variety of ways:

- Using `SearchSource` (our higher-level abstracted search API, used by Maps, Lens, and most visualizations, exposed by
the `data` plugin `search` service)
- Using `search` (our lower-level search API that accepts raw Elasticsearch query DSL, used by Vega and Timelion,
exposed by the `data` plugin `search` service)
- Exposing a route that bypasses our `search` services and queries Elasticsearch directly, then manipulates the data
before returning a response (as in the case of TSVB and most solutions)

The proposed APIs provide the tools necessary to run long search requests, view their status, cancel incomplete search
requests, and retrieve results, regardless of the mechanism used to query Elasticsearch.

## Background session service

The primary service which will facilitate background sessions is the server-side `session` service.

When a `search` request is handled, and it contains a `sessionId`, the service will query Elasticsearch to see if there
is already a saved object for that session. If there isn't, then we will forward the search request to Elasticsearch and
receive an ID specific to that search request. We store that ID in memory, keyed off of a hash of the request parameters
and the current username.

We will then periodically query Elasticsearch to see if there is a saved object for that session (meaning the user has
elected to continue the requests in the background). If we find a saved object, then we will update it to contain the
search ID keyed off of the request hash, and remove it from memory.

Then, in the future when the same `sessionId` is sent with identical request parameters, we will retrieve the saved
object. Instead of sending all of the request parameters to Elasticsearch (and restarting the search), we will look up
the search ID, and send that to Elasticsearch (resuming the search). If that specific search request has completed in
Elasticsearch, the results will be available immediately.

By default, results are stored in Elasticsearch for 5 days. We may consider adding an advanced setting that will allow
overriding this default.

The background session service will also use the task manager to periodically monitor the status of incomplete
background sessions. It will query the list of all incomplete sessions, and check the status of each search that is
executing. If the search requests are all complete, it will update the corresponding saved object to have a `status` of
`complete`.

## Server APIs

The following APIs are exposed by the server-side `data` plugin start `search` service:

```ts
session.getAll()
```

Retrieves all of the background session saved objects for the current user. (We can filter it to the current user
because when the saved object is created, we store a hash of the current user's username inside the object.)

---

```ts
session.get(sessionId)
```

Retrieves the saved object for this `sessionId` (if there is one), including the request/search ID hash, status
(complete/incomplete), application data, and restore URL.

---

```ts
session.save(sessionId, restoreUrl, appData)
```

Creates the saved object for this background session. Used when a user chooses to "send to background."

---

```ts
session.delete(sessionId)
```

Deletes the saved object for this background session, and cancels all incomplete search requests for this session.

---

```ts
session.getSearchId(sessionId, searchRequest)
```

Used internally by the search service when a search request is handled to look up the search ID (if there is one) for
this `sessionId` and `searchRequest`. If bypassing the `search` service, this would need to be called manually when a
search request is handled.

---

```ts
session.trackSearchId(sessionId, searchRequest, searchId)
```

Used internally by the search service when the first response from Elasticsearch is received. After this is called, the
search service will periodically monitor if a saved object is created for this `sessionId`, and will update it to
include this `searchRequest`/`searchId` association. If bypassing the `search` service, this would need to be called
manually when the first response from Elasticsearch is received.

## Public APIs

The following APIs are exposed by the public-side `data` plugin start `search` service:

```ts
session.start()
```

Starts a new session and returns the `sessionId`, a unique ID for this session that will be sent in `search` requests.

---

```ts
session.set(sessionId)
```

Sets the `sessionId` that is sent in `search` requests to the given ID. Used when restoring a background session so that
search requests may resume instead of restart.

---

```ts
session.clear()
```

Clears the current `sessionId` so that future `search` requests do not contain a `sessionId`. Automatically called when
users navigate between applications in Kibana.

---

```ts
session.getAll()
session.get(sessionId)
session.save(sessionId, restoreUrl, appData)
session.delete(sessionId)
```

These APIS make a request to the corresponding server-side API with the given parameters.


# Limitations

In the first iteration, cases which require multiple search requests to be made serially will not be supported. The
following are examples of such scenarios:

- When a visualization is configured with a terms agg with an "other" bucket
- When using blended layers or term joins in Maps

Eventually, when expressions can be run on the server, we will facilitate these use cases by adding support for
background expressions in the background session service.

# Drawbacks

One drawback of this approach is that we will be regularly polling Elasticsearch for saved objects, which will increase
load on the Elasticsearch server. Whether or not this may or may not be significant is something that should be
investigated.

Two potential drawbacks stem from storing things in server memory. If a Kibana server is restarted, in-memory results
will be lost. (This can be an issue if a search request has started, and the user has sent to background, but the
background session saved object has not yet been updated with the search request ID.) In such cases, the search requests
will need to be restarted. There is also the consideration of the memory footprint of the Kibana server; however, since
we are only storing a hash of the request and search request ID, we do not anticipate the footprint to increase
significantly. We will collect telemetry data to measure this impact.

The results of search requests that have been sent to the background will be stored in Elasticsearch for several days,
even if they will only be retrieved once. This will be mitigated by allowing the user manually delete a background
session object after it has been accessed.

# Alternatives

What other designs have been considered? What is the impact of not doing this?

# Adoption strategy

(See "Basic example" above.)

Any application or solution that uses the `data` plugin `search` services will be able to facilitate background sessions
fairly simply. The public side will need to create/clear sessions when appropriate, and ensure the `sessionId` is sent
with all search requests. It will also need to ensure that any necessary application data, as well as a `restoreUrl` is
sent when creating the saved object.

The server side will just need to ensure that the `sessionId` is sent to the `search` service. If bypassing the `search`
service, it will need to also call `trackSearchId` when the first response is received, and `getSearchId` when restoring
the view.  

# How we teach this

What names and terminology work best for these concepts and why? How is this
idea best presented? As a continuation of existing Kibana patterns?

Would the acceptance of this proposal mean the Kibana documentation must be
re-organized or altered? Does it change how Kibana is taught to new developers
at any level?

How should this feature be taught to existing Kibana developers?

# Unresolved questions

Optional, but suggested for first drafts. What parts of the design are still
TBD?

TODO: Possibly add parameter for `isNew` so that we don't need to unnecessarily query ES