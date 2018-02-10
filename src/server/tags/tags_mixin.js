import {
  createGetRoute,
  createUpdateRoute
} from './routes';

export function tagsMixin(kbnServer, server) {
  server.route(createGetRoute(server));
  server.route(createUpdateRoute(server));
}
