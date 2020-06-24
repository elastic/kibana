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

import { generateMapping } from './manage_schema';
import { parsedWorkingCollector } from './__fixture__/parsed_working_collector';
import * as path from 'path';
import { readFile } from 'fs';
import { promisify } from 'util';
const read = promisify(readFile);

async function parseJsonFile(relativePath: string) {
  const schemaPath = path.resolve(__dirname, '__fixture__', relativePath);
  const fileContent = await read(schemaPath, 'utf8');
  return JSON.parse(fileContent);
}

describe('generateMapping', () => {
  it('generates a mapping file', async () => {
    const mockSchema = await parseJsonFile('mock_schema.json');
    const result = generateMapping([parsedWorkingCollector]);
    expect(result).toEqual(mockSchema);
  });
});
