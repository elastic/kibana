# Storage adapter

Storage adapters are an abstraction for managing & writing data into Elasticsearch, from Kibana plugins.

There are several ways one can use Elasticsearch in Kibana, for instance:

- a simple id-based CRUD table
- timeseries data with regular indices
- timeseries data with data streams

But then there are many choices to be made that make this a very complex problem:

- Elasticsearch asset management
- Authentication
- Schema changes
- Kibana's distributed nature
- Stateful versus serverless

The intent of storage adapters is to come up with an abstraction that allows Kibana developers to have a common interface for writing to and reading data from Elasticsearch. For instance, for setting up your data store, it should not matter how you authenticate (internal user? current user? API keys?).

## Saved objects

Some of these problems are solved by Saved Objects. But Saved Objects come with a lot of baggage - Kibana RBAC, relationships, spaces, all of which might not be
needed for your use case but are still restrictive. One could consider Saved Objects to be the target of an adapter, but Storage Adapters aim to address a wider set of use-cases.

## Philosophy

Storage adapters should largely adhere to the following principles:

- Interfaces are as close to Elasticsearch as possible. Meaning, the `search` method is practically a pass-through for `_search`.
- Strongly-typed. TypeScript types are inferred from the schema. This makes it easy to create fully-typed clients for any storage.
- Lazy writes. No Elasticsearch assets (templates, indices, aliases) get installed unless necessary. Anything that gets persisted to Elasticsearch raises questions (in SDHs, UIs, APIs) and should be avoided when possible. This also helps avoidable upgrade issues (e.g. conflicting mappings for something that never got used).
- Recoverable. If somehow Elasticsearch assets get borked, the adapters should make a best-effort attempt to recover, or log warnings with clear remediation steps.

## Future goals

Currently, we only have the StorageIndexAdapter which writes to plain indices. In the future, we'll want more:

- A StorageDataStreamAdapter
- Federated search
- Data/Index Lifecycle Management
- Runtime mappings for older versions

## Usage

### Storage index adapter

To use the storage index adapter, instantiate it with an authenticated Elasticsearch client:

```ts
const storageSettings = {
  name: '.kibana_streams_assets',
  schema: {
    properties: {
      [ASSET_ASSET_ID]: types.keyword({ required: true }),
      [ASSET_TYPE]: types.enum(Object.values(ASSET_TYPES), { required: true }),
    },
  },
} satisfies IndexStorageSettings;

const adapter = new StorageIndexAdapter(
  coreStart.elasticsearch.client.asInternalUser,
  this.logger.get('assets'),
  storageSettings
);

const client = adapter.getClient();

const response = await client.search({
  track_total_hits: true,
  size: 100,
});
```

### Schema versioning

Documents evolve over time. The `defineVersioning` API provides type-safe, incremental schema migrations powered by Zod (`@kbn/zod/v4`).

#### Defining versions

Start with a base schema (version 1), then chain `.addVersion()` for each subsequent version. Each version must provide a Zod schema and a `migrate` function that transforms a document from the previous version's shape into the new one.

```ts
import { z } from '@kbn/zod/v4';
import { defineVersioning } from '@kbn/storage-adapter';

const versioning = defineVersioning(z.object({ name: z.string() }))
  .addVersion({
    schema: z.object({ name: z.string(), slug: z.string() }),
    migrate: (prev) => ({ ...prev, slug: prev.name.toLowerCase().replace(/\s+/g, '-') }),
  })
  .addVersion({
    schema: z.object({ name: z.string(), slug: z.string(), active: z.boolean() }),
    migrate: (prev) => ({ ...prev, active: true }),
  })
  .build();
```

Migration functions can be synchronous or asynchronous:

```ts
.addVersion({
  schema: z.object({ name: z.string(), enriched: z.string() }),
  migrate: async (prev) => {
    const enriched = await fetchEnrichment(prev.name);
    return { ...prev, enriched };
  },
})
```

#### Wiring versioning into the adapter

Pass the `versioning` instance to the `StorageIndexAdapter` constructor. The Elasticsearch mappings remain defined in `storageSettings.schema.properties` as before — the adapter validates at construction time that every property in the latest Zod schema exists in the mappings.

```ts
const storageSettings = {
  name: '.my-storage',
  schema: {
    properties: {
      name: types.keyword({ required: true }),
      slug: types.keyword({ required: true }),
      active: types.boolean({ required: true }),
    },
  },
} satisfies IndexStorageSettings;

const adapter = new StorageIndexAdapter(
  esClient,
  logger,
  storageSettings,
  { versioning }
);
```

#### What happens on write

When versioning is enabled, every document written through `index()` or `bulk()` is:

1. **Validated** against the latest Zod schema via `schema.parse()`. Invalid documents throw immediately.
2. **Stamped** with a `__version` field set to the latest version number. This field is managed internally and should not be set by consumers.

#### What happens on read

When a document is returned from `search()` or `get()`, the adapter inspects the `__version` field:

- **Versioned documents**: migrated through the version chain from their persisted version to the latest, with Zod validation at every intermediate step. The `__version` field is stripped before returning.
- **Legacy documents** (no `__version` field): if a `migrateSource` callback is provided, it runs first. Otherwise the document is treated as version 1 and migrated through the full chain.

#### Bulk migration

For migrating existing documents in-place (e.g. during a startup routine), the client exposes a `migrateDocuments` method that scans for outdated or unversioned documents and re-indexes them in batches:

```ts
const client = adapter.getClient();
const result = await client.migrateDocuments({ batchSize: 500 });
// result: { migrated: 1234, total: 1234 }
```

This uses `search_after` pagination, concurrent per-batch migrations, and a single refresh at the end for efficiency.

#### Mapping validation

At construction time, the adapter extracts all property paths from the latest Zod schema (including nested objects) and compares them against the flattened paths from `storageSettings.schema.properties`. If any Zod property is missing from the mappings, the adapter throws immediately with a clear error listing the missing paths. This prevents runtime surprises where the schema expects fields that Elasticsearch doesn't know about.

The `__version` field is reserved and must not be defined in `storageSettings.schema.properties` — the adapter injects it automatically into the index template when versioning is enabled.

#### Backward compatibility with `migrateSource`

The `migrateSource` option continues to work and is called for legacy documents that don't have a `__version` field. When both `versioning` and `migrateSource` are provided, legacy documents go through `migrateSource` first and are then validated against the latest schema. New code should prefer `versioning` — `migrateSource` is deprecated.

### Lazy initialization

The adapter lazily creates or updates the index template, index, and mappings on the first write operation. If the underlying index is deleted externally (e.g. manually from Elasticsearch), the adapter detects the 404 error, resets its internal state, and retries initialization automatically.

# Development

To run unit tests: `yarn test:jest src/platform/packages/shared/kbn-storage-adapter/src/schema_versioning.test.ts`

To run integration tests: `node scripts/jest_integration.js --config src/platform/packages/shared/kbn-storage-adapter/jest.integration.config.js`