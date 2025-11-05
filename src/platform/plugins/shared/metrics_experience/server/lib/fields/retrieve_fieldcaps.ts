/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldCapsFieldCapability, Fields } from '@elastic/elasticsearch/lib/api/types';
import { type ElasticsearchClient } from '@kbn/core/server';
import { dateRangeQuery } from '@kbn/es-query';
import { DIMENSION_TYPES, NUMERIC_TYPES } from '../../../common/fields/constants';
import type { EpochTimeRange } from '../../types';

export async function retrieveFieldCaps({
  esClient,
  indexPattern,
  fields = '*',
  timerange: { from, to },
}: {
  esClient: ElasticsearchClient;
  indexPattern: string;
  fields?: Fields;
  timerange: EpochTimeRange;
}) {
  const dataStreamFieldCapsMap = new Map<
    string,
    Record<string, Record<string, FieldCapsFieldCapability>>
  >();

  // First, resolve the index pattern to get data streams
  const resolveResponse = await esClient.indices.resolveIndex({
    name: indexPattern,
    expand_wildcards: 'open',
  });

  // Extract data stream names
  const dataStreams = resolveResponse.data_streams || [];

  if (dataStreams.length === 0) {
    return dataStreamFieldCapsMap;
  }

  const uniqueFieldTypes = new Set([...NUMERIC_TYPES, ...DIMENSION_TYPES]);

  // Call field caps in parallel for each data stream
  const fieldCapsPromises = dataStreams.map(async (dataStream) => {
    const fieldCaps = await esClient.fieldCaps({
      index: dataStream.name,
      fields,
      include_unmapped: false,
      index_filter: dateRangeQuery(from, to)[0],
      types: [...uniqueFieldTypes],
    });

    dataStreamFieldCapsMap.set(dataStream.name, fieldCaps.fields);
  });

  // Wait for all field caps requests to complete
  await Promise.all(fieldCapsPromises);

  // Return the datastream field caps map.
  return dataStreamFieldCapsMap;
}
