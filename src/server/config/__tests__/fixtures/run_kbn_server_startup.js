import { createServer } from '../../../../test_utils/kbn_server';

(async function run() {
  const server = createServer(JSON.parse(process.env.CREATE_SERVER_OPTS));

  // We just need the server to run through startup so that it will
  // log the deprecation messages. Once it has started up we close it
  // to allow the process to exit naturally
  try {
    await server.ready();
  } finally {
    await server.close();
  }

}());
