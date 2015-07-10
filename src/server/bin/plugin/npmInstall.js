var Promise = require('bluebird');
var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;

module.exports = function (dest, logger) {
  return new Promise(function (resolve, reject) {
    //throw an exception if package.json does not exist
    try {
      var packageFile = path.join(dest, 'package.json');
      fs.statSync(packageFile);
    } catch (e) {
      if (e.code !== 'ENOENT')
        throw e;

      return reject(new Error('Plugin does not contain package.json file'));
    }

    var cmd = (process.env.NPM) ? process.env.NPM : 'npm';
    cmd += ' install';

    var child = exec(cmd, { cwd: dest });
    child.on('error', function (err) {
      reject(err);
    });
    child.on('exit', function (code, signal) {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error('npm install failed.'));
      }
    });

    logger.error(child.stderr);
    logger.log(child.stdout);
  });
};