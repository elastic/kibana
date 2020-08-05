/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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

  spawned.stdout.pipe(prefixedStdout).pipe(streamToLog(debug));
  spawned.stderr.pipe(prefixedStderr).pipe(streamToLog(debug));

  return spawned;
}
