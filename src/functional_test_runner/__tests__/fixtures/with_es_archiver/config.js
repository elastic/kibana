import { resolve } from 'path';

export default () => ({
  testFiles: [
    resolve(__dirname, 'tests.js')
  ],

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
