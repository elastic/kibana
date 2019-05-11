- Start Date: 2019-05-11
- RFC PR: (leave this empty)
- Kibana Issue: (leave this empty)

# Summary

Handlers are asynchronous functions that get passed a context object including
capabilities and observables that can be provided by the service that owns the
handler (aka service owner) or other services that are not necessarily known to
the service owner.

# Basic example

If the proposal involves a new or changed API, include a basic code example.
Omit this section if it's not applicable.

```js
http.router.route({
  method: 'GET',
  path: '/saved_object/:id',
  // routeHandler implements the "handler" interface
  async routeHandler(context, request) {
    return context.core.savedObjects.find(request.params.id);
  },
});
```

# Motivation

The informal concept of handlers already exists today in HTTP routing, task
management, and the designs of application mounting and alert execution.

Without a formal definition, each handler interface varies slightly and
different solutions are developed per handler for managing complexity and
enabling extensibility.

The official handler interface seeks to address five key problems:

1. Different services and plugins should be able to expose functionality that
   is configured for the particular context where the handler is invoked, such
   as a savedObject client in an alert handler already being configured to use
   the appropriate API token.

2. The service owner of a handler should not need to know about the services
   or plugins that extend its handler context, such as the security plugin
   providing a currentUser function to an HTTP router handler.

3. Many capabilities in a handler should be "fixed" for the life of that
   handler's context rather than changing configuration under the hood in
   mid-execution. For example, while Elasticsearch clients can technically
   be replaced throughout the course of the Kibana process, an HTTP route
   handler should be able to depend on their being a consistent client for its
   own shorter lifespan.

4. Plugins should not need to pass down high level service contracts throughout
   their business logic just so they can access them within the context of a
   handler.

5. Many capabilities provided by services should not be arbitrarily used in
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

## Handler interface

```ts
interface HandlerContext {
  core?: Record<string, unknown>;
  [serviceName: string]: Record<string, unknown>;
}

type Handler = async (HandlerContext, ...args: unknown[]) => unknown;
```

## Handler creator interface

```ts
type CapabilityCreator = async (...args: unknown[]) => Record<string, unknown>;

interface HandlerCreator {
  registerCapability(serviceName: string, CapabilityCreator);
}
```

Note: The `HandlerCreator` is defined as a literal interface in this document,
but in practice this interface is just a guide for the pattern of registering
capabilities. Certain services may have multiple different types of handlers,
so they may choose not to use the generic name `registerCapability` in favor of
something more explicit.

## End to end example

```js
http.router.registerRequestCapability('elasticsearch', async request => {
  const client = await core.elasticsearch.client$.toPromise();
  return client.child({
    headers: { authorization: request.headers.authorization },
  });
});

http.router.route({
  path: '/foo',
  async routeHandler(context) {
    context.elasticsearch.search(); // === callWithRequest(request, 'search')
  },
});
```

# Drawbacks

- Since the service names are passed as strings but accessed as properties,
  it's unclear how best to type these context objects. We can expose types at
  the core and plugin level, but consumers of those types might need to compose
  them together manually.
- The longer we wait to implement this, the more refactoring of newer code
  we'll need to do to roll this out.
- It's a new formal concept and set of terminology that developers will need to
  learn relative to other new platform terminology.
- Handlers are a common pattern for HTTP route handlers, but people don't
  necessarily associate similar patterns elsewhere as the same set of problems.
- "Chicken and egg" questions will arise around where capabilities should be
  registered. For example, does the `http` service invoke its
  registerCapabilities for `elasticsearch`, or does the `elasticsearch` service
  invoke `http.registerCapabilities`, or does core itself register the
  capability so neither service depends directly on the other.

# Alternatives

The obvious alternative is what we've always done: expose all capabilities at
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
