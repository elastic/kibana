var glob = require('glob');
var Promise = require('bluebird');

module.exports = function (path, server) {
  return new Promise(function (resolve, reject) {
    glob(path, function (err, files) {
      if (err) return reject(err);
      var modules = files.map(require);
      modules.forEach(function (fn) {
        fn(server);
      });
      resolve(modules);
    });
  });
};
