# `@kbn/zod`

Kibana's `Zod` library. Exposes the `Zod` API with some Kibana-specific
improvements.

## Built-in string helpers

The root package and `@kbn/zod/v4` export semantic string helpers carrying shared
default length bounds.

```typescript
import { z, savedObjectId, spaceId, description, boundedString, unboundedString } from '@kbn/zod';

z.object({
  // strict, default bounds
  spaceId: spaceId(),
  // override a default bound
  id: savedObjectId({ maxLength: 250 }),
  // reporting mode: accept overlong input, record it, don't reject
  panelId: savedObjectId.warn({ label: 'dashboard.panelId' }),
  // compose after choosing a mode
  description: description().optional(),
  // no semantic helper fits: explicit limit required
  keyFile: boundedString({ maxLength: 4096 }),
  // explicit opt-out, reason required
  blob: unboundedString({ reason: 'Size is enforced upstream' }),
});
```

Refer to [Bounded string schemas](../../../../../docs/extend/key-concepts/security/bounded-string-schemas.md)
for the full list of helpers and their default bounds, length semantics,
reporting-mode telemetry and adoption guidance.
