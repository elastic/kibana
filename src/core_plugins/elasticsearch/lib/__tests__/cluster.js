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
        const request = { headers: Object.assign({}, headers, { foo: 'Foo' }) };

        cluster.callWithRequest(request, 'nodes.info');

        sinon.assert.calledOnce(client.nodes.info);
        expect(client.nodes.info.getCall(0).args[0]).to.eql({
          headers: headers
        });
      });

      describe('wrap401Errors', () => {
        let handler;
        const error = new Error('Authentication required');
        error.statusCode = 401;

        beforeEach(() => {
          handler = sinon.stub();
        });

        it('ensures WWW-Authenticate header', async () => {
          set(client, 'mock.401', sinon.stub().returns(Promise.reject(error)));
          await cluster.callWithRequest({}, 'mock.401', {}, { wrap401Errors: true }).catch(handler);

          sinon.assert.calledOnce(handler);
          expect(handler.getCall(0).args[0].output.headers['WWW-Authenticate']).to.eql('Basic realm="Authorization Required"');
        });

        it('persists WWW-Authenticate header', async () => {
          set(error, 'body.error.header[WWW-Authenticate]', 'Basic realm="Test"');
          set(client, 'mock.401', sinon.stub().returns(Promise.reject(error)));
          await cluster.callWithRequest({}, 'mock.401', {}, { wrap401Errors: true }).catch(handler);

          sinon.assert.calledOnce(handler);
          expect(handler.getCall(0).args[0].output.headers['WWW-Authenticate']).to.eql('Basic realm="Test"');
        });
      });
    });
  });
});
