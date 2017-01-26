import Config from './config';
import { transformDeprecations } from './transform_deprecations';

module.exports = function (kbnServer) {
  const settings = transformDeprecations(kbnServer.settings);
  kbnServer.config = Config.withDefaultSchema(settings);
};
