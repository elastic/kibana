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

import * as ts from 'typescript';
import * as path from 'path';
import { extractCollectors, getProgramPaths } from './extract_collectors';
import { parseTelemetryRC } from './config';

describe('extractCollectors', () => {
  it('extracts collectors given rc file', async () => {
    const configRoot = path.join(process.cwd(), 'src', 'fixtures', 'telemetry_collectors');
    const tsConfig = ts.findConfigFile('./', ts.sys.fileExists, 'tsconfig.json');
    if (!tsConfig) {
      throw new Error('Could not find a valid tsconfig.json.');
    }
    const configs = await parseTelemetryRC(configRoot);
    expect(configs).toHaveLength(1);
    const programPaths = await getProgramPaths(configs[0]);

    const results = [...extractCollectors(programPaths, tsConfig)];
    expect(results).toHaveLength(6);
    expect(results).toMatchSnapshot();
  });
});
