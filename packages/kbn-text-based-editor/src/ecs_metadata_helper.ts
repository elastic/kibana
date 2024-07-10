/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DatatableColumnType } from '@kbn/expressions-plugin/common';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';

const ECS_VERSION_FIELD = 'ecs.version';

const removeKeywordModifier = (name: string) => {
  return name.endsWith('.keyword') ? name.slice(0, -8) : name;
};

export async function getColumnsWithMetadata(
  columns: Array<{
    name: string;
    type: DatatableColumnType;
  }>,
  fieldsMetadata?: FieldsMetadataPublicStart
) {
  if (!fieldsMetadata || !columns.find((c) => c.name === ECS_VERSION_FIELD)) {
    return columns;
  }

  try {
    const fieldsMetadataClient = await fieldsMetadata?.getClient();
    if (fieldsMetadataClient) {
      const fields = await fieldsMetadataClient.find({
        fieldNames: columns.map((c) => c.name),
      });

      if (fields.fields) {
        return columns.map((c) => ({
          ...c,
          // Metadata services gives description for
          // 'ecs.version' but not 'ecs.version.keyword'
          // but both should show description if available
          metadata: fields.fields[removeKeywordModifier(c.name)],
        }));
      }
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Unable to fetch field metadata', error);
  }
  return columns;
}
