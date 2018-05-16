import chalk from 'chalk';

import { createToolingLog } from '@kbn/dev-utils';
import execa from 'execa';
import getopts from 'getopts';
import Listr from 'listr';

import { PROJECTS } from '../typescript';

class LintFailure {
  constructor(
    public project: typeof PROJECTS[0],
    public error: execa.ExecaError
  ) {}
}

export function runTslintCli() {
  const log = createToolingLog('info');
  log.pipe(process.stdout);

  const opts = getopts(process.argv.slice(2));

  if (!opts.format) {
    process.argv.push('--format', 'stylish');
  }

  if (opts.project) {
    require('tslint/bin/tslint');
  } else {
    const tasks = PROJECTS.map(project => ({
      task: () =>
        execa(
          'tslint',
          [...process.argv.slice(2), '--project', project.getTsConfigPath()],
          {
            cwd: project.getDirectory(),
            env: chalk.enabled ? { FORCE_COLOR: 'true' } : {},
            stdio: ['ignore', 'pipe', 'pipe'],
          }
        ).catch(error => {
          throw new LintFailure(project, error);
        }),
      title: project.getName(),
    }));

    const list = new Listr(tasks as any, {
      concurrent: true,
      exitOnError: false,
    });

    list.run().catch((error: any) => {
      if (!error.errors) {
        log.error('Unhandled execption!');
        log.error(error);
        process.exit(1);
      }

      for (const e of error.errors) {
        if (e instanceof LintFailure) {
          log.write('');
          log.error(`${e.project.getName()} failed\n${e.error.stdout}`);
        } else {
          log.error(e);
        }
      }
    });
  }
}
