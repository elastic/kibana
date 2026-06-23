/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// eslint-disable-next-line import/no-nodejs-modules
import crypto from 'crypto';
import {
  decodeEncodedStepExecutionId,
  generateEncodedStepExecutionId,
} from './generate_step_execution_id';
import type { StackFrame } from '../../..';
import { WORKFLOWS_STEP_EXECUTIONS_DATA_STREAM_BACKING_PREFIX } from '../../../common/execution_storage_constants';
import { resolveBackingIndex } from '../resolve_backing_index/resolve_backing_index';

const BACKING_INDEX_PREFIX = WORKFLOWS_STEP_EXECUTIONS_DATA_STREAM_BACKING_PREFIX;
const BACKING_INDEX_NAME = '.ds-.workflows-step-executions-2026.06.22-000001';
const INDEX_SUFFIX = '2026.06.22-000001';

const EXECUTION_ID = 'workflow-exec-abc123';
const STEP_ID = 'connector-send-email';
const STACK_FRAMES: StackFrame[] = [];

const EXPECTED_HASH = crypto
  .createHash('sha256')
  .update(`${EXECUTION_ID}_${STEP_ID}`)
  .digest('hex')
  .slice(0, 32);

const baseArgs = {
  executionId: EXECUTION_ID,
  stepId: STEP_ID,
  stackFrames: STACK_FRAMES,
  backingIndexName: BACKING_INDEX_NAME,
  backingIndexPrefix: BACKING_INDEX_PREFIX,
};

describe('generateEncodedStepExecutionId', () => {
  it('should return a base64url-encoded string', () => {
    const result = generateEncodedStepExecutionId(baseArgs);

    expect(result).not.toContain('+');
    expect(result).not.toContain('/');
    expect(result).not.toContain('=');
  });

  it('should produce a deterministic result for the same inputs', () => {
    const result1 = generateEncodedStepExecutionId(baseArgs);
    const result2 = generateEncodedStepExecutionId(baseArgs);

    expect(result1).toBe(result2);
  });

  it('should encode indexSuffix + hash as base64url', () => {
    const result = generateEncodedStepExecutionId(baseArgs);

    expect(result).toBe(
      Buffer.from(`${INDEX_SUFFIX}_${EXPECTED_HASH}`)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
    );
  });

  it('should derive the index suffix by stripping the backing index prefix', () => {
    const prefix = '.ds-.my-index-';
    const result = generateEncodedStepExecutionId({
      ...baseArgs,
      backingIndexName: `${prefix}abc_def`,
      backingIndexPrefix: prefix,
    });
    const decoded = decodeEncodedStepExecutionId(result);

    expect(decoded.success).toBe(true);
    if (decoded.success) {
      expect(decoded.indexSuffix).toBe('abc_def');
    }
  });

  it('should throw if backing index does not match prefix', () => {
    expect(() =>
      generateEncodedStepExecutionId({
        ...baseArgs,
        backingIndexName: '.workflows-step-executions-000001',
      })
    ).toThrow(/does not start with prefix/);
  });

  it('should handle backing index that equals the prefix (empty suffix)', () => {
    const result = generateEncodedStepExecutionId({
      ...baseArgs,
      backingIndexName: BACKING_INDEX_PREFIX,
    });
    const decoded = decodeEncodedStepExecutionId(result);

    expect(decoded).toEqual({
      success: true,
      indexSuffix: '',
      stepExecutionHash: EXPECTED_HASH,
    });
  });

  it('should include stack frames in the hash', () => {
    const withFrames = generateEncodedStepExecutionId({
      ...baseArgs,
      stackFrames: [
        {
          stepId: 'foreachstep',
          nestedScopes: [{ nodeId: 'enterForeach_step1', nodeType: 'foreach', scopeId: '1' }],
        },
      ],
    });
    const withoutFrames = generateEncodedStepExecutionId(baseArgs);

    expect(withFrames).not.toBe(withoutFrames);
  });

  it('roundtrips backing index through encode, decode, and resolveBackingIndex', () => {
    const encoded = generateEncodedStepExecutionId(baseArgs);
    const decoded = decodeEncodedStepExecutionId(encoded);

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

describe('decodeEncodedStepExecutionId', () => {
  it('should roundtrip with generateEncodedStepExecutionId', () => {
    const encoded = generateEncodedStepExecutionId(baseArgs);

    expect(decodeEncodedStepExecutionId(encoded)).toEqual({
      success: true,
      indexSuffix: INDEX_SUFFIX,
      stepExecutionHash: EXPECTED_HASH,
    });
  });

  it('should return a 32-char hex hash', () => {
    const encoded = generateEncodedStepExecutionId(baseArgs);
    const decoded = decodeEncodedStepExecutionId(encoded);

    expect(decoded.success).toBe(true);
    if (decoded.success) {
      expect(decoded.stepExecutionHash).toMatch(/^[a-f0-9]{32}$/);
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
      const encoded = generateEncodedStepExecutionId({
        ...baseArgs,
        backingIndexName: `${prefix}${suffix}`,
        backingIndexPrefix: prefix,
      });
      const decoded = decodeEncodedStepExecutionId(encoded);

      expect(decoded.success).toBe(true);
      if (decoded.success) {
        expect(decoded.indexSuffix).toBe(suffix);
        expect(decoded.stepExecutionHash).toBe(EXPECTED_HASH);
      }
    }
  });

  it('should correctly reverse base64url encoding', () => {
    const original = `${INDEX_SUFFIX}_${EXPECTED_HASH}`;
    const encoded = Buffer.from(original)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    expect(decodeEncodedStepExecutionId(encoded)).toEqual({
      success: true,
      indexSuffix: INDEX_SUFFIX,
      stepExecutionHash: EXPECTED_HASH,
    });
  });

  it('should return error for string without separator', () => {
    const encoded = Buffer.from('noseparatorhere')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    expect(decodeEncodedStepExecutionId(encoded)).toEqual({
      success: false,
      error: 'Invalid encoded step execution ID: missing separator',
    });
  });

  it('should return error for malformed hash (wrong length)', () => {
    const encoded = Buffer.from(`${INDEX_SUFFIX}_tooshort`)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    expect(decodeEncodedStepExecutionId(encoded)).toEqual({
      success: false,
      error: 'Invalid encoded step execution ID: malformed hash',
    });
  });

  it('should return error for malformed hash (non-hex characters)', () => {
    const nonHex = 'z'.repeat(32);
    const encoded = Buffer.from(`${INDEX_SUFFIX}_${nonHex}`)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    expect(decodeEncodedStepExecutionId(encoded)).toEqual({
      success: false,
      error: 'Invalid encoded step execution ID: malformed hash',
    });
  });

  it('should return error for empty string input', () => {
    expect(decodeEncodedStepExecutionId('')).toEqual({
      success: false,
      error: 'Invalid encoded step execution ID: missing separator',
    });
  });
});
