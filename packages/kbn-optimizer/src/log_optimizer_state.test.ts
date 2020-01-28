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

import Path from 'path';

import * as Rx from 'rxjs';
import { toArray } from 'rxjs/operators';
import { REPO_ROOT, ToolingLog, ToolingLogCollectingWriter } from '@kbn/dev-utils';

import { OptimizerState } from './optimizer';
import { OptimizerConfig } from './optimizer_config';
import { logOptimizerState } from './log_optimizer_state';

it('produces expected messages and mirrors state updates downstream', async () => {
  const logWriter = new ToolingLogCollectingWriter();
  const log = new ToolingLog();
  log.setWriters([logWriter]);

  const config = OptimizerConfig.create({
    repoRoot: REPO_ROOT,
    maxWorkerCount: 2,
    pluginScanDirs: [Path.resolve(__dirname, './__fixtures__/mock_repo/plugins')],
  });

  const stateUpdates: OptimizerState[] = [
    {
      type: 'worker stdio',
      chunk: Buffer.from('something from stderr'),
      stream: 'stderr',
    },
    {
      type: 'worker stdio',
      chunk: Buffer.from('something from stdout'),
      stream: 'stdout',
    },
    {
      type: 'running',
      durSec: 0,
      compilerStates: [
        {
          id: 'foo',
          type: 'running',
        },
      ],
    },
    {
      type: 'running',
      durSec: 1,
      compilerStates: [
        {
          id: 'foo',
          type: 'running',
        },
        {
          id: 'bar',
          type: 'running',
        },
      ],
    },
    {
      type: 'running',
      durSec: 10,
      compilerStates: [
        {
          id: 'foo',
          type: 'running',
        },
        {
          id: 'bar',
          type: 'compiler success',
          moduleCount: 50,
        },
      ],
    },
    {
      type: 'compiler success',
      durSec: 30,
      compilerStates: [
        {
          id: 'foo',
          type: 'compiler success',
          moduleCount: 100,
        },
        {
          id: 'bar',
          type: 'compiler success',
          moduleCount: 50,
        },
      ],
    },
  ];

  const results = await Rx.from(stateUpdates)
    .pipe(logOptimizerState(log, config), toArray())
    .toPromise();

  expect(results).toEqual(stateUpdates.filter(s => s.type !== 'worker stdio'));

  expect(logWriter.messages).toMatchInlineSnapshot(`
    Array [
      " [34minfo[39m ⚙️  building 2 bundles using 2 workers",
      " [33mwarn[39m ⚙️  worker stderr something from stderr",
      " [33mwarn[39m ⚙️  worker stdout something from stdout",
      " [95msill[39m [foo] state = \\"running\\"",
      " [95msill[39m [bar] state = \\"running\\"",
      " [95msill[39m [bar] state = \\"compiler success\\" after 10 seconds",
      " [95msill[39m [foo] state = \\"compiler success\\" after 30 seconds",
      " [32msucc[39m ⚙️  all bundles compiled successfully after 30 seconds",
    ]
  `);
});
