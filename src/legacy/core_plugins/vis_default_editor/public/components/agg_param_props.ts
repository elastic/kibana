/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { IndexPatternField } from 'src/plugins/data/public';
import { VisState } from 'src/legacy/core_plugins/visualizations/public';
import { IAggConfig, AggParam } from '../legacy_imports';
import { ComboBoxGroupedOptions } from '../utils';
import { EditorConfig } from './utils';

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
  state: VisState;
  value?: T;
  metricAggs: IAggConfig[];
}

export interface AggParamEditorProps<T, P = AggParam> extends AggParamCommonProps<T, P> {
  setValue(value?: T): void;
  setValidity(isValid: boolean): void;
  setTouched(): void;
}
