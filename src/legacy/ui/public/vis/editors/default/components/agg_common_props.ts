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

import { AggType } from 'ui/agg_types';
import { AggConfig, VisState } from 'ui/vis';
import { AggGroupNames } from '../agg_groups';
import { EditorActions } from '../state/actions';

export interface DefaultEditorAggCommonProps {
  formIsTouched: boolean;
  groupName: AggGroupNames;
  lastParentPipelineAggTitle?: string;
  metricAggs: AggConfig[];
  state: VisState;
  setAggParamValue: <T extends keyof AggConfig['params']>(
    aggId: AggConfig['id'],
    paramName: T,
    value: AggConfig['params'][T]
  ) => void;
  setStateParamValue: EditorActions['setStateParamValue'];
  onAggTypeChange: (aggId: AggConfig['id'], aggType: AggType) => void;
  onToggleEnableAgg: (aggId: AggConfig['id'], isEnable: boolean) => void;
  removeAgg: (aggId: AggConfig['id']) => void;
  setTouched: (isTouched: boolean) => void;
  setValidity: (isValid: boolean) => void;
}
