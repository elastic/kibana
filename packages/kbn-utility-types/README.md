# `@kbn/utility-types`

TypeScript utility types for usage in Kibana.

- This package re-exports a subset of the items in [`utility-types`](https://github.com/piotrwitek/utility-types)
- You can also add more utility types here.


## Usage

```ts
import { UnwrapObservable } from '@kbn/utility-types';

type A = Observable<string>;
type B = UnwrapObservable<A>; // string
```


## Reference

- `Assign<T, U>` &mdash; From `U` assign properties to `T` (just like object assign).
- `Ensure<T, X>` &mdash; Makes sure `T` is of type `X`.
- `ObservableLike<T>` &mdash; Minimal interface for an object resembling an `Observable`.
- `PublicContract<T>` &mdash; Returns an object with public keys only.
- `PublicKeys<T>` &mdash; Returns public keys of an object.
- `RecursiveReadonly<T>` &mdash; Like `Readonly<T>`, but freezes object recursively.
- `ShallowPromise<T>` &mdash; Same as `Promise` type, but it flat maps the wrapped type.
- `UnionToIntersection<T>` &mdash; Converts a union of types into an intersection.
- `UnwrapObservable<T>` &mdash; Returns wrapped type of an observable.
- `Values<T>` &mdash; Returns object or array value types.
