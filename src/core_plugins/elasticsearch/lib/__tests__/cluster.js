import expect from 'expect.js';
import { Cluster } from '../cluster';
import sinon from 'sinon';
import { errors as esErrors } from 'elasticsearch';
import { set, partial } from 'lodash';

describe('plugins/elasticsearch', function () {
  describe('cluster', function () {
    let cluster;
    const config = {
      url: 'http://localhost:9200',
      ssl: { verificationMode: 'full' },
      requestHeadersWhitelist: [ 'authorization' ]
    };

    beforeEach(() => {
      cluster = new Cluster(config);
    });

    it('persists the config', () => {
      expect(cluster._config).to.eql(config);
    });

    it('exposes error definitions', () => {
      expect(cluster.errors).to.be(esErrors);
    });

    it('closes the clients', () => {
      cluster._client.close = sinon.spy();
      cluster._noAuthClient.close = sinon.spy();
      cluster.close();

      sinon.assert.calledOnce(cluster._client.close);
      sinon.assert.calledOnce(cluster._noAuthClient.close);
    });

    it('closes clients created with createClient', () => {
      const client = cluster.createClient();
      sinon.stub(client, 'close');
      cluster.close();
      sinon.assert.calledOnce(client.close);
    });

    it('protects the config from changes', () => {
      const localRequestHeadersWhitelist = cluster.getRequestHeadersWhitelist();
      expect(localRequestHeadersWhitelist.length).to.not.equal(config.requestHeadersWhitelist);
    });

    describe('callWithInternalUser', () => {
      let client;

      beforeEach(() => {
        client = cluster._client = sinon.stub();
        set(client, 'nodes.info', sinon.stub().returns(Promise.resolve()));
      });

      it('should return a function', () => {
        expect(cluster.callWithInternalUser).to.be.a('function');
      });

      it('throws an error for an invalid endpoint', () => {
        const fn = partial(cluster.callWithInternalUser, 'foo');
        expect(fn).to.throwException(/called with an invalid endpoint: foo/);
      });

      it('calls the client with params', () => {
        const params = { foo: 'Foo' };
        cluster.callWithInternalUser('nodes.info', params);

        sinon.assert.calledOnce(client.nodes.info);
        expect(client.nodes.info.getCall(0).args[0]).to.eql(params);
      });
    });

    describe('callWithRequest', () => {
      let client;

      beforeEach(() => {
        client = cluster._noAuthClient = sinon.stub();
        set(client, 'nodes.info', sinon.stub().returns(Promise.resolve()));
      });

      it('should return a function', () => {
        expect(cluster.callWithRequest).to.be.a('function');
      });

      it('throws an error for an invalid endpoint', () => {
        const fn = partial(cluster.callWithRequest, {}, 'foo');
        expect(fn).to.throwException(/called with an invalid endpoint: foo/);
      });

      it('calls the client with params', () => {
        const params = { foo: 'Foo' };
        cluster.callWithRequest({}, 'nodes.info', params);

        sinon.assert.calledOnce(client.nodes.info);
        expect(client.nodes.info.getCall(0).args[0]).to.eql(params);
      });

      it('passes only whitelisted headers', () => {
        const headers = { authorization: 'Basic TEST' };
        const request = {
          headers: {
            ...headers,
            foo: 'Foo'
          }
        };

        cluster.callWithRequest(request, 'nodes.info');

        sinon.assert.calledOnce(client.nodes.info);
        expect(client.nodes.info.getCall(0).args[0]).to.eql({
          headers: headers
        });
      });
    });
  });
});
