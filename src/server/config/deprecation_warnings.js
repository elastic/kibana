import { transformDeprecations } from './transform_deprecations';

export function configDeprecationWarningsMixin(kbnServer, server) {
  transformDeprecations(kbnServer.settings, (message) => {
    server.log(['warning', 'config', 'deprecation'], message);
  });
}
