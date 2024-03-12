/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { sum } from 'lodash';
import { createTopNFunctions } from './functions';
import { decodeStackTraceResponse } from '..';
import { stacktraces } from './__fixtures__/stacktraces';

describe('TopN function operations', () => {
  const { events, stackTraces, stackFrames, executables, samplingRate } = decodeStackTraceResponse(
    stacktraces,
    false
  );
  const maxTopN = 5;
  const topNFunctions = createTopNFunctions({
    events,
    stackTraces,
    stackFrames,
    executables,
    startIndex: 0,
    endIndex: maxTopN,
    samplingRate,
    showErrorFrames: false,
  });
  const exclusiveCounts = topNFunctions.TopN.map((value) => value.CountExclusive);

  it('samples are less than or equal to original upsampled samples', () => {
    const totalUpsampledSamples = Math.ceil(sum([...events.values()]) / samplingRate);
    expect(topNFunctions.TotalCount).toBeLessThanOrEqual(totalUpsampledSamples);
  });

  it('number of functions is equal to maximum', () => {
    expect(topNFunctions.TopN.length).toEqual(maxTopN);
  });

  it('all exclusive counts are numeric', () => {
    expect(typeof exclusiveCounts[0]).toBe('number');
    expect(typeof exclusiveCounts[1]).toBe('number');
    expect(typeof exclusiveCounts[2]).toBe('number');
    expect(typeof exclusiveCounts[3]).toBe('number');
    expect(typeof exclusiveCounts[4]).toBe('number');
  });

  it('exclusive counts are sorted from highest to lowest', () => {
    expect(exclusiveCounts[0]).toBeGreaterThanOrEqual(exclusiveCounts[1]);
    expect(exclusiveCounts[1]).toBeGreaterThanOrEqual(exclusiveCounts[2]);
    expect(exclusiveCounts[2]).toBeGreaterThanOrEqual(exclusiveCounts[3]);
    expect(exclusiveCounts[3]).toBeGreaterThanOrEqual(exclusiveCounts[4]);
  });
});
