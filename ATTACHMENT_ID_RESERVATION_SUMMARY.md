# Why `id` is Reserved for Attachment Identification

## Summary

The `id` field in attachment types is **reserved** for the Kibana Saved Object ID and cannot be used for attachment-specific identification (like alert IDs, event IDs, or other aggregated identifiers).

## Technical Explanation

### 1. **Saved Objects Client Contract**

The Kibana Saved Objects Client returns objects with an `id` field that represents the unique identifier of the saved object in Elasticsearch. This is a fundamental part of the Saved Objects API contract:

```typescript
interface SavedObject<T> {
  id: string;  // ← Reserved for saved object ID
  type: string;
  version?: string;
  attributes: T;  // ← Your custom data goes here
  // ...
}
```

### 2. **Transformation Layer**

When attachments are returned from the API, they go through a transformation that maps the saved object's `id` directly to the attachment's `id`:

```typescript
// From: x-pack/platform/plugins/shared/cases/server/common/utils.ts
export const flattenCommentSavedObject = (
  savedObject: SavedObject<AttachmentAttributes>
): Attachment => ({
  id: savedObject.id,  // ← Saved object ID becomes attachment.id
  version: savedObject.version ?? '0',
  ...savedObject.attributes,  // ← Custom fields (alertId, eventId, etc.)
});
```

### 3. **Runtime Type Validation**

The `AttachmentRt` type validates API responses and **requires** `id` to be a string representing the saved object ID:

```typescript
// From: x-pack/platform/plugins/shared/cases/common/types/domain/attachment/v1.ts
export const AttachmentRt = rt.intersection([
  AttachmentAttributesRt,
  rt.strict({
    id: rt.string,      // ← Reserved for saved object ID
    version: rt.string,
  }),
]);
```

This validation happens when attachments are returned from the API (e.g., in `get.ts`, `getAll.ts`), ensuring the response matches the expected schema.

### 4. **Current Pattern for Document IDs**

The codebase already follows this pattern by using type-specific fields for document identifiers:

- **Alert attachments**: Use `alertId` (not `id`)
- **Event attachments**: Use `eventId` (not `id`)
- **External references**: Use `externalReferenceId` (not `id`)

```typescript
export const AlertAttachmentPayloadRt = rt.strict({
  type: rt.literal(AttachmentType.alert),
  alertId: rt.union([rt.array(rt.string), rt.string]),  // ← Type-specific ID
  // ...
});

export const EventAttachmentPayloadRt = rt.strict({
  type: rt.literal(AttachmentType.event),
  eventId: rt.union([rt.array(rt.string), rt.string]),  // ← Type-specific ID
  // ...
});
```

## Implications

If you need to aggregate or reference alert IDs, event IDs, or other document identifiers:

✅ **DO**: Use a descriptive field name like:
- `documentIds`
- `resourceIds`
- `entityIds`
- `aggregatedIds`
- Or follow the existing pattern: `alertId`, `eventId`, etc.

❌ **DON'T**: Use `id` for anything other than the saved object ID, as it will:
- Conflict with the saved object transformation
- Fail runtime type validation
- Break the API contract

## Example

If you wanted to add a field that aggregates all document IDs (alerts + events), you would do:

```typescript
export const DocumentAttachmentPayloadRt = rt.strict({
  type: rt.literal(AttachmentType.document),
  documentIds: rt.array(rt.string),  // ← Use documentIds, not id
  indices: rt.array(rt.string),
  owner: rt.string,
});
```

The `id` field at the attachment level will always be the saved object ID, while `documentIds` would contain your aggregated identifiers.
