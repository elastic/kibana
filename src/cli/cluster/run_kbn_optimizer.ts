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
import { ToolingLog, pickLevelFromFlags, REPO_ROOT } from '@kbn/dev-utils';
import { OptimizerConfig, Optimizer, logOptimizerState } from '@kbn/optimizer';

import { LegacyConfig } from '../../core/server/legacy';

export function runKbnOptimizer(opts: Record<string, any>, config: LegacyConfig) {
  const optimizerConfig = OptimizerConfig.create({
    repoRoot: REPO_ROOT,
    watch: true,
    oss: !!opts.oss,
    examples: !!opts.runExamples,
    pluginPaths: config.get('plugins.paths'),
  });

  const dim = Chalk.dim('np bld');
  const time = () => moment().format('HH:mm:ss.SSS');
  const toolingLog = new ToolingLog({
    level: pickLevelFromFlags(opts),
    writeTo: {
      write: chunk => {
        const trailingNewLine = chunk[chunk.length - 1] === '\n';

        process.stdout.write(
          chunk
            .slice(0, chunk.length - (trailingNewLine ? 1 : 0))
            .split('\n')
            .map(line => `${dim}    log   [${time()}] ${line}`)
            .join('\n') + (trailingNewLine ? '\n' : '')
        );
      },
    },
  });

  const optimizer = new Optimizer(optimizerConfig);
  return optimizer.run().pipe(logOptimizerState(toolingLog, optimizerConfig));
}
