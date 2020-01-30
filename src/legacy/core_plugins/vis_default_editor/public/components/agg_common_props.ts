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

import { VisState, VisParams } from 'src/legacy/core_plugins/visualizations/public';
import { AggType, AggConfig, AggGroupNames, Schema } from '../legacy_imports';

type AggId = AggConfig['id'];
type AggParams = AggConfig['params'];

export type AddSchema = (schemas: Schema) => void;
export type ReorderAggs = (sourceAgg: AggConfig, destinationAgg: AggConfig) => void;

export interface DefaultEditorCommonProps {
  formIsTouched: boolean;
  groupName: AggGroupNames;
  metricAggs: AggConfig[];
  state: VisState;
  setAggParamValue: <T extends keyof AggParams>(
    aggId: AggId,
    paramName: T,
    value: AggParams[T]
  ) => void;
  onAggTypeChange: (aggId: AggId, aggType: AggType) => void;
}

export interface DefaultEditorAggCommonProps extends DefaultEditorCommonProps {
  lastParentPipelineAggTitle?: string;
  setStateParamValue: <T extends keyof VisParams>(paramName: T, value: VisParams[T]) => void;
  onToggleEnableAgg: (aggId: AggId, isEnable: boolean) => void;
  removeAgg: (aggId: AggId) => void;
}
