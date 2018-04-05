
import {
  KIBANA_FTR_SCRIPT,
  PROJECT_ROOT
} from './paths';

export async function runFtr({ procs, configPath }) {
  const args = [KIBANA_FTR_SCRIPT, '--debug'];
  if (configPath) {
    args.push(...['--config', configPath]);
  }

  await procs.run('ftr', {
    cmd: 'node',
    args,
    cwd: PROJECT_ROOT,
    wait: true
  });
}
