- Start Date: 2019-09-11
- RFC PR: (leave this empty)
- Kibana Issue: (leave this empty)

# Summary

Prevent plugin lifecycle methods from blocking Kibana startup by making the
following changes:
1. Synchronous lifecycle methods 
2. Synchronous context provider functions
3. Core should not expose API's as observables

# Motivation
Plugin lifecycle methods and context provider functions are async
(promise-returning) functions. Core runs these functions in series and waits
for each plugin's lifecycle function to resolve before calling the next. This
allows plugins to depend on the API's returned from other plugins.

With the current design, a single lifecycle method or context provider that
blocks will block all of Kibana from starting up.

We should make it impossible for a single plugin lifecycle function to
stall all of kibana.

# Detailed design

### 1. Synchronous lifecycle methods
Lifecycle methods are synchronous functions, they can perform asynchronous
operations but Core doesn't wait for these to complete. This guarantees that
no plugin lifecycle function can block other plugins or core from starting up. 

### 2. Synchronous Context Provider functions
Making context provider functions synchronous guarantees that a context
handler will never be blocked by registered context providers. They can expose
asynchronous API's which could potentially have blocking behaviour. 

```ts
export type IContextProvider<
  TContext extends Record<string, any>,
  TContextName extends keyof TContext,
  TProviderParameters extends any[] = []
> = (
  context: Partial<TContext>,
  ...rest: TProviderParameters
) => TContext[TContextName];
```

### 3. Core should not expose API's as observables
All Core API's should be reactive, when internal state changes their behaviour
should change accordingly. But, exposing these internal state changes as part
of the API contract leaks internal implementation details consumers can't do
anything useful with and don't care about.

For example: Core currently exposes `core.elasticsearch.adminClient$`, an
Observable which emits a pre-configured elasticsearch client every time there's
a configuration change. This includes changes such as the elasticsearch
cluster `hosts` that alter the behaviour of the elasticsearch client. As a
plugin author who wants to make search requests against elasticsearch I
shouldn't have to care about, react to, or keep track of, how many times the
underlying configuration has changed. I want to use the `callAsInternalUser`
method and I expect Core to use the most up to date configuration to send this
request to the correct `hosts`.

This does not mean we should remove all observables from Core's API's. When an
API consumer is interested in the *state changes itself* it absolutely makes
sense to expose this as an Observable. Good examples of this is exposing
plugin config as this is state that changes over time to which a plugin should
directly react to.

This is important in the context of synchronous lifecycle methods and context 
handlers since exposing convenient API's become very ugly:

*(3.1): exposing Observable-based API's through the route handler context:*
```ts
// Before: Using an asynchronous context provider
coreSetup.http.registerRouteHandlerContext(coreId, 'core', async (context, req) => {
  const adminClient = await coreSetup.elasticsearch.adminClient$.pipe(take(1)).toPromise();
  const dataClient = await coreSetup.elasticsearch.dataClient$.pipe(take(1)).toPromise();
  return {
    elasticsearch: {
      adminClient: adminClient.asScoped(req),
      dataClient: dataClient.asScoped(req),
    },
  };
});

// After: Using a synchronous context provider
coreSetup.http.registerRouteHandlerContext(coreId, 'core', async (context, req) => {
  return {
    elasticsearch: {
      // (3.1.1) We can expose a convenient API by doing a lot of work
      adminClient: () => {
        callAsInternalUser: async (...args) => {
          adminClient = await coreSetup.elasticsearch.adminClient$.pipe(take(1)).toPromise();
          return adminClient.asScoped(req).callAsinternalUser(args);
        },
        callAsCurrentUser: async (...args) => {
          adminClient = await coreSetup.elasticsearch.adminClient$.pipe(take(1)).toPromise();
          return adminClient.asScoped(req).callAsCurrentUser(args);
        }
      },
      // (3.1.2) Or a lazy approach which perpetuates the problem to consumers:
      dataClient: async () => {
        const dataClient = await coreSetup.elasticsearch.dataClient$.pipe(take(1)).toPromise();
        return dataClient.asScoped(req);
      },
    },
  };
});
```

### 4. Complete example code
*(4.1) Doing async operations in a plugin's setup lifecycle*
```ts
export class Plugin {
  public setup(core: CoreSetup) {
    // Async setup is possible and any operations involving asynchronous API's
    // will still block until these API's are ready, (savedObjects find only 
    // resolves once the elasticsearch client has established a connection to 
    // the cluster). The difference is that these details are now internal to
    // the API.
    (async () => {
      const docs = await context.core.savedObjects.client.find({...});
      ...
      await context.core.savedObjects.client.update(...);
    })();
  }
}
```

*(4.2) Exposing an API from a plugin's setup lifecycle*
```ts
export class Plugin {
  public async setup(core: CoreSetup) {
    return {
      ping: async () => {
        // async & await isn't necessary here, but makes example a bit clearer.
        // Note that the elasticsearch client no longer exposes an adminClient$
        // observable.
        const result = await core.elasticsearch.adminClient.callAsInternalUser('ping', ...);
        return result;
      }
    };
  }
}
```

*(4.3) Exposing an observable free Elasticsearch API from the route context*
```ts
coreSetup.http.registerRouteHandlerContext(coreId, 'core', async (context, req) => {
  return {
    elasticsearch: {
      adminClient: coreSetup.elasticsearch.adminClient.asScoped(req),
      dataClient: coreSetup.elasticsearch.adminClient.asScoped(req),
    },
  };
});
```

# Drawbacks
Not being able to block on a lifecycle method also means plugins can no longer
be certain that all setup is complete before they reach the start lifecycle.
Plugins will have to manage such state internally. Core will still expose
special API's that are able block the setup lifecycle such as registering
Saved Object migrations, but this will be limited to operations where the risk
of blocking all of kibana starting up is limited.

# Alternatives
## 1. Introduce a lifecycle/context provider timeout
Lifecycle methods and context providers would timeout after X seconds and any
API's they expose would not be available if the timeout had been reached.

Drawbacks:
1. For lifecycle methods: there would be no way to recover from a timeout,
   once a timeout had been reached the API will remain unavailable.

   Context providers have the benefit of being re-created for each handler
   call, so a single timeout would not permanently disable the API.

3. Plugins have less control over their behaviour. When an upstream server
   becomes unavailable, a plugin might prefer to keep retrying the request
   indefinitely or only timeout after more than X seconds. It also isn't able
   to expose detailed error information to downstream consumers such as
   specifying which host or service is unavailable.

5. (minor) Introduces an additional failure condition that needs to be handled.
   Consumers should handle the API not being available in setup, as well as,
   error responses from the API itself. Since remote hosts like Elasticsearch
   could go down even after a successful setup, this effectively means API
   consumers have to handle the same error condition in two places.

## 2. Treat anything that blocks Kibana from starting up as a bug
Effectively do what we've always been doing. We can improve on the status quo
by logging detailed diagnostic info on any plugins that appear to be blocking
startup.

A parallel can be drawn between Kibana's async plugin initialization and the TC39
proposal for [top-level await](https://github.com/tc39/proposal-top-level-await).
> enables modules to act as big async functions: With top-level await,
> ECMAScript Modules (ESM) can await resources, causing other modules who
> import them to wait before they start evaluating their body

They believe the benefits outweigh the risk of modules blocking loading since:
 - [developer education should result in correct usage](https://github.com/tc39/proposal-top-level-await#will-top-level-await-cause-developers-to-make-their-code-block-longer-than-it-should)
 - [there are existing unavoidable ways in which modules could block loading such as infinite loops or recursion](https://github.com/tc39/proposal-top-level-await#does-top-level-await-increase-the-risk-of-deadlocks)


Drawbacks:
1. Since plugins load serially, even if they don't block startup, all the
   delays add up and increase the startup time.
2. This opens up the potential for a bug in Elastic or third-party plugins to
   effectively "break" kibana which creates a bad user experience.

# Adoption strategy (WIP)

Making context provider functions synchronous (2) and not exposing core API's
as observables (3) would require the least amount of change from plugins since
adoption on these API's are still fairly low.

Having synchronous lifecycle methods (1) would have a bigger impact on plugins
since most NP shims were built with asynchronous methods in mind.

# How we teach this (TBD)

What names and terminology work best for these concepts and why? How is this
idea best presented? As a continuation of existing Kibana patterns?

Would the acceptance of this proposal mean the Kibana documentation must be
re-organized or altered? Does it change how Kibana is taught to new developers
at any level?

How should this feature be taught to existing Kibana developers?

# Unresolved questions
Are the drawbacks worth the benefits or can we live with Kibana potentially
being blocked for the sake of convenient asynchronous lifecycle stages?
