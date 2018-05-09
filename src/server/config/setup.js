import { Config } from './config';
import { transformDeprecations } from './transform_deprecations';

export default async function (kbnServer) {
  const settings = transformDeprecations(kbnServer.settings);
  kbnServer.config = await Config.withDefaultSchema(settings);
}
