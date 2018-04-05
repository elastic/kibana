import sandbox from '@kbn/sandbox';
import { transformDeprecations, Config } from '../config';

function defaultConfig(settings) {
  return Config.withDefaultSchema(
    transformDeprecations(settings)
  );
}

export async function activate(kbnServer) {
  return;

  const config = defaultConfig(kbnServer.settings);
  // if we explicitly disabled the system call filters
  if (config.get('server.systemCallFilters.enabled') === false) {
    return;
  }

  // system call filters not currently enabled for OSX, we don't
  // support OS X in production, so we're alright with this limitation
  if (process.platform === 'darwin') {
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
