import { execFileSync } from 'child_process';
import { resolve } from 'path';

const kibanaDir = resolve(__dirname, '..', '..');
const docsIndexFile = resolve(kibanaDir, 'docs', 'index.asciidoc');
const docsToolDir = resolve(kibanaDir, '..', 'docs');
const docsToolCmd = resolve(docsToolDir, 'build_docs.pl');

const args = process.argv.slice(2);

try {
  execFileSync(docsToolCmd, ['--doc', docsIndexFile, '--chunk=1', ...args]);
} catch (err) {
  if (err.code === 'ENOENT') {
    console.error(`elastic/docs repo must be cloned to ${docsToolDir}`);
  } else {
    console.error(err.stack);
  }

  process.exit(1);
}
