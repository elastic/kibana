# `kbn-observable`

kbn-observable is an observable library based on the [proposed `Observable`][proposal]
feature. In includes several factory functions and operators, that all return
"native" observable.

Why build this? The main reason is that we don't want to tie our plugin apis
heavily to a large dependency, but rather expose something that's much closer
to "native" observables, and something we have control over ourselves. Also, all
other observable libraries have their own base `Observable` class, while we
wanted to rely on the proposed functionality.

In addition, kbn-observable includes `System.observable`, which enables interop
between observable libraries, which means plugins can use whatever observable
library they want, if they don't want to use `kbn-observable`.

## Example

```js
import { Observable, k$, map, last } from '../kbn_observable';

const source = Observable.of(1, 2, 3);

// When `k$` is called with the source observable it returns a function that
// can be called with "operators" that modify the input value and return an
// observable that reflects all of the modifications.
k$(source)(map(i => 2017 + i), last())
  .subscribe(console.log) // logs 2020
```

## Just getting started with Observables?

If you are just getting started with observables, a great place to start is with
Andre Staltz' [The introduction to Reactive Programming you've been missing][staltz-intro],
which is a great introduction to the ideas and concepts.

The ideas in `kbn-observable` is heavily based on [RxJS][rxjs], so the
[RxJS docs][rxjs-docs] are also a good source of introduction to observables and
how they work in this library.

**NOTE**: Do you know about good articles, videos or other resources that does
a great job at explaining observables? Add them here, so it becomes easier for
the next person to learn about them!

## Factories

Just like the `k$` function, factories take arguments and produce an observable.
Different factories are useful for different things, and many behave just like
the static functions attached to the `Rx.Observable` class in RxJS.

See [./src/factories](./src/factories) for more info about each factory.

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

Multiple operator functions can be passed to `k$` and will be applied to the
input observable before returning the final observable with all modifications
applied, e.g. like the example above with `map` and `last`.

See [./src/operators](./src/operators) for more info about each operator.

## More advanced topics

This library contains implementations of both `Observable` and `Subject`. To
better understand the difference between them, it's important to understand the
difference between hot and cold observables. Ben Lesh's
[Hot vs Cold Observables][hot-vs-cold] is a great introduction to this topic.

**NOTE**: Do you know about good articles, videos or other resources that goes
deeper into Observables and related topics? Make sure we get them added to this
list!

## Why `kbn-observable`?

While exploring how to handle observables in Kibana we went through multiple
PoCs. We initially used RxJS directly, but we didn't find a simple way to
consistently transform RxJS observables into "native" observables in the plugin
apis. This was something we wanted because of our earlier experiences with
exposing large libraries in our apis, which causes problems e.g. when we need to
perform major upgrades of a lib that has breaking changes, but we can't ship a
new major version of Kibana yet, even though this will cause breaking changes
in our plugin apis.

Then we built the initial version of `kbn-observable` based on the Observable
spec, and we included the `k$` helper and several operators that worked like
this:

```js
import { k$, Observable, map, first } from 'kbn-observable';

// general structure:
const resultObservable = k$(sourceObservable, [...operators]);

// e.g.
const source = Observable.of(1,2,3);
const observable = k$(source, [map(x => x + 1), first()]);
```

Here `Observable` is a copy of the Observable class from the spec. This
would enable us to always work with these spec-ed observables. This api for `k$`
worked nicely in pure JavaScript, but caused a problem with TypeScript, as
TypeScript wasn't able to correctly type the operators array when more than one
operator was specified.

Because of that problem we ended up with `k$(source)(...operators)`. With this
change TypeScript is able to correctly type the operator arguments.

We've also discussed adding a `pipe` method to the `Observable.prototype`, so we
could do `source.pipe(...operators)` instead, but we decided against it because
we didn't want to start adding features directly on the `Observable` object, but
rather follow the spec as close as possible, and only update whenever the spec
receives updates.

## Inspiration

This code is heavily inspired by and based on RxJS, which is licensed under the
Apache License, Version 2.0, see https://github.com/ReactiveX/rxjs.

[proposal]: https://github.com/tc39/proposal-observable
[rxjs]: http://reactivex.io/rxjs/
[rxjs-docs]: http://reactivex.io/rxjs/manual/index.html
[staltz-intro]: https://gist.github.com/staltz/868e7e9bc2a7b8c1f754