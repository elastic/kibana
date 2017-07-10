import Promise from 'bluebird';
import sinon from 'sinon';
import expect from 'expect.js';

import upgradeConfig from '../upgrade_config';

describe('plugins/elasticsearch', function () {
  describe('lib/upgrade_config', function () {
    let get;
    let server;
    let savedObjectsClient;
    let upgrade;

    beforeEach(function () {
      get = sinon.stub();
      get.withArgs('kibana.index').returns('.my-kibana');
      get.withArgs('pkg.version').returns('4.0.1');
      get.withArgs('pkg.buildNum').returns(Math.random());

      savedObjectsClient = {
        create: sinon.stub()
      };

      server = {
        log: sinon.stub(),
        config: function () {
          return {
            get: get
          };
        },
      };
      upgrade = upgradeConfig(server, savedObjectsClient);
    });

    describe('nothing is found', function () {
      const configSavedObjects = { hits: { hits:[] } };

      beforeEach(function () {
        savedObjectsClient.create.returns(Promise.resolve({ id: 1, version: 1 }));
      });

      describe('production', function () {
        beforeEach(function () {
          get.withArgs('env.name').returns('production');
          get.withArgs('env.prod').returns(true);
          get.withArgs('env.dev').returns(false);
        });

        it('should resolve buildNum to pkg.buildNum config', function () {
          return upgrade(configSavedObjects).then(function () {
            sinon.assert.calledOnce(savedObjectsClient.create);
            const attributes = savedObjectsClient.create.args[0][1];
            expect(attributes).to.have.property('buildNum', get('pkg.buildNum'));
          });
        });

        it('should resolve version to pkg.version config', function () {
          return upgrade(configSavedObjects).then(function () {
            const options = savedObjectsClient.create.args[0][2];
            expect(options).to.have.property('id', get('pkg.version'));
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
          return upgrade(configSavedObjects).then(function () {
            const attributes = savedObjectsClient.create.args[0][1];
            expect(attributes).to.have.property('buildNum', get('pkg.buildNum'));
          });
        });

        it('should resolve version to pkg.version config', function () {
          return upgrade(configSavedObjects).then(function () {
            const options = savedObjectsClient.create.args[0][2];
            expect(options).to.have.property('id', get('pkg.version'));
          });
        });
      });
    });

    it('should resolve with undefined if the current version is found', function () {
      const configSavedObjects = [ { id: '4.0.1' } ];
      return upgrade(configSavedObjects).then(function (resp) {
        expect(resp).to.be(undefined);
      });
    });

    it('should create new config if the nothing is upgradeable', function () {
      get.withArgs('pkg.buildNum').returns(9833);
      savedObjectsClient.create.returns(Promise.resolve({ id: 1, version: 1 }));

      const configSavedObjects = [ { id: '4.0.1-alpha3' }, { id: '4.0.1-beta1' }, { id: '4.0.0-SNAPSHOT1' } ];
      return upgrade(configSavedObjects).then(function () {
        sinon.assert.calledOnce(savedObjectsClient.create);
        const savedObjectType = savedObjectsClient.create.args[0][0];
        expect(savedObjectType).to.eql('config');
        const attributes = savedObjectsClient.create.args[0][1];
        expect(attributes).to.have.property('buildNum', 9833);
        const options = savedObjectsClient.create.args[0][2];
        expect(options).to.have.property('id', '4.0.1');
      });
    });

    it('should update the build number on the new config', function () {
      get.withArgs('pkg.buildNum').returns(5801);
      savedObjectsClient.create.returns(Promise.resolve({ id: 1, version: 1 }));

      const configSavedObjects = [ { id: '4.0.0', attributes: { buildNum: 1 } } ];

      return upgrade(configSavedObjects).then(function () {
        sinon.assert.calledOnce(savedObjectsClient.create);
        const attributes = savedObjectsClient.create.args[0][1];
        expect(attributes).to.have.property('buildNum', 5801);
        const savedObjectType = savedObjectsClient.create.args[0][0];
        expect(savedObjectType).to.eql('config');
        const options = savedObjectsClient.create.args[0][2];
        expect(options).to.have.property('id', '4.0.1');
      });
    });

    it('should log a message for upgrades', function () {
      get.withArgs('pkg.buildNum').returns(5801);
      savedObjectsClient.create.returns(Promise.resolve({ id: 1, version: 1 }));

      const configSavedObjects = [ { id: '4.0.0', attributes: { buildNum: 1 } } ];

      return upgrade(configSavedObjects).then(function () {
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
      savedObjectsClient.create.returns(Promise.resolve({ id: 1, version: 1 }));

      const configSavedObjects = [ { id: '4.0.0', attributes: { buildNum: 1, defaultIndex: 'logstash-*' } } ];

      return upgrade(configSavedObjects).then(function () {
        sinon.assert.calledOnce(savedObjectsClient.create);
        const attributes = savedObjectsClient.create.args[0][1];
        expect(attributes).to.have.property('defaultIndex', 'logstash-*');
      });
    });
  });
});
