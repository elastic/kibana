import {
  createGetRoute,
  createUpdateRoute,
  createDeleteRoute
} from './routes';

export function tagsMixin(kbnServer, server) {
  server.route(createGetRoute(server));
  server.route(createUpdateRoute(server));
  server.route(createDeleteRoute(server));
}
