/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_DATA_CONTROL_STATE } from '@kbn/controls-constants';
import type { DataControlState } from '@kbn/controls-schemas';
import { titleComparators, type StateComparators } from '@kbn/presentation-publishing';

export const controlLabelComparators: StateComparators<Pick<DataControlState, 'title'>> = {
  title: titleComparators.title,
};

export const dataControlComparators: StateComparators<DataControlState> = {
  ...controlLabelComparators,
  data_view_id: 'referenceEquality',
  field_name: 'referenceEquality',
  values_source: 'referenceEquality',
  esql_query: 'referenceEquality',
  use_global_filters: (a: boolean | undefined, b: boolean | undefined) =>
    (a ?? DEFAULT_DATA_CONTROL_STATE.use_global_filters) ===
    (b ?? DEFAULT_DATA_CONTROL_STATE.use_global_filters),
  ignore_validations: (a: boolean | undefined, b: boolean | undefined) =>
    (a ?? DEFAULT_DATA_CONTROL_STATE.ignore_validations) ===
    (b ?? DEFAULT_DATA_CONTROL_STATE.ignore_validations),
};
