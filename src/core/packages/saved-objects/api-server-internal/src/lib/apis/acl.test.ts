/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  mockGetCurrentTime,
  mockGetSearchDsl,
  mockPreflightCheckForCreate,
} from '../repository.test.mock';

import type { estypes } from '@elastic/elasticsearch';
import type { StoredAcl } from '@kbn/ols';
import { loggerMock } from '@kbn/logging-mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { SavedObjectsSerializer } from '@kbn/core-saved-objects-base-server-internal';
import type { SavedObjectsRawDocSource } from '@kbn/core-saved-objects-server';
import { SavedObjectsRepository } from '../repository';
import { kibanaMigratorMock } from '../../mocks';
import {
  MULTI_NAMESPACE_ISOLATED_TYPE,
  createDocumentMigrator,
  createRegistry,
  createSpySerializer,
  generateIndexPatternSearchResults,
  getMockGetResponse,
  getMockMgetResponse,
  mappings,
  mockTimestamp,
  mockVersionProps,
} from '../../test_helpers/repository.test.common';

const OWNER_ID = 'u_owner';
const ADDED_AT = '2026-01-01T00:00:00.000Z';

/**
 * A stored ACL with a dotted root key, `acl.owner.id`, next to the `acl` object. Elasticsearch
 * indexes both, so both are part of the stored ACL.
 */
const RAW_ACL_SOURCE = {
  acl: {
    version: 1,
    owner: { type: 'user' },
    general: { access: 'view' },
    entries: [{ type: 'user', id: 'u_alice', access: 'edit', added_at: ADDED_AT }],
  },
  'acl.owner.id': OWNER_ID,
};

const STORED_ACL: StoredAcl = {
  version: [1],
  owner: { type: ['user'], id: [OWNER_ID] },
  general: { access: ['view'] },
  entries: [{ type: ['user'], id: ['u_alice'], access: ['edit'], added_at: [ADDED_AT] }],
};

/** The `acl` value a rewrite stores: one object, without dotted keys. */
const REWRITTEN_ACL_SOURCE = {
  version: 1,
  owner: { type: 'user', id: OWNER_ID },
  general: { access: 'view' },
  entries: [{ type: 'user', id: 'u_alice', access: 'edit', added_at: ADDED_AT }],
};

const withAcl = <R extends { _source?: unknown }>(response: R): R => ({
  ...response,
  _source: { ...(response._source as object), ...RAW_ACL_SOURCE },
});

const getIndexedDocument = (
  client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>
) => client.index.mock.calls[0][0].document as Record<string, unknown>;

describe('the stored ACL in repository APIs', () => {
  let client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  let repository: SavedObjectsRepository;
  let serializer: jest.Mocked<SavedObjectsSerializer>;

  const registry = createRegistry();
  const documentMigrator = createDocumentMigrator(registry);
  const type = MULTI_NAMESPACE_ISOLATED_TYPE;
  const id = 'some-id';

  beforeEach(() => {
    client = elasticsearchClientMock.createElasticsearchClient();
    const migrator = kibanaMigratorMock.create();
    documentMigrator.prepareMigrations();
    migrator.migrateDocument = jest.fn().mockImplementation(documentMigrator.migrate);
    migrator.runMigrations = jest.fn().mockResolvedValue([{ status: 'skipped' }]);
    serializer = createSpySerializer(registry);

    const allTypes = registry.getAllTypes().map((t) => t.name);
    // @ts-expect-error must use the private constructor to use the mocked serializer
    repository = new SavedObjectsRepository({
      index: '.kibana-test',
      mappings,
      client,
      migrator,
      typeRegistry: registry,
      serializer,
      allowedTypes: allTypes.filter((t) => !registry.isHidden(t)),
      logger: loggerMock.create(),
      extensions: {},
    });

    mockGetCurrentTime.mockReturnValue(mockTimestamp);
    mockGetSearchDsl.mockClear();
    mockPreflightCheckForCreate.mockReset();
  });

  describe('get', () => {
    beforeEach(() => {
      client.get.mockResponseOnce(withAcl(getMockGetResponse(registry, { type, id })));
    });

    it('leaves the ACL out by default', async () => {
      const result = await repository.get(type, id);
      expect(result).not.toHaveProperty('acl');
    });

    it('returns the stored ACL, dotted keys included, when the caller asks for it', async () => {
      const result = await repository.get(type, id, {}, { includeAcl: true });
      expect(result.acl).toEqual(STORED_ACL);
    });
  });

  describe('find', () => {
    beforeEach(() => {
      const results = generateIndexPatternSearchResults();
      results.hits.hits = results.hits.hits.map(withAcl);
      client.search.mockResponseOnce(results as estypes.SearchResponse);
    });

    it('leaves the ACL out by default', async () => {
      const { saved_objects: objects } = await repository.find({ type: 'index-pattern' });
      expect(objects.length).toBeGreaterThan(0);
      for (const object of objects) {
        expect(object).not.toHaveProperty('acl');
      }
    });

    it('returns the stored ACL when the caller asks for it', async () => {
      const { saved_objects: objects } = await repository.find(
        { type: 'index-pattern' },
        { includeAcl: true }
      );
      expect(objects.length).toBeGreaterThan(0);
      for (const object of objects) {
        expect(object.acl).toEqual(STORED_ACL);
      }
    });

    it('keeps the ACL in the source filter when the caller asks for fields', async () => {
      await repository.find({ type: 'index-pattern', fields: ['title'] });
      expect(client.search.mock.calls[0][0]).toEqual(
        expect.objectContaining({ _source: expect.arrayContaining(['acl']) })
      );
    });
  });

  describe('bulkGet', () => {
    it('leaves the ACL out', async () => {
      const response = getMockMgetResponse(registry, [{ type, id }]);
      response.docs = response.docs.map((doc) => withAcl(doc as { _source?: unknown }) as any);
      client.mget.mockResponseOnce(response);

      const { saved_objects: objects } = await repository.bulkGet([{ type, id }]);
      expect(objects).toHaveLength(1);
      expect(objects[0]).not.toHaveProperty('acl');
    });
  });

  describe('update', () => {
    beforeEach(() => {
      client.get.mockResponseOnce(withAcl(getMockGetResponse(registry, { type, id })));
      client.index.mockResponseImplementation((params) => ({
        body: { _id: params.id, ...mockVersionProps } as estypes.IndexResponse,
      }));
    });

    it('keeps the stored ACL and drops dotted keys', async () => {
      const result = await repository.update(type, id, { title: 'Updated' });

      const document = getIndexedDocument(client);
      expect(document.acl).toEqual(REWRITTEN_ACL_SOURCE);
      expect(document).not.toHaveProperty(['acl.owner.id']);
      expect(result).not.toHaveProperty('acl');
    });
  });

  describe('bulkUpdate', () => {
    it('keeps the stored ACL and drops dotted keys', async () => {
      const response = getMockMgetResponse(registry, [{ type, id }]);
      response.docs = response.docs.map((doc) => withAcl(doc as { _source?: unknown }) as any);
      client.mget.mockResponseOnce(response);
      client.bulk.mockResponseOnce({
        errors: false,
        took: 1,
        items: [
          {
            index: {
              _id: `${type}:${id}`,
              _index: '.kibana-test',
              status: 200,
              ...mockVersionProps,
            },
          },
        ],
      } as estypes.BulkResponse);

      const { saved_objects: objects } = await repository.bulkUpdate([
        { type, id, attributes: { title: 'Updated' } },
      ]);

      const operations = client.bulk.mock.calls[0][0].operations as Array<Record<string, unknown>>;
      const document = operations[1];
      expect(document.acl).toEqual(REWRITTEN_ACL_SOURCE);
      expect(document).not.toHaveProperty(['acl.owner.id']);
      expect(objects[0]).not.toHaveProperty('acl');
    });
  });

  describe('create', () => {
    beforeEach(() => {
      client.index.mockResponseImplementation((params) => ({
        body: { _id: params.id, ...mockVersionProps } as estypes.IndexResponse,
      }));
      client.create.mockResponseImplementation((params) => ({
        body: { _id: params.id, ...mockVersionProps } as estypes.CreateResponse,
      }));
    });

    it('keeps the stored ACL when it overwrites an object', async () => {
      mockPreflightCheckForCreate.mockResolvedValueOnce([
        {
          type,
          id,
          existingDocument: {
            _id: `${type}:${id}`,
            _source: {
              type,
              namespaces: ['default'],
              ...RAW_ACL_SOURCE,
            } as unknown as SavedObjectsRawDocSource,
          },
        },
      ]);

      const result = await repository.create(type, { title: 'New' }, { id, overwrite: true });

      const document = getIndexedDocument(client);
      expect(document.acl).toEqual(REWRITTEN_ACL_SOURCE);
      expect(document).not.toHaveProperty(['acl.owner.id']);
      expect(result).not.toHaveProperty('acl');
    });

    it('ignores an ACL that the caller passes', async () => {
      mockPreflightCheckForCreate.mockResolvedValueOnce([{ type, id }]);

      await repository.create(type, { title: 'New' }, {
        id,
        overwrite: true,
        acl: RAW_ACL_SOURCE.acl,
      } as Parameters<SavedObjectsRepository['create']>[2]);

      expect(getIndexedDocument(client)).not.toHaveProperty('acl');
    });
  });

  describe('bulkCreate', () => {
    it('keeps the stored ACL when it overwrites an object', async () => {
      mockPreflightCheckForCreate.mockResolvedValueOnce([
        {
          type,
          id,
          existingDocument: {
            _id: `${type}:${id}`,
            _source: {
              type,
              namespaces: ['default'],
              ...RAW_ACL_SOURCE,
            } as unknown as SavedObjectsRawDocSource,
          },
        },
      ]);
      client.bulk.mockResponseOnce({
        errors: false,
        took: 1,
        items: [
          {
            index: {
              _id: `${type}:${id}`,
              _index: '.kibana-test',
              status: 200,
              ...mockVersionProps,
            },
          },
        ],
      } as estypes.BulkResponse);

      const { saved_objects: objects } = await repository.bulkCreate(
        [{ type, id, attributes: { title: 'New' } }],
        { overwrite: true }
      );

      const operations = client.bulk.mock.calls[0][0].operations as Array<Record<string, unknown>>;
      const document = operations[1];
      expect(document.acl).toEqual(REWRITTEN_ACL_SOURCE);
      expect(document).not.toHaveProperty(['acl.owner.id']);
      expect(objects[0]).not.toHaveProperty('acl');
    });
  });
});
