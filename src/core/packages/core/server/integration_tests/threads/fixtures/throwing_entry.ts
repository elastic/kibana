/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { workerData } from 'node:worker_threads';

// Counts entry loads across spawns, then fails like a module with a load-time bug.
Atomics.add(new Int32Array(workerData.data.spawns), 0, 1);

throw new Error('entry failed to load');
