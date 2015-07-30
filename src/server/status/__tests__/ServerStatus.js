var _ = require('lodash');
var expect = require('expect.js');
var sinon = require('sinon');

var states = require('../states');
var Status = require('../Status');
var ServerStatus = require('../ServerStatus');

describe('ServerStatus class', function () {
  var server;
  var serverStatus;

  beforeEach(function () {
    server = { expose: sinon.stub(), log: sinon.stub() };
    serverStatus = new ServerStatus(server);
  });

  describe('#create(name)', function () {
    it('should create a new status by name', function () {
      var status = serverStatus.create('name');
      expect(status).to.be.a(Status);
    });
  });

  describe('#get(name)', function () {
    it('exposes plugins by name', function () {
      var status = serverStatus.create('name');
      expect(serverStatus.get('name')).to.be(status);
    });
  });

  describe('#getState(name)', function () {
    it('should expose the state of the plugin by name', function () {
      var status = serverStatus.create('name');
      status.green();
      expect(serverStatus.getState('name')).to.be('green');
    });
  });

  describe('#overall()', function () {
    it('considers each status to produce a summary', function () {
      var status = serverStatus.create('name');

      expect(serverStatus.overall().state).to.be('uninitialized');

      var match = function (overall, state) {
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
      var one = serverStatus.create('one');
      var two = serverStatus.create('two');
      var three = serverStatus.create('three');

      one.green();
      two.yellow();
      three.red();

      var obj = JSON.parse(JSON.stringify(serverStatus));
      expect(obj).to.have.property('overall');
      expect(obj.overall.state).to.eql(serverStatus.overall().state);
      expect(obj.statuses).to.have.length(3);

      var outs = _.indexBy(obj.statuses, 'name');
      expect(outs.one).to.have.property('state', 'green');
      expect(outs.two).to.have.property('state', 'yellow');
      expect(outs.three).to.have.property('state', 'red');
    });
  });

});
