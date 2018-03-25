import { registerRelationships } from './saved_objects/relationships';

export function managementApi(server) {
  registerRelationships(server);
}
