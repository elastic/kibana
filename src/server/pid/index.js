var _ = require('lodash');
var Promise = require('bluebird');
var writeFile = Promise.promisify(require('fs').writeFile);
var unlink = require('fs').unlinkSync;

module.exports = Promise.method(function (kbnServer, server, config) {
  var path = config.get('pid.file');
  if (!path) return;

  var pid = String(process.pid);

  return writeFile(path, pid, { flag: 'wx' })
  .catch(function (err) {
    if (err.code !== 'EEXIST') throw err;

    var log = {
      tmpl: 'pid file already exists at <%= path %>',
      path: path,
      pid: pid
    };

    if (config.get('pid.exclusive')) {
      server.log(['pid', 'fatal'], log);
      process.exit(1);
    } else {
      server.log(['pid', 'warning'], log);
    }

    return writeFile(path, pid);
  })
  .then(function () {

    server.log(['pid', 'debug'], {
      tmpl: 'wrote pid file to <%= path %>',
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
