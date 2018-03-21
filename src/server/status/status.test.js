import sinon from 'sinon';
import ServerStatus from './server_status';

describe('Status class', function () {
  const plugin = { id: 'test', version: '1.2.3' };

  let server;
  let serverStatus;

  beforeEach(function () {
    server = { expose: sinon.stub(), log: sinon.stub() };
    serverStatus = new ServerStatus(server);
  });

  it('should have an "uninitialized" state initially', () => {
    expect(serverStatus.createForPlugin(plugin)).toHaveProperty('state', 'uninitialized');
  });

  it('emits change when the status is set', function (done) {
    const status = serverStatus.createForPlugin(plugin);

    status.once('change', function (prevState, prevMsg, newState, newMsg) {
      expect(newState).toBe('green');
      expect(newMsg).toBe('GREEN');
      expect(prevState).toBe('uninitialized');

      status.once('change', function (prevState, prevMsg, newState, newMsg) {
        expect(newState).toBe('red');
        expect(newMsg).toBe('RED');
        expect(prevState).toBe('green');
        expect(prevMsg).toBe('GREEN');

        done();
      });

      status.red('RED');
    });

    status.green('GREEN');
  });

  it('should only trigger the change listener when something changes', function () {
    const status = serverStatus.createForPlugin(plugin);
    const stub = sinon.stub();
    status.on('change', stub);
    status.green('Ready');
    status.green('Ready');
    status.red('Not Ready');
    sinon.assert.calledTwice(stub);
  });

  it('should create a JSON representation of the status', function () {
    const status = serverStatus.createForPlugin(plugin);
    status.green('Ready');

    const json = status.toJSON();
    expect(json.id).toEqual(status.id);
    expect(json.state).toEqual('green');
    expect(json.message).toEqual('Ready');
  });

  it('should call on handler if status is already matched', function (done) {
    const status = serverStatus.createForPlugin(plugin);
    const msg = 'Test Ready';
    status.green(msg);

    status.on('green', function (prev, prevMsg) {
      expect(arguments.length).toBe(2);
      expect(prev).toBe('green');
      expect(prevMsg).toBe(msg);
      expect(status.message).toBe(msg);
      done();
    });
  });

  it('should call once handler if status is already matched', function (done) {
    const status = serverStatus.createForPlugin(plugin);
    const msg = 'Test Ready';
    status.green(msg);

    status.once('green', function (prev, prevMsg) {
      expect(arguments.length).toBe(2);
      expect(prev).toBe('green');
      expect(prevMsg).toBe(msg);
      expect(status.message).toBe(msg);
      done();
    });
  });

  function testState(color) {
    it(`should change the state to ${color} when #${color}() is called`, function () {
      const status = serverStatus.createForPlugin(plugin);
      const message = 'testing ' + color;
      status[color](message);
      expect(status).toHaveProperty('state', color);
      expect(status).toHaveProperty('message', message);
    });

    it(`should trigger the "change" listner when #${color}() is called`, function (done) {
      const status = serverStatus.createForPlugin(plugin);
      const message = 'testing ' + color;
      status.on('change', function (prev, prevMsg) {
        expect(status.state).toBe(color);
        expect(status.message).toBe(message);

        expect(prev).toBe('uninitialized');
        expect(prevMsg).toBe('uninitialized');
        done();
      });
      status[color](message);
    });

    it(`should trigger the "${color}" listner when #${color}() is called`, function (done) {
      const status = serverStatus.createForPlugin(plugin);
      const message = 'testing ' + color;
      status.on(color, function () {
        expect(status.state).toBe(color);
        expect(status.message).toBe(message);
        done();
      });
      status[color](message);
    });
  }

  testState('green');
  testState('yellow');
  testState('red');

});
