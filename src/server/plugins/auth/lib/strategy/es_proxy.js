var _ = require('lodash');
var btoa = require('btoa');
var Promise = require('bluebird');
var util = require('util');

var client;
var status = 'red';

module.exports = {
  init: function (server) {
    client = server.plugins.elasticsearch.client;
    status = 'red';
    server.plugins.elasticsearch.status.on('change', function (current) {
      status = current.state;
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
    // TODO: Is it overkill to make this request on every request? What else can we do?
    return isValid(session.username, session.password).then(function () {
      _.assign(request.headers, getAuthHeader(session.username, session.password));
      return true;
    });
  }
};

function isValid(username, password) {
  return Promise.try(function () {
    if (status !== 'green') throw new Error('Elasticsearch client is not ready.');

    return client.info({
      headers: getAuthHeader(username, password)
    });
  });
}

function getAuthHeader(username, password) {
  var auth = btoa(util.format('%s:%s', username, password));
  return {'Authorization': util.format('Basic %s', auth)};
}