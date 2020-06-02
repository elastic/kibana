- Start Date: 2019-05-11
- RFC PR: (leave this empty)
- Kibana Issue: (leave this empty)

# Summary

Handlers are asynchronous functions registered with core services invoked to
respond to events like a HTTP request, or mounting an application. _Handler
context_ is a pattern that would allow APIs and values to be provided to handler
functions by the service that owns the handler (aka service owner) or other
services that are not necessarily known to the service owner.

# Basic example

```js
// services can register context providers to route handlers
http.registerContext('myApi', (context, request) => ({ getId() { return request.params.myApiId } }));

http.router.route({
  method: 'GET',
  path: '/saved_object/:id',
  // routeHandler implements the "handler" interface
  async routeHandler(context, request) {
    // returned value of the context registered above is exposed on the `myApi` key of context
    const objectId = context.myApi.getId();
    // core context is always present in the `context.core` key
    return context.core.savedObjects.find(objectId);
  },
});
```

# Motivation

The informal concept of handlers already exists today in HTTP routing, task
management, and the designs of application mounting and alert execution.
Examples:

```tsx
// Task manager tasks
taskManager.registerTaskDefinitions({
  myTask: {
    title: 'The task',
    timeout: '5m',
    createTaskRunner(context) {
      return {
        async run() {
          const docs = await context.core.elasticsearch.search();
          doSomethingWithDocs(docs);
        }
      }
    }
  }
})

// Application mount handlers
application.registerApp({
  id: 'myApp',
  mount(context, domElement) {
    ReactDOM.render(
      <MyApp overlaysService={context.core.overlays} />,
      domElement
    );
    return () => ReactDOM.unmountComponentAtNode(domElement);
  }
});

// Alerting
alerts.registerType({
  id: 'myAlert',
  async execute(context, params, state) {
    const indexPatterns = await context.core.savedObjects.find('indexPattern');
    // use index pattern to search
  }
})
```

Without a formal definition, each handler interface varies slightly and
different solutions are developed per handler for managing complexity and
enabling extensibility.

The official handler context convention seeks to address five key problems:

1. Different services and plugins should be able to expose functionality that
   is configured for the particular context where the handler is invoked, such
   as a savedObject client in an alert handler already being configured to use
   the appropriate API token.

2. The service owner of a handler should not need to know about the services
   or plugins that extend its handler context, such as the security plugin
   providing a currentUser function to an HTTP router handler.

3. Functionality in a handler should be "fixed" for the life of that
   handler's context rather than changing configuration under the hood in
   mid-execution. For example, while Elasticsearch clients can technically
   be replaced throughout the course of the Kibana process, an HTTP route
   handler should be able to depend on their being a consistent client for its
   own shorter lifespan.

4. Plugins should not need to pass down high level service contracts throughout
   their business logic just so they can access them within the context of a
   handler.

5. Functionality provided by services should not be arbitrarily used in
   unconstrained execution such as in the plugin lifecycle hooks. For example,
   it's appropriate for an Elasticsearch client to throw an error if it's used
   inside an API route and Elasticsearch isn't available, however it's not
   appropriate for a plugin to throw an error in their start function if
   Elasticsearch is not available. If the ES client was only made available
   within the handler context and not to the plugin's start contract at large,
   then this isn't an issue we'll encounter in the first place.

# Detailed design

There are two parts to this proposal. The first is the handler interface
itself, and the second is the interface that a service owner implements to make
their handlers extensible.

## Handler Context

```ts
interface Context {
  core: Record<string, unknown>;
  [contextName: string]: unknown;
}

type Handler = (context: Context, ...args: unknown[]) => Promise<unknown>;
```

- `args` in this example is specific to the handler type, for instance in a
  http route handler, this would include the incoming request object.
- The context object is marked as `Partial<Context>` because the contexts
  available will vary depending on which plugins are enabled.
- This type is a convention, not a concrete type. The `core` key should have a
  known interface that is declared in the service owner's specific Context type.

## Registering new contexts

```ts
type ContextProvider<T extends keyof Context> = (
  context: Partial<Context>,
  ...args: unknown[]
) => Promise<Context[T]>;

interface HandlerService {
  registerContext<T extends keyof Context>(contextName: T, provider: ContextProvider<T>): void;
}
```

- `args` in this example is specific to the handler type, for instance in a http
  route handler, this would include the incoming request object. It would not
  include the results from the other context providers in order to keep
  providers from having dependencies on one another.
- The `HandlerService` is defined as a literal interface in this document, but
  in practice this interface is just a guide for the pattern of registering
  context values. Certain services may have multiple different types of
  handlers, so they may choose not to use the generic name `registerContext` in
  favor of something more explicit.

## Context creation

Before a handler is executed, each registered context provider will be called
with the given arguments to construct a context object for the handler. Each
provider must return an object of the correct type. The return values of these
providers is merged into a single object where each key of the object is the
name of the context provider and the value is the return value of the provider.
Key facts about context providers:

- **Context providers are executed in registration order.** Providers are
  registered during the setup phase, which happens in topological dependency
  order, which will cause the context providers to execute in the same order.
  Providers can leverage this property to rely on the context of dependencies to
  be present during the execution of its own providers. All context registered
  by Core will be present during all plugin context provider executions.
- **Context providers may be executed with the different arguments from
  handlers.** Each service owner should define what arguments are available to
  context providers, however the context itself should never be an argument (see
  point above).
- **Context providers cannot takeover the handler execution.** Context providers
  cannot "intercept" handlers and return a different response. This is different
  than traditional middleware. It should be noted that throwing an exception
  will be bubbled up to the calling code and may prevent the handler from
  getting executed at all. How the service owner handles that exception is
  service-specific.
- **Values returned by context providers are expected to be valid for the entire
  execution scope of the handler.**

Here's a simple example of how a service owner could construct a context and
execute a handler:

```js
const contextProviders = new Map()<string, ContextProvider<unknown>>;

async function executeHandler(handler, request, toolkit) {
  const newContext = {};
  for (const [contextName, provider] of contextProviders.entries()) {
    newContext[contextName] = await provider(newContext, request, toolkit);
  }

  return handler(context, request, toolkit);
}
```

## End to end example

```js
http.router.registerRequestContext('elasticsearch', async (context, request) => {
  const client = await core.elasticsearch.client$.toPromise();
  return client.child({
    headers: { authorization: request.headers.authorization },
  });
});

http.router.route({
  path: '/foo',
  async routeHandler(context) {
    context.core.elasticsearch.search(); // === callWithRequest(request, 'search')
  },
});
```

## Types

While services that implement this pattern will not be able to define a static
type, plugins should be able to reopen a type to extend it with whatever context
it provides. This allows the `registerContext` function to be type-safe.
For example, if the HTTP service defined a setup type like this:

```ts
// http_service.ts
interface RequestContext {
  core: {
    elasticsearch: ScopedClusterClient;
  };
  [contextName: string]?: unknown;
}

interface HttpSetup {
  // ...

  registerRequestContext<T extends keyof RequestContext>(
    contextName: T,
    provider: (context: Partial<RequestContext>, request: Request) => RequestContext[T] | Promise<RequestContext[T]>
  ): void;

  // ...
}
```

A consuming plugin could extend the `RequestContext` to be type-safe like this:

```ts
// my_plugin/server/index.ts
import { RequestContext } from '../../core/server';

// The plugin *should* add a new property to the RequestContext interface from
// core to represent whatever type its context provider returns. This will be
// available to any module that imports this type and will ensure that the
// registered context provider returns the expected type.
declare module "../../core/server" {
  interface RequestContext {
    myPlugin?: {  // should be optional because this plugin may be disabled.
      getFoo(): string;
    }
  }
}

class MyPlugin {
  setup(core) {
    // This will be type-safe!
    core.http.registerRequestContext('myPlugin', (context, request) => ({
      getFoo() { return 'foo!' }
    }))
  }
};
```

# Drawbacks

- Since the context properties that are present change if plugins are disabled,
  they are all marked as optional properties which makes consuming the context
  type awkward. We can expose types at the core and plugin level, but consumers
  of those types might need to define which properties are present manually to
  match their required plugin dependencies. Example:
  ```ts
  type RequiredDependencies = 'data' | 'timepicker';
  type OptionalDependencies = 'telemetry';
  type MyPluginContext = Pick<RequestContext, 'core'> &
    Pick<RequestContext, RequiredDependencies> &
    Pick<Partial<RequestContext>, OptionalDependencies>;
  // => { core: {}, data: Data, timepicker: Timepicker, telemetry?: Telemetry };
  ```
  This could even be provided as a generic type:
  ```ts
  type AvailableContext<C, Req extends keyof C = never, Opt extends keyof C = never>
    = Pick<C, 'core'> & Required<Pick<C, Req>> & Partial<Pick<C, Opt>>;
  type MyPluginContext = AvailableContext<RequestContext, RequiredDependencies, OptionalDependencies>;
  // => { core: {}, data: Data, timepicker: Timepicker, telemetry?: Telemetry };
  ```
- Extending types with `declare module` merging is not a typical pattern for
  developers and it's not immediately obvious that you need to do this to type
  the `registerContext` function. We do already use this pattern with extending
  Hapi and EUI though, so it's not completely foreign.
- The longer we wait to implement this, the more refactoring of newer code
  we'll need to do to roll this out.
- It's a new formal concept and set of terminology that developers will need to
  learn relative to other new platform terminology.
- Handlers are a common pattern for HTTP route handlers, but people don't
  necessarily associate similar patterns elsewhere as the same set of problems.
- "Chicken and egg" questions will arise around where context providers should be
  registered. For example, does the `http` service invoke its
  registerRequestContext for `elasticsearch`, or does the `elasticsearch` service
  invoke `http.registerRequestContext`, or does core itself register the
  provider so neither service depends directly on the other.
- The existence of plugins that a given plugin does not depend on may leak
  through the context object. This becomes a problem if a plugin uses any
  context properties provided by a plugin that it does not depend on and that
  plugin gets disabled in production. This can be solved by service owners, but
  may need to be reimplemented for each one.

# Alternatives

The obvious alternative is what we've always done: expose all functionality at
the plugin level and then leave it up to the consumer to build a "context" for
their particular handler. This creates a lot of inconsistency and makes
creating simple but useful handlers more complicated. This can also lead to
subtle but significant bugs as it's unreasonable to assume all developers
understand the important details for constructing a context with plugins they
don't know anything about.

# Adoption strategy

The easiest adoption strategy to is to roll this change out in the new platform
before we expose any handlers to plugins, which means there wouldn't be any
breaking change.

In the event that there's a long delay before this is implemented, its
principles can be rolled out without altering plugin lifecycle arguments so
existing handlers would continue to operate for a timeframe of our choosing.

# How we teach this

The handler pattern should be one we officially adopt in our developer
documentation alongside other new platform terminology.

Core should be updated to follow this pattern once it is rolled out so there
are plenty of examples in the codebase.

For many developers, the formalization of this interface will not have an
obvious, immediate impact on the code they're writing since the concept is
already widely in use in various forms.

# Unresolved questions

Is the term "handler" appropriate and sufficient? I also toyed with the phrase
"contextual handler" to make it a little more distinct of a concept. I'm open
to ideas here.
