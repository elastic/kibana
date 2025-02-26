/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Random, Console, Effect } from 'effect';

export const runEffectTSExperiments = () => {
  const flipTheCoin = Effect.if(Random.nextBoolean, {
    onTrue: () => Console.log('Head'), // Runs if the predicate is true
    onFalse: () => Console.log('Tail'), // Runs if the predicate is false
  });

  Effect.runFork(flipTheCoin);
};

function ep1() {
  // Test case: successful API response
  Effect.runFork(program('https://dummyjson.com/products/1?delay=1000'));
  /*
   Output:
   ok
   */

  // Test case: API call exceeding timeout limit
  Effect.runFork(program('https://dummyjson.com/products/1?delay=5000'));
  /*
   Output:
   TimeoutException: Operation timed out before the specified duration of '4s' elapsed
   */

  // Test case: API returning an error response
  // Effect.runFork(program('https://dummyjson.com/auth/products/1?delay=500'));
  /*
   Output:
   error
   error
   error
   UnknownException: An unknown error occurred
   */
}
