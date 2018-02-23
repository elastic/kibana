import sandbox from 'sandbox';
import { spawnGatekeeper } from './spawn_gatekeeper';
import { SyntheticProcess } from './synthetic_process';
import { GatekeeperChannel } from './gatekeeper_channel';

let incrementor = 0;
let spawnChildProcess;

export function initializeSandbox(kbnServer) {
  const sandboxProcesses = kbnServer.settings.sandbox && kbnServer.settings.sandbox.processes || [];

  const gatekeeperProcess = spawnGatekeeper(sandboxProcesses);
  gatekeeperProcess.on('exit', (code, signal) => {
    throw new Error(`The gatekeeper exited with code ${code} after receiving signal ${signal || ''}, terminating parent process`);
  });

  const result = sandbox.activate();
  if (!result.success) {
    throw new Error(`Unable to activate the sandbox. ${result.message}`);
  }

  spawnChildProcess = (command, args) => {
    const channel = new GatekeeperChannel(gatekeeperProcess, incrementor++);
    return new SyntheticProcess(channel, command, args);
  };
}

export function sandboxMixin(kbnServer, server) {
  if (!spawnChildProcess) {
    throw new Error('initializeSandbox must be called before the sandboxMixin');
  }

  server.decorate('server', 'spawnChildProcess', spawnChildProcess);
}