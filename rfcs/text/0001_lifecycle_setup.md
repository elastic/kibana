- Start Date: 2019-03-05
- RFC PR: [#32507](https://github.com/elastic/kibana/pull/32507)
- Kibana Issue: [#33045](https://github.com/elastic/kibana/issues/33045)

# Summary

The `setup` lifecycle function for core and plugins will be for one-time setup
and configuration logic that should be completed in a finite amount of time
rather than be available throughout the runtime of the service.

The existing `start` lifecycle function will continue to serve only the purpose
of longer running code that intentionally only executes when `setup` is
finished.

# Basic example

```ts
class Plugin {
  public setup(core, plugins) {
    // example operation that should only happen during setup
    core.savedObjects.setRepository(/* ... */);
  }

  public start(core, plugins) {
    // example retrieval of client with guarantee that repository was set above
    core.savedObjects.getClient();
  }

  public stop(core, plugins) {
    // ...
  }
}
```

# Motivation

We want services and plugins to be designed to adapt to changes in data and
configurations over time, but there are practical limits to this philosophy,
which we already acknowledge by having a separate `start` and `stop` handler.

Currently, the `start` handler is where the vast majority of business logic
takes place because it gets fired off almost immediately on startup and then no
new lifecycle events are encountered until it's time to shutdown.

This results in lifecycle-like behaviors being hardcoded into the `start`
handler itself rather than being exposed in a systematic way that other
services and plugins can take advantage of.

For example, core should not bind to a port until all HTTP handlers have been
registered, but the service itself needs to initialize before it can expose the
means of registering HTTP endpoints for plugins. It exposes this capability via
its `start` handler. Port binding, however, is hardcoded to happen after the
rest of the services are started. No other services behave this way.

Unlike core services which can have hacky hardcoded behaviors that don't
completely adhere to the order of execution in a lifecycle, plugins have no way
of saying "execute this only when all plugins have initialized". It's not
practical for a plugin that has side effects like pushing cluster privileges to
Elasticsearch to constantly be executing those side effects whenever an
observable changes. Instead, they need a point in time when they can safely
assume the necessary configurations have been made.

A `setup` lifecycle handler would allow core and plugins to expose contracts
that have a reliable expiration in the context of the overall lifecycle.

# Detailed design

A new `setup` lifecycle handler will be adopted for services and plugins. The
order in which lifecycle handlers execute will be:

1. `setup`
2. `start`
3. `stop`

## Core

The core system will have an `setup` function that will get executed prior to
`start`. An `setup` function will also be added to all core services, and will
be invoked from the core `setup` in the same spirit of `start` and `stop`.

Decisions on which service functionality should belong in `setup` vs `start`
will need to be handled case-by-case and is beyond the scope of this RFC, but
much of the existing functionality will likely be exposed through `setup`
instead.

## Plugins

Plugins will have an `setup` function that will get executed by the core plugin
service from its own `setup`.

Like `start` and `stop`, the `setup` lifecycle handler will receive
setup-specific core contracts via the first argument.

Also like `start` and `stop`, the `setup` lifecycle handler will receive the
setup-specific plugin contracts from all plugins that it has a declared
dependency on via the second argument.

# Drawbacks

- An additional lifecycle handler adds complexity for many plugins and services
which draw no direct benefit from it.
- The answer to "does this belong in `setup` or `start`?" is not always clear.
There is not a formal decision tree we can apply to all circumstances.
- While lifecycle hooks are relatively new, there still many services that will
need to be updated.
- Adopting new lifecycle hooks is a slippery slope, and the more we have in the
system, the more complicated it is to reason about the capabilities of the
system at any given point.

# Alternatives

When a service or plugin needs to know when initialization has finished, it can
expose a custom event or transaction system via its relevant contracts so it
can tell when downstream code has finished initializing. One significant
drawback to this approach is that it only works when the plugin that needs to
wait for initialization isn't dependent on an upstream service that does not
implement a similar transaction capability.

# Adoption strategy

Adoption will need to be manual. Since the bulk of the `start` logic in the
repo today is configuration-oriented, I recommend renaming `start`->`setup` in
all services and plugins, and then adding an empty `start` where it is
necessary. Functionality can then be moved from `setup`->`start` on a
case-by-case.

If this change doesn't happen for awhile, then it might make sense to follow
the reverse process to ensure the least impact.

The migration guide will be updated to reflect the `setup` and `start`
distinction as soon as this RFC is accepted.

# How we teach this

There shouldn't need to be much knowledge sharing around this since even
`start` and `stop` are new concepts to most people. The sooner we introduce
this change, the better.

# Unresolved questions

None, at the moment.
