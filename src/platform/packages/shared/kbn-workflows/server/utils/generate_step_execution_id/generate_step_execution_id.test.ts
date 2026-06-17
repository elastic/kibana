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

const INDEX_PATTERN = '.workflows-step-executions-*';
const INDEX_NAME = '.workflows-step-executions-000001';

const EXECUTION_ID = 'workflow-exec-abc123';
const STEP_ID = 'connector-send-email';
const STACK_FRAMES: StackFrame[] = [];

const EXPECTED_HASH = crypto
  .createHash('sha256')
  .update(`${EXECUTION_ID}_${STEP_ID}`)
  .digest('hex')
  .slice(0, 32);

describe('generateEncodedStepExecutionId', () => {
  it('should return a base64url-encoded string', () => {
    const result = generateEncodedStepExecutionId({
      executionId: EXECUTION_ID,
      stepId: STEP_ID,
      stackFrames: STACK_FRAMES,
      indexName: INDEX_NAME,
      indexPattern: INDEX_PATTERN,
    });

    expect(result).not.toContain('+');
    expect(result).not.toContain('/');
    expect(result).not.toContain('=');
  });

  it('should produce a deterministic result for the same inputs', () => {
    const args = {
      executionId: EXECUTION_ID,
      stepId: STEP_ID,
      stackFrames: STACK_FRAMES,
      indexName: INDEX_NAME,
      indexPattern: INDEX_PATTERN,
    };

    const result1 = generateEncodedStepExecutionId(args);
    const result2 = generateEncodedStepExecutionId(args);

    expect(result1).toBe(result2);
  });

  it('should encode indexSuffix + hash as base64url', () => {
    const result = generateEncodedStepExecutionId({
      executionId: EXECUTION_ID,
      stepId: STEP_ID,
      stackFrames: STACK_FRAMES,
      indexName: INDEX_NAME,
      indexPattern: INDEX_PATTERN,
    });

    expect(result).toBe(
      Buffer.from(`000001_${EXPECTED_HASH}`)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
    );
  });

  it('should derive the index suffix by stripping the pattern prefix', () => {
    const result = generateEncodedStepExecutionId({
      executionId: EXECUTION_ID,
      stepId: STEP_ID,
      stackFrames: STACK_FRAMES,
      indexName: '.my-index-abc_def',
      indexPattern: '.my-index-*',
    });
    const decoded = decodeEncodedStepExecutionId(result);

    expect(decoded.success).toBe(true);
    if (decoded.success) {
      expect(decoded.indexSuffix).toBe('abc_def');
    }
  });

  it('should throw if indexPattern does not end with *', () => {
    expect(() =>
      generateEncodedStepExecutionId({
        executionId: EXECUTION_ID,
        stepId: STEP_ID,
        stackFrames: STACK_FRAMES,
        indexName: INDEX_NAME,
        indexPattern: '.workflows-step-executions-',
      })
    ).toThrow('indexPattern must end with *');
  });

  it('should handle index name that equals the pattern prefix (empty suffix)', () => {
    const result = generateEncodedStepExecutionId({
      executionId: EXECUTION_ID,
      stepId: STEP_ID,
      stackFrames: STACK_FRAMES,
      indexName: '.workflows-step-executions-',
      indexPattern: INDEX_PATTERN,
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
      executionId: EXECUTION_ID,
      stepId: STEP_ID,
      stackFrames: [
        {
          stepId: 'foreachstep',
          nestedScopes: [{ nodeId: 'enterForeach_step1', nodeType: 'foreach', scopeId: '1' }],
        },
      ],
      indexName: INDEX_NAME,
      indexPattern: INDEX_PATTERN,
    });
    const withoutFrames = generateEncodedStepExecutionId({
      executionId: EXECUTION_ID,
      stepId: STEP_ID,
      stackFrames: [],
      indexName: INDEX_NAME,
      indexPattern: INDEX_PATTERN,
    });

    expect(withFrames).not.toBe(withoutFrames);
  });
});

describe('decodeEncodedStepExecutionId', () => {
  it('should roundtrip with generateEncodedStepExecutionId', () => {
    const encoded = generateEncodedStepExecutionId({
      executionId: EXECUTION_ID,
      stepId: STEP_ID,
      stackFrames: STACK_FRAMES,
      indexName: INDEX_NAME,
      indexPattern: INDEX_PATTERN,
    });

    expect(decodeEncodedStepExecutionId(encoded)).toEqual({
      success: true,
      indexSuffix: '000001',
      stepExecutionHash: EXPECTED_HASH,
    });
  });

  it('should return a 32-char hex hash', () => {
    const encoded = generateEncodedStepExecutionId({
      executionId: EXECUTION_ID,
      stepId: STEP_ID,
      stackFrames: STACK_FRAMES,
      indexName: INDEX_NAME,
      indexPattern: INDEX_PATTERN,
    });
    const decoded = decodeEncodedStepExecutionId(encoded);

    expect(decoded.success).toBe(true);
    if (decoded.success) {
      expect(decoded.stepExecutionHash).toMatch(/^[a-f0-9]{32}$/);
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
      const encoded = generateEncodedStepExecutionId({
        executionId: EXECUTION_ID,
        stepId: STEP_ID,
        stackFrames: STACK_FRAMES,
        indexName,
        indexPattern,
      });
      const decoded = decodeEncodedStepExecutionId(encoded);

      expect(decoded.success).toBe(true);
      if (decoded.success) {
        expect(decoded.indexSuffix).toBe(expectedSuffix);
        expect(decoded.stepExecutionHash).toBe(EXPECTED_HASH);
      }
    }
  });

  it('should correctly reverse base64url encoding', () => {
    const original = `000001_${EXPECTED_HASH}`;
    const encoded = Buffer.from(original)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    expect(decodeEncodedStepExecutionId(encoded)).toEqual({
      success: true,
      indexSuffix: '000001',
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
    const encoded = Buffer.from('000001_tooshort')
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
    const encoded = Buffer.from(`000001_${nonHex}`)
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
