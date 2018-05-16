import { run } from './run';

import * as Eslint from './eslint';
import * as Tslint from './tslint';
import { getFilesForCommit, checkFileCasing } from './precommit_hook';

run(async ({ log }) => {
  const files = await getFilesForCommit();
  await checkFileCasing(log, files);

  for (const Linter of [Eslint, Tslint]) {
    const filesToLint = Linter.pickFilesToLint(log, files);
    if (filesToLint.length > 0) {
      await Linter.lintFiles(log, filesToLint);
    }
  }
});
