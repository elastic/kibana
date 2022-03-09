/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  getSampledTraceEventsIndex,
  extractFileIDFromFrameID,
  DownsampledEventsIndex,
} from './search_flamechart';

describe('Using down-sampled indexes', () => {
  test('getSampledTraceEventsIndex', () => {
    const targetSampleSize = 20000;
    const initialExp = 6;
    const tests: Array<{
      sampleCountFromPow6: number;
      expected: DownsampledEventsIndex;
    }> = [
      {
        // stay with the input downsampled index
        sampleCountFromPow6: targetSampleSize,
        expected: { name: 'profiling-events-5pow6', sampleRate: 1 / 5 ** 6 },
      },
      {
        // stay with the input downsampled index
        sampleCountFromPow6: targetSampleSize * 5 - 1,
        expected: { name: 'profiling-events-5pow6', sampleRate: 1 / 5 ** 6 },
      },
      {
        // go down one downsampling step
        sampleCountFromPow6: targetSampleSize * 5,
        expected: { name: 'profiling-events-5pow7', sampleRate: 1 / 5 ** 7 },
      },
      {
        // go up one downsampling step
        sampleCountFromPow6: targetSampleSize - 1,
        expected: { name: 'profiling-events-5pow5', sampleRate: 1 / 5 ** 5 },
      },
      {
        // go to the full events index
        sampleCountFromPow6: 0,
        expected: { name: 'profiling-events', sampleRate: 1 },
      },
      {
        // go to the most downsampled index
        sampleCountFromPow6: targetSampleSize * 5 ** 8,
        expected: { name: 'profiling-events-5pow11', sampleRate: 1 / 5 ** 11 },
      },
    ];

    for (const t of tests) {
      expect(
        getSampledTraceEventsIndex(targetSampleSize, t.sampleCountFromPow6, initialExp)
      ).toEqual(t.expected);
    }
  });
});

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
