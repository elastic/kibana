/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { buildProcessorFunction } from '../build_processor_function';
import { processors } from '../request_processors/table';

export async function buildRequestBody(...args) {
  const processor = buildProcessorFunction(processors, ...args);
  const doc = await processor({});
  return doc;
}
