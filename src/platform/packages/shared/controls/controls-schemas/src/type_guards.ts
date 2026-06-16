/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ControlValuesSource } from '@kbn/controls-constants';

import type {
  StrictDataControlState,
  StrictOptionsListDSLControlState,
  StrictRangeSliderControlState,
} from './types';

export type FieldDataControlState = Extract<
  StrictDataControlState,
  { values_source: ControlValuesSource.FIELD }
>;

export type EsqlDataControlState = Extract<
  StrictDataControlState,
  { values_source: ControlValuesSource.ESQL }
>;

export type FieldOptionsListDSLControlState = Extract<
  StrictOptionsListDSLControlState,
  { values_source: ControlValuesSource.FIELD }
>;

export type EsqlOptionsListDSLControlState = Extract<
  StrictOptionsListDSLControlState,
  { values_source: ControlValuesSource.ESQL }
>;

export type FieldRangeSliderControlState = Extract<
  StrictRangeSliderControlState,
  { values_source: ControlValuesSource.FIELD }
>;

export type EsqlRangeSliderControlState = Extract<
  StrictRangeSliderControlState,
  { values_source: ControlValuesSource.ESQL }
>;

interface ValuesSourceDiscriminant {
  values_source?: ControlValuesSource;
}

export function isFieldDataControl(state: StrictDataControlState): state is FieldDataControlState;
export function isFieldDataControl(
  state: ValuesSourceDiscriminant
): state is ValuesSourceDiscriminant & { values_source: ControlValuesSource.FIELD };
export function isFieldDataControl(state: ValuesSourceDiscriminant): boolean {
  return state.values_source === ControlValuesSource.FIELD;
}

export function isEsqlDataControl(state: StrictDataControlState): state is EsqlDataControlState;
export function isEsqlDataControl(
  state: ValuesSourceDiscriminant
): state is ValuesSourceDiscriminant & { values_source: ControlValuesSource.ESQL };
export function isEsqlDataControl(state: ValuesSourceDiscriminant): boolean {
  return state.values_source === ControlValuesSource.ESQL;
}

export function isFieldOptionsListDSLControl(
  state: StrictOptionsListDSLControlState
): state is FieldOptionsListDSLControlState;
export function isFieldOptionsListDSLControl(
  state: ValuesSourceDiscriminant
): state is ValuesSourceDiscriminant & { values_source: ControlValuesSource.FIELD };
export function isFieldOptionsListDSLControl(state: ValuesSourceDiscriminant): boolean {
  return state.values_source === ControlValuesSource.FIELD;
}

export function isEsqlOptionsListDSLControl(
  state: StrictOptionsListDSLControlState
): state is EsqlOptionsListDSLControlState;
export function isEsqlOptionsListDSLControl(
  state: ValuesSourceDiscriminant
): state is ValuesSourceDiscriminant & { values_source: ControlValuesSource.ESQL };
export function isEsqlOptionsListDSLControl(state: ValuesSourceDiscriminant): boolean {
  return state.values_source === ControlValuesSource.ESQL;
}

export function isFieldRangeSliderControl(
  state: StrictRangeSliderControlState
): state is FieldRangeSliderControlState;
export function isFieldRangeSliderControl(
  state: ValuesSourceDiscriminant
): state is ValuesSourceDiscriminant & { values_source: ControlValuesSource.FIELD };
export function isFieldRangeSliderControl(state: ValuesSourceDiscriminant): boolean {
  return state.values_source === ControlValuesSource.FIELD;
}

export function isEsqlRangeSliderControl(
  state: StrictRangeSliderControlState
): state is EsqlRangeSliderControlState;
export function isEsqlRangeSliderControl(
  state: ValuesSourceDiscriminant
): state is ValuesSourceDiscriminant & { values_source: ControlValuesSource.ESQL };
export function isEsqlRangeSliderControl(state: ValuesSourceDiscriminant): boolean {
  return state.values_source === ControlValuesSource.ESQL;
}
