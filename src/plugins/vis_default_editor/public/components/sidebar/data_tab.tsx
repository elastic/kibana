/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useCallback } from 'react';
import { findLast } from 'lodash';
import { EuiSpacer } from '@elastic/eui';

import {
  AggGroupNames,
  IAggConfig,
  IMetricAggType,
  search,
  TimeRange,
} from '@kbn/data-plugin/public';
import type { ISchemas } from '@kbn/visualizations-plugin/public';
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
import type { AddSchema, ReorderAggs, DefaultEditorAggCommonProps } from '../agg_common_props';
import type { EditorVisState } from './state/reducers';

export interface DefaultEditorDataTabProps {
  dispatch: React.Dispatch<EditorAction>;
  formIsTouched: boolean;
  isTabSelected: boolean;
  metricAggs: IAggConfig[];
  schemas: ISchemas;
  state: EditorVisState;
  setTouched(isTouched: boolean): void;
  setValidity(modelName: string, value: boolean): void;
  setStateValue: DefaultEditorAggCommonProps['setStateParamValue'];
  timeRange: TimeRange;
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
  timeRange,
}: DefaultEditorDataTabProps) {
  const lastParentPipelineAgg = useMemo(
    () =>
      findLast(
        metricAggs,
        ({ type }: { type: IMetricAggType }) => type.subtype === search.aggs.parentPipelineType
      ),
    [metricAggs]
  );
  const lastParentPipelineAggTitle =
    lastParentPipelineAgg && (lastParentPipelineAgg as IAggConfig).type.title;

  const addSchema: AddSchema = useCallback((schema) => dispatch(addNewAgg(schema)), [dispatch]);

  const onAggRemove: DefaultEditorAggCommonProps['removeAgg'] = useCallback(
    (aggId) => dispatch(removeAgg(aggId, schemas.all || [])),
    [dispatch, schemas]
  );

  const onReorderAggs: ReorderAggs = useCallback(
    (...props) => dispatch(reorderAggs(...props)),
    [dispatch]
  );

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
  } as any;

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
        timeRange={timeRange}
        {...commonProps}
      />
    </>
  );
}

export { DefaultEditorDataTab };
