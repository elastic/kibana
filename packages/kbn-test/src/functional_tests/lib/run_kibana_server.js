import { resolve } from 'path';
import { KIBANA_ROOT, KIBANA_EXEC, KIBANA_EXEC_PATH } from './paths';

export async function runKibanaServer({ procs, config, options }) {
  const { installDir } = options;

  await procs.run('kibana', {
    cmd: getKibanaCmd(installDir),
    args: getCliArgs(config, options),
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

function getCliArgs(config, { devMode, installDir }) {
  const buildArgs = config.get('kbnTestServer.buildArgs') || [];
  const sourceArgs = config.get('kbnTestServer.sourceArgs') || [];
  const serverArgs = config.get('kbnTestServer.serverArgs') || [];

  if (devMode) serverArgs.push('--dev');

  return installDir
    ? [...serverArgs, ...buildArgs]
    : [KIBANA_EXEC_PATH, ...serverArgs, ...sourceArgs];
}
