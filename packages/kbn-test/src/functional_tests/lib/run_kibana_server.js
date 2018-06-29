import { resolve } from 'path';
import { KIBANA_ROOT, KIBANA_EXEC, KIBANA_EXEC_PATH } from './paths';

export async function runKibanaServer({ procs, config, options }) {
  const { installDir } = options;

  await procs.run('kibana', {
    cmd: getKibanaCmd(installDir),
    args: collectCliArgs(config, options),
    env: {
      FORCE_COLOR: 1,
      ...process.env,
    },
    cwd: installDir || KIBANA_ROOT,
    wait: /Server running/,
  });
}

function getKibanaCmd(installDir) {
  if (installDir) {
    return process.platform.startsWith('win')
      ? resolve(installDir, 'bin/kibana.bat')
      : resolve(installDir, 'bin/kibana');
  }

  return KIBANA_EXEC;
}

/* When installDir is passed, we run from a built version of Kibana,
 * which uses different command line arguments. If installDir is not
 * passed, we run from source code. We also allow passing in extra
 * Kibana server options, so we tack those on here.
 */
function collectCliArgs(config, { installDir, extraKbnOpts }) {
  const buildArgs = config.get('kbnTestServer.buildArgs') || [];
  const sourceArgs = config.get('kbnTestServer.sourceArgs') || [];
  const serverArgs = config.get('kbnTestServer.serverArgs') || [];

  return pipe(
    serverArgs,
    args => (installDir ? args.filter(a => a !== '--oss') : args),
    args => {
      return installDir
        ? [...args, ...buildArgs]
        : [KIBANA_EXEC_PATH, ...args, ...sourceArgs];
    },
    args => args.concat(extraKbnOpts || [])
  );
}

/*
 * Apply each function in fns to the result of the
 * previous function. The first function's input
 * is the arr array.
 */
function pipe(arr, ...fns) {
  return fns.reduce((acc, fn) => {
    return fn(acc);
  }, arr);
}
