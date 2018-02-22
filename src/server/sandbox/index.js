import { spawn } from 'child_process';

export function initializeSandbox(kbnServer) {
  kbnServer.spawnChildProcess = (command, args) => {
    return spawn(command, args);
  };
}

export function sandboxMixin(kbnServer, server) {
  server.decorate('server', 'spawnChildProcess', kbnServer.spawnChildProcess);
}