/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESDocumentWithOperation, OtelProfilingEventDocument } from '@kbn/synthtrace-client';
import { Readable } from 'stream';
import { getDownsampledIndexName, getDownsamplingTransform } from './downsampling';

const EVENTS_INDEX = 'profiling-events-all.otel-default';

const downsample = async (
  documents: Array<ESDocumentWithOperation<OtelProfilingEventDocument>>
): Promise<Array<ESDocumentWithOperation<OtelProfilingEventDocument>>> => {
  const output: Array<ESDocumentWithOperation<OtelProfilingEventDocument>> = [];
  const transform = getDownsamplingTransform<OtelProfilingEventDocument>({
    eventsIndex: EVENTS_INDEX,
    getDownsampledIndex: (exponent) => getDownsampledIndexName(exponent, '.otel-default'),
    getCount: (event) => event.count ?? 1,
    withCount: (event, count) => ({ ...event, count }),
  });

  for await (const document of Readable.from(documents).pipe(transform)) {
    output.push(document);
  }

  return output;
};

describe('getDownsamplingTransform', () => {
  const randomSpy = jest.spyOn(Math, 'random');

  afterEach(() => {
    randomSpy.mockReset();
  });

  afterAll(() => {
    randomSpy.mockRestore();
  });

  it('samples each sample of an event again for every downsampled index', async () => {
    // 5pow01 keeps 2 of 3 samples, 5pow02 keeps 1 of 2, and 5pow03 keeps none.
    [0.1, 0.5, 0.1, 0.1, 0.9, 0.9].forEach((value) => randomSpy.mockReturnValueOnce(value));

    const documents = await downsample([{ _index: EVENTS_INDEX, count: 3 }]);

    expect(documents).toEqual([
      { _index: EVENTS_INDEX, count: 3 },
      { _index: 'profiling-events-5pow01.otel-default', count: 2 },
      { _index: 'profiling-events-5pow02.otel-default', count: 1 },
    ]);
  });

  it('does not downsample other documents', async () => {
    const host = { _index: 'profiling-hosts.otel-default' };

    expect(await downsample([host])).toEqual([host]);
    expect(randomSpy).not.toHaveBeenCalled();
  });
});
