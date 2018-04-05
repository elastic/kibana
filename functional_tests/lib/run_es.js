import fs from 'fs';
import { resolve } from 'path';

import { log } from './log';
import { extractTarball } from './tarball';
import { findMostRecentlyChanged } from './find_most_recently_changed';
import {
  RELATIVE_ES_BIN,
  ES_GRADLE_WRAPPER_BIN,
  ES_ARCHIVE_PATTERN,
  ES_REPO_ROOT,
} from './paths';

async function setupEs({ esExtractPath, procs }) {
  await procs.run('buildEs', {
    cmd: ES_GRADLE_WRAPPER_BIN,
    args: [':distribution:archives:tar:assemble'],
    cwd: ES_REPO_ROOT,
    wait: true,
  });

  const esTarballPath = findMostRecentlyChanged(ES_ARCHIVE_PATTERN);
  log.debug('es build output %j', esTarballPath);

  await extractTarball(esTarballPath, esExtractPath);
}

export async function runEs({ tmpDir, procs, config }) {
  const esExtractPath = resolve(tmpDir, 'es');
  if (!fs.existsSync(esExtractPath)) {
    await setupEs({ esExtractPath, procs });
  }

  await procs.run('es', {
    cmd: RELATIVE_ES_BIN,
    args: [
      '-E', `http.port=${config.get('servers.elasticsearch.port')}`,
    ],
    cwd: esExtractPath,
    wait: /^\[.+?\]\[.+?\]\[.+?\] \[.+?\] started$/
  });
}
