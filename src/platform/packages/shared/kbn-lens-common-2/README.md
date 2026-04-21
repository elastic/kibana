# @kbn/lens-common-2

Split off of `@kbn/lens-common` because of circular dependence issues importing LensApiConfig.

```ts
import type { LensApiConfig } from '@kbn/lens-embeddable-utils';
```
