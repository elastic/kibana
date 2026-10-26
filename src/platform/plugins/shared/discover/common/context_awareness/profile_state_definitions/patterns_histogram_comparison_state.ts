/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { ProfileStateDefinition } from '../profile_state';
import { ProfileStateType } from '../profile_state';

/** Ephemeral, tab-scoped selection for comparing one pattern with the histogram total. */
export interface PatternsHistogramComparisonState extends SerializableRecord {
  label: string;
  column: string;
  value: string;
  documentQuery: string;
  sourceQuery: string;
  sourceVariables: string;
}

export const PATTERNS_HISTOGRAM_COMPARISON_STATE_DEFAULTS: PatternsHistogramComparisonState = {
  label: '',
  column: '',
  value: '',
  documentQuery: '',
  sourceQuery: '',
  sourceVariables: '',
};

export const PATTERNS_HISTOGRAM_COMPARISON_STATE_DEF: ProfileStateDefinition<PatternsHistogramComparisonState> =
  {
    key: 'patternsHistogramComparison',
    descriptor: {
      label: { type: ProfileStateType.Ui },
      column: { type: ProfileStateType.Ui },
      value: { type: ProfileStateType.Ui },
      documentQuery: { type: ProfileStateType.Ui },
      sourceQuery: { type: ProfileStateType.Ui },
      sourceVariables: { type: ProfileStateType.Ui },
    },
    defaultState: PATTERNS_HISTOGRAM_COMPARISON_STATE_DEFAULTS,
  };
