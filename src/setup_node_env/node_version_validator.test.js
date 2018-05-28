var exec = require('child_process').exec;
var pkg = require('../../package.json');

var REQUIRED_NODE_JS_VERSION = 'v' + pkg.engines.node;
var INVALID_NODE_JS_VERSION = 'v0.10.0';

describe('NodeVersionValidator', function () {

  it('should run the script WITH error', function (done) {
    var processVersionOverwrite = 'Object.defineProperty(process, \'version\', { value: \''
      + INVALID_NODE_JS_VERSION + '\', writable: true });';
    var command = 'node -e "' + processVersionOverwrite + 'require(\'./node_version_validator.js\')"';

    exec(command, { cwd: __dirname }, function (error, stdout, stderr) {
      expect(error.code).toBe(1);
      expect(stderr).toBeDefined();
      expect(stderr).not.toHaveLength(0);
      done();
    });
  });

  it('should run the script WITHOUT error', function (done) {
    var processVersionOverwrite = 'Object.defineProperty(process, \'version\', { value: \''
      + REQUIRED_NODE_JS_VERSION + '\', writable: true });';
    var command = 'node -e "' + processVersionOverwrite + 'require(\'./node_version_validator.js\')"';

    exec(command, { cwd: __dirname }, function (error, stdout, stderr) {
      expect(error).toBeNull();
      expect(stderr).toBeDefined();
      expect(stderr).toHaveLength(0);
      done();
    });
  });
});
