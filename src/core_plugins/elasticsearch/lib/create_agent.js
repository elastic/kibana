import url from 'url';
import _ from 'lodash';
const readFile = (file) => require('fs').readFileSync(file, 'utf8');
import http from 'http';
import https from 'https';

module.exports = _.memoize(function (server) {
  const config = server.config();
  const target = url.parse(config.get('elasticsearch.url'));

  if (!/^https/.test(target.protocol)) return new http.Agent();

  const agentOptions = {
    rejectUnauthorized: config.get('elasticsearch.ssl.verify')
  };

  if (_.size(config.get('elasticsearch.ssl.ca'))) {
    agentOptions.ca = config.get('elasticsearch.ssl.ca').map(readFile);
  }

  // Add client certificate and key if required by elasticsearch
  if (config.get('elasticsearch.ssl.cert') && config.get('elasticsearch.ssl.key')) {
    agentOptions.cert = readFile(config.get('elasticsearch.ssl.cert'));
    agentOptions.key = readFile(config.get('elasticsearch.ssl.key'));
  }

  return new https.Agent(agentOptions);
});

// See https://lodash.com/docs#memoize: We use a Map() instead of the default, because we want the keys in the cache
// to be the server objects, and by default these would be coerced to strings as keys (which wouldn't be useful)
module.exports.cache = new Map();
