import { resolve } from 'path';
import { EsProvider } from '../../../../../test/common/services/es';
import { EsArchiverProvider } from '../../../../../test/common/services/es_archiver';

export default () => ({
  testFiles: [
    resolve(__dirname, 'tests.js')
  ],

  services: {
    es: EsProvider,
    esArchiver: EsArchiverProvider,
  },

  esArchiver: {
    directory: resolve(__dirname, 'archives')
  },

  servers: {
    elasticsearch: {
      protocol: 'http',
      hostname: 'localhost',
      port: 5700
    },
    kibana: {
      protocol: 'http',
      hostname: 'localhost',
      port: 5701
    }
  }
});
