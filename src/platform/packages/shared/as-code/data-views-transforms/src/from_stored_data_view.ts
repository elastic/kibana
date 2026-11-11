/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewSpec } from '@kbn/data-views-types';
import type { AsCodeSavedDataViewWithScriptedFields } from '@kbn/as-code-data-views-schema';
import {
  AS_CODE_DATA_VIEW_REFERENCE_TYPE,
  AS_CODE_DATA_VIEW_SPEC_TYPE,
  type AsCodeDataView,
} from '@kbn/as-code-data-views-schema';
import { omit } from 'lodash';
import { fromStoredFields, fromStoredScriptedFields } from './from_stored_fields';

/**
 * Convert a stored search-source `index` value (saved object / serialized search source)
 * to the as-code data view shape.
 *
 * @param index String id (referenced data view), inline {@link DataViewSpec}, or null/undefined
 * @returns As-code `data_source` object for classic (KQL/Lucene) tabs
 */
export function fromStoredDataView(
  index: string | DataViewSpec | null | undefined
): AsCodeDataView {
  if (!index) throw new Error('Cannot derive data view from empty index');
  if (typeof index === 'string') {
    return { type: AS_CODE_DATA_VIEW_REFERENCE_TYPE, ref_id: index };
  }
  if (!index.title) throw new Error('Cannot derive data view without `title` or `id`');
  const fieldSettings = fromStoredFields(
    index.runtimeFieldMap,
    index.fieldFormats,
    index.fieldAttrs
  );

  return {
    type: AS_CODE_DATA_VIEW_SPEC_TYPE,
    index_pattern: index.title,
    time_field: index.timeFieldName,
    ...(index.allowHidden !== undefined ? { allow_hidden_indices: index.allowHidden } : {}),
    ...(fieldSettings && { field_settings: fieldSettings }),
    ...(index.name && { name: index.name }),
    ...toAsCodeFieldFilters(index.sourceFilters),
  };
}

export function fromStoredDataViewToAsCodeSavedSchema(
  index: DataViewSpec
): AsCodeSavedDataViewWithScriptedFields {
  if (!index.title) throw new Error('Cannot derive data view without `title`');
  const scriptedFields = fromStoredScriptedFields(
    index.fields,
    index.fieldFormats,
    index.fieldAttrs
  );
  const scriptedFieldNames = new Set(
    Object.values(index.fields ?? {})
      .filter((field) => field.scripted)
      .map((field) => field.name)
  );
  // Scripted fields carry their own format and attributes, so they're not repeated in `field_settings`
  const fieldSettings = fromStoredFields(
    index.runtimeFieldMap,
    omit(index.fieldFormats, [...scriptedFieldNames]),
    omit(index.fieldAttrs, [...scriptedFieldNames]),
    true
  );

  return {
    id: index.id,
    name: index.name,
    index_pattern: index.title,
    time_field: index.timeFieldName,
    allow_hidden_indices: index.allowHidden,
    field_settings: fieldSettings,
    ...(scriptedFields && { scripted_fields: scriptedFields }),
    ...toAsCodeFieldFilters(index.sourceFilters),
  };
}

function toAsCodeFieldFilters(sourceFilters: DataViewSpec['sourceFilters']): {
  field_filters?: string[];
} {
  if (!sourceFilters || sourceFilters.length === 0) return {};
  return {
    field_filters: sourceFilters.map((sourceFilter) => sourceFilter.value),
  };
}
