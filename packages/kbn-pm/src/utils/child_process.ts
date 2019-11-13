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

import chalk from 'chalk';
import execa from 'execa';
import logSymbols from 'log-symbols';
import logTransformer from 'strong-log-transformer';

function generateColors() {
  const colorWheel = [chalk.cyan, chalk.magenta, chalk.blue, chalk.yellow, chalk.green];

  const count = colorWheel.length;
  let children = 0;

  return () => colorWheel[children++ % count];
}

export function spawn(command: string, args: string[], opts: execa.Options) {
  return execa(command, args, {
    stdio: 'inherit',
    preferLocal: true,
    ...opts,
  });
}

const nextColor = generateColors();

export function spawnStreaming(
  command: string,
  args: string[],
  opts: execa.Options,
  { prefix }: { prefix: string }
) {
  const spawned = execa(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    preferLocal: true,
    ...opts,
  });

  const color = nextColor();
  const prefixedStdout = logTransformer({ tag: `${color.bold(prefix)}:` });
  const prefixedStderr = logTransformer({
    mergeMultiline: true,
    tag: `${logSymbols.error} ${color.bold(prefix)}:`,
  });

  spawned.stdout.pipe(prefixedStdout).pipe(process.stdout);
  spawned.stderr.pipe(prefixedStderr).pipe(process.stderr);

  return spawned;
}
