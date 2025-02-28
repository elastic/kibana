/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Console, Effect, Either } from 'effect';
import * as fs from 'node:fs';

/**
 *          ┌─── Represents the success type
         │        ┌─── Represents the error type
         │        │      ┌─── Represents required dependencies
         ▼        ▼      ▼
Effect<Success, Error, Requirements>
 */
export const errorHandlingResearch = () => {
  // bare();

  // I built this in the cc ingestion system.
  // It's based on my Either impl (tryCatch, fold, etc)
  // export const pathExists = (x) => tryCatch(() => statSync(x)).fold(left, right);
  const pathExists = (x: string) => {
    if (fs.statSync(x)) return Either.right;
    else return Either.left;
  };

  const logDir = `src/platform/packages/shared/kbn-ftr-common-functional-services/services/fp_experiments/effect_ts_research/error_handling`;
};
const bare = () => {
  const f = Effect.tryPromise(() => fs.promises.readFile('file.txt', 'utf8'));

  Console.log(Effect.runPromise(f));
  //  Unhandled Promise rejection detected:
  //
  // (FiberFailure) UnknownException: An unknown error occurred in Effect.tryPromise
  //     at fail (/Users/trezworkbox/dev/main.worktrees/task-either-space-time/node_modules/effect/src/internal/core-effect.ts:1654:19)
  //     at /Users/trezworkbox/dev/main.worktrees/task-either-space-time/node_modules/effect/src/internal/core-effect.ts:1674:26 {
  //   [cause]: Error: ENOENT: no such file or directory, open 'file.txt'
  //       at open (node:internal/fs/promises:639:25)
  //       at Object.readFile (node:internal/fs/promises:1242:14)
  // }
};

const moreHandled = () => {
  // class FileNotThereException {
  //   readonly _tag = 'FileNotThereException';
  // }
  // const f = Effect.tryPromise(() => fs.promises.readFile('file.txt', 'utf8'));

  // Console.log(Effect.runPromise(f));
  const log = (message: string) =>
    Effect.sync(() => {
      console.log(message); // side effect
    });

  //      ┌─── Effect<void, never, never>
  //      ▼
  const program = log('Hello, World!');

  Effect.runSync(program);
};
