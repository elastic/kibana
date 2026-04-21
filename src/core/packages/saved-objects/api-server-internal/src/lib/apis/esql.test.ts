/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import type { SavedObjectsEsqlOptions } from '@kbn/core-saved-objects-api-server';
import type {
  SavedObjectsExtensions,
  ISavedObjectsSpacesExtension,
  ISavedObjectsSecurityExtension,
  ISavedObjectsEncryptionExtension,
  AuthorizationTypeMap,
} from '@kbn/core-saved-objects-server';
import { loggerMock } from '@kbn/logging-mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import { SavedObjectsRepository } from '../repository';
import { kibanaMigratorMock, savedObjectsExtensionsMock } from '../../mocks';
import {
  mappings,
  createRegistry,
  createDocumentMigrator,
  createSpySerializer,
} from '../../test_helpers/repository.test.common';

const EMPTY_ESQL_RESPONSE = {
  columns: [],
  values: [],
};

const MOCK_ESQL_RESPONSE = {
  columns: [
    { name: 'index-pattern.title', type: 'keyword' },
    { name: 'index-pattern.secret', type: 'keyword' },
    { name: 'type', type: 'keyword' },
  ],
  values: [
    ['my-pattern', 'secret-value', 'index-pattern'],
    ['other-pattern', 'other-secret', 'index-pattern'],
  ],
};

describe('esql', () => {
  let client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  let repository: SavedObjectsRepository;
  let extensions: SavedObjectsExtensions;
  let options: SavedObjectsEsqlOptions;

  const registry = createRegistry();
  const documentMigrator = createDocumentMigrator(registry);

  beforeEach(() => {
    client = elasticsearchClientMock.createElasticsearchClient();
    const migrator = kibanaMigratorMock.create();
    documentMigrator.prepareMigrations();
    migrator.migrateDocument = jest.fn().mockImplementation(documentMigrator.migrate);
    migrator.runMigrations = jest.fn().mockResolvedValue([{ status: 'skipped' }]);
    const logger = loggerMock.create();
    extensions = {};
    options = {
      type: 'index-pattern',
      namespaces: ['foo-namespace'],
      pipeline: '| LIMIT 10',
    };

    const serializer = createSpySerializer(registry);
    const allTypes = registry.getAllTypes().map((type) => type.name);
    const allowedTypes = [...new Set(allTypes.filter((type) => !registry.isHidden(type)))];

    // @ts-expect-error must use the private constructor to use the mocked serializer
    repository = new SavedObjectsRepository({
      index: '.kibana-test',
      mappings,
      client,
      migrator,
      typeRegistry: registry,
      serializer,
      allowedTypes,
      logger,
      extensions,
    });

    client.esql.query.mockResolvedValue(EMPTY_ESQL_RESPONSE as any);
  });

  it('should throw if options.namespaces is an empty array', async () => {
    await expect(repository.esql({ ...options, namespaces: [] })).rejects.toThrowError(
      'options.namespaces cannot be an empty array'
    );
    expect(client.esql.query).not.toHaveBeenCalled();
  });

  it('should return an empty response if no types are allowed', async () => {
    await expect(repository.esql({ ...options, type: 'unknownType' })).resolves.toEqual(
      EMPTY_ESQL_RESPONSE
    );
    expect(client.esql.query).not.toHaveBeenCalled();
  });

  it('should return an empty response for hidden types', async () => {
    await expect(repository.esql({ ...options, type: 'hiddenType' })).resolves.toEqual(
      EMPTY_ESQL_RESPONSE
    );
    expect(client.esql.query).not.toHaveBeenCalled();
  });

  it('should inject namespaces filter into the request', async () => {
    await repository.esql(options);

    expect(client.esql.query).toHaveBeenCalledTimes(1);
    const [[request]] = client.esql.query.mock.calls;
    expect(request.filter).toBeDefined();
    expect(request.filter).toHaveProperty('bool.must');
  });

  it('should auto-generate FROM clause from type and append pipeline', async () => {
    await repository.esql(options);

    expect(client.esql.query).toHaveBeenCalledTimes(1);
    const [[request]] = client.esql.query.mock.calls;
    // FROM clause is auto-generated from getIndicesForTypes, pipeline is appended
    expect(request.query).toMatch(/^FROM .+ \| LIMIT 10$/);
  });

  it('should include METADATA fields in FROM clause when specified', async () => {
    await repository.esql({ ...options, metadata: ['_id', '_source'] });

    expect(client.esql.query).toHaveBeenCalledTimes(1);
    const [[request]] = client.esql.query.mock.calls;
    expect(request.query).toMatch(/^FROM .+ METADATA _id, _source \| LIMIT 10$/);
  });

  it('should throw if pipeline starts with a source command', async () => {
    await expect(
      repository.esql({ ...options, pipeline: 'FROM .kibana | LIMIT 10' })
    ).rejects.toThrowError('options.pipeline must not start with a source command');

    await expect(repository.esql({ ...options, pipeline: 'ROW x = 1' })).rejects.toThrowError(
      'options.pipeline must not start with a source command'
    );

    await expect(repository.esql({ ...options, pipeline: 'SHOW INFO' })).rejects.toThrowError(
      'options.pipeline must not start with a source command'
    );

    await expect(repository.esql({ ...options, pipeline: 'METRICS index' })).rejects.toThrowError(
      'options.pipeline must not start with a source command'
    );

    expect(client.esql.query).not.toHaveBeenCalled();
  });

  it('should merge user-provided filter with namespace filter', async () => {
    const userFilter = { term: { 'index-pattern.title': 'my-pattern' } };
    await repository.esql({ ...options, filter: userFilter });

    expect(client.esql.query).toHaveBeenCalledTimes(1);
    const [[request]] = client.esql.query.mock.calls;
    const must = (request.filter as any).bool.must;
    expect(must).toHaveLength(2);
    // First element is the namespace bool filter, second is the user filter
    expect(must[1]).toEqual(userFilter);
  });

  it('should pass through esql options like params', async () => {
    await repository.esql({
      ...options,
      params: ['test'],
    });

    expect(client.esql.query).toHaveBeenCalledTimes(1);
    const [[request]] = client.esql.query.mock.calls;
    expect(request.query).toMatch(/^FROM .+ \| LIMIT 10$/);
    expect(request.params).toEqual(['test']);
  });

  describe('with spaces extension', () => {
    let spacesExtension: jest.Mocked<ISavedObjectsSpacesExtension>;

    beforeEach(() => {
      spacesExtension = savedObjectsExtensionsMock.createSpacesExtension();
      extensions.spacesExtension = spacesExtension;
    });

    it('should throw if getSearchableNamespaces fails with non-forbidden error', async () => {
      const someError = new Error('unexpected');
      spacesExtension.getSearchableNamespaces.mockRejectedValue(someError);

      await expect(repository.esql(options)).rejects.toBe(someError);
      expect(client.esql.query).not.toHaveBeenCalled();
    });

    it('should return empty response if forbidden to access searchable namespaces', async () => {
      spacesExtension.getSearchableNamespaces.mockRejectedValue(Boom.forbidden());

      await expect(repository.esql(options)).resolves.toEqual(EMPTY_ESQL_RESPONSE);
      expect(client.esql.query).not.toHaveBeenCalled();
    });

    it('should return empty response if no searchable namespaces', async () => {
      spacesExtension.getSearchableNamespaces.mockResolvedValue([]);

      await expect(repository.esql(options)).resolves.toEqual(EMPTY_ESQL_RESPONSE);
      expect(client.esql.query).not.toHaveBeenCalled();
    });
  });

  describe('with security extension', () => {
    let securityExtension: jest.Mocked<ISavedObjectsSecurityExtension>;

    beforeEach(() => {
      securityExtension = savedObjectsExtensionsMock.createSecurityExtension();
      extensions.securityExtension = securityExtension;
    });

    it('should return empty response if unauthorized', async () => {
      securityExtension.authorizeFind.mockResolvedValue({
        status: 'unauthorized',
        typeMap: new Map(),
      });

      await expect(repository.esql(options)).resolves.toEqual(EMPTY_ESQL_RESPONSE);
      expect(client.esql.query).not.toHaveBeenCalled();
    });

    it('should restrict types to authorized namespaces when partially authorized', async () => {
      securityExtension.authorizeFind.mockResolvedValue({
        status: 'partially_authorized',
        typeMap: new Map([
          ['index-pattern', { find: { authorizedSpaces: ['foo-namespace'] } }],
          ['config', { find: { isGloballyAuthorized: true } }],
        ]) as AuthorizationTypeMap<'find'>,
      });

      await repository.esql({
        ...options,
        type: ['index-pattern', 'config'],
        namespaces: ['foo-namespace', 'bar-namespace'],
      });

      expect(client.esql.query).toHaveBeenCalledTimes(1);
      const [[request]] = client.esql.query.mock.calls;
      expect(request.filter).toBeDefined();
    });
  });

  describe('encrypted attribute stripping', () => {
    let encryptionExtension: jest.Mocked<ISavedObjectsEncryptionExtension>;

    beforeEach(() => {
      encryptionExtension = savedObjectsExtensionsMock.createEncryptionExtension();
      extensions.encryptionExtension = encryptionExtension;
    });

    it('should replace encrypted column values with null', async () => {
      encryptionExtension.isEncryptableType.mockImplementation((type) => type === 'index-pattern');
      encryptionExtension.getEncryptedAttributes.mockReturnValue(new Set(['secret']));
      client.esql.query.mockResolvedValue(MOCK_ESQL_RESPONSE as any);

      const result = await repository.esql(options);

      expect(result.columns).toEqual(MOCK_ESQL_RESPONSE.columns);
      expect(result.values).toEqual([
        ['my-pattern', null, 'index-pattern'],
        ['other-pattern', null, 'index-pattern'],
      ]);
    });

    it('should not modify non-encrypted columns', async () => {
      encryptionExtension.isEncryptableType.mockReturnValue(false);
      client.esql.query.mockResolvedValue(MOCK_ESQL_RESPONSE as any);

      const result = await repository.esql(options);

      expect(result.values).toEqual(MOCK_ESQL_RESPONSE.values);
    });

    it('should skip post-processing if no types are encryptable', async () => {
      encryptionExtension.isEncryptableType.mockReturnValue(false);
      client.esql.query.mockResolvedValue(MOCK_ESQL_RESPONSE as any);

      const result = await repository.esql(options);

      // Should return the original response without modification
      expect(result).toBe(MOCK_ESQL_RESPONSE);
      expect(encryptionExtension.getEncryptedAttributes).not.toHaveBeenCalled();
    });

    it('should handle mixed-type queries with only some types encrypted', async () => {
      const mixedResponse = {
        columns: [
          { name: 'config.title', type: 'keyword' },
          { name: 'index-pattern.secret', type: 'keyword' },
          { name: 'type', type: 'keyword' },
        ],
        values: [
          ['config-title', 'secret-val', 'index-pattern'],
          ['other-config', 'other-secret', 'config'],
        ],
      };

      encryptionExtension.isEncryptableType.mockImplementation((type) => type === 'index-pattern');
      encryptionExtension.getEncryptedAttributes.mockImplementation((type) =>
        type === 'index-pattern' ? new Set(['secret']) : undefined
      );
      client.esql.query.mockResolvedValue(mixedResponse as any);

      const result = await repository.esql({
        ...options,
        type: ['index-pattern', 'config'],
      });

      expect(result.values).toEqual([
        ['config-title', null, 'index-pattern'],
        ['other-config', null, 'config'],
      ]);
    });
  });

  describe('_source decryption', () => {
    let encryptionExtension: jest.Mocked<ISavedObjectsEncryptionExtension>;

    beforeEach(() => {
      encryptionExtension = savedObjectsExtensionsMock.createEncryptionExtension();
      extensions.encryptionExtension = encryptionExtension;
    });

    it('should decrypt encrypted attributes in _source when _source and _id columns are present', async () => {
      const responseWithSource = {
        columns: [
          { name: '_id', type: 'keyword' },
          { name: '_source', type: '_source' },
        ],
        values: [
          [
            'doc-1',
            {
              type: 'index-pattern',
              namespaces: ['default'],
              'index-pattern': { title: 'my-pattern', secret: 'encrypted-blob' },
            },
          ],
        ],
      };

      encryptionExtension.isEncryptableType.mockImplementation((type) => type === 'index-pattern');
      encryptionExtension.getEncryptedAttributes.mockReturnValue(new Set(['secret']));
      encryptionExtension.decryptOrStripResponseAttributes.mockImplementation(async (object) => ({
        ...(object as any),
        attributes: {
          ...(object.attributes as Record<string, unknown>),
          secret: 'decrypted-value',
        },
      }));
      client.esql.query.mockResolvedValue(responseWithSource as any);

      const result = await repository.esql(options);

      expect(encryptionExtension.decryptOrStripResponseAttributes).toHaveBeenCalledTimes(1);
      const source = result.values[0][1] as unknown as Record<string, unknown>;
      const attrs = source['index-pattern'] as Record<string, unknown>;
      expect(attrs.secret).toBe('decrypted-value');
      expect(attrs.title).toBe('my-pattern');
    });

    it('should strip encrypted attributes in _source when decryption fails', async () => {
      const responseWithSource = {
        columns: [
          { name: '_id', type: 'keyword' },
          { name: '_source', type: '_source' },
        ],
        values: [
          [
            'doc-1',
            {
              type: 'index-pattern',
              namespaces: ['default'],
              'index-pattern': { title: 'my-pattern', secret: 'encrypted-blob' },
            },
          ],
        ],
      };

      encryptionExtension.isEncryptableType.mockImplementation((type) => type === 'index-pattern');
      encryptionExtension.getEncryptedAttributes.mockReturnValue(new Set(['secret']));
      // Simulate decryption failure: the extension strips the encrypted attribute
      encryptionExtension.decryptOrStripResponseAttributes.mockImplementation(async (object) => {
        const { secret: _stripped, ...remaining } = object.attributes as Record<string, unknown>;
        return {
          ...object,
          attributes: remaining,
          error: { statusCode: 500, error: 'Decryption error', message: 'AAD mismatch' },
        };
      });
      client.esql.query.mockResolvedValue(responseWithSource as any);

      const result = await repository.esql(options);

      const source = result.values[0][1] as unknown as Record<string, unknown>;
      const attrs = source['index-pattern'] as Record<string, unknown>;
      expect(attrs.secret).toBeUndefined();
      expect(attrs.title).toBe('my-pattern');
    });

    it('should not attempt _source decryption when _id column is missing', async () => {
      const responseWithSourceOnly = {
        columns: [{ name: '_source', type: '_source' }],
        values: [
          [
            {
              type: 'index-pattern',
              'index-pattern': { title: 'my-pattern', secret: 'encrypted-blob' },
            },
          ],
        ],
      };

      encryptionExtension.isEncryptableType.mockImplementation((type) => type === 'index-pattern');
      encryptionExtension.getEncryptedAttributes.mockReturnValue(new Set(['secret']));
      client.esql.query.mockResolvedValue(responseWithSourceOnly as any);

      await repository.esql(options);

      expect(encryptionExtension.decryptOrStripResponseAttributes).not.toHaveBeenCalled();
    });

    it('should not attempt _source decryption when _source column is missing', async () => {
      encryptionExtension.isEncryptableType.mockReturnValue(true);
      encryptionExtension.getEncryptedAttributes.mockReturnValue(new Set(['secret']));
      client.esql.query.mockResolvedValue(MOCK_ESQL_RESPONSE as any);

      await repository.esql(options);

      expect(encryptionExtension.decryptOrStripResponseAttributes).not.toHaveBeenCalled();
    });
  });
});
