import { transformDeprecations } from './transform_deprecations';

export default function (kbnServer, server) {
  transformDeprecations(kbnServer.settings, (message) => {
    server.log(['warning', 'config', 'deprecation'], message);
  });
}
