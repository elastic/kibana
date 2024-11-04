/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import limit from 'p-limit';

/**
 * This type is just an async function's type
 */
type RequestFactory<Output> = () => Promise<Output>;

/**
 * Helper function to call a large number of async functions with limited concurrency.
 * Example pattern of how to create functions to pass in:
 *
 * const ruleCopies = duplicateRuleParams(basicRule, 200);
 * const functions = ruleCopies.map((rule) => () => detectionsClient.createRule({ body: rule }));
 *
 * Note that the `map` call in the example returns a *function* that calls detectionsClient.createRule, it doesn't call createRule immediately.
 *
 * @param functions Async functions to call with limited concurrency
 * @param concurrency Maximum number of concurrent function calls
 * @returns Results from all functions passed in
 */
export const concurrentlyExec = async <Output>(
  requestFactories: Array<RequestFactory<Output>>,
  concurrency: number = 10
) => {
  const limiter = limit(concurrency);
  const promises = requestFactories.map((f) => limiter(f));
  return Promise.all(promises);
};
