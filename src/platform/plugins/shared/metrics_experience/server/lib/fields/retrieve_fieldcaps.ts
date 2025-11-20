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
  const indexFieldCapsMap = new Map<
    string,
    Record<string, Record<string, FieldCapsFieldCapability>>
  >();

  // First, resolve the index pattern to get data streams or indices
  const resolveResponse = await esClient.indices.resolveIndex({
    name: indexPattern,
    expand_wildcards: 'open',
  });

  // Extract resolved indices (data streams and regular indices)
  const resolvedIndices = [...resolveResponse.data_streams, ...resolveResponse.indices];

  const uniqueFieldTypes = new Set([...NUMERIC_TYPES, ...DIMENSION_TYPES]);

  // Call field caps in parallel for each index
  const fieldCapsPromises = resolvedIndices.map(async (index) => {
    const fieldCaps = await esClient.fieldCaps({
      index: index.name,
      fields,
      include_unmapped: false,
      index_filter: dateRangeQuery(from, to)[0],
      types: [...uniqueFieldTypes],
    });

    if (Object.keys(fieldCaps.fields).length > 0) {
      indexFieldCapsMap.set(index.name, fieldCaps.fields);
    }
  });

  // Wait for all field caps requests to complete
  await Promise.all(fieldCapsPromises);

  // Return the index field caps map
  return indexFieldCapsMap;
}
