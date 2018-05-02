import { KIBANA_FTR_SCRIPT, PROJECT_ROOT } from './paths';

export async function runFtr({
  procs,
  configPath,
  bail,
  logLevel = 'debug',
  cwd = PROJECT_ROOT,
}) {
  const args = [KIBANA_FTR_SCRIPT, `--${getLogLevel(logLevel)}`];

  if (bail) args.push('--bail');
  if (configPath) args.push('--config', configPath);

  await procs.run('ftr', {
    cmd: 'node',
    args,
    cwd,
    wait: true,
  });
}

function getLogLevel(level) {
  return level === 'error' ? 'quiet' : level;
}
