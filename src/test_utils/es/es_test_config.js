import url, {  format as formatUrl } from 'url';
import pkg from '../../../package.json';
import { admin } from '../../../test/shield';

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

    let testEsUrl;
    let protocol;
    let hostname;
    let port;
    let username;
    let password;

    // Allow setting one complete TEST_ES_URL for Es like https://elastic:changeme@myCloudInstance:9200
    if (process.env.TEST_ES_URL) {
      testEsUrl = url.parse(process.env.TEST_ES_URL);
      // have to remove the ":" off protocol
      protocol = testEsUrl.protocol.slice(0, -1);
      hostname = testEsUrl.hostname;
      port = parseInt(testEsUrl.port, 10);
      username = testEsUrl.username;
      password = testEsUrl.password;
    } else {
      // Allow setting any individual component(s) of the URL,
      // or use default values (username and password from shield.js)
      protocol = process.env.TEST_ES_PROTOCOL || 'http';
      hostname = process.env.TEST_ES_HOSTNAME || 'localhost';
      port = parseInt(process.env.TEST_ES_PORT, 10) || 9220;
      username = process.env.TEST_ES_USERNAME || admin.username;
      password = process.env.TEST_ES_PASSWORD || admin.password;
    }

    return {
      protocol,
      hostname,
      port,
      auth: username + ':' + password,
      username,
      password,
    };
  }
};
