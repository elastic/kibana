import expect from 'expect.js';
import sinon from 'sinon';
import { SavedObjectsClient } from '../saved_objects_client';

describe('SavedObjectsClient', () => {
  const sandbox = sinon.sandbox.create();

  let callAdminCluster;
  let savedObjectsClient;
  const docs = {
    hits: {
      total: 3,
      hits: [{
        _index: '.kibana',
        _type: 'doc',
        _id: 'index-pattern:logstash-*',
        _score: 1,
        _source: {
          type: 'index-pattern',
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
    savedObjectsClient = new SavedObjectsClient('.kibana-test', mappings, callAdminCluster);
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
      const response = await savedObjectsClient.create('index-pattern', {
        title: 'Logstash'
      });

      expect(response).to.eql({
        type: 'index-pattern',
        id: 'logstash-*',
        version: 2,
        attributes: {
          title: 'Logstash',
        }
      });
    });

    it('should use ES index action', async () => {
      await savedObjectsClient.create('index-pattern', {
        id: 'logstash-*',
        title: 'Logstash'
      });

      expect(callAdminCluster.calledOnce).to.be(true);

      const args = callAdminCluster.getCall(0).args;
      expect(args[0]).to.be('index');
    });

    it('should use create action if ID defined and overwrite=false', async () => {
      await savedObjectsClient.create('index-pattern', {
        title: 'Logstash'
      }, {
        id: 'logstash-*',
      });

      expect(callAdminCluster.calledOnce).to.be(true);

      const args = callAdminCluster.getCall(0).args;
      expect(args[0]).to.be('create');
    });

    it('allows for id to be provided', async () => {
      await savedObjectsClient.create('index-pattern', {
        title: 'Logstash'
      }, { id: 'logstash-*' });

      expect(callAdminCluster.calledOnce).to.be(true);

      const args = callAdminCluster.getCall(0).args;
      expect(args[1].id).to.be('index-pattern:logstash-*');
    });

    it('self-generates an ID', async () => {
      await savedObjectsClient.create('index-pattern', {
        title: 'Logstash'
      });

      expect(callAdminCluster.calledOnce).to.be(true);

      const args = callAdminCluster.getCall(0).args;
      expect(args[1].id).to.match(/index-pattern:[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/);
    });
  });

  describe('#bulkCreate', () => {
    it('formats Elasticsearch request', async () => {
      await savedObjectsClient.bulkCreate([
        { type: 'config', id: 'one', attributes: { title: 'Test One' } },
        { type: 'index-pattern', id: 'two', attributes: { title: 'Test Two' } }
      ]);

      expect(callAdminCluster.calledOnce).to.be(true);

      const args = callAdminCluster.getCall(0).args;

      expect(args[0]).to.be('bulk');
      expect(args[1].body).to.eql([
        { create: { _type: 'doc', _id: 'config:one' } },
        { type: 'config', config: { title: 'Test One' } },
        { create: { _type: 'doc', _id: 'index-pattern:two' } },
        { type: 'index-pattern', 'index-pattern': { title: 'Test Two' } }
      ]);
    });

    it('should overwrite objects if overwrite is truthy', async () => {
      await savedObjectsClient.bulkCreate([{ type: 'foo', id: 'bar', attributes: {} }], { overwrite: false });
      sinon.assert.calledOnce(callAdminCluster);
      sinon.assert.calledWithExactly(callAdminCluster, 'bulk', sinon.match({
        body: [
          // uses create because overwriting is not allowed
          { create: { _type: 'doc', _id: 'foo:bar' } },
          { type: 'foo', 'foo': {} },
        ]
      }));

      callAdminCluster.reset();

      await savedObjectsClient.bulkCreate([{ type: 'foo', id: 'bar', attributes: {} }], { overwrite: true });
      sinon.assert.calledOnce(callAdminCluster);
      sinon.assert.calledWithExactly(callAdminCluster, 'bulk', sinon.match({
        body: [
          // uses index because overwriting is allowed
          { index: { _type: 'doc', _id: 'foo:bar' } },
          { type: 'foo', 'foo': {} },
        ]
      }));


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

      const response = await savedObjectsClient.bulkCreate([
        { type: 'config', id: 'one', attributes: { title: 'Test One' } },
        { type: 'index-pattern', id: 'two', attributes: { title: 'Test Two' } }
      ]);

      expect(response).to.eql([
        {
          id: 'one',
          type: 'config',
          version: undefined,
          attributes: { title: 'Test One' },
          error: { message: 'type[config] missing' }
        }, {
          id: 'two',
          type: 'index-pattern',
          version: 2,
          attributes: { title: 'Test Two' },
          error: undefined
        }
      ]);
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

      const response = await savedObjectsClient.bulkCreate([
        { type: 'config', id: 'one', attributes: { title: 'Test One' } },
        { type: 'index-pattern', id: 'two', attributes: { title: 'Test Two' } }
      ]);

      expect(response).to.eql([
        {
          id: 'one',
          type: 'config',
          version: 2,
          attributes: { title: 'Test One' },
          error: undefined
        }, {
          id: 'two',
          type: 'index-pattern',
          version: 2,
          attributes: { title: 'Test Two' },
          error: undefined
        }
      ]);
    });
  });

  describe('#delete', () => {
    it('throws notFound when ES is unable to find the document',  async () => {
      callAdminCluster.returns(Promise.resolve({ found: false }));

      try {
        await savedObjectsClient.delete('index-pattern', 'logstash-*');
        expect().fail('should throw error');
      } catch(e) {
        expect(e.output.statusCode).to.eql(404);
      }

    });

    it('passes the parameters to callAdminCluster', async () => {
      await savedObjectsClient.delete('index-pattern', 'logstash-*');

      expect(callAdminCluster.calledOnce).to.be(true);

      const [method, args] = callAdminCluster.getCall(0).args;
      expect(method).to.be('delete');
      expect(args).to.eql({
        type: 'doc',
        id: 'index-pattern:logstash-*',
        refresh: 'wait_for',
        index: '.kibana-test'
      });
    });
  });

  describe('#find', () => {
    it('formats Elasticsearch response', async () => {
      const count = docs.hits.hits.length;

      callAdminCluster.returns(Promise.resolve(docs));
      const response = await savedObjectsClient.find();

      expect(response.total).to.be(count);
      expect(response.saved_objects).to.have.length(count);

      docs.hits.hits.forEach((doc, i) => {
        expect(response.saved_objects[i]).to.eql({
          id: doc._id.replace(/(index-pattern|config)\:/, ''),
          type: doc._source.type,
          version: doc._version,
          attributes: doc._source[doc._source.type]
        });
      });
    });

    it('accepts per_page/page', async () => {
      await savedObjectsClient.find({ perPage: 10, page: 6 });

      expect(callAdminCluster.calledOnce).to.be(true);

      const options = callAdminCluster.getCall(0).args[1];
      expect(options.size).to.be(10);
      expect(options.from).to.be(50);
    });

    it('accepts type', async () => {
      await savedObjectsClient.find({ type: 'index-pattern' });

      expect(callAdminCluster.calledOnce).to.be(true);

      const options = callAdminCluster.getCall(0).args[1];
      const expectedQuery = {
        bool: {
          must: [{ match_all: {} }],
          filter: [
            {
              bool: {
                should: [
                  {
                    term: {
                      _type: 'index-pattern'
                    }
                  }, {
                    term: {
                      type: 'index-pattern'
                    }
                  }
                ]
              }
            }
          ]
        }
      };

      expect(options.body).to.eql({
        query: expectedQuery, version: true
      });
    });

    it('throws error when providing sortField but no type', (done) => {
      savedObjectsClient.find({
        sortField: 'someField'
      }).then(() => {
        done('failed');
      }).catch(e => {
        expect(e).to.be.an(Error);
        done();
      });
    });

    it('accepts sort with type', async () => {
      await savedObjectsClient.find({
        type: 'index-pattern',
        sortField: 'someField',
        sortOrder: 'desc',
      });

      expect(callAdminCluster.calledOnce).to.be(true);

      const options = callAdminCluster.getCall(0).args[1];
      const expectedQuerySort = [
        {
          someField: {
            order: 'desc',
            unmapped_type: 'keyword'
          },
        }, {
          'index-pattern.someField': {
            order: 'desc',
            unmapped_type: 'keyword'
          },
        },
      ];

      expect(options.body.sort).to.eql(expectedQuerySort);
    });

    it('can filter by fields', async () => {
      await savedObjectsClient.find({ fields: 'title' });

      expect(callAdminCluster.calledOnce).to.be(true);

      const options = callAdminCluster.getCall(0).args[1];
      expect(options._source).to.eql([
        '*.title', 'type', 'title'
      ]);
    });
  });

  describe('#get', () => {
    it('formats Elasticsearch response', async () => {
      callAdminCluster.returns(Promise.resolve({
        _id: 'index-pattern:logstash-*',
        _type: 'doc',
        _version: 2,
        _source: {
          type: 'index-pattern',
          'index-pattern': {
            title: 'Testing'
          }
        }
      }));

      const response = await savedObjectsClient.get('index-pattern', 'logstash-*');
      expect(response).to.eql({
        id: 'logstash-*',
        type: 'index-pattern',
        version: 2,
        attributes: {
          title: 'Testing'
        }
      });
    });

    it('prepends type to the id', async () => {
      callAdminCluster.returns(Promise.resolve({}));
      await savedObjectsClient.get('index-pattern', 'logstash-*');

      const [, args] = callAdminCluster.getCall(0).args;
      expect(args.id).to.eql('index-pattern:logstash-*');
      expect(args.type).to.eql('doc');
    });
  });

  describe('#bulkGet', () => {
    it('accepts a array of mixed type and ids', async () => {
      await savedObjectsClient.bulkGet([
        { id: 'one', type: 'config' },
        { id: 'two', type: 'index-pattern' }
      ]);

      expect(callAdminCluster.calledOnce).to.be(true);

      const options = callAdminCluster.getCall(0).args[1];
      expect(options.body.docs).to.eql([
        { _type: 'doc', _id: 'config:one' },
        { _type: 'doc', _id: 'index-pattern:two' }
      ]);
    });

    it('returns early for empty objects argument', async () => {
      const response = await savedObjectsClient.bulkGet([]);

      expect(response.saved_objects).to.have.length(0);
      expect(callAdminCluster.notCalled).to.be(true);
    });

    it('reports error on missed objects', async () => {
      callAdminCluster.returns(Promise.resolve({
        docs:[{
          _type: 'doc',
          _id: 'config:good',
          found: true,
          _version: 2,
          _source: { config: { title: 'Test' } }
        }, {
          _type: 'doc',
          _id: 'config:bad',
          found: false
        }]
      }));

      const { saved_objects: savedObjects } = await savedObjectsClient.bulkGet(
        [{ id: 'good', type: 'config' }, { id: 'bad', type: 'config' }]
      );

      expect(savedObjects).to.have.length(2);
      expect(savedObjects[0]).to.eql({
        id: 'good',
        type: 'config',
        version: 2,
        attributes: { title: 'Test' }
      });
      expect(savedObjects[1]).to.eql({
        id: 'bad',
        type: 'config',
        error: { statusCode: 404, message: 'Not found' }
      });
    });
  });

  describe('#update', () => {
    it('returns current ES document version', async () => {
      const id = 'logstash-*';
      const type = 'index-pattern';
      const version = 2;
      const attributes = { title: 'Testing' };

      callAdminCluster.returns(Promise.resolve({
        _id: `${type}:${id}`,
        _type: 'doc',
        _version: version,
        result: 'updated'
      }));

      const response = await savedObjectsClient.update('index-pattern', 'logstash-*', attributes);
      expect(response).to.eql({
        id,
        type,
        version,
        attributes
      });
    });

    it('accepts version', async () => {
      await savedObjectsClient.update(
        'index-pattern',
        'logstash-*',
        { title: 'Testing' },
        { version: 1 }
      );

      const esParams = callAdminCluster.getCall(0).args[1];
      expect(esParams.version).to.be(1);
    });

    it('passes the parameters to callAdminCluster', async () => {
      await savedObjectsClient.update('index-pattern', 'logstash-*', { title: 'Testing' });

      expect(callAdminCluster.calledOnce).to.be(true);

      const args = callAdminCluster.getCall(0).args;

      expect(args[0]).to.be('update');
      expect(args[1]).to.eql({
        type: 'doc',
        id: 'index-pattern:logstash-*',
        version: undefined,
        body: { doc: { 'index-pattern': { title: 'Testing' } } },
        refresh: 'wait_for',
        index: '.kibana-test'
      });
    });
  });
});
