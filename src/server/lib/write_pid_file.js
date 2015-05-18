var fs = require('fs');
var Promise = require('bluebird');
module.exports = function (server) {
  return new Promise(function (resolve, reject) {
    var config = server.config();
    var pidFile = config.get('kibana.server.pidFile');
    if (!pidFile) return resolve(server);
    fs.writeFile(pidFile, process.pid, function (err) {
      if (err) {
        server.log('error', { err: err });
        return reject(err);
      }
      resolve(server);
    });
  });
};
