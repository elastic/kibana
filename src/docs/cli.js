import { execFileSync } from 'child_process';
import { Command } from 'commander';

import {
  defaultDocsRepoPath,
  buildDocsScript,
  buildDocsArgs
} from './docs_repo';

const cmd = new Command('node scripts/docs');
cmd
  .option('--docrepo [path]', 'local path to the docs repo', defaultDocsRepoPath())
  .option('--open', 'open the docs in the browser', false)
  .parse(process.argv);

try {
  execFileSync(buildDocsScript(cmd), buildDocsArgs(cmd));
} catch (err) {
  if (err.code === 'ENOENT') {
    console.error(`elastic/docs repo must be cloned to ${cmd.docrepo}`);
  } else {
    console.error(err.stack);
  }

  process.exit(1);
}
