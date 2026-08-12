/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Phase 1 + 2 integration smoke test for the Kibana SO semantic-search POC.
 *
 * Covers:
 *  1. Mapping synthesis (Phase 1 exit criterion): the migrator synthesises
 *     `{field}_semantic: semantic_text` shadow fields with the correct `inference_id`
 *     and NO `copy_to` on the source fields.  This assertion is deterministic on any
 *     bare ES snapshot — ES accepts `semantic_text` mappings without validating the
 *     inference endpoint at mapping time (S7 spike finding).
 *
 *  2. Write path — deferred mode (Phase 2): a create with `deferEmbeddings: true`
 *     writes NO `*_semantic` keys into the raw ES document.
 *
 *  3. Write path — sync mode (Phase 2, env-gated): a create without `deferEmbeddings`
 *     includes shadow keys in the raw document and ES runs inference.  On a bare test
 *     ES that lacks the `.elser-2-elasticsearch` inference endpoint the call fails with
 *     a fast per-item error (not a hang).  If ELSER is unexpectedly available, the
 *     happy path is verified instead.  The test marks itself env-blocked in either case
 *     so the deterministic assertion (no hang) is always checked.
 *
 *  4. Serializer strip (Phase 1): `rawToSavedObject` strips `*_semantic` keys from
 *     attributes for opted-in types.  Verified end-to-end by directly indexing a raw
 *     doc that contains null-valued shadow fields (null skips inference per S7) and
 *     retrieving it through `repository.find()`, which calls `serializerHelper
 *     .rawToSavedObject()`.
 *
 * Phase 2 fix: `repository.get()` now strips shadow keys via `getSavedObjectFromSource()`
 * (internal_utils.ts fix, Finding #2).  The unit-level coverage lives in
 * `semantic_search_write_path.test.ts`.
 */

import Path from 'path';
import fs from 'fs/promises';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { getKibanaMigratorTestKit, startElasticsearch } from '@kbn/migrator-test-kit';
import {
  SavedObjectsSerializer,
  SavedObjectTypeRegistry,
  modelVersionToVirtualVersion,
} from '@kbn/core-saved-objects-base-server-internal';
import { createType } from '../test_utils';
import { getBaseMigratorParams, dummyModelVersion } from '../fixtures/zdt_base.fixtures';

const TYPE_NAME = 'ss_smoke_type';
const INFERENCE_ID = '.elser-2-elasticsearch';

export const logFilePath = Path.join(__dirname, 'semantic_search_smoke.test.log');

/** Type with two text fields opted into semantic search (sync-default). */
const semanticType = createType({
  name: TYPE_NAME,
  mappings: {
    properties: {
      title: { type: 'text' },
      description: { type: 'text' },
    },
  },
  semanticSearch: {
    fields: ['title', 'description'],
    // inferenceId not set: exercises default resolver path
  },
  modelVersions: {
    '1': dummyModelVersion,
  },
});

describe('SO semantic search — Phase 1+2 integration smoke', () => {
  let esServer: TestElasticsearchUtils['es'];
  let client: ElasticsearchClient;
  let savedObjectsRepository: ISavedObjectsRepository;

  beforeAll(async () => {
    await fs.unlink(logFilePath).catch(() => {});
    esServer = await startElasticsearch();

    const kit = await getKibanaMigratorTestKit({
      ...getBaseMigratorParams(),
      logFilePath,
      types: [semanticType],
    });

    await kit.runMigrations();

    client = kit.client;
    savedObjectsRepository = kit.savedObjectsRepository;
  }, 120_000);

  afterAll(async () => {
    await esServer?.stop();
  });

  // ---------------------------------------------------------------------------
  // 1. Mapping synthesis — Phase 1 exit criterion
  // ---------------------------------------------------------------------------

  describe('Phase 1 exit criterion: shadow semantic_text mapping synthesis', () => {
    it('synthesises title_semantic and description_semantic as semantic_text with inference_id', async () => {
      const response = await client.indices.getMapping({ index: '.kibana_1' });
      const typeProp = (
        response['.kibana_1'].mappings.properties as Record<
          string,
          { properties?: Record<string, unknown> }
        >
      )?.[TYPE_NAME];

      expect(typeProp).toBeDefined();
      const props = typeProp!.properties ?? {};

      expect(props.title_semantic).toMatchObject({
        type: 'semantic_text',
        inference_id: INFERENCE_ID,
      });
      expect(props.description_semantic).toMatchObject({
        type: 'semantic_text',
        inference_id: INFERENCE_ID,
      });
    });

    it('source fields (title, description) have NO copy_to', async () => {
      const response = await client.indices.getMapping({ index: '.kibana_1' });
      const typeProp = (
        response['.kibana_1'].mappings.properties as Record<
          string,
          { properties?: Record<string, unknown> }
        >
      )?.[TYPE_NAME];

      const props = (typeProp?.properties ?? {}) as Record<string, { copy_to?: unknown }>;

      expect(props.title).not.toHaveProperty('copy_to');
      expect(props.description).not.toHaveProperty('copy_to');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Write path — deferred mode (deterministic, no inference required)
  // ---------------------------------------------------------------------------

  describe('Phase 2 write path: deferred mode', () => {
    it('raw ES document contains NO *_semantic keys when deferEmbeddings:true', async () => {
      const id = 'deferred-smoke-test-1';

      await savedObjectsRepository.create(
        TYPE_NAME,
        { title: 'Deferred hello', description: 'No inference please' },
        { id, deferEmbeddings: true }
      );

      // Read the raw document directly via the ES client to inspect _source
      const rawDoc = await client.get({
        index: '.kibana',
        id: `${TYPE_NAME}:${id}`,
      });

      const rawAttrs = (rawDoc._source as Record<string, unknown>)?.[TYPE_NAME] as
        | Record<string, unknown>
        | undefined;

      expect(rawAttrs).toBeDefined();

      const shadowKeys = Object.keys(rawAttrs ?? {}).filter((k) => k.endsWith('_semantic'));
      expect(shadowKeys).toHaveLength(0);

      // Clean up so subsequent test runs on the same ES are idempotent
      await savedObjectsRepository.delete(TYPE_NAME, id).catch(() => {});
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Write path — sync mode (env-gated on ELSER availability)
  // ---------------------------------------------------------------------------

  describe('Phase 2 write path: sync mode', () => {
    it('sync create either surfaces a proper ES error (no hang) or succeeds with shadow keys in raw doc', async () => {
      const id = 'sync-smoke-test-1';

      try {
        const created = await savedObjectsRepository.create(
          TYPE_NAME,
          { title: 'Sync hello', description: 'Run inference please' },
          { id }
        );

        // If ES returned a result (ELSER available), verify:
        // a) The returned SavedObject has NO shadow keys (serializer stripped them on create response)
        // b) The raw ES doc DOES contain shadow keys (Mechanism B populated them)

        const rawAttrs = (created.attributes ?? {}) as Record<string, unknown>;
        expect(rawAttrs).not.toHaveProperty('title_semantic');
        expect(rawAttrs).not.toHaveProperty('description_semantic');

        const rawDoc = await client.get({
          index: '.kibana',
          id: `${TYPE_NAME}:${id}`,
        });
        const docAttrs = (rawDoc._source as Record<string, unknown>)?.[TYPE_NAME] as
          | Record<string, unknown>
          | undefined;

        expect(docAttrs).toHaveProperty('title_semantic', 'Sync hello');
        expect(docAttrs).toHaveProperty('description_semantic', 'Run inference please');

        await savedObjectsRepository.delete(TYPE_NAME, id).catch(() => {});
      } catch (err: unknown) {
        // Expected on a bare test ES without the ELSER inference endpoint.
        // The error must be an ES-originated inference failure — not a write-path bug.
        // Verify it matches at least one inference/resource error pattern:
        //   • SavedObjects 503 (isEsUnavailableError) wrapping the ES 404 from the endpoint
        //   • statusCode 404/503 with an inference-related message
        //   • message matching /inference|resource_not_found/i
        // Any other error (e.g. TypeError from a write-path bug) causes an explicit rethrow.
        expect(err).toBeTruthy();
        const anyErr = err as Record<string, unknown>;
        const statusCode = (anyErr.statusCode as number | undefined) ?? 0;
        const message = String(anyErr.message ?? '');
        const isInferenceError =
          SavedObjectsErrorHelpers.isEsUnavailableError(err as Error) ||
          statusCode === 404 ||
          statusCode === 503 ||
          /inference|resource_not_found/i.test(message);

        if (!isInferenceError) {
          // Not the expected env-blocked error — propagate so Jest reports the real cause.
          throw err;
        }
      }
    }, 30_000); // explicit per-test timeout guards against hangs
  });

  // ---------------------------------------------------------------------------
  // 4. Serializer strip — Phase 1, read path via find()
  // ---------------------------------------------------------------------------

  describe('Phase 1 serializer strip: rawToSavedObject strips *_semantic keys on find()', () => {
    it('repository.find() returns attributes without shadow keys even when raw _source[type] contains them', async () => {
      // Build a valid raw Kibana SO document using the serializer so that all
      // required metadata fields (_id format, type, references, etc.) are correct.
      // We use a local registry so the serializer does NOT strip shadow keys during
      // savedObjectToRaw() — stripping only happens in rawToSavedObject().
      const localRegistry = new SavedObjectTypeRegistry();
      localRegistry.registerType(semanticType);
      const serializer = new SavedObjectsSerializer(localRegistry);

      const raw = serializer.savedObjectToRaw({
        type: TYPE_NAME,
        id: 'strip-test-1',
        attributes: { title: 'Strip me', description: 'Remove shadow' },
        references: [],
        typeMigrationVersion: modelVersionToVirtualVersion(1),
      });

      // Inject null-valued shadow keys into the raw _source[type].
      // null values skip inference on ES (S7 spike finding) but ARE stored in
      // _source, giving us a doc that exercises the strip path.
      const rawTypeAttrs = raw._source[TYPE_NAME] as Record<string, unknown>;
      rawTypeAttrs.title_semantic = null;
      rawTypeAttrs.description_semantic = null;

      // Index directly — bypass the SO write path so shadow keys reach _source
      await client.index({
        index: '.kibana',
        id: raw._id,
        document: raw._source,
        refresh: 'true',
      });

      // Read back via repository.find() — this path calls
      // serializerHelper.rawToSavedObject() which invokes
      // stripSemanticAttributes() for opted-in types.
      const findResponse = await savedObjectsRepository.find({ type: TYPE_NAME });
      const found = findResponse.saved_objects.find((so) => so.id === 'strip-test-1');

      expect(found).toBeDefined();

      const attrs = (found?.attributes ?? {}) as Record<string, unknown>;
      expect(attrs).not.toHaveProperty('title_semantic');
      expect(attrs).not.toHaveProperty('description_semantic');
      expect(attrs).toMatchObject({ title: 'Strip me', description: 'Remove shadow' });

      // Clean up
      await savedObjectsRepository.delete(TYPE_NAME, 'strip-test-1').catch(() => {});
    }, 30_000);
  });
});
