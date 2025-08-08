/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Fields } from '@elastic/elasticsearch/lib/api/types';
import { type ElasticsearchClient, type Logger } from '@kbn/core/server';
import { isNumber } from 'lodash';
import { type MetricField } from '../types';
import { deduplicateFields } from './deduplicate_fields';
import { getEcsFieldDescriptions } from './get_ecs_field_descriptions';
import { extractMetricFields } from './extract_metric_fields';
import { sampleAndProcessMetricFields } from './sample_metric_documents';
import { extractDimensions } from './extract_dimensions';
import { buildMetricField } from './build_metric_field';
import { retrieveFieldCaps } from './retrieve_fieldcaps';
import { applyPagination } from './apply_pagination';

export async function fetchMetricFields({
  indexPattern,
  fields = '*',
  from,
  to,
  esClient,
  page,
  size,
  logger,
}: {
  esClient: ElasticsearchClient;
  indexPattern: string;
  fields?: Fields;
  from: string;
  to: string;
  page: number;
  size: number;
  logger: Logger;
}): Promise<{ fields: MetricField[]; total: number; error?: string }> {
  if (!indexPattern) return { fields: [], total: 0 };

  // Wait for all field caps requests to complete
  const dataStreamFieldCapsMap = await retrieveFieldCaps({
    esClient,
    indexPattern,
    to,
    from,
    fields,
  });

  // Process results from each data stream
  const allMetricFields: MetricField[] = [];

  for (const [dataStreamName, fieldCaps] of dataStreamFieldCapsMap.entries()) {
    if (isNumber(dataStreamName) || fieldCaps == null) continue;
    if (Object.keys(fieldCaps).length === 0) continue;

    // Get all the metrics fields
    const metricFields = extractMetricFields(fieldCaps);

    // Get all dimensions for context
    const allDimensions = extractDimensions(fieldCaps);

    // Build initial data stream objects for deduplication
    const initialFields: MetricField[] = [];
    for (const { fieldName, type, typeInfo } of metricFields) {
      initialFields.push(
        buildMetricField({
          name: fieldName,
          index: dataStreamName, // Use data stream name as index value
          dimensions: allDimensions, // Use all dimensions initially
          type,
          typeInfo,
        })
      );
    }

    // Deduplicate fields before sampling to reduce work
    const deduped = deduplicateFields(initialFields);
    allMetricFields.push(...deduped);
  }

  // Sort the metrics
  allMetricFields.sort((a, b) => a.name.localeCompare(b.name));

  // Apply pagination then sample the metrics fields
  const processedMetricFields = await sampleAndProcessMetricFields({
    esClient,
    metricFields: applyPagination({ metricFields: allMetricFields, page, size }),
    dataStreamFieldCapsMap,
    logger,
  });

  // Get ECS descriptions for all field names
  const ecsDescriptions = getEcsFieldDescriptions(processedMetricFields.map((field) => field.name));

  const finalFields = processedMetricFields.map((field) => {
    const ecsDescription = ecsDescriptions.get(field.name);

    // Priority: existing description -> ECS description
    const description = field.description || ecsDescription;
    const source = field.description ? 'custom' : ecsDescription ? 'ecs' : 'custom';

    return {
      ...field,
      description,
      unit: field.unit,
      source,
      // Sort dimensions alphabetically by name
      dimensions: field.dimensions.sort((a, b) => a.name.localeCompare(b.name)),
    };
  });
  // Sort fields alphabetically by name

  return { fields: finalFields, total: allMetricFields.length };
}
