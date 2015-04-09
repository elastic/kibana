var Promise = require('bluebird');
var good = require('good');
var path = require('path');
var join = path.join;
var Console = require('./good_reporters/console');

var reporters = [
  {
    reporter: Console,
    args: [{ ops: '*', log: '*', response: '*', error: '*' }, { json: false }]
  }
];

module.exports = function (server) {
  return new Promise(function (resolve, reject) {
    server.register({
      register: good,
      options: {
        opsInterval: 5000,
        logRequestHeaders: true,
        logResponsePayload: true,
        reporters: reporters
      }
    }, function (err) {
      if (err) return reject(err);
      resolve(server);
    });
  });
};
