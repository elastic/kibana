import { partial } from 'lodash';

export const createHandlers = (socket, server) => {
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');

  return {
    environment: 'server',
    elasticsearchClient: partial(callWithRequest, socket.handshake),
  };
};
