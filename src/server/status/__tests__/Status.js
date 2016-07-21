var expect = require('expect.js');
var sinon = require('sinon');
var Status = require('../Status');
var ServerStatus = require('../ServerStatus');

describe('Status class', function () {

  var server;
  var serverStatus;

  beforeEach(function () {
    server = { expose: sinon.stub(), log: sinon.stub() };
    serverStatus = new ServerStatus(server);
  });

  it('should have an "uninitialized" state initially', function () {
    expect(serverStatus.create('test')).to.have.property('state', 'uninitialized');
  });

  it('emits change when the status is set', function (done) {
    var status = serverStatus.create('test');

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
    var status = serverStatus.create('test');
    var stub = sinon.stub();
    status.on('change', stub);
    status.green('Ready');
    status.green('Ready');
    status.red('Not Ready');
    sinon.assert.calledTwice(stub);
  });

  it('should create a JSON representation of the status', function () {
    var status = serverStatus.create('test');
    status.green('Ready');

    var json = status.toJSON();
    expect(json.state).to.eql('green');
    expect(json.message).to.eql('Ready');
  });

  function testState(color) {
    it(`should change the state to ${color} when #${color}() is called`, function () {
      var status = serverStatus.create('test');
      var message = 'testing ' + color;
      status[color](message);
      expect(status).to.have.property('state', color);
      expect(status).to.have.property('message', message);
    });

    it(`should trigger the "change" listner when #${color}() is called`, function (done) {
      var status = serverStatus.create('test');
      var message = 'testing ' + color;
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
      var status = serverStatus.create('test');
      var message = 'testing ' + color;
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
