/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_DATA_VIEW_SPEC_TYPE } from '@kbn/as-code-data-views-schema';
import { fromStoredDataView } from '@kbn/as-code-data-views-transforms';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { ESQL_TYPE } from '@kbn/data-view-utils';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { stableStringify } from '@kbn/std';

/** Finds a classic inline view, leaving saved Data View references and ES|QL views out. */
export const getInlineDataView = (
  searchSource: SerializedSearchSourceFields | undefined
): DataViewSpec | undefined => {
  const { index, query } = searchSource ?? {};
  if (
    isOfAggregateQueryType(query) ||
    !index ||
    typeof index === 'string' ||
    !index.title ||
    index.type === ESQL_TYPE
  ) {
    return undefined;
  }

  return index;
};

/** Compares public definitions with the same defaults, without changing the spec or including its ID. */
export const getDataViewSpecKey = (dataView: DataViewSpec): string => {
  const spec = fromStoredDataView(dataView);
  const fieldFilters = spec.type === AS_CODE_DATA_VIEW_SPEC_TYPE ? spec.field_filters : undefined;
  const fieldSettings = Object.fromEntries(
    Object.entries(
      spec.type === AS_CODE_DATA_VIEW_SPEC_TYPE ? spec.field_settings ?? {} : {}
    ).filter(([, field]) => Object.values(field).some((value) => value !== undefined))
  );

  // An omitted name means the title; omitted allowHidden means false. Empty field
  // settings can also come from stored-only properties such as field popularity.
  return stableStringify({
    ...spec,
    name: dataView.name || dataView.title,
    allow_hidden_indices: dataView.allowHidden ?? false,
    // Sort exclusions only for comparison, so reordering them keeps the same ID.
    field_filters: fieldFilters ? [...fieldFilters].sort() : undefined,
    field_settings: Object.keys(fieldSettings).length > 0 ? fieldSettings : undefined,
  });
};
