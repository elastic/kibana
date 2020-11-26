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

import Chalk from 'chalk';
import moment from 'moment';
import { map } from 'rxjs/operators';
import { REPO_ROOT } from '@kbn/utils';
import {
  ToolingLog,
  pickLevelFromFlags,
  ToolingLogTextWriter,
  parseLogLevel,
} from '@kbn/dev-utils';
import { runOptimizer, OptimizerConfig, logOptimizerState, OptimizerUpdate } from '@kbn/optimizer';

export interface Options {
  quiet?: boolean;
  silent?: boolean;
  watch?: boolean;
  cache?: boolean;
  dist?: boolean;
  oss?: boolean;
  runExamples?: boolean;
  pluginPaths?: string[];
}

export type KbnOptimizerState = OptimizerUpdate;

export function observeKbnOptimizer(options: Options) {
  const optimizerConfig = OptimizerConfig.create({
    repoRoot: REPO_ROOT,
    watch: !!options.watch,
    includeCoreBundle: true,
    cache: !!options.cache,
    dist: !!options.dist,
    oss: !!options.oss,
    examples: !!options.runExamples,
    pluginPaths: options.pluginPaths,
  });

  const dim = Chalk.dim('np bld');
  const name = Chalk.magentaBright('@kbn/optimizer');
  const time = () => moment().format('HH:mm:ss.SSS');
  const level = (msgType: string) => {
    switch (msgType) {
      case 'info':
        return Chalk.green(msgType);
      case 'success':
        return Chalk.cyan(msgType);
      case 'debug':
        return Chalk.gray(msgType);
      case 'warning':
        return Chalk.yellowBright(msgType);
      default:
        return msgType;
    }
  };

  const { flags: levelFlags } = parseLogLevel(
    pickLevelFromFlags({
      quiet: options.quiet,
      silent: options.silent,
    })
  );

  const log = new ToolingLog();
  const has = <T extends object>(obj: T, x: any): x is keyof T => obj.hasOwnProperty(x);

  log.setWriters([
    {
      write(msg) {
        if (has(levelFlags, msg.type) && !levelFlags[msg.type]) {
          return false;
        }

        ToolingLogTextWriter.write(
          process.stdout,
          `${dim}    log   [${time()}] [${level(msg.type)}][${name}] `,
          msg
        );
        return true;
      },
    },
  ]);

  return runOptimizer(optimizerConfig).pipe(
    logOptimizerState(log, optimizerConfig),
    map(({ state }) => state.phase === 'success' || state.phase === 'issue')
  );
}
