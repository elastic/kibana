/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import { retrieveFieldCaps } from '../../lib/fields/retrieve_fieldcaps';
import { getTimeSeriesFieldCapsGenerator } from '../../lib/fields/iterate_field_caps_generator';

export const getIndexPatternMetadata = async ({
  esClient,
  indexPattern,
  from,
  to,
}: {
  esClient: TracedElasticsearchClient;
  indexPattern: string;
  from: number;
  to: number;
}) => {
  const fieldCapsMap = await retrieveFieldCaps({
    esClient: esClient.client,
    indexPattern,
    fields: ['*'],
    timerange: { from, to },
  });

  const indexPatternMetadata = new Map<string, { hasTimeSeriesFields: boolean }>();
  for (const [index, fields] of fieldCapsMap.entries()) {
    indexPatternMetadata.set(index, { hasTimeSeriesFields: false });

    for (const timeSeriesField of getTimeSeriesFieldCapsGenerator(fields!, {
      batchSize: 500,
    })) {
      if (timeSeriesField.length > 0) {
        indexPatternMetadata.set(index, { hasTimeSeriesFields: true });
        continue;
      }
    }
  }

  return Object.fromEntries(indexPatternMetadata);
};
