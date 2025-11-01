/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import globby from 'globby';
import path from 'path';
import fs from 'fs';
import os from 'os';

import { getKibanaDir } from '#pipeline-utils';

function main() {
  const timeStart = Date.now();
  const [outputDir = fs.mkdtempSync(os.tmpdir())] = process.argv.slice(2);
  const copyPromises: Promise<any>[] = [];
  const repoRoot = getKibanaDir();

  globby
    .stream(['**/tsconfig.type_check.tsbuildinfo'], {
      followSymbolicLinks: false,
      cwd: repoRoot,
      absolute: true,
      ignore: ['**/node_modules/**', '**/build/**', outputDir],
    })
    .on('data', async (p) => {
      const typesFolder = path.dirname(p.toString());
      const targetDestinationPath = path.join(outputDir, path.relative(repoRoot, typesFolder));
      if (fs.existsSync(targetDestinationPath)) {
        await fs.promises.mkdir(targetDestinationPath, { recursive: true });
      }
      const copyPromise = fs.promises
        .cp(typesFolder, targetDestinationPath, { force: true, recursive: true })
        .then(() => {
          console.log('Copied:\t', typesFolder);
        });
      copyPromises.push(copyPromise);
    })
    .on('error', (err) => {
      // Handle error
      console.error(err);
    })
    .on('end', () => {
      // Finished
      console.log('Finished finding target folders. Waiting for copies to finish...');
      Promise.all(copyPromises)
        .then(() => {
          const timeEnd = Date.now();
          const durationMs = timeEnd - timeStart;
          console.log(`Copied ${copyPromises.length} target folders in ${durationMs}ms.`);
          console.log('All copies finished: ', outputDir);
        })
        .catch((err) => {
          console.error('Error during copy:', err);
        });
    });
}

if (process.argv.includes('--help')) {
  console.log(`
  Usage: ts-node copyTsTargetFolders.ts [outputDir]

  Copies all TypeScript target folders to the specified output directory.
  If no output directory is provided, a temporary directory will be used.

  Example:
    ts-node copyTsTargetFolders.ts /path/to/output/dir
  `);
  process.exit(0);
} else {
  main();
}
