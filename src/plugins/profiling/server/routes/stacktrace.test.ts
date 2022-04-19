/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { extractFileIDFromFrameID } from './stacktrace';

describe('Extract FileID from FrameID', () => {
  test('extractFileIDFromFrameID', () => {
    const tests: Array<{
      frameID: string;
      expected: string;
    }> = [
      {
        frameID: 'aQpJmTLWydNvOapSFZOwKgAAAAAAB924',
        expected: 'aQpJmTLWydNvOapSFZOwKg==',
      },
      {
        frameID: 'hz_u-HGyrN6qeIk6UIJeCAAAAAAAAAZZ',
        expected: 'hz_u-HGyrN6qeIk6UIJeCA==',
      },
    ];

    for (const t of tests) {
      expect(extractFileIDFromFrameID(t.frameID)).toEqual(t.expected);
    }
  });
});
