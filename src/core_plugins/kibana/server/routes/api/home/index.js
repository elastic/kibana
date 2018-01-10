import { registerTutorials } from './register_tutorials';

export function homeApi(server) {
  registerTutorials(server);
}
