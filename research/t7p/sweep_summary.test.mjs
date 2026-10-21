/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  accountCgroup,
  deltaAccount,
  kernelBytes,
  parseMemoryStat,
  winningCap,
} from './sweep_summary.mjs';

test('working set subtracts reclaimable inactive file cache', () => {
  const stat = parseMemoryStat(
    'anon 400\nfile 1000\ninactive_file 700\nshmem 20\nkernel 50\nslab 40\n'
  );
  assert.equal(kernelBytes(stat), 50);
  const account = accountCgroup(1500, stat);
  assert.equal(account.workingSet, 800);
  assert.equal(account.anon, 400);
  assert.equal(account.file, 1000);
  assert.equal(account.shmem, 20);
});

test('kernel falls back to the component fields', () => {
  assert.equal(kernelBytes({ kernel_stack: 5, slab: 7, sock: 1 }), 13);
});

test('deltaAccount keeps null when a side is missing', () => {
  const delta = deltaAccount(
    { current: 10, anon: 8, file: null, shmem: 1, kernel: 1, inactiveFile: 2, workingSet: 8 },
    { current: 4, anon: 3, file: 1, shmem: 1, kernel: 0, inactiveFile: 1, workingSet: 3 }
  );
  assert.equal(delta.current, 6);
  assert.equal(delta.anon, 5);
  assert.equal(delta.file, null);
  assert.equal(delta.workingSet, 5);
});

test('winningCap picks the lowest surviving old space, preferring default young', () => {
  assert.equal(winningCap([]), null);
  assert.deepEqual(
    winningCap([
      { old: 256, young: 'default', survived: false },
      { old: 256, young: 32, survived: true },
      { old: 384, young: 'default', survived: true },
      { old: 'inherit', young: 'default', survived: true },
    ]),
    { old: 256, young: 32 }
  );
  assert.deepEqual(
    winningCap([
      { old: 384, young: 32, survived: true },
      { old: 384, young: 'default', survived: true },
      { old: 512, young: 'default', survived: true },
    ]),
    { old: 384, young: 'default' }
  );
});
