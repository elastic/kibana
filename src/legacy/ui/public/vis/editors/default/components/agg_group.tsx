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

import React, { useEffect, useReducer, useMemo } from 'react';
import {
  EuiTitle,
  EuiDragDropContext,
  DragDropContextProps,
  EuiDroppable,
  EuiDraggable,
  EuiSpacer,
  EuiPanel,
  EuiFormErrorText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { AggConfig } from '../../../../agg_types/agg_config';
import { aggGroupNamesMap, AggGroupNames } from '../agg_groups';
import { DefaultEditorAgg } from './agg';
import { DefaultEditorAggAdd } from './agg_add';
import { DefaultEditorAggCommonProps } from './agg_common_props';
import {
  isInvalidAggsTouched,
  isAggRemovable,
  calcAggIsTooLow,
  getEnabledMetricAggsCount,
} from './agg_group_helper';
import { aggGroupReducer, initAggsState, AGGS_ACTION_KEYS } from './agg_group_state';
import { Schema } from '../schemas';

export interface DefaultEditorAggGroupProps extends DefaultEditorAggCommonProps {
  schemas: Schema[];
  addSchema: (schemas: Schema) => void;
  reorderAggs: (group: AggConfig[]) => void;
}

function DefaultEditorAggGroup({
  formIsTouched,
  groupName,
  lastParentPipelineAggTitle,
  metricAggs,
  state,
  schemas = [],
  addSchema,
  onAggParamsChange,
  onAggTypeChange,
  onToggleEnableAgg,
  removeAgg,
  reorderAggs,
  setTouched,
  setValidity,
}: DefaultEditorAggGroupProps) {
  const groupNameLabel = aggGroupNamesMap()[groupName];
  // e.g. buckets can have no aggs
  const group: AggConfig[] =
    state.aggs.aggs.filter((agg: AggConfig) => agg.schema.group === groupName) || [];

  const stats = {
    max: 0,
    count: group.length,
  };

  schemas.forEach((schema: Schema) => {
    stats.max += schema.max;
  });

  const [aggsState, setAggsState] = useReducer(aggGroupReducer, group, initAggsState);

  const bucketsError =
    lastParentPipelineAggTitle && groupName === AggGroupNames.Buckets && !group.length
      ? i18n.translate('data.search.aggs.buckets.mustHaveBucketErrorMessage', {
          defaultMessage: 'Add a bucket with "Date Histogram" or "Histogram" aggregation.',
          description: 'Date Histogram and Histogram should not be translated',
        })
      : undefined;

  const isGroupValid = !bucketsError && Object.values(aggsState).every(item => item.valid);
  const isAllAggsTouched = isInvalidAggsTouched(aggsState);
  const isMetricAggregationDisabled = useMemo(
    () => groupName === AggGroupNames.Metrics && getEnabledMetricAggsCount(group) === 1,
    [groupName, group]
  );

  useEffect(() => {
    // when isAllAggsTouched is true, it means that all invalid aggs are touched and we will set ngModel's touched to true
    // which indicates that Apply button can be changed to Error button (when all invalid ngModels are touched)
    setTouched(isAllAggsTouched);
  }, [isAllAggsTouched]);

  useEffect(() => {
    // when not all invalid aggs are touched and formIsTouched becomes true, it means that Apply button was clicked.
    // and in such case we set touched state to true for all aggs
    if (formIsTouched && !isAllAggsTouched) {
      Object.keys(aggsState).map(([aggId]) => {
        setAggsState({
          type: AGGS_ACTION_KEYS.TOUCHED,
          payload: true,
          aggId,
        });
      });
    }
  }, [formIsTouched]);

  useEffect(() => {
    setValidity(isGroupValid);
  }, [isGroupValid]);

  const onDragEnd: DragDropContextProps['onDragEnd'] = ({ source, destination }) => {
    if (source && destination) {
      const orderedGroup = Array.from(group);
      const [removed] = orderedGroup.splice(source.index, 1);
      orderedGroup.splice(destination.index, 0, removed);

      reorderAggs(orderedGroup);
    }
  };

  const setTouchedHandler = (aggId: string, touched: boolean) => {
    setAggsState({
      type: AGGS_ACTION_KEYS.TOUCHED,
      payload: touched,
      aggId,
    });
  };

  const setValidityHandler = (aggId: string, valid: boolean) => {
    setAggsState({
      type: AGGS_ACTION_KEYS.VALID,
      payload: valid,
      aggId,
    });
  };

  return (
    <EuiDragDropContext onDragEnd={onDragEnd}>
      <EuiPanel paddingSize="s">
        <EuiTitle size="xs">
          <h3>{groupNameLabel}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        {bucketsError && (
          <>
            <EuiFormErrorText>{bucketsError}</EuiFormErrorText>
            <EuiSpacer size="s" />
          </>
        )}
        <EuiDroppable droppableId={`agg_group_dnd_${groupName}`}>
          <>
            {group.map((agg: AggConfig, index: number) => (
              <EuiDraggable
                key={agg.id}
                index={index}
                draggableId={`agg_group_dnd_${groupName}_${agg.id}`}
                customDragHandle={true}
              >
                {provided => (
                  <DefaultEditorAgg
                    agg={agg}
                    aggIndex={index}
                    aggIsTooLow={calcAggIsTooLow(agg, index, group)}
                    dragHandleProps={provided.dragHandleProps}
                    formIsTouched={aggsState[agg.id] ? aggsState[agg.id].touched : false}
                    groupName={groupName}
                    isDraggable={stats.count > 1}
                    isLastBucket={groupName === AggGroupNames.Buckets && index === group.length - 1}
                    isRemovable={isAggRemovable(agg, group)}
                    isDisabled={agg.schema.name === 'metric' && isMetricAggregationDisabled}
                    lastParentPipelineAggTitle={lastParentPipelineAggTitle}
                    metricAggs={metricAggs}
                    state={state}
                    onAggParamsChange={onAggParamsChange}
                    onAggTypeChange={onAggTypeChange}
                    onToggleEnableAgg={onToggleEnableAgg}
                    removeAgg={removeAgg}
                    setTouched={isTouched => setTouchedHandler(agg.id, isTouched)}
                    setValidity={isValid => setValidityHandler(agg.id, isValid)}
                  />
                )}
              </EuiDraggable>
            ))}
          </>
        </EuiDroppable>
        {stats.max > stats.count && (
          <DefaultEditorAggAdd
            group={group}
            groupName={groupName}
            schemas={schemas}
            stats={stats}
            addSchema={addSchema}
          />
        )}
      </EuiPanel>
    </EuiDragDropContext>
  );
}

export { DefaultEditorAggGroup };
