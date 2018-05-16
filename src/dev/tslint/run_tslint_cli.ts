import { readFileSync } from 'fs';
import { extname, join, resolve } from 'path';

import { createToolingLog } from '@kbn/dev-utils';
import execa from 'execa';
import getopts from 'getopts';

import { getTsProjects } from './projects';

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
    for (const project of getTsProjects()) {
      log.info('[tslint/%s] ...\n', project.getName());

      const result = execa.sync(
        'tslint',
        [...process.argv.slice(2), '--project', project.getTsConfigPath()],
        {
          reject: false,
          stdio: 'inherit',
        }
      );

      if (result.failed) {
        process.exitCode = 1;
        log.warning('[tslint/%s]', project.getName());
      } else {
        log.success('[tslint/%s]', project.getName());
      }
    }
  }
}
