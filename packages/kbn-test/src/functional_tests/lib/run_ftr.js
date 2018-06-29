import { KIBANA_FTR_SCRIPT, PROJECT_ROOT } from './paths';

export async function runFtr({
  procs,
  configPath,
  cwd = PROJECT_ROOT,
  options: { log, bail, grep, updateBaselines },
}) {
  const args = [KIBANA_FTR_SCRIPT];

  if (getLogFlag(log)) args.push(`--${getLogFlag(log)}`);
  if (bail) args.push('--bail');
  if (configPath) args.push('--config', configPath);
  if (grep) args.push('--grep', grep);
  if (updateBaselines) args.push('--updateBaselines');

  await procs.run('ftr', {
    cmd: 'node',
    args,
    cwd,
    wait: true,
  });
}

function getLogFlag(log) {
  const level = log.getLevel();

  if (level === 'info') return null;
  return level === 'error' ? 'quiet' : level;
}
