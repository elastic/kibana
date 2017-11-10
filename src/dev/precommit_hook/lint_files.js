import { fork } from 'child_process';

import { CLIEngine } from 'eslint';

import { DEFAULT_ESLINT_PATHS } from '../eslint/default_eslint_paths';
import { createFailError } from './fail';

const RUN_ESLINT_SCRIPT = require.resolve('../../../scripts/eslint');

export async function lintFiles(log, files) {
  // convert the paths we usually pass to eslint
  // into globs so that we can test the files against that list
  const cli = new CLIEngine();
  const sourcePathGlobs = cli.resolveFileGlobPatterns(DEFAULT_ESLINT_PATHS);

  const filesToLint = files.filter(file => {
    // a file is normally linted if it is selected by the
    // `DEFAULT_ESLINT_PATHS`, which are passed to eslint
    // when scripts/eslint is executed without arguments.
    const isNormallyLinted = file.matchesAnyGlob(sourcePathGlobs);

    // a file is explicitly ignored when it is normally
    // linted but also matched by one of the globs in
    // the .eslintignore file
    const isExplicitlyIgnored = isNormallyLinted && cli.isPathIgnored(file.getRelativePath());


    if (isNormallyLinted && !isExplicitlyIgnored) {
      return true;
    }

    // warn about modified JS files that are not being linted
    if (file.isJs() && !isNormallyLinted) {
      log.warning(`${file} not selected by src/eslint/default_eslint_paths`);
    }

    // warn about modified JS files that are explicitly excluded from linting
    if (file.isJs() && isExplicitlyIgnored) {
      log.info(`${file} ignored by .eslintignore`);
    }

    return false;
  });

  if (!filesToLint.length) {
    return;
  }

  const exitCode = await new Promise((resolve, reject) => {
    const args = filesToLint.map(file => file.getRelativePath());
    const opts = {
      stdio: 'inherit'
    };

    fork(RUN_ESLINT_SCRIPT, args, opts)
      .once('error', reject)
      .once('exit', resolve);
  });

  if (exitCode) {
    throw createFailError(`eslint exitted with code ${exitCode}`, exitCode);
  }

  log.success(`${filesToLint.length} files linted successfully`);
}
