import execa from 'execa';
import chalk from 'chalk';

import { watchStdioForLine } from '../../../utils';

export async function exec(log, cmd, args, options = {}) {
  const {
    level = 'debug',
    cwd,
    exitAfter,
  } = options;

  log[level](chalk.dim('$'), cmd, ...args);

  const proc = execa(cmd, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd,
  });

  await watchStdioForLine(proc, line => log[level](line), exitAfter);
}
