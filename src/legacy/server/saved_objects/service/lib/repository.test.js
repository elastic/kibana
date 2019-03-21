/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { delay } from 'bluebird';
import { SavedObjectsRepository } from './repository';
import * as getSearchDslNS from './search_dsl/search_dsl';
import * as errors from './errors';
import elasticsearch from 'elasticsearch';
import { SavedObjectsSchema } from '../../schema';
import { SavedObjectsSerializer } from '../../serialization';
import { getRootPropertiesObjects } from '../../../mappings/lib/get_root_properties_objects';
import { encodeHitVersion } from '../../version';

jest.mock('./search_dsl/search_dsl', () => ({ getSearchDsl: jest.fn() }));

// BEWARE: The SavedObjectClient depends on the implementation details of the SavedObjectsRepository
// so any breaking changes to this repository are considered breaking changes to the SavedObjectsClient.

describe('SavedObjectsRepository', () => {
  let callAdminCluster;
  let onBeforeWrite;
  let savedObjectsRepository;
  let migrator;
  const mockTimestamp = '2017-08-14T15:49:14.886Z';
  const mockTimestampFields = { updated_at: mockTimestamp };
  const mockVersionProps = { _seq_no: 1, _primary_term: 1 };
  const mockVersion = encodeHitVersion(mockVersionProps);
  const noNamespaceSearchResults = {
    hits: {
      total: 4,
      hits: [
        {
          _index: '.kibana',
          _type: '_doc',
          _id: 'index-pattern:logstash-*',
          _score: 1,
          ...mockVersionProps,
          _source: {
            type: 'index-pattern',
            ...mockTimestampFields,
            'index-pattern': {
              title: 'logstash-*',
              timeFieldName: '@timestamp',
              notExpandable: true,
            },
          },
        },
        {
          _index: '.kibana',
          _type: '_doc',
          _id: 'config:6.0.0-alpha1',
          _score: 1,
          ...mockVersionProps,
          _source: {
            type: 'config',
            ...mockTimestampFields,
            config: {
              buildNum: 8467,
              defaultIndex: 'logstash-*',
            },
          },
        },
        {
          _index: '.kibana',
          _type: '_doc',
          _id: 'index-pattern:stocks-*',
          _score: 1,
          ...mockVersionProps,
          _source: {
            type: 'index-pattern',
            ...mockTimestampFields,
            'index-pattern': {
              title: 'stocks-*',
              timeFieldName: '@timestamp',
              notExpandable: true,
            },
          },
        },
        {
          _index: '.kibana',
          _type: '_doc',
          _id: 'globaltype:something',
          _score: 1,
          ...mockVersionProps,
          _source: {
            type: 'globaltype',
            ...mockTimestampFields,
            globaltype: {
              name: 'bar',
            },
          },
        },
      ],
    },
  };

  const namespacedSearchResults = {
    hits: {
      total: 4,
      hits: [
        {
          _index: '.kibana',
          _type: '_doc',
          _id: 'foo-namespace:index-pattern:logstash-*',
          _score: 1,
          ...mockVersionProps,
          _source: {
            namespace: 'foo-namespace',
            type: 'index-pattern',
            ...mockTimestampFields,
            'index-pattern': {
              title: 'logstash-*',
              timeFieldName: '@timestamp',
              notExpandable: true,
            },
          },
        },
        {
          _index: '.kibana',
          _type: '_doc',
          _id: 'foo-namespace:config:6.0.0-alpha1',
          _score: 1,
          ...mockVersionProps,
          _source: {
            namespace: 'foo-namespace',
            type: 'config',
            ...mockTimestampFields,
            config: {
              buildNum: 8467,
              defaultIndex: 'logstash-*',
            },
          },
        },
        {
          _index: '.kibana',
          _type: '_doc',
          _id: 'foo-namespace:index-pattern:stocks-*',
          _score: 1,
          ...mockVersionProps,
          _source: {
            namespace: 'foo-namespace',
            type: 'index-pattern',
            ...mockTimestampFields,
            'index-pattern': {
              title: 'stocks-*',
              timeFieldName: '@timestamp',
              notExpandable: true,
            },
          },
        },
        {
          _index: '.kibana',
          _type: '_doc',
          _id: 'globaltype:something',
          _score: 1,
          ...mockVersionProps,
          _source: {
            type: 'globaltype',
            ...mockTimestampFields,
            globaltype: {
              name: 'bar',
            },
          },
        },
      ],
    },
  };

  const deleteByQueryResults = {
    took: 27,
    timed_out: false,
    total: 23,
    deleted: 23,
    batches: 1,
    version_conflicts: 0,
    noops: 0,
    retries: { bulk: 0, search: 0 },
    throttled_millis: 0,
    requests_per_second: -1,
    throttled_until_millis: 0,
    failures: [],
  };

  const mappings = {
    properties: {
      config: {
        properties: {
          type: 'keyword',
        },
      },
      foo: {
        properties: {
          type: 'keyword',
        },
      },
      bar: {
        properties: {
          type: 'keyword',
        },
      },
      'index-pattern': {
        properties: {
          someField: {
            type: 'keyword',
          },
        },
      },
      dashboard: {
        properties: {
          otherField: {
            type: 'keyword',
          },
        },
      },
      globaltype: {
        properties: {
          yetAnotherField: {
            type: 'keyword',
          },
        },
      },
      hiddenType: {
        properties: {
          someField: {
            type: 'keyword',
          },
        },
      },
    },
  };

  const schema = new SavedObjectsSchema({
    globaltype: { isNamespaceAgnostic: true },
    foo: { isNamespaceAgnostic: true },
    bar: { isNamespaceAgnostic: true },
    hiddenType: { isNamespaceAgnostic: true, hidden: true },
  });

  beforeEach(() => {
    callAdminCluster = jest.fn();
    onBeforeWrite = jest.fn();
    migrator = {
      migrateDocument: jest.fn(doc => doc),
      awaitMigration: async () => ({ status: 'skipped' }),
    };

    const serializer = new SavedObjectsSerializer(schema);
    const allTypes = Object.keys(getRootPropertiesObjects(mappings));
    const allowedTypes = [...new Set(allTypes.filter(type => !schema.isHiddenType(type)))];

    savedObjectsRepository = new SavedObjectsRepository({
      index: '.kibana-test',
      mappings,
      callCluster: callAdminCluster,
      migrator,
      schema,
      serializer,
      allowedTypes,
      onBeforeWrite,
    });

    savedObjectsRepository._getCurrentTime = jest.fn(() => mockTimestamp);
    getSearchDslNS.getSearchDsl.mockReset();
  });

  afterEach(() => {});

  describe('#create', () => {
    beforeEach(() => {
      callAdminCluster.mockImplementation((method, params) => ({
        _type: '_doc',
        _id: params.id,
        ...mockVersionProps,
      }));
    });

    it('waits until migrations are complete before proceeding', async () => {
      migrator.awaitMigration = jest.fn(async () =>
        expect(callAdminCluster).not.toHaveBeenCalled()
      );

      await expect(
        savedObjectsRepository.create(
          'index-pattern',
          {
            title: 'Logstash',
          },
          {
            id: 'logstash-*',
            namespace: 'foo-namespace',
          }
        )
      ).resolves.toBeDefined();
      expect(migrator.awaitMigration).toHaveBeenCalledTimes(1);
    });

    it('formats Elasticsearch response', async () => {
      const response = await savedObjectsRepository.create(
        'index-pattern',
        {
          title: 'Logstash',
        },
        {
          id: 'logstash-*',
          namespace: 'foo-namespace',
          references: [
            {
              name: 'ref_0',
              type: 'test',
              id: '123',
            },
          ],
        }
      );

      expect(response).toEqual({
        type: 'index-pattern',
        id: 'logstash-*',
        ...mockTimestampFields,
        version: mockVersion,
        attributes: {
          title: 'Logstash',
        },
        references: [
          {
            name: 'ref_0',
            type: 'test',
            id: '123',
          },
        ],
      });
    });

    it('should use ES index action', async () => {
      await savedObjectsRepository.create('index-pattern', {
        id: 'logstash-*',
        title: 'Logstash',
      });

      expect(callAdminCluster).toHaveBeenCalledTimes(1);
      expect(callAdminCluster).toHaveBeenCalledWith('index', expect.any(Object));
      expect(onBeforeWrite).toHaveBeenCalledTimes(1);
    });

    it('migrates the doc', async () => {
      migrator.migrateDocument = doc => {
        doc.attributes.title = doc.attributes.title + '!!';
        doc.migrationVersion = { foo: '2.3.4' };
        doc.references = [{ name: 'search_0', type: 'search', id: '123' }];
        return doc;
      };

      await savedObjectsRepository.create('index-pattern', {
        id: 'logstash-*',
        title: 'Logstash',
      });

      expect(callAdminCluster).toHaveBeenCalledTimes(1);
      expect(callAdminCluster.mock.calls[0][1]).toMatchObject({
        body: {
          'index-pattern': { id: 'logstash-*', title: 'Logstash!!' },
          migrationVersion: { foo: '2.3.4' },
          type: 'index-pattern',
          updated_at: '2017-08-14T15:49:14.886Z',
          references: [{ name: 'search_0', type: 'search', id: '123' }],
        },
      });
    });

    it('should use create action if ID defined and overwrite=false', async () => {
      await savedObjectsRepository.create(
        'index-pattern',
        {
          title: 'Logstash',
        },
        {
          id: 'logstash-*',
        }
      );

      expect(callAdminCluster).toHaveBeenCalledTimes(1);
      expect(callAdminCluster).toHaveBeenCalledWith('create', expect.any(Object));
      expect(onBeforeWrite).toHaveBeenCalledTimes(1);
    });

    it('allows for id to be provided', async () => {
      await savedObjectsRepository.create(
        'index-pattern',
        {
          title: 'Logstash',
        },
        { id: 'logstash-*' }
      );

      expect(callAdminCluster).toHaveBeenCalledTimes(1);
      expect(callAdminCluster).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          id: 'index-pattern:logstash-*',
        })
      );

      expect(onBeforeWrite).toHaveBeenCalledTimes(1);
    });

    it('self-generates an ID', async () => {
      await savedObjectsRepository.create('index-pattern', {
        title: 'Logstash',
      });

      expect(callAdminCluster).toHaveBeenCalledTimes(1);
      expect(callAdminCluster).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          id: expect.objectContaining(/index-pattern:[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/),
        })
      );

      expect(onBeforeWrite).toHaveBeenCalledTimes(1);
    });

    it('prepends namespace to the id and adds namespace to body when providing namespace for namespaced type', async () => {
      await savedObjectsRepository.create(
        'index-pattern',
        {
          title: 'Logstash',
        },
        {
          id: 'foo-id',
          namespace: 'foo-namespace',
        }
      );
      expect(callAdminCluster).toHaveBeenCalledTimes(1);
      expect(callAdminCluster).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          id: `foo-namespace:index-pattern:foo-id`,
          body: expect.objectContaining({
            [`index-pattern`]: { title: 'Logstash' },
            namespace: 'foo-namespace',
            type: 'index-pattern',
            updated_at: '2017-08-14T15:49:14.886Z',
          }),
        })
      );
      expect(onBeforeWrite).toHaveBeenCalledTimes(1);
    });

    it(`doesn't prepend namespace to the id or add namespace property when providing no namespace for namespaced type`, async () => {
      await savedObjectsRepository.create(
        'index-pattern',
        {
          title: 'Logstash',
        },
        {
          id: 'foo-id',
        }
      );
      expect(callAdminCluster).toHaveBeenCalledTimes(1);
      expect(callAdminCluster).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          id: `index-pattern:foo-id`,
          body: expect.objectContaining({
            [`index-pattern`]: { title: 'Logstash' },
            type: 'index-pattern',
            updated_at: '2017-08-14T15:49:14.886Z',
          }),
        })
      );
      expect(onBeforeWrite).toHaveBeenCalledTimes(1);
    });

    it(`doesn't prepend namespace to the id or add namespace property when providing namespace for namespace agnostic type`, async () => {
      await savedObjectsRepository.create(
        'globaltype',
        {
          title: 'Logstash',
        },
        {
          id: 'foo-id',
          namespace: 'foo-namespace',
        }
      );
      expect(callAdminCluster).toHaveBeenCalledTimes(1);
      expect(callAdminCluster).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          id: `globaltype:foo-id`,
          body: expect.objectContaining({
            [`globaltype`]: { title: 'Logstash' },
            type: 'globaltype',
            updated_at: '2017-08-14T15:49:14.886Z',
          }),
        })
      );
      expect(onBeforeWrite).toHaveBeenCalledTimes(1);
    });
  });

  describe('#bulkCreate', () => {
    it('waits until migrations are complete before proceeding', async () => {
      migrator.awaitMigration = jest.fn(async () =>
        expect(callAdminCluster).not.toHaveBeenCalled()
      );
      callAdminCluster.mockReturnValue({
        items: [
          { create: { type: 'config', id: 'config:one', _primary_term: 1, _seq_no: 1 } },
          {
            create: {
              type: 'index-pattern',
              id: 'index-pattern:two',
              _primary_term: 1,
              _seq_no: 1,
            },
          },
        ],
      });

      await expect(
        savedObjectsRepository.bulkCreate([
          { type: 'config', id: 'one', attributes: { title: 'Test One' } },
          { type: 'index-pattern', id: 'two', attributes: { title: 'Test Two' } },
        ])
      ).resolves.toBeDefined();

      expect(migrator.awaitMigration).toHaveBeenCalledTimes(1);
    });

    it('formats Elasticsearch request', async () => {
      callAdminCluster.mockReturnValue({
        items: [
          { create: { type: 'config', id: 'config:one', _primary_term: 1, _seq_no: 1 } },
          { create: { type: 'index-pattern', id: 'config:two', _primary_term: 1, _seq_no: 1 } },
        ],
      });

      await savedObjectsRepository.bulkCreate([
        {
          type: 'config',
          id: 'one',
          attributes: { title: 'Test One' },
          references: [{ name: 'ref_0', type: 'test', id: '1' }],
        },
        {
          type: 'index-pattern',
          id: 'two',
          attributes: { title: 'Test Two' },
          references: [{ name: 'ref_0', type: 'test', id: '2' }],
        },
      ]);

      expect(callAdminCluster).toHaveBeenCalledTimes(1);
      const bulkCalls = callAdminCluster.mock.calls.filter(([path]) => path === 'bulk');

      expect(bulkCalls.length).toEqual(1);

      expect(bulkCalls[0][1].body).toEqual([
        { create: { _id: 'config:one' } },
        {
          type: 'config',
          ...mockTimestampFields,
          config: { title: 'Test One' },
          references: [{ name: 'ref_0', type: 'test', id: '1' }],
        },
        { create: { _id: 'index-pattern:two' } },
        {
          type: 'index-pattern',
          ...mockTimestampFields,
          'index-pattern': { title: 'Test Two' },
          references: [{ name: 'ref_0', type: 'test', id: '2' }],
        },
      ]);

      expect(onBeforeWrite).toHaveBeenCalledTimes(1);
    });

    it('migrates the docs', async () => {
      callAdminCluster.mockReturnValue({
        items: [
          {
            create: {
              error: false,
              _id: '1',
              _seq_no: 1,
              _primary_term: 1,
            },
          },
          {
            create: {
              error: false,
              _id: '2',
              _seq_no: 1,
              _primary_term: 1,
            },
          },
        ],
      });

      migrator.migrateDocument = doc => {
        doc.attributes.title = doc.attributes.title + '!!';
        doc.migrationVersion = { foo: '2.3.4' };
        doc.references = [{ name: 'search_0', type: 'search', id: '123' }];
        return doc;
      };

      const bulkCreateResp = await savedObjectsRepository.bulkCreate([
        { type: 'config', id: 'one', attributes: { title: 'Test One' } },
        { type: 'index-pattern', id: 'two', attributes: { title: 'Test Two' } },
      ]);

      expect(callAdminCluster).toHaveBeenCalledWith(
        'bulk',
        expect.objectContaining({
          body: [
            { create: { _id: 'config:one' } },
            {
              type: 'config',
              ...mockTimestampFields,
              config: { title: 'Test One!!' },
              migrationVersion: { foo: '2.3.4' },
              references: [{ name: 'search_0', type: 'search', id: '123' }],
            },
            { create: { _id: 'index-pattern:two' } },
            {
              type: 'index-pattern',
              ...mockTimestampFields,
              'index-pattern': { title: 'Test Two!!' },
              migrationVersion: { foo: '2.3.4' },
              references: [{ name: 'search_0', type: 'search', id: '123' }],
            },
          ],
        })
      );

      expect(bulkCreateResp).toEqual({
        saved_objects: [
          {
            id: 'one',
            type: 'config',
            version: mockVersion,
            updated_at: mockTimestamp,
            attributes: {
              title: 'Test One!!',
            },
            references: [{ name: 'search_0', type: 'search', id: '123' }],
          },
          {
            id: 'two',
            type: 'index-pattern',
            version: mockVersion,
            updated_at: mockTimestamp,
            attributes: {
              title: 'Test Two!!',
            },
            references: [{ name: 'search_0', type: 'search', id: '123' }],
          },
        ],
      });
    });

    it('should overwrite objects if overwrite is truthy', async () => {
      callAdminCluster.mockReturnValue({
        items: [{ create: { type: 'foo', id: 'bar', _primary_term: 1, _seq_no: 1 } }],
      });

      await savedObjectsRepository.bulkCreate([{ type: 'foo', id: 'bar', attributes: {} }], {
        overwrite: false,
      });
      expect(callAdminCluster).toHaveBeenCalledTimes(1);
      expect(callAdminCluster).toHaveBeenCalledWith(
        'bulk',
        expect.objectContaining({
          body: [
            // uses create because overwriting is not allowed
            { create: { _id: 'foo:bar' } },
            { type: 'foo', ...mockTimestampFields, foo: {}, references: [] },
          ],
        })
      );

      expect(onBeforeWrite).toHaveBeenCalledTimes(1);

      callAdminCluster.mockReset();
      onBeforeWrite.mockReset();

      callAdminCluster.mockReturnValue({
        items: [{ create: { type: 'foo', id: 'bar', _primary_term: 1, _seq_no: 1 } }],
      });

      await savedObjectsRepository.bulkCreate([{ type: 'foo', id: 'bar', attributes: {} }], {
        overwrite: true,
      });
      expect(callAdminCluster).toHaveBeenCalledTimes(1);
      expect(callAdminCluster).toHaveBeenCalledWith(
        'bulk',
        expect.objectContaining({
          body: [
            // uses index because overwriting is allowed
            { index: { _id: 'foo:bar' } },
            { type: 'foo', ...mockTimestampFields, foo: {}, references: [] },
          ],
        })
      );

      expect(onBeforeWrite).toHaveBeenCalledTimes(1);
    });

    it('mockReturnValue document errors', async () => {
      callAdminCluster.mockResolvedValue({
        errors: false,
        items: [
          {
            create: {
              _type: '_doc',
              _id: 'config:one',
              error: {
                reason: 'type[config] missing',
              },
            },
          },
          {
            create: {
              _type: '_doc',
              _id: 'index-pattern:two',
              ...mockVersionProps,
            },
          },
        ],
      });

      const response = await savedObjectsRepository.bulkCreate([
        { type: 'config', id: 'one', attributes: { title: 'Test One' } },
        { type: 'index-pattern', id: 'two', attributes: { title: 'Test Two' } },
      ]);

      expect(response).toEqual({
        saved_objects: [
          {
            id: 'one',
            type: 'config',
            error: { message: 'type[config] missing' },
          },
          {
            id: 'two',
            type: 'index-pattern',
            version: mockVersion,
            ...mockTimestampFields,
            attributes: { title: 'Test Two' },
            references: [],
          },
        ],
      });
    });

    it('formats Elasticsearch response', async () => {
      callAdminCluster.mockResolvedValue({
        errors: false,
        items: [
          {
            create: {
              _type: '_doc',
              _id: 'config:one',
              ...mockVersionProps,
            },
          },
          {
            create: {
              _type: '_doc',
              _id: 'index-pattern:two',
              ...mockVersionProps,
            },
          },
        ],
      });

      const response = await savedObjectsRepository.bulkCreate(
        [
          { type: 'config', id: 'one', attributes: { title: 'Test One' } },
          { type: 'index-pattern', id: 'two', attributes: { title: 'Test Two' } },
        ],
        {
          namespace: 'foo-namespace',
        }
      );

      expect(response).toEqual({
        saved_objects: [
          {
            id: 'one',
            type: 'config',
            version: mockVersion,
            ...mockTimestampFields,
            attributes: { title: 'Test One' },
            references: [],
          },
          {
            id: 'two',
            type: 'index-pattern',
            version: mockVersion,
            ...mockTimestampFields,
            attributes: { title: 'Test Two' },
            references: [],
          },
        ],
      });
    });

    it('prepends namespace to the id and adds namespace to body when providing namespace for namespaced type', async () => {
      callAdminCluster.mockReturnValue({
        items: [
          {
            create: {
              _type: '_doc',
              _id: 'foo-namespace:config:one',
              _primary_term: 1,
              _seq_no: 2,
            },
          },
          {
            create: {
              _type: '_doc',
              _id: 'foo-namespace:index-pattern:two',
              _primary_term: 1,
              _seq_no: 2,
            },
          },
        ],
      });
      await savedObjectsRepository.bulkCreate(
        [
          { type: 'config', id: 'one', attributes: { title: 'Test One' } },
          { type: 'index-pattern', id: 'two', attributes: { title: 'Test Two' } },
        ],
        {
          namespace: 'foo-namespace',
        }
      );
      expect(callAdminCluster).toHaveBeenCalledTimes(1);
      expect(callAdminCluster).toHaveBeenCalledWith(
        'bulk',
        expect.objectContaining({
          body: [
            { create: { _id: 'foo-namespace:config:one' } },
            {
              namespace: 'foo-namespace',
              type: 'config',
              ...mockTimestampFields,
              config: { title: 'Test One' },
              references: [],
            },
            { create: { _id: 'foo-namespace:index-pattern:two' } },
            {
              namespace: 'foo-namespace',
              type: 'index-pattern',
              ...mockTimestampFields,
              'index-pattern': { title: 'Test Two' },
              references: [],
            },
          ],
        })
      );
      expect(onBeforeWrite).toHaveBeenCalledTimes(1);
    });

    it(`doesn't prepend namespace to the id or add namespace property when providing no namespace for namespaced type`, async () => {
      callAdminCluster.mockResolvedValue({
        errors: false,
        items: [
          {
            create: {
              _type: '_doc',
              _id: 'config:one',
              ...mockVersionProps,
            },
          },
          {
            create: {
              _type: '_doc',
              _id: 'index-pattern:two',
              ...mockVersionProps,
            },
          },
        ],
      });
      await savedObjectsRepository.bulkCreate([
        { type: 'config', id: 'one', attributes: { title: 'Test One' } },
        { type: 'index-pattern', id: 'two', attributes: { title: 'Test Two' } },
      ]);
      expect(callAdminCluster).toHaveBeenCalledTimes(1);
      expect(callAdminCluster).toHaveBeenCalledWith(
        'bulk',
        expect.objectContaining({
          body: [
            { create: { _id: 'config:one' } },
            {
              type: 'config',
              ...mockTimestampFields,
              config: { title: 'Test One' },
              references: [],
            },
            { create: { _id: 'index-pattern:two' } },
            {
              type: 'index-pattern',
              ...mockTimestampFields,
              'index-pattern': { title: 'Test Two' },
              references: [],
            },
          ],
        })
      );
      expect(onBeforeWrite).toHaveBeenCalledTimes(1);
    });

    it(`doesn't prepend namespace to the id or add namespace property when providing namespace for namespace agnostic type`, async () => {
      callAdminCluster.mockReturnValue({
        items: [{ create: { _type: '_doc', _id: 'globaltype:one', _primary_term: 1, _seq_no: 2 } }],
      });
      await savedObjectsRepository.bulkCreate(
        [{ type: 'globaltype', id: 'one', attributes: { title: 'Test One' } }],
        {
          namespace: 'foo-namespace',
        }
      );
      expect(callAdminCluster).toHaveBeenCalledTimes(1);
      expect(callAdminCluster).toHaveBeenCalledWith(
        'bulk',
        expect.objectContaining({
          body: [
            { create: { _id: 'globaltype:one' } },
            {
              type: 'globaltype',
              ...mockTimestampFields,
              globaltype: { title: 'Test One' },
              references: [],
            },
          ],
        })
      );
      expect(onBeforeWrite).toHaveBeenCalledTimes(1);
    });

    it('should return objects in the same order regardless of type', () => {});
  });

  describe('#delete', () => {
    it('waits until migrations are complete before proceeding', async () => {
      migrator.awaitMigration = jest.fn(async () =>
        expect(callAdminCluster).not.toHaveBeenCalled()
      );
      callAdminCluster.mockReturnValue({ result: 'deleted' });
      await expect(
        savedObjectsRepository.delete('index-pattern', 'logstash-*', {
          namespace: 'foo-namespace',
        })
      ).resolves.toBeDefined();

      expect(migrator.awaitMigration).toHaveBeenCalledTimes(1);
    });

    it('throws notFound when ES is unable to find the document', async () => {
      expect.assertions(1);

      callAdminCluster.mockResolvedValue({ result: 'not_found' });

      try {
        await savedObjectsRepository.delete('index-pattern', 'logstash-*');
      } catch (e) {
        expect(e.output.statusCode).toEqual(404);
      }
    });

    it(`prepends namespace to the id when providing namespace for namespaced type`, async () => {
      callAdminCluster.mockReturnValue({ result: 'deleted' });
      await savedObjectsRepository.delete('index-pattern', 'logstash-*', {
        namespace: 'foo-namespace',
      });

      expect(callAdminCluster).toHaveBeenCalledTimes(1);
      expect(callAdminCluster).toHaveBeenCalledWith('delete', {
        id: 'foo-namespace:index-pattern:logstash-*',
        refresh: 'wait_for',
        index: '.kibana-test',
        ignore: [404],
      });

      expect(onBeforeWrite).toHaveBeenCalledTimes(1);
    });

    it(`doesn't prepend namespace to the id when providing no namespace for namespaced type`, async () => {
      callAdminCluster.mockReturnValue({ result: 'deleted' });
      await savedObjectsRepository.delete('index-pattern', 'logstash-*');

      expect(callAdminCluster).toHaveBeenCalledTimes(1);
      expect(callAdminCluster).toHaveBeenCalledWith('delete', {
        id: 'index-pattern:logstash-*',
        refresh: 'wait_for',
        index: '.kibana-test',
        ignore: [404],
      });

      expect(onBeforeWrite).toHaveBeenCalledTimes(1);
    });

    it(`doesn't prepend namespace to the id when providing namespace for namespace agnostic type`, async () => {
      callAdminCluster.mockReturnValue({ result: 'deleted' });
      await savedObjectsRepository.delete('globaltype', 'logstash-*', {
        namespace: 'foo-namespace',
      });

      expect(callAdminCluster).toHaveBeenCalledTimes(1);
      expect(callAdminCluster).toHaveBeenCalledWith('delete', {
        id: 'globaltype:logstash-*',
        refresh: 'wait_for',
        index: '.kibana-test',
        ignore: [404],
      });

      expect(onBeforeWrite).toHaveBeenCalledTimes(1);
    });
  });

  describe('#deleteByNamespace', () => {
    it('requires namespace to be defined', async () => {
      callAdminCluster.mockReturnValue(deleteByQueryResults);
      expect(savedObjectsRepository.deleteByNamespace()).rejects.toThrowErrorMatchingSnapshot();
      expect(callAdminCluster).not.toHaveBeenCalled();
      expect(onBeforeWrite).not.toHaveBeenCalled();
    });

    it('requires namespace to be a string', async () => {
      callAdminCluster.mockReturnValue(deleteByQueryResults);
      expect(
        savedObjectsRepository.deleteByNamespace(['namespace-1', 'namespace-2'])
      ).rejects.toThrowErrorMatchingSnapshot();
      expect(callAdminCluster).not.toHaveBeenCalled();
      expect(onBeforeWrite).not.toHaveBeenCalled();
    });

    it('constructs a deleteByQuery call using all types that are namespace aware', async () => {
      callAdminCluster.mockReturnValue(deleteByQueryResults);
      const result = await savedObjectsRepository.deleteByNamespace('my-namespace');

      expect(result).toEqual(deleteByQueryResults);
      expect(callAdminCluster).toHaveBeenCalledTimes(1);
      expect(onBeforeWrite).toHaveBeenCalledTimes(1);

      expect(getSearchDslNS.getSearchDsl).toHaveBeenCalledWith(mappings, schema, {
        namespace: 'my-namespace',
        type: ['config', 'index-pattern', 'dashboard'],
      });

      expect(callAdminCluster).toHaveBeenCalledWith('deleteByQuery', {
        body: { conflicts: 'proceed' },
        ignore: [404],
        index: '.kibana-test',
        refresh: 'wait_for',
      });
    });
  });

  describe('#find', () => {
    it('waits until migrations are complete before proceeding', async () => {
      migrator.awaitMigration = jest.fn(async () =>
        expect(callAdminCluster).not.toHaveBeenCalled()
      );

      callAdminCluster.mockReturnValue(noNamespaceSearchResults);
      await expect(savedObjectsRepository.find({ type: 'foo' })).resolves.toBeDefined();

      expect(migrator.awaitMigration).toHaveBeenCalledTimes(1);
    });

    it('requires type to be defined', async () => {
      await expect(savedObjectsRepository.find({})).rejects.toThrow(/options\.type must be/);
      expect(callAdminCluster).not.toHaveBeenCalled();
      expect(onBeforeWrite).not.toHaveBeenCalled();
    });

    it('requires searchFields be an array if defined', async () => {
      callAdminCluster.mockReturnValue(noNamespaceSearchResults);
      try {
        await savedObjectsRepository.find({ type: 'foo', searchFields: 'string' });
        throw new Error('expected find() to reject');
      } catch (error) {
        expect(callAdminCluster).not.toHaveBeenCalled();
        expect(onBeforeWrite).not.toHaveBeenCalled();
        expect(error.message).toMatch('must be an array');
      }
    });

    it('requires fields be an array if defined', async () => {
      callAdminCluster.mockReturnValue(noNamespaceSearchResults);
      try {
        await savedObjectsRepository.find({ type: 'foo', fields: 'string' });
        throw new Error('expected find() to reject');
      } catch (error) {
        expect(callAdminCluster).not.toHaveBeenCalled();
        expect(onBeforeWrite).not.toHaveBeenCalled();
        expect(error.message).toMatch('must be an array');
      }
    });

    it('passes mappings, schema, search, defaultSearchOperator, searchFields, type, sortField, sortOrder and hasReference to getSearchDsl', async () => {
      callAdminCluster.mockReturnValue(namespacedSearchResults);
      const relevantOpts = {
        namespace: 'foo-namespace',
        search: 'foo*',
        searchFields: ['foo'],
        type: 'bar',
        sortField: 'name',
        sortOrder: 'desc',
        defaultSearchOperator: 'AND',
        hasReference: {
          type: 'foo',
          id: '1',
        },
      };

      await savedObjectsRepository.find(relevantOpts);
      expect(getSearchDslNS.getSearchDsl).toHaveBeenCalledTimes(1);
      expect(getSearchDslNS.getSearchDsl).toHaveBeenCalledWith(mappings, schema, relevantOpts);
    });

    it('merges output of getSearchDsl into es request body', async () => {
      callAdminCluster.mockReturnValue(noNamespaceSearchResults);
      getSearchDslNS.getSearchDsl.mockReturnValue({ query: 1, aggregations: 2 });
      await savedObjectsRepository.find({ type: 'foo' });
      expect(callAdminCluster).toHaveBeenCalledTimes(1);
      expect(onBeforeWrite).not.toHaveBeenCalled();
      expect(callAdminCluster).toHaveBeenCalledWith(
        'search',
        expect.objectContaining({
          body: expect.objectContaining({
            query: 1,
            aggregations: 2,
          }),
        })
      );
    });

    it('formats Elasticsearch response when there is no namespace', async () => {
      callAdminCluster.mockReturnValue(noNamespaceSearchResults);
      const count = noNamespaceSearchResults.hits.hits.length;

      const response = await savedObjectsRepository.find({ type: 'foo' });

      expect(response.total).toBe(count);
      expect(response.saved_objects).toHaveLength(count);

      noNamespaceSearchResults.hits.hits.forEach((doc, i) => {
        expect(response.saved_objects[i]).toEqual({
          id: doc._id.replace(/(index-pattern|config|globaltype)\:/, ''),
          type: doc._source.type,
          ...mockTimestampFields,
          version: mockVersion,
          attributes: doc._source[doc._source.type],
          references: [],
        });
      });
    });

    it('formats Elasticsearch response when there is a namespace', async () => {
      callAdminCluster.mockReturnValue(namespacedSearchResults);
      const count = namespacedSearchResults.hits.hits.length;

      const response = await savedObjectsRepository.find({
        type: 'foo',
        namespace: 'foo-namespace',
      });

      expect(response.total).toBe(count);
      expect(response.saved_objects).toHaveLength(count);

      namespacedSearchResults.hits.hits.forEach((doc, i) => {
        expect(response.saved_objects[i]).toEqual({
          id: doc._id.replace(/(foo-namespace\:)?(index-pattern|config|globaltype)\:/, ''),
          type: doc._source.type,
          ...mockTimestampFields,
          version: mockVersion,
          attributes: doc._source[doc._source.type],
          references: [],
        });
      });
    });

    it('accepts per_page/page', async () => {
      callAdminCluster.mockReturnValue(noNamespaceSearchResults);
      await savedObjectsRepository.find({ type: 'foo', perPage: 10, page: 6 });

      expect(callAdminCluster).toHaveBeenCalledTimes(1);
      expect(callAdminCluster).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          size: 10,
          from: 50,
        })
      );

      expect(onBeforeWrite).not.toHaveBeenCalled();
    });

    it('can filter by fields', async () => {
      callAdminCluster.mockReturnValue(noNamespaceSearchResults);
      await savedObjectsRepository.find({ type: 'foo', fields: ['title'] });

      expect(callAdminCluster).toHaveBeenCalledTimes(1);
      expect(callAdminCluster).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          _source: ['foo.title', 'namespace', 'type', 'title'],
        })
      );

      expect(onBeforeWrite).not.toHaveBeenCalled();
    });

    it('should set rest_total_hits_as_int to true on a request', async () => {
      callAdminCluster.mockReturnValue(noNamespaceSearchResults);
      await savedObjectsRepository.find({ type: 'foo' });
      expect(callAdminCluster).toHaveBeenCalledTimes(1);
      expect(callAdminCluster.mock.calls[0][1]).toHaveProperty('rest_total_hits_as_int', true);
    });
  });

  describe('#get', () => {
    const noNamespaceResult = {
      _id: 'index-pattern:logstash-*',
      _type: '_doc',
      ...mockVersionProps,
      _source: {
        type: 'index-pattern',
        specialProperty: 'specialValue',
        ...mockTimestampFields,
        'index-pattern': {
          title: 'Testing',
        },
      },
    };
    const namespacedResult = {
      _id: 'foo-namespace:index-pattern:logstash-*',
      _type: '_doc',
      ...mockVersionProps,
      _source: {
        namespace: 'foo-namespace',
        type: 'index-pattern',
        specialProperty: 'specialValue',
        ...mockTimestampFields,
        'index-pattern': {
          title: 'Testing',
        },
      },
    };

    it('waits until migrations are complete before proceeding', async () => {
      migrator.awaitMigration = jest.fn(async () =>
        expect(callAdminCluster).not.toHaveBeenCalled()
      );

      callAdminCluster.mockResolvedValue(noNamespaceResult);
      await expect(
        savedObjectsRepository.get('index-pattern', 'logstash-*')
      ).resolves.toBeDefined();

      expect(migrator.awaitMigration).toHaveBeenCalledTimes(1);
    });

    it('formats Elasticsearch response when there is no namespace', async () => {
      callAdminCluster.mockResolvedValue(noNamespaceResult);
      const response = await savedObjectsRepository.get('index-pattern', 'logstash-*');
      expect(onBeforeWrite).not.toHaveBeenCalled();
      expect(response).toEqual({
        id: 'logstash-*',
        type: 'index-pattern',
        updated_at: mockTimestamp,
        version: mockVersion,
        attributes: {
          title: 'Testing',
        },
        references: [],
      });
    });

    it('formats Elasticsearch response when there are namespaces', async () => {
      callAdminCluster.mockResolvedValue(namespacedResult);
      const response = await savedObjectsRepository.get('index-pattern', 'logstash-*');
      expect(onBeforeWrite).not.toHaveBeenCalled();
      expect(response).toEqual({
        id: 'logstash-*',
        type: 'index-pattern',
        updated_at: mockTimestamp,
        version: mockVersion,
        attributes: {
          title: 'Testing',
        },
        references: [],
      });
    });

    it('prepends namespace and type to the id when providing namespace for namespaced type', async () => {
      callAdminCluster.mockResolvedValue(namespacedResult);
      await savedObjectsRepository.get('index-pattern', 'logstash-*', {
        namespace: 'foo-namespace',
      });

      expect(onBeforeWrite).not.toHaveBeenCalled();
      expect(callAdminCluster).toHaveBeenCalledTimes(1);
      expect(callAdminCluster).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          id: 'foo-namespace:index-pattern:logstash-*',
        })
      );
    });

    it(`only prepends type to the id when providing no namespace for namespaced type`, async () => {
      callAdminCluster.mockResolvedValue(noNamespaceResult);
      await savedObjectsRepository.get('index-pattern', 'logstash-*');

      expect(onBeforeWrite).not.toHaveBeenCalled();
      expect(callAdminCluster).toHaveBeenCalledTimes(1);
      expect(callAdminCluster).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          id: 'index-pattern:logstash-*',
        })
      );
    });

    it(`doesn't prepend namespace to the id when providing namespace for namespace agnostic type`, async () => {
      callAdminCluster.mockResolvedValue(namespacedResult);
      await savedObjectsRepository.get('globaltype', 'logstash-*', {
        namespace: 'foo-namespace',
      });

      expect(onBeforeWrite).not.toHaveBeenCalled();
      expect(callAdminCluster).toHaveBeenCalledTimes(1);
      expect(callAdminCluster).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          id: 'globaltype:logstash-*',
        })
      );
    });
  });

  describe('#bulkGet', () => {
    it('waits until migrations are complete before proceeding', async () => {
      migrator.awaitMigration = jest.fn(async () =>
        expect(callAdminCluster).not.toHaveBeenCalled()
      );

      callAdminCluster.mockReturnValue({ docs: [] });
      await expect(
        savedObjectsRepository.bulkGet([
          { id: 'one', type: 'config' },
          { id: 'two', type: 'index-pattern' },
          { id: 'three', type: 'globaltype' },
        ])
      ).resolves.toBeDefined();

      expect(migrator.awaitMigration).toHaveBeenCalledTimes(1);
    });

    it('prepends type to id when getting objects when there is no namespace', async () => {
      callAdminCluster.mockReturnValue({ docs: [] });

      await savedObjectsRepository.bulkGet([
        { id: 'one', type: 'config' },
        { id: 'two', type: 'index-pattern' },
        { id: 'three', type: 'globaltype' },
      ]);

      expect(callAdminCluster).toHaveBeenCalledTimes(1);
      expect(callAdminCluster).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: {
            docs: [
              { _id: 'config:one' },
              { _id: 'index-pattern:two' },
              { _id: 'globaltype:three' },
            ],
          },
        })
      );

      expect(onBeforeWrite).not.toHaveBeenCalled();
    });

    it('prepends namespace and type appropriately to id when getting objects when there is a namespace', async () => {
      callAdminCluster.mockReturnValue({ docs: [] });

      await savedObjectsRepository.bulkGet(
        [
          { id: 'one', type: 'config' },
          { id: 'two', type: 'index-pattern' },
          { id: 'three', type: 'globaltype' },
        ],
        {
          namespace: 'foo-namespace',
        }
      );

      expect(callAdminCluster).toHaveBeenCalledTimes(1);
      expect(callAdminCluster).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: {
            docs: [
              { _id: 'foo-namespace:config:one' },
              { _id: 'foo-namespace:index-pattern:two' },
              { _id: 'globaltype:three' },
            ],
          },
        })
      );

      expect(onBeforeWrite).not.toHaveBeenCalled();
    });

    it('mockReturnValue early for empty objects argument', async () => {
      callAdminCluster.mockReturnValue({ docs: [] });

      const response = await savedObjectsRepository.bulkGet([]);

      expect(response.saved_objects).toHaveLength(0);
      expect(callAdminCluster).not.toHaveBeenCalled();
      expect(onBeforeWrite).not.toHaveBeenCalled();
    });

    it('handles missing ids gracefully', async () => {
      callAdminCluster.mockResolvedValue({
        docs: [
          {
            _type: '_doc',
            _id: 'config:good',
            found: true,
            ...mockVersionProps,
            _source: { ...mockTimestampFields, config: { title: 'Test' } },
          },
          {
            _type: '_doc',
            _id: 'config:bad',
            found: false,
          },
        ],
      });

      const { saved_objects: savedObjects } = await savedObjectsRepository.bulkGet([
        { id: 'good', type: 'config' },
        { type: 'config' },
      ]);

      expect(savedObjects[1]).toEqual({
        type: 'config',
        error: { statusCode: 404, message: 'Not found' },
      });
    });

    it('reports error on missed objects', async () => {
      callAdminCluster.mockResolvedValue({
        docs: [
          {
            _type: '_doc',
            _id: 'config:good',
            found: true,
            ...mockVersionProps,
            _source: { ...mockTimestampFields, config: { title: 'Test' } },
          },
          {
            _type: '_doc',
            _id: 'config:bad',
            found: false,
          },
        ],
      });

      const { saved_objects: savedObjects } = await savedObjectsRepository.bulkGet([
        { id: 'good', type: 'config' },
        { id: 'bad', type: 'config' },
      ]);

      expect(onBeforeWrite).not.toHaveBeenCalled();
      expect(callAdminCluster).toHaveBeenCalledTimes(1);

      expect(savedObjects).toHaveLength(2);
      expect(savedObjects[0]).toEqual({
        id: 'good',
        type: 'config',
        ...mockTimestampFields,
        version: mockVersion,
        attributes: { title: 'Test' },
        references: [],
      });
      expect(savedObjects[1]).toEqual({
        id: 'bad',
        type: 'config',
        error: { statusCode: 404, message: 'Not found' },
      });
    });
  });

  describe('#update', () => {
    const id = 'logstash-*';
    const type = 'index-pattern';
    const attributes = { title: 'Testing' };

    beforeEach(() => {
      callAdminCluster.mockResolvedValue({
        _id: `${type}:${id}`,
        _type: '_doc',
        ...mockVersionProps,
        result: 'updated',
      });
    });

    it('waits until migrations are complete before proceeding', async () => {
      migrator.awaitMigration = jest.fn(async () =>
        expect(callAdminCluster).not.toHaveBeenCalled()
      );

      await expect(
        savedObjectsRepository.update('index-pattern', 'logstash-*', attributes, {
          namespace: 'foo-namespace',
        })
      ).resolves.toBeDefined();

      expect(migrator.awaitMigration).toHaveReturnedTimes(1);
    });

    it('mockReturnValue current ES document _seq_no and _primary_term encoded as version', async () => {
      const response = await savedObjectsRepository.update(
        'index-pattern',
        'logstash-*',
        attributes,
        {
          namespace: 'foo-namespace',
          references: [
            {
              name: 'ref_0',
              type: 'test',
              id: '1',
            },
          ],
        }
      );
      expect(response).toEqual({
        id,
        type,
        ...mockTimestampFields,
        version: mockVersion,
        attributes,
        references: [
          {
            name: 'ref_0',
            type: 'test',
            id: '1',
          },
        ],
      });
    });

    it('accepts version', async () => {
      await savedObjectsRepository.update(
        type,
        id,
        { title: 'Testing' },
        {
          version: encodeHitVersion({
            _seq_no: 100,
            _primary_term: 200,
          }),
        }
      );

      expect(callAdminCluster).toHaveBeenCalledTimes(1);
      expect(callAdminCluster).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          if_seq_no: 100,
          if_primary_term: 200,
        })
      );
    });

    it(`prepends namespace to the id but doesn't add namespace to body when providing namespace for namespaced type`, async () => {
      await savedObjectsRepository.update(
        'index-pattern',
        'logstash-*',
        {
          title: 'Testing',
        },
        {
          namespace: 'foo-namespace',
          references: [
            {
              name: 'ref_0',
              type: 'test',
              id: '1',
            },
          ],
        }
      );

      expect(callAdminCluster).toHaveBeenCalledTimes(1);
      expect(callAdminCluster).toHaveBeenCalledWith('update', {
        id: 'foo-namespace:index-pattern:logstash-*',
        body: {
          doc: {
            updated_at: mockTimestamp,
            'index-pattern': { title: 'Testing' },
            references: [
              {
                name: 'ref_0',
                type: 'test',
                id: '1',
              },
            ],
          },
        },
        ignore: [404],
        refresh: 'wait_for',
        index: '.kibana-test',
      });

      expect(onBeforeWrite).toHaveBeenCalledTimes(1);
    });

    it(`doesn't prepend namespace to the id or add namespace property when providing no namespace for namespaced type`, async () => {
      await savedObjectsRepository.update(
        'index-pattern',
        'logstash-*',
        {
          title: 'Testing',
        },
        {
          references: [
            {
              name: 'ref_0',
              type: 'test',
              id: '1',
            },
          ],
        }
      );

      expect(callAdminCluster).toHaveBeenCalledTimes(1);
      expect(callAdminCluster).toHaveBeenCalledWith('update', {
        id: 'index-pattern:logstash-*',
        body: {
          doc: {
            updated_at: mockTimestamp,
            'index-pattern': { title: 'Testing' },
            references: [
              {
                name: 'ref_0',
                type: 'test',
                id: '1',
              },
            ],
          },
        },
        ignore: [404],
        refresh: 'wait_for',
        index: '.kibana-test',
      });

      expect(onBeforeWrite).toHaveBeenCalledTimes(1);
    });

    it(`doesn't prepend namespace to the id or add namespace property when providing namespace for namespace agnostic type`, async () => {
      await savedObjectsRepository.update(
        'globaltype',
        'foo',
        {
          name: 'bar',
        },
        {
          namespace: 'foo-namespace',
          references: [
            {
              name: 'ref_0',
              type: 'test',
              id: '1',
            },
          ],
        }
      );

      expect(callAdminCluster).toHaveBeenCalledTimes(1);
      expect(callAdminCluster).toHaveBeenCalledWith('update', {
        id: 'globaltype:foo',
        body: {
          doc: {
            updated_at: mockTimestamp,
            globaltype: { name: 'bar' },
            references: [
              {
                name: 'ref_0',
                type: 'test',
                id: '1',
              },
            ],
          },
        },
        ignore: [404],
        refresh: 'wait_for',
        index: '.kibana-test',
      });

      expect(onBeforeWrite).toHaveBeenCalledTimes(1);
    });
  });

  describe('#incrementCounter', () => {
    beforeEach(() => {
      callAdminCluster.mockImplementation((method, params) => ({
        _type: '_doc',
        _id: params.id,
        ...mockVersionProps,
        _index: '.kibana',
        get: {
          found: true,
          _source: {
            type: 'config',
            ...mockTimestampFields,
            config: {
              buildNum: 8468,
              defaultIndex: 'logstash-*',
            },
          },
        },
      }));
    });

    it('formats Elasticsearch response', async () => {
      callAdminCluster.mockImplementation((method, params) => ({
        _type: '_doc',
        _id: params.id,
        ...mockVersionProps,
        _index: '.kibana',
        get: {
          found: true,
          _source: {
            type: 'config',
            ...mockTimestampFields,
            config: {
              buildNum: 8468,
              defaultIndex: 'logstash-*',
            },
          },
        },
      }));

      const response = await savedObjectsRepository.incrementCounter(
        'config',
        '6.0.0-alpha1',
        'buildNum',
        {
          namespace: 'foo-namespace',
        }
      );

      expect(response).toEqual({
        type: 'config',
        id: '6.0.0-alpha1',
        ...mockTimestampFields,
        version: mockVersion,
        attributes: {
          buildNum: 8468,
          defaultIndex: 'logstash-*',
        },
      });
    });

    it('migrates the doc if an upsert is required', async () => {
      migrator.migrateDocument = doc => {
        doc.attributes.buildNum = 42;
        doc.migrationVersion = { foo: '2.3.4' };
        doc.references = [{ name: 'search_0', type: 'search', id: '123' }];
        return doc;
      };

      await savedObjectsRepository.incrementCounter('config', 'doesnotexist', 'buildNum', {
        namespace: 'foo-namespace',
      });

      expect(callAdminCluster).toHaveBeenCalledTimes(1);
      expect(callAdminCluster.mock.calls[0][1]).toMatchObject({
        body: {
          upsert: {
            config: { buildNum: 42 },
            migrationVersion: { foo: '2.3.4' },
            type: 'config',
            ...mockTimestampFields,
            references: [{ name: 'search_0', type: 'search', id: '123' }],
          },
        },
      });
    });

    it(`prepends namespace to the id but doesn't add namespace to body when providing namespace for namespaced type`, async () => {
      await savedObjectsRepository.incrementCounter('config', '6.0.0-alpha1', 'buildNum', {
        namespace: 'foo-namespace',
      });

      expect(callAdminCluster).toHaveBeenCalledTimes(1);

      const requestDoc = callAdminCluster.mock.calls[0][1];
      expect(requestDoc.id).toBe('foo-namespace:config:6.0.0-alpha1');
      expect(requestDoc.body.script.params.type).toBe('config');
      expect(requestDoc.body.upsert.type).toBe('config');
      expect(requestDoc).toHaveProperty('body.upsert.config');

      expect(onBeforeWrite).toHaveBeenCalledTimes(1);
    });

    it(`doesn't prepend namespace to the id or add namespace property when providing no namespace for namespaced type`, async () => {
      await savedObjectsRepository.incrementCounter('config', '6.0.0-alpha1', 'buildNum');

      expect(callAdminCluster).toHaveBeenCalledTimes(1);

      const requestDoc = callAdminCluster.mock.calls[0][1];
      expect(requestDoc.id).toBe('config:6.0.0-alpha1');
      expect(requestDoc.body.script.params.type).toBe('config');
      expect(requestDoc.body.upsert.type).toBe('config');
      expect(requestDoc).toHaveProperty('body.upsert.config');

      expect(onBeforeWrite).toHaveBeenCalledTimes(1);
    });

    it(`doesn't prepend namespace to the id or add namespace property when providing namespace for namespace agnostic type`, async () => {
      callAdminCluster.mockImplementation((method, params) => ({
        _type: '_doc',
        _id: params.id,
        ...mockVersionProps,
        _index: '.kibana',
        get: {
          found: true,
          _source: {
            type: 'globaltype',
            ...mockTimestampFields,
            globaltype: {
              counter: 1,
            },
          },
        },
      }));

      await savedObjectsRepository.incrementCounter('globaltype', 'foo', 'counter', {
        namespace: 'foo-namespace',
      });

      expect(callAdminCluster).toHaveBeenCalledTimes(1);

      const requestDoc = callAdminCluster.mock.calls[0][1];
      expect(requestDoc.id).toBe('globaltype:foo');
      expect(requestDoc.body.script.params.type).toBe('globaltype');
      expect(requestDoc.body.upsert.type).toBe('globaltype');
      expect(requestDoc).toHaveProperty('body.upsert.globaltype');

      expect(onBeforeWrite).toHaveBeenCalledTimes(1);
    });

    it('should assert that the "type" and "counterFieldName" arguments are strings', () => {
      expect.assertions(6);

      expect(
        savedObjectsRepository.incrementCounter(null, '6.0.0-alpha1', 'buildNum', {
          namespace: 'foo-namespace',
        })
      ).rejects.toEqual(new Error('"type" argument must be a string'));

      expect(
        savedObjectsRepository.incrementCounter(42, '6.0.0-alpha1', 'buildNum', {
          namespace: 'foo-namespace',
        })
      ).rejects.toEqual(new Error('"type" argument must be a string'));

      expect(
        savedObjectsRepository.incrementCounter({}, '6.0.0-alpha1', 'buildNum', {
          namespace: 'foo-namespace',
        })
      ).rejects.toEqual(new Error('"type" argument must be a string'));

      expect(
        savedObjectsRepository.incrementCounter('config', '6.0.0-alpha1', null, {
          namespace: 'foo-namespace',
        })
      ).rejects.toEqual(new Error('"counterFieldName" argument must be a string'));

      expect(
        savedObjectsRepository.incrementCounter('config', '6.0.0-alpha1', 42, {
          namespace: 'foo-namespace',
        })
      ).rejects.toEqual(new Error('"counterFieldName" argument must be a string'));

      expect(
        savedObjectsRepository.incrementCounter(
          'config',
          '6.0.0-alpha1',
          {},
          {
            namespace: 'foo-namespace',
          }
        )
      ).rejects.toEqual(new Error('"counterFieldName" argument must be a string'));
    });
  });

  describe('onBeforeWrite', () => {
    it('blocks calls to callCluster of requests', async () => {
      onBeforeWrite.mockReturnValue(delay(500));
      callAdminCluster.mockReturnValue({ result: 'deleted', found: true });

      const deletePromise = savedObjectsRepository.delete('foo', 'id');
      await delay(100);
      expect(onBeforeWrite).toHaveBeenCalledTimes(1);
      expect(callAdminCluster).not.toHaveBeenCalled();
      await deletePromise;
      expect(onBeforeWrite).toHaveBeenCalledTimes(1);
      expect(callAdminCluster).toHaveBeenCalledTimes(1);
    });

    it('can throw es errors and have them decorated as SavedObjectsClient errors', async () => {
      expect.assertions(4);

      const es401 = new elasticsearch.errors[401]();
      expect(errors.isNotAuthorizedError(es401)).toBe(false);
      onBeforeWrite.mockImplementation(() => {
        throw es401;
      });

      try {
        await savedObjectsRepository.delete('foo', 'id');
      } catch (error) {
        expect(onBeforeWrite).toHaveBeenCalledTimes(1);
        expect(error).toBe(es401);
        expect(errors.isNotAuthorizedError(error)).toBe(true);
      }
    });
  });

  describe('unsupported types', () => {
    it("should error when attempting to 'update' an unsupported type", async () => {
      await expect(
        savedObjectsRepository.update('hiddenType', 'bogus', { title: 'some title' })
      ).rejects.toEqual(new Error('Saved object [hiddenType/bogus] not found'));
    });

    it("should error when attempting to 'get' an unsupported type", async () => {
      await expect(savedObjectsRepository.get('hiddenType')).rejects.toEqual(
        new Error('Not Found')
      );
    });

    it("should return an error object when attempting to 'create' an unsupported type", async () => {
      await expect(
        savedObjectsRepository.create('hiddenType', { title: 'some title' })
      ).rejects.toEqual(new Error("Unsupported saved object type: 'hiddenType': Bad Request"));
    });

    it("should return an error object when attempting to 'bulkGet' an unsupported type", async () => {
      callAdminCluster.mockReturnValue({
        docs: [
          {
            id: 'one',
            type: 'config',
            _primary_term: 1,
            _seq_no: 1,
            found: true,
            _source: {
              updated_at: mockTimestamp,
            },
          },
          {
            id: 'bad',
            type: 'config',
            found: false,
          },
        ],
      });
      const { saved_objects: savedObjects } = await savedObjectsRepository.bulkGet([
        { id: 'one', type: 'config' },
        { id: 'bad', type: 'config' },
        { id: 'four', type: 'hiddenType' },
      ]);
      expect(savedObjects).toEqual([
        {
          id: 'one',
          type: 'config',
          updated_at: mockTimestamp,
          references: [],
          version: 'WzEsMV0=',
        },
        {
          error: {
            message: 'Not found',
            statusCode: 404,
          },
          id: 'bad',
          type: 'config',
        },
        {
          id: 'four',
          error: {
            error: 'Bad Request',
            message: "Unsupported saved object type: 'hiddenType': Bad Request",
            statusCode: 400,
          },
          type: 'hiddenType',
        },
      ]);
    });

    it("should not return hidden saved ojects when attempting to 'find' support and unsupported types", async () => {
      callAdminCluster.mockReturnValue({
        hits: {
          total: 1,
          hits: [
            {
              _id: 'one',
              _source: {
                updated_at: mockTimestamp,
                type: 'config',
              },
              references: [],
            },
          ],
        },
      });
      const results = await savedObjectsRepository.find({ type: ['hiddenType', 'config'] });
      expect(results).toEqual({
        total: 1,
        saved_objects: [
          {
            id: 'one',
            references: [],
            type: 'config',
            updated_at: mockTimestamp,
          },
        ],
        page: 1,
        per_page: 20,
      });
    });

    it("should return empty results when attempting to 'find' an unsupported type", async () => {
      callAdminCluster.mockReturnValue({
        hits: {
          total: 0,
          hits: [],
        },
      });
      const results = await savedObjectsRepository.find({ type: 'hiddenType' });
      expect(results).toEqual({
        total: 0,
        saved_objects: [],
        page: 1,
        per_page: 20,
      });
    });

    it("should return empty results when attempting to 'find' more than one unsupported types", async () => {
      const findParams = { type: ['hiddenType', 'hiddenType2'] };
      callAdminCluster.mockReturnValue({
        status: 200,
        hits: {
          total: 0,
          hits: [],
        },
      });
      const results = await savedObjectsRepository.find(findParams);
      expect(results).toEqual({
        total: 0,
        saved_objects: [],
        page: 1,
        per_page: 20,
      });
    });

    it("should error when attempting to 'delete' hidden types", async () => {
      await expect(savedObjectsRepository.delete('hiddenType')).rejects.toEqual(
        new Error('Not Found')
      );
    });

    it("should error when attempting to 'bulkCreate' an unsupported type", async () => {
      callAdminCluster.mockReturnValue({
        items: [
          {
            index: {
              _id: 'one',
              _seq_no: 1,
              _primary_term: 1,
              _type: 'config',
              attributes: {
                title: 'Test One',
              },
            },
          },
        ],
      });
      const results = await savedObjectsRepository.bulkCreate([
        { type: 'config', id: 'one', attributes: { title: 'Test One' } },
        { type: 'hiddenType', id: 'two', attributes: { title: 'Test Two' } },
      ]);
      expect(results).toEqual({
        saved_objects: [
          {
            type: 'config',
            id: 'one',
            attributes: { title: 'Test One' },
            references: [],
            version: 'WzEsMV0=',
            updated_at: mockTimestamp,
          },
          {
            error: {
              error: 'Bad Request',
              message: "Unsupported saved object type: 'hiddenType': Bad Request",
              statusCode: 400,
            },
            id: 'two',
            type: 'hiddenType',
          },
        ],
      });
    });

    it("should error when attempting to 'incrementCounter' for an unsupported type", async () => {
      await expect(
        savedObjectsRepository.incrementCounter('hiddenType', 'doesntmatter', 'fieldArg')
      ).rejects.toEqual(new Error("Unsupported saved object type: 'hiddenType': Bad Request"));
    });
  });
});
