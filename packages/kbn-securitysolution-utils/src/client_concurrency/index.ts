/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import limit from 'p-limit';

/**
 * Helper function to call an API multiple times concurrently, basically like a client-side bulk API.
 * 
 * const responses = await clientConcurrency(
        detectionsClient.createRule.bind(detectionsClient),
        ruleCopies.map((rule) => ({
          body: rule,
        }))
      );
 * Note the `.bind` is crucial in `detectionsClient.createRule.bind(detectionsClient)` - without binding, `createRule` is called without
      access to the detectionsClient object and it will fail at runtime - even though the code typechecks fine.
 * @param clientFunction The API function to call multiple times
 * @param inputs An array of input values. Each value in the array is passed to a separate invocation of the clientFunction.
 * @param concurrency Number of simultaneous in-progress API calls that are allowed.
 * @returns An array of the responses from the API calls.
 */
export const clientConcurrency = async <Input, Output>(
  clientFunction: (input: Input) => Promise<Output>,
  inputs: Input[],
  concurrency: number = 10
) => {
  const limiter = limit(concurrency);
  const promises = inputs.map((input) => limiter(() => clientFunction(input)));
  return Promise.all(promises);
};

/**
 * Helper function to call a large number of async functions with limited concurrency.
 * Example pattern of how to create functions to pass in:
 *
 * const ruleCopies = duplicateRuleParams(basicRule, 200);
 * const functions = ruleCopies.map((rule) => () => detectionsClient.createRule({ body: rule }));
 *
 * Note that the `map` call returns a *function* that calls detectionsClient.createRule, it doesn't call createRule immediately.
 *
 * @param functions Async functions to call with limited concurrency
 * @param concurrency Maximum number of concurrent function calls
 * @returns Results from all functions passed in
 */
export const concurrentlyExec = async <Output>(
  functions: Array<() => Promise<Output>>,
  concurrency: number = 10
) => {
  const limiter = limit(concurrency);
  const promises = functions.map((f) => limiter(f));
  return Promise.all(promises);
};
