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

import React, { useMemo, useCallback } from 'react';
import { findLast } from 'lodash';
import { EuiSpacer } from '@elastic/eui';

import { VisState } from 'src/legacy/core_plugins/visualizations/public';
import {
  AggConfig,
  AggGroupNames,
  ISchemas,
  parentPipelineType,
  MetricAggType,
} from '../../legacy_imports';
import { DefaultEditorAggGroup } from '../agg_group';
import {
  EditorAction,
  addNewAgg,
  removeAgg,
  reorderAggs,
  setAggParamValue,
  changeAggType,
  toggleEnabledAgg,
} from './state';
import { AddSchema, ReorderAggs, DefaultEditorAggCommonProps } from '../agg_common_props';

export interface DefaultEditorDataTabProps {
  dispatch: React.Dispatch<EditorAction>;
  formIsTouched: boolean;
  isTabSelected: boolean;
  metricAggs: AggConfig[];
  schemas: ISchemas;
  state: VisState;
  setTouched(isTouched: boolean): void;
  setValidity(modelName: string, value: boolean): void;
  setStateValue: DefaultEditorAggCommonProps['setStateParamValue'];
}

function DefaultEditorDataTab({
  dispatch,
  formIsTouched,
  metricAggs,
  schemas,
  state,
  setTouched,
  setValidity,
  setStateValue,
}: DefaultEditorDataTabProps) {
  const lastParentPipelineAgg = useMemo(
    () =>
      findLast(
        metricAggs,
        ({ type }: { type: MetricAggType }) => type.subtype === parentPipelineType
      ),
    [metricAggs]
  );
  const lastParentPipelineAggTitle = lastParentPipelineAgg && lastParentPipelineAgg.type.title;

  const addSchema: AddSchema = useCallback(schema => dispatch(addNewAgg(schema)), [dispatch]);

  const onAggRemove: DefaultEditorAggCommonProps['removeAgg'] = useCallback(
    aggId => dispatch(removeAgg(aggId)),
    [dispatch]
  );

  const onReorderAggs: ReorderAggs = useCallback((...props) => dispatch(reorderAggs(...props)), [
    dispatch,
  ]);

  const onAggParamValueChange: DefaultEditorAggCommonProps['setAggParamValue'] = useCallback(
    (...props) => dispatch(setAggParamValue(...props)),
    [dispatch]
  );

  const onAggTypeChange: DefaultEditorAggCommonProps['onAggTypeChange'] = useCallback(
    (...props) => dispatch(changeAggType(...props)),
    [dispatch]
  );

  const onToggleEnableAgg: DefaultEditorAggCommonProps['onToggleEnableAgg'] = useCallback(
    (...props) => dispatch(toggleEnabledAgg(...props)),
    [dispatch]
  );

  const commonProps = {
    addSchema,
    formIsTouched,
    lastParentPipelineAggTitle,
    metricAggs,
    state,
    reorderAggs: onReorderAggs,
    setAggParamValue: onAggParamValueChange,
    setStateParamValue: setStateValue,
    onAggTypeChange,
    onToggleEnableAgg,
    setValidity,
    setTouched,
    removeAgg: onAggRemove,
  };

  return (
    <>
      <DefaultEditorAggGroup
        groupName={AggGroupNames.Metrics}
        schemas={schemas.metrics}
        {...commonProps}
      />

      <EuiSpacer size="s" />

      <DefaultEditorAggGroup
        groupName={AggGroupNames.Buckets}
        schemas={schemas.buckets}
        {...commonProps}
      />
    </>
  );
}

export { DefaultEditorDataTab };
