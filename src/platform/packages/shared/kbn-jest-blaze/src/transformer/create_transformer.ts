/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Omit } from 'lodash';
import { FileWalker, ChangeTracker } from '@kbn/module-graph';
import { JestTransformer } from './jest_transformer';
import { JestTransformerOptions } from './types';

// instantiate these once per process/worker so they can re-use the cache
const fileWalker = new FileWalker({});
const changeTracker = new ChangeTracker(fileWalker);

/**
 * Transformer factory function for {@link JestTransformer}
 */
// eslint-disable-next-line import/no-default-export
export default {
  createTransformer: (options: Omit<JestTransformerOptions, 'fileWalker' | 'changeTracker'>) =>
    new JestTransformer({
      ...options,
      fileWalker,
      changeTracker,
    }),
};
