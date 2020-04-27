import chalk from 'chalk';
import { getOptions } from './options/options';
import { runWithOptions } from './runWithOptions';
import { HandledError } from './services/HandledError';
import { getLogfilePath } from './services/env';
import { initLogger, consoleLog } from './services/logger';

export async function runWithArgs(args: string[]) {
  const logger = initLogger();

  try {
    const options = await getOptions(args);
    await runWithOptions(options);
  } catch (e) {
    if (e instanceof HandledError) {
      consoleLog(e.message);
    } else {
      // output
      consoleLog('\n');
      consoleLog(chalk.bold('⚠️  Ouch! An unknown error occured 😿'));
      consoleLog(`Error message: ${e.message}`);

      consoleLog(
        'Please open an issue in https://github.com/sqren/backport/issues or contact me directly on https://twitter.com/sorenlouv'
      );

      consoleLog(
        chalk.italic(`For additional details see the logs: ${getLogfilePath()}`)
      );

      // log file
      logger.info('Unknown error:', e);
    }
  }
}
