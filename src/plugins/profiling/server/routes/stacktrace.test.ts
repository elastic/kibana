/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { StackTrace } from '../../common/profiling';
import { decodeStackTrace, EncodedStackTrace, runLengthDecodeReverse } from './stacktrace';

describe('Stack trace operations', () => {
  test('decodeStackTrace', () => {
    const tests: Array<{
      original: EncodedStackTrace;
      expected: StackTrace;
    }> = [
      {
        original: {
          FrameID: 'aQpJmTLWydNvOapSFZOwKgAAAAAAB924',
          Type: Buffer.from([0x1, 0x0]).toString('base64url'),
        } as EncodedStackTrace,
        expected: {
          FileID: ['aQpJmTLWydNvOapSFZOwKg=='],
          FrameID: ['aQpJmTLWydNvOapSFZOwKgAAAAAAB924'],
          Type: [0],
        } as StackTrace,
      },
      {
        original: {
          FrameID: 'hz_u-HGyrN6qeIk6UIJeCAAAAAAAAAZZ',
          Type: Buffer.from([0x1, 0x8]).toString('base64url'),
        } as EncodedStackTrace,
        expected: {
          FileID: ['hz_u-HGyrN6qeIk6UIJeCA=='],
          FrameID: ['hz_u-HGyrN6qeIk6UIJeCAAAAAAAAAZZ'],
          Type: [8],
        } as StackTrace,
      },
    ];

    for (const t of tests) {
      expect(decodeStackTrace(t.original)).toEqual(t.expected);
    }
  });

  test('runLengthDecodeReverse with optional parameter', () => {
    const tests: Array<{
      bytes: Buffer;
      expected: number[];
    }> = [
      {
        bytes: Buffer.from([0x5, 0x0, 0x2, 0x2]),
        expected: [2, 2, 0, 0, 0, 0, 0],
      },
      {
        bytes: Buffer.from([0x1, 0x8]),
        expected: [8],
      },
    ];

    for (const t of tests) {
      expect(runLengthDecodeReverse(t.bytes, t.expected.length)).toEqual(t.expected);
    }
  });

  test('runLengthDecodeReverse without optional parameter', () => {
    const tests: Array<{
      bytes: Buffer;
      expected: number[];
    }> = [
      {
        bytes: Buffer.from([0x5, 0x0, 0x2, 0x2]),
        expected: [2, 2, 0, 0, 0, 0, 0],
      },
      {
        bytes: Buffer.from([0x1, 0x8]),
        expected: [8],
      },
    ];

    for (const t of tests) {
      expect(runLengthDecodeReverse(t.bytes)).toEqual(t.expected);
    }
  });
});
