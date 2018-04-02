import { readFileSync, writeFileSync } from 'fs';
import { resolve, relative } from 'path';

import getopts from 'getopts';
import dedent from 'dedent';

import { REPO_ROOT } from '../constants';
import { generateNoticeText } from './generate_notice_text';

const NOTICE_PATH = resolve(REPO_ROOT, 'NOTICE.txt');

(async function run() {
  const opts = getopts(process.argv.slice(2), {
    boolean: [
      'help'
    ]
  });

  if (opts.help) {
    process.stdout.write('\n' + dedent`
      Regenerate or validate NOTICE.txt.

        Entries in NOTICE.txt are collected by finding all multi-line comments
        that start with a "@notice" tag and copying their text content into
        NOTICE.txt at the root of the repository.

      Options:
        --help       Show this help info
        --frozen     Don't write the NOTICE.txt, just fail if updates would have been made
    ` + '\n\n');
    process.exit(1);
  }

  const newText = await generateNoticeText();
  if (!opts.frozen) {
    writeFileSync(NOTICE_PATH, newText, 'utf8');
    return;
  }

  const currentText = readFileSync(NOTICE_PATH, 'utf8');
  if (currentText === newText) {
    return;
  }

  console.error(
    `${relative(process.cwd(), NOTICE_PATH)} is out of date, run \`node scripts/notice\` to update the file and commit the results.`
  );

  process.exit(1);
}()).catch(error => {
  console.error('FATAL ERROR', error.stack || error.message);
  process.exit(1);
});
