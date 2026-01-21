/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  RangeSliderControlState,
  StoredRangeSliderExplicitInput,
} from '@kbn/controls-schemas';

export function snakeCaseRangeSlider(state: { [key: string]: unknown }): RangeSliderControlState {
  if ('dataViewId' in state) {
    const {
      dataViewId,
      fieldName,
      ...rest //  the remaining range slider keys are single words so they do not need to be snake_cased
    } = state as StoredRangeSliderExplicitInput & {
      dataViewId?: string;
    };
    return {
      data_view_id: dataViewId ?? '',
      field_name: fieldName ?? '',
      ...rest,
    };
  } else {
    return state as RangeSliderControlState;
  }
}
