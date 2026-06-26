---
name: schema-input-bounds
description: Add maxLength/maxSize bounds to @kbn/config-schema and zod string/array fields that validate HTTP request input (route validation, alerting rule params, public API schemas). Use when writing or editing schema.string(), schema.arrayOf(), or z.string() for routes/rule params, or when fixing the CodeQL findings js/kibana/unbounded-string-in-schema and js/kibana/unbounded-array-in-schema.
---

# Bounding Input Schemas (DoS / CodeQL)

Unbounded `string`/`arrayOf` fields on HTTP-facing schemas let a caller send arbitrarily large payloads → memory/CPU DoS. CodeQL flags these as `error`-severity:

- `js/kibana/unbounded-string-in-schema` — `schema.string()` / `z.string()` without a length cap
- `js/kibana/unbounded-array-in-schema` — `schema.arrayOf()` without `maxSize`

These run on every PR and block merge. Add bounds when writing the code, not after the scan.

## The rule

Any `string` or array field reachable from HTTP request input MUST be bounded:

```ts
// @kbn/config-schema
field: schema.string({ maxLength: 1024 }),
list:  schema.arrayOf(schema.string({ maxLength: 1024 }), { maxSize: 1000 }),

// zod (@kbn/zod, @kbn/zod/v4, zod)
field: z.string().max(1024),
```

Bound BOTH the array (`maxSize`) AND its element string (`maxLength`) — a small array of huge strings is still a DoS. `schema.maybe(...)` does not change this; bound the inner type.

"HTTP-facing" includes: route `validation` schemas, alerting **rule params** (created via the alerting API — a public surface), saved-search/connector request bodies, and any schema exported for external callers.

## Choosing limits

Match the field's neighbors and real-world size — don't invent round numbers in isolation. Look at sibling fields in the same schema or the related route first. Synthetics conventions (`server/routes/certs/get_certificates.ts`) are a good reference:

| Field kind | Example limit |
|------------|---------------|
| short enum/origin/id/sort/direction | `maxLength: 256` |
| names, tags, types, search text | `maxLength: 1024` |
| issuer / DN-style long strings | `maxLength: 4096` |
| large blobs (rare) | `maxLength: 1_000_000` |
| arrays of the above | `maxSize: 100`–`1000` (use a named const if one exists, e.g. `MAX_*`) |

## zod strings that DON'T need .max()

Format methods are inherently length-bounded, so `.max()` is redundant (and CodeQL skips them): `.datetime() .date() .time() .duration() .uuid()/.uuidv4/6/7 .guid() .nanoid() .cuid()/.cuid2 .ulid() .xid() .ksuid() .ipv4()/.ipv6() .cidrv4()/.cidrv6()`.

## When a finding is a real false positive

The queries already exclude **data-at-rest / non-request** schemas by path (see `.github/codeql/custom-queries/dos/KibanaDoSExclusions.qll`): `config.ts`, plugin `server/index.ts`, `saved_objects/schemas/`, `saved_objects/model_versions/`, `ui_settings`, `content_management/schema/`, `agent_builder/tools/`, sample-data registration, etc. If your schema is genuinely one of these and lives in a new path, add a path pattern to that `.qll` rather than scattering suppressions.

For a one-off in a mixed-purpose file, use an inline suppression **with a concrete justification** (generic text like "safe"/"false positive" is rejected):

```ts
// codeql[js/kibana/unbounded-array-in-schema] Internal Task Manager state, never HTTP request input
items: schema.arrayOf(schema.string()),
```

Prefer adding bounds over suppressing — a bound is cheap and correct even for internal schemas.

## Verify

```bash
node scripts/type_check --project <path/to/tsconfig.json>
node scripts/eslint --fix $(git diff --name-only)
```

To re-check CodeQL locally, see the `codeql` skill (`scripts/codeql/quick_check.sh`).
