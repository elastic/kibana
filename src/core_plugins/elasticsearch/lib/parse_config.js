import util from 'util';
import url from 'url';
import { get, noop, size, pick } from 'lodash';
import { readFileSync } from 'fs';
import Bluebird from 'bluebird';

const readFile = (file) => readFileSync(file, 'utf8');
const readBinaryFile = (file) => readFileSync(file);

export function parseConfig(serverConfig = {}) {
  const config = {
    keepAlive: true,
    ...pick(serverConfig, [
      'plugins', 'apiVersion', 'keepAlive', 'pingTimeout',
      'requestTimeout', 'log', 'logQueries'
    ])
  };

  const uri = url.parse(serverConfig.url);
  config.host = {
    host: uri.hostname,
    port: uri.port,
    protocol: uri.protocol,
    path: uri.pathname,
    query: uri.query,
    headers: serverConfig.customHeaders
  };

  // Auth
  if (serverConfig.auth !== false && serverConfig.username && serverConfig.password) {
    config.host.auth = util.format('%s:%s', serverConfig.username, serverConfig.password);
  }

  // SSL
  config.ssl = {};

  const verificationMode = get(serverConfig, 'ssl.verificationMode');
  switch (verificationMode) {
    case 'none':
      config.ssl.rejectUnauthorized = false;
      break;
    case 'certificate':
      config.ssl.rejectUnauthorized = true;

      // by default, NodeJS is checking the server identify
      config.ssl.checkServerIdentity = noop;
      break;
    case 'full':
      config.ssl.rejectUnauthorized = true;
      break;
    default:
      throw new Error(`Unknown ssl verificationMode: ${verificationMode}`);
  }

  if (size(get(serverConfig, 'ssl.certificateAuthorities'))) {
    config.ssl.ca = serverConfig.ssl.certificateAuthorities.map(readFile);
  }

  // Add client certificate and key if required by elasticsearch
  const keystoreConfig = get(serverConfig, 'ssl.keystore.path');
  const pemConfig = get(serverConfig, 'ssl.certificate');

  if (keystoreConfig && pemConfig) {
    throw new Error(
      `Invalid Configuration: please specify either "elasticsearch.ssl.keystore.path" or "elasticsearch.ssl.certificate", not both.`
    );
  }

  if (keystoreConfig) {
    config.ssl.pfx = readBinaryFile(keystoreConfig);
    config.ssl.passphrase = get(serverConfig, 'ssl.keystore.password');
  } else if (pemConfig && get(serverConfig, 'ssl.key')) {
    config.ssl.cert = readFile(pemConfig);
    config.ssl.key = readFile(serverConfig.ssl.key);
    config.ssl.passphrase = serverConfig.ssl.keyPassphrase;
  }

  config.defer = () => Bluebird.defer();

  return config;
}
