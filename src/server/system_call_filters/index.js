import sandbox from '@kbn/sandbox';
import { transformDeprecations, Config } from '../config';

function defaultConfig(settings) {
  return Config.withDefaultSchema(
    transformDeprecations(settings)
  );
}

export async function activate(kbnServer) {
  const config = defaultConfig(kbnServer.settings);
  // Darwin doesn't support system call filtering/sandboxing so we don't do anything here
  // we can also explicitly disable them in the settings
  if (process.platform === 'darwin' || config.get('server.systemCallFilters.enabled') === false) {
    return;
  }

  const result = sandbox.activate();
  if (!result.success) {
    throw new Error(`Unable to activate the sandbox. ${result.message}`);
  }
}

export async function warnIfDanger(kbnServer, server, config) {
  if (config.get('server.systemCallFilters.enabled') === false) {
    server.log(['system-call-filters', 'warning'], 'Running with disabled system call filters is dangerous.');
  }
}
