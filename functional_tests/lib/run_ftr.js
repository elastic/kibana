import {
  KIBANA_FTR_SCRIPT,
  PROJECT_ROOT
} from './paths';

export async function runFtr({ procs, configPath, cwd = PROJECT_ROOT }) {
  const args = [KIBANA_FTR_SCRIPT, '--debug'];
  if (configPath) {
    args.push(...['--config', configPath]);
  }

  await procs.run('ftr', {
    cmd: 'node',
    args,
    cwd,
    wait: true
  });
}
