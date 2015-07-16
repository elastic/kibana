var expect = require('expect.js');
var sinon = require('sinon');
var status = require('../../../../../src/server/lib/status');
var Status = require('../../../../../src/server/lib/status/status');

describe('lib/status/index.js', function () {

  var plugin, yellowSpy;
  beforeEach(function () {
    plugin = {
      name: 'test',
      server: { expose: sinon.stub(), log: sinon.stub() }
    };
    yellowSpy = sinon.spy(Status.prototype, 'yellow');
  });

  afterEach(function () {
    Status.prototype.yellow.restore();
  });

  it('should create a new status for a plugin', function () {
    status.createStatus(plugin);
    expect(status.data).to.have.property('test');
    expect(status.data.test).to.eql(plugin.status);
  });

  it('should attach a logger to the change status', function () {
    status.createStatus(plugin);
    plugin.status.green('Ready!');
    sinon.assert.calledOnce(plugin.server.log);
  });

  it('should serialize the statuses when toJSON is called', function () {
    status.createStatus(plugin);
    expect(JSON.stringify(status)).to.eql(JSON.stringify(status.data));
  });

});
