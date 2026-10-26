# @kbn/lazy-object

Utilities for deferring the construction of objects until they are first used,
so that modules that declare many objects at load-time don't pay the
construction cost (time and memory) for the ones that are never touched.

The package offers several variants that differ in granularity, caching, and
how they're authored:

## `lazyObject(obj)` + Babel plugin

Author object literals normally; a Babel plugin rewrites `lazyObject({ ... })`
call sites into `createLazyObjectFromFactories({ key: () => expr, ... })` so
each property is built on first access and cached forever. At runtime without
the Babel plugin this is an identity function.

Use when: you want ergonomic lazy fields on an object without changing source
style. Requires the Babel plugin in the build.

## `createLazyObjectFromFactories(factories)`

Runtime-only version of the above. Takes an object whose values are factory
functions and returns an object whose properties materialize on first read
(cached forever). No build-time support needed.

Use when: you want per-property laziness without the Babel plugin.

## `createLazyObjectFromAnnotations(obj)` + `annotateLazy(fn)`

Like `createLazyObjectFromFactories`, but you mark individual factory values
with `annotateLazy(...)` so an object can mix eagerly-defined fields with
lazily-computed ones.

Use when: only some fields of an object benefit from laziness.

## Metrics

`getLazyObjectMetrics()` returns a `{ count, called }` snapshot for the
annotation-based variants (how many lazy keys were registered vs. materialized),
useful when evaluating whether laziness is paying off in a given module graph.
