/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { buildProcessorFunction } from '../build_processor_function';
// @ts-ignore
import { processors } from '../request_processors/series/index';

/**
 * Builds series request body
 *
 * @param {...args}: [
 *   req: {Object} - a request object,
 *   panel: {Object} - a panel object,
 *   series: {Object} - an series object,
 *   esQueryConfig: {Object} - es query config object,
 *   indexPatternObject: {Object} - an index pattern object,
 *   capabilities: {Object} - a search capabilities object
 * ]
 * @returns {Object} doc - processed body
 */
export async function buildRequestBody(...args: any[]) {
  const processor = buildProcessorFunction(processors, ...args);
  const doc = await processor({});
  return doc;
}
