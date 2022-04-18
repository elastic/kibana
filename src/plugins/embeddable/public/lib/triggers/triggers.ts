/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Datatable } from '@kbn/expressions-plugin';
import { Trigger, RowClickContext } from '@kbn/ui-actions-plugin/public';
import { IEmbeddable } from '..';

export interface EmbeddableContext<T extends IEmbeddable = IEmbeddable> {
  embeddable: T;
}

export interface ValueClickContext<T extends IEmbeddable = IEmbeddable> {
  embeddable?: T;
  data: {
    data: Array<{
      table: Pick<Datatable, 'rows' | 'columns'>;
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
    table: Datatable;
    column: number;
    range: number[];
    timeFieldName?: string;
  };
}

export type ChartActionContext<T extends IEmbeddable = IEmbeddable> =
  | ValueClickContext<T>
  | RangeSelectContext<T>
  | RowClickContext;

export const CONTEXT_MENU_TRIGGER = 'CONTEXT_MENU_TRIGGER';
export const contextMenuTrigger: Trigger = {
  id: CONTEXT_MENU_TRIGGER,
  title: i18n.translate('embeddableApi.contextMenuTrigger.title', {
    defaultMessage: 'Context menu',
  }),
  description: i18n.translate('embeddableApi.contextMenuTrigger.description', {
    defaultMessage: 'A panel top-right corner context menu click.',
  }),
};

export const PANEL_BADGE_TRIGGER = 'PANEL_BADGE_TRIGGER';
export const panelBadgeTrigger: Trigger = {
  id: PANEL_BADGE_TRIGGER,
  title: i18n.translate('embeddableApi.panelBadgeTrigger.title', {
    defaultMessage: 'Panel badges',
  }),
  description: i18n.translate('embeddableApi.panelBadgeTrigger.description', {
    defaultMessage: 'Actions appear in title bar when an embeddable loads in a panel.',
  }),
};

export const PANEL_NOTIFICATION_TRIGGER = 'PANEL_NOTIFICATION_TRIGGER';
export const panelNotificationTrigger: Trigger = {
  id: PANEL_NOTIFICATION_TRIGGER,
  title: i18n.translate('embeddableApi.panelNotificationTrigger.title', {
    defaultMessage: 'Panel notifications',
  }),
  description: i18n.translate('embeddableApi.panelNotificationTrigger.description', {
    defaultMessage: 'Actions appear in top-right corner of a panel.',
  }),
};

export const SELECT_RANGE_TRIGGER = 'SELECT_RANGE_TRIGGER';
export const selectRangeTrigger: Trigger = {
  id: SELECT_RANGE_TRIGGER,
  title: i18n.translate('embeddableApi.selectRangeTrigger.title', {
    defaultMessage: 'Range selection',
  }),
  description: i18n.translate('embeddableApi.selectRangeTrigger.description', {
    defaultMessage: 'A range of values on the visualization',
  }),
};

export const VALUE_CLICK_TRIGGER = 'VALUE_CLICK_TRIGGER';
export const valueClickTrigger: Trigger = {
  id: VALUE_CLICK_TRIGGER,
  title: i18n.translate('embeddableApi.valueClickTrigger.title', {
    defaultMessage: 'Single click',
  }),
  description: i18n.translate('embeddableApi.valueClickTrigger.description', {
    defaultMessage: 'A data point click on the visualization',
  }),
};

export const isValueClickTriggerContext = (
  context: ChartActionContext
): context is ValueClickContext => context.data && 'data' in context.data;

export const isRangeSelectTriggerContext = (
  context: ChartActionContext
): context is RangeSelectContext => context.data && 'range' in context.data;

export const isRowClickTriggerContext = (context: ChartActionContext): context is RowClickContext =>
  !!context.data &&
  typeof context.data === 'object' &&
  typeof (context as RowClickContext).data.rowIndex === 'number';

export const isContextMenuTriggerContext = (context: unknown): context is EmbeddableContext =>
  !!context &&
  typeof context === 'object' &&
  !!(context as EmbeddableContext).embeddable &&
  typeof (context as EmbeddableContext).embeddable === 'object';
