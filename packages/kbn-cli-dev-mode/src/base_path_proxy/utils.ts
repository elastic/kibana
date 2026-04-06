/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { sampleSize } from 'lodash';

const alphabet = 'abcdefghijklmnopqrztuvwxyz'.split('');

// Thank you, Spencer! :elasticheart:
// Avoid 'app' — Kibana's application routes use the /app/ prefix, so basePath /app would conflict.
export const getRandomBasePath = (): string => {
  const path = Math.random() * 100 < 1 ? 'spalger' : sampleSize(alphabet, 3).join('');
  return path === 'app' ? getRandomBasePath() : path;
};
