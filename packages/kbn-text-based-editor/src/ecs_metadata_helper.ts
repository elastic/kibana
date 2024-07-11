/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ESQLRealField } from '@kbn/esql-validation-autocomplete';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import { chunk } from 'lodash';

const removeKeywordSuffix = (name: string) => {
  return name.endsWith('.keyword') ? name.slice(0, -8) : name;
};

/**
 * Temporary helper to convert ECS field type to ESQL type since currently some might not match
 * @param type
 * @returns
 */
const convertEcsFieldTypeToESQLType = (type?: string) => {
  if (type === 'keyword') return 'string';
  return type;
};

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
          if (!metadata || convertEcsFieldTypeToESQLType(metadata.type) !== c.type) return c;
          return {
            ...c,
            metadata,
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
 * if available
 *
 * @param columns
 * @param fieldsMetadata
 * @returns
 */
export async function getBulkColumnsWithMetadata(
  columns: Array<Omit<ESQLRealField, 'metadata'>>,
  fieldsMetadata?: FieldsMetadataPublicStart
): Promise<ESQLRealField[]> {
  if (!fieldsMetadata) return columns;

  try {
    // Chunking requests here since we are calling fieldsMetadata.find with list of fields,
    // and we need to make sure payload is not too big, or else get 400 error
    const chunkedColumns = chunk(columns, 250);
    const result = await Promise.allSettled(
      chunkedColumns.map((c) => getColumnsWithMetadata(c, fieldsMetadata))
    );
    return result.flatMap((r, idx) => (r.status === 'fulfilled' ? r.value : chunkedColumns[idx]));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Unable to fetch field metadata', error);
  }
  return columns;
}
