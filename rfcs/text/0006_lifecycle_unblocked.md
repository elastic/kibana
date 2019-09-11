- Start Date: 2019-09-11
- RFC PR: (leave this empty)
- Kibana Issue: (leave this empty)

# Summary

Prevent plugin lifecycle functions from blocking Kibana startup

# Basic example

If the proposal involves a new or changed API, include a basic code example.
Omit this section if it's not applicable.

# Motivation
We should make it impossible for a single plugin lifecycle function to stall
all of kibana.

### Background:
Plugin lifecycle functions are async (promise-returning) functions. Core runs
these functions in series and waits for each plugin's lifecycle function to
resolve before calling the next. This allows plugins to depend on the API's
returned from other plugins.

# Detailed design
1. Lifecycle functions are synchronous functions, they can perform asynchronous
  operations but Core doesn't wait for these to complete.

2. Context provider functions are synchronous functions.

3. A new Plugin Lifecycle Context is introduced for exposing API's to plugins.

4. Core only exposes it's API's through the Plugin Lifecycle Context.

5. Plugins register their API's with the Plugin Lifecycle Context in order to
   expose functionality to other plugins.

### 1. Synchronous lifecycle functions
### 2. Synchronous Context provider functions

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

*(2.1): exposing elasticsearch through the route handler context:*
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
      // (2.1.1) We can expose a convenient API by doing a lot of work
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
      // (2.1.2) A slightly more awkward API to consume, but easier to build up
      dataClient: async () => {
        const dataClient = await coreSetup.elasticsearch.dataClient$.pipe(take(1)).toPromise();
        dataClient.asScoped(req),
      },
    },
  };
});
```

### 3. & 4. Core only exposes it's API's through the Plugin Lifecycle Context

```ts
// CoreSetup no longer contains any API's like elasticsearch, saved objects
interface CoreSetup {
  withContext((context: SetupContext) => void),
  registerSetupApi<T extends keyof SetupContext>(
    name: T,
    provider: (context: Partial<SetupContext>) => Promise<SetupContext[T]>
  ),
}
```

```ts
export class Plugin {
  public setup(core: CoreSetup) {
    // withContext builds up an updated context and executes the passed in
    // handler in the same 'tick'.
    core.withContext(async (context: SetupContext) => {
      // the only reason for passing an async function is so that we can use
      // await internally to make it easier to do asynchronous operations in
      // series. withContext completely ignores the return value of the handler
      const docs = await context.core.savedObjects.client.find({...});
      ...
      await context.core.savedObjects.client.update(...);
    });
  }
}
```

### 5. Plugins register their API's with the Plugin Lifecycle Context
```ts
export class Plugin {
  public async setup(core: CoreSetup) {
    core.registerSetupApi(
      name: 'data',
      provider: (context: SetupContext) => ({
        ping: () => {
          return context.core.elasticsearch.adminClient.callAsInternalUser('ping', ...)
      })
    );
  }
}
```

# Drawbacks

Why should we *not* do this? Please consider:

- implementation cost, both in term of code size and complexity
- the impact on teaching people Kibana development
- integration of this feature with other existing and planned features
- cost of migrating existing Kibana plugins (is it a breaking change?)

There are tradeoffs to choosing any path. Attempt to identify them here.

# Alternatives
## 1. Just make lifecycle functions synchronous
1. Lifecycle functions are synchronous functions, they can perform asynchronous
  operations but Core doesn't wait for these to complete.

2. Plugins continue to expose their API's by returning from a lifecycle
function. There are no convenient "context" or the luxury of delaying exposing
the full API until all dependencies are available. Each API function will have
to wait for it's dependencies to become available.

```ts
export class Plugin {
  public setup(core: CoreSetup) {
    return {
      search: (id) => {
        return core.elasticsearch.adminClient$.pipe(
          last(),
          map((adminClient) => {
            return adminClient.callAsInternalUser('endpoint', id);
          })
        ).toPromise();
      },
      getObject: (id) => {
        return core.savedObjects.client$.pipe(
          last(),
          map((soClient) => {
            return soClient.find(id);
          })
        ).toPromise();
      }
    }
  }
}
```

## 2. Expose Plugin API's as Observables

The main benefit of this approach is Plugin authors have full control over
which dependencies they want to block on and can fully control the behaviour (
e.g. if elasticsearch isn't available within 5 seconds, expose the API anyway
knowing some functions will always fail).

1. Lifecycle functions are synchronous functions, they can perform asynchronous
  operations but Core doesn't wait for these to complete.

2. Plugins register their API's with Core as Observables

```ts
interface CoreSetup {
  ...
  registerSetupApi<T>(
    name: string,
    provider: () => BehaviourSubject[T]>
  ),
}
```

```ts
export class Plugin {
  public setup(core: CoreSetup) {
    core.registerSetupApi(
      name: 'data',
      provider: () => {
        // Here plugin chooses to "block" exposing it's API until both saved
        // objects and elasticsearch clients are available.
        return combineLatest(
          core.elasticsearch.adminClient$,
          core.savedObjects.client$
        ).pipe(map((adminClient, savedObjectsClient) => {
          return {
            search: (id) => {
              return adminClient.callAsInternalUser('endpoint', id);
            },
            getObject: (id) => {
              return savedObjectsClient.get(id);
            }
          }
        }))
      }
    )
  }
}
```

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