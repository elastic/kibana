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

import React, { useMemo } from 'react';
import { findLast } from 'lodash';
import { EuiSpacer } from '@elastic/eui';

import { parentPipelineAggHelper } from 'ui/agg_types/metrics/lib/parent_pipeline_agg_helper';
import { AggConfig } from 'ui/agg_types';
import { MetricAggType } from 'ui/agg_types/metrics/metric_agg_type';
import { VisState } from 'ui/vis';
import { DefaultEditorAggGroup } from '../agg_group';
import { AggGroupNames } from '../../agg_groups';
import { EditorActions } from '../../state/actions';
import { ISchemas } from '../../schemas';

export interface DefaultEditorDataTabProps {
  actions: EditorActions;
  metricAggs: AggConfig[];
  schemas: ISchemas;
  state: VisState;
  setTouched(isTouched: boolean): void;
  setValidity(isValid: boolean): void;
}

function DefaultEditorDataTab({
  actions,
  metricAggs,
  schemas,
  state,
  setTouched,
  setValidity,
}: DefaultEditorDataTabProps) {
  const lastParentPipelineAgg = useMemo(
    () =>
      findLast(
        metricAggs,
        ({ type }: { type: MetricAggType }) => type.subtype === parentPipelineAggHelper.subtype
      ),
    [metricAggs]
  );
  const lastParentPipelineAggTitle = lastParentPipelineAgg && lastParentPipelineAgg.type.title;

  const commonProps = {
    addSchema: actions.addNewAgg,
    lastParentPipelineAggTitle,
    metricAggs,
    state,
    reorderAggs: actions.reorderAggs,
    setAggParamValue: actions.setAggParamValue,
    setStateParamValue: actions.setStateParamValue,
    onAggTypeChange: actions.changeAggType,
    onToggleEnableAgg: actions.toggleEnabledAgg,
    setValidity,
    setTouched,
    removeAgg: actions.removeAgg,
  };

  return (
    <>
      <DefaultEditorAggGroup
        data-test-subj="metricsAggGroup"
        formIsTouched={false}
        groupName={AggGroupNames.Metrics}
        schemas={schemas.metrics}
        {...commonProps}
      />

      <EuiSpacer size="s" />

      <DefaultEditorAggGroup
        data-test-subj="bucketsAggGroup"
        formIsTouched={false}
        groupName={AggGroupNames.Buckets}
        schemas={schemas.buckets}
        {...commonProps}
      />
    </>
  );
}

export { DefaultEditorDataTab };
