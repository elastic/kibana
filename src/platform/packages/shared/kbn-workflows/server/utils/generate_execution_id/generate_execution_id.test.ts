/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  decodeEncodedWorkflowExecutionId,
  generateEncodedWorkflowExecutionId,
} from './generate_execution_id';

jest.mock('uuid', () => ({
  v4: () => '550e8400-e29b-41d4-a716-446655440000',
}));

const MOCK_UUID = '550e8400-e29b-41d4-a716-446655440000';
const MOCK_UUID_HEX = '550e8400e29b41d4a716446655440000';

const INDEX_PATTERN = '.workflows-executions-*';
const INDEX_NAME = '.workflows-executions-000001';

describe('generateEncodedWorkflowExecutionId', () => {
  it('should return a base64url-encoded string', () => {
    const result = generateEncodedWorkflowExecutionId({
      indexName: INDEX_NAME,
      indexPattern: INDEX_PATTERN,
    });

    expect(result).not.toContain('+');
    expect(result).not.toContain('/');
    expect(result).not.toContain('=');
  });

  it('should produce a deterministic result for a given uuid and index', () => {
    const result = generateEncodedWorkflowExecutionId({
      indexName: INDEX_NAME,
      indexPattern: INDEX_PATTERN,
    });

    expect(result).toBe(
      Buffer.from(`000001_${MOCK_UUID_HEX}`)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
    );
  });

  it('should derive the index suffix by stripping the pattern prefix', () => {
    const result = generateEncodedWorkflowExecutionId({
      indexName: '.my-index-abc_def',
      indexPattern: '.my-index-*',
    });
    const decoded = decodeEncodedWorkflowExecutionId(result);

    expect(decoded.success).toBe(true);
    if (decoded.success) {
      expect(decoded.indexSuffix).toBe('abc_def');
    }
  });

  it('should throw if indexPattern does not end with *', () => {
    expect(() =>
      generateEncodedWorkflowExecutionId({
        indexName: INDEX_NAME,
        indexPattern: '.workflows-executions-',
      })
    ).toThrow('indexPattern must end with *');
  });

  it('should handle index name that equals the pattern prefix (empty suffix)', () => {
    const result = generateEncodedWorkflowExecutionId({
      indexName: '.workflows-executions-',
      indexPattern: INDEX_PATTERN,
    });
    const decoded = decodeEncodedWorkflowExecutionId(result);

    expect(decoded).toEqual({ success: true, indexSuffix: '', uuid: MOCK_UUID });
  });
});

describe('decodeEncodedWorkflowExecutionId', () => {
  it('should roundtrip with generateEncodedWorkflowExecutionId', () => {
    const encoded = generateEncodedWorkflowExecutionId({
      indexName: INDEX_NAME,
      indexPattern: INDEX_PATTERN,
    });

    expect(decodeEncodedWorkflowExecutionId(encoded)).toEqual({
      success: true,
      indexSuffix: '000001',
      uuid: MOCK_UUID,
    });
  });

  it('should return uuid with dashes in 8-4-4-4-12 format', () => {
    const encoded = generateEncodedWorkflowExecutionId({
      indexName: INDEX_NAME,
      indexPattern: INDEX_PATTERN,
    });
    const decoded = decodeEncodedWorkflowExecutionId(encoded);

    expect(decoded.success).toBe(true);
    if (decoded.success) {
      expect(decoded.uuid).toMatch(
        /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/
      );
    }
  });

  it('should roundtrip with various index suffixes', () => {
    const cases = [
      { indexName: '.idx-000001', indexPattern: '.idx-*', expectedSuffix: '000001' },
      { indexName: '.idx-my-index', indexPattern: '.idx-*', expectedSuffix: 'my-index' },
      { indexName: '.idx-abc_def', indexPattern: '.idx-*', expectedSuffix: 'abc_def' },
      {
        indexName: '.prefix-some.long.suffix',
        indexPattern: '.prefix-*',
        expectedSuffix: 'some.long.suffix',
      },
    ];

    for (const { indexName, indexPattern, expectedSuffix } of cases) {
      const encoded = generateEncodedWorkflowExecutionId({ indexName, indexPattern });

      expect(decodeEncodedWorkflowExecutionId(encoded)).toEqual({
        success: true,
        indexSuffix: expectedSuffix,
        uuid: MOCK_UUID,
      });
    }
  });

  it('should correctly reverse base64url encoding', () => {
    const original = `000001_${MOCK_UUID_HEX}`;
    const encoded = Buffer.from(original)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    expect(decodeEncodedWorkflowExecutionId(encoded)).toEqual({
      success: true,
      indexSuffix: '000001',
      uuid: MOCK_UUID,
    });
  });

  it('should return error for string without separator', () => {
    const encoded = Buffer.from('noseparatorhere')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    expect(decodeEncodedWorkflowExecutionId(encoded)).toEqual({
      success: false,
      error: 'Invalid encoded execution ID: missing separator',
    });
  });

  it('should return error for malformed UUID hex (wrong length)', () => {
    const encoded = Buffer.from('000001_tooshort')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    expect(decodeEncodedWorkflowExecutionId(encoded)).toEqual({
      success: false,
      error: 'Invalid encoded execution ID: malformed UUID',
    });
  });

  it('should return error for malformed UUID hex (non-hex characters)', () => {
    const encoded = Buffer.from('000001_zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    expect(decodeEncodedWorkflowExecutionId(encoded)).toEqual({
      success: false,
      error: 'Invalid encoded execution ID: malformed UUID',
    });
  });

  it('should return error for empty string input', () => {
    expect(decodeEncodedWorkflowExecutionId('')).toEqual({
      success: false,
      error: 'Invalid encoded execution ID: missing separator',
    });
  });
});
