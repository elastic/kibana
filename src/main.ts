import chalk from 'chalk';
import { ConfigOptions } from './options/ConfigOptions';
import { getOptions } from './options/options';
import { runWithOptions, Result } from './runWithOptions';
import { HandledError } from './services/HandledError';
import { getLogfilePath } from './services/env';
import { initLogger, consoleLog, redact } from './services/logger';

export type BackportResponse =
  | {
      success: boolean;
      results: Result[];
    }
  | {
      success: boolean;
      results: Result[];
      isUnhandledError: boolean;
      errorMessage: string;
      error: Error;
    };

export async function main(
  argv: string[],
  optionsFromModule?: ConfigOptions
): Promise<BackportResponse> {
  const logger = initLogger();

  try {
    const options = await getOptions(argv, optionsFromModule);
    const results = await runWithOptions(options);
    return {
      success: results.every((res) => res.success),
      results,
    };
  } catch (e) {
    const isUnhandledError = !(e instanceof HandledError);
    if (!isUnhandledError) {
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

    return {
      success: false,
      results: [],
      isUnhandledError,
      errorMessage: isUnhandledError
        ? 'An unhandled error occurred. Please see the logs for additional details'
        : redact(e.message),
      error: e,
    };
  }
}
