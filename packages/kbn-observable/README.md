# `@kbn/observable`

`@kbn/observable` is an observable library based on the
[proposed `Observable`][proposal] feature and ideas from [RxJS][rxjs].

Why build our own observable library? The main reason is that we don't want to
tie our plugin apis heavily to a large dependency, but rather expose something
that's much simpler and that we have control over ourselves.

In addition, `@kbn/observable` implements `System.observable` which enables
interop between observable libraries, which means plugins can use whatever
observable library they want if they don't want to rely on `@kbn/observable`.

## Example

```js
import { $of, map, last } from '@kbn/observable';

const source = $of(1, 2, 3);

source.pipe(map(i => 2017 + i), last())
  .subscribe(console.log) // logs 2020
```

## Just getting started with Observables?

If you are just getting started with observables, a great place to start is with
Andre Staltz' [The introduction to Reactive Programming you've been missing][staltz-intro],
which is a great introduction to the ideas and concepts.

The ideas in `@kbn/observable` are heavily based on [RxJS][rxjs], so the
[RxJS docs][rxjs-docs] are also a good source of introduction to observables and
how they work in this library.

**NOTE**: Do you know about good articles, videos or other resources that does
a great job at explaining observables? Add them here so it becomes easier for
the next person to learn about them!

## Factories

Factories take arguments and produce an observable. Different factories are
useful for different things, and many behave just like the static functions
attached to the `Rx.Observable` class in RxJS.

The available factories:

- `$bindNodeCallback`
- `$combineLatest`
- `$concat`
- `$error`
- `$fromCallback`
- `$fromIterable`
- `$fromObservable`
- `$fromPromise`
- `$of`

## Operators

Operators are functions that take some arguments and produce an operator
function. Operators aren't anything fancy, just a function that takes an
observable and returns a new observable with the requested modifications
applied.

Some examples:

```js
map(i => 2017 + i);

filter(i => i % 2 === 0)

reduce((acc, val) => {
  return acc + val;
}, 0);
```

Multiple operator functions can be passed to `.pipe` and will be applied to the
input observable before returning the final observable with all modifications
applied, e.g. like the example above with `map` and `last`.

The available operators:

- `filter`
- `first`
- `ifEmpty`
- `last`
- `map`
- `mergeMap`
- `reduce`
- `scan`
- `shareLatestValue`
- `skipRepeats`
- `switchMap`
- `toArray`

## More advanced topics

This library contains implementations of both `Observable` and `Subject`. To
better understand the difference between them, it's important to understand the
difference between hot and cold observables. Ben Lesh's
[Hot vs Cold Observables][hot-vs-cold] is a great introduction to this topic.

**NOTE**: Do you know about good articles, videos or other resources that goes
deeper into Observables and related topics? Make sure we get them added to this
list!

## Why `@kbn/observable`?

While exploring how to handle observables in Kibana we went through multiple
PoCs and explorations. We initially used RxJS directly, but we hit a couple
setbacks. First, we didn't find a simple way to consistently transform RxJS
observables into "native" observables in the plugin apis. This was something we
wanted because of our earlier experiences with exposing large libraries in our
apis, which causes problems e.g. when we need to perform major upgrades of a lib
that has breaking changes, but we can't ship a new major version of Kibana yet,
even though this will cause breaking changes in our plugin apis.

The second problem we hit was that having multiple instances of RxJS is not
supported, which means plugins must use the exact same version as Kibana core.
This means we need to find a way to share the dependency with a plugin.

In the end we decided to build our own small observable implementation that
fits the Kibana context but doesn't contain all bells and whistles required in
a general-purpose observable library.

## Underlying ideas

TODO: more details

- Be explicit, not implicit. E.g. `from` vs `fromX` everywhere
- Solve the 80% use-case. E.g. `shareLatestValue`
- Stay away from the prototype as much as possible

## Inspiration

This code is heavily inspired by and based on RxJS, which is licensed under the
Apache License, Version 2.0, see https://github.com/ReactiveX/rxjs.

## History behind this library

We built an initial version of `@kbn/observable` fully based on the [TC39
Observable proposal][proposal], and even using it's implementation of the
`Observable` class. The reason we later changed to implementing our own
top-level `Observable` class is that the TC39 proposal haven't made progress
in the standardization track and there are clear indications it won't move
forward in its current shape.

There have been initial work on [standardizing observables through
WhatWG][whatwg-observable]. However as that is still in early stages where e.g.
details like `AbortSignal/AbortController` and `async/await` are discussed,
there are no implementations of observable that can be expected to go through
any standardization track without API changes at this point.

In the end we decided to implement our own `Observable` class and base our
implementation on `pipe` and staying away from the prototype, unless we had to
add a method on it.

[proposal]: https://github.com/tc39/proposal-observable
[rxjs]: http://reactivex.io/rxjs/
[rxjs-docs]: http://reactivex.io/rxjs/manual/index.html
[staltz-intro]: https://gist.github.com/staltz/868e7e9bc2a7b8c1f754
[whatwg-observable]: https://github.com/whatwg/dom/issues/544
