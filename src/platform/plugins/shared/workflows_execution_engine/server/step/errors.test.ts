/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Readable } from 'stream';
import {
  formatBytes,
  parseByteSize,
  resolveMaxStepSizeBytes,
  ResponseSizeLimitError,
  safeOutputSize,
  TemplateSizeLimitExceeded,
  WorkflowOutputBudgetExceeded,
  WorkflowOutputSizeExceeded,
  WorkflowStepCountExceeded,
} from './errors';

describe('formatBytes', () => {
  it('should format 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('should format bytes', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  it('should format kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('should format megabytes', () => {
    expect(formatBytes(10 * 1024 * 1024)).toBe('10 MB');
    expect(formatBytes(15.5 * 1024 * 1024)).toBe('15.5 MB');
  });

  it('should format gigabytes', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
  });
});

describe('parseByteSize', () => {
  it('should parse bytes', () => {
    expect(parseByteSize('100b')).toBe(100);
    expect(parseByteSize('100B')).toBe(100);
  });

  it('should parse kilobytes', () => {
    expect(parseByteSize('500kb')).toBe(500 * 1024);
    expect(parseByteSize('500KB')).toBe(500 * 1024);
  });

  it('should parse megabytes', () => {
    expect(parseByteSize('10mb')).toBe(10 * 1024 * 1024);
    expect(parseByteSize('15MB')).toBe(15 * 1024 * 1024);
  });

  it('should parse gigabytes', () => {
    expect(parseByteSize('1gb')).toBe(1024 * 1024 * 1024);
  });

  it('should accept raw numbers', () => {
    expect(parseByteSize(12345)).toBe(12345);
  });

  it('should throw on invalid strings', () => {
    expect(() => parseByteSize('invalid')).toThrow('Invalid byte size string');
    expect(() => parseByteSize('10')).toThrow('Invalid byte size string');
    expect(() => parseByteSize('10tb')).toThrow('Invalid byte size string');
    expect(() => parseByteSize('')).toThrow('Invalid byte size string');
  });
});

describe('safeOutputSize', () => {
  it('should return size for a normal object', () => {
    const obj = { key: 'value', nested: { num: 42 } };
    const expected = Buffer.byteLength(JSON.stringify(obj), 'utf8');
    expect(safeOutputSize(obj)).toBe(expected);
  });

  it('should return size for a string', () => {
    expect(safeOutputSize('hello')).toBe(7); // includes quotes: "hello"
  });

  it('should return a positive value for a Readable stream (serializable as object)', () => {
    // Note: Readable streams are technically JSON-serializable (they have enumerable properties).
    // The base class size check still catches these if they exceed the limit.
    // Non-serializable values (circular refs, BigInt) are the ones that return -1.
    const stream = new Readable({ read() {} });
    expect(safeOutputSize(stream)).toBeGreaterThan(0);
  });

  it('should return -1 for circular references', () => {
    const obj: any = { a: 1 };
    obj.self = obj;
    expect(safeOutputSize(obj)).toBe(-1);
  });

  it('should return size for null', () => {
    expect(safeOutputSize(null)).toBe(4); // "null"
  });

  it('should return size for arrays', () => {
    const arr = [1, 2, 3];
    expect(safeOutputSize(arr)).toBe(Buffer.byteLength('[1,2,3]', 'utf8'));
  });
});

describe('ResponseSizeLimitError', () => {
  it('should create an error with the correct type and message', () => {
    const error = new ResponseSizeLimitError(1024, 'my_step');
    expect(error.type).toBe('StepSizeLimitExceeded');
    expect(error.message).toContain('my_step');
    expect(error.message).toContain('1 KB');
    expect(error.details?.limitBytes).toBe(1024);
  });

  it('should include limit in message', () => {
    const error = new ResponseSizeLimitError(10 * 1024 * 1024, 'es_step');
    expect(error.message).toContain('10 MB');
    expect(error.message).toContain('exceeded the');
    expect(error.details?.limitBytes).toBe(10 * 1024 * 1024);
  });
});

describe('resolveMaxStepSizeBytes', () => {
  it('should use step-level config when node has max-step-size', () => {
    const node = { configuration: { 'max-step-size': '5mb' } } as any;
    expect(resolveMaxStepSizeBytes(node, undefined, undefined)).toBe(5 * 1024 * 1024);
  });

  it('should prefer step-level over workflow and config when all are present', () => {
    const node = { configuration: { 'max-step-size': '5mb' } } as any;
    const workflowExecution = {
      workflowDefinition: { settings: { 'max-step-size': '15mb' } },
    } as any;
    const config = { maxResponseSize: { getValueInBytes: () => 2 * 1024 * 1024 } } as any;
    expect(resolveMaxStepSizeBytes(node, workflowExecution, config)).toBe(5 * 1024 * 1024);
  });

  it('should fall back to workflow settings when node has no config', () => {
    const workflowExecution = {
      workflowDefinition: { settings: { 'max-step-size': '15mb' } },
    } as any;
    expect(resolveMaxStepSizeBytes(undefined, workflowExecution, undefined)).toBe(15 * 1024 * 1024);
  });

  it('should fall back to plugin config when node and workflow have no config', () => {
    const config = { maxResponseSize: { getValueInBytes: () => 2 * 1024 * 1024 } } as any;
    expect(resolveMaxStepSizeBytes(undefined, undefined, config)).toBe(2 * 1024 * 1024);
  });

  it('should return default when all are undefined', () => {
    expect(resolveMaxStepSizeBytes(undefined, undefined, undefined)).toBe(10 * 1024 * 1024);
  });
});

describe('TemplateSizeLimitExceeded', () => {
  it('should create an error with the correct type and message', () => {
    const error = new TemplateSizeLimitExceeded(1024);
    expect(error.type).toBe('TemplateSizeLimitExceeded');
    expect(error.message).toContain('1 KB');
    expect(error.message).toContain('Template rendering');
    expect(error.details?.limitBytes).toBe(1024);
  });
});

describe('WorkflowOutputBudgetExceeded', () => {
  it('should create an error with the correct type, message, and details', () => {
    const error = new WorkflowOutputBudgetExceeded(100 * 1024 * 1024, 120 * 1024 * 1024, 'step1');
    expect(error.type).toBe('WorkflowOutputBudgetExceeded');
    expect(error.message).toContain('100 MB');
    expect(error.message).toContain('120 MB');
    expect(error.message).toContain('step1');
    expect(error.details?.budgetBytes).toBe(100 * 1024 * 1024);
    expect(error.details?.totalBytes).toBe(120 * 1024 * 1024);
  });
});

describe('WorkflowStepCountExceeded', () => {
  it('should have correct name and message', () => {
    const error = new WorkflowStepCountExceeded(200, 150);
    expect(error.name).toBe('WorkflowStepCountExceeded');
    expect(error.message).toContain('200');
    expect(error.message).toContain('150');
    expect(error.message).toContain('maximum');
  });
});

describe('WorkflowOutputSizeExceeded', () => {
  it('should create an error with the correct type, message, and details', () => {
    const error = new WorkflowOutputSizeExceeded(5 * 1024 * 1024, 8 * 1024 * 1024);
    expect(error.type).toBe('WorkflowOutputSizeExceeded');
    expect(error.message).toContain('5 MB');
    expect(error.message).toContain('8 MB');
    expect(error.details?.limitBytes).toBe(5 * 1024 * 1024);
    expect(error.details?.actualBytes).toBe(8 * 1024 * 1024);
  });
});
