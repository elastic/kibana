# @kbn/as-code-shared-transforms

Shared transform utilities for converting between **stored** (saved object / URL state) and **as-code** shapes.

## Query transforms

Convert between stored `Query` (`@kbn/es-query`) and `AsCodeQuery` (`@kbn/as-code-shared-schemas`):

```ts
import { toAsCodeQuery, toStoredQuery } from '@kbn/as-code-shared-transforms';
```

