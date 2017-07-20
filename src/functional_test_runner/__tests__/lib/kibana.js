import { createServerWithCorePlugins } from '../../../test_utils/kbn_server';

export async function startupKibana({ port, esUrl }) {
  const server = createServerWithCorePlugins({
    server: {
      port,
      autoListen: true,
    },

    elasticsearch: {
      url: esUrl
    }
  });

  await server.ready();
  return server;
}
