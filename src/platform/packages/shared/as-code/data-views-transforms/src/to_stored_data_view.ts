/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import {
  AS_CODE_DATA_VIEW_REFERENCE_TYPE,
  type AsCodeDataView,
} from '@kbn/as-code-data-views-schema';
import {
  toStoredFieldAttributes,
  toStoredFieldFormats,
  toStoredRuntimeFields,
} from './to_stored_runtime_fields';

/**
 * Convert an as-code data view back to a stored search-source `index` value
 * (string id for a referenced data view, or inline {@link DataViewSpec} fields).
 *
 * @param dataView As-code `data_source` value from classic tab state
 * @returns Value suitable for `SerializedSearchSourceFields.index`
 */
export function toStoredDataView(dataView: AsCodeDataView): string | DataViewSpec {
  if (dataView.type === AS_CODE_DATA_VIEW_REFERENCE_TYPE) return dataView.ref_id;
  const runtimeFieldMap = toStoredRuntimeFields(dataView.runtime_fields);
  const fieldFormats = toStoredFieldFormats(dataView.runtime_fields);
  const fieldAttrs = toStoredFieldAttributes(dataView.runtime_fields);
  return {
    title: dataView.index_pattern,
    timeFieldName: dataView.time_field,
    ...(runtimeFieldMap && Object.keys(runtimeFieldMap).length > 0 && { runtimeFieldMap }),
    ...(fieldFormats && Object.keys(fieldFormats).length > 0 && { fieldFormats }),
    ...(fieldAttrs && Object.keys(fieldAttrs).length > 0 && { fieldAttrs }),
  };
}
