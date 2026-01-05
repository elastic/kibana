# @kbn/lens-common-2

Split off of `@kbn/lens-common` because of circular dependence issues importing LensApiSchemaType.

```ts
import type { LensApiSchemaType } from '@kbn/lens-embeddable-utils';
```
