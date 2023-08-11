/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EsQuerySortValue, SortDirection } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { CONTEXT_TIE_BREAKER_FIELDS_SETTING } from '@kbn/discover-utils';

/**
 * Returns `EsQuerySort` which is used to sort records in the ES query
 * https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html
 * @param sortDir
 * @param timeFieldName
 * @param tieBreakerFieldName
 * @param isTimeNanosBased
 */
export function getEsQuerySort({
  sortDir,
  timeFieldName,
  tieBreakerFieldName,
  isTimeNanosBased,
}: {
  sortDir: SortDirection;
  timeFieldName: string;
  tieBreakerFieldName: string;
  isTimeNanosBased: boolean;
}): [EsQuerySortValue, EsQuerySortValue] {
  return [
    getESQuerySortForTimeField({ sortDir, timeFieldName, isTimeNanosBased }),
    getESQuerySortForTieBreaker({ sortDir, tieBreakerFieldName }),
  ];
}

/**
 * Prepares "sort" structure for a time field for next ES request
 * @param sortDir
 * @param timeFieldName
 * @param isTimeNanosBased
 */
export function getESQuerySortForTimeField({
  sortDir,
  timeFieldName,
  isTimeNanosBased,
}: {
  sortDir: SortDirection;
  timeFieldName: string;
  isTimeNanosBased: boolean;
}): EsQuerySortValue {
  return {
    [timeFieldName]: {
      order: sortDir,
      ...(isTimeNanosBased
        ? {
            format: 'strict_date_optional_time_nanos',
            numeric_type: 'date_nanos',
          }
        : { format: 'strict_date_optional_time' }),
    },
  };
}

/**
 * Prepares "sort" structure for a tie breaker for next ES request
 * @param sortDir
 * @param tieBreakerFieldName
 */
export function getESQuerySortForTieBreaker({
  sortDir,
  tieBreakerFieldName,
}: {
  sortDir: SortDirection;
  tieBreakerFieldName: string;
}): EsQuerySortValue {
  return { [tieBreakerFieldName]: sortDir };
}

/**
 * The default tie breaker for Discover
 */
export const DEFAULT_TIE_BREAKER_NAME = '_doc';

/**
 * The list of field names that are allowed for sorting, but not included in
 * data view fields.
 */
const META_FIELD_NAMES: string[] = ['_seq_no', '_doc', '_uid'];

/**
 * Returns a field from the intersection of the set of sortable fields in the
 * given data view and a given set of candidate field names.
 */
export function getTieBreakerFieldName(
  dataView: DataView,
  uiSettings: Pick<IUiSettingsClient, 'get'>
) {
  const sortableFields = (uiSettings.get(CONTEXT_TIE_BREAKER_FIELDS_SETTING) || []).filter(
    (fieldName: string) =>
      META_FIELD_NAMES.includes(fieldName) ||
      (dataView.fields.getByName(fieldName) || { sortable: false }).sortable
  );
  return sortableFields[0];
}
