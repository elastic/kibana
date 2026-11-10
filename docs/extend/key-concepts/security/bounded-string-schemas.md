---
navigation_title: "Bounded string schemas"
description: "Bound string lengths on HTTP request fields using the built-in schema string helpers, and roll them out safely with reporting mode"
---

# Bounded string schemas

An HTTP route that accepts an unbounded string lets any authenticated caller push an arbitrarily large payload through request validation, serialization, and on into Elasticsearch. Each such field is a denial-of-service surface: memory and CPU spent on input the route was never designed to accept. Bounding request strings is part of Kibana's ongoing hardening work, and a CodeQL rule flags unbounded string schemas on routes.

`@kbn/config-schema` and `@kbn/zod` both ship a set of semantic string helpers that carry shared default length bounds, so route authors pick a field's *meaning* rather than inventing a number — and so the limits can be reviewed and adjusted in one place.

For the broader API design rule these helpers implement, see [Validation](../../contributing/api-design/guidelines-for-http-api-design-in-kibana.md#validation).

## Available helpers

Both libraries export the same helpers with the same defaults, sourced from [`@kbn/schema-string-helpers`](https://github.com/elastic/kibana/tree/main/src/platform/packages/shared/kbn-schema-string-helpers):

| Helper | Minimum length | Maximum length |
| --- | ---: | ---: |
| `savedObjectId` | 1 | 512 |
| `savedObjectType` | 1 | 256 |
| `savedObjectVersion` | 1 | 256 |
| `spaceId` | 1 | 512 |
| `displayName` | 1 | 1,024 |
| `description` | 0 | 10,000 |
| `searchFilter` | 0 | 10,000 |
| `aggregation` | 0 | 100,000 |
| `querySortField` | 0 | 256 |

```typescript
// @kbn/config-schema — available on `schema` and as named exports
import { schema, savedObjectId, spaceId } from '@kbn/config-schema';

const params = schema.object({
  spaceId: spaceId(),
  savedObjectId: savedObjectId.warn({ label: 'dashboard.panelId' }),
});
```

```typescript
// @kbn/zod — named factory exports
import { z, savedObjectId, spaceId, displayName } from '@kbn/zod';

const params = z.object({
  spaceId: spaceId(),
  savedObjectId: savedObjectId.warn({ label: 'dashboard.panelId' }),
});
```

## What the limits mean

Lengths count UTF-16 code units, matching JavaScript `string.length`. These are input size bounds, not byte limits or format validation.

The saved object defaults follow [`saved_objects_length_limits.ts`](https://github.com/elastic/kibana/blob/main/src/core/packages/saved-objects/server/src/saved_objects_length_limits.ts); Elasticsearch still enforces its own separate byte limit on the combined document ID. `description` and `querySortField` have no counterpart there — they are new bounds for request fields that solution teams were already bounding inconsistently.

Helpers with a minimum of zero allow empty strings. To allow an *absent* field, use the library's optional wrapper (`schema.maybe()` / `.optional()`).

## Overriding limits

Factories accept `minLength` and `maxLength` overrides alongside the library's own string options (`validate`, `hostname` and coercion for config-schema; `error` and friends for Zod):

```typescript
schema.object({ id: schema.savedObjectId({ maxLength: 250 }) });
```

Undefined overrides retain the defaults. Limits must be finite, non-negative integers with minimum less than or equal to maximum; anything else throws at schema construction time. Use overrides to preserve an existing route contract when adopting a helper — do not loosen a bound that is already stricter than the default.

In Zod, apply ordinary composition (`.optional()`, `.nullable()`, `.regex()`, `.refine()`) **after** selecting strict or reporting mode. Strict schemas emit their length limits in JSON Schema / OpenAPI output; reporting schemas omit the maximum they do not enforce.

## Reporting mode

Adopting a bound on an existing route risks rejecting traffic that works today. Reporting mode measures first:

```typescript
savedObjectId.warn({ label: 'dashboard.panelId' });
```

`.warn()` accepts overlong input and records a violation instead of failing validation. Only maximum length enforcement is disabled — minimum length and every other validator stay active. A `maxLength` override changes the reporting threshold. Call `.warn()` on the factory, before composing the returned schema.

Reporting mode preserves custom `validate`, `hostname`, coercion, defaults and metadata options. Default values retain config-schema's existing behavior: they are not validated.

### Telemetry

Each overlong validation records the string's length in the histogram `kibana.schema.string_length_violation.length` on the `kibana.schema` OTel meter. The histogram measures UTF-16 code units (`{code_unit}`) and carries these attributes:

| Attribute | Value |
| --- | --- |
| `schema.helper` | The helper name, for example `savedObjectId` |
| `schema.library` | `config-schema` or `zod` |
| `schema.max_length` | The threshold that was exceeded |
| `schema.label` | Optional caller-supplied field identifier |

:::{warning}
`label` must be a **static field identifier** chosen by the route author — never a request value, user ID, or anything else derived from input. It becomes a metric attribute, so request-derived values would both explode cardinality and leak input into telemetry. This is a convention, not a runtime-enforced constraint.
:::

Neither input contents nor actual input lengths are recorded as attributes. The histogram count gives the number of violations; its sum, minimum, maximum and buckets describe the lengths of the violating strings. Suggested bucket boundaries cover lengths through 1,048,576 code units, with larger values landing in the overflow bucket; exporter or provider views may override these boundaries.

Counts represent validation *attempts* — including repeated validation and unsuccessful union branches — rather than distinct requests.

### Enabling and querying

Reporting uses the existing OTel provider and exporters. Without a configured provider it is a no-op. Enable and configure `telemetry.metrics` as described in [`@kbn/metrics`](https://github.com/elastic/kibana/tree/main/src/platform/packages/private/opentelemetry/kbn-metrics). Where metrics ship to the serverless metrics cluster, query `serverless-metrics-*:metrics-*.otel-*` for `metrics.kibana.schema.string_length_violation.length:*` and group by the attributes above.

Calling `.warn()` does not enable exporters and does not impose a maximum length. Switch to the strict helper once the observed bounds have been reviewed.

## Intentionally unbounded strings

Some fields genuinely cannot carry a maximum. Declare that explicitly:

```typescript
unboundedString({ reason: 'Size is enforced upstream by the ingest pipeline' });
```

The reason is required and must be non-empty; it is checked at schema definition time and the type excludes a maximum-length option entirely. The reason documents the call site and is **not** sent to telemetry.

CodeQL recognizes this escape hatch and the helpers' explicit `.warn()` mode. Ordinary unbounded string schemas remain subject to the rule.

## Adopting the helpers

- Adopt helpers in team-owned route changes, preserving stricter bounds and existing format validation as needed.
- Replace justified `codeql[...]` string suppressions with `unboundedString({ reason: ... })`.
- Reach for `.warn()` when an existing route's real-world bounds are unknown, and follow up with the strict helper once the histogram has data.
