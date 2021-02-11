/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ActionInternal } from './actions/action_internal';
import { TriggerInternal } from './triggers/trigger_internal';
import {
  SELECT_RANGE_TRIGGER,
  VALUE_CLICK_TRIGGER,
  ROW_CLICK_TRIGGER,
  APPLY_FILTER_TRIGGER,
  VISUALIZE_FIELD_TRIGGER,
  VISUALIZE_GEO_FIELD_TRIGGER,
  DEFAULT_TRIGGER,
  RowClickContext,
} from './triggers';
import type { RangeSelectContext, ValueClickContext } from '../../embeddable/public';
import type { ApplyGlobalFilterActionContext } from '../../data/public';

export type TriggerRegistry = Map<TriggerId, TriggerInternal<any>>;
export type ActionRegistry = Map<string, ActionInternal>;
export type TriggerToActionsRegistry = Map<TriggerId, string[]>;

export interface VisualizeFieldContext {
  fieldName: string;
  indexPatternId: string;
  contextualFields?: string[];
}

export type TriggerId = keyof TriggerContextMapping;

export type BaseContext = object;
export type TriggerContext = BaseContext;

export interface TriggerContextMapping {
  [DEFAULT_TRIGGER]: TriggerContext;
  [SELECT_RANGE_TRIGGER]: RangeSelectContext;
  [VALUE_CLICK_TRIGGER]: ValueClickContext;
  [ROW_CLICK_TRIGGER]: RowClickContext;
  [APPLY_FILTER_TRIGGER]: ApplyGlobalFilterActionContext;
  [VISUALIZE_FIELD_TRIGGER]: VisualizeFieldContext;
  [VISUALIZE_GEO_FIELD_TRIGGER]: VisualizeFieldContext;
}

const DEFAULT_ACTION = '';
export const ACTION_VISUALIZE_FIELD = 'ACTION_VISUALIZE_FIELD';
export const ACTION_VISUALIZE_GEO_FIELD = 'ACTION_VISUALIZE_GEO_FIELD';
export const ACTION_VISUALIZE_LENS_FIELD = 'ACTION_VISUALIZE_LENS_FIELD';
export type ActionType = keyof ActionContextMapping;

export interface ActionContextMapping {
  [DEFAULT_ACTION]: BaseContext;
  [ACTION_VISUALIZE_FIELD]: VisualizeFieldContext;
  [ACTION_VISUALIZE_GEO_FIELD]: VisualizeFieldContext;
  [ACTION_VISUALIZE_LENS_FIELD]: VisualizeFieldContext;
}
