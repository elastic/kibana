var _ = require('lodash');
var Promise = require('bluebird');
var sinon = require('sinon');
var expect = require('expect.js');

var upgradeConfig = require('../upgrade_config');

describe('pluigns/elasticsearch', function () {
  describe('lib/upgrade_config', function () {
    var get;
    var server;
    var client;
    var config;
    var upgrade;

    beforeEach(function () {
      get = sinon.stub();
      get.withArgs('kibana.index').returns('.my-kibana');
      get.withArgs('pkg.version').returns('4.0.1');
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
      var response = { hits: { hits:[] } };

      beforeEach(function () {
        client.create.returns(Promise.resolve());
      });

      describe('production', function () {
        beforeEach(function () {
          get.withArgs('env.name').returns('production');
          get.withArgs('env.prod').returns(true);
          get.withArgs('env.dev').returns(false);
        });

        it('should resolve buildNum to pkg.buildNum', function () {
          get.withArgs('pkg.buildNum').returns(5801);

          return upgrade(response).then(function (resp) {
            sinon.assert.calledOnce(client.create);
            var params = client.create.args[0][0];
            expect(params.body).to.have.property('buildNum', 5801);
          });
        });

        it('should resolve version to kibana.package.version', function () {
          return upgrade(response).then(function (resp) {
            var params = client.create.args[0][0];
            expect(params).to.have.property('id', '4.0.1');
          });
        });
      });

      describe('development', function () {
        beforeEach(function () {
          get.withArgs('env.name').returns('development');
          get.withArgs('env.prod').returns(false);
          get.withArgs('env.dev').returns(true);
        });

        it('should resolve buildNum to the max integer', function () {
          return upgrade(response).then(function (resp) {
            var params = client.create.args[0][0];
            expect(params.body).to.have.property('buildNum', (Math.pow(2, 53) - 1));
          });
        });

        it('should resolve version to @@version', function () {
          return upgrade(response).then(function (resp) {
            var params = client.create.args[0][0];
            expect(params).to.have.property('id', '@@version');
          });
        });
      });
    });

    it('should resolve with undefined if the current version is found', function () {
      var response = { hits: { hits: [ { _id: '4.0.1' } ] } };
      return upgrade(response).then(function (resp) {
        expect(resp).to.be(undefined);
      });
    });

    it('should resolve with undefined if the nothing is upgradeable', function () {
      var response = { hits: { hits: [ { _id: '4.0.1-beta1' }, { _id: '4.0.0-snapshot1' } ] } };
      return upgrade(response).then(function (resp) {
        expect(resp).to.be(undefined);
      });
    });

    it('should update the build number on the new config', function () {
      get.withArgs('pkg.buildNum').returns(5801);
      client.create.returns(Promise.resolve());
      var response = { hits: { hits: [ { _id: '4.0.0', _source: { buildNum: 1 } } ] } };
      return upgrade(response).then(function (resp) {
        sinon.assert.calledOnce(client.create);
        var params = client.create.args[0][0];
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
      var response = { hits: { hits: [ { _id: '4.0.0', _source: { buildNum: 1 } } ] } };
      return upgrade(response).then(function (resp) {
        sinon.assert.calledOnce(server.log);
        expect(server.log.args[0][0]).to.eql(['plugin', 'elasticsearch']);
        var msg = server.log.args[0][1];
        expect(msg).to.have.property('prevVersion', '4.0.0');
        expect(msg).to.have.property('newVersion', '4.0.1');
        expect(msg.tmpl).to.contain('Upgrade');
      });
    });

    it('should copy attributes from old config', function () {
      get.withArgs('pkg.buildNum').returns(5801);
      client.create.returns(Promise.resolve());
      var response = { hits: { hits: [ { _id: '4.0.0', _source: { buildNum: 1, defaultIndex: 'logstash-*' } } ] } };
      return upgrade(response).then(function (resp) {
        sinon.assert.calledOnce(client.create);
        var params = client.create.args[0][0];
        expect(params).to.have.property('body');
        expect(params.body).to.have.property('defaultIndex', 'logstash-*');
      });
    });

  });
});
