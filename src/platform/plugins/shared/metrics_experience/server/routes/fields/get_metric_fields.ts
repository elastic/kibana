/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Fields } from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/core/server';
import { isNumber } from 'lodash';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import type { MetricField, MetricFieldsResponse } from '../../../common/types';
import { deduplicateFields } from '../../lib/fields/deduplicate_fields';
import { extractMetricFields } from '../../lib/fields/extract_metric_fields';
import { enrichMetricFields } from '../../lib/fields/enrich_metric_fields';
import { extractDimensions } from '../../lib/dimensions/extract_dimensions';
import { buildMetricField } from '../../lib/fields/build_metric_field';
import { retrieveFieldCaps } from '../../lib/fields/retrieve_fieldcaps';
import { applyPagination } from '../../lib/pagination/apply_pagination';

export async function getMetricFields({
  indexPattern,
  fields = '*',
  from,
  to,
  esClient,
  page,
  size,
  logger,
}: {
  esClient: TracedElasticsearchClient;
  indexPattern: string;
  fields?: Fields;
  from: number;
  to: number;
  page: number;
  size: number;
  logger: Logger;
}): Promise<MetricFieldsResponse> {
  if (!indexPattern) return { fields: [], total: 0 };

  const dataStreamFieldCapsMap = await retrieveFieldCaps({
    esClient: esClient.client,
    indexPattern,
    to,
    from,
    fields,
  });

  const allMetricFields: MetricField[] = [];
  for (const [dataStreamName, fieldCaps] of dataStreamFieldCapsMap.entries()) {
    if (isNumber(dataStreamName) || fieldCaps == null) continue;
    if (Object.keys(fieldCaps).length === 0) continue;

    const metricFields = extractMetricFields(fieldCaps);
    const allDimensions = extractDimensions(fieldCaps);

    const initialFields = metricFields.map(({ fieldName, type, typeInfo }) =>
      buildMetricField({
        name: fieldName,
        index: dataStreamName,
        dimensions: allDimensions,
        type,
        typeInfo,
      })
    );

    const deduped = deduplicateFields(initialFields);
    allMetricFields.push(...deduped);
  }

  allMetricFields.sort((a, b) => a.name.localeCompare(b.name));

  const enrichedMetricFields = await enrichMetricFields({
    esClient,
    metricFields: applyPagination({ metricFields: allMetricFields, page, size }),
    dataStreamFieldCapsMap,
    logger,
  });

  const finalFields = enrichedMetricFields.map((field) => {
    return {
      ...field,
      dimensions: field.dimensions.sort((a, b) => a.name.localeCompare(b.name)),
    };
  });

  return { fields: finalFields, total: allMetricFields.length };
}
