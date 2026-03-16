/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SizeLimitedEmitter } from './create_workflow_liquid_engine';

describe('SizeLimitedEmitter', () => {
  const errorFactory = (maxBytes: number) => new Error(`Exceeded ${maxBytes} bytes`);

  it('should accumulate writes within limit', () => {
    const emitter = new SizeLimitedEmitter(1024, errorFactory);
    emitter.write('Hello');
    emitter.write(' ');
    emitter.write('World');
    expect(emitter.buffer).toBe('Hello World');
  });

  it('should throw when accumulated output exceeds limit', () => {
    const emitter = new SizeLimitedEmitter(10, errorFactory);
    emitter.write('12345');
    expect(() => emitter.write('678901')).toThrow('Exceeded 10 bytes');
  });

  it('should count multi-byte characters correctly', () => {
    const emitter = new SizeLimitedEmitter(5, errorFactory);
    expect(() => emitter.write('🎉🎉')).toThrow('Exceeded 5 bytes');
  });

  it('should handle null and undefined writes', () => {
    const emitter = new SizeLimitedEmitter(100, errorFactory);
    emitter.write(null);
    emitter.write(undefined);
    expect(emitter.buffer).toBe('');
  });

  it('should not throw when maxBytes is 0 (disabled)', () => {
    const emitter = new SizeLimitedEmitter(0, errorFactory);
    emitter.write('A'.repeat(1000));
    expect(emitter.buffer).toBe('A'.repeat(1000));
  });

  it('should use the provided error factory', () => {
    const customError = new Error('Custom OOM');
    const emitter = new SizeLimitedEmitter(5, () => customError);
    expect(() => emitter.write('too long')).toThrow('Custom OOM');
  });

  it('should throw on the write that exceeds, not the one before', () => {
    const emitter = new SizeLimitedEmitter(10, errorFactory);
    emitter.write('12345');
    emitter.write('12345');
    expect(() => emitter.write('1')).toThrow('Exceeded 10 bytes');
  });
});
