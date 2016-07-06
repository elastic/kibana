import _ from 'lodash';
import sinon from 'sinon';
import expect from 'expect.js';
import Promise from 'bluebird';

import createKibanaIndex from '../create_kibana_index';
import SetupError from '../setup_error';

describe('plugins/elasticsearch', function () {
  describe('lib/create_kibana_index', function () {

    let server;
    let client;
    beforeEach(function () {
      server = {};
      client = {};
      let config = { kibana: { index: '.my-kibana' } };
      const get = sinon.stub();
      get.returns(config);
      get.withArgs('kibana.index').returns(config.kibana.index);
      config = function () { return { get: get }; };
      _.set(client, 'indices.create', sinon.stub());
      _.set(client, 'cluster.health', sinon.stub());
      _.set(server, 'plugins.elasticsearch.client', client);
      _.set(server, 'config', config);
    });

    describe('successful requests', function () {

      beforeEach(function () {
        client.indices.create.returns(Promise.resolve());
        client.cluster.health.returns(Promise.resolve());
      });

      it('should check cluster.health upon successful index creation', function () {
        const fn = createKibanaIndex(server);
        return fn.then(function () {
          sinon.assert.calledOnce(client.cluster.health);
        });
      });

      it('should be created with mappings for config.buildNum', function () {
        const fn = createKibanaIndex(server);
        return fn.then(function () {
          const params = client.indices.create.args[0][0];
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
            .to.have.property('type', 'string');
          expect(params.body.mappings.config.properties.buildNum)
            .to.have.property('index', 'not_analyzed');
        });
      });

      it('should be created with 1 shard and default replica', function () {
        const fn = createKibanaIndex(server);
        return fn.then(function () {
          const params = client.indices.create.args[0][0];
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
        const fn = createKibanaIndex(server);
        return fn.then(function () {
          const params = client.indices.create.args[0][0];
          expect(params)
            .to.have.property('index', '.my-kibana');
        });
      });


    });

    describe('failure requests', function () {
      it('should reject with a SetupError', function () {
        const error = new Error('Oops!');
        client.indices.create.returns(Promise.reject(error));
        const fn = createKibanaIndex(server);
        return fn.catch(function (err) {
          expect(err).to.be.a(SetupError);
        });
      });

      it('should reject with an error if index creation fails', function () {
        const error = new Error('Oops!');
        client.indices.create.returns(Promise.reject(error));
        const fn = createKibanaIndex(server);
        return fn.catch(function (err) {
          expect(err.message).to.be('Unable to create Kibana index ".my-kibana"');
          expect(err).to.have.property('origError', error);
        });
      });


      it('should reject with an error if health check fails', function () {
        const error = new Error('Oops!');
        client.indices.create.returns(Promise.resolve());
        client.cluster.health.returns(Promise.reject(error));
        const fn = createKibanaIndex(server);
        return fn.catch(function (err) {
          expect(err.message).to.be('Waiting for Kibana index ".my-kibana" to come online failed.');
          expect(err).to.have.property('origError', error);
        });
      });
    });

  });
});
