import { registerRelationships } from './saved_objects/relationships';
import { registerScrollForExportRoute, registerScrollForCountRoute } from './saved_objects/scroll';

export function managementApi(server) {
  registerRelationships(server);
  registerScrollForExportRoute(server);
  registerScrollForCountRoute(server);
}
