# `k$`

k$ is an observable library based on "native observables", aka the `Observable`
functionality proposed in https://github.com/tc39/proposal-observable.

Where all other observable libraries put operators and other methods on their
own implementation of a base `Observable`, we want to use the proposed
`Observable` without adding anything to its `prototype`. By doing this, any
operator will always return an instance of the "native" observable.

The reason we want this is that we don't want to expose "heavy" observables
with lots of functionality in our plugin apis, but rather expose "native"
observables.

## Example

```js
import { Observable, k$, map, last } from '@elastic/kbn-observable';

const source = Observable.from(1, 2, 3);

// When `k$` is called with the source observable it returns a function that
// can be called with "operators" that modify the input value and return an
// observable that reflects all of the modifications.
k$(source)(map(i => 2017 + i), last())
  .subscribe(console.log) // logs 2020
```

## Just getting started with Observables?

TODO: Docs, videos, other intros. This needs to be good enough for people to
easily jump in and understand the basics of observables.

If you are just getting started with observables, a great place to start is with
Andre Staltz' [The introduction to Reactive Programming you've been missing](https://gist.github.com/staltz/868e7e9bc2a7b8c1f754),
which is a great introduction to the ideas and concepts.

## Factories

Just like the `k$` function, factories take arguments and produce an observable.
Different factories are useful for different things, and many behave just like
the static functions attached to the `Rx.Observable` class in RxJS.

See [./src/factories](./src/factories) for more info about each factory.

## Operators

Operators are functions that take some arguments and produce an operator
function. Operators aren't anything fancy, just a function that takes an
observable and returns a new observable with the requested modifications
applied. When using `k$` you don't even have to think much about it being an
observable in many cases, as it's just a pure function that receives a value as
an argument and returns a value, e.g.

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

## Why `k$`?

TODO

- We want to expose something minimal, and preferably something close to the
  [proposed native observables](https://github.com/tc39/proposal-observable).
- RxJS is great, but a heavy dep to push on all plugins, especially with regards
  to updates etc.

## Caveats

TODO

Why `k$(source)(...operators)` instead of `k$(source, [...operators])`?

## More advanced topics

TODO: Hot/cold. Multicasting.

## Inspiration

This code is heavily inspired by and based on RxJS, which is licensed under the
Apache License, Version 2.0, see https://github.com/ReactiveX/rxjs.
