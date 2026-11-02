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
import { castESQLValue } from './cast_esql_value';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const castOption = (option: string | number, columnType?: string): string | number =>
  typeof option === 'string' ? castESQLValue(option, columnType) : option;

/**
 * Reads the variables published by ES|QL controls from the `config` of each saved control, for code with no live control.
 * `columnTypes` gives the column type of a query-based control's values by variable name, which a live control reads from its query.
 */
export const getESQLControlVariablesFromState = (
  controlStates: ReadonlyArray<unknown>,
  columnTypes: Readonly<Record<string, string>> = {}
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
    // Like a live control: cast by the column type of its query when it is known, else guess from the value.
    const columnType = controlType === EsqlControlType.STATIC_VALUES ? undefined : columnTypes[key];
    const toValue = (option: string | number) => castOption(option, columnType);

    // A control is single-select unless it says otherwise.
    const value =
      singleSelect === false ? options.map(toValue) : options.length > 0 ? toValue(options[0]) : '';

    return [{ key, value, type: type as ESQLVariableType }];
  });
