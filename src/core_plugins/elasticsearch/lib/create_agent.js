import url from 'url';
import _ from 'lodash';
const readFile = (file) => require('fs').readFileSync(file, 'utf8');
import http from 'http';
import https from 'https';

module.exports = _.memoize(function (server) {
  const config = server.config();
  const target = url.parse(config.get('elasticsearch.url'));

  if (!/^https/.test(target.protocol)) return new http.Agent();

  const agentOptions = {};

  const verificationMode = config.get('elasticsearch.ssl.verificationMode');
  switch (verificationMode) {
    case 'none':
      agentOptions.rejectUnauthorized = false;
      break;
    case 'certificate':
      agentOptions.rejectUnauthorized = true;

      // by default, NodeJS is checking the server identify
      agentOptions.checkServerIdentity = _.noop;
      break;
    case 'full':
      agentOptions.rejectUnauthorized = true;
      break;
    default:
      throw new Error(`Unknown ssl verificationMode: ${verificationMode}`);
  }

  if (_.size(config.get('elasticsearch.ssl.certificateAuthorities'))) {
    agentOptions.ca = config.get('elasticsearch.ssl.certificateAuthorities').map(readFile);
  }

  // Add client certificate and key if required by elasticsearch
  if (config.get('elasticsearch.ssl.certificate') && config.get('elasticsearch.ssl.key')) {
    agentOptions.cert = readFile(config.get('elasticsearch.ssl.certificate'));
    agentOptions.key = readFile(config.get('elasticsearch.ssl.key'));
    agentOptions.passphrase = config.get('elasticsearch.ssl.keyPassphrase');
  }

  return new https.Agent(agentOptions);
});

// See https://lodash.com/docs#memoize: We use a Map() instead of the default, because we want the keys in the cache
// to be the server objects, and by default these would be coerced to strings as keys (which wouldn't be useful)
module.exports.cache = new Map();
