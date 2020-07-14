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
import { Filter } from '../../data/public';
import { SELECT_RANGE_TRIGGER, VALUE_CLICK_TRIGGER, APPLY_FILTER_TRIGGER } from './triggers';
import { IEmbeddable } from '../../embeddable/public';
import { RangeSelectContext, ValueClickContext } from '../../embeddable/public';

export type TriggerRegistry = Map<TriggerId, TriggerInternal<any>>;
export type ActionRegistry = Map<string, ActionInternal>;
export type TriggerToActionsRegistry = Map<TriggerId, string[]>;

const DEFAULT_TRIGGER = '';

export type TriggerId = keyof TriggerContextMapping;

export type BaseContext = object;
export type TriggerContext = BaseContext;

export interface TriggerContextMapping {
  [DEFAULT_TRIGGER]: TriggerContext;
  [SELECT_RANGE_TRIGGER]: RangeSelectContext;
  [VALUE_CLICK_TRIGGER]: ValueClickContext;
  [APPLY_FILTER_TRIGGER]: {
    embeddable: IEmbeddable;
    filters: Filter[];
  };
}

const DEFAULT_ACTION = '';
export type ActionType = keyof ActionContextMapping;

export interface ActionContextMapping {
  [DEFAULT_ACTION]: BaseContext;
}
