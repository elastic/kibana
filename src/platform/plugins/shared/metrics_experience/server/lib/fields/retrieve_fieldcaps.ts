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
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { dateRangeQuery } from '@kbn/es-query';

export async function retrieveFieldCaps({
  esClient,
  indexPattern,
  fields = '*',
  to,
  from,
}: {
  esClient: ElasticsearchClient;
  indexPattern: string;
  fields?: Fields;
  to: number;
  from: number;
}) {
  const dataStreamFieldCapsMap = new Map<
    string,
    Record<string, Record<string, FieldCapsFieldCapability>>
  >();

  // First, resolve the index pattern to get data streams
  const resolveResponse = await esClient.indices.resolveIndex({
    name: indexPattern,
    expand_wildcards: 'all',
  });

  // Extract data stream names
  const dataStreams = resolveResponse.data_streams || [];

  if (dataStreams.length === 0) {
    return dataStreamFieldCapsMap;
  }

  // Call field caps in parallel for each data stream
  const fieldCapsPromises = dataStreams.map(async (dataStream) => {
    const fieldCaps = await esClient.fieldCaps({
      index: dataStream.name,
      fields,
      include_unmapped: false,
      index_filter: dateRangeQuery(from, to)[0],
      types: [
        // Numeric types for metrics
        ES_FIELD_TYPES.LONG,
        ES_FIELD_TYPES.INTEGER,
        ES_FIELD_TYPES.SHORT,
        ES_FIELD_TYPES.BYTE,
        ES_FIELD_TYPES.DOUBLE,
        ES_FIELD_TYPES.FLOAT,
        ES_FIELD_TYPES.HALF_FLOAT,
        ES_FIELD_TYPES.SCALED_FLOAT,
        ES_FIELD_TYPES.UNSIGNED_LONG,
        ES_FIELD_TYPES.HISTOGRAM,
        // String types for dimensions
        ES_FIELD_TYPES.KEYWORD,
      ],
    });

    dataStreamFieldCapsMap.set(dataStream.name, fieldCaps.fields);
  });

  // Wait for all field caps requests to complete
  await Promise.all(fieldCapsPromises);

  // Return the datastream field caps map.
  return dataStreamFieldCapsMap;
}
