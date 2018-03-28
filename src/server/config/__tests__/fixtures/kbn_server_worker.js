import { createServer } from '../../../../test_utils/kbn_server';

const server = createServer(JSON.parse(process.env.CREATE_SERVER_OPTS));

server.ready().then(() => {
  server.close();
});
