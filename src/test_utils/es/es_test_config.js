import { format as formatUrl } from 'url';
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
    return {
      protocol: process.env.TEST_ES_PROTOCOL || 'http',
      hostname: process.env.TEST_ES_HOSTNAME || 'localhost',
      port: parseInt(process.env.TEST_ES_PORT, 10) || 9220,
      auth: admin.username + ':' + admin.password,
      username: admin.username,
      password: admin.password,
    };
  }
};
