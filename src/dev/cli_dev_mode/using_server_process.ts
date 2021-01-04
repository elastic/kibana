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

import execa from 'execa';
import * as Rx from 'rxjs';

import { getActiveInspectFlag } from './get_active_inspect_flag';

const ACTIVE_INSPECT_FLAG = getActiveInspectFlag();

interface ProcResource extends Rx.Unsubscribable {
  proc: execa.ExecaChildProcess;
  unsubscribe(): void;
}

export function usingServerProcess<T>(
  script: string,
  argv: string[],
  fn: (proc: execa.ExecaChildProcess) => Rx.Observable<T>
) {
  return Rx.using(
    (): ProcResource => {
      const proc = execa.node(script, [...argv, '--logging.json=false'], {
        stdio: 'pipe',
        nodeOptions: [
          ...process.execArgv,
          ...(ACTIVE_INSPECT_FLAG ? [`${ACTIVE_INSPECT_FLAG}=${process.debugPort + 1}`] : []),
        ],
        env: {
          ...process.env,
          NODE_OPTIONS: process.env.NODE_OPTIONS,
          isDevCliChild: 'true',
          ELASTIC_APM_SERVICE_NAME: 'kibana',
          ...(process.stdout.isTTY ? { FORCE_COLOR: 'true' } : {}),
        },
      });

      return {
        proc,
        unsubscribe() {
          proc.kill('SIGKILL');
        },
      };
    },

    (resource) => {
      const { proc } = resource as ProcResource;
      return fn(proc);
    }
  );
}
