/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { workerData } from 'piscina';
import { transformCode } from './sync_transform.js';

/** @type {import('./types').WorkerData} */
const { config } = workerData;

/**
 * @param {import('./types').WorkerTask} param0
 * @returns {Promise<import('./types').WorkerResult>}
 */
export default async ({ path, source }) => {
  return transformCode(path, source, config);
};
