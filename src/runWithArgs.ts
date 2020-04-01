import { getOptions } from './options/options';
import { runWithOptions } from './runWithOptions';
import { HandledError } from './services/HandledError';
import { initLogger } from './services/logger';
import { getLogfilePath } from './services/env';
import chalk from 'chalk';

export async function runWithArgs(args: string[]) {
  const logger = initLogger();

  try {
    const options = await getOptions(args);
    await runWithOptions(options);
  } catch (e) {
    if (e instanceof HandledError) {
      console.error(e.message);
    } else {
      console.error('\n');
      console.error(chalk.bold('⚠️  An unknown error occurred  ⚠️'));
      console.error(e.message);
      console.error(
        chalk.italic(
          `Please check the logs for addtional details: ${getLogfilePath()}`
        )
      );
      logger.info('Unknown error:');
      logger.info(e);
      logger.info(e.stack);
    }

    // wait exiting until logs have been flushed to disc
    logger.on('finish', () => {
      process.exit(1);
    });
  }
}
