import _ from 'lodash';
import Promise from 'bluebird';
import sinon from 'sinon';
import expect from 'expect.js';

import upgradeConfig from '../upgrade_config';

describe('plugins/elasticsearch', function () {
  describe('lib/upgrade_config', function () {
    let get;
    let server;
    let client;
    let config;
    let upgrade;

    beforeEach(function () {
      get = sinon.stub();
      get.withArgs('kibana.index').returns('.my-kibana');
      get.withArgs('pkg.version').returns('4.0.1');
      get.withArgs('pkg.buildNum').returns(Math.random());
      client = { create: sinon.stub() };
      server = {
        log: sinon.stub(),
        config: function () {
          return {
            get: get
          };
        },
        plugins: { elasticsearch: { client: client } }
      };
      upgrade = upgradeConfig(server);
    });

    describe('nothing is found', function () {
      const response = { hits: { hits:[] } };

      beforeEach(function () {
        client.create.returns(Promise.resolve());
      });

      describe('production', function () {
        beforeEach(function () {
          get.withArgs('env.name').returns('production');
          get.withArgs('env.prod').returns(true);
          get.withArgs('env.dev').returns(false);
        });

        it('should resolve buildNum to pkg.buildNum config', function () {
          return upgrade(response).then(function (resp) {
            sinon.assert.calledOnce(client.create);
            const params = client.create.args[0][0];
            expect(params.body).to.have.property('buildNum', get('pkg.buildNum'));
          });
        });

        it('should resolve version to pkg.version config', function () {
          return upgrade(response).then(function (resp) {
            const params = client.create.args[0][0];
            expect(params).to.have.property('id', get('pkg.version'));
          });
        });
      });

      describe('development', function () {
        beforeEach(function () {
          get.withArgs('env.name').returns('development');
          get.withArgs('env.prod').returns(false);
          get.withArgs('env.dev').returns(true);
        });

        it('should resolve buildNum to pkg.buildNum config', function () {
          return upgrade(response).then(function (resp) {
            const params = client.create.args[0][0];
            expect(params.body).to.have.property('buildNum', get('pkg.buildNum'));
          });
        });

        it('should resolve version to pkg.version config', function () {
          return upgrade(response).then(function (resp) {
            const params = client.create.args[0][0];
            expect(params).to.have.property('id', get('pkg.version'));
          });
        });
      });
    });

    it('should resolve with undefined if the current version is found', function () {
      const response = { hits: { hits: [ { _id: '4.0.1' } ] } };
      return upgrade(response).then(function (resp) {
        expect(resp).to.be(undefined);
      });
    });

    it('should create new config if the nothing is upgradeable', function () {
      get.withArgs('pkg.buildNum').returns(9833);
      client.create.returns(Promise.resolve());
      const response = { hits: { hits: [ { _id: '4.0.1-alpha3' }, { _id: '4.0.1-beta1' }, { _id: '4.0.0-SNAPSHOT1' } ] } };
      return upgrade(response).then(function (resp) {
        sinon.assert.calledOnce(client.create);
        const params = client.create.args[0][0];
        expect(params).to.have.property('body');
        expect(params.body).to.have.property('buildNum', 9833);
        expect(params).to.have.property('index', '.my-kibana');
        expect(params).to.have.property('type', 'config');
        expect(params).to.have.property('id', '4.0.1');
      });
    });

    it('should update the build number on the new config', function () {
      get.withArgs('pkg.buildNum').returns(5801);
      client.create.returns(Promise.resolve());
      const response = { hits: { hits: [ { _id: '4.0.0', _source: { buildNum: 1 } } ] } };
      return upgrade(response).then(function (resp) {
        sinon.assert.calledOnce(client.create);
        const params = client.create.args[0][0];
        expect(params).to.have.property('body');
        expect(params.body).to.have.property('buildNum', 5801);
        expect(params).to.have.property('index', '.my-kibana');
        expect(params).to.have.property('type', 'config');
        expect(params).to.have.property('id', '4.0.1');
      });
    });

    it('should log a message for upgrades', function () {
      get.withArgs('pkg.buildNum').returns(5801);
      client.create.returns(Promise.resolve());
      const response = { hits: { hits: [ { _id: '4.0.0', _source: { buildNum: 1 } } ] } };
      return upgrade(response).then(function (resp) {
        sinon.assert.calledOnce(server.log);
        expect(server.log.args[0][0]).to.eql(['plugin', 'elasticsearch']);
        const msg = server.log.args[0][1];
        expect(msg).to.have.property('prevVersion', '4.0.0');
        expect(msg).to.have.property('newVersion', '4.0.1');
        expect(msg.tmpl).to.contain('Upgrade');
      });
    });

    it('should copy attributes from old config', function () {
      get.withArgs('pkg.buildNum').returns(5801);
      client.create.returns(Promise.resolve());
      const response = { hits: { hits: [ { _id: '4.0.0', _source: { buildNum: 1, defaultIndex: 'logstash-*' } } ] } };
      return upgrade(response).then(function (resp) {
        sinon.assert.calledOnce(client.create);
        const params = client.create.args[0][0];
        expect(params).to.have.property('body');
        expect(params.body).to.have.property('defaultIndex', 'logstash-*');
      });
    });

  });
});
