# Design: `permissions` field on `contextEngine.addEntry`

- **Issue:** [elastic/search-team#15092](https://github.com/elastic/search-team/issues/15092) — "[Context Enginer] contextEngine.addEntry -> convert elasticsearchIndices to permissions"
- **Parent epic:** [elastic/search-team#14997](https://github.com/elastic/search-team/issues/14997) — "[Epic] [Context Engine] Permissions"
- **Slack context:** [#context-eng thread, 2026-06-30](https://elastic.slack.com/archives/C0AKVA5429Z/p1782853003630959)
- **Related prior work:** [#275170](https://github.com/elastic/kibana/pull/275170) — "[Context Engine] Add SmlTypeDefinition.getPermissions hook and unify write paths" (merged 2026-07-01, the day this issue was assigned). That PR *removed* permissions passthrough from the workflow step specifically to close a spoofing hole (search-team#15029, #15057). This design must not reopen that hole.

## Problem

`contextEngine.addEntry` (step type ID `contextEngine.addEntry`, implemented as the "SML index attachment" step) writes chunks into the Context Engine corpus via `SmlIndexer.indexManualChunks`. Access control for the resulting documents is derived by `resolvePermissionsForOrigin`, which:

- Calls the registered `attachmentType`'s `getPermissions(originId, context)` hook, if one exists, and treats its output as authoritative — the workflow step cannot override or supply its own permissions today (this is intentional, added in #275170 to stop workflow authors from spoofing access).
- If the registered type has **no** `getPermissions` hook (e.g. the built-in `corpus_entry` type, which is what issue #15092's example YAML targets), the indexer stamps **empty `SmlPermissions`**, meaning the content is fully space-public with no way to gate it by Elasticsearch index.

That second case is the actual gap: workflow authors writing `corpus_entry` chunks (or any other no-hook type) have no way to restrict visibility to only users with read access to specific source indices/data streams. The issue's proposal — adding a `permissions` field to the step's `with:` params — is exactly right for that case, but a naive implementation would reopen the spoofing hole for hook-backed types (dashboard, connector, significant_event, etc.), where the hook must remain the sole source of truth.

## Goals

- Let workflow authors supply a `permissions` object on `contextEngine.addEntry` (upsert action only) to gate the indexed content, for use with attachment types that have no `getPermissions` hook.
- Preserve the existing anti-spoofing guarantee for attachment types that **do** have a `getPermissions` hook — the hook remains authoritative, full stop.
- Keep the field optional and backward compatible — omitting it preserves exactly today's behavior (empty/public permissions for no-hook types).
- Shape the field so it can grow later (document-level and field-level ES grants, third-party connector permission types) without another breaking schema change.

## Non-goals

- Validating that named Elasticsearch indices/data streams actually exist, or resolving aliases, at write time. Matches the existing semantics of `SmlElasticsearchIndex.name` — a keyword used for privilege-matching at read time, not a live reference.
- Any change to the `delete` action/path — deletion is by `originId`/`ingestionMethod` and never reads or depends on `permissions`.
- Elasticsearch document-ID or field-level (DLS/FLS) grants, or third-party connector permission types (e.g. Salesforce case-level permissions). The schema is shaped to accommodate these later as sibling keys, but adding them is out of scope for this change.
- Changing `getPermissions`'s signature or adding per-call parameterization to it. Hook-backed types are unaffected by this change.

## Architecture

Add an optional `permissions` field to the `upsert` branch of the step's input schema, shaped as a subset of the existing `SmlPermissions` type (`server/services/sml/types.ts`), not a bespoke shape:

```yaml
- name: sink_index_ki
  type: contextEngine.addEntry
  with:
    originId: '{{ consts.prefix }}{{ foreach.item }}'
    action: upsert
    type: corpus_entry
    item: '{{ steps.profile_index.output.structured_output | default: foreach.item }}'
    permissions:
      elasticsearch:
        indices:
          - name: '{{ consts.prefix }}{{ foreach.item }}'
          - name: my_data_stream
      kibana:
        privileges:
          - name: 'saved_object:dashboard/get'
```

Both `elasticsearch.indices` and `kibana.privileges` are optional arrays of `{ name: string }` objects — matching `SmlElasticsearchIndex` and `SmlKibanaPrivilege` exactly, object-wrapped (not bare strings) so `documents`/`fields` keys can be added to that same object later without changing the array shape.

**Resolution rule**, implemented at the single existing choke point (`resolvePermissionsForOrigin` in `sml_indexer.ts`, which all write paths — crawler, workflow step, HTTP route — already funnel through):

| Registered type has `getPermissions`? | Caller supplied `permissions`? | Result |
|---|---|---|
| Yes | No | Hook's output used (today's behavior, unchanged) |
| Yes | Yes | **Reject the step run** with a clear conflict error — this is a misconfiguration, not a silent no-op |
| No (or type unregistered) | No | Empty `SmlPermissions` (today's behavior, unchanged — space-public) |
| No (or type unregistered) | Yes | Caller-supplied `permissions` used as-is, converted directly into `SmlPermissions` (missing sub-keys default to `[]`) |

This is strictly additive for no-hook types (previously always fully public; now can be narrowed) and leaves hook-backed types exactly as protected as before — the hook is never bypassed, and attempting to supply `permissions` alongside a hook-backed type fails loudly rather than being silently dropped, so a workflow author never mistakenly believes their `permissions` took effect.

## Schema changes

**File:** `x-pack/platform/plugins/shared/agent_context_layer/common/workflow_steps/sml_index_attachment_step.ts`

```typescript
const SmlPermissionsInputSchema = z
  .object({
    elasticsearch: z
      .object({
        indices: z.array(z.object({ name: z.string().min(1) })),
      })
      .partial()
      .optional(),
    kibana: z
      .object({
        privileges: z.array(z.object({ name: z.string().min(1) })),
      })
      .partial()
      .optional(),
  })
  .strict();
```

Added to the `upsert` branch of `SmlIndexAttachmentInputSchema` only:

```typescript
z.object({
  originId: z.string().min(1).max(MAX_SML_IDENTIFIER_LENGTH)...,
  attachmentType: AttachmentTypeSchema,
  action: z.literal('upsert'),
  chunks: z.array(ChunkSchema).min(1).max(100),
  permissions: SmlPermissionsInputSchema.optional(),
}),
```

`.strict()` on `SmlPermissionsInputSchema` itself rejects typo'd/unknown keys (e.g. `elasticserch`) at parse time. The `delete` branch is untouched.

## Threading

`permissions` flows: step handler → `startContract.indexAttachment()` (new optional field on `SmlIndexAttachmentContentMode`, `server/services/sml/types.ts`) → `SmlIndexer.indexManualChunks()` → `resolvePermissionsForOrigin()`.

```typescript
private async resolvePermissionsForOrigin({
  definition,
  originId,
  context,
  requestedPermissions, // new, optional; only ever populated from content-mode callers
}: {
  definition: SmlTypeDefinition | undefined;
  originId: string;
  context: SmlContext;
  requestedPermissions?: SmlPermissions;
}): Promise<SmlPermissions> {
  const hasHook = Boolean(definition?.getPermissions);

  if (hasHook && requestedPermissions) {
    throw new SmlPermissionsConflictError(
      `attachmentType "${definition!.id}" derives permissions via getPermissions() and does not accept a workflow-supplied "permissions" field.`
    );
  }

  if (hasHook) {
    const result = await definition!.getPermissions!(originId, context);
    return {
      kibana: { privileges: result.kibana?.privileges ?? [] },
      elasticsearch: { indices: result.elasticsearch?.indices ?? [] },
    };
  }

  if (requestedPermissions) {
    return {
      kibana: { privileges: requestedPermissions.kibana?.privileges ?? [] },
      elasticsearch: { indices: requestedPermissions.elasticsearch?.indices ?? [] },
    };
  }

  return { kibana: { privileges: [] }, elasticsearch: { indices: [] } };
}
```

The thrown `SmlPermissionsConflictError` propagates up through `indexManualChunks` → `indexAttachment` → the workflow step handler, which surfaces it as a step failure using whatever convention the handler already uses for other validation errors (to be confirmed against the handler's existing error-handling code during implementation — e.g. a typed `WorkflowStepError` wrapper, if one exists). The check happens before any ES mutation, consistent with the existing fail-closed ordering in `resolvePermissionsForOrigin`.

Unregistered `attachmentType` (no definition found at all) is treated identically to "registered, no hook" — `requestedPermissions` is honored if supplied, otherwise empty. This path's existing once-per-process warn log is unaffected.

## Testing plan

Extend `sml_index_attachment_step.test.ts` and `sml_indexer.test.ts`:

1. **Schema tests** (alongside the existing "input-schema permission spoofing guard" block): accepts valid `permissions.elasticsearch.indices` / `permissions.kibana.privileges` in `{name}`-object-array shape; rejects malformed shapes (bare strings instead of `{name}` objects; unknown keys under `permissions`).
2. **No-hook type + `permissions` supplied**: extend the existing end-to-end real-indexer test — indexed document's `permissions.elasticsearch.indices` / `permissions.kibana.privileges` match exactly what was supplied.
3. **No-hook type + `permissions` omitted**: existing test continues to pass unchanged (empty permissions, space-public).
4. **Hook-backed type + `permissions` supplied**: step run fails with `SmlPermissionsConflictError` (or equivalent surfaced step failure); assert **no ES write occurs** — mutation-before-check ordering preserved.
5. **Hook-backed type + `permissions` omitted**: existing test continues to pass unchanged (hook's permissions used).
6. **Delete path**: no new tests required — schema/behavior unchanged, existing tests continue to pass.

No test is added for "index name doesn't exist" rejection, since no existence validation is performed (see Non-goals).

## Open items for implementation

- Confirm the exact mechanism the workflow step handler already uses to convert a thrown service-layer error into a step-run failure (error type/wrapper), so `SmlPermissionsConflictError` (or whatever it's named) surfaces consistently with other step errors.
- Confirm naming: `SmlPermissionsConflictError` is a placeholder; match existing error-naming conventions in `agent_context_layer/server/services/sml/`.
