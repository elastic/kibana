import { run } from '../../../target/platform/cli/cli';

export function platformMixin(kbnServer, server) {
  let stopPlatform;

  server.decorate('server', 'startPlatform', () => {
    stopPlatform = run({ kbnServer });
  });

  // provide a simple way to expose static files
  server.decorate('server', 'stopPlatform', () => {
    if (stopPlatform) {
      stopPlatform();
    }
  });

  return kbnServer;
}
