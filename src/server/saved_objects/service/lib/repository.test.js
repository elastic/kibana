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

import sinon from 'sinon';
import { delay } from 'bluebird';
import { SavedObjectsRepository } from './repository';
import * as getSearchDslNS from './search_dsl/search_dsl';
import { getSearchDsl } from './search_dsl';
import * as errors from './errors';
import elasticsearch from 'elasticsearch';

// BEWARE: The SavedObjectClient depends on the implementation details of the SavedObjectsRepository
// so any breaking changes to this repository are considered breaking changes to the SavedObjectsClient.

describe('SavedObjectsRepository', () => {
  const sandbox = sinon.createSandbox();

  let callAdminCluster;
  let onBeforeWrite;
  let savedObjectsRepository;
  let migrator;
  const mockTimestamp = '2017-08-14T15:49:14.886Z';
  const mockTimestampFields = { updated_at: mockTimestamp };
  const searchResults = {
    hits: {
      total: 3,
      hits: [{
        _index: '.kibana',
        _type: 'doc',
        _id: 'index-pattern:logstash-*',
        _score: 1,
        _source: {
          type: 'index-pattern',
          ...mockTimestampFields,
          'index-pattern': {
            title: 'logstash-*',
            timeFieldName: '@timestamp',
            notExpandable: true
          }
        }
      }, {
        _index: '.kibana',
        _type: 'doc',
        _id: 'config:6.0.0-alpha1',
        _score: 1,
        _source: {
          type: 'config',
          ...mockTimestampFields,
          config: {
            buildNum: 8467,
            defaultIndex: 'logstash-*'
          }
        }
      }, {
        _index: '.kibana',
        _type: 'doc',
        _id: 'index-pattern:stocks-*',
        _score: 1,
        _source: {
          type: 'index-pattern',
          ...mockTimestampFields,
          'index-pattern': {
            title: 'stocks-*',
            timeFieldName: '@timestamp',
            notExpandable: true
          }
        }
      }]
    }
  };

  const mappings = {
    doc: {
      properties: {
        'index-pattern': {
          properties: {
            someField: {
              type: 'keyword'
            }
          }
        }
      }
    }
  };

  beforeEach(() => {
    callAdminCluster = sandbox.stub();
    onBeforeWrite = sandbox.stub();
    migrator = {
      migrateDocument: sinon.spy((doc) => doc),
    };

    savedObjectsRepository = new SavedObjectsRepository({
      index: '.kibana-test',
      mappings,
      callCluster: callAdminCluster,
      migrator,
      onBeforeWrite
    });

    sandbox.stub(savedObjectsRepository, '_getCurrentTime').returns(mockTimestamp);
    sandbox.stub(getSearchDslNS, 'getSearchDsl').returns({});
  });

  afterEach(() => {
    sandbox.restore();
  });


  describe('#create', () => {
    beforeEach(() => {
      callAdminCluster.returns(Promise.resolve({
        _type: 'doc',
        _id: 'index-pattern:logstash-*',
        _version: 2
      }));
    });

    it('formats Elasticsearch response', async () => {
      const response = await savedObjectsRepository.create('index-pattern', {
        title: 'Logstash'
      });

      expect(response).toEqual({
        type: 'index-pattern',
        id: 'logstash-*',
        ...mockTimestampFields,
        version: 2,
        attributes: {
          title: 'Logstash',
        }
      });
    });

    it('should use ES index action', async () => {
      await savedObjectsRepository.create('index-pattern', {
        id: 'logstash-*',
        title: 'Logstash'
      });

      sinon.assert.calledOnce(callAdminCluster);
      sinon.assert.calledWith(callAdminCluster, 'index');
      sinon.assert.calledOnce(onBeforeWrite);
    });

    it('migrates the doc', async () => {
      migrator.migrateDocument = (doc) => {
        doc.attributes.title = doc.attributes.title + '!!';
        doc.migrationVersion = { foo: '2.3.4' };
        return doc;
      };

      await savedObjectsRepository.create('index-pattern', {
        id: 'logstash-*',
        title: 'Logstash'
      });

      sinon.assert.calledOnce(callAdminCluster);
      expect(callAdminCluster.args[0][1]).toMatchObject({
        body: {
          'index-pattern': { id: 'logstash-*', title: 'Logstash!!' },
          migrationVersion: { foo: '2.3.4' },
          type: 'index-pattern',
          updated_at: '2017-08-14T15:49:14.886Z'
        },
      });
    });

    it('should use create action if ID defined and overwrite=false', async () => {
      await savedObjectsRepository.create('index-pattern', {
        title: 'Logstash'
      }, {
        id: 'logstash-*',
      });

      sinon.assert.calledOnce(callAdminCluster);
      sinon.assert.calledWith(callAdminCluster, 'create');
      sinon.assert.calledOnce(onBeforeWrite);
    });

    it('allows for id to be provided', async () => {
      await savedObjectsRepository.create('index-pattern', {
        title: 'Logstash'
      }, { id: 'logstash-*' });

      sinon.assert.calledOnce(callAdminCluster);
      sinon.assert.calledWithExactly(callAdminCluster, sinon.match.string, sinon.match({
        id: 'index-pattern:logstash-*'
      }));

      sinon.assert.calledOnce(onBeforeWrite);
    });

    it('self-generates an ID', async () => {
      await savedObjectsRepository.create('index-pattern', {
        title: 'Logstash'
      });

      sinon.assert.calledOnce(callAdminCluster);
      sinon.assert.calledWithExactly(callAdminCluster, sinon.match.string, sinon.match({
        id: sinon.match(/index-pattern:[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/)
      }));

      sinon.assert.calledOnce(onBeforeWrite);
    });
  });

  describe('#bulkCreate', () => {
    it('formats Elasticsearch request', async () => {
      callAdminCluster.returns({ items: [] });

      await savedObjectsRepository.bulkCreate([
        { type: 'config', id: 'one', attributes: { title: 'Test One' } },
        { type: 'index-pattern', id: 'two', attributes: { title: 'Test Two' } }
      ]);

      sinon.assert.calledOnce(callAdminCluster);
      const bulkCalls = callAdminCluster.args.filter(([path]) => path === 'bulk');

      expect(bulkCalls.length).toEqual(1);

      expect(bulkCalls[0][1].body).toEqual([
        { create: { _type: 'doc', _id: 'config:one' } },
        { type: 'config', ...mockTimestampFields, config: { title: 'Test One' } },
        { create: { _type: 'doc', _id: 'index-pattern:two' } },
        { type: 'index-pattern', ...mockTimestampFields, 'index-pattern': { title: 'Test Two' } }
      ]);

      sinon.assert.calledOnce(onBeforeWrite);
    });

    it('migrates the docs', async () => {
      callAdminCluster.returns({ items: [] });
      migrator.migrateDocument = (doc) => {
        doc.attributes.title = doc.attributes.title + '!!';
        doc.migrationVersion = { foo: '2.3.4' };
        return doc;
      };

      await savedObjectsRepository.bulkCreate([
        { type: 'config', id: 'one', attributes: { title: 'Test One' } },
        { type: 'index-pattern', id: 'two', attributes: { title: 'Test Two' } }
      ]);

      sinon.assert.calledWithExactly(callAdminCluster, 'bulk', sinon.match({
        body: [
          { create: { _type: 'doc', _id: 'config:one' } },
          { type: 'config', ...mockTimestampFields, config: { title: 'Test One!!' }, migrationVersion: { foo: '2.3.4' } },
          { create: { _type: 'doc', _id: 'index-pattern:two' } },
          { type: 'index-pattern', ...mockTimestampFields, 'index-pattern': { title: 'Test Two!!' }, migrationVersion: { foo: '2.3.4' } }
        ]
      }));
    });

    it('should overwrite objects if overwrite is truthy', async () => {
      callAdminCluster.returns({ items: [] });

      await savedObjectsRepository.bulkCreate([{ type: 'foo', id: 'bar', attributes: {} }], { overwrite: false });
      sinon.assert.calledOnce(callAdminCluster);
      sinon.assert.calledWithExactly(callAdminCluster, 'bulk', sinon.match({
        body: [
          // uses create because overwriting is not allowed
          { create: { _type: 'doc', _id: 'foo:bar' } },
          { type: 'foo', ...mockTimestampFields, 'foo': {}, migrationVersion: undefined },
        ]
      }));

      sinon.assert.calledOnce(onBeforeWrite);

      callAdminCluster.resetHistory();
      onBeforeWrite.resetHistory();

      await savedObjectsRepository.bulkCreate([{ type: 'foo', id: 'bar', attributes: {} }], { overwrite: true });
      sinon.assert.calledOnce(callAdminCluster);
      sinon.assert.calledWithExactly(callAdminCluster, 'bulk', sinon.match({
        body: [
          // uses index because overwriting is allowed
          { index: { _type: 'doc', _id: 'foo:bar' } },
          { type: 'foo', ...mockTimestampFields, 'foo': {}, migrationVersion: undefined },
        ]
      }));

      sinon.assert.calledOnce(onBeforeWrite);
    });

    it('returns document errors', async () => {
      callAdminCluster.returns(Promise.resolve({
        errors: false,
        items: [{
          create: {
            _type: 'doc',
            _id: 'config:one',
            error: {
              reason: 'type[config] missing'
            }
          }
        }, {
          create: {
            _type: 'doc',
            _id: 'index-pattern:two',
            _version: 2
          }
        }]
      }));

      const response = await savedObjectsRepository.bulkCreate([
        { type: 'config', id: 'one', attributes: { title: 'Test One' } },
        { type: 'index-pattern', id: 'two', attributes: { title: 'Test Two' } }
      ]);

      expect(response).toEqual({
        saved_objects: [
          {
            id: 'one',
            type: 'config',
            error: { message: 'type[config] missing' }
          }, {
            id: 'two',
            type: 'index-pattern',
            version: 2,
            ...mockTimestampFields,
            attributes: { title: 'Test Two' },
          }
        ]
      });
    });

    it('formats Elasticsearch response', async () => {
      callAdminCluster.returns(Promise.resolve({
        errors: false,
        items: [{
          create: {
            _type: 'doc',
            _id: 'config:one',
            _version: 2
          }
        }, {
          create: {
            _type: 'doc',
            _id: 'index-pattern:two',
            _version: 2
          }
        }]
      }));

      const response = await savedObjectsRepository.bulkCreate([
        { type: 'config', id: 'one', attributes: { title: 'Test One' } },
        { type: 'index-pattern', id: 'two', attributes: { title: 'Test Two' } }
      ]);

      expect(response).toEqual({
        saved_objects: [
          {
            id: 'one',
            type: 'config',
            version: 2,
            ...mockTimestampFields,
            attributes: { title: 'Test One' },
          }, {
            id: 'two',
            type: 'index-pattern',
            version: 2,
            ...mockTimestampFields,
            attributes: { title: 'Test Two' },
          }
        ]
      });
    });
  });

  describe('#delete', () => {
    it('throws notFound when ES is unable to find the document', async () => {
      expect.assertions(1);

      callAdminCluster.returns(Promise.resolve({
        result: 'not_found'
      }));

      try {
        await savedObjectsRepository.delete('index-pattern', 'logstash-*');
      } catch (e) {
        expect(e.output.statusCode).toEqual(404);
      }
    });

    it('passes the parameters to callAdminCluster', async () => {
      callAdminCluster.returns({
        result: 'deleted'
      });
      await savedObjectsRepository.delete('index-pattern', 'logstash-*');

      sinon.assert.calledOnce(callAdminCluster);
      sinon.assert.calledWithExactly(callAdminCluster, 'delete', {
        type: 'doc',
        id: 'index-pattern:logstash-*',
        refresh: 'wait_for',
        index: '.kibana-test',
        ignore: [404],
      });

      sinon.assert.calledOnce(onBeforeWrite);
    });
  });

  describe('#find', () => {
    beforeEach(() => {
      callAdminCluster.returns(searchResults);
    });

    it('requires type to be defined', async () => {
      await expect(savedObjectsRepository.find({})).rejects.toThrow(/options\.type must be/);
      sinon.assert.notCalled(callAdminCluster);
      sinon.assert.notCalled(onBeforeWrite);
    });

    it('requires searchFields be an array if defined', async () => {
      try {
        await savedObjectsRepository.find({ type: 'foo', searchFields: 'string' });
        throw new Error('expected find() to reject');
      } catch (error) {
        sinon.assert.notCalled(callAdminCluster);
        sinon.assert.notCalled(onBeforeWrite);
        expect(error.message).toMatch('must be an array');
      }
    });

    it('requires fields be an array if defined', async () => {
      try {
        await savedObjectsRepository.find({ type: 'foo', fields: 'string' });
        throw new Error('expected find() to reject');
      } catch (error) {
        sinon.assert.notCalled(callAdminCluster);
        sinon.assert.notCalled(onBeforeWrite);
        expect(error.message).toMatch('must be an array');
      }
    });

    it('passes mappings, search, searchFields, type, sortField, and sortOrder to getSearchDsl', async () => {
      const relevantOpts = {
        search: 'foo*',
        searchFields: ['foo'],
        type: 'bar',
        sortField: 'name',
        sortOrder: 'desc',
      };

      await savedObjectsRepository.find(relevantOpts);
      sinon.assert.calledOnce(getSearchDsl);
      sinon.assert.calledWithExactly(getSearchDsl, mappings, relevantOpts);
    });

    it('merges output of getSearchDsl into es request body', async () => {
      getSearchDsl.returns({ query: 1, aggregations: 2 });
      await savedObjectsRepository.find({ type: 'foo' });
      sinon.assert.calledOnce(callAdminCluster);
      sinon.assert.notCalled(onBeforeWrite);
      sinon.assert.calledWithExactly(callAdminCluster, 'search', sinon.match({
        body: sinon.match({
          query: 1,
          aggregations: 2,
        })
      }));
    });

    it('formats Elasticsearch response', async () => {
      const count = searchResults.hits.hits.length;

      const response = await savedObjectsRepository.find({ type: 'foo' });

      expect(response.total).toBe(count);
      expect(response.saved_objects).toHaveLength(count);

      searchResults.hits.hits.forEach((doc, i) => {
        expect(response.saved_objects[i]).toEqual({
          id: doc._id.replace(/(index-pattern|config)\:/, ''),
          type: doc._source.type,
          ...mockTimestampFields,
          version: doc._version,
          attributes: doc._source[doc._source.type]
        });
      });
    });

    it('accepts per_page/page', async () => {
      await savedObjectsRepository.find({ type: 'foo', perPage: 10, page: 6 });

      sinon.assert.calledOnce(callAdminCluster);
      sinon.assert.calledWithExactly(callAdminCluster, sinon.match.string, sinon.match({
        size: 10,
        from: 50
      }));

      sinon.assert.notCalled(onBeforeWrite);
    });

    it('can filter by fields', async () => {
      await savedObjectsRepository.find({ type: 'foo', fields: ['title'] });

      sinon.assert.calledOnce(callAdminCluster);
      sinon.assert.calledWithExactly(callAdminCluster, sinon.match.string, sinon.match({
        _source: [
          'foo.title', 'type', 'title'
        ]
      }));

      sinon.assert.notCalled(onBeforeWrite);
    });
  });

  describe('#get', () => {
    beforeEach(() => {
      callAdminCluster.returns(Promise.resolve({
        _id: 'index-pattern:logstash-*',
        _type: 'doc',
        _version: 2,
        _source: {
          type: 'index-pattern',
          ...mockTimestampFields,
          'index-pattern': {
            title: 'Testing'
          }
        }
      }));
    });

    it('formats Elasticsearch response', async () => {
      const response = await savedObjectsRepository.get('index-pattern', 'logstash-*');
      sinon.assert.notCalled(onBeforeWrite);
      expect(response).toEqual({
        id: 'logstash-*',
        type: 'index-pattern',
        updated_at: mockTimestamp,
        version: 2,
        attributes: {
          title: 'Testing'
        }
      });
    });

    it('prepends type to the id', async () => {
      await savedObjectsRepository.get('index-pattern', 'logstash-*');

      sinon.assert.notCalled(onBeforeWrite);
      sinon.assert.calledOnce(callAdminCluster);
      sinon.assert.calledWithExactly(callAdminCluster, sinon.match.string, sinon.match({
        id: 'index-pattern:logstash-*',
        type: 'doc'
      }));
    });
  });

  describe('#bulkGet', () => {
    it('accepts a array of mixed type and ids', async () => {
      callAdminCluster.returns({ docs: [] });

      await savedObjectsRepository.bulkGet([
        { id: 'one', type: 'config' },
        { id: 'two', type: 'index-pattern' }
      ]);

      sinon.assert.calledOnce(callAdminCluster);
      sinon.assert.calledWithExactly(callAdminCluster, sinon.match.string, sinon.match({
        body: {
          docs: [
            { _type: 'doc', _id: 'config:one' },
            { _type: 'doc', _id: 'index-pattern:two' }
          ]
        }
      }));

      sinon.assert.notCalled(onBeforeWrite);
    });

    it('returns early for empty objects argument', async () => {
      callAdminCluster.returns({ docs: [] });

      const response = await savedObjectsRepository.bulkGet([]);

      expect(response.saved_objects).toHaveLength(0);
      sinon.assert.notCalled(callAdminCluster);
      sinon.assert.notCalled(onBeforeWrite);
    });

    it('reports error on missed objects', async () => {
      callAdminCluster.returns(Promise.resolve({
        docs: [{
          _type: 'doc',
          _id: 'config:good',
          found: true,
          _version: 2,
          _source: { ...mockTimestampFields, config: { title: 'Test' } }
        }, {
          _type: 'doc',
          _id: 'config:bad',
          found: false
        }]
      }));

      const { saved_objects: savedObjects } = await savedObjectsRepository.bulkGet(
        [{ id: 'good', type: 'config' }, { id: 'bad', type: 'config' }]
      );

      sinon.assert.notCalled(onBeforeWrite);
      sinon.assert.calledOnce(callAdminCluster);

      expect(savedObjects).toHaveLength(2);
      expect(savedObjects[0]).toEqual({
        id: 'good',
        type: 'config',
        ...mockTimestampFields,
        version: 2,
        attributes: { title: 'Test' }
      });
      expect(savedObjects[1]).toEqual({
        id: 'bad',
        type: 'config',
        error: { statusCode: 404, message: 'Not found' }
      });
    });
  });

  describe('#update', () => {
    const id = 'logstash-*';
    const type = 'index-pattern';
    const newVersion = 2;
    const attributes = { title: 'Testing' };

    beforeEach(() => {
      callAdminCluster.returns(Promise.resolve({
        _id: `${type}:${id}`,
        _type: 'doc',
        _version: newVersion,
        result: 'updated'
      }));
    });

    it('returns current ES document version', async () => {
      const response = await savedObjectsRepository.update('index-pattern', 'logstash-*', attributes);
      expect(response).toEqual({
        id,
        type,
        ...mockTimestampFields,
        version: newVersion,
        attributes
      });
    });

    it('accepts version', async () => {
      await savedObjectsRepository.update(
        type,
        id,
        { title: 'Testing' },
        { version: newVersion - 1 }
      );

      sinon.assert.calledOnce(callAdminCluster);
      sinon.assert.calledWithExactly(callAdminCluster, sinon.match.string, sinon.match({
        version: newVersion - 1
      }));
    });

    it('passes the parameters to callAdminCluster', async () => {
      await savedObjectsRepository.update('index-pattern', 'logstash-*', { title: 'Testing' });

      sinon.assert.calledOnce(callAdminCluster);
      sinon.assert.calledWithExactly(callAdminCluster, 'update', {
        type: 'doc',
        id: 'index-pattern:logstash-*',
        version: undefined,
        body: {
          doc: { updated_at: mockTimestamp, 'index-pattern': { title: 'Testing' } }
        },
        ignore: [404],
        refresh: 'wait_for',
        index: '.kibana-test'
      });

      sinon.assert.calledOnce(onBeforeWrite);
    });
  });

  describe('onBeforeWrite', () => {
    it('blocks calls to callCluster of requests', async () => {
      onBeforeWrite.returns(delay(500));
      callAdminCluster.returns({ result: 'deleted', found: true });

      const deletePromise = savedObjectsRepository.delete('type', 'id');
      await delay(100);
      sinon.assert.calledOnce(onBeforeWrite);
      sinon.assert.notCalled(callAdminCluster);
      await deletePromise;
      sinon.assert.calledOnce(onBeforeWrite);
      sinon.assert.calledOnce(callAdminCluster);
    });

    it('can throw es errors and have them decorated as SavedObjectsClient errors', async () => {
      expect.assertions(3);

      const es401 = new elasticsearch.errors[401];
      expect(errors.isNotAuthorizedError(es401)).toBe(false);
      onBeforeWrite.throws(es401);

      try {
        await savedObjectsRepository.delete('type', 'id');
      } catch (error) {
        sinon.assert.calledOnce(onBeforeWrite);
        expect(error).toBe(es401);
        expect(errors.isNotAuthorizedError(error)).toBe(true);
      }
    });
  });
});
