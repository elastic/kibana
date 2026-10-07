/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESDocumentWithOperation, Fields } from '@kbn/synthtrace-client';
import { Transform } from 'stream';

const DOWNSAMPLING_FACTOR = 5;
const MAX_DOWNSAMPLING_EXPONENT = 11;

interface DownsamplingOptions<TDocument extends Fields> {
  eventsIndex: string;
  getDownsampledIndex: (exponent: number) => string;
  getCount: (document: ESDocumentWithOperation<TDocument>) => number;
  withCount: (
    document: ESDocumentWithOperation<TDocument>,
    count: number
  ) => ESDocumentWithOperation<TDocument>;
}

// Each sample of an event has a probability of 1/5 to be kept in the next downsampled index.
const sampleCount = (count: number): number => {
  let sampled = 0;

  for (let sample = 0; sample < count; sample++) {
    if (Math.random() < 1 / DOWNSAMPLING_FACTOR) {
      sampled++;
    }
  }

  return sampled;
};

/**
 * Also writes each event to the downsampled `profiling-events-5powNN` indices, which the
 * `_profiling` APIs read for larger time ranges. Like the OTel exporter does, the samples kept in
 * `5powNN` are sampled again for `5pow(NN+1)`, and events without samples left are not written.
 */
export function getDownsamplingTransform<TDocument extends Fields>({
  eventsIndex,
  getDownsampledIndex,
  getCount,
  withCount,
}: DownsamplingOptions<TDocument>): Transform {
  return new Transform({
    objectMode: true,
    transform(document: ESDocumentWithOperation<TDocument>, encoding, callback) {
      this.push(document);

      if (document._index === eventsIndex) {
        let count = getCount(document);

        for (let exponent = 1; exponent <= MAX_DOWNSAMPLING_EXPONENT; exponent++) {
          count = sampleCount(count);

          if (count === 0) {
            break;
          }

          this.push({ ...withCount(document, count), _index: getDownsampledIndex(exponent) });
        }
      }

      callback();
    },
  });
}

export const getDownsampledIndexName = (exponent: number, suffix: string = ''): string =>
  `profiling-events-${DOWNSAMPLING_FACTOR}pow${String(exponent).padStart(2, '0')}${suffix}`;
