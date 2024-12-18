/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import { extract } from 'tar';
import yauzl from 'yauzl';

const packagesDir = path.resolve('./packages');

const tempDir = path.resolve('./temp');
const allRulesDir = path.resolve('./all_rules');

await fs.mkdir(tempDir, { recursive: true });
await fs.mkdir(allRulesDir, { recursive: true });

const files = await fs.readdir(packagesDir);

for (const file of files) {
  if (file.endsWith('.zip')) {
    console.log(`Extracting ${file}`);
    const zipFilePath = path.join(packagesDir, file);

    // Clear the tempDir before unzipping
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.mkdir(tempDir, { recursive: true });

    yauzl.open(zipFilePath, { lazyEntries: true }, function (err, zipfile) {
      if (err) throw err;
      zipfile.readEntry();
      zipfile.on('entry', function (entry) {
        if (!entry.fileName.endsWith('.json')) {
          // Directory file names end with '/'.
          // Note that entries for directories themselves are optional.
          // An entry's fileName implicitly requires its parent directories to exist.
          zipfile.readEntry();
        } else {
          // file entry
          zipfile.openReadStream(entry, function (err, readStream) {
            if (err) throw err;
            readStream.on('end', function () {
              zipfile.readEntry();
            });
            const chunks = [];
            readStream.on('data', (chunk) => chunks.push(chunk));
            readStream.on('end', async () => {
              const jsonData = JSON.parse(Buffer.concat(chunks).toString('utf8'));
              const { rule_id: ruleId, version } = jsonData.attributes;
              const newFileName = `${ruleId}_${version}.json`;
              const newFilePath = path.join(allRulesDir, newFileName);
              await fs.writeFile(newFilePath, JSON.stringify(jsonData, null, 2));
            });
          });
        }
      });
    });
  }
}
