/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Writable } from 'stream';

import chalk from 'chalk';
import execa from 'execa';
import logTransformer from 'strong-log-transformer';

import { log } from './log';

const colorWheel = [chalk.cyan, chalk.magenta, chalk.blue, chalk.yellow, chalk.green];
const getColor = () => {
  const color = colorWheel.shift()!;
  colorWheel.push(color);
  return color;
};

export function spawn(command: string, args: string[], opts: execa.Options) {
  return execa(command, args, {
    stdio: 'inherit',
    preferLocal: true,
    ...opts,
  });
}

function streamToLog(debug: boolean = true) {
  return new Writable({
    objectMode: true,
    write(line, _, cb) {
      if (line.endsWith('\n')) {
        log[debug ? 'debug' : 'write'](line.slice(0, -1));
      } else {
        log[debug ? 'debug' : 'write'](line);
      }

      cb();
    },
  });
}

export function spawnStreaming(
  command: string,
  args: string[],
  opts: execa.Options,
  { prefix, debug }: { prefix: string; debug?: boolean }
) {
  const spawned = execa(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    preferLocal: true,
    ...opts,
  });

  const color = getColor();
  const prefixedStdout = logTransformer({ tag: color.bold(prefix) });
  const prefixedStderr = logTransformer({ mergeMultiline: true, tag: color.bold(prefix) });

  spawned.stdout!.pipe(prefixedStdout).pipe(streamToLog(debug)); // TypeScript note: As long as the proc stdio[1] is 'pipe', then stdout will not be null
  spawned.stderr!.pipe(prefixedStderr).pipe(streamToLog(debug)); // TypeScript note: As long as the proc stdio[2] is 'pipe', then stderr will not be null

  return spawned;
}
