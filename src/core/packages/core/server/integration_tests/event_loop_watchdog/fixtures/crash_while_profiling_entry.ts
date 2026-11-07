/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { writeSync } from 'node:fs';
import { Session } from 'node:inspector/promises';

// Starts profiling the main thread, then crashes while the profiler runs.
const session = new Session();
session.connectToMainThread();
// Keeps the worker alive while the inspector replies are pending.
setInterval(() => {}, 1_000);
Promise.all([session.post('Profiler.enable'), session.post('Profiler.start')]).then(() => {
  writeSync(1, `${JSON.stringify({ message: 'profiling started' })}\n`);
  setTimeout(() => {
    throw new Error('crashed while profiling');
  }, 200);
});
