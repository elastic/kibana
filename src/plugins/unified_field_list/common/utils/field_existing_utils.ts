/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Boom from '@hapi/boom';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { RuntimeField } from '@kbn/data-views-plugin/common';
import type { DataViewsContract, DataView, FieldSpec } from '@kbn/data-views-plugin/common';
import { IKibanaSearchRequest } from '@kbn/data-plugin/common';

export type SearchHandler = (
  params: IKibanaSearchRequest['params']
) => Promise<estypes.SearchResponse<Array<estypes.SearchHit<unknown>>>>;

/**
 * The number of docs to sample to determine field empty status.
 */

export interface Field {
  name: string;
  isScript: boolean;
  isMeta: boolean;
  lang?: estypes.ScriptLanguage;
  script?: string;
  runtimeField?: RuntimeField;
}

export async function fetchFieldExistence({
  search,
  dataViewsService,
  dataView,
  dslQuery = { match_all: {} },
  fromDate,
  toDate,
  timeFieldName,
  includeFrozen,
  metaFields,
}: {
  search: SearchHandler;
  dataView: DataView;
  dslQuery: object;
  fromDate?: string;
  toDate?: string;
  timeFieldName?: string;
  includeFrozen: boolean;
  metaFields: string[];
  dataViewsService: DataViewsContract;
}) {
  const allFields = buildFieldList(dataView, metaFields);
  const existingFieldList = await dataViewsService.getFieldsForIndexPattern(dataView, {
    // filled in by data views service
    pattern: '',
    indexFilter: toQuery(timeFieldName, fromDate, toDate, dslQuery),
  });
  return {
    indexPatternTitle: dataView.title,
    existingFieldNames: existingFields(existingFieldList, allFields),
  };
}

/**
 * Exported only for unit tests.
 */
export function buildFieldList(indexPattern: DataView, metaFields: string[]): Field[] {
  return indexPattern.fields.map((field) => {
    return {
      name: field.name,
      isScript: !!field.scripted,
      lang: field.lang,
      script: field.script,
      // id is a special case - it doesn't show up in the meta field list,
      // but as it's not part of source, it has to be handled separately.
      isMeta: metaFields?.includes(field.name) || field.name === '_id',
      runtimeField: !field.isMapped ? field.runtimeField : undefined,
    };
  });
}

function toQuery(
  timeFieldName: string | undefined,
  fromDate: string | undefined,
  toDate: string | undefined,
  dslQuery: object
) {
  const filter =
    timeFieldName && fromDate && toDate
      ? [
          {
            range: {
              [timeFieldName]: {
                format: 'strict_date_optional_time',
                gte: fromDate,
                lte: toDate,
              },
            },
          },
          dslQuery,
        ]
      : [dslQuery];

  const query = {
    bool: {
      filter,
    },
  };
  return query;
}

/**
 * Exported only for unit tests.
 */
export function existingFields(filteredFields: FieldSpec[], allFields: Field[]): string[] {
  const filteredFieldsSet = new Set(filteredFields.map((f) => f.name));

  return allFields
    .filter((field) => field.isScript || field.runtimeField || filteredFieldsSet.has(field.name))
    .map((f) => f.name);
}

/**
 * Exported only for unit tests.
 */
export function legacyExistingFields(docs: estypes.SearchHit[], fields: Field[]): string[] {
  const missingFields = new Set(fields);

  for (const doc of docs) {
    if (missingFields.size === 0) {
      break;
    }

    missingFields.forEach((field) => {
      let fieldStore = doc.fields!;
      if (field.isMeta) {
        fieldStore = doc;
      }
      const value = fieldStore[field.name];
      if (Array.isArray(value) && value.length) {
        missingFields.delete(field);
      } else if (!Array.isArray(value) && value) {
        missingFields.delete(field);
      }
    });
  }

  return fields.filter((field) => !missingFields.has(field)).map((f) => f.name);
}

export function isBoomError(error: { isBoom?: boolean }): error is Boom.Boom {
  return error.isBoom === true;
}
