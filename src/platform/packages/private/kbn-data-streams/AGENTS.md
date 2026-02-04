# Data Streams Package

## About This Document

**Audience**: LLM coding agents working on the `@kbn/data-streams` package or plugins using data streams.

**Include**: Data mapper pattern, space-aware APIs, mapping enrichment, ID prefixing patterns, and security validations.

**Exclude**: Generic Elasticsearch patterns, standard TypeScript conventions.

---

## 1. Package Overview

The `@kbn/data-streams` package provides a lightweight data-mapper for CRUD operations against Elasticsearch data streams. It's exposed as a core service (`DataStreamsService`) and can be used by plugins.

**Location**: `src/platform/packages/private/kbn-data-streams/`

**Public API**: Exported from `src/platform/packages/private/kbn-data-streams/index.ts`

---

## 2. Data Mapper Pattern

The `DataStreamClient` implements a **data mapper pattern** that abstracts away the complexities of working with Elasticsearch data streams:

- **Abstraction**: Hides backing index details from users
- **Type Safety**: Provides TypeScript type safety based on mapping definitions
- **Space Awareness**: Built-in support for multi-tenancy via space isolation
- **Mapping Management**: Automatic mapping enrichment and versioning

### Key Principle

**Backing indices are a private implementation detail**. Operations that require knowledge of backing index names (like `get()`, bulk `update`, bulk `delete`) are not exposed in the API. Instead, use `search()` with appropriate queries to achieve the same results.

---

## 3. Exposed Operations

### `create(documents, options?)`

Create one or more documents in the data stream. Accepts a `documents` array where each document can optionally include an `_id` property along with its other properties. The `space` parameter is applied globally to all documents. For single document creation, pass an array with one element.

### `search(query, options?)`

Search documents. Supports optional `space` parameter for space-aware filtering. Use with `ids` query to retrieve documents by ID (replaces `get()`).

### `existsIndex()`

Check if the data stream exists.

---

## 4. Space-Aware Operations

All CRUD operations (`create`, `search`) accept an **optional** `space?: string` parameter:

- **When provided**: Documents are space-bound
  - IDs are prefixed: `{space}::{id}` (e.g., `myspace::abc123`)
  - Documents decorated with `kibana.space_ids: [space]`
  - Searches filtered to only return documents from that space
  - System property `kibana.space_ids` is stripped from responses

- **When undefined**: Documents are space-agnostic
  - No ID prefixing (existing behavior preserved)
  - No `kibana.space_ids` decoration
  - Searches exclude space-bound documents (only return space-agnostic docs)
  - IDs containing `::` separator are rejected (security validation)

### ID Format

- **Space-bound**: `{space}::{id}` (e.g., `default::uuid-here`)
- **Space-agnostic**: `{id}` (e.g., `uuid-here`)
- **Separator**: `::` (double colon) - reserved for system use

---

## 5. Mapping Enrichment

During data stream registration (`registerDataStream`), mappings are automatically enriched:

1. **Validation**: User-provided mappings are checked for reserved keys:
   - `kibana` → throws error if found (reserved for system properties)
   - `_id` → throws error if found (reserved for document identifiers)
2. **Enrichment**: `kibana.space_ids` mapping is automatically injected

**Implementation**: `src/platform/packages/private/kbn-data-streams/src/initialize/defaults.ts`

---

## 6. Why Some Operations Are Not Supported

The following operations are intentionally **not** exposed:

- **`get(id)`**: Requires backing index name. Use `search()` with `ids` query instead.
- **Bulk `update`**: Data streams are append-only; updates require targeting specific backing indices.
- **Bulk `delete`**: Requires backing index name.

These limitations exist because backing indices are a private implementation detail. Users should not need to know or manage backing index names.

---

## 7. Common Patterns

### Retrieving a Document by ID

```typescript
// Instead of: client.get({ id: 'doc-123' })
const response = await client.search({
  space: 'my-space', // optional, required if document is space-bound
  query: { ids: { values: ['doc-123'] } },
  size: 1,
});

if (response.hits.hits.length > 0) {
  const document = response.hits.hits[0]._source;
}
```

### Creating with Space

```typescript
// Single document
await client.create({
  space: 'my-space',
  documents: [{ field: 'value' }],
  // ID auto-generated and prefixed: 'my-space::{uuid}'
});

// Multiple documents
await client.create({
  space: 'my-space',
  documents: [
    { field: 'value1' }, // auto-generated ID, prefixed: 'my-space::{uuid}'
    { _id: 'doc-2', field: 'value2' }, // explicit ID, prefixed: 'my-space::doc-2'
  ],
});
```

### Searching with Space

```typescript
const results = await client.search({
  space: 'my-space',
  query: { match_all: {} }
});
// Returns only documents with kibana.space_ids: ['my-space']
// kibana.space_ids is stripped from _source
```

---

## 8. Important Notes

- **RBAC**: The data-streams package does NOT handle RBAC. Higher-level repositories should wrap these APIs for access control.
- **Mixed Documents**: Data streams can contain both space-bound and space-agnostic documents
- **System Property**: `kibana.space_ids` is always stripped from client responses (never exposed to callers)
- **Mapping Versioning**: When data stream version is incremented, mappings are applied to the write index
