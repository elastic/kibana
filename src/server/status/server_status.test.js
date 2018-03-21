import { find } from 'lodash';
import sinon from 'sinon';

import * as states from './states';
import Status from './status';
import ServerStatus from './server_status';

describe('ServerStatus class', function () {
  const plugin = { id: 'name', version: '1.2.3' };

  let server;
  let serverStatus;

  beforeEach(function () {
    server = { expose: sinon.stub(), log: sinon.stub() };
    serverStatus = new ServerStatus(server);
  });

  describe('#create(id)', () => {
    it('should create a new plugin with an id', () => {
      const status = serverStatus.create('someid');
      expect(status).toBeInstanceOf(Status);
    });
  });

  describe('#createForPlugin(plugin)', function () {
    it('should create a new status by plugin', function () {
      const status = serverStatus.createForPlugin(plugin);
      expect(status).toBeInstanceOf(Status);
    });
  });

  describe('#get(id)', () => {
    it('exposes statuses by their id', () => {
      const status = serverStatus.create('statusid');
      expect(serverStatus.get('statusid')).toBe(status);
    });

    it('does not get the status for a plugin', () => {
      serverStatus.createForPlugin(plugin);
      expect(serverStatus.get(plugin)).toBe(undefined);
    });
  });

  describe('#getForPluginId(plugin)', function () {
    it('exposes plugin status for the plugin', function () {
      const status = serverStatus.createForPlugin(plugin);
      expect(serverStatus.getForPluginId(plugin.id)).toBe(status);
    });

    it('does not get plain statuses by their id', function () {
      serverStatus.create('someid');
      expect(serverStatus.getForPluginId('someid')).toBe(undefined);
    });
  });

  describe('#getState(id)', function () {
    it('should expose the state of a status by id', function () {
      const status = serverStatus.create('someid');
      status.green();
      expect(serverStatus.getState('someid')).toBe('green');
    });
  });

  describe('#getStateForPluginId(plugin)', function () {
    it('should expose the state of a plugin by id', function () {
      const status = serverStatus.createForPlugin(plugin);
      status.green();
      expect(serverStatus.getStateForPluginId(plugin.id)).toBe('green');
    });
  });

  describe('#overall()', function () {
    it('considers each status to produce a summary', function () {
      const status = serverStatus.createForPlugin(plugin);

      expect(serverStatus.overall().state).toBe('uninitialized');

      const match = function (overall, state) {
        expect(overall).toHaveProperty('state', state.id);
        expect(overall).toHaveProperty('title', state.title);
        expect(overall).toHaveProperty('icon', state.icon);
        expect(state.nicknames).toContain(overall.nickname);
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
      const pluginOne = { id: 'one', version: '1.0.0' };
      const pluginTwo = { id: 'two', version: '2.0.0' };

      const service = serverStatus.create('some service');
      const p1 = serverStatus.createForPlugin(pluginOne);
      const p2 = serverStatus.createForPlugin(pluginTwo);

      service.green();
      p1.yellow();
      p2.red();

      const json = JSON.parse(JSON.stringify(serverStatus));
      expect(json).toHaveProperty('overall');
      expect(json.overall.state).toEqual(serverStatus.overall().state);
      expect(json.statuses).toHaveLength(3);

      const out = status => find(json.statuses, { id: status.id });
      expect(out(service)).toHaveProperty('state', 'green');
      expect(out(p1)).toHaveProperty('state', 'yellow');
      expect(out(p2)).toHaveProperty('state', 'red');
    });
  });

});
