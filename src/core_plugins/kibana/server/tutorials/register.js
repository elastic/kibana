import { apacheSpecProvider } from './apache';

export function registerTutorials(server) {
  server.registerTutorial(apacheSpecProvider);
}
