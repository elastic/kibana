/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Effect } from 'effect';

const boxHoldingASideEffect = () => {
  // This log symbol is the "box"
  const log = (message: string) =>
    Effect.sync(() => {
      console.log(message); // side effect
    });

  //      ┌─── Effect<void, never, never>
  //      ▼
  const program = log('Hello, World!');

  Effect.runSync(program);
};
