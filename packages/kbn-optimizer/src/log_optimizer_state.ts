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

import { ToolingLog } from '@kbn/dev-utils';
import { inspect } from 'util';
import { filter } from 'rxjs/operators';

import { OptimizerConfig } from './optimizer_config';
import { OptimizerState, OptimizerStateSummary } from './optimizer';
import { CompilerState } from './common';
import { closure } from './closure';

export function logOptimizerState(log: ToolingLog, config: OptimizerConfig) {
  return closure<OptimizerState, OptimizerStateSummary>(source => {
    const bundleStates = new Map<string, CompilerState['type']>();

    log.info(
      `⚙️  building ${config.bundles.length} bundles using ${config.workers.length} workers${
        config.watch ? ' in watch mode' : ''
      }`
    );

    return source.pipe(
      filter((s): s is OptimizerStateSummary => {
        if (s.type === 'worker stdio') {
          const chunk = s.chunk.toString('utf8');
          log.warning(
            '⚙️  worker',
            s.stream,
            chunk.slice(0, chunk.length - (chunk.endsWith('\n') ? 1 : 0))
          );
          return false;
        }

        for (const { id, type } of s.compilerStates) {
          const prevBundleState = bundleStates.get(id);

          if (type === prevBundleState) {
            continue;
          }

          bundleStates.set(id, type);
          log.verbose(
            `[${id}] state = "${type}"${type !== 'running' ? ` after ${s.durSec} seconds` : ''}`
          );
        }

        if (s.type === 'running') {
          return true;
        }

        if (s.type === 'compiler issue') {
          log.error('⚙️  webpack compile errors');
          log.indent(4);
          for (const b of s.compilerStates) {
            if (b.type === 'compiler issue') {
              log.error(`[${b.id}] build`);
              log.indent(4);
              log.error(b.failure);
              log.indent(-4);
            }
          }
          log.indent(-4);
          return true;
        }

        if (s.type === 'compiler success') {
          log.success(
            config.watch
              ? `⚙️  watching for changes in all bundles after ${s.durSec} seconds`
              : `⚙️  all bundles compiled successfully after ${s.durSec} seconds`
          );
          return true;
        }

        throw new Error(`unhandled optimizer state: ${inspect(s)}`);
      })
    );
  });
}
