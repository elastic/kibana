# @kbn/jest-serializers

Shared serializers that may be useful when you're writing jest tests. To use them import the package and call one of the functions, passing the result to `expect.addSnapshotSerializer()`.

Example:

```ts
import { createAbsolutePathSerializer } from '@kbn/jest-serializers'

expect.addSnapshotSerializer(createAbsolutePathSerializer());
```