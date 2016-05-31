let expect = require('expect.js');
let sinon = require('sinon');
let Status = require('../Status');
let ServerStatus = require('../ServerStatus');

describe('Status class', function () {

  const plugin = {id: 'test', version: '1.2.3'};

  let server;
  let serverStatus;

  beforeEach(function () {
    server = { expose: sinon.stub(), log: sinon.stub() };
    serverStatus = new ServerStatus(server);
  });

  it('should have an "uninitialized" state initially', function () {
    expect(serverStatus.create(plugin)).to.have.property('state', 'uninitialized');
  });

  it('emits change when the status is set', function (done) {
    let status = serverStatus.create(plugin);

    status.once('change', function (prev, prevMsg) {
      expect(status.state).to.be('green');
      expect(status.message).to.be('GREEN');
      expect(prev).to.be('uninitialized');

      status.once('change', function (prev, prevMsg) {
        expect(status.state).to.be('red');
        expect(status.message).to.be('RED');
        expect(prev).to.be('green');
        expect(prevMsg).to.be('GREEN');

        done();
      });

      status.red('RED');
    });

    status.green('GREEN');
  });

  it('should only trigger the change listener when something changes', function () {
    let status = serverStatus.create(plugin);
    let stub = sinon.stub();
    status.on('change', stub);
    status.green('Ready');
    status.green('Ready');
    status.red('Not Ready');
    sinon.assert.calledTwice(stub);
  });

  it('should create a JSON representation of the status', function () {
    let status = serverStatus.create(plugin);
    status.green('Ready');

    let json = status.toJSON();
    expect(json.name).to.eql(plugin.id);
    expect(json.version).to.eql(plugin.version);
    expect(json.state).to.eql('green');
    expect(json.message).to.eql('Ready');
  });

  function testState(color) {
    it(`should change the state to ${color} when #${color}() is called`, function () {
      let status = serverStatus.create(plugin);
      let message = 'testing ' + color;
      status[color](message);
      expect(status).to.have.property('state', color);
      expect(status).to.have.property('message', message);
    });

    it(`should trigger the "change" listner when #${color}() is called`, function (done) {
      let status = serverStatus.create(plugin);
      let message = 'testing ' + color;
      status.on('change', function (prev, prevMsg) {
        expect(status.state).to.be(color);
        expect(status.message).to.be(message);

        expect(prev).to.be('uninitialized');
        expect(prevMsg).to.be('uninitialized');
        done();
      });
      status[color](message);
    });

    it(`should trigger the "${color}" listner when #${color}() is called`, function (done) {
      let status = serverStatus.create(plugin);
      let message = 'testing ' + color;
      status.on(color, function (prev, prevMsg) {
        expect(status.state).to.be(color);
        expect(status.message).to.be(message);
        done();
      });
      status[color](message);
    });
  }

  testState('green');
  testState('yellow');
  testState('red');

});
