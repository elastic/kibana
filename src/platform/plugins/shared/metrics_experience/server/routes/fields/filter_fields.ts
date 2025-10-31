/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import type { EpochTimeRange } from '../../types';
import { sampleMetricMetadata } from '../../lib/fields/enrich_metric_fields';
import { buildMetricField } from '../../lib/fields/build_metric_field';

interface FilterFields {
  name: string;
  index: string;
}

export async function filterFieldsByDataAvailability({
  fields,
  esClient,
  logger,
  timerange,
  kuery,
}: {
  esClient: TracedElasticsearchClient;
  fields: FilterFields[];
  timerange: EpochTimeRange;
  logger: Logger;
  kuery: string;
}): Promise<FilterFields[]> {
  const fieldsByIndex = new Map(
    fields.reduce((acc, { index, name }) => {
      acc.set(index, [...(acc.get(index) || []), name]);
      return acc;
    }, new Map<string, string[]>())
  );

  const filteredResult: FilterFields[] = [];
  for (const [index, allFields] of fieldsByIndex.entries()) {
    const initialFields = allFields.map((field) =>
      buildMetricField({
        name: field,
        index,
        dimensions: [],
        type: 'number',
        typeInfo: { aggregatable: true, searchable: true, type: 'number' },
      })
    );

    const metricMetadataMap = await sampleMetricMetadata({
      esClient,
      metricFields: initialFields,
      logger,
      timerange,
      kuery,
    });

    for (const [mapKey, metricMetadata] of metricMetadataMap.entries()) {
      const [name] = mapKey.split('>');

      if (metricMetadata.dimensions.length > 0) {
        filteredResult.push({
          name,
          index,
        });
      }
    }
  }

  // Sort by index + name for consistent ordering
  filteredResult.sort((a, b) => {
    const aKey = `${a.index}>${a.name}`;
    const bKey = `${b.index}>${b.name}`;
    return aKey.localeCompare(bKey);
  });

  return filteredResult;
}
