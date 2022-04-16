/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  IAggConfig,
  AggParam,
  IndexPatternField,
  OptionedValueProp,
} from '@kbn/data-plugin/public';
import type { Schema } from '@kbn/visualizations-plugin/public';
import { ComboBoxGroupedOptions } from '../utils';
import { EditorConfig } from './utils';
import { EditorVisState } from './sidebar/state/reducers';

// NOTE: we cannot export the interface with export { InterfaceName }
// as there is currently a bug on babel typescript transform plugin for it
// https://github.com/babel/babel/issues/7641
//
export interface AggParamCommonProps<T, P = AggParam> {
  agg: IAggConfig;
  aggParam: P;
  disabled?: boolean;
  editorConfig: EditorConfig;
  formIsTouched: boolean;
  indexedFields?: ComboBoxGroupedOptions<IndexPatternField>;
  showValidation: boolean;
  state: EditorVisState;
  value?: T;
  metricAggs: IAggConfig[];
  schemas: Schema[];
}

export interface AggParamEditorProps<T, P = AggParam> extends AggParamCommonProps<T, P> {
  setValue(value?: T): void;
  setValidity(isValid: boolean): void;
  setTouched(): void;
}

export interface OptionedParamEditorProps<T = OptionedValueProp> {
  aggParam: {
    options: T[];
  };
}
