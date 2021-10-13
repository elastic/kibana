/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { PaletteOutput } from '../../charts/public';
import type { Query } from '../../data/public';
import { ActionInternal } from './actions/action_internal';
import { TriggerInternal } from './triggers/trigger_internal';

export type TriggerRegistry = Map<string, TriggerInternal<object>>;
export type ActionRegistry = Map<string, ActionInternal>;
export type TriggerToActionsRegistry = Map<string, string[]>;

export interface VisualizeFieldContext {
  fieldName: string;
  indexPatternId: string;
  contextualFields?: string[];
}

interface SplitFilters {
  color?: string;
  filter?: Query;
  id?: string;
  label?: string;
}

interface Metric {
  agg: string;
  fieldName: string;
  params?: Record<string, unknown>;
  isFullReference: boolean;
  color?: string;
}

export interface VisualizeEditorContext {
  indexPatternId: string;
  timeFieldName?: string;
  chartType?: string;
  termsParams?: Record<string, unknown>;
  splitField?: string;
  splitMode?: string;
  splitFilters?: SplitFilters[];
  palette?: PaletteOutput;
  metrics: Metric[];
}

export const ACTION_VISUALIZE_FIELD = 'ACTION_VISUALIZE_FIELD';
export const ACTION_VISUALIZE_GEO_FIELD = 'ACTION_VISUALIZE_GEO_FIELD';
export const ACTION_VISUALIZE_LENS_FIELD = 'ACTION_VISUALIZE_LENS_FIELD';
export const ACTION_CONVERT_TO_LENS = 'ACTION_CONVERT_TO_LENS';
