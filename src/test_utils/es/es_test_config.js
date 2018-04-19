import { resolve } from 'path';
import url, {  format as formatUrl } from 'url';
import pkg from '../../../package.json';
import { admin } from '../../../test/shield';

const SECOND = 1000;
const MINUTE = 60 * SECOND;

export const esTestConfig = new class EsTestConfig {
  getLibesvmStartTimeout() {
    return process.env.TEST_ES_STARTUP_TIMEOUT || (5 * MINUTE);
  }

  getDirectoryForEsvm(uniqueSubDir) {
    if (!uniqueSubDir) {
      throw new Error('getDirectoryForEsvm() requires uniqueSubDir');
    }

    return resolve(__dirname, '../../../esvm', uniqueSubDir);
  }

  getBranch() {
    return process.env.TEST_ES_BRANCH || pkg.branch;
  }

  getPort() {
    return this.getUrlParts().port;
  }

  getUrl() {
    return formatUrl(this.getUrlParts());
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
        auth: testEsUrl.auth
      };
    }

    const username = process.env.TEST_KIBANA_USERNAME || admin.username;
    const password = process.env.TEST_KIBANA_PASSWORD || admin.password;
    return {
      // Allow setting any individual component(s) of the URL,
      // or use default values (username and password from shield.js)
      protocol: process.env.TEST_ES_PROTOCOL || 'http',
      hostname: process.env.TEST_ES_HOSTNAME || 'localhost',
      port: parseInt(process.env.TEST_ES_PORT, 10) || 9220,
      auth: `${username}:${password}`,
      username: username,
      password: password,
    };

  }
};
