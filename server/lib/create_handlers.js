import { partial } from 'lodash';

export const createHandlers = (request, server) => {
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');

  return {
    environment: 'server',
    serverUri: server.info.uri,
    httpHeaders: request.headers,
    elasticsearchClient: partial(callWithRequest, request),
  };
};
