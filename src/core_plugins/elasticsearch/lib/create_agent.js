import url from 'url';
import _ from 'lodash';
const readFile = (file) => require('fs').readFileSync(file, 'utf8');
import http from 'http';
import https from 'https';

module.exports = _.memoize(function (config) {
  const target = url.parse(_.get(config, 'url'));

  if (!/^https/.test(target.protocol)) return new http.Agent();

  const agentOptions = {
    rejectUnauthorized: _.get(config, 'ssl.verify')
  };

  if (_.size(_.get(config, 'ssl.ca'))) {
    agentOptions.ca = _.get(config, 'ssl.ca').map(readFile);
  }

  // Add client certificate and key if required by elasticsearch
  if (_.get(config, 'ssl.cert') && _.get(config, 'ssl.key')) {
    agentOptions.cert = readFile(_.get(config, 'ssl.cert'));
    agentOptions.key = readFile(_.get(config, 'ssl.key'));
  }

  return new https.Agent(agentOptions);
});

// See https://lodash.com/docs#memoize: We use a Map() instead of the default, because we want the keys in the cache
// to be the server objects, and by default these would be coerced to strings as keys (which wouldn't be useful)
module.exports.cache = new Map();
