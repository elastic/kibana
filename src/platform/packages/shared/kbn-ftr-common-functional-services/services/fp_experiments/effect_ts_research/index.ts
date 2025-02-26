/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Random, Console, Effect } from 'effect';
import * as fs from 'node:fs';

export const runEffectTSExperiments = () => {
  // :: Effect.Effect<number, never, never>
  const a = Effect.succeed(42);
  // :: Effect.Effect<never, 'oops', never>;
  const b = Effect.fail('oops' as const);
  // :: Effect.Effect<number, never, never >
  const c = Effect.sync(() => {
    console.log('Howdy!');
    return 42;
  });
  // :: Effect.Effect<string, UknownException, never>
  const d = Effect.try(() => fs.readFileSync('file.txt', 'utf8'));
  // :: Effect.Effect<number, never, never>
  const e = Effect.promise(() => Promise.resolve(42));
  // :: Effect.Effect<string, UknownException, never>
  const f = Effect.tryPromise(() => fs.promises.readFile('file.txt', 'utf8'));
};

function coinFlip() {
  const flipTheCoin = Effect.if(Random.nextBoolean, {
    onTrue: () => Console.log('Head'), // Runs if the predicate is true
    onFalse: () => Console.log('Tail'), // Runs if the predicate is false
  });

  Effect.runFork(flipTheCoin);
}
