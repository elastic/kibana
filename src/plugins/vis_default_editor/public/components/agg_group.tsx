/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useReducer, useMemo, useCallback } from 'react';
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

import { AggGroupNames, AggGroupLabels, IAggConfig, TimeRange } from '../../../data/public';
import type { Schema } from '../../../visualizations/public';
import { DefaultEditorAgg } from './agg';
import { DefaultEditorAggAdd } from './agg_add';
import { AddSchema, ReorderAggs, DefaultEditorAggCommonProps } from './agg_common_props';
import {
  isInvalidAggsTouched,
  isAggRemovable,
  calcAggIsTooLow,
  getEnabledMetricAggsCount,
} from './agg_group_helper';
import { aggGroupReducer, initAggsState, AGGS_ACTION_KEYS } from './agg_group_state';

export interface DefaultEditorAggGroupProps extends DefaultEditorAggCommonProps {
  schemas: Schema[];
  addSchema: AddSchema;
  reorderAggs: ReorderAggs;
  setValidity(modelName: string, value: boolean): void;
  setTouched(isTouched: boolean): void;
  timeRange?: TimeRange;
}

function DefaultEditorAggGroup({
  formIsTouched,
  groupName,
  lastParentPipelineAggTitle,
  metricAggs,
  state,
  schemas = [],
  addSchema,
  setAggParamValue,
  setStateParamValue,
  onAggTypeChange,
  onToggleEnableAgg,
  removeAgg,
  reorderAggs,
  setTouched,
  setValidity,
  timeRange,
}: DefaultEditorAggGroupProps) {
  const groupNameLabel = AggGroupLabels[groupName];
  // e.g. buckets can have no aggs
  const schemaNames = schemas.map((s) => s.name);
  const group: IAggConfig[] = useMemo(
    () =>
      state.data.aggs!.aggs.filter(
        (agg: IAggConfig) => agg.schema && schemaNames.includes(agg.schema)
      ) || [],
    [state.data.aggs, schemaNames]
  );

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
      ? i18n.translate('visDefaultEditor.buckets.mustHaveBucketErrorMessage', {
          defaultMessage: 'Add a bucket with "Date Histogram" or "Histogram" aggregation.',
          description: 'Date Histogram and Histogram should not be translated',
        })
      : undefined;

  const isGroupValid = !bucketsError && Object.values(aggsState).every((item) => item.valid);
  const isAllAggsTouched = isInvalidAggsTouched(aggsState);
  const isMetricAggregationDisabled = useMemo(
    () => groupName === AggGroupNames.Metrics && getEnabledMetricAggsCount(group) === 1,
    [groupName, group]
  );

  useEffect(() => {
    // when isAllAggsTouched is true, it means that all invalid aggs are touched and we will set ngModel's touched to true
    // which indicates that Apply button can be changed to Error button (when all invalid ngModels are touched)
    setTouched(isAllAggsTouched);
  }, [isAllAggsTouched, setTouched]);

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
    // adding all of the values to the deps array cause a circular re-render
    // the logic should be rewised
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formIsTouched]);

  useEffect(() => {
    setValidity(`aggGroup__${groupName}`, isGroupValid);
  }, [groupName, isGroupValid, setValidity]);

  const onDragEnd: DragDropContextProps['onDragEnd'] = useCallback(
    ({ source, destination }) => {
      if (source && destination) {
        reorderAggs(group[source.index], group[destination.index]);
      }
    },
    [reorderAggs, group]
  );

  return (
    <EuiDragDropContext onDragEnd={onDragEnd}>
      <EuiPanel data-test-subj={`${groupName}AggGroup`} paddingSize="s">
        <EuiTitle size="xs">
          <h3>{groupNameLabel}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        {bucketsError && (
          <>
            <EuiFormErrorText data-test-subj="bucketsError">{bucketsError}</EuiFormErrorText>
            <EuiSpacer size="s" />
          </>
        )}
        <EuiDroppable
          droppableId={`agg_group_dnd_${groupName}`}
          className="visEditorSidebar__collapsible--marginBottom"
        >
          <>
            {group.map((agg: IAggConfig, index: number) => (
              <EuiDraggable
                key={agg.id}
                index={index}
                draggableId={`agg_group_dnd_${groupName}_${agg.id}`}
                customDragHandle={true}
                disableInteractiveElementBlocking // Allows button to be drag handle
              >
                {(provided) => (
                  <DefaultEditorAgg
                    agg={agg}
                    aggIndex={index}
                    aggIsTooLow={calcAggIsTooLow(agg, index, group, schemas)}
                    dragHandleProps={provided.dragHandleProps || null}
                    formIsTouched={aggsState[agg.id] ? aggsState[agg.id].touched : false}
                    groupName={groupName}
                    isDraggable={stats.count > 1}
                    isLastBucket={groupName === AggGroupNames.Buckets && index === group.length - 1}
                    isRemovable={isAggRemovable(agg, group, schemas)}
                    isDisabled={agg.schema === 'metric' && isMetricAggregationDisabled}
                    lastParentPipelineAggTitle={lastParentPipelineAggTitle}
                    metricAggs={metricAggs}
                    state={state}
                    setAggParamValue={setAggParamValue}
                    setStateParamValue={setStateParamValue}
                    onAggTypeChange={onAggTypeChange}
                    onToggleEnableAgg={onToggleEnableAgg}
                    removeAgg={removeAgg}
                    setAggsState={setAggsState}
                    schemas={schemas}
                    timeRange={timeRange}
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
