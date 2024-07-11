/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ESQLRealField } from '@kbn/esql-validation-autocomplete';
import type { DatatableColumnType } from '@kbn/expressions-plugin/common';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';

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
  columns: Array<{
    name: string;
    type: DatatableColumnType;
  }>,
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

      if (fields.fields) {
        return columns.map((c) => ({
          ...c,
          // Metadata services gives description for
          // 'ecs.version' but not 'ecs.version.keyword'
          // but both should show description if available
          metadata: fields.fields[removeKeywordSuffix(c.name)],
        }));
      }
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Unable to fetch field metadata', error);
  }
  return columns;
}
