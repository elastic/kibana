/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { VisParams, Schema } from '@kbn/visualizations-plugin/public';
import type { IAggType, IAggConfig, AggGroupName } from '@kbn/data-plugin/public';

import type { EditorVisState } from './sidebar/state/reducers';

type AggId = IAggConfig['id'];
type AggParams = IAggConfig['params'];

export type AddSchema = (schemas: Schema) => void;
export type ReorderAggs = (sourceAgg: IAggConfig, destinationAgg: IAggConfig) => void;

export interface DefaultEditorCommonProps {
  formIsTouched: boolean;
  groupName: AggGroupName;
  metricAggs: IAggConfig[];
  state: EditorVisState;
  setAggParamValue: <T extends keyof AggParams>(
    aggId: AggId,
    paramName: T,
    value: AggParams[T]
  ) => void;
  onAggTypeChange: (aggId: AggId, aggType: IAggType) => void;
}

export interface DefaultEditorAggCommonProps extends DefaultEditorCommonProps {
  lastParentPipelineAggTitle?: string;
  setStateParamValue: <T extends keyof VisParams>(paramName: T, value: VisParams[T]) => void;
  onToggleEnableAgg: (aggId: AggId, isEnable: boolean) => void;
  removeAgg: (aggId: AggId) => void;
  schemas: Schema[];
}
