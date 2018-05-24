import { run, combineErrors } from './run';

import * as Eslint from './eslint';
import * as Tslint from './tslint';
import { getFilesForCommit, checkFileCasing } from './precommit_hook';

run(async ({ log }) => {
  const files = await getFilesForCommit();
  const errors = [];

  try {
    await checkFileCasing(log, files);
  } catch (error) {
    errors.push(error);
  }

  for (const Linter of [Eslint, Tslint]) {
    const filesToLint = Linter.pickFilesToLint(log, files);
    if (filesToLint.length > 0) {
      try {
        await Linter.lintFiles(log, filesToLint);
      } catch (error) {
        errors.push(error);
      }
    }
  }

  if (errors.length) {
    throw combineErrors(errors);
  }
});
