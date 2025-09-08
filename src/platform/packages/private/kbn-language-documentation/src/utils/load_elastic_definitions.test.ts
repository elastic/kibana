/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as fs from 'fs';
import { loadElasticDefinitions } from './load_elastic_definitions';

jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('loadElasticDefinitions', () => {
  const mockDefinitionsPath = '/mock/path';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should load and return definitions from JSON files', () => {
    const mockFiles = ['sample1.json', 'sample2.json', 'sample3.txt'];
    const mockDefinition1 = { name: 'sample1', type: 'source' };
    const mockDefinition2 = { name: 'sample2', type: 'processing' };

    mockedFs.readdirSync.mockReturnValue(mockFiles as any);
    mockedFs.readFileSync
      .mockReturnValueOnce(JSON.stringify(mockDefinition1))
      .mockReturnValueOnce(JSON.stringify(mockDefinition2));

    const result = loadElasticDefinitions(mockDefinitionsPath);

    expect(result.size).toBe(2);
    expect(result.get('sample1')).toEqual(mockDefinition1);
    expect(result.get('sample2')).toEqual(mockDefinition2);
  });

  test('should filter out non-JSON files', () => {
    const mockFiles = ['sample1.json', 'readme.md', 'sample2.json', 'config.txt'];
    const mockDefinition1 = { name: 'sample1', type: 'source' };
    const mockDefinition2 = { name: 'sample2', type: 'processing' };

    mockedFs.readdirSync.mockReturnValue(mockFiles as any);
    mockedFs.readFileSync
      .mockReturnValueOnce(JSON.stringify(mockDefinition1))
      .mockReturnValueOnce(JSON.stringify(mockDefinition2));

    const result = loadElasticDefinitions(mockDefinitionsPath);

    expect(result.size).toBe(2);
  });

  test('should handle empty directory', () => {
    mockedFs.readdirSync.mockReturnValue([] as any);

    const result = loadElasticDefinitions(mockDefinitionsPath);

    expect(result.size).toBe(0);
  });

  test('should use definition name as map key', () => {
    const mockFiles = ['file1.json'];
    const mockDefinition = { name: 'customName', otherProp: 'value' };

    mockedFs.readdirSync.mockReturnValue(mockFiles as any);
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockDefinition));

    const result = loadElasticDefinitions(mockDefinitionsPath);

    expect(result.get('customName')).toEqual(mockDefinition);
  });
});
