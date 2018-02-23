import { fork } from 'child_process';
import { safeChildProcess } from './safe_child_process';

// When we fork the child_process we need to use a different debug port
// if we're using `--inspect` et al. The following code is heavily borrowed
// from the cluster module in NodeJS 6.12.x and when we upgrade to 8.x it
// will likely need to be updated, as they changed the arguments...
const getExecArgv = () => {
  if (!process.version.match(/^v6./)) {
    throw new Error('Unable to determine execArgv for the gatekeeper process with the version of NodeJS');
  }

  const debugArgvRE = /^(--inspect|--debug|--debug-(brk|port))(=\d+)?$/;
  let debugPort = 0;
  const execArgv = [...process.execArgv];

  for (let i = 0; i < execArgv.length; i++) {
    const match = execArgv[i].match(debugArgvRE);

    if (match) {
      if (debugPort === 0) {
        debugPort = process.debugPort + 100;
      }

      execArgv[i] = match[1] + '=' + debugPort;
    }
  }
  return execArgv;
};

export function spawnGatekeeper(validProcesses) {
  const childProcess = fork(require.resolve('./gatekeeper'), [validProcesses.join(',')], {
    execArgv: getExecArgv()
  });

  safeChildProcess(childProcess);
  return childProcess;
}