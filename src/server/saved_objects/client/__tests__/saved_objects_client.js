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
        id: 'logstash-*',
        title: 'Logstash'
      });

      expect(response).to.eql({
        type: 'index-pattern',
        id: 'logstash-*',
        title: 'Logstash',
        version: 2
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

  describe('#delete', () => {
    it('returns based on ES success', async () => {
      callAdminCluster.returns(Promise.resolve({ result: 'deleted' }));
      const response = await savedObjectsClient.delete('index-pattern', 'logstash-*');

      expect(response).to.be(true);
    });

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
      expect(response.data).to.have.length(count);
      docs.hits.hits.forEach((doc, i) => {
        expect(response.data[i]).to.eql(Object.assign(
          { id: doc._id, type: doc._type, version: doc._version },
          doc._source)
        );
      });
    });

    it('accepts per_page/page', async () => {
      await savedObjectsClient.find({ perPage: 10, page: 6 });

      expect(callAdminCluster.calledOnce).to.be(true);

      const options = callAdminCluster.getCall(0).args[1];
      expect(options).to.eql({
        index: '.kibana-test',
        body: { query: { match_all: {} }, version: true },
        filterPath: undefined,
        from: 50,
        size: 10,
        type: undefined
      });
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

      expect(options).to.eql({
        filterPath: undefined,
        from: 0,
        index: '.kibana-test',
        size: 20,
        body: { query: expectedQuery, version: true },
        type: 'index-pattern',
      });
    });

    it('accepts fields as a string', async () => {
      await savedObjectsClient.find({ fields: 'title' });

      expect(callAdminCluster.calledOnce).to.be(true);

      const options = callAdminCluster.getCall(0).args[1];
      expect(options.filterPath).to.eql([
        'hits.total',
        'hits.hits._id',
        'hits.hits._type',
        'hits.hits._version',
        'hits.hits._source.title'
      ]);
    });

    it('accepts fields as an array', async () => {
      await savedObjectsClient.find({ fields: ['title', 'description'] });

      expect(callAdminCluster.calledOnce).to.be(true);

      const options = callAdminCluster.getCall(0).args[1];
      expect(options.filterPath).to.eql([
        'hits.hits._source.title',
        'hits.hits._source.description',
        'hits.total',
        'hits.hits._id',
        'hits.hits._type',
        'hits.hits._version'
      ]);
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
        title: 'Testing',
        version: 2
      });
    });
  });

  describe('#update', () => {
    it('returns based on ES success', async () => {
      callAdminCluster.returns(Promise.resolve({
        _id: 'logstash-*',
        _type: 'index-pattern',
        _version: 2,
        result: 'updated'
      }));

      const response = await savedObjectsClient.update('index-pattern', 'logstash-*', { title: 'Testing' });
      expect(response).to.eql({ version: 2 });
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
