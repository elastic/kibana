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

import { ActionInternal } from './actions/action_internal';
import { TriggerInternal } from './triggers/trigger_internal';
import {
  SELECT_RANGE_TRIGGER,
  VALUE_CLICK_TRIGGER,
  APPLY_FILTER_TRIGGER,
  VISUALIZE_FIELD_TRIGGER,
  VISUALIZE_GEO_FIELD_TRIGGER,
  DEFAULT_TRIGGER,
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
  [APPLY_FILTER_TRIGGER]: ApplyGlobalFilterActionContext;
  [VISUALIZE_FIELD_TRIGGER]: VisualizeFieldContext;
  [VISUALIZE_GEO_FIELD_TRIGGER]: VisualizeFieldContext;
}

const DEFAULT_ACTION = '';
export const ACTION_VISUALIZE_FIELD = 'ACTION_VISUALIZE_FIELD';
export const ACTION_VISUALIZE_GEO_FIELD = 'ACTION_VISUALIZE_GEO_FIELD';
export type ActionType = keyof ActionContextMapping;

export interface ActionContextMapping {
  [DEFAULT_ACTION]: BaseContext;
  [ACTION_VISUALIZE_FIELD]: VisualizeFieldContext;
  [ACTION_VISUALIZE_GEO_FIELD]: VisualizeFieldContext;
}
