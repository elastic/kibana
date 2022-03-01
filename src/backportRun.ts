import chalk from 'chalk';
import yargsParser from 'yargs-parser';
import { ConfigFileOptions } from './options/ConfigOptions';
import { getOptions, ValidConfigOptions } from './options/options';
import { runSequentially, Result } from './runSequentially';
import { HandledError } from './services/HandledError';
import { getLogfilePath } from './services/env';
import { createStatusComment } from './services/github/v3/createStatusComment';
import { GithubV4Exception } from './services/github/v4/apiRequestV4';
import { consoleLog, initLogger, logger } from './services/logger';
import { Commit } from './services/sourceCommit/parseSourceCommit';
import { getCommits } from './ui/getCommits';
import { getGitConfigAuthor } from './ui/getGitConfigAuthor';
import { getTargetBranches } from './ui/getTargetBranches';
import { ora } from './ui/ora';
import { setupRepo } from './ui/setupRepo';

export type BackportResponse =
  | {
      status: 'success';
      commits: Commit[];
      results: Result[];
    }
  | {
      status: 'failure';
      commits: Commit[];
      error: Error | HandledError;
      errorMessage: string;
    };

export async function backportRun(
  processArgs: string[],
  optionsFromModule: ConfigFileOptions = {}
): Promise<BackportResponse> {
  const argv = yargsParser(processArgs) as ConfigFileOptions;
  const ci = argv.ci ?? optionsFromModule.ci;
  const logFilePath = argv.logFilePath ?? optionsFromModule.logFilePath;

  initLogger({ ci, logFilePath });

  // don't show spinner for yargs commands that exit the process without stopping the spinner first
  const spinner = ora(ci);

  if (!argv.help && !argv.version && !argv.v) {
    spinner.start('Initializing...');
  }

  let options: ValidConfigOptions | null = null;
  let commits: Commit[] = [];

  try {
    options = await getOptions(processArgs, optionsFromModule);
    logger.info('Backporting options', options);

    spinner.stop();

    commits = await getCommits(options);
    logger.info('Commits', commits);

    if (options.ls) {
      return {
        status: 'success',
        commits,
        results: [],
      };
    }

    const targetBranches = await getTargetBranches(options, commits);
    logger.info('Target branches', targetBranches);

    const [gitConfigAuthor] = await Promise.all([
      getGitConfigAuthor(options),
      setupRepo(options),
    ]);

    const results = await runSequentially({
      options,
      commits,
      targetBranches,
      gitConfigAuthor,
    });
    logger.info('Results', results);

    const backportResponse: BackportResponse = {
      status: 'success',
      commits,
      results,
    };

    await createStatusComment({
      options,
      backportResponse,
    });

    return backportResponse;
  } catch (e) {
    spinner.stop();
    const backportResponse: BackportResponse = {
      status: 'failure',
      commits,
      error: e,
      errorMessage: e.message,
    };

    if (options) {
      await createStatusComment({
        options,
        backportResponse,
      });
    }

    if (e instanceof HandledError || e instanceof GithubV4Exception) {
      consoleLog(e.message);
    } else if (e instanceof Error) {
      // output
      consoleLog('\n');
      consoleLog(chalk.bold('⚠️  Ouch! An unhandled error occured 😿'));
      consoleLog(e.stack ? e.stack : e.message);
      consoleLog(
        'Please open an issue in https://github.com/sqren/backport/issues or contact me directly on https://twitter.com/sorenlouv'
      );

      consoleLog(
        chalk.italic(
          `For additional details see the logs: ${getLogfilePath({
            logFilePath,
          })}`
        )
      );
    }

    logger.error('Unhandled exception', e);
    process.exitCode = 1;

    return backportResponse;
  }
}
