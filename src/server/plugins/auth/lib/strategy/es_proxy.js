var _ = require('lodash');
var btoa = require('btoa');
var Promise = require('bluebird');

module.exports = function (server) {
  var client = server.plugins.elasticsearch.client;

  var status = 'red';
  server.plugins.elasticsearch.status.on('change', function (current) {
    status = current.state;
  });

  function getAuthHeader(username, password) {
    return {'Authorization': 'Basic ' + btoa(username + ':' + password)};
  }

  return {
    authenticate: function (request, username, password) {
      if (status !== 'green') return Promise.reject();

      return client.info({
        headers: getAuthHeader(username, password)
      }).then(function () {
        return {
          username: username,
          password: password
        };
      });
    },
    validate: function (request, session) {
      return Promise.try(function () {
        if (!session.username || !session.password) throw new Error('No username and/or password in session.');
        _.assign(request.headers, getAuthHeader(session.username, session.password));
        return true;
      });
    }
  };
};