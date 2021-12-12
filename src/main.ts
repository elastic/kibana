import chalk from 'chalk';
import { ConfigOptions } from './options/ConfigOptions';
import { getOptions } from './options/options';
import { runWithOptions, Result } from './runWithOptions';
import { HandledError } from './services/HandledError';
import { getLogfilePath } from './services/env';
import { initLogger, consoleLog, redact } from './services/logger';

export type BackportResponse = {
  success: boolean;
  results: Result[];
  errorMessage?: string;
  error?: Error;
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
    if (e instanceof HandledError) {
      consoleLog(e.message);

      return {
        success: false,
        results: [],
        errorMessage: redact(e.message),
        error: e,
      };
    } else if (e instanceof Error) {
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

      return {
        success: false,
        results: [],
        errorMessage: `An unhandled error occurred: ${redact(e.message)}`,
        error: e,
      };
    }

    return {
      success: false,
      results: [],
      errorMessage: 'Unknown error',
      error: new Error('Unknown error'),
    };
  }
}
