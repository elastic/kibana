# `@kbn/zod`

Kibana's `Zod` library. Exposes the `Zod` API with some Kibana-specific
improvements.

## Built-in string helpers

The root package and `@kbn/zod/v4` export semantic string helpers carrying shared
default length bounds.

```typescript
import { z, savedObjectId, spaceId, description, unboundedString } from '@kbn/zod';

z.object({
  // strict, default bounds
  spaceId: spaceId(),
  // override a default bound
  id: savedObjectId({ maxLength: 250 }),
  // reporting mode: accept overlong input, record it, don't reject
  panelId: savedObjectId.warn({ label: 'dashboard.panelId' }),
  // compose after choosing a mode
  description: description().optional(),
  // explicit opt-out, reason required
  blob: unboundedString({ reason: 'Size is enforced upstream' }),
});
```

Refer to [Bounded string schemas](../../../../../docs/extend/key-concepts/security/bounded-string-schemas.md)
for the full list of helpers and their default bounds, length semantics,
reporting-mode telemetry and adoption guidance.

## Lazy schemas

Module-scope `z.object(...)` (and similar builders) materialize the schema graph
at import and keep it on the idle heap. Wrapping connector-spec schemas in
`lazySchema` cut about 52 MB of idle heap in
[PR #294667](https://github.com/elastic/kibana/pull/294667).

```typescript
import { z, lazySchema } from '@kbn/zod';

// before - constructed at import:
// export const UserSchema = z.object({ id: z.string() });

// after - constructed on first use
export const UserSchema = lazySchema(() => z.object({ id: z.string() }));
type User = z.infer<typeof UserSchema>;
```

`z.infer<typeof UserSchema>` still works on the lazy wrapper.

Caveats:

- `instanceof z.ZodObject` / `instanceof z.ZodType` is `false` on the proxy.
  Use `isZod` or structural `_zod` / `.def` checks.
- Chaining `.extend()`, `.optional()`, or `.array()` at module scope retains the
  materialized schema. Prefer deriving inside the `lazySchema` factory.
- Call `setLazySchemaDisabled(true)` to disable the proxy and build eagerly
  (debugging).
- `@kbn/eslint/require_lazy_zod_schema` warns on eager module-scope Zod schemas.
