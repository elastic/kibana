/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
import { EsqlControlType } from '@kbn/esql-types';
import type { SerializedStateComparison } from '@kbn/presentation-publishing';
import { controlLabelComparators } from './data_control_state_comparison';
import { areSelectedOptionsEqual } from './options_list_state_comparison';

/**
 * Flattens the `control_type` variants, so keys that exist in only one variant can be compared.
 */
export type ESQLControlComparedState = Omit<OptionsListESQLControlState, 'control_type'> & {
  control_type: OptionsListESQLControlState['control_type'];
  esql_query?: string;
  available_options?: string[];
};

const isValuesFromQuery = (state?: Partial<ESQLControlComparedState>) =>
  state?.control_type === EsqlControlType.VALUES_FROM_QUERY;

export const esqlControlStateComparison: SerializedStateComparison<ESQLControlComparedState> = {
  comparators: {
    selected_options: areSelectedOptionsEqual,
    variable_name: 'referenceEquality',
    variable_type: 'referenceEquality',
    single_select: 'referenceEquality',
    control_type: 'referenceEquality',
    available_options: 'deepEquality',
    // Only query-based controls have a query; a `control_type` change is reported by its own comparator
    esql_query: (a, b, lastState, currentState) =>
      !(isValuesFromQuery(lastState) || isValuesFromQuery(currentState)) || a === b,
    display_settings: 'deepEquality',
    ...controlLabelComparators,
  },
};
