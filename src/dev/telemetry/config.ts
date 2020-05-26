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

import * as path from 'path';
import { readFileAsync } from './utils';
import { TELEMETRY_RC } from './constants';

export interface TelemetryRC {
  root: string;
  output: string;
  exclude: string[];
}

export async function readRcFile(rcRoot: string) {
  if (!path.isAbsolute(rcRoot)) {
    throw Error(`config root (${rcRoot}) must be an absolute path.`);
  }

  const rcFile = path.resolve(rcRoot, TELEMETRY_RC);
  const configString = await readFileAsync(rcFile, 'utf8');
  return JSON.parse(configString);
}

export async function parseTelemetryRC(rcRoot: string): Promise<TelemetryRC[]> {
  const parsedRc = await readRcFile(rcRoot);
  const configs = Array.isArray(parsedRc) ? parsedRc : [parsedRc];
  return configs.map(({ root, output, exclude = [] }) => {
    if (typeof root !== 'string') {
      throw Error('config.root must be a string.');
    }
    if (typeof output !== 'string') {
      throw Error('config.output must be a string.');
    }
    if (!Array.isArray(exclude)) {
      throw Error('config.exclude must be an array of strings.');
    }

    return {
      root: path.join(rcRoot, root),
      output: path.join(rcRoot, output),
      exclude: exclude.map((excludedPath) => path.resolve(rcRoot, excludedPath)),
    };
  });
}
