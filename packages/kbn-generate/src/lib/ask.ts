/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Chalk from 'chalk';
import Readline from 'readline';
import * as Rx from 'rxjs';
import Util from 'util';

import * as Ansi from './ansi';

export type ValidationResult = string | { err: string };

interface Options {
  question: string;
  validate(input: string): Promise<ValidationResult>;
}

export async function ask(options: Options) {
  if (!process.stderr.isTTY) {
    return undefined;
  }

  const int = Readline.createInterface({
    input: process.stdin,
    output: process.stderr,
  });

  const q = Util.promisify(int.question) as unknown as (q: string) => Promise<string>;

  try {
    return await Rx.firstValueFrom(
      Rx.race(
        Rx.fromEvent(int, 'error').pipe(
          Rx.map((err) => {
            throw err;
          })
        ),
        Rx.defer(() => q.call(int, `${Chalk.blueBright('?')} ${options.question} > `)).pipe(
          Rx.mergeMap(async (answer) => {
            process.stderr.write('validating...');
            try {
              return await options.validate(answer);
            } finally {
              process.stderr.write(Ansi.CLEAR_LINE_AND_MOVE_LEFT);
            }
          }),
          Rx.map((valid) => {
            if (typeof valid === 'string') {
              return valid;
            }

            const label = `Error:`;
            const indent = ' '.repeat(label.length + 1);
            const indented = valid.err
              .split('\n')
              .map((l, i) => (i === 0 ? l : `${indent}${l}`))
              .join('\n');

            process.stderr.write(`${Chalk.bgRed.white(label)} ${indented}\n`);

            throw new Error('retry');
          }),
          Rx.retry({
            delay: (err) => {
              if (typeof err === 'object' && err && err.message === 'retry') {
                return Rx.of(1);
              } else {
                throw err;
              }
            },
          })
        )
      )
    );
  } finally {
    int.close();
  }
}
