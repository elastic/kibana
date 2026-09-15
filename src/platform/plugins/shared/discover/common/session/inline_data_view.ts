/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AsCodeDataViewSpec } from '@kbn/as-code-data-views-schema';
import { fromStoredDataView } from '@kbn/as-code-data-views-transforms';
import { Sha256 } from '@kbn/crypto-browser';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { stableStringify } from '@kbn/std';
import { every, isEmpty, isUndefined, omitBy, pick } from 'lodash';

/** Returns the inline spec for a non-ES|QL query without assigning an ID. */
export const getInlineDataView = (
  searchSource: SerializedSearchSourceFields | undefined
): DataViewSpec | undefined => {
  if (isOfAggregateQueryType(searchSource?.query)) {
    return undefined;
  }

  const index = searchSource?.index;
  if (!index || typeof index === 'string' || !index.title) {
    return undefined;
  }

  return index;
};

/** Compares saved and local specs in the API format, excluding local-only fields such as the ID. */
export const getDataViewSpecKey = (dataView: DataViewSpec): string =>
  stableStringify(
    fromStoredDataView({
      ...dataView,
      // The Data View service uses the title when the name is missing or empty.
      name: dataView.name || dataView.title,
      // DataView.toMinimalSpec() includes this default even when the API document omits it.
      allowHidden: dataView.allowHidden ?? false,
    })
  );

/** Generates a stable inline ID from the definition without changing the spec. */
export const generateInlineDataViewId = (dataView: DataViewSpec): string => {
  const spec = fromStoredDataView(dataView) as AsCodeDataViewSpec;
  const fieldSettings = omitBy(spec.field_settings, (settings) => every(settings, isUndefined));

  // Changing the ID for an unchanged spec can break saved dashboard filters.
  const specKey = stableStringify({
    type: 'data_view_spec',
    // Renaming an inline view in Discover already creates a new ID; the hash follows the same rule.
    name: spec.name || spec.index_pattern,
    allow_hidden_indices: spec.allow_hidden_indices ?? false,
    ...pick(spec, ['index_pattern', 'time_field']),
    ...omitBy({ field_settings: fieldSettings, field_filters: spec.field_filters }, isEmpty),
  });

  return `discover-inline-${new Sha256().update(specKey).digest('hex')}`;
};
