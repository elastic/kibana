import expect from 'expect.js';
import Cluster from '../cluster';
import sinon from 'sinon';
import { errors as esErrors } from 'elasticsearch';
import { set, partial, cloneDeep } from 'lodash';
import Boom from 'boom';

describe('plugins/elasticsearch', function () {
  describe('cluster', function () {
    let cluster;
    const config = {
      url: 'http://localhost:9200',
      ssl: { verify: false },
      requestHeadersWhitelist: [ 'authorization' ]
    };

    beforeEach(() => {
      cluster = new Cluster(config);
    });

    it('persists the config', () => {
      expect(cluster.config()).to.eql(config);
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
      const localConfig = cluster.config();
      localConfig.requestHeadersWhitelist.push('123');
      delete localConfig.url;
      expect(localConfig).to.not.equal(config);
      expect(localConfig.requestHeadersWhitelist.length).to.not.equal(config.requestHeadersWhitelist);
    });

    describe('adding a plugin', () => {
      const plugin = (Client, config, components) => {
        Client.prototype.marco = () => {
          return Promise.resolve('polo');
        };
      };

      beforeEach(() => {
        cluster.addClientPlugins([plugin]);
      });

      it('persists previous plugins', () => {
        const pluginTwo = (Client, config, components) => {
          Client.prototype.foo = () => {
            return Promise.resolve('bar');
          };
        };

        expect(cluster.config().plugins).to.have.length(1);
        expect(cluster.config().plugins[0]).to.be(plugin);

        cluster.addClientPlugins([pluginTwo]);

        expect(cluster.config().plugins).to.have.length(2);
        expect(cluster.config().plugins).to.eql([plugin, pluginTwo]);
      });

      it('is available for callAsKibanaUser', async () => {
        const marco = await cluster.callWithInternalUser('marco');
        expect(marco).to.eql('polo');
      });

      it('is available for callWithRequest', async () => {
        const marco = await cluster.callWithRequest({}, 'marco');
        expect(marco).to.eql('polo');
      });
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
