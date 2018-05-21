import { resolve } from 'path';

import { createToolingLog } from '@kbn/dev-utils';
import chalk from 'chalk';
import execa from 'execa';
import getopts from 'getopts';
import Listr from 'listr';

import { Project, PROJECTS } from '../typescript';

class LintFailure {
  constructor(public project: Project, public error: execa.ExecaError) {}
}

export function runTslintCli() {
  const log = createToolingLog('info');
  log.pipe(process.stdout);

  const opts = getopts(process.argv.slice(2));

  if (!opts.format) {
    process.argv.push('--format', 'stylish');
  }

  const list = new Listr(
    PROJECTS.filter(project => {
      if (!opts.project) {
        return true;
      }

      return resolve(opts.project) === project.tsConfigPath;
    }).map(project => ({
      task: () =>
        execa(
          'tslint',
          [...process.argv.slice(2), '--project', project.tsConfigPath],
          {
            cwd: project.directory,
            env: chalk.enabled ? { FORCE_COLOR: 'true' } : {},
            stdio: ['ignore', 'pipe', 'pipe'],
          }
        ).catch(error => {
          throw new LintFailure(project, error);
        }),
      title: project.name,
    })),
    {
      concurrent: true,
      exitOnError: false,
    }
  );

  list.run().catch((error: any) => {
    if (!error.errors) {
      log.error('Unhandled execption!');
      log.error(error);
      process.exit(1);
    }

    for (const e of error.errors) {
      if (e instanceof LintFailure) {
        log.write('');
        log.error(`${e.project.name} failed\n${e.error.stdout}`);
      } else {
        log.error(e);
      }
    }
  });
}
