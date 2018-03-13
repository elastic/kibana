import { fork } from 'child_process';
import { safeChildProcess } from './safe_child_process';


let debugPortOffset = 1;

// When we fork the child_process we need to use a different debug port
// if we're using `--inspect` et al. The following code is heavily borrowed
// from the cluster module in NodeJS 6.12.x and when we upgrade to 8.x it
// will likely need to be updated, as they changed the arguments...
const getExecArgv = () => {
  if (!process.version.match(/^v8./)) {
    throw new Error('Unable to determine execArgv for the gatekeeper process with the version of NodeJS');
  }

  const debugArgRegex = /--inspect(?:-brk|-port)?|--debug-port/;

  const execArgv = [...process.execArgv];

  if (execArgv.some((arg) => arg.match(debugArgRegex))) {
    const inspectPort = process.debugPort + debugPortOffset;
    debugPortOffset++;

    execArgv.push(`--inspect-port=${inspectPort}`);
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