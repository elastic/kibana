/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Tests that the write-path embedding helper populates (or omits) shadow semantic fields in the
 * raw Elasticsearch document for opted-in types.  These tests exercise the full repository stack
 * (real EmbeddingHelper, real serializer, mocked ES client) so that assertions target the exact
 * `document` body sent to `client.create` / `client.index` / `client.bulk`.
 */

import {
  pointInTimeFinderMock,
  mockGetCurrentTime,
  mockPreflightCheckForCreate,
  mockGetSearchDsl,
} from '../repository.test.mock';

import type { estypes } from '@elastic/elasticsearch';
import { schema } from '@kbn/config-schema';
import { SavedObjectsRepository } from '../repository';
import { loggerMock } from '@kbn/logging-mocks';
import type { SavedObjectsSerializer } from '@kbn/core-saved-objects-base-server-internal';
import type { SavedObjectsRawDocSource } from '@kbn/core-saved-objects-server';
import { SavedObjectTypeRegistry } from '@kbn/core-saved-objects-base-server-internal';
import { kibanaMigratorMock } from '../../mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import {
  mockVersionProps,
  mockTimestamp,
  createDocumentMigrator,
  createSpySerializer,
} from '../../test_helpers/repository.test.common';

// ── Type names ──────────────────────────────────────────────────────────────

const SYNC_TYPE = 'semanticSyncType';
const DEFERRED_TYPE = 'semanticDeferredType';
const PLAIN_TYPE = 'plainType';
// SCHEMA_TYPE has a strict modelVersion create schema AND semanticSearch — regression for
// Finding #1 (shadow keys must not be visible to validateObjectForCreate).
const SCHEMA_TYPE = 'semanticSchemaType';

// ── Registry with semantic-search types ──────────────────────────────────────

const createSemanticRegistry = () => {
  const registry = new SavedObjectTypeRegistry();

  registry.registerType({
    name: PLAIN_TYPE,
    hidden: false,
    namespaceType: 'single',
    mappings: { properties: { title: { type: 'text' }, count: { type: 'integer' } } },
  });

  registry.registerType({
    name: SYNC_TYPE,
    hidden: false,
    namespaceType: 'single',
    mappings: {
      properties: {
        title: { type: 'text' },
        description: { type: 'text' },
        count: { type: 'integer' },
      },
    },
    semanticSearch: {
      fields: ['title', 'description'],
      // no inferenceId — uses platform default
      // no embedding — defaults to 'sync'
    },
  });

  registry.registerType({
    name: DEFERRED_TYPE,
    hidden: false,
    namespaceType: 'single',
    mappings: {
      properties: {
        title: { type: 'text' },
      },
    },
    semanticSearch: {
      fields: ['title'],
      embedding: 'deferred',
    },
  });

  // Type with a strict model-version create schema AND semanticSearch.  The schema only
  // allows `title` and `count`; shadow keys must never reach validateObjectForCreate or it
  // would throw an "Unknown key" error (blocker Finding #1 regression guard).
  registry.registerType({
    name: SCHEMA_TYPE,
    hidden: false,
    namespaceType: 'single',
    mappings: {
      properties: {
        title: { type: 'text' },
        count: { type: 'integer' },
      },
    },
    modelVersions: {
      '1': {
        changes: [],
        schemas: {
          create: schema.object({ title: schema.string(), count: schema.number() }),
        },
      },
    },
    semanticSearch: {
      fields: ['title'],
    },
  });

  return registry;
};

// ── Shared test mappings ─────────────────────────────────────────────────────

const testMappings = {
  properties: {
    [PLAIN_TYPE]: { properties: {} },
    [SYNC_TYPE]: { properties: {} },
    [DEFERRED_TYPE]: { properties: {} },
    [SCHEMA_TYPE]: { properties: {} },
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Extracts the raw `_source` from the first `client.create` call. */
const getCreateBody = (
  client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>
) => (client.create.mock.calls[0][0] as estypes.CreateRequest).document as Record<string, unknown>;

/** Extracts the raw `_source` from the first `client.index` call. */
const getIndexBody = (
  client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>
) => (client.index.mock.calls[0][0] as estypes.IndexRequest).document as Record<string, unknown>;

/** Extracts the raw `_source` of the first bulk write item (the body after the action). */
const getBulkBody = (
  client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>
) => {
  // bulk params are [{action}, {body}, {action}, {body}, ...]
  const params = client.bulk.mock.calls[0][0] as { operations: unknown[] };
  return params.operations[1] as Record<string, unknown>;
};

describe('Semantic search write path (EmbeddingHelper integration)', () => {
  let client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  let repository: SavedObjectsRepository;
  let migrator: ReturnType<typeof kibanaMigratorMock.create>;
  let logger: ReturnType<typeof loggerMock.create>;
  let serializer: jest.Mocked<SavedObjectsSerializer>;

  const registry = createSemanticRegistry();
  const documentMigrator = createDocumentMigrator(registry);

  beforeEach(() => {
    pointInTimeFinderMock.mockClear();
    client = elasticsearchClientMock.createElasticsearchClient();
    migrator = kibanaMigratorMock.create();
    documentMigrator.prepareMigrations();
    migrator.migrateDocument = jest.fn().mockImplementation(documentMigrator.migrate);
    migrator.runMigrations = jest.fn().mockResolvedValue([{ status: 'skipped' }]);
    logger = loggerMock.create();
    serializer = createSpySerializer(registry);
    mockGetSearchDsl.mockClear();

    const allTypes = registry.getAllTypes().map((t) => t.name);
    const allowedTypes = [...new Set(allTypes.filter((t) => !registry.isHidden(t)))];

    // @ts-expect-error must use the private constructor to use the mocked serializer
    repository = new SavedObjectsRepository({
      index: '.kibana-test',
      mappings: testMappings,
      client,
      migrator,
      typeRegistry: registry,
      serializer,
      allowedTypes,
      logger,
    });

    mockGetCurrentTime.mockReturnValue(mockTimestamp);

    // Default: preflight resolves with no conflicts
    mockPreflightCheckForCreate.mockReset();
    mockPreflightCheckForCreate.mockImplementation(({ objects }) =>
      Promise.resolve(objects.map(({ type, id }) => ({ type, id })))
    );

    // Default: create/index respond with success
    client.create.mockResponseImplementation((params) => ({
      body: { _id: params.id, ...mockVersionProps } as estypes.CreateResponse,
    }));
    client.index.mockResponseImplementation((params) => ({
      body: { _id: params.id, ...mockVersionProps } as estypes.CreateResponse,
    }));
  });

  // ────────────────────────────────────────────────────────────────────────────
  // create()
  // ────────────────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('does NOT add shadow keys for a type without semanticSearch', async () => {
      await repository.create(PLAIN_TYPE, { title: 'Hello', count: 3 });
      const body = getCreateBody(client);
      const typeAttrs = body[PLAIN_TYPE] as Record<string, unknown>;
      expect(typeAttrs).not.toHaveProperty('title_semantic');
    });

    it('adds shadow key for a declared text field with a non-empty string value (sync mode)', async () => {
      await repository.create(SYNC_TYPE, {
        title: 'Dashboard A',
        description: 'Shows metrics',
        count: 5,
      });
      const body = getCreateBody(client);
      const typeAttrs = body[SYNC_TYPE] as Record<string, unknown>;
      expect(typeAttrs.title_semantic).toBe('Dashboard A');
      expect(typeAttrs.description_semantic).toBe('Shows metrics');
    });

    it('emits null shadow key for a declared field with a non-string value (clears stale shadow)', async () => {
      // Null field is present in the input — we emit null so any stale shadow on an update path
      // is cleared by mergeForUpdate, and so ES skips inference (S7).  On a create there is no
      // stale shadow to clear, but emitting null is harmless.
      await repository.create(SYNC_TYPE, {
        title: null as unknown as string,
        description: 'Desc',
        count: 0,
      });
      const body = getCreateBody(client);
      const typeAttrs = body[SYNC_TYPE] as Record<string, unknown>;
      expect(typeAttrs.title_semantic).toBeNull();
      expect(typeAttrs.description_semantic).toBe('Desc');
    });

    it('emits null shadow key for a declared field with an empty string value', async () => {
      // Empty string is present in the input — emit null so stale shadow is cleared (Finding #3).
      await repository.create(SYNC_TYPE, { title: '', description: 'Desc' });
      const body = getCreateBody(client);
      const typeAttrs = body[SYNC_TYPE] as Record<string, unknown>;
      expect(typeAttrs.title_semantic).toBeNull();
    });

    it('strips any caller-supplied shadow keys from the stored document', async () => {
      // Caller tries to inject a stale shadow value — it must be replaced with the derived one.
      await repository.create(SYNC_TYPE, {
        title: 'New Title',
        title_semantic: 'stale caller value',
        description: 'Desc',
      } as any);
      const body = getCreateBody(client);
      const typeAttrs = body[SYNC_TYPE] as Record<string, unknown>;
      expect(typeAttrs.title_semantic).toBe('New Title');
    });

    it('does NOT add shadow keys when deferEmbeddings=true (even for a sync-default type)', async () => {
      await repository.create(
        SYNC_TYPE,
        { title: 'Hello', description: 'World' },
        { deferEmbeddings: true }
      );
      const body = getCreateBody(client);
      const typeAttrs = body[SYNC_TYPE] as Record<string, unknown>;
      expect(typeAttrs).not.toHaveProperty('title_semantic');
      expect(typeAttrs).not.toHaveProperty('description_semantic');
    });

    it('does NOT add shadow keys for a deferred-default type (no per-request override)', async () => {
      await repository.create(DEFERRED_TYPE, { title: 'Hello' });
      const body = getCreateBody(client);
      const typeAttrs = body[DEFERRED_TYPE] as Record<string, unknown>;
      expect(typeAttrs).not.toHaveProperty('title_semantic');
    });

    it('DOES add shadow keys when deferEmbeddings=false overrides a deferred-default type', async () => {
      await repository.create(DEFERRED_TYPE, { title: 'Hello' }, { deferEmbeddings: false });
      const body = getCreateBody(client);
      const typeAttrs = body[DEFERRED_TYPE] as Record<string, unknown>;
      expect(typeAttrs.title_semantic).toBe('Hello');
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // bulkCreate()
  // ────────────────────────────────────────────────────────────────────────────

  describe('bulkCreate()', () => {
    /** Build a minimal but well-shaped bulk response so bulk_create.ts can parse it. */
    const makeBulkResponse = (types: string[], ids: string[]): estypes.BulkResponse =>
      ({
        errors: false,
        took: 1,
        items: types.map((type, i) => ({
          create: {
            _id: `${type}:${ids[i]}`,
            ...mockVersionProps,
            result: 'created',
            _index: '.kibana-test',
          },
        })),
      } as unknown as estypes.BulkResponse);

    it('adds shadow keys for a sync-default type in bulk create', async () => {
      client.bulk.mockResponseOnce(makeBulkResponse([SYNC_TYPE], ['id-1']));
      await repository.bulkCreate([
        { type: SYNC_TYPE, id: 'id-1', attributes: { title: 'Rule A', description: 'Desc A' } },
      ]);
      const params = client.bulk.mock.calls[0][0] as { operations: unknown[] };
      const body = params.operations[1] as Record<string, unknown>;
      const typeAttrs = body[SYNC_TYPE] as Record<string, unknown>;
      expect(typeAttrs.title_semantic).toBe('Rule A');
      expect(typeAttrs.description_semantic).toBe('Desc A');
    });

    it('does NOT add shadow keys when deferEmbeddings=true at the options level', async () => {
      client.bulk.mockResponseOnce(makeBulkResponse([SYNC_TYPE], ['id-2']));
      await repository.bulkCreate(
        [{ type: SYNC_TYPE, id: 'id-2', attributes: { title: 'Rule A', description: 'Desc A' } }],
        { deferEmbeddings: true }
      );
      const params = client.bulk.mock.calls[0][0] as { operations: unknown[] };
      const body = params.operations[1] as Record<string, unknown>;
      const typeAttrs = body[SYNC_TYPE] as Record<string, unknown>;
      expect(typeAttrs).not.toHaveProperty('title_semantic');
      expect(typeAttrs).not.toHaveProperty('description_semantic');
    });

    it('does NOT add shadow keys for the non-semantic type in a mixed bulk', async () => {
      client.bulk.mockResponseOnce(makeBulkResponse([PLAIN_TYPE, SYNC_TYPE], ['id-3', 'id-4']));
      await repository.bulkCreate([
        { type: PLAIN_TYPE, id: 'id-3', attributes: { title: 'Plain Doc', count: 1 } },
        { type: SYNC_TYPE, id: 'id-4', attributes: { title: 'Semantic Doc', description: 'Desc' } },
      ]);
      const params = client.bulk.mock.calls[0][0] as { operations: unknown[] };
      // First item: plain type (action at [0], body at [1])
      const plainBody = params.operations[1] as Record<string, unknown>;
      const plainAttrs = plainBody[PLAIN_TYPE] as Record<string, unknown>;
      expect(plainAttrs).not.toHaveProperty('title_semantic');

      // Second item: semantic type (action at [2], body at [3])
      const semanticBody = params.operations[3] as Record<string, unknown>;
      const semanticAttrs = semanticBody[SYNC_TYPE] as Record<string, unknown>;
      expect(semanticAttrs.title_semantic).toBe('Semantic Doc');
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // update()
  // ────────────────────────────────────────────────────────────────────────────

  describe('update()', () => {
    const existingId = 'existing-doc-id';

    beforeEach(() => {
      // update() does a GET first (to get the existing doc), then an index.
      // Stored doc has NO pre-existing shadow keys (simulates a doc written before the feature).
      client.get.mockResponseOnce({
        found: true,
        _id: `${SYNC_TYPE}:${existingId}`,
        _index: '.kibana-test',
        ...mockVersionProps,
        _source: {
          type: SYNC_TYPE,
          [SYNC_TYPE]: { title: 'Old Title', description: 'Old Desc' },
          references: [],
          updated_at: mockTimestamp,
        },
      } as estypes.GetResponse<SavedObjectsRawDocSource>);
      client.index.mockResponseImplementation((params) => ({
        body: { _id: params.id, ...mockVersionProps } as estypes.CreateResponse,
      }));
    });

    it('adds shadow key for a declared field present in the partial update (sync mode)', async () => {
      await repository.update(SYNC_TYPE, existingId, { title: 'New Title' });
      const body = getIndexBody(client);
      const typeAttrs = body[SYNC_TYPE] as Record<string, unknown>;
      expect(typeAttrs.title_semantic).toBe('New Title');
    });

    it('does NOT emit shadow key for a declared field absent from the partial update (staleness rule)', async () => {
      // Only updating `description` — `title` is not in the partial update.
      // Because the stored doc has no pre-existing `title_semantic`, the merged doc also has none.
      // When the stored doc DOES have a `title_semantic`, mergeForUpdate preserves it (stale until
      // the reconciler re-touches the doc); that staleness behavior is by design (see ADR-6).
      await repository.update(SYNC_TYPE, existingId, { description: 'New Desc' });
      const body = getIndexBody(client);
      const typeAttrs = body[SYNC_TYPE] as Record<string, unknown>;
      expect(typeAttrs.description_semantic).toBe('New Desc');
      // `title` was not in the partial update → no `title_semantic` emitted from the helper;
      // the stored doc had no `title_semantic` to preserve either → absent in the merged result.
      expect(typeAttrs).not.toHaveProperty('title_semantic');
    });

    it('strips caller-supplied shadow keys from the partial update', async () => {
      await repository.update(SYNC_TYPE, existingId, {
        title: 'New Title',
        title_semantic: 'caller-injected stale',
      } as any);
      const body = getIndexBody(client);
      const typeAttrs = body[SYNC_TYPE] as Record<string, unknown>;
      // Helper strips the caller-supplied value and derives the correct one from `title`
      expect(typeAttrs.title_semantic).toBe('New Title');
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // bulkUpdate()
  // ────────────────────────────────────────────────────────────────────────────

  describe('bulkUpdate()', () => {
    const existingId = 'existing-bulk-update-id';

    beforeEach(() => {
      // bulkUpdate() does an mget, then a bulk index
      client.mget.mockResponseOnce({
        docs: [
          {
            found: true,
            _id: `${SYNC_TYPE}:${existingId}`,
            _index: '.kibana-test',
            ...mockVersionProps,
            _source: {
              type: SYNC_TYPE,
              [SYNC_TYPE]: { title: 'Old Title', description: 'Old Desc' },
              references: [],
              updated_at: mockTimestamp,
            },
          },
        ],
      } as estypes.MgetResponse<SavedObjectsRawDocSource>);

      client.bulk.mockResponseImplementation(() => ({
        body: {
          errors: false,
          took: 1,
          items: [
            {
              index: { _id: `${SYNC_TYPE}:${existingId}`, result: 'updated', ...mockVersionProps },
            },
          ],
        } as unknown as estypes.BulkResponse,
      }));
    });

    it('adds shadow key for a declared field present in the bulk partial update', async () => {
      await repository.bulkUpdate([
        { type: SYNC_TYPE, id: existingId, attributes: { title: 'Bulk New Title' } },
      ]);
      const body = getBulkBody(client);
      const typeAttrs = body[SYNC_TYPE] as Record<string, unknown>;
      expect(typeAttrs.title_semantic).toBe('Bulk New Title');
    });

    it('does NOT emit shadow key for a declared field absent from the bulk partial update', async () => {
      await repository.bulkUpdate([
        { type: SYNC_TYPE, id: existingId, attributes: { description: 'Bulk New Desc' } },
      ]);
      const body = getBulkBody(client);
      const typeAttrs = body[SYNC_TYPE] as Record<string, unknown>;
      expect(typeAttrs.description_semantic).toBe('Bulk New Desc');
      expect(typeAttrs).not.toHaveProperty('title_semantic');
    });

    it('emits null shadow key when a declared field is cleared in bulk update', async () => {
      // The stored doc has title_semantic; the partial update sets title to empty string.
      // The helper must emit title_semantic=null to clear the stale shadow (Finding #3).
      // Override the mget to return a doc that has a stored title_semantic.
      client.mget.mockReset();
      client.mget.mockResponseOnce({
        docs: [
          {
            found: true,
            _id: `${SYNC_TYPE}:${existingId}`,
            _index: '.kibana-test',
            ...mockVersionProps,
            _source: {
              type: SYNC_TYPE,
              [SYNC_TYPE]: {
                title: 'Old Title',
                description: 'Old Desc',
                title_semantic: 'Old Title',
              },
              references: [],
              updated_at: mockTimestamp,
            },
          },
        ],
      } as estypes.MgetResponse<SavedObjectsRawDocSource>);
      client.bulk.mockResponseImplementation(() => ({
        body: {
          errors: false,
          took: 1,
          items: [
            {
              index: { _id: `${SYNC_TYPE}:${existingId}`, result: 'updated', ...mockVersionProps },
            },
          ],
        } as unknown as estypes.BulkResponse,
      }));

      await repository.bulkUpdate([{ type: SYNC_TYPE, id: existingId, attributes: { title: '' } }]);
      const body = getBulkBody(client);
      const typeAttrs = body[SYNC_TYPE] as Record<string, unknown>;
      // title_semantic must be null (not the stale 'Old Title')
      expect(typeAttrs.title_semantic).toBeNull();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // create() with strict modelVersion create schema — regression for Finding #1
  // Shadow keys must not reach validateObjectForCreate or schema validation rejects them.
  // ────────────────────────────────────────────────────────────────────────────

  describe('create() with a strict modelVersion create schema (Finding #1 regression)', () => {
    it('succeeds and writes shadow keys when the type has a strict schema plus semanticSearch', async () => {
      // SCHEMA_TYPE has a schema.object({ title, count }) that forbids unknown keys.
      // Shadow keys must be added AFTER validation — if they were added before, this call
      // would throw "Unknown key(s): title_semantic".
      await repository.create(SCHEMA_TYPE, { title: 'Rule name', count: 42 });
      const body = getCreateBody(client);
      const typeAttrs = body[SCHEMA_TYPE] as Record<string, unknown>;
      // Shadow key present in the stored document
      expect(typeAttrs.title_semantic).toBe('Rule name');
      // Original attributes preserved
      expect(typeAttrs.title).toBe('Rule name');
      expect(typeAttrs.count).toBe(42);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // update() clearing a field — Finding #3 (stale shadow text)
  // ────────────────────────────────────────────────────────────────────────────

  describe('update() clearing a declared field (Finding #3)', () => {
    const existingId = 'clear-field-id';

    beforeEach(() => {
      // Stored doc has a non-null title_semantic from a previous sync-mode write.
      client.get.mockResponseOnce({
        found: true,
        _id: `${SYNC_TYPE}:${existingId}`,
        _index: '.kibana-test',
        ...mockVersionProps,
        _source: {
          type: SYNC_TYPE,
          [SYNC_TYPE]: { title: 'Old Title', description: 'Old Desc', title_semantic: 'Old Title' },
          references: [],
          updated_at: mockTimestamp,
        },
      } as estypes.GetResponse<SavedObjectsRawDocSource>);
      client.index.mockResponseImplementation((params) => ({
        body: { _id: params.id, ...mockVersionProps } as estypes.CreateResponse,
      }));
    });

    it('emits null shadow key when a declared field is set to empty string', async () => {
      await repository.update(SYNC_TYPE, existingId, { title: '' });
      const body = getIndexBody(client);
      const typeAttrs = body[SYNC_TYPE] as Record<string, unknown>;
      // null clears the stale shadow in the stored doc; ES skips inference (S7).
      expect(typeAttrs.title_semantic).toBeNull();
    });

    it('emits null shadow key when a declared field is set to null', async () => {
      await repository.update(SYNC_TYPE, existingId, { title: null as unknown as string });
      const body = getIndexBody(client);
      const typeAttrs = body[SYNC_TYPE] as Record<string, unknown>;
      expect(typeAttrs.title_semantic).toBeNull();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // get() and bulkGet() read path — Finding #2
  // getSavedObjectFromSource must strip shadow keys so they never leak to consumers.
  // ────────────────────────────────────────────────────────────────────────────

  describe('get() / bulkGet() strip shadow keys from returned attributes (Finding #2)', () => {
    const storedId = 'get-strip-id';

    it('get() returns attributes without shadow keys even when _source[type] contains them', async () => {
      // Simulate a raw ES document that contains shadow keys in _source[type].
      client.get.mockResponseOnce({
        found: true,
        _id: `${SYNC_TYPE}:${storedId}`,
        _index: '.kibana-test',
        ...mockVersionProps,
        _source: {
          type: SYNC_TYPE,
          [SYNC_TYPE]: {
            title: 'Hello',
            description: 'World',
            title_semantic: 'Hello',
            description_semantic: 'World',
          },
          references: [],
          updated_at: mockTimestamp,
        },
      } as estypes.GetResponse<SavedObjectsRawDocSource>);

      const result = await repository.get(SYNC_TYPE, storedId);
      const attrs = result.attributes as Record<string, unknown>;
      expect(attrs.title).toBe('Hello');
      expect(attrs.description).toBe('World');
      expect(attrs).not.toHaveProperty('title_semantic');
      expect(attrs).not.toHaveProperty('description_semantic');
    });

    it('bulkGet() returns attributes without shadow keys for each opted-in object', async () => {
      client.mget.mockResponseOnce({
        docs: [
          {
            found: true,
            _id: `${SYNC_TYPE}:${storedId}`,
            _index: '.kibana-test',
            ...mockVersionProps,
            _source: {
              type: SYNC_TYPE,
              [SYNC_TYPE]: {
                title: 'Bulk Hello',
                title_semantic: 'Bulk Hello',
                description_semantic: 'some stale shadow',
              },
              references: [],
              updated_at: mockTimestamp,
            },
          },
        ],
      } as estypes.MgetResponse<SavedObjectsRawDocSource>);

      const result = await repository.bulkGet([{ type: SYNC_TYPE, id: storedId }]);
      const soResult = result.saved_objects[0] as { attributes?: unknown; error?: unknown };
      expect(soResult.error).toBeUndefined();
      const attrs = soResult.attributes as Record<string, unknown>;
      expect(attrs.title).toBe('Bulk Hello');
      expect(attrs).not.toHaveProperty('title_semantic');
      expect(attrs).not.toHaveProperty('description_semantic');
    });

    it('get() for a non-opted-in type preserves _source[type] as-is', async () => {
      client.get.mockResponseOnce({
        found: true,
        _id: `${PLAIN_TYPE}:${storedId}`,
        _index: '.kibana-test',
        ...mockVersionProps,
        _source: {
          type: PLAIN_TYPE,
          [PLAIN_TYPE]: { title: 'Plain', count: 7 },
          references: [],
          updated_at: mockTimestamp,
        },
      } as estypes.GetResponse<SavedObjectsRawDocSource>);

      const result = await repository.get(PLAIN_TYPE, storedId);
      const attrs = result.attributes as Record<string, unknown>;
      expect(attrs.title).toBe('Plain');
      expect(attrs.count).toBe(7);
    });
  });
});
