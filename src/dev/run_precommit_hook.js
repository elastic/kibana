import { run } from './run';

import { lintFiles, pickFilesToLint } from './eslint';
import { getFilesForCommit, checkFileCasing } from './precommit_hook';

run(async ({ log }) => {
  const files = await getFilesForCommit();
  await checkFileCasing(log, files);
  await lintFiles(log, pickFilesToLint(log, files));
});
