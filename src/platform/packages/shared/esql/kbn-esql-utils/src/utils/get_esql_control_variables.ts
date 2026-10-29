/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlControlType } from '@kbn/esql-types';
import type { ESQLControlVariable, ESQLVariableType } from '@kbn/esql-types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * A selected option cast the way a live control with static values casts it: a numeric-looking
 * text option becomes a number.
 */
const castOption = (option: string | number): string | number =>
  typeof option === 'string' && !isNaN(Number(option)) ? Number(option) : option;

/**
 * The ES|QL variables published by ES|QL variable controls, read from their saved state: one per
 * control, named by `variable_name` and valued by its selected options. It is for code that has the
 * saved state but no live control, such as a server, and follows what a live control publishes as
 * far as the saved state allows:
 *
 * - a single-select control (the default) publishes its first selected option, or an empty string
 *   when nothing is selected
 * - a multi-select control (`single_select: false`) publishes the list of its selected options
 * - a control with static values (`control_type: 'STATIC_VALUES'`) publishes numeric-looking options
 *   as numbers, the way the live control does
 * - any other control, whose values come from a query, publishes its options as they are saved. A
 *   live control casts them by the type of the column the query returns, which the saved state does
 *   not keep, so the options of a column that is numeric are left as text here. A control with no
 *   `control_type` is read this way too, as the controls plugin reads it.
 *
 * `controlStates` are the state of each control (the control's `config` in the Dashboards API, not
 * the entry that wraps it with its type and id). The state is not validated: entries that are not
 * objects, or have no variable name or type, are skipped.
 *
 * @example
 * getESQLControlVariablesFromState([
 *   { variable_name: 'host', variable_type: 'values', selected_options: ['web-1'] },
 * ]); // [{ key: 'host', value: 'web-1', type: 'values' }]
 */
export const getESQLControlVariablesFromState = (
  controlStates: ReadonlyArray<unknown>
): ESQLControlVariable[] =>
  controlStates.flatMap((state) => {
    if (!isRecord(state)) return [];

    const {
      variable_name: key,
      variable_type: type,
      selected_options: selectedOptions,
      single_select: singleSelect,
      control_type: controlType,
    } = state;
    if (typeof key !== 'string' || key === '' || typeof type !== 'string') return [];

    const options = (Array.isArray(selectedOptions) ? selectedOptions : []).filter(
      (option): option is string | number => ['string', 'number'].includes(typeof option)
    );
    const toValue = (option: string | number) =>
      controlType === EsqlControlType.STATIC_VALUES ? castOption(option) : option;

    // A control is single-select unless it says otherwise.
    const value =
      singleSelect === false ? options.map(toValue) : options.length > 0 ? toValue(options[0]) : '';

    return [{ key, value, type: type as ESQLVariableType }];
  });
