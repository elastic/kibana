import util from 'util';
import url from 'url';
import { get, size, pick } from 'lodash';
import { readFileSync } from 'fs';
import Bluebird from 'bluebird';

const readFile = (file) => readFileSync(file, 'utf8');

export function parseConfig(serverConfig = {}) {
  const config = Object.assign({
    keepAlive: true
  }, pick(serverConfig, [
    'plugins', 'apiVersion', 'keepAlive', 'pingTimeout',
    'requestTimeout', 'log', 'logQueries'
  ]));

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
  config.ssl = { rejectUnauthorized: get(serverConfig, 'ssl.verify') };

  if (get(serverConfig, 'ssl.cert') && get(serverConfig, 'ssl.key')) {
    config.ssl.cert = readFile(serverConfig.ssl.cert);
    config.ssl.key = readFile(serverConfig.ssl.key);
  }

  if (size(get(serverConfig, 'ssl.ca'))) {
    config.ssl.ca = serverConfig.ssl.ca.map(readFile);
  }

  config.defer = () => Bluebird.defer();

  return config;
}
