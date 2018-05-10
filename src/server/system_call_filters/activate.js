import sandbox from '@kbn/sandbox';
import { transformDeprecations, Config } from '../config';

async function defaultConfig(settings) {
  return await Config.withDefaultSchema(
    transformDeprecations(settings)
  );
}

export async function activate(kbnServer) {
  const config = await defaultConfig(kbnServer.settings);
  if (config.get('systemCallFilters.enabled') === false) {
    return;
  }

  const result = sandbox.activate();
  if (!result.success) {
    throw new Error(`Unable to activate the sandbox. ${result.message}`);
  }
}
