import { fork } from 'child_process';
import { transformDeprecations, Config } from '../config';

function defaultConfig(settings) {
  return Config.withDefaultSchema(
    transformDeprecations(settings)
  );
}


let debugPortOffset = 100;

// When we fork the child_process we need to use a different debug port
// if we're using `--inspect` et al. The following code is heavily borrowed
// from the cluster module in NodeJS 8.x and when we upgrade it
// will likely need to be updated, as they changed the arguments...
const getExecArgv = () => {
  if (!process.version.match(/^v8./)) {
    throw new Error('Unable to determine execArgv for the native controller start process with the version of NodeJS');
  }

  const nodeOptions = process.env.NODE_OPTIONS ? process.env.NODE_OPTIONS : '';
  const debugArgRegex = /--inspect(?:-brk|-port)?|--debug-port/;

  const execArgv = [...process.execArgv];

  if (execArgv.some((arg) => arg.match(debugArgRegex)) || nodeOptions.match(debugArgRegex)) {
    const inspectPort = process.debugPort + debugPortOffset;
    debugPortOffset++;

    execArgv.push(`--inspect-port=${inspectPort}`);
  }

  return execArgv;
};

export function spawnNativeController(settings, nativeControllerPath, nativeControllerConfig = []) {

  const config = defaultConfig(settings);

  const configParams = nativeControllerConfig.reduce((acc, key) => {
    return [...acc, `${key}=${config.get(key)}`];
  }, []);

  return fork(require.resolve('./native_controller_start.js'), [nativeControllerPath, ...configParams], {
    execArgv: getExecArgv()
  });
}
