import { resolve } from 'path';

import { createServer } from '../../../test_utils/kbn_server';

export async function startupKibana({ port, esUrl }) {
  const server = createServer({
    server: {
      port,
      autoListen: true,
    },

    plugins: {
      scanDirs: [
        resolve(__dirname, '../../../core_plugins')
      ],
    },

    elasticsearch: {
      url: esUrl
    }
  });

  await server.ready();
  return server;
}
