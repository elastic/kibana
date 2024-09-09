/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLRealField } from '@kbn/esql-validation-autocomplete';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import { chunk } from 'lodash';

const removeKeywordSuffix = (name: string) => {
  return name.endsWith('.keyword') ? name.slice(0, -8) : name;
};

/**
 * Returns columns with the metadata/description (e.g ECS info)
 * if available
 *
 * @param columns
 * @param fieldsMetadata
 * @returns
 */
export async function getColumnsWithMetadata(
  columns: Array<Omit<ESQLRealField, 'metadata'>>,
  fieldsMetadata?: FieldsMetadataPublicStart
): Promise<ESQLRealField[]> {
  if (!fieldsMetadata) return columns;

  try {
    const fieldsMetadataClient = await fieldsMetadata?.getClient();
    if (fieldsMetadataClient) {
      const fields = await fieldsMetadataClient.find({
        fieldNames: columns.map((c) => c.name),
        attributes: ['description', 'type'],
      });

      if (fields?.fields) {
        return columns.map((c) => {
          // Metadata services gives description for
          // 'ecs.version' but not 'ecs.version.keyword'
          // but both should show description if available
          const metadata = fields.fields[removeKeywordSuffix(c.name)];

          // Need to convert metadata's type (e.g. keyword) to ES|QL type (e.g. string) to check if they are the same
          if (!metadata || (metadata?.type && metadata.type !== c.type)) return c;
          return {
            ...c,
            metadata: { description: metadata.description },
          };
        });
      }
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Unable to fetch field metadata', error);
  }
  return columns;
}
/**
 * Returns columns with the metadata/description (e.g ECS info)
 * if available. Safely partition the requests to avoid 400 payload too big errors.
 *
 * @param columns
 * @param fieldsMetadata
 * @returns
 */
export async function getRateLimitedColumnsWithMetadata(
  columns: Array<Omit<ESQLRealField, 'metadata'>>,
  fieldsMetadata?: FieldsMetadataPublicStart,
  maxFieldsPerRequest = 250,
  maxConcurrentRequests = 10
): Promise<ESQLRealField[]> {
  if (!fieldsMetadata) return columns;

  try {
    // Chunking requests here since we are calling fieldsMetadata.find with list of fields,
    // and we need to make sure payload is not too big, or else get 400 error
    const chunkedColumns = chunk(columns, maxFieldsPerRequest);
    const result: Array<PromiseSettledResult<ESQLRealField[]>> = [];
    // Also only make max of n at a time to avoid too many concurrent requests
    for (let i = 0; i < chunkedColumns.length; i += maxConcurrentRequests) {
      const cols = chunkedColumns.slice(i, i + maxConcurrentRequests);
      const chunkResult = await Promise.allSettled(
        cols.map((c) => getColumnsWithMetadata(c, fieldsMetadata))
      );
      result.push(...chunkResult);
    }

    return result.flatMap((r, idx) => (r.status === 'fulfilled' ? r.value : chunkedColumns[idx]));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Unable to fetch field metadata', error);
  }
  return columns;
}
