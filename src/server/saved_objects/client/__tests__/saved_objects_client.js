import expect from 'expect.js';
import sinon from 'sinon';
import { SavedObjectsClient } from '../saved_objects_client';

describe('SavedObjectsClient', () => {
  let callAdminCluster;
  let savedObjectsClient;
  const docs = {
    hits: {
      total: 3,
      hits: [{
        _index: '.kibana',
        _type: 'index-pattern',
        _id: 'logstash-*',
        _score: 1,
        _source: {
          title: 'logstash-*',
          timeFieldName: '@timestamp',
          notExpandable: true
        }
      }, {
        _index: '.kibana',
        _type: 'config',
        _id: '6.0.0-alpha1',
        _score: 1,
        _source: {
          buildNum: 8467,
          defaultIndex: 'logstash-*'
        }
      }, {
        _index: '.kibana',
        _type: 'index-pattern',
        _id: 'stocks-*',
        _score: 1,
        _source: {
          title: 'stocks-*',
          timeFieldName: '@timestamp',
          notExpandable: true
        }
      }]
    }
  };

  beforeEach(() => {
    callAdminCluster = sinon.mock();
    savedObjectsClient = new SavedObjectsClient('.kibana-test', callAdminCluster);
  });

  afterEach(() => {
    callAdminCluster.reset();
  });


  describe('#create', () => {
    it('formats Elasticsearch response', async () => {
      callAdminCluster.returns({ _type: 'index-pattern', _id: 'logstash-*', _version: 2 });

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

    it('should use ES create action', async () => {
      callAdminCluster.returns({ _type: 'index-pattern', _id: 'logstash-*', _version: 2 });

      await savedObjectsClient.create('index-pattern', {
        id: 'logstash-*',
        title: 'Logstash'
      });

      expect(callAdminCluster.calledOnce).to.be(true);

      const args = callAdminCluster.getCall(0).args;
      expect(args[0]).to.be('index');
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
        { create: { _type: 'config', _id: 'one' } },
        { title: 'Test One' },
        { create: { _type: 'index-pattern', _id: 'two' } },
        { title: 'Test Two' }
      ]);
    });

    it('should overwrite objects if force is truthy', async () => {
      await savedObjectsClient.bulkCreate([
        { type: 'config', id: 'one', attributes: { title: 'Test One' } },
        { type: 'index-pattern', id: 'two', attributes: { title: 'Test Two' } }
      ], { force: true });

      expect(callAdminCluster.calledOnce).to.be(true);

      const args = callAdminCluster.getCall(0).args;

      expect(args[0]).to.be('bulk');
      expect(args[1].body).to.eql([
        { index: { _type: 'config', _id: 'one' } },
        { title: 'Test One' },
        { index: { _type: 'index-pattern', _id: 'two' } },
        { title: 'Test Two' }
      ]);
    });

    it('returns document errors', async () => {
      callAdminCluster.returns(Promise.resolve({
        errors: false,
        items: [{
          create: {
            _type: 'foo',
            _id: 'one',
            error: {
              reason: 'type[config] missing'
            }
          }
        }, {
          create: {
            _type: 'config',
            _id: 'one',
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
          type: 'foo',
          version: undefined,
          attributes: { title: 'Test One' },
          error: { message: 'type[config] missing' }
        }, {
          id: 'one',
          type: 'config',
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
            _type: 'config',
            _id: 'one',
            _version: 2
          }
        }, {
          create: {
            _type: 'config',
            _id: 'one',
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
          id: 'one',
          type: 'config',
          version: 2,
          attributes: { title: 'Test Two' },
          error: undefined
        }
      ]);
    });
  });

  describe('#delete', () => {
    it('throws notFound when ES is unable to find the document', (done) => {
      callAdminCluster.returns(Promise.resolve({ found: false }));

      savedObjectsClient.delete('index-pattern', 'logstash-*').then(() => {
        done('failed');
      }).catch(e => {
        expect(e.output.statusCode).to.be(404);
        done();
      });
    });

    it('passes the parameters to callAdminCluster', async () => {
      await savedObjectsClient.delete('index-pattern', 'logstash-*');

      expect(callAdminCluster.calledOnce).to.be(true);

      const args = callAdminCluster.getCall(0).args;
      expect(args[0]).to.be('delete');
      expect(args[1]).to.eql({
        type: 'index-pattern',
        id: 'logstash-*',
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
          id: doc._id,
          type: doc._type,
          version: doc._version,
          attributes: doc._source
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
          filter: [{ term: { _type: 'index-pattern' } }]
        }
      };

      expect(options.body).to.eql({
        query: expectedQuery, version: true
      });
    });

    it('can filter by fields', async () => {
      await savedObjectsClient.find({ fields: 'title' });

      expect(callAdminCluster.calledOnce).to.be(true);

      const options = callAdminCluster.getCall(0).args[1];
      expect(options._source).to.eql('title');
    });
  });

  describe('#get', () => {
    it('formats Elasticsearch response', async () => {
      callAdminCluster.returns(Promise.resolve({
        _id: 'logstash-*',
        _type: 'index-pattern',
        _version: 2,
        _source: {
          title: 'Testing'
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
  });

  describe('#bulkGet', () => {
    it('accepts a array of mixed type and ids', async () => {
      await savedObjectsClient.bulkGet([
        { id: 'one', type: 'config' },
        { id: 'two', type: 'index-pattern' },
        { id: 'three' }
      ]);

      expect(callAdminCluster.calledOnce).to.be(true);

      const options = callAdminCluster.getCall(0).args[1];
      expect(options.body.docs).to.eql([
        { _type: 'config', _id: 'one' },
        { _type: 'index-pattern', _id: 'two' },
        { _type: undefined, _id: 'three' }
      ]);
    });

    it('returns early for empty objects argument', async () => {
      const response = await savedObjectsClient.bulkGet([]);

      expect(response).to.have.length(0);
      expect(callAdminCluster.notCalled).to.be(true);
    });

    it('omits missed objects', async () => {
      callAdminCluster.returns(Promise.resolve({
        docs:[{
          _type: 'config',
          _id: 'bad',
          found: false
        }, {
          _type: 'config',
          _id: 'good',
          found: true,
          _version: 2,
          _source: { title: 'Test' }
        }]
      }));

      const response = await savedObjectsClient.bulkGet(['good', 'bad', 'config']);
      expect(response).to.have.length(1);
      expect(response[0]).to.eql({
        id: 'good',
        type: 'config',
        version: 2,
        attributes: { title: 'Test' }
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
        _id: id,
        _type: type,
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
        type: 'index-pattern',
        id: 'logstash-*',
        version: undefined,
        body: { doc: { title: 'Testing' } },
        refresh: 'wait_for',
        index: '.kibana-test'
      });
    });
  });
});
