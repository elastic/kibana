/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { generateConnectorName, toValidIndexName } from './generate_connector_name';
import { indexOrAliasExists } from './exists_index';
import { MANAGED_CONNECTOR_INDEX_PREFIX } from '../constants';

jest.mock('./exists_index');
jest.mock('uuid', () => ({
  v4: jest.fn(() => '12345678-abcd-1234-efgh-123456789012'),
}));

describe('generateConnectorName', () => {
  const mockClient = {} as any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default behavior: index doesn't exist
    (indexOrAliasExists as jest.Mock).mockResolvedValue(false);
  });

  describe('toValidIndexName function', () => {
    it('converts strings to valid index names', () => {
      const testCases = [
        { input: 'Test String', expected: 'test-string' },
        { input: 'test/invalid*chars?', expected: 'test-invalid-chars' },
        { input: '_leadingUnderscore', expected: 'leading-underscore' },
        { input: 'camelCase', expected: 'camel-case' },
        { input: '< My Connector 1234!#$$>', expected: 'my-connector-1234' },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(toValidIndexName(input)).toBe(expected);
      });
    });

    it('correctly handles strings with trailing hyphens', () => {
      const testCases = [
        { input: 'test-string---', expected: 'test-string' },
        { input: 'test-string-', expected: 'test-string' },
        { input: 'many-hyphens------------', expected: 'many-hyphens' },
        { input: 'MixedCase-with-hyphens----', expected: 'mixed-case-with-hyphens' },
        // Add a more pathological case with many hyphens
        { input: 'test' + '-'.repeat(1000), expected: 'test' },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(toValidIndexName(input)).toBe(expected);
      });
    });
  });

  describe('with provided connector name', () => {
    it('uses original name for connector and sanitized name for index', async () => {
      const result = await generateConnectorName(mockClient, 'test-type', false, 'My Connector!');

      expect(result).toEqual({
        connectorName: 'My Connector!',
        indexName: 'connector-my-connector',
      });

      expect(indexOrAliasExists).toHaveBeenCalledWith(mockClient, 'connector-my-connector');
    });

    it('appends a suffix if index name already exists', async () => {
      // First call: index exists, second call: index doesn't exist
      (indexOrAliasExists as jest.Mock).mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      const result = await generateConnectorName(mockClient, 'test-type', false, 'My Connector!');

      expect(result).toEqual({
        connectorName: 'My Connector!',
        indexName: 'connector-my-connector-abcd',
      });

      expect(indexOrAliasExists).toHaveBeenCalledTimes(2);
    });

    it('uses managed prefix for native connectors', async () => {
      const result = await generateConnectorName(mockClient, 'test-type', true, 'My Connector!');

      expect(result.indexName).toBe(`${MANAGED_CONNECTOR_INDEX_PREFIX}connector-my-connector`);
    });

    it('throws error after 20 failed attempts to generate unique name', async () => {
      // Always return true (index exists) for all calls
      (indexOrAliasExists as jest.Mock).mockResolvedValue(true);

      await expect(
        generateConnectorName(mockClient, 'test-type', false, 'My Connector!')
      ).rejects.toThrow('generate_index_name_error');

      expect(indexOrAliasExists).toHaveBeenCalledTimes(21); // Initial check + 20 attempts
    });
  });

  describe('without provided connector name', () => {
    it('auto-generates connector and index names', async () => {
      const result = await generateConnectorName(mockClient, 'testType', false);

      expect(result).toEqual({
        connectorName: 'testtype-abcd',
        indexName: 'connector-testtype-abcd',
      });
    });

    it('uses managed prefix for native connectors', async () => {
      const result = await generateConnectorName(mockClient, 'testType', true);

      expect(result.indexName).toBe(`${MANAGED_CONNECTOR_INDEX_PREFIX}connector-testtype-abcd`);
    });

    it('tries different suffixes if index name already exists', async () => {
      (indexOrAliasExists as jest.Mock).mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      const result = await generateConnectorName(mockClient, 'testType', false);

      expect(result.connectorName).toMatch(/testtype-/);
      expect(indexOrAliasExists).toHaveBeenCalledTimes(2);
    });

    it('throws error if connectorType is empty', async () => {
      await expect(generateConnectorName(mockClient, '', false)).rejects.toThrow(
        'Connector type or connectorName is required'
      );
    });

    it('throws error after 20 failed attempts to generate unique name', async () => {
      (indexOrAliasExists as jest.Mock).mockResolvedValue(true);

      await expect(generateConnectorName(mockClient, 'testType', false)).rejects.toThrow(
        'generate_index_name_error'
      );

      expect(indexOrAliasExists).toHaveBeenCalledTimes(20);
    });
  });
});
