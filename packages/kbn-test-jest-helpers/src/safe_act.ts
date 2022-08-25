/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Chalk from 'chalk';
import { act } from 'react-dom/test-utils';

let current: symbol | undefined;

if (typeof beforeEach === 'function') {
  beforeEach(() => {
    current = Symbol();
  });
}

if (typeof afterEach === 'function') {
  afterEach(() => {
    current = undefined;
  });
}

export function safeAct(cb: () => Promise<void>): Promise<void>;
export function safeAct(cb: () => void): void;
export function safeAct(cb: () => Promise<void> | void) {
  const scheduled = current;
  if (scheduled === undefined) {
    throw new Error(
      'safeAct() should only be called in beforeAll/beforeEach hooks or in tests and must be imported at the root of the file'
    );
  }

  const sourceStack = new Error().stack ?? '';

  return act(() => {
    if (scheduled === current) {
      return cb() as never;
    }

    const title = Chalk.red.bold('safeAct() violation:');
    const desc = 'act() cb triggered after test completed';
    const indentedStack = sourceStack
      .split('\n')
      .slice(1)
      .map((l) => `  ${l}`)
      .join('\n');

    process.stderr.write(
      `\n\n${title}\n${desc}, registration stacktrace:\n${indentedStack}\n`,
      () => {
        process.exit(1);
      }
    );

    return new Promise(() => {}) as never;
  });
}
