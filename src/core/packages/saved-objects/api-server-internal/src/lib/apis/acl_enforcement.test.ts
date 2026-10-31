/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// The reference walk searches for aliases and shared origins through point-in-time finders.
jest.mock('./internals/find_legacy_url_aliases', () => ({
  findLegacyUrlAliases: jest.fn().mockImplementation(async () => new Map()),
}));
jest.mock('./utils/find_shared_origin_objects', () => ({
  findSharedOriginObjects: jest.fn().mockImplementation(async () => new Map()),
}));

import type { estypes } from '@elastic/elasticsearch';
import { esql } from '@elastic/esql';
import {
  FIXTURE_POLICY,
  buildAclReadFilter,
  normalizeAclSource,
  type AclDocument,
} from '@kbn/access-control';
import { loggerMock } from '@kbn/logging-mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import {
  LEGACY_URL_ALIAS_TYPE,
  encodeHitVersion,
} from '@kbn/core-saved-objects-base-server-internal';
import {
  isSavedObjectErrorResult,
  type SavedObjectsRawDocSource,
} from '@kbn/core-saved-objects-server';
import { SavedObjectsRepository } from '../repository';
import { kibanaMigratorMock } from '../../mocks';
import { savedObjectsExtensionsMock } from '../../mocks/saved_objects_extensions.mock';
import { createFailClosedAclExtension } from '../fail_closed_acl_extension';
import {
  MULTI_NAMESPACE_ISOLATED_TYPE,
  mappings,
  createRegistry,
  createType,
  createDocumentMigrator,
  createSpySerializer,
} from '../../test_helpers/repository.test.common';

const ACL_TYPE = 'aclType';
const OTHER_TYPE = MULTI_NAMESPACE_ISOLATED_TYPE;
const INDEX = '.kibana-test_8.0.0-testing';
const UPDATED_AT = '2020-01-01T00:00:00.000Z';
const SEQ_NO_PROPS = { _seq_no: 5, _primary_term: 2 };
const OBJECT_VERSION = encodeHitVersion(SEQ_NO_PROPS);

const OWNER = { type: 'user', id: 'u_owner' };
/** Restricted: nobody without a principal can see the object. */
const PRIVATE_ACL = { version: 1, owner: OWNER, general_access: 'none', entries: [] };
/** Restricted: everybody can see and use the object, nobody else can edit it. */
const RUN_ONLY_ACL = { version: 1, owner: OWNER, general_access: 'use', entries: [] };
/** Not restricted: everybody can edit the object. */
const PUBLIC_ACL = { version: 1, owner: OWNER, general_access: 'edit', entries: [] };

/** The stored form of an ACL, which has no `entries` when there are none. */
const toStored = ({ entries, ...acl }: AclDocument) =>
  entries?.length ? { ...acl, entries } : acl;

const createRawDoc = (
  type: string,
  id: string,
  sourceFields: Record<string, unknown> = {}
): estypes.GetGetResult<SavedObjectsRawDocSource> => ({
  found: true,
  _id: `${type}:${id}`,
  _index: INDEX,
  ...SEQ_NO_PROPS,
  _source: {
    type,
    namespaces: ['default'],
    [type]: { title: `Title of ${id}` },
    references: [],
    updated_at: UPDATED_AT,
    ...sourceFields,
  },
});

const notFoundDoc = (type: string, id: string) => ({
  found: false,
  _id: `${type}:${id}`,
  _index: INDEX,
});

/** Returns the ID and error status code, if any, of each bulk result. */
const getStatusCodes = (results: Array<Parameters<typeof isSavedObjectErrorResult>[0]>) =>
  results.map((result) => [
    result.id,
    isSavedObjectErrorResult(result) ? result.error.statusCode : undefined,
  ]);

describe('object-level security in the repository', () => {
  let client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  let repository: SavedObjectsRepository;
  let aclExtension: ReturnType<typeof savedObjectsExtensionsMock.createAclExtension>;

  const registry = createRegistry();
  registry.registerType(
    createType(ACL_TYPE, { namespaceType: 'multiple-isolated', accessPolicy: FIXTURE_POLICY })
  );
  const documentMigrator = createDocumentMigrator(registry);
  // The mock extension decides like the fail-closed default: general access only.
  const failClosedExtension = createFailClosedAclExtension(registry);

  const expectNoAclCalls = () => {
    expect(aclExtension.authorizeObjects).not.toHaveBeenCalled();
    expect(aclExtension.getReadFilters).not.toHaveBeenCalled();
    expect(aclExtension.getInitialAcl).not.toHaveBeenCalled();
    expect(aclExtension.authorizeAclChange).not.toHaveBeenCalled();
  };

  const mockCreatePreflight = (doc: object) => {
    // The object, then the legacy URL alias in the default space.
    client.mget.mockResponseOnce({
      docs: [doc, { found: false, _id: 'legacy-url-alias', _index: INDEX }],
    } as estypes.MgetResponse<SavedObjectsRawDocSource>);
  };

  const mockIndexResponse = (type: string, id: string): estypes.WriteResponseBase => ({
    _id: `${type}:${id}`,
    _index: INDEX,
    _version: 2,
    _shards: { total: 1, successful: 1, failed: 0 },
    result: 'created',
    _seq_no: 6,
    _primary_term: 2,
  });

  beforeEach(() => {
    client = elasticsearchClientMock.createElasticsearchClient();
    const migrator = kibanaMigratorMock.create();
    documentMigrator.prepareMigrations();
    migrator.migrateDocument = jest.fn().mockImplementation(documentMigrator.migrate);
    migrator.runMigrations = jest.fn().mockResolvedValue([{ status: 'skipped' }]);

    aclExtension = savedObjectsExtensionsMock.createAclExtension();
    aclExtension.authorizeObjects.mockImplementation(failClosedExtension.authorizeObjects);
    aclExtension.getReadFilters.mockImplementation(failClosedExtension.getReadFilters);

    const allowedTypes = [
      ...new Set(
        registry
          .getAllTypes()
          .map(({ name }) => name)
          .filter((type) => !registry.isHidden(type))
      ),
    ];

    // @ts-expect-error must use the private constructor to use the mocked serializer
    repository = new SavedObjectsRepository({
      index: '.kibana-test',
      mappings,
      client,
      migrator,
      typeRegistry: registry,
      serializer: createSpySerializer(registry),
      allowedTypes,
      logger: loggerMock.create(),
      extensions: { aclExtension },
    });
  });

  describe('#get', () => {
    it('reports an object the caller cannot view as missing', async () => {
      client.get.mockResponseOnce(createRawDoc(ACL_TYPE, 'hidden', { acl: PRIVATE_ACL }));

      await expect(repository.get(ACL_TYPE, 'hidden')).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
      expect(aclExtension.runInAuditScope).toHaveBeenCalledTimes(1);
    });

    it('returns a visible object with its canonical ACL', async () => {
      client.get.mockResponseOnce(createRawDoc(ACL_TYPE, 'visible', { acl: RUN_ONLY_ACL }));

      const result = await repository.get(ACL_TYPE, 'visible');

      expect(result.id).toBe('visible');
      expect(result.acl).toEqual({
        version: [1],
        owner: { type: ['user'], id: ['u_owner'] },
        general_access: ['use'],
        entries: [],
      });
      expect(aclExtension.authorizeObjects).toHaveBeenCalledWith(
        expect.objectContaining({ operation: 'view', namespace: undefined })
      );
    });
  });

  describe('#bulkGet', () => {
    it('turns a hidden object into a not found error in place', async () => {
      client.mget.mockResponseOnce({
        docs: [
          createRawDoc(ACL_TYPE, 'visible', { acl: RUN_ONLY_ACL }),
          createRawDoc(ACL_TYPE, 'hidden', { acl: PRIVATE_ACL }),
          createRawDoc(OTHER_TYPE, 'other'),
        ],
      } as estypes.MgetResponse<SavedObjectsRawDocSource>);

      const { saved_objects: savedObjects } = await repository.bulkGet([
        { type: ACL_TYPE, id: 'visible' },
        { type: ACL_TYPE, id: 'hidden' },
        { type: OTHER_TYPE, id: 'other' },
      ]);

      expect(getStatusCodes(savedObjects)).toEqual([
        ['visible', undefined],
        ['hidden', 404],
        ['other', undefined],
      ]);
      expect(savedObjects[1]).toEqual({
        id: 'hidden',
        type: ACL_TYPE,
        error: expect.objectContaining({ error: 'Not Found', statusCode: 404 }),
      });
      // Only the registered type is decided.
      expect(aclExtension.authorizeObjects).toHaveBeenCalledTimes(1);
      expect(aclExtension.authorizeObjects.mock.calls[0][0].objects.map(({ id }) => id)).toEqual([
        'visible',
        'hidden',
      ]);
    });
  });

  describe('#checkConflicts', () => {
    it('does not report an object the caller cannot view as a conflict', async () => {
      client.mget.mockResponseOnce({
        docs: [
          createRawDoc(ACL_TYPE, 'visible', { acl: RUN_ONLY_ACL }),
          createRawDoc(ACL_TYPE, 'hidden', { acl: PRIVATE_ACL }),
          createRawDoc(OTHER_TYPE, 'other'),
        ],
      } as estypes.MgetResponse<SavedObjectsRawDocSource>);

      const { errors } = await repository.checkConflicts([
        { type: ACL_TYPE, id: 'visible' },
        { type: ACL_TYPE, id: 'hidden' },
        { type: OTHER_TYPE, id: 'other' },
      ]);

      expect(errors.map(({ id, error }) => [id, error.statusCode])).toEqual([
        ['visible', 409],
        ['other', 409],
      ]);
      expect(client.mget.mock.calls[0][0]?.docs?.map((doc) => doc._source)).toEqual([
        { includes: ['type', 'namespaces', 'acl'] },
        { includes: ['type', 'namespaces', 'acl'] },
        { includes: ['type', 'namespaces'] },
      ]);
    });
  });

  describe('#find', () => {
    const mockSearchResponse = () =>
      client.search.mockResponseOnce({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, failed: 0, skipped: 0 },
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
      });

    it('adds the read filter of the registered type to the query', async () => {
      mockSearchResponse();

      await repository.find({ type: [ACL_TYPE, OTHER_TYPE] });

      expect(aclExtension.getReadFilters).toHaveBeenCalledWith({
        namespacesByType: new Map([[ACL_TYPE, ['default']]]),
      });
      const expectedFilter = buildAclReadFilter({
        policy: FIXTURE_POLICY,
        level: 'view',
        recoverySpaces: [],
        ordinarySpaces: ['default'],
      });
      const query = JSON.stringify(client.search.mock.calls[0][0]?.query);
      expect(query.split(JSON.stringify(expectedFilter)).length - 1).toBe(1);
    });

    it('does not filter unregistered types', async () => {
      mockSearchResponse();

      await repository.find({ type: OTHER_TYPE });

      expect(JSON.stringify(client.search.mock.calls[0][0]?.query)).not.toContain('acl');
      expectNoAclCalls();
    });

    it.each([
      ['root search fields', { rootSearchFields: ['acl.owner.id'] }],
      ['sort field', { sortField: 'acl' }],
      ['sort', { sort: [{ field: 'acl.general_access' }] }],
    ])('rejects ACL %s', async (_, options) => {
      await expect(repository.find({ type: ACL_TYPE, ...options })).rejects.toMatchObject({
        message: expect.stringContaining('Access control fields cannot be searched or sorted'),
        output: { statusCode: 400 },
      });
      expect(client.search).not.toHaveBeenCalled();
    });
  });

  describe('#create', () => {
    it.each([false, true])(
      'reports an occupied ID the caller cannot view as missing (overwrite: %s)',
      async (overwrite) => {
        mockCreatePreflight(createRawDoc(ACL_TYPE, 'hidden', { acl: PRIVATE_ACL }));

        await expect(
          repository.create(ACL_TYPE, { title: 'new' }, { id: 'hidden', overwrite })
        ).rejects.toMatchObject({ output: { statusCode: 404 } });
        expect(aclExtension.authorizeObjects).toHaveBeenCalledWith(
          expect.objectContaining({ operation: overwrite ? 'edit' : 'view' })
        );
        expect(client.index).not.toHaveBeenCalled();
        expect(client.create).not.toHaveBeenCalled();
      }
    );

    it('reports a conflict for a visible object without overwrite', async () => {
      mockCreatePreflight(createRawDoc(ACL_TYPE, 'visible', { acl: RUN_ONLY_ACL }));

      await expect(
        repository.create(ACL_TYPE, { title: 'new' }, { id: 'visible' })
      ).rejects.toMatchObject({ output: { statusCode: 409 } });
    });

    it('forbids overwriting a visible object the caller cannot edit', async () => {
      mockCreatePreflight(createRawDoc(ACL_TYPE, 'visible', { acl: RUN_ONLY_ACL }));

      await expect(
        repository.create(ACL_TYPE, { title: 'new' }, { id: 'visible', overwrite: true })
      ).rejects.toMatchObject({ output: { statusCode: 403 } });
      expect(client.index).not.toHaveBeenCalled();
    });

    it('keeps the stored ACL on overwrite and binds the write to the authorized document', async () => {
      mockCreatePreflight(createRawDoc(ACL_TYPE, 'public', { acl: PUBLIC_ACL }));
      client.index.mockResponseOnce(mockIndexResponse(ACL_TYPE, 'public'));

      const result = await repository.create(
        ACL_TYPE,
        { title: 'new' },
        { id: 'public', overwrite: true }
      );

      expect(client.index).toHaveBeenCalledTimes(1);
      const request = client.index.mock.calls[0][0];
      expect(request).toMatchObject({ if_seq_no: 5, if_primary_term: 2 });
      expect(request.document).toMatchObject({
        acl: { version: 1, owner: OWNER, general_access: 'edit' },
      });
      expect(aclExtension.getInitialAcl).not.toHaveBeenCalled();
      expect(result.acl).toEqual(normalizeAclSource({ acl: PUBLIC_ACL }));
    });

    it('rejects initial access on overwrite', async () => {
      mockCreatePreflight(createRawDoc(ACL_TYPE, 'public', { acl: PUBLIC_ACL }));

      await expect(
        repository.create(
          ACL_TYPE,
          { title: 'new' },
          { id: 'public', overwrite: true, initialAcl: { general_access: 'none' } }
        )
      ).rejects.toMatchObject({ output: { statusCode: 400 } });
      expect(client.index).not.toHaveBeenCalled();
    });

    it('stores the initial ACL for a new object and never replaces a concurrent one', async () => {
      const initialAcl: AclDocument = {
        version: 1,
        owner: { type: 'user', id: 'u_creator' },
        general_access: 'none',
        entries: [],
      };
      aclExtension.getInitialAcl.mockResolvedValue(initialAcl);
      mockCreatePreflight(notFoundDoc(ACL_TYPE, 'new'));
      client.create.mockResponseOnce(mockIndexResponse(ACL_TYPE, 'new'));

      const requested = { general_access: 'none' as const };
      await repository.create(
        ACL_TYPE,
        { title: 'new' },
        { id: 'new', overwrite: true, initialAcl: requested }
      );

      expect(aclExtension.getInitialAcl).toHaveBeenCalledWith({
        type: ACL_TYPE,
        namespace: undefined,
        requested,
      });
      expect(client.index).not.toHaveBeenCalled();
      expect(client.create).toHaveBeenCalledTimes(1);
      expect(client.create.mock.calls[0][0].document).toMatchObject({ acl: toStored(initialAcl) });
    });

    it('rejects initial access for an unregistered type', async () => {
      await expect(
        repository.create(OTHER_TYPE, { title: 'new' }, { initialAcl: { general_access: 'none' } })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });
      expect(client.create).not.toHaveBeenCalled();
    });
  });

  describe('#update', () => {
    it('forbids an update the caller cannot make before any write', async () => {
      client.get.mockResponseOnce(createRawDoc(ACL_TYPE, 'visible', { acl: RUN_ONLY_ACL }));

      await expect(
        repository.update(ACL_TYPE, 'visible', { title: 'changed' })
      ).rejects.toMatchObject({ output: { statusCode: 403 } });
      expect(aclExtension.authorizeObjects).toHaveBeenCalledWith(
        expect.objectContaining({ operation: 'edit' })
      );
      expect(client.index).not.toHaveBeenCalled();
      expect(client.update).not.toHaveBeenCalled();
    });

    it('reports a hidden object as missing', async () => {
      client.get.mockResponseOnce(createRawDoc(ACL_TYPE, 'hidden', { acl: PRIVATE_ACL }));

      await expect(
        repository.update(ACL_TYPE, 'hidden', { title: 'changed' })
      ).rejects.toMatchObject({ output: { statusCode: 404 } });
      expect(client.index).not.toHaveBeenCalled();
    });
  });

  describe('#delete', () => {
    it('reports a hidden object as missing', async () => {
      client.get.mockResponseOnce(createRawDoc(ACL_TYPE, 'hidden', { acl: PRIVATE_ACL }));

      await expect(repository.delete(ACL_TYPE, 'hidden')).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
      expect(client.delete).not.toHaveBeenCalled();
    });

    it('binds the delete to the authorized document', async () => {
      client.get.mockResponseOnce(createRawDoc(ACL_TYPE, 'public', { acl: PUBLIC_ACL }));
      client.delete.mockResponseOnce({
        _id: `${ACL_TYPE}:public`,
        _index: INDEX,
        result: 'deleted',
      } as estypes.DeleteResponse);

      await repository.delete(ACL_TYPE, 'public');

      expect(aclExtension.authorizeObjects).toHaveBeenCalledWith(
        expect.objectContaining({ operation: 'delete' })
      );
      expect(client.delete).toHaveBeenCalledWith(
        expect.objectContaining({ if_seq_no: 5, if_primary_term: 2 }),
        expect.anything()
      );
    });
  });

  describe('#bulkDelete', () => {
    it('turns a denied object into an error and maps the remaining results by request index', async () => {
      client.mget.mockResponseOnce({
        docs: [
          createRawDoc(ACL_TYPE, 'hidden', { acl: PRIVATE_ACL }),
          createRawDoc(ACL_TYPE, 'public', { acl: PUBLIC_ACL }),
          createRawDoc(OTHER_TYPE, 'other'),
        ],
      } as estypes.MgetResponse<SavedObjectsRawDocSource>);
      client.bulk.mockResponseOnce({
        took: 1,
        errors: true,
        items: [
          { delete: { _id: `${ACL_TYPE}:public`, _index: INDEX, status: 200, result: 'deleted' } },
          {
            delete: { _id: `${OTHER_TYPE}:other`, _index: INDEX, status: 404, result: 'not_found' },
          },
        ],
      });

      const { statuses } = await repository.bulkDelete([
        { type: ACL_TYPE, id: 'hidden' },
        { type: ACL_TYPE, id: 'public' },
        { type: OTHER_TYPE, id: 'other' },
      ]);

      expect(statuses.map(({ id, success, error }) => [id, success, error?.statusCode])).toEqual([
        ['hidden', false, 404],
        ['public', true, undefined],
        ['other', false, 404],
      ]);
      const operations = client.bulk.mock.calls[0][0].operations as Array<{
        delete: Record<string, unknown>;
      }>;
      expect(operations).toEqual([
        { delete: expect.objectContaining({ _id: `${ACL_TYPE}:public`, if_seq_no: 5 }) },
        { delete: expect.not.objectContaining({ if_seq_no: expect.anything() }) },
      ]);
      expect(operations[1].delete._id).toBe(`${OTHER_TYPE}:other`);
    });
  });

  describe('operations that cannot enforce object-level security', () => {
    it('rejects raw search on a registered type', async () => {
      await expect(
        repository.search({ type: ACL_TYPE, namespaces: ['default'] })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });
      expect(client.search).not.toHaveBeenCalled();
    });

    it('rejects ES|QL on a registered type', async () => {
      await expect(
        repository.esql({ type: ACL_TYPE, namespaces: ['default'], pipeline: esql`LIMIT 10` })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });
      expect(client.esql.query).not.toHaveBeenCalled();
    });

    it('rejects counters on a registered type', async () => {
      await expect(
        repository.incrementCounter(ACL_TYPE, 'counter', ['count'])
      ).rejects.toMatchObject({ output: { statusCode: 400 } });
      expect(client.update).not.toHaveBeenCalled();
    });

    it('rejects space changes on a registered type', async () => {
      await expect(
        repository.updateObjectsSpaces([{ type: ACL_TYPE, id: 'object' }], ['space-a'], [])
      ).rejects.toMatchObject({ output: { statusCode: 400 } });
    });
  });

  describe('#changeAcl', () => {
    const change = { kind: 'replace' as const, general_access: 'none' as const, entries: [] };
    const next: AclDocument = {
      version: 1,
      owner: { type: 'user', id: 'u_owner' },
      general_access: 'none',
      entries: [],
    };

    it('rejects an unregistered type', async () => {
      await expect(
        repository.changeAcl(OTHER_TYPE, 'other', change, { version: OBJECT_VERSION })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });
      expect(client.get).not.toHaveBeenCalled();
    });

    it('reports a hidden object as missing, even with a stale version', async () => {
      client.get.mockResponseOnce(createRawDoc(ACL_TYPE, 'hidden', { acl: PRIVATE_ACL }));

      await expect(
        repository.changeAcl(ACL_TYPE, 'hidden', change, { version: 'stale' })
      ).rejects.toMatchObject({ output: { statusCode: 404 } });
      expect(aclExtension.authorizeAclChange).not.toHaveBeenCalled();
      expect(client.index).not.toHaveBeenCalled();
    });

    it('reports a version mismatch on a visible object as a conflict', async () => {
      client.get.mockResponseOnce(createRawDoc(ACL_TYPE, 'visible', { acl: RUN_ONLY_ACL }));

      await expect(
        repository.changeAcl(ACL_TYPE, 'visible', change, {
          version: encodeHitVersion({ _seq_no: 4, _primary_term: 2 }),
        })
      ).rejects.toMatchObject({ output: { statusCode: 409 } });
      expect(aclExtension.authorizeAclChange).not.toHaveBeenCalled();
      expect(client.index).not.toHaveBeenCalled();
    });

    it('writes only the new ACL and binds the write to the read document', async () => {
      const doc = createRawDoc(ACL_TYPE, 'visible', {
        acl: RUN_ONLY_ACL,
        'acl.entries': [{ type: 'user', id: 'u_revoked', access: 'use', added_at: UPDATED_AT }],
        originId: 'origin',
      });
      client.get.mockResponseOnce(doc);
      aclExtension.authorizeAclChange.mockResolvedValue({ next, warnings: [] });
      client.index.mockResponseOnce(mockIndexResponse(ACL_TYPE, 'visible'));

      const result = await repository.changeAcl(ACL_TYPE, 'visible', change, {
        version: OBJECT_VERSION,
      });

      expect(aclExtension.authorizeAclChange).toHaveBeenCalledWith({
        namespace: undefined,
        object: {
          type: ACL_TYPE,
          id: 'visible',
          acl: normalizeAclSource(doc._source),
        },
        change,
      });
      expect(client.index).toHaveBeenCalledWith(
        {
          id: `${ACL_TYPE}:visible`,
          index: INDEX,
          document: {
            type: ACL_TYPE,
            namespaces: ['default'],
            [ACL_TYPE]: { title: 'Title of visible' },
            references: [],
            updated_at: UPDATED_AT,
            originId: 'origin',
            acl: next,
          },
          if_seq_no: 5,
          if_primary_term: 2,
          refresh: 'wait_for',
          require_alias: true,
        },
        expect.anything()
      );
      expect(result).toEqual({
        type: ACL_TYPE,
        id: 'visible',
        version: encodeHitVersion({ _seq_no: 6, _primary_term: 2 }),
        acl: normalizeAclSource({ acl: next }),
        warnings: [],
      });
    });
  });

  describe('#resolve', () => {
    const mockAliases = (targetId?: string) =>
      client.bulk.mockResponseOnce({
        took: 0,
        errors: false,
        items: [
          {
            update: {
              _id: 'alias',
              _index: INDEX,
              status: 200,
              get: {
                found: !!targetId,
                _source: targetId
                  ? { [LEGACY_URL_ALIAS_TYPE]: { targetId, purpose: 'savedObjectConversion' } }
                  : {},
                ...SEQ_NO_PROPS,
              },
            },
          },
        ],
      } as estypes.BulkResponse);
    const mockDocs = (...docs: object[]) =>
      client.mget.mockResponseOnce({ docs } as estypes.MgetResponse<SavedObjectsRawDocSource>);

    it('reports a hidden exact match as missing', async () => {
      mockAliases();
      mockDocs(createRawDoc(ACL_TYPE, 'source', { acl: PRIVATE_ACL }));

      await expect(repository.resolve(ACL_TYPE, 'source')).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
    });

    it('returns an exact match without a conflict when the alias target is hidden', async () => {
      mockAliases('target');
      mockDocs(
        createRawDoc(ACL_TYPE, 'source', { acl: RUN_ONLY_ACL }),
        createRawDoc(ACL_TYPE, 'target', { acl: PRIVATE_ACL })
      );

      const result = await repository.resolve(ACL_TYPE, 'source');

      expect(result.outcome).toBe('exactMatch');
      expect(result.saved_object.id).toBe('source');
      expect(result).not.toHaveProperty('alias_target_id');
    });

    it('returns the visible alias target when the exact match is hidden', async () => {
      mockAliases('target');
      mockDocs(
        createRawDoc(ACL_TYPE, 'source', { acl: PRIVATE_ACL }),
        createRawDoc(ACL_TYPE, 'target', { acl: RUN_ONLY_ACL })
      );

      const result = await repository.resolve(ACL_TYPE, 'source');

      expect(result.outcome).toBe('aliasMatch');
      expect(result.saved_object.id).toBe('target');
      expect(result.alias_target_id).toBe('target');
    });
  });

  describe('#bulkCreate', () => {
    const initialAcl: AclDocument = {
      version: 1,
      owner: { type: 'user', id: 'u_creator' },
      general_access: 'none',
      entries: [],
    };
    const mockPreflight = (...docs: object[]) =>
      client.mget.mockResponseOnce({
        // Each object is followed by its legacy URL alias in the default space.
        docs: docs.flatMap((doc) => [doc, { found: false, _id: 'alias', _index: INDEX }]),
      } as estypes.MgetResponse<SavedObjectsRawDocSource>);
    // Objects are prepared concurrently, so the write order can differ from the input order. The
    // response echoes every write action in request order.
    const mockBulkWrites = () =>
      client.bulk.mockResponseImplementationOnce(({ operations = [] }) => ({
        body: {
          took: 1,
          errors: false,
          items: (operations as Array<Record<string, { _id: string }>>)
            .filter((_, index) => index % 2 === 0)
            .map((action) => {
              const [method, { _id }] = Object.entries(action)[0];
              return {
                [method]: {
                  _id,
                  _index: INDEX,
                  status: 200,
                  result: 'created',
                  _seq_no: 6,
                  _primary_term: 2,
                },
              };
            }),
        } as estypes.BulkResponse,
      }));
    /** Returns the write action and source for each written ID. */
    const getWrites = () => {
      const operations = client.bulk.mock.calls[0][0].operations as Array<
        Record<string, Record<string, unknown>>
      >;
      const writes = new Map<string, { method: string; action: object; source: object }>();
      for (let index = 0; index < operations.length; index += 2) {
        const [method, action] = Object.entries(operations[index])[0];
        writes.set(action._id as string, { method, action, source: operations[index + 1] });
      }
      return writes;
    };

    it('reports a hidden occupied ID as missing while other objects are created', async () => {
      aclExtension.getInitialAcl.mockResolvedValue(initialAcl);
      mockPreflight(
        createRawDoc(ACL_TYPE, 'hidden', { acl: PRIVATE_ACL }),
        notFoundDoc(ACL_TYPE, 'new'),
        notFoundDoc(OTHER_TYPE, 'other')
      );
      mockBulkWrites();

      const requested = { general_access: 'none' as const };
      const { saved_objects: savedObjects } = await repository.bulkCreate([
        { type: ACL_TYPE, id: 'hidden', attributes: { title: 'new' } },
        { type: ACL_TYPE, id: 'new', attributes: { title: 'new' }, initialAcl: requested },
        { type: OTHER_TYPE, id: 'other', attributes: { title: 'new' } },
      ]);

      expect(getStatusCodes(savedObjects)).toEqual([
        ['hidden', 404],
        ['new', undefined],
        ['other', undefined],
      ]);
      expect(aclExtension.getInitialAcl).toHaveBeenCalledTimes(1);
      expect(aclExtension.getInitialAcl).toHaveBeenCalledWith({
        type: ACL_TYPE,
        namespace: undefined,
        requested,
      });
      const writes = getWrites();
      expect([...writes.keys()].sort()).toEqual([`${ACL_TYPE}:new`, `${OTHER_TYPE}:other`]);
      expect(writes.get(`${ACL_TYPE}:new`)).toMatchObject({
        method: 'create',
        source: { acl: toStored(initialAcl) },
      });
      expect(writes.get(`${OTHER_TYPE}:other`)?.method).toBe('create');
      expect(writes.get(`${OTHER_TYPE}:other`)?.source).not.toHaveProperty('acl');
    });

    it('keeps the stored ACL on overwrite and rejects initial access for existing objects', async () => {
      aclExtension.getInitialAcl.mockResolvedValue(initialAcl);
      mockPreflight(
        createRawDoc(ACL_TYPE, 'public', { acl: PUBLIC_ACL }),
        createRawDoc(ACL_TYPE, 'existing', { acl: PUBLIC_ACL }),
        notFoundDoc(ACL_TYPE, 'new')
      );
      mockBulkWrites();

      const { saved_objects: savedObjects } = await repository.bulkCreate(
        [
          { type: ACL_TYPE, id: 'public', attributes: { title: 'new' } },
          {
            type: ACL_TYPE,
            id: 'existing',
            attributes: { title: 'new' },
            initialAcl: { general_access: 'none' },
          },
          { type: ACL_TYPE, id: 'new', attributes: { title: 'new' } },
        ],
        { overwrite: true }
      );

      expect(getStatusCodes(savedObjects)).toEqual([
        ['public', undefined],
        ['existing', 400],
        ['new', undefined],
      ]);
      expect(aclExtension.authorizeObjects).toHaveBeenCalledWith(
        expect.objectContaining({ operation: 'edit' })
      );
      const writes = getWrites();
      expect([...writes.keys()].sort()).toEqual([`${ACL_TYPE}:new`, `${ACL_TYPE}:public`]);
      expect(writes.get(`${ACL_TYPE}:public`)).toEqual({
        method: 'index',
        action: expect.objectContaining({ if_seq_no: 5, if_primary_term: 2 }),
        source: expect.objectContaining({
          acl: { version: 1, owner: OWNER, general_access: 'edit' },
        }),
      });
      // A new object is never written over one created concurrently, even with overwrite.
      expect(writes.get(`${ACL_TYPE}:new`)).toMatchObject({
        method: 'create',
        source: { acl: toStored(initialAcl) },
      });
      expect(aclExtension.getInitialAcl).toHaveBeenCalledTimes(1);
    });
  });

  describe('#bulkUpdate', () => {
    it('turns denied objects into errors and binds allowed writes to the read document', async () => {
      client.mget.mockResponseOnce({
        docs: [
          createRawDoc(ACL_TYPE, 'hidden', { acl: PRIVATE_ACL }),
          createRawDoc(ACL_TYPE, 'run-only', { acl: RUN_ONLY_ACL }),
          createRawDoc(ACL_TYPE, 'public', { acl: PUBLIC_ACL }),
        ],
      } as estypes.MgetResponse<SavedObjectsRawDocSource>);
      client.bulk.mockResponseOnce({
        took: 1,
        errors: false,
        items: [
          {
            index: {
              _id: `${ACL_TYPE}:public`,
              _index: INDEX,
              status: 200,
              result: 'updated',
              _seq_no: 6,
              _primary_term: 2,
            },
          },
        ],
      } as estypes.BulkResponse);

      const { saved_objects: savedObjects } = await repository.bulkUpdate([
        { type: ACL_TYPE, id: 'hidden', attributes: { title: 'changed' } },
        { type: ACL_TYPE, id: 'run-only', attributes: { title: 'changed' } },
        { type: ACL_TYPE, id: 'public', attributes: { title: 'changed' } },
      ]);

      expect(getStatusCodes(savedObjects)).toEqual([
        ['hidden', 404],
        ['run-only', 403],
        ['public', undefined],
      ]);
      const operations = client.bulk.mock.calls[0][0].operations as Array<
        Record<string, Record<string, unknown>>
      >;
      expect(operations).toHaveLength(2);
      expect(operations[0]).toEqual({
        index: expect.objectContaining({
          _id: `${ACL_TYPE}:public`,
          if_seq_no: 5,
          if_primary_term: 2,
        }),
      });
      // The full-document rewrite keeps the stored ACL.
      expect(operations[1].acl).toEqual({ version: 1, owner: OWNER, general_access: 'edit' });
    });
  });

  describe('#update with upsert', () => {
    it('stores the initial ACL when the object does not exist', async () => {
      const initialAcl: AclDocument = {
        version: 1,
        owner: { type: 'user', id: 'u_creator' },
        general_access: 'edit',
        entries: [],
      };
      aclExtension.getInitialAcl.mockResolvedValue(initialAcl);
      client.get.mockResponseOnce(
        notFoundDoc(ACL_TYPE, 'new') as estypes.GetGetResult<SavedObjectsRawDocSource>
      );
      mockCreatePreflight(notFoundDoc(ACL_TYPE, 'new'));
      client.create.mockResponseOnce(mockIndexResponse(ACL_TYPE, 'new'));

      await repository.update(
        ACL_TYPE,
        'new',
        { title: 'changed' },
        { upsert: { title: 'created' } }
      );

      expect(aclExtension.authorizeObjects).not.toHaveBeenCalled();
      expect(aclExtension.getInitialAcl).toHaveBeenCalledWith({
        type: ACL_TYPE,
        namespace: undefined,
        requested: undefined,
      });
      expect(client.create).toHaveBeenCalledTimes(1);
      expect(client.create.mock.calls[0][0].document).toMatchObject({ acl: toStored(initialAcl) });
    });
  });

  describe('#collectMultiNamespaceReferences', () => {
    it('reports a hidden object as missing and does not follow its references', async () => {
      const reference = (type: string, id: string) => ({ type, id, name: `ref-${id}` });
      client.mget
        .mockResponseOnce({
          docs: [
            createRawDoc(OTHER_TYPE, 'root', {
              references: [reference(ACL_TYPE, 'hidden'), reference(ACL_TYPE, 'visible')],
            }),
          ],
        } as estypes.MgetResponse<SavedObjectsRawDocSource>)
        .mockResponseOnce({
          docs: [
            createRawDoc(ACL_TYPE, 'hidden', {
              acl: PRIVATE_ACL,
              references: [reference(OTHER_TYPE, 'secret')],
            }),
            createRawDoc(ACL_TYPE, 'visible', {
              acl: RUN_ONLY_ACL,
              references: [reference(OTHER_TYPE, 'shown')],
            }),
          ],
        } as estypes.MgetResponse<SavedObjectsRawDocSource>)
        .mockResponseOnce({
          docs: [createRawDoc(OTHER_TYPE, 'shown')],
        } as estypes.MgetResponse<SavedObjectsRawDocSource>);

      const { objects } = await repository.collectMultiNamespaceReferences([
        { type: OTHER_TYPE, id: 'root' },
      ]);

      expect(objects.map(({ id, isMissing }) => [id, !!isMissing])).toEqual([
        ['root', false],
        ['hidden', true],
        ['visible', false],
        ['shown', false],
      ]);
      expect(client.mget).toHaveBeenCalledTimes(3);
      // The ACL is read along with the other root fields.
      expect(client.mget).toHaveBeenNthCalledWith(
        2,
        {
          docs: [
            expect.objectContaining({ _source: expect.arrayContaining(['acl']) }),
            expect.objectContaining({ _source: expect.arrayContaining(['acl']) }),
          ],
        },
        expect.anything()
      );
    });
  });

  describe('audit scope', () => {
    it('runs per-object operations inside the extension audit scope', async () => {
      // The scope returns its own result without running the operation, so a result that reaches
      // the caller can only come from the scope.
      const scoped = { scoped: true };
      aclExtension.runInAuditScope.mockImplementation(async () => scoped as never);
      const object = { type: ACL_TYPE, id: 'object' };

      await expect(repository.create(ACL_TYPE, { title: 'new' })).resolves.toBe(scoped);
      await expect(repository.bulkCreate([{ ...object, attributes: {} }])).resolves.toBe(scoped);
      await expect(repository.get(ACL_TYPE, 'object')).resolves.toBe(scoped);
      await expect(repository.bulkGet([object])).resolves.toBe(scoped);
      await expect(repository.resolve(ACL_TYPE, 'object')).resolves.toBe(scoped);
      await expect(repository.bulkResolve([object])).resolves.toBe(scoped);
      await expect(repository.update(ACL_TYPE, 'object', {})).resolves.toBe(scoped);
      await expect(repository.bulkUpdate([{ ...object, attributes: {} }])).resolves.toBe(scoped);
      await expect(repository.delete(ACL_TYPE, 'object')).resolves.toBe(scoped);
      await expect(repository.bulkDelete([object])).resolves.toBe(scoped);
      await expect(repository.collectMultiNamespaceReferences([object])).resolves.toBe(scoped);
      await expect(
        repository.changeAcl(ACL_TYPE, 'object', { kind: 'claim' }, { version: OBJECT_VERSION })
      ).resolves.toBe(scoped);

      expect(aclExtension.runInAuditScope).toHaveBeenCalledTimes(12);
      for (const method of [
        'get',
        'mget',
        'index',
        'create',
        'update',
        'delete',
        'bulk',
      ] as const) {
        expect(client[method]).not.toHaveBeenCalled();
      }
    });
  });

  describe('unregistered types', () => {
    it('get, create, update and delete never reach the extension', async () => {
      client.get.mockResponseOnce(createRawDoc(OTHER_TYPE, 'other'));
      await repository.get(OTHER_TYPE, 'other');

      mockCreatePreflight(createRawDoc(OTHER_TYPE, 'other'));
      client.index.mockResponseOnce(mockIndexResponse(OTHER_TYPE, 'other'));
      await repository.create(OTHER_TYPE, { title: 'new' }, { id: 'other', overwrite: true });
      expect(client.index.mock.calls[0][0]).not.toHaveProperty('if_seq_no');
      expect(client.index.mock.calls[0][0].document).not.toHaveProperty('acl');

      client.get.mockResponseOnce(createRawDoc(OTHER_TYPE, 'other'));
      client.index.mockResponseOnce(mockIndexResponse(OTHER_TYPE, 'other'));
      await repository.update(OTHER_TYPE, 'other', { title: 'changed' });

      client.get.mockResponseOnce(createRawDoc(OTHER_TYPE, 'other'));
      client.delete.mockResponseOnce({
        _id: `${OTHER_TYPE}:other`,
        _index: INDEX,
        result: 'deleted',
      } as estypes.DeleteResponse);
      await repository.delete(OTHER_TYPE, 'other');
      expect(client.delete.mock.calls[0][0]).not.toHaveProperty('if_seq_no');

      expectNoAclCalls();
    });
  });
});
