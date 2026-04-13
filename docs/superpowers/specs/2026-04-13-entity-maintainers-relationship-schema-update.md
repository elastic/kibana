# Entity Maintainers: Relationship Schema Update

**Date:** 2026-04-13
**Issue:** elastic/kibana#262893
**Schema change:** elastic/kibana#262242

## Background

PR #262242 updated the entity store v2 schema so that each relationship field is now an
`EntityRelationship` object (`{ ids?: string[]; raw_identifiers?: {...} }`) instead of a
plain array of EUID strings. Entity maintainers that call `bulkUpdateEntity` with
relationship data must be updated to match.

**Old shape (pre-#262242):**
```json
{
  "entity": {
    "id": "user:alice@corp",
    "relationships": {
      "communicates_with": ["service:s3.amazonaws.com"],
      "accesses_frequently": ["host:prod-db-01@corp"]
    }
  }
}
```

**New shape:**
```json
{
  "entity": {
    "id": "user:alice@corp",
    "relationships": {
      "communicates_with": { "ids": ["service:s3.amazonaws.com"] },
      "accesses_frequently": { "ids": ["host:prod-db-01@corp"] }
    }
  }
}
```

Maintainers own the EUID side of relationships, so they write into `ids` only.
`raw_identifiers` is populated by integrations and is out of scope for this change.

## Scope

Two maintainers are affected: `communicates_with` and `accesses`.
`owns_inferred` and any future relationship maintainers are out of scope.

## Approach

Direct inline changes — no new abstractions. The `accesses` maintainer also gets its
`ProcessedEntityRecord` updated to carry `{ ids: string[] }` end-to-end so the internal
type mirrors the entity store shape.

## File Changes

### `communicates_with/update_entities.ts`

One-line change in `mergeRecordsByEntityId` output:

```ts
// Before
communicates_with: Array.from(targets),

// After
communicates_with: { ids: Array.from(targets) },
```

### `accesses/types.ts`

Update `ProcessedEntityRecord` to carry the relationship shape end-to-end:

```ts
// Before
accesses_frequently: string[];
accesses_infrequently: string[];

// After
accesses_frequently: { ids: string[] };
accesses_infrequently: { ids: string[] };
```

### `accesses/postprocess_records.ts`

Wrap the `toStringArray` results in the new shape:

```ts
// Before
accesses_frequently: toStringArray(record.accesses_frequently),
accesses_infrequently: toStringArray(record.accesses_infrequently),

// After
accesses_frequently: { ids: toStringArray(record.accesses_frequently) },
accesses_infrequently: { ids: toStringArray(record.accesses_infrequently) },
```

### `accesses/run_maintainer.ts`

Update the logging lines that call `.join()` directly on the relationship fields:

```ts
// Before
record.accesses_frequently.join(', ')
record.accesses_infrequently.join(', ')

// After
record.accesses_frequently.ids.join(', ')
record.accesses_infrequently.ids.join(', ')
```

### `accesses/update_entities.ts`

The `buildEntityDoc` function passes the objects straight through. Only the guard
changes to check `.ids.length`:

```ts
// Before
accesses_frequently: record.accesses_frequently.length > 0 ? record.accesses_frequently : undefined,
accesses_infrequently: record.accesses_infrequently.length > 0 ? record.accesses_infrequently : undefined,

// After
accesses_frequently: record.accesses_frequently.ids.length > 0 ? record.accesses_frequently : undefined,
accesses_infrequently: record.accesses_infrequently.ids.length > 0 ? record.accesses_infrequently : undefined,
```

Note: the `undefined`-when-empty guard is preserved intentionally.
Removing it is tracked separately in elastic/kibana#262869.

## Test Changes

### `communicates_with/update_entities.test.ts`

Update the two existing assertions that check the `communicates_with` value directly:

- `'passes communicates_with strings directly'` — expect `{ ids: ['service:s3...', ...] }`
- `'merges communicates_with targets...'` / `'deduplicates identical target strings...'` — same

### `accesses/update_entities.test.ts` (new file)

Mirror the `communicates_with` test structure. Cover:

- Returns 0 and skips API when `records` is empty
- `{ ids: [] }` → field is `undefined` (guard preserved)
- Non-empty `ids` → correct `{ ids: [...] }` shape passed to `bulkUpdateEntity`
- Both `accesses_frequently` and `accesses_infrequently` populated in a single doc
- `force: true` always passed
- Error count returned correctly

### `accesses/postprocess_records.test.ts`

Update any existing assertions on `accesses_frequently` / `accesses_infrequently` to
expect the new `{ ids: [...] }` shape.

## Definition of Done

- [ ] `communicates_with/update_entities.ts` updated
- [ ] `accesses/types.ts` updated
- [ ] `accesses/postprocess_records.ts` updated
- [ ] `accesses/run_maintainer.ts` logging updated
- [ ] `accesses/update_entities.ts` updated
- [ ] `communicates_with/update_entities.test.ts` assertions updated
- [ ] `accesses/update_entities.test.ts` created
- [ ] `accesses/postprocess_records.test.ts` assertions updated
- [ ] TypeScript compiles with no errors in affected files
- [ ] Unit tests pass
