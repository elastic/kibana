import _ from 'lodash';
import sinon from 'sinon';
import expect from 'expect.js';
import Promise from 'bluebird';
import mappings from './fixtures/mappings';
import createKibanaIndex from '../create_kibana_index';
import SetupError from '../setup_error';

describe('plugins/elasticsearch', function () {
  describe('lib/create_kibana_index', function () {

    let server;
    let callWithInternalUser;
    let cluster;

    beforeEach(function () {
      server = {};

      let config = { kibana: { index: '.my-kibana' } };
      const get = sinon.stub();

      get.returns(config);
      get.withArgs('kibana.index').returns(config.kibana.index);
      config = function () { return { get: get }; };

      _.set(server, 'config', config);

      callWithInternalUser = sinon.stub();
      cluster = { callWithInternalUser: callWithInternalUser };

      _.set(server, 'plugins.elasticsearch.getCluster', sinon.stub().withArgs('admin').returns(cluster));
    });

    describe('successful requests', function () {
      beforeEach(function () {
        callWithInternalUser.withArgs('indices.create', sinon.match.any).returns(Promise.resolve());
        callWithInternalUser.withArgs('cluster.health', sinon.match.any).returns(Promise.resolve());
      });

      it('should check cluster.health upon successful index creation', function () {
        const fn = createKibanaIndex(server, mappings);
        return fn.then(function () {
          sinon.assert.calledOnce(callWithInternalUser.withArgs('cluster.health', sinon.match.any));
        });
      });

      it('should be created with mappings for config.buildNum', function () {
        const fn = createKibanaIndex(server, mappings);
        return fn.then(function () {
          const params = callWithInternalUser.args[0][1];
          expect(params)
            .to.have.property('body');
          expect(params.body)
            .to.have.property('mappings');
          expect(params.body.mappings)
            .to.have.property('config');
          expect(params.body.mappings.config)
            .to.have.property('properties');
          expect(params.body.mappings.config.properties)
            .to.have.property('buildNum');
          expect(params.body.mappings.config.properties.buildNum)
            .to.have.property('type', 'keyword');
        });
      });

      it('should be created with 1 shard and default replica', function () {
        const fn = createKibanaIndex(server, mappings);
        return fn.then(function () {
          const params = callWithInternalUser.args[0][1];
          expect(params)
            .to.have.property('body');
          expect(params.body)
            .to.have.property('settings');
          expect(params.body.settings)
            .to.have.property('number_of_shards', 1);
          expect(params.body.settings)
            .to.not.have.property('number_of_replicas');
        });
      });

      it('should be created with index name set in the config', function () {
        const fn = createKibanaIndex(server, mappings);
        return fn.then(function () {
          const params = callWithInternalUser.args[0][1];
          expect(params)
            .to.have.property('index', '.my-kibana');
        });
      });
    });

    describe('failure requests', function () {
      it('should reject with a SetupError', function () {
        const error = new Error('Oops!');
        callWithInternalUser.withArgs('indices.create', sinon.match.any).returns(Promise.reject(error));
        const fn = createKibanaIndex(server);
        return fn.catch(function (err) {
          expect(err).to.be.a(SetupError);
        });
      });

      it('should reject with an error if index creation fails', function () {
        const error = new Error('Oops!');
        callWithInternalUser.withArgs('indices.create', sinon.match.any).returns(Promise.reject(error));
        const fn = createKibanaIndex(server);
        return fn.catch(function (err) {
          expect(err.message).to.be('Unable to create Kibana index ".my-kibana"');
          expect(err).to.have.property('origError', error);
        });
      });

      it('should reject with an error if health check fails', function () {
        callWithInternalUser.withArgs('indices.create', sinon.match.any).returns(Promise.resolve());
        callWithInternalUser.withArgs('cluster.health', sinon.match.any).returns(Promise.reject(new Error()));
        const fn = createKibanaIndex(server);
        return fn.catch(function (err) {
          expect(err.message).to.be('Waiting for Kibana index ".my-kibana" to come online failed.');
        });
      });
    });
  });
});
