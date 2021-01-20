/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
