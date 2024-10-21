# Event Bus

Note this is EXPERIMENTAL. Naming is hard! Maybe a better name is `StateRegistry`?

This plugin provides a global event registry with support for state management.
Under the hood it uses Redux toolkit's `createSlice` combined with `rxjs`.
This means you get the convience of specifying state and actions with `createSlice`,
but the state management itself is not done via `redux` but a framework agnostic
registry.

The main use cases this was developed for:

- It's not recommended to use multiple redux stores within a single SPA.
  Redux setup can also be a bit tricky. Setting up a slice with this plugin
  is a bit simpler and doesn't require another Provider.
- The stateful event bus allows state management across components. An example
  would be a classic crossfilter dashboard: On top of a global search filter,
  each panel may add an additional filter that gets considered by other panels.
- Because the events and state are "data-only" like redux, events and state
  could potentially be replayed and persistet. This also allows to use it
  in a curated way to pass certain events/state across plugin boundaries or
  into sandboxed enviroments.
