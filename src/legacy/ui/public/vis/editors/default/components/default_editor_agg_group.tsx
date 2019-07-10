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

import React from 'react';
import { findIndex, reduce } from 'lodash';
import { EuiForm, EuiTitle } from '@elastic/eui';

import { AggType } from 'ui/agg_types';
import { Vis, VisState, AggParams } from 'ui/vis';
import { AggConfig } from '../../../agg_config';
import { AggConfigs } from '../../../agg_configs';
import { DefaultEditorAgg } from './default_editor_agg';
import { DefaultEditorAggAdd } from './default_editor_agg_add';

import { aggGroupNameMaps } from '../agg_group_names';
import { Schema } from '../schemas';

interface DefaultEditorAggGroupProps {
  groupName: string;
  formIsTouched: boolean;
  responseValueAggs: AggConfig[] | null;
  state: VisState;
  vis: Vis;
  addSchema: () => {};
  onAggParamsChange: (agg: AggParams, paramName: string, value: unknown) => void;
  onAggTypeChange: (agg: AggConfig, aggType: AggType) => void;
  onAggErrorChanged: (agg: AggConfig, error?: string) => void;
  onToggleEnableAgg: (agg: AggConfig, isEnable: boolean) => void;
  removeAgg: (agg: AggConfig) => void;
  setTouched: (isTouched: boolean) => void;
  setValidity: (isValid: boolean) => void;
}

function DefaultEditorAggGroup({
  groupName,
  formIsTouched,
  responseValueAggs,
  state,
  vis,
  addSchema,
  onAggParamsChange,
  onAggTypeChange,
  setTouched,
  setValidity,
  onAggErrorChanged,
  onToggleEnableAgg,
  removeAgg,
}: DefaultEditorAggGroupProps) {
  const groupNameLabel = aggGroupNameMaps()[groupName];
  const group: AggConfigs = state.aggs.bySchemaGroup[groupName];
  const schemas = vis.type.schemas[groupName];
  const stats = {
    min: 0,
    max: 0,
    count: group ? group.length : 0,
    deprecate: false,
  };

  if (schemas) {
    schemas.forEach((schema: Schema) => {
      stats.min += schema.min;
      stats.max += schema.max;
      stats.deprecate = schema.deprecate;
    });
  }

  const canRemove = (agg: AggConfig) => {
    const metricCount = reduce(
      group,
      (count, aggregation: AggConfig) => {
        return aggregation.schema.name === agg.schema.name ? ++count : count;
      },
      0
    );

    // make sure the the number of these aggs is above the min
    return metricCount > agg.schema.min;
  };

  const calcAggIsTooLow = (agg: AggConfig, aggIndex: number) => {
    if (!agg.schema.mustBeFirst) {
      return false;
    }

    const firstDifferentSchema = findIndex(group, (aggr: AggConfig) => {
      return aggr.schema !== agg.schema;
    });

    if (firstDifferentSchema === -1) {
      return false;
    }

    return aggIndex > firstDifferentSchema;
  };

  return (
    <>
      <EuiForm>
        <EuiTitle size="xxs">
          <p>{groupNameLabel}</p>
        </EuiTitle>
        {group &&
          group.map((agg: AggConfig, index: number) => (
            <DefaultEditorAgg
              key={agg.id}
              agg={agg}
              aggIndex={index}
              aggIsTooLow={calcAggIsTooLow(agg, index)}
              groupName={groupName}
              formIsTouched={formIsTouched}
              isDraggable={stats.count > 1}
              isRemovable={canRemove(agg)}
              isValid={true}
              data-test-subj={`aggregationEditor${agg.id}`}
              responseValueAggs={responseValueAggs}
              state={state}
              vis={vis}
              onAggParamsChange={onAggParamsChange}
              onAggTypeChange={onAggTypeChange}
              setTouched={setTouched}
              setValidity={setValidity}
              onAggErrorChanged={onAggErrorChanged}
              onToggleEnableAgg={onToggleEnableAgg}
              removeAgg={removeAgg}
            />
          ))}
        {stats.max > stats.count && (
          <DefaultEditorAggAdd
            group={group}
            groupName={groupName}
            schemas={schemas}
            stats={stats}
            addSchema={addSchema}
          />
        )}
      </EuiForm>
    </>
  );
}

export { DefaultEditorAggGroup };
