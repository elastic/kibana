import sandbox from 'sandbox';
import uuid from 'uuid';
import { spawnGatekeeper } from './spawn_gatekeeper';
import { SyntheticProcess } from './synthetic_process';
import { GatekeeperChannel } from './gatekeeper_channel';
import { getValidProcesses } from './get_valid_processes';

let spawnChildProcess;

export async function initializeSandbox(kbnServer) {
  const validProcesses = await getValidProcesses(kbnServer.settings);
  const gatekeeperProcess = spawnGatekeeper(validProcesses);
  gatekeeperProcess.on('exit', (code, signal) => {
    throw new Error(`The gatekeeper exited with code ${code} after receiving signal ${signal || ''}, terminating parent process`);
  });

  const result = sandbox.activate();
  if (!result.success) {
    console.warn(`Unable to activate the sandbox. ${result.message}`);
    // throw new Error(`Unable to activate the sandbox. ${result.message}`);
  }

  spawnChildProcess = async (command, args) => {
    const channel = new GatekeeperChannel(gatekeeperProcess, uuid.v4());
    return await SyntheticProcess.spawn(channel, command, args);
  };
}

export function sandboxMixin(kbnServer, server) {
  if (!spawnChildProcess) {
    throw new Error('initializeSandbox must be called before the sandboxMixin');
  }

  server.decorate('server', 'spawnChildProcess', spawnChildProcess);
}