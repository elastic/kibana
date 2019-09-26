# `@kbn/utility-types`

TypeScript utility types for usage in Kibana.

- This package re-exports a subset of the items in [`utility-types`](https://github.com/piotrwitek/utility-types)
- You can also add more utility types here.


## Usage

```ts
import { UnwrapPromise } from '@kbn/utility-types';

type A = Promise<string>;
type B = UnwrapPromise<A>; // string
```


## Reference

- `UnwrapPromise<T>` &mdash; Returns wrapped type of a promise.
- `UnwrapObservable<T>` &mdash; Returns wrapped type of an observable.
- `ShallowPromise<T>` &mdash; Same as `Promise` type, but it flat maps the wrapped type.
- `ObservableLike<T>` &mdash; Minimal interface for an object resembling an `Observable`.
