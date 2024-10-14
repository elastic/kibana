/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { generateMapping } from './manage_schema';
import { parsedWorkingCollector } from './__fixture__/parsed_working_collector';
import { parsedCollectorWithDescription } from './__fixture__/parsed_working_collector_with_description';
import * as path from 'path';
import { readFile } from 'fs/promises';

async function parseJsonFile(relativePath: string) {
  const schemaPath = path.resolve(__dirname, '__fixture__', relativePath);
  const fileContent = await readFile(schemaPath, 'utf8');
  return JSON.parse(fileContent);
}

describe('generateMapping', () => {
  it('generates a mapping file', async () => {
    const mockSchema = await parseJsonFile('mock_schema.json');
    const result = generateMapping([parsedWorkingCollector]);
    expect(result).toEqual(mockSchema);
  });
  it('generates a mapping file that includes _meta.description fields', async () => {
    const mockSchema = await parseJsonFile('mock_schema_with_descriptions.json');
    const result = generateMapping([parsedCollectorWithDescription]);
    expect(result).toEqual(mockSchema);
  });
});
