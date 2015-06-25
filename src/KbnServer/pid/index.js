var _ = require('lodash');
var Promise = require('bluebird');
var writeFile = Promise.promisify(require('fs').writeFile);
var unlink = require('fs').unlinkSync;

module.exports = Promise.method(function (kibana) {
  var server = kibana.server;
  var config = server.config();

  var path = config.get('kibana.server.pidFile');
  var pid = String(process.pid);
  if (!path) return;

  return writeFile(path, pid, { flag: 'wx' })
  .catch(function (err) {
    if (err.code !== 'EEXIST') throw err;

    server.log(['pid', 'warn'], {
      message: 'pid file already exists at <%= path %>',
      path: path,
      pid: pid
    });

    return writeFile(path, pid);
  })
  .then(function () {

    server.log(['pid', 'debug'], {
      message: 'wrote pid file to <%= path %>',
      path: path,
      pid: pid
    });

    var clean = _.once(function (code) {
      unlink(path);
    });

    process.once('exit', clean); // for "natural" exits
    process.once('SIGINT', function () { // for Ctrl-C exits
      clean();

      // resend SIGINT
      process.kill(process.pid, 'SIGINT');
    });
  });
});
