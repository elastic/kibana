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
      consoleLog('\n');
      consoleLog(chalk.bold('⚠️  An unknown error occurred  ⚠️'));
      consoleLog(e.message);
      consoleLog(
        chalk.italic(
          `Please check the logs for addtional details: ${getLogfilePath()}`
        )
      );
      logger.info('Unknown error:', e);
    }

    // wait exiting until logs have been flushed to disc
    logger.on('finish', () => {
      process.exit(1);
    });
  }
}
