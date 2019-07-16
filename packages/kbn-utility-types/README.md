# `@kbn/utility-types`

TypeScript utility types for usage in Kibana.

- This package re-exports everything in [`utility-types`](https://github.com/piotrwitek/utility-types)
- You can also add more utility types here.


## Usage

```ts
import { UnwrapPromise } from '@kbn/utility-types';

type A = Promise<string>;
type B = UnwrapPromise<A>; // string
```


## Reference

- `UnwrapPromise<T>` &mdash; returns wrapped type of a promise.
- `UnwrapObservable<T>` &mdash; returns wrapped type of an observable.
- `ObservableLike<T>` &mdash; minimal interface for an object resembling an `Observable`.
