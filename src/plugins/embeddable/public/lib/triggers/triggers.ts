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

import { KibanaDatatable } from '../../../../expressions';
import { Trigger } from '../../../../ui_actions/public';
import { IEmbeddable } from '..';

export interface EmbeddableContext {
  embeddable: IEmbeddable;
}

export interface ValueClickContext<T extends IEmbeddable = IEmbeddable> {
  embeddable?: T;
  data: {
    data: Array<{
      table: Pick<KibanaDatatable, 'rows' | 'columns'>;
      column: number;
      row: number;
      value: any;
    }>;
    timeFieldName?: string;
    negate?: boolean;
  };
}

export interface RangeSelectContext<T extends IEmbeddable = IEmbeddable> {
  embeddable?: T;
  data: {
    table: KibanaDatatable;
    column: number;
    range: number[];
    timeFieldName?: string;
  };
}

export type ChartActionContext<T extends IEmbeddable = IEmbeddable> =
  | ValueClickContext<T>
  | RangeSelectContext<T>;

export const isValueClickTriggerContext = (
  context: ChartActionContext
): context is ValueClickContext => context.data && 'data' in context.data;

export const isRangeSelectTriggerContext = (
  context: ChartActionContext
): context is RangeSelectContext => context.data && 'range' in context.data;

export const CONTEXT_MENU_TRIGGER = 'CONTEXT_MENU_TRIGGER';
export const contextMenuTrigger: Trigger<'CONTEXT_MENU_TRIGGER'> = {
  id: CONTEXT_MENU_TRIGGER,
  title: 'Context menu',
  description: 'Triggered on top-right corner context-menu select.',
};

export const PANEL_BADGE_TRIGGER = 'PANEL_BADGE_TRIGGER';
export const panelBadgeTrigger: Trigger<'PANEL_BADGE_TRIGGER'> = {
  id: PANEL_BADGE_TRIGGER,
  title: 'Panel badges',
  description: 'Actions appear in title bar when an embeddable loads in a panel.',
};

export const PANEL_NOTIFICATION_TRIGGER = 'PANEL_NOTIFICATION_TRIGGER';
export const panelNotificationTrigger: Trigger<'PANEL_NOTIFICATION_TRIGGER'> = {
  id: PANEL_NOTIFICATION_TRIGGER,
  title: 'Panel notifications',
  description: 'Actions appear in top-right corner of a panel.',
};
