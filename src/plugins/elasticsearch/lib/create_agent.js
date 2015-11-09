var url = require('url');
var _ = require('lodash');
var readFile = (file) => require('fs').readFileSync(file, 'utf8');
var http = require('http');
var https = require('https');

module.exports = _.memoize(function (server) {
  var config = server.config();
  var target = url.parse(config.get('elasticsearch.url'));

  if (!/^https/.test(target.protocol)) return new http.Agent();

  var agentOptions = {
    rejectUnauthorized: config.get('elasticsearch.ssl.verify')
  };

  if (_.size(config.get('elasticsearch.ssl.ca'))) {
    agentOptions.ca = config.get('elasticsearch.ssl.ca').map(readFile);
  }

  // Add client certificate and key if required by elasticsearch
  if (config.get('elasticsearch.ssl.enabled')) {
    agentOptions.cert = readFile(config.get('elasticsearch.ssl.cert'));
    agentOptions.key = readFile(config.get('elasticsearch.ssl.key'));
  }

  return new https.Agent(agentOptions);
});

// See https://lodash.com/docs#memoize: We use a Map() instead of the default, because we want the keys in the cache
// to be the server objects, and by default these would be coerced to strings as keys (which wouldn't be useful)
module.exports.cache = new Map();
