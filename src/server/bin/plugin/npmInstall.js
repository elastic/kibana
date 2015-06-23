var npm = require('npm');
var path = require('path');
var Promise = require('bluebird');

module.exports = function (dest) {
  return new Promise(function (resolve, reject) {
    //var cwd = process.cwd();
    npm.load(function (err) {
      process.chdir(dest);

      var blah = path.join(dest, 'package.json');
      npm.commands.install([blah], function (er, data) {
        if (er) {
          console.error(er);
        }
        //process.chdir(cwd);
      });
      npm.on('log', function (message) {
        console.log(message);
      });
    });
  });
};