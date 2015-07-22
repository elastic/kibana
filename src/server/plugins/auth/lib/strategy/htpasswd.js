var fs = require('fs');
var Promise = require('bluebird');
var htpasswd = require('htpasswd');

var users = {};
var initialized;

module.exports = {
  init: function (server) {
    var config = server.config();
    var path = config.get('kibana.server.auth.htpasswd');

    initialized = Promise.promisify(fs.readFile)(path).then(function (data) {
      var lines = String(data)
        .replace(/\\r\\n/g, '\n')
        .split('\n');

      lines.forEach(function (line) {
        var parts = line.split(':');
        if (parts.length !== 2) return;

        var username = parts.shift();
        var hash = parts.shift();
        users[username] = hash;
      });
    });
  },
  authenticate: function (request, username, password) {
    return isValid(username, password).then(function () {
      return {
        username: username,
        password: password
      };
    });
  },
  validate: function (request, session) {
    return isValid(session.username, session.password);
  }
};

function isValid(username, password) {
  return initialized.then(function () {
    var hash = users[username];
    if (hash == null || !htpasswd.verify(hash, password)) return Promise.reject(false);
    return Promise.resolve(true);
  });
}