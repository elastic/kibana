import url, { format as formatUrl } from 'url';
import pkg from '../../../../package.json';
import { adminTestUser } from '../kbn';

export const esTestConfig = new class EsTestConfig {
  getVersion() {
    return process.env.TEST_ES_BRANCH || pkg.version;
  }

  getPort() {
    return this.getUrlParts().port;
  }

  getUrl() {
    return formatUrl(this.getUrlParts());
  }

  getBuildFrom() {
    return process.env.TEST_ES_FROM || 'snapshot';
  }

  getUrlParts() {
    // Allow setting one complete TEST_ES_URL for Es like https://elastic:changeme@myCloudInstance:9200
    if (process.env.TEST_ES_URL) {
      const testEsUrl = url.parse(process.env.TEST_ES_URL);
      return {
        // have to remove the ":" off protocol
        protocol: testEsUrl.protocol.slice(0, -1),
        hostname: testEsUrl.hostname,
        port: parseInt(testEsUrl.port, 10),
        username: testEsUrl.auth.split(':')[0],
        password: testEsUrl.auth.split(':')[1],
        auth: testEsUrl.auth,
      };
    }

    const username = process.env.TEST_KIBANA_USERNAME || adminTestUser.username;
    const password = process.env.TEST_KIBANA_PASSWORD || adminTestUser.password;
    return {
      // Allow setting any individual component(s) of the URL,
      // or use default values (username and password from ../kbn/users.js)
      protocol: process.env.TEST_ES_PROTOCOL || 'http',
      hostname: process.env.TEST_ES_HOSTNAME || 'localhost',
      port: parseInt(process.env.TEST_ES_PORT, 10) || 9220,
      auth: username + ':' + password,
      username: username,
      password: password,
    };
  }
}();
