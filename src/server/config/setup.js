import { Config } from './config';
import { transformDeprecations } from './transform_deprecations';

export default function (kbnServer) {
  const settings = transformDeprecations(kbnServer.settings);
  kbnServer.config = Config.withDefaultSchema(settings);
}
