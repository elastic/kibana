/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-restricted-syntax */

const patchFs = require('./fs');
// eslint-disable-next-line @kbn/imports/uniform_imports
const { REPO_ROOT } = require('../../platform/packages/shared/kbn-repo-info');

const join = require('path').join;

const DATA_PATH = join(REPO_ROOT, 'data');

const fs = require('fs');
const fsPromises = require('fs/promises');

// 1) Patch the fs module
// ----------------------
const safeFs = patchFs(fs);
const safeFsPromises = patchFs(fsPromises);

function logResult(name, err) {
  if (err) console.log(`${name}: ✗ ${err.message}`);
  else console.log(`${name}: ✓ succeeded`);
}

// Callback-style tests
// ------------------------
console.log('--- callback tests ---');

// 1a) Should succeed
safeFs.writeFile(join(DATA_PATH, 'good.txt'), 'hello', (err) => {
  logResult('writeFile("good.txt")', err);

  // 1b) Should fail (path traversal)
  safeFs.writeFile('../bad.txt', 'pwn', (err2) => {
    logResult('writeFile("../bad.txt")', err2);

    // 2) Promise-style tests
    // ----------------------
    (async () => {
      console.log('--- promise tests ---');

      // 2a) Should succeed
      try {
        await safeFsPromises.writeFile(join(DATA_PATH, 'good.txt'), 'world');
        console.log('promises.writeFile("good2.txt"): ✓ succeeded');
      } catch (e) {
        console.log('promises.writeFile("good2.txt"): ✗', e.message);
      }

      // 2b) Should fail
      try {
        await safeFsPromises.writeFile('../../evil2.txt', 'hax');
        console.log('promises.writeFile("../../evil2.txt"): ???');
      } catch (e) {
        console.log('promises.writeFile("../../evil2.txt"): ✗', e.message);
      }

      // 3) Stream-style tests
      // ----------------------
      console.log('--- stream tests ---');
      try {
        const ws = safeFs.createWriteStream(join(DATA_PATH, 'stream.txt'));
        ws.write('streaming');
        ws.end(() => console.log('createWriteStream("stream.txt"): ✓ succeeded'));
      } catch (e) {
        console.log('createWriteStream("stream.txt"): ✗', e.message);
      }

      try {
        safeFs.createWriteStream('../../stream-bad.txt');
        console.log('createWriteStream("../../stream-bad.txt"): ???');
      } catch (e) {
        console.log('createWriteStream("../../stream-bad.txt"): ✗', e.message);
      }
    })();
  });
});
