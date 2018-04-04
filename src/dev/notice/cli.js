import { readFileSync, writeFileSync } from 'fs';
import { resolve, relative } from 'path';

import getopts from 'getopts';
import dedent from 'dedent';
import { createToolingLog, pickLevelFromFlags } from '@kbn/dev-utils';

import { REPO_ROOT } from '../constants';
import { generateNoticeText } from './generate_notice_text';

const NOTICE_PATH = resolve(REPO_ROOT, 'NOTICE.txt');

const unknownFlags = [];
const opts = getopts(process.argv.slice(2), {
  boolean: [
    'help',
    'validate',
    'verbose',
    'debug',
  ],
  unknown(flag) {
    unknownFlags.push(flag);
  }
});

const log = createToolingLog(pickLevelFromFlags(opts));
log.pipe(process.stdout);

if (unknownFlags.length) {
  log.error(`Unknown flags ${unknownFlags.map(f => `"${f}"`).join(',')}`);
  process.exitCode = 1;
  opts.help = true;
}

if (opts.help) {
  process.stdout.write('\n' + dedent`
    Regenerate or validate NOTICE.txt.

      Entries in NOTICE.txt are collected by finding all multi-line comments
      that start with a "@notice" tag and copying their text content into
      NOTICE.txt at the root of the repository.

    Options:
      --help      Show this help info
      --validate  Don't write the NOTICE.txt, just fail if updates would have been made
      --verbose   Set logging level to verbose
      --debug     Set logging level to debug
  ` + '\n\n');
  process.exit();
}

(async function run() {
  log.info('Searching source files for multi-line comments starting with @notify');
  const newText = await generateNoticeText(log);
  if (!opts.validate) {
    log.info('Wrote notice text to', NOTICE_PATH);
    writeFileSync(NOTICE_PATH, newText, 'utf8');
    return;
  }

  const currentText = readFileSync(NOTICE_PATH, 'utf8');
  if (currentText === newText) {
    log.success(NOTICE_PATH, 'is up to date');
    return;
  }

  log.error(
    `${relative(process.cwd(), NOTICE_PATH)} is out of date, run \`node scripts/notice\` to update the file and commit the results.`
  );
  process.exit(1);
}()).catch(error => {
  log.error(error);
  process.exit(1);
});
