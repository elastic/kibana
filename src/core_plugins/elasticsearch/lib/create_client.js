import url from 'url';
import util from 'util';
import elasticsearch from 'elasticsearch';
import Bluebird from 'bluebird';
import { readFileSync } from 'fs';

const readFile = (file) => readFileSync(file, 'utf8');

export default function (optionOverrides) {
  const options = Object.assign({ keepAlive: true, auth: true }, optionOverrides);

  const uri = url.parse(options.url);

  if (options.auth && options.username && options.password) {
    uri.auth = util.format('%s:%s', options.username, options.password);
  }

  const ssl = { rejectUnauthorized: options.ssl.verify };

  if (options.ssl.cert && options.ssl.key) {
    ssl.cert = readFile(options.ssl.cert);
    ssl.key = readFile(options.ssl.key);
  }

  if (options.ssl.ca) {
    ssl.ca = options.ssl.ca.map(readFile);
  }

  const host = {
    host: uri.hostname,
    port: uri.port,
    protocol: uri.protocol,
    path: uri.pathname,
    auth: uri.auth,
    query: uri.query,
    headers: options.customHeaders
  };

  return new elasticsearch.Client({
    host,
    ssl,
    plugins: options.plugins,
    apiVersion: options.apiVersion,
    keepAlive: options.keepAlive,
    pingTimeout: options.pingTimeout,
    requestTimeout: options.requestTimeout,
    defer: function () {
      return Bluebird.defer();
    },
    log: options.log
  });
}
