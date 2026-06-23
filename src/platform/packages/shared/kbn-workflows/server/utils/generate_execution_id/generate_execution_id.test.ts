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
import { WORKFLOWS_EXECUTIONS_DATA_STREAM_BACKING_PREFIX } from '../../../common/execution_storage_constants';
import { resolveBackingIndex } from '../resolve_backing_index/resolve_backing_index';

jest.mock('uuid', () => ({
  v4: () => '550e8400-e29b-41d4-a716-446655440000',
}));

const MOCK_UUID = '550e8400-e29b-41d4-a716-446655440000';
const MOCK_UUID_HEX = '550e8400e29b41d4a716446655440000';

const BACKING_INDEX_PREFIX = WORKFLOWS_EXECUTIONS_DATA_STREAM_BACKING_PREFIX;
const BACKING_INDEX_NAME = '.ds-.workflows-executions-2026.06.22-000001';
const INDEX_SUFFIX = '2026.06.22-000001';

describe('generateEncodedWorkflowExecutionId', () => {
  it('should return a base64url-encoded string', () => {
    const result = generateEncodedWorkflowExecutionId({
      backingIndexName: BACKING_INDEX_NAME,
      backingIndexPrefix: BACKING_INDEX_PREFIX,
    });

    expect(result).not.toContain('+');
    expect(result).not.toContain('/');
    expect(result).not.toContain('=');
  });

  it('should produce a deterministic result for a given uuid and index', () => {
    const result = generateEncodedWorkflowExecutionId({
      backingIndexName: BACKING_INDEX_NAME,
      backingIndexPrefix: BACKING_INDEX_PREFIX,
    });

    expect(result).toBe(
      Buffer.from(`${INDEX_SUFFIX}_${MOCK_UUID_HEX}`)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
    );
  });

  it('should derive the index suffix by stripping the backing index prefix', () => {
    const prefix = '.ds-.my-index-';
    const result = generateEncodedWorkflowExecutionId({
      backingIndexName: `${prefix}abc_def`,
      backingIndexPrefix: prefix,
    });
    const decoded = decodeEncodedWorkflowExecutionId(result);

    expect(decoded.success).toBe(true);
    if (decoded.success) {
      expect(decoded.indexSuffix).toBe('abc_def');
    }
  });

  it('should throw if backing index does not match prefix', () => {
    expect(() =>
      generateEncodedWorkflowExecutionId({
        backingIndexName: '.workflows-executions-000001',
        backingIndexPrefix: BACKING_INDEX_PREFIX,
      })
    ).toThrow(/does not start with prefix/);
  });

  it('should handle backing index that equals the prefix (empty suffix)', () => {
    const result = generateEncodedWorkflowExecutionId({
      backingIndexName: BACKING_INDEX_PREFIX,
      backingIndexPrefix: BACKING_INDEX_PREFIX,
    });
    const decoded = decodeEncodedWorkflowExecutionId(result);

    expect(decoded).toEqual({ success: true, indexSuffix: '', uuid: MOCK_UUID });
  });

  it('roundtrips backing index through encode, decode, and resolveBackingIndex', () => {
    const encoded = generateEncodedWorkflowExecutionId({
      backingIndexName: BACKING_INDEX_NAME,
      backingIndexPrefix: BACKING_INDEX_PREFIX,
    });
    const decoded = decodeEncodedWorkflowExecutionId(encoded);

    expect(decoded.success).toBe(true);
    if (decoded.success) {
      expect(
        resolveBackingIndex({
          backingIndexPrefix: BACKING_INDEX_PREFIX,
          indexSuffix: decoded.indexSuffix,
        })
      ).toBe(BACKING_INDEX_NAME);
    }
  });
});

describe('decodeEncodedWorkflowExecutionId', () => {
  it('should roundtrip with generateEncodedWorkflowExecutionId', () => {
    const encoded = generateEncodedWorkflowExecutionId({
      backingIndexName: BACKING_INDEX_NAME,
      backingIndexPrefix: BACKING_INDEX_PREFIX,
    });

    expect(decodeEncodedWorkflowExecutionId(encoded)).toEqual({
      success: true,
      indexSuffix: INDEX_SUFFIX,
      uuid: MOCK_UUID,
    });
  });

  it('should return uuid with dashes in 8-4-4-4-12 format', () => {
    const encoded = generateEncodedWorkflowExecutionId({
      backingIndexName: BACKING_INDEX_NAME,
      backingIndexPrefix: BACKING_INDEX_PREFIX,
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
      { suffix: '000001', prefix: '.ds-.idx-' },
      { suffix: 'my-index', prefix: '.ds-.idx-' },
      { suffix: 'abc_def', prefix: '.ds-.idx-' },
      { suffix: 'some.long.suffix', prefix: '.ds-.prefix-' },
    ];

    for (const { suffix, prefix } of cases) {
      const encoded = generateEncodedWorkflowExecutionId({
        backingIndexName: `${prefix}${suffix}`,
        backingIndexPrefix: prefix,
      });

      expect(decodeEncodedWorkflowExecutionId(encoded)).toEqual({
        success: true,
        indexSuffix: suffix,
        uuid: MOCK_UUID,
      });
    }
  });

  it('should correctly reverse base64url encoding', () => {
    const original = `${INDEX_SUFFIX}_${MOCK_UUID_HEX}`;
    const encoded = Buffer.from(original)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    expect(decodeEncodedWorkflowExecutionId(encoded)).toEqual({
      success: true,
      indexSuffix: INDEX_SUFFIX,
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
    const encoded = Buffer.from(`${INDEX_SUFFIX}_tooshort`)
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
    const encoded = Buffer.from(`${INDEX_SUFFIX}_zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz`)
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
