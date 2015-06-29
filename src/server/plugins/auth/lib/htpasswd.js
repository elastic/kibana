var fs = require('fs');
var htpasswd = require('htpasswd');

module.exports = function (path) {
  var users = {};

  fs.readFile(path, function (error, data) {
    if (error) return; // TODO: Handle this error

    var lines = String(data)
      .replace(/\\r\\n/g, '\n')
      .split('\n');

    lines.forEach(function (line) {
      var parts = line.split(':');
      if (parts.length !== 2) return; // TODO: Handle this error

      var username = parts.shift();
      var hash = parts.shift();
      users[username] = hash;
    });
  });

  return function isValid(username, password) {
    var hash = users[username];
    if (hash == null) return false;

    return htpasswd.verify(hash, password);
  };
};