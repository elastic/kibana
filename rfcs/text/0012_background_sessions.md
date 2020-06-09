- Start Date: 2020-06-09
- RFC PR: 
- Kibana Issue: 

# Summary

Kibana Background Sessions are a way to execute, track and restore a group of `search` requests, for a specific application configuration, like a single dashboard session or for a SIEM timeline tab. 

They can be used to execute long running tasks asynchronously, while the user is free to work on other tasks or close Kibana altogether.

# Basic example

## Session Management

### Starting a new session

It's an application's responsibility to manage its' sessions. 
A session should represent a logical grouping of search requests, i.e. a single dashboard configuration.

To start a session, an application should call 

`const sessionId = data.search.session.start();`

Where `data` is the start contract of the data plugin.

If the application uses the services provided by the `data.search` plugin, it only needs to pass down the `sessionId` to the API, and the `search` service will track and restore requests internally.

 - If the request is issued using the `data.search.search`, use: 
 ```
    data.search.search({
        params,
        sessionId,
    }
 ```
 - If the request is issued using `SearchSource`, use `searchSource.setSessionId(sessionId)`, before calling `fetch`.

If the application doesn't use `data.search` services, you may still associate your requests with a `BackgroundSession`, by using the 'backgroundSession` service directly. Examples will be provided in the Detailed Design section.

### Closing a session

Each session is automatically closed when a new one is started. You may also call `data.search.session.clear()` to close a session without starting a new one.

Sessions are also closed automatically when navigating between applications.

If there is no open session, Kibana will behave as before, suggesting a user to "Run Beyond Timeout" instead of "Run in Background".

### Restoring a session

Restoring a session means loading the results previously generated for each request within the session.  

If, for example, the `sessionId` to be 

Doing so requires a `sessionId` and *calling each request with the exact same parameters*. If the request parameters and the `sessionId` match, the stored results will be returned immediatelly, instead of re-running the search.

If the `sessionId` is not found, the request parameters don't match or the stored results are expired, the requests will be re-run. 

### Embeddable integration

??

# Motivation

Kibana is great at proving fast results from large data sets of "hot" data. However, when running slower searches in huge amounts of historical data, potentially on "cold" storage or frozen indices, users encounter a timeout that prevents them from running queries longer than 30 seconds (by default).

While we already introduced an option to explicitly bypass this timeout in v7.7, users still have to wait on-screen for the results to return. 

The motivation of this RFC is to allow users to:
 - Run queries longer than 30 seconds, while being able to work on other things (in the same application, different Kibana applications or closing Kibana altogether)
 - Allow a user to restore a completed long running query, without having to wait.

# Detailed design

## High level 

The key 

## Background Session Service

The main service 

This is the bulk of the RFC. Explain the design in enough detail for somebody
familiar with Kibana to understand, and for somebody familiar with the
implementation to implement. This should get into specifics and corner-cases,
and include examples of how the feature is used. Any new terminology should be
defined here.

# Drawbacks

- Background Session keys are stored in memory until a session is actually stored.    
   - This opens us to a possibility of data loss in case of server failure. (This data is not critical and will result in a user having to re-run a dashboard) 
   - Increased memory consumption on the server. (However, each object stored in memory is ~ bytes or ~ active sessions per 1MB and we'll have this tracked with telemetry). 

There are tradeoffs to choosing any path. Attempt to identify them here.

# Alternatives

What other designs have been considered? What is the impact of not doing this?

# Adoption strategy

If we implement this proposal, how will existing Kibana developers adopt it? Is
this a breaking change? Can we write a codemod? Should we coordinate with
other projects or libraries?

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