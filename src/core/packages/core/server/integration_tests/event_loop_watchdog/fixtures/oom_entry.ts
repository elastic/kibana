/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getHeapStatistics } from 'node:v8';

// Keeps allocating until the worker's heap limit is hit. If no limit applies, exits well before
// using up the machine's memory, with a code the test doesn't expect.
const NO_LIMIT_EXIT_CODE = 2;
const NO_LIMIT_HEAP_BYTES = 512 * 1024 * 1024;
const retained: number[][] = [];
setInterval(() => {
  if (getHeapStatistics().used_heap_size > NO_LIMIT_HEAP_BYTES) {
    process.exit(NO_LIMIT_EXIT_CODE);
  }
  for (let i = 0; i < 100; i++) {
    retained.push(new Array(10_000).fill(i));
  }
}, 1);
