# `@kbn/utility-types-jest`

TypeScript Jest utility types for usage in Kibana.
You can add as much as any other types you think that makes sense to add here.


## Usage

```ts
import type { MockedKeys } from '@kbn/utility-types-jest';

type A = MockedKeys<OTHER_TYPE>;
```


## Reference

- `DeeplyMockedKeys<T>`
- `MockedKeys<T>`

