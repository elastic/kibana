import { find } from 'lodash';
import expect from 'expect.js';
import sinon from 'sinon';

import states from '../states';
import Status from '../status';
import ServerStatus from '../server_status';

describe('ServerStatus class', function () {
  const plugin = {id: 'name', version: '1.2.3'};

  let server;
  let serverStatus;

  beforeEach(function () {
    server = { expose: sinon.stub(), log: sinon.stub() };
    serverStatus = new ServerStatus(server);
  });

  describe('#create(id)', () => {
    it('should create a new plugin with an id', () => {
      const status = serverStatus.create('someid');
      expect(status).to.be.a(Status);
    });
  });

  describe('#createForPlugin(plugin)', function () {
    it('should create a new status by plugin', function () {
      let status = serverStatus.createForPlugin(plugin);
      expect(status).to.be.a(Status);
    });
  });

  describe('#get(id)', () => {
    it('exposes statuses by their id', () => {
      const status = serverStatus.create('statusid');
      expect(serverStatus.get('statusid')).to.be(status);
    });

    it('does not get the status for a plugin', () => {
      serverStatus.createForPlugin(plugin);
      expect(serverStatus.get(plugin)).to.be(undefined);
    });
  });

  describe('#getForPluginId(plugin)', function () {
    it('exposes plugin status for the plugin', function () {
      let status = serverStatus.createForPlugin(plugin);
      expect(serverStatus.getForPluginId(plugin.id)).to.be(status);
    });

    it('does not get plain statuses by their id', function () {
      serverStatus.create('someid');
      expect(serverStatus.getForPluginId('someid')).to.be(undefined);
    });
  });

  describe('#getState(id)', function () {
    it('should expose the state of a status by id', function () {
      let status = serverStatus.create('someid');
      status.green();
      expect(serverStatus.getState('someid')).to.be('green');
    });
  });

  describe('#getStateForPluginId(plugin)', function () {
    it('should expose the state of a plugin by id', function () {
      let status = serverStatus.createForPlugin(plugin);
      status.green();
      expect(serverStatus.getStateForPluginId(plugin.id)).to.be('green');
    });
  });

  describe('#overall()', function () {
    it('considers each status to produce a summary', function () {
      let status = serverStatus.createForPlugin(plugin);

      expect(serverStatus.overall().state).to.be('uninitialized');

      let match = function (overall, state) {
        expect(overall).to.have.property('state', state.id);
        expect(overall).to.have.property('title', state.title);
        expect(overall).to.have.property('icon', state.icon);
        expect(overall).to.have.property('icon', state.icon);
        expect(state.nicknames).contain(overall.nickname);
      };

      status.green();
      match(serverStatus.overall(), states.get('green'));

      status.yellow();
      match(serverStatus.overall(), states.get('yellow'));

      status.red();
      match(serverStatus.overall(), states.get('red'));
    });
  });


  describe('#toJSON()', function () {
    it('serializes to overall status and individuals', function () {
      const pluginOne = {id: 'one', version: '1.0.0'};
      const pluginTwo = {id: 'two', version: '2.0.0'};

      let service = serverStatus.create('some service');
      let p1 = serverStatus.createForPlugin(pluginOne);
      let p2 = serverStatus.createForPlugin(pluginTwo);

      service.green();
      p1.yellow();
      p2.red();

      let json = JSON.parse(JSON.stringify(serverStatus));
      expect(json).to.have.property('overall');
      expect(json.overall.state).to.eql(serverStatus.overall().state);
      expect(json.statuses).to.have.length(3);

      const out = status => find(json.statuses, { id: status.id });
      expect(out(service)).to.have.property('state', 'green');
      expect(out(p1)).to.have.property('state', 'yellow');
      expect(out(p2)).to.have.property('state', 'red');
    });
  });

});
