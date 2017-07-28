import { format as formatUrl } from 'url';
import { resolve } from 'path';

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
