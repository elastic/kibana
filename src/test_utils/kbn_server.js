import url from 'url';
import { defaultsDeep, set } from 'lodash';
import { header as basicAuthHeader } from './base_auth';
import { kibanaUser, kibanaServer } from '../../test/shield';
import { esTestServerUrlParts } from '../../test/es_test_server_url_parts';
import KbnServer from '../../src/server/kbn_server';

const SERVER_DEFAULTS = {
  server: {
    autoListen: false,
    xsrf: {
      disableProtection: true
    }
  },
  logging: {
    quiet: true
  },
  plugins: {},
  optimize: {
    enabled: false
  },
  elasticsearch: {
    url: url.format(esTestServerUrlParts),
    username: kibanaServer.username,
    password: kibanaServer.password
  }
};

/**
 * Creates an instance of KbnServer with default configuration
 * tailored for unit tests
 *
 * @param {object} params Any config overrides for this instance
 */
export function createServer(params = {}) {
  params = defaultsDeep({}, params, SERVER_DEFAULTS);
  return new KbnServer(params);
}

/**
 * Creates request configuration with a basic auth header
 */
export function authOptions() {
  const { username, password } = kibanaUser;
  const authHeader = basicAuthHeader(username, password);
  return set({}, 'headers.Authorization', authHeader);
}

/**
 * Makes a request with test headers via hapi server inject()
 *
 * The given options are decorated with default testing options, so it's
 * recommended to use this function instead of using inject() directly whenever
 * possible throughout the tests.
 *
 * @param {KbnServer} kbnServer
 * @param {object}    options Any additional options or overrides for inject()
 * @param {Function}  fn The callback to pass as the second arg to inject()
 */
export function makeRequest(kbnServer, options, fn) {
  options = defaultsDeep({}, authOptions(), options);
  return kbnServer.server.inject(options, fn);
}
