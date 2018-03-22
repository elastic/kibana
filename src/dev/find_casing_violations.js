import glob from 'glob';

import { run } from './run';
import { File } from './file';
import { REPO_ROOT } from './constants';
import { checkFileCasing } from './precommit_hook/check_file_casing';

run(async ({ log }) => {
  const paths = glob.sync('**/*', {
    cwd: REPO_ROOT,
    nodir: true,
    ignore: [
      '**/node_modules/**/*',
      'optimize/**/*',
      '.es/**/*',
      'data/**/*',
    ]
  });

  const files = paths.map(path => new File(path));

  await checkFileCasing(log, files);
});
