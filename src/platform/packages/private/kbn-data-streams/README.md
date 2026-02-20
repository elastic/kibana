# @kbn/data-streams

A set of (generally) stateless tools and utilities to ease working with Elasticsearch Data streams in TypeScript.

Inspired by `@kbn/storage-adapter` and other data stream adapter-like implementations in alerting and security solution.

## Core themes

* Safe defaults: e.g. when specifying mappings our utilities default to settings that avoid accidental mappings explosions. This is similar to the "principle of least surprise".
* Keep the easy stuff easy, make hard stuff easier by creating shared utilities
* TS type-safety: we use TypeScript, we like TypeScript, so yeah let's do more of that
* Convention > configuration: this package will expose test utilities that check backwards-compatible data evolution, but it won't enforce backwards compatible data evolution
* Use ES features to their fullest extent: in some cases all that is needed is runtime mapping to update a field value or an incorrectly mapped field

## Features

* Automatically detecting and applying mapping updates
* BYO serialization & deserialization (incoming)
* TypeScript utilities. Was type-safety already mentioned?
* Helpers for creating (search) runtime fields (incoming)
* Test utilities (incoming)

## API Reference

The `DataStreamClient` provides a lightweight data-mapper pattern for CRUD operations against Elasticsearch data streams.

### Supported Operations

#### `create(options?)`

Create one or more documents in the data stream. Each document can optionally include an `_id` property. Supports optional `space` parameter applied globally to all documents.

```typescript
// Single document
const response = await client.create({
  space: 'my-space', // optional, applied to all documents
  documents: [
    { _id: 'doc-123', '@timestamp': new Date().toISOString(), field: 'value' },
  ],
  refresh: true,
});

// Multiple documents
const response = await client.create({
  space: 'my-space', // optional, applied to all documents
  documents: [
    { _id: 'doc-1', '@timestamp': new Date().toISOString(), field: 'value1' },
    { '@timestamp': new Date().toISOString(), field: 'value2' }, // auto-generated ID
    { _id: 'doc-3', '@timestamp': new Date().toISOString(), field: 'value3' },
  ],
  refresh: true,
});
```

#### `search(query, options?)`

Search documents in the data stream. Supports optional `space` parameter for space-aware filtering.

```typescript
const response = await client.search({
  space: 'my-space', // optional
  query: { match_all: {} },
  size: 10,
});
```

#### `exists()`

Check if the data stream exists.

```typescript
const exists = await client.exists();
```

### Unsupported Operations

The following operations are **not** exposed in the API because they require knowledge of the underlying backing index names, which we keep as a private implementation detail:

* **`get(id)`**: Use `search()` with an `ids` query instead (see example below)
* **Bulk `update` operations**: Data streams are append-only; updates require targeting specific backing indices
* **Bulk `delete` operations**: Deletes require specifying the backing index name

#### Retrieving a Document by ID

Since `get()` is not supported, use `search()` with an `ids` query to retrieve a document by ID:

```typescript
// Retrieve a single document by ID
const response = await client.search({
  space: 'my-space', // optional, required if document is space-bound
  query: { ids: { values: ['document-id'] } },
  size: 1,
});

if (response.hits.hits.length > 0) {
  const document = response.hits.hits[0]._source;
  // Use the document...
} else {
  // Document not found
}
```

This approach works across all backing indices in the data stream, unlike Elasticsearch's `get()` API which requires a specific backing index name.

## Space-aware behavior

All CRUD operations (`create`, `search`) accept an optional `space` parameter:

* **When provided**: Documents are space-bound. IDs are prefixed as `{space}::{id}` (e.g. `myspace::abc123`). Documents are decorated with `kibana.space_ids: [space]`. Searches are filtered to that space. The system property `kibana.space_ids` is stripped from responses.
* **When undefined**: Documents are space-agnostic. No ID prefixing or `kibana.space_ids` decoration. Searches return only space-agnostic documents. IDs containing the `::` separator are rejected (reserved for system use).

Data streams can contain both space-bound and space-agnostic documents. The package does not handle RBAC; higher-level repositories should wrap these APIs for access control.

## Mapping Validation

When registering a data stream, the following reserved keys are automatically validated and will cause an error if found in your mappings:

* **`kibana`**: Reserved for system properties (e.g., `kibana.space_ids`)
* **`_id`**: Reserved for document identifiers (cannot be defined in mappings)

The `kibana.space_ids` mapping is automatically injected during registration. These validations occur via `registerDataStream()`. When the data stream version is incremented, mappings are applied to the write index.

## Mapping updates

Mapping updates will apply to the current write-index and your index template. This means new mappings will only be applied to docs that arrive after your mappings update land.

> !IMPORTANT
> Mapping updates will only be applied once you INCREMENT the template version number in your data stream definition. As you update your definition it is highly recommended that you retain past definitions so that you can test your upgrade path before releasing new mappings.

### A note on backwards compatibility

These tools assume that you will be introducing backwards compatible changes to your mappings. If you do not apply bwc mappings you will hit a runtime error initializing your client as it will try to update the current write index with your new mappings.

If you need to make a breaking change to mappings, consider using search-time runtime mappings.

### Search-time runtime mappings (incoming)

Elasticsearch supports specifying runtime mappings at search time ([docs](https://www.elastic.co/docs/manage-data/data-store/mapping/define-runtime-fields-in-search-request)). This is a powerful tool that enables certain schema-on-read-like patterns, massive data migrations or backfills CAN be avoided!

Let's say I have written the following document:

```json
POST my-data-stream/_doc
{
  "@timestamp": "2099-05-06T16:21:15.000Z",
  "message": "192.0.2.42 - - [06/May/2099:16:21:15 +0000] GET /images/bg.jpg HTTP/1.0 200 24736",
}
```

But actually, I mapped `message` as a `keyword` field. With runtime mappings you can remap the field on the fly:

```json
GET my-data-stream/_search
{
  "runtime_mappings": {
    "messageV2": {
      "type": "text",
      "script": {
        "source": "emit(doc['message'].value);"
      }
    }
  },
  "query": {
    "match_all": {}
  },
  "fields": ["messageV2"]
}
```

...but what if you want to move and transform the value of a field in the database, almost like a migration. To a limited degree this is possible to do at read time too!

```json
GET my-data-stream/_search
{
  "runtime_mappings": {
    "messageV2": {
      "type": "text",
      "script": {
        "source": "if (params._source[\"messageV2\"] != null) {\n  emit(params._source[\"messageV2\"]);\n} else {\n  emit(doc['message'].value + \" the original, but processed\");\n}"
      }
    }
  },
  "query": {
    "match_all": {}
  },
  "fields": ["messageV2"]
}
```

Using painless in this way is powerful, but we should be careful to ship performant and well tested painless in our code. That's why we expose a set of parameterised scripts for the most common use cases.

## Test utilites

We can consider creating the following test utilities:

```ts
test('myDataStream should be backwards compatible', async () => {
  await integrationTestHelpers.assertBackwardsCompatible([
    {
      sampleDocs: [
        {
          /* 1 */
        },
        // and so on...
      ],
      dataStream: v1,
    },
    {
      sampleDocs: [
        {
          /* 1 */
        },
        // and so on...
      ],
      dataStream: current,
    },
  ]);
});

test('snapshot', async () => {
  expect(integrationTestHelpers.toSnapshot(myDataStream)).toMatchSnapshot();
});

test('mappings hash v1', async () => {
  expect(integrationTestHelpers.mappingsHash(myDataStream)).toMatchInlineSnapshot(`hash-1`);
});
```

## Additional notes

1. How should we handle updating mappings? Do we just apply to the index template or go and update the existing write index as well? Yes.
2. Lazy creation possible... but eager update of mappings to existing data streams
   2.1. With option to eagerly create for when we know the data stream will be used, failing Kibana startup if data stream cannot be created.
   2.2. Data stream deletion a future possibility
3. Data streams for CRUD-like use cases: specifically updates
   3.1. Likely a future phase (requires updating underlying index)
   3.2. Consider removing possibility to control IDs at doc creation
4. We need guidance for teams to mostly be able to self-service their management/creation of data streams.
   4.1. We can largely rely on convention to start with: write a Jest integration test and take a snapshot of the serialized data stream declaration that you want to ship. Note: once merged these test snapshots should never change in a breaking way...
