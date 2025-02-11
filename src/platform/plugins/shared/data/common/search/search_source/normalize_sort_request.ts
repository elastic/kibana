/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { estypes } from '@elastic/elasticsearch';
import type { DataView } from '@kbn/data-views-plugin/common';
import { EsQuerySortValue } from './types';

type FieldSortOptions = estypes.FieldSort &
  estypes.ScoreSort &
  estypes.GeoDistanceSort &
  Omit<estypes.ScriptSort, 'script'> & {
    script?: estypes.ScriptSort['script'];
  };

export function normalizeSortRequest(
  sortObject: EsQuerySortValue | EsQuerySortValue[],
  indexPattern: DataView | string | undefined,
  defaultSortOptions: FieldSortOptions | string = {}
) {
  const sortArray: EsQuerySortValue[] = Array.isArray(sortObject) ? sortObject : [sortObject];
  return sortArray.map(function (sortable) {
    return normalize(sortable, indexPattern, defaultSortOptions);
  });
}

/**
 * Normalize the sort description to the more verbose format (e.g. { someField: "desc" } into
 * { someField: { "order": "desc"}}), and convert sorts on scripted fields into the proper script
 * for Elasticsearch. Mix in the default options according to the advanced settings.
 */
function normalize(
  sortable: EsQuerySortValue,
  indexPattern: DataView | string | undefined,
  defaultSortOptions: FieldSortOptions | string
) {
  const [[sortField, sortOrder]] = Object.entries(sortable);
  const order = typeof sortOrder === 'object' ? sortOrder : { order: sortOrder };

  if (
    indexPattern &&
    typeof indexPattern !== 'string' &&
    !indexPattern.getRuntimeField(sortField)
  ) {
    const indexField = indexPattern.getScriptedField(sortField);
    if (indexField && indexField.scripted && indexField.type !== 'date') {
      return {
        _script: {
          script: {
            source: indexField.script,
            lang: indexField.lang,
          },
          type: castSortType(indexField.type),
          ...order,
        },
      };
    }
  }

  // FIXME: for unknown reason on the server this setting is serialized
  // https://github.com/elastic/kibana/issues/89902
  if (typeof defaultSortOptions === 'string') {
    defaultSortOptions = JSON.parse(defaultSortOptions) as FieldSortOptions;
  }
  // Don't include unmapped_type for _score field
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { unmapped_type, ...otherSortOptions } = defaultSortOptions;
  return {
    [sortField]: {
      ...order,
      ...(sortField === '_score' ? otherSortOptions : defaultSortOptions),
    },
  };
}

// The ES API only supports sort scripts of type 'number' and 'string'
function castSortType(type: string) {
  if (['number'].includes(type)) {
    return 'number';
  } else if (['string', 'boolean'].includes(type)) {
    return 'string';
  }
  throw new Error(`Unsupported script sort type: ${type}`);
}
