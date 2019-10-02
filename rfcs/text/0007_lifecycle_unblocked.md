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

Core will still expose special API's that are able block the setup lifecycle
such as registering Saved Object migrations, but this will be limited to
operations where the risk of blocking all of kibana starting up is limited.

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
        return await core.elasticsearch.adminClient.callAsInternalUser('ping', ...);
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
Not being able to block on a lifecycle method means plugins can no longer be
certain that all setup is "complete" before they expose their API's or reach
the start lifecycle.

A plugin might want to poll an external host to ensure that the host is up in
its setup lifecycle before making network requests to this host in it's start
lifecycle. In effect, the plugin is polling the world to construct a snapshot
of state which drives future behaviour. Modeling this with lifecycle functions
is insufficient since it assumes that any state constructed in the setup
lifecycle is static and won't and can't be changed in the future.

For example: a plugin's setup lifecycle might poll for the existence of a
custom Elasticsearch index and if it doesn't exist, create it. Should there be
an Elasticsearch restore which deletes the index, the plugin wouldn't be able
to gracefully recover by simply running it's setup lifecycle a second time.

The once-off nature of lifecycle methods are incompatible with the real-world
dynamic conditions under which plugins run. Not being able to block a
lifecycle method is, therefore, only a drawback when plugins are authored under
the false illusion of stability.

# Alternatives
## 1. Introduce a lifecycle/context provider timeout
Lifecycle methods and context providers would timeout after X seconds and any
API's they expose would not be available if the timeout had been reached.

Drawbacks:
1. A blocking setup lifecycle makes it easy for plugin authors to fall into
   the trap of assuming that their plugin's behaviour can continue to operate
   based on the snapshot of conditions present during setup.

2. For lifecycle methods: there would be no way to recover from a timeout,
   once a timeout had been reached the API will remain unavailable.

   Context providers have the benefit of being re-created for each handler
   call, so a single timeout would not permanently disable the API.

3. Plugins have less control over their behaviour. When an upstream server
   becomes unavailable, a plugin might prefer to keep retrying the request
   indefinitely or only timeout after more than X seconds. It also isn't able
   to expose detailed error information to downstream consumers such as
   specifying which host or service is unavailable.

4. (minor) Introduces an additional failure condition that needs to be handled.
   Consumers should handle the API not being available in setup, as well as,
   error responses from the API itself. Since remote hosts like Elasticsearch
   could go down even after a successful setup, this effectively means API
   consumers have to handle the same error condition in two places.

## 2. Treat anything that blocks Kibana from starting up as a bug
Keep the existing New Platform blocking behaviour, but through strong
conventions and developer awareness minimize the risk of plugins blocking
Kibana's startup indefinetely. By logging detailed diagnostic info on any
plugins that appear to be blocking startup, we can aid system administrators
to recover a blocked Kibana.

A parallel can be drawn between Kibana's async plugin initialization and the TC39
proposal for [top-level await](https://github.com/tc39/proposal-top-level-await).
> enables modules to act as big async functions: With top-level await,
> ECMAScript Modules (ESM) can await resources, causing other modules who
> import them to wait before they start evaluating their body

They believe the benefits outweigh the risk of modules blocking loading since:
 - [developer education should result in correct usage](https://github.com/tc39/proposal-top-level-await#will-top-level-await-cause-developers-to-make-their-code-block-longer-than-it-should)
 - [there are existing unavoidable ways in which modules could block loading such as infinite loops or recursion](https://github.com/tc39/proposal-top-level-await#does-top-level-await-increase-the-risk-of-deadlocks)


Drawbacks:
1. A blocking setup lifecycle makes it easy for plugin authors to fall into
   the trap of assuming that their plugin's behaviour can continue to operate
   based on the snapshot of conditions present during setup.
2. Since plugins load serially, even if they don't block startup, all the
   delays add up and increase the startup time.
3. This opens up the potential for a bug in Elastic or third-party plugins to
   effectively "break" kibana which creates a bad user experience.

# Adoption strategy
Adoption and implementation should be handled as follows:
a. Don't expose core API's as observables (3).
   This should be implemented first to improve the ergonomics of working with
   core API's from inside synchronous context providers and lifecycle functions.
   
   Plugins consuming observable-based API's generally follow a pattern like the
   following which effectively ignores the observable and should be easy to
   refactor:

   ```diff
   - const adminClient = await coreSetup.elasticsearch.adminClient$.pipe(take(1)).toPromise();
   + const adminClient = coreSetup.elasticsearch.adminClient;
   ```
b. Making context provider functions synchronous (2)
   Adoption of context provider functions is still fairly low, so the amount
   of change required by plugin authors should be limited.
c. Synchronous lifecycle methods (1) will have the biggest impact on plugins
   since many NP plugins and shims have been built with asynchronous lifecycle
   methods in mind.

   The following New Platform plugins or shims currently rely on async lifecycle functions:
   1. [region_map](https://github.com/elastic/kibana/blob/6039709929caf0090a4130b8235f3a53bd04ed84/src/legacy/core_plugins/region_map/public/plugin.ts#L68)
   2. [tile_map](https://github.com/elastic/kibana/blob/6039709929caf0090a4130b8235f3a53bd04ed84/src/legacy/core_plugins/tile_map/public/plugin.ts#L62)
   3. [vis_type_table](https://github.com/elastic/kibana/blob/6039709929caf0090a4130b8235f3a53bd04ed84/src/legacy/core_plugins/vis_type_table/public/plugin.ts#L61)
   4. [vis_type_vega](https://github.com/elastic/kibana/blob/6039709929caf0090a4130b8235f3a53bd04ed84/src/legacy/core_plugins/vis_type_vega/public/plugin.ts#L59)
   5. [timelion](https://github.com/elastic/kibana/blob/9d69b72a5f200e58220231035b19da852fc6b0a5/src/plugins/timelion/server/plugin.ts#L40)
   6. [code](https://github.com/elastic/kibana/blob/5049b460b47d4ae3432e1d9219263bb4be441392/x-pack/legacy/plugins/code/server/plugin.ts#L129-L149)
   7. [spaces](https://github.com/elastic/kibana/blob/096c7ee51136327f778845c636d7c4f1188e5db2/x-pack/legacy/plugins/spaces/server/new_platform/plugin.ts#L95)
   8. [licensing](https://github.com/elastic/kibana/blob/4667c46caef26f8f47714504879197708debae32/x-pack/plugins/licensing/server/plugin.ts)
   9. [security](https://github.com/elastic/kibana/blob/0f2324e44566ce2cf083d89082841e57d2db6ef6/x-pack/plugins/security/server/plugin.ts#L96)

Once this RFC has been merged we should educate teams on the implications to
allow existing New Platform plugins to remove any asynchronous lifecycle
behaviour they're relying on before we change this in core.

# How we teach this

Plugin lifecycle methods in the New Platform are no longer asynchronous.
Plugins should treat the setup lifecycle as a place in time to register
functionality with core or other plugins' API's and not as a mechanism to kick
off and wait for any initialization that's required for the plugin to be able
to run.

# Unresolved questions
1. Are the drawbacks worth the benefits or can we live with Kibana potentially
being blocked for the sake of convenient asynchronous lifecycle stages?

2. Should core provide conventions or patterns for plugins to construct a
   snapshot of state and reactively updating this state and the behaviour it
   drives as the state of the world changes?
