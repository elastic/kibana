/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import seedrandom from 'seedrandom';
import type { ElasticsearchClient, Logger } from 'kibana/server';
import { ProjectTimeQuery } from './mappings';
import { StackTraceID } from '../../common/profiling';
import { getHits } from './compat';

export interface DownsampledEventsIndex {
  name: string;
  sampleRate: number;
}

function getFullDownsampledIndex(index: string, i: number): string {
  const downsampledIndexPrefix =
    (index.endsWith('-all') ? index.replaceAll('-all', '') : index) + '-5pow';
  return downsampledIndexPrefix + i.toString().padStart(2, '0');
}

// Return the index that has between targetSampleSize..targetSampleSize*samplingFactor entries.
// The starting point is the number of entries from the profiling-events-5pow<initialExp> index.
//
// More details on how the down-sampling works can be found at the write path
//   https://github.com/elastic/prodfiler/blob/bdcc2711c6cd7e89d63b58a17329fb9fdbabe008/pf-elastic-collector/elastic.go
export function getSampledTraceEventsIndex(
  index: string,
  targetSampleSize: number,
  sampleCountFromInitialExp: number,
  initialExp: number
): DownsampledEventsIndex {
  const maxExp = 11;
  const samplingFactor = 5;
  const fullEventsIndex: DownsampledEventsIndex = { name: index, sampleRate: 1 };

  if (sampleCountFromInitialExp === 0) {
    // Take the shortcut to the full events index.
    return fullEventsIndex;
  }

  if (sampleCountFromInitialExp >= samplingFactor * targetSampleSize) {
    // Search in more down-sampled indexes.
    for (let i = initialExp + 1; i <= maxExp; i++) {
      sampleCountFromInitialExp /= samplingFactor;
      if (sampleCountFromInitialExp < samplingFactor * targetSampleSize) {
        return { name: getFullDownsampledIndex(index, i), sampleRate: 1 / samplingFactor ** i };
      }
    }
    // If we come here, it means that the most sparse index still holds too many items.
    // The only problem is the query time, the result set is good.
    return {
      name: getFullDownsampledIndex(index, maxExp),
      sampleRate: 1 / samplingFactor ** maxExp,
    };
  } else if (sampleCountFromInitialExp < targetSampleSize) {
    // Search in less down-sampled indexes.
    for (let i = initialExp - 1; i >= 1; i--) {
      sampleCountFromInitialExp *= samplingFactor;
      if (sampleCountFromInitialExp >= targetSampleSize) {
        return {
          name: getFullDownsampledIndex(index, i),
          sampleRate: 1 / samplingFactor ** i,
        };
      }
    }

    return fullEventsIndex;
  }

  return {
    name: getFullDownsampledIndex(index, initialExp),
    sampleRate: 1 / samplingFactor ** initialExp,
  };
}

export async function findDownsampledIndex(
  logger: Logger,
  client: ElasticsearchClient,
  index: string,
  filter: ProjectTimeQuery,
  sampleSize: number
): Promise<DownsampledEventsIndex> {
  // Start with counting the results in the index down-sampled by 5^6.
  // That is in the middle of our down-sampled indexes.
  const initialExp = 6;
  let sampleCountFromInitialExp = 0;
  try {
    const resp = await client.search({
      index: getFullDownsampledIndex(index, initialExp),
      body: {
        query: filter,
        size: 0,
        track_total_hits: true,
      },
    });
    sampleCountFromInitialExp = getHits(resp).total?.value as number;
  } catch (e) {
    logger.info(e.message);
  }

  logger.info('sampleCountFromPow6 ' + sampleCountFromInitialExp);
  return getSampledTraceEventsIndex(index, sampleSize, sampleCountFromInitialExp, initialExp);
}

export function downsampleEventsRandomly(
  stackTraceEvents: Map<StackTraceID, number>,
  p: number,
  seed: string
): number {
  let totalCount = 0;

  // Make the RNG predictable to get reproducible results.
  const random = seedrandom(seed);

  for (const [id, count] of stackTraceEvents) {
    let newCount = 0;
    for (let i = 0; i < count; i++) {
      if (random() < p) {
        newCount++;
      }
    }
    if (newCount) {
      stackTraceEvents.set(id, newCount);
      totalCount += newCount;
    } else {
      stackTraceEvents.delete(id);
    }
  }

  return totalCount;
}
