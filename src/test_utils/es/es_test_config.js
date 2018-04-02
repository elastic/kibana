import { format as formatUrl, url } from 'url';
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
    let testEsProtocol;
    let testEsHostname;
    let testEsPort;
    let testEsUsername;
    let testEsPassword;

    // Allow setting one complete TEST_ES_URL for Es like https://elastic:changeme@myCloudInstance:9200
    if (process.env.TEST_ES_URL) {
      testEsUrl = url.parse(process.env.TEST_ES_URL);
      testEsProtocol = testEsUrl.protocol;
      testEsHostname = testEsUrl.hostname;
      testEsPort = parseInt(testEsUrl.port, 10);
      testEsUsername = testEsUrl.username;
      testEsPassword = testEsUrl.password;
    } else {
      // Allow setting any individual component(s) of the URL,
      // or use default values (username and password from shield.js)
      testEsProtocol = process.env.TEST_ES_PROTOCOL || 'http';
      testEsHostname = process.env.TEST_ES_HOSTNAME || 'localhost';
      testEsPort = parseInt(process.env.TEST_ES_PORT, 10) || 9220;
      testEsUsername = process.env.TEST_ES_USERNAME || admin.username;
      testEsPassword = process.env.TEST_ES_PASSWORD || admin.password;
    }



    return {
      protocol: testEsProtocol,
      hostname: testEsHostname,
      port: testEsPort,
      auth: testEsUsername + ':' + testEsPassword,
      username: testEsUsername,
      password: testEsPassword,
    };
  }
};
