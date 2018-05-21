import { run, combineErrors } from './run';

import { lintFiles, pickFilesToLint } from './eslint';
import { getFilesForCommit, checkFileCasing } from './precommit_hook';

run(async ({ log }) => {
  const files = await getFilesForCommit();
  const errors = [];

  try {
    await checkFileCasing(log, files);
  } catch (error) {
    errors.push(error);
  }

  try {
    await lintFiles(log, pickFilesToLint(log, files));
  } catch (error) {
    errors.push(error);
  }

  if (errors.length) {
    throw combineErrors(errors);
  }
});
