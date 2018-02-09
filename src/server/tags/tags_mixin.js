import {
  createGetRoute,
} from './routes';

export function tagsMixin(kbnServer, server) {
  const kibanaIndex = server.config().get('kibana.index');
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
  server.route(createGetRoute(kibanaIndex, callWithRequest));
}
