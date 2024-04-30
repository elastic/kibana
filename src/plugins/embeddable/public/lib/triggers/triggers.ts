/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { Datatable, DatatableColumnMeta } from '@kbn/expressions-plugin/common';
import { Trigger, RowClickContext } from '@kbn/ui-actions-plugin/public';
import { BooleanRelation } from '@kbn/es-query';
import { IEmbeddable } from '..';

/**
 * @deprecated use `EmbeddableApiContext` from `@kbn/presentation-publishing`
 */
export interface EmbeddableContext<T extends IEmbeddable = IEmbeddable> {
  embeddable: T;
}

export type ValueClickContext = Partial<EmbeddableApiContext> & {
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
};

export type MultiValueClickContext = Partial<EmbeddableApiContext> & {
  data: {
    data: Array<{
      table: Pick<Datatable, 'rows' | 'columns'>;
      cells: Array<{
        column: number;
        row: number;
      }>;
      relation?: BooleanRelation;
    }>;
    timeFieldName?: string;
    negate?: boolean;
  };
};

export type CellValueContext = Partial<EmbeddableApiContext> & {
  data: Array<{
    value?: any;
    eventId?: string;
    columnMeta?: DatatableColumnMeta;
  }>;
};

export type RangeSelectContext = Partial<EmbeddableApiContext> & {
  data: {
    table: Datatable;
    column: number;
    range: number[];
    timeFieldName?: string;
  };
};

export type ChartActionContext =
  | ValueClickContext
  | MultiValueClickContext
  | RangeSelectContext
  | RowClickContext;

export const CONTEXT_MENU_TRIGGER = 'CONTEXT_MENU_TRIGGER';
export const contextMenuTrigger: Trigger = {
  id: CONTEXT_MENU_TRIGGER,
  title: i18n.translate('embeddableApi.contextMenuTrigger.title', {
    defaultMessage: 'Context menu',
  }),
  description: i18n.translate('embeddableApi.contextMenuTrigger.description', {
    defaultMessage: "A new action will be added to the panel's context menu",
  }),
};

export const PANEL_HOVER_TRIGGER = 'PANEL_HOVER_TRIGGER';
export const panelHoverTrigger: Trigger = {
  id: PANEL_HOVER_TRIGGER,
  title: i18n.translate('embeddableApi.panelHoverTrigger.title', {
    defaultMessage: 'Panel hover',
  }),
  description: i18n.translate('embeddableApi.panelHoverTrigger.description', {
    defaultMessage: "A new action will be added to the panel's hover menu",
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

export const MULTI_VALUE_CLICK_TRIGGER = 'MULTI_VALUE_CLICK_TRIGGER';
export const multiValueClickTrigger: Trigger = {
  id: MULTI_VALUE_CLICK_TRIGGER,
  title: i18n.translate('embeddableApi.multiValueClickTrigger.title', {
    defaultMessage: 'Multi click',
  }),
  description: i18n.translate('embeddableApi.multiValueClickTrigger.description', {
    defaultMessage: 'Selecting multiple values of a single dimension on the visualization',
  }),
};

export const CELL_VALUE_TRIGGER = 'CELL_VALUE_TRIGGER';
export const cellValueTrigger: Trigger = {
  id: CELL_VALUE_TRIGGER,
  title: i18n.translate('embeddableApi.cellValueTrigger.title', {
    defaultMessage: 'Cell value',
  }),
  description: i18n.translate('embeddableApi.cellValueTrigger.description', {
    defaultMessage: 'Actions appear in the cell value options on the visualization',
  }),
};

export const isValueClickTriggerContext = (
  context: ChartActionContext
): context is ValueClickContext => {
  return (
    context.data &&
    'data' in context.data &&
    Array.isArray(context.data.data) &&
    context.data.data.length > 0 &&
    'column' in context.data.data[0]
  );
};

export const isMultiValueClickTriggerContext = (
  context: ChartActionContext
): context is MultiValueClickContext => {
  return (
    context.data &&
    'data' in context.data &&
    Array.isArray(context.data.data) &&
    context.data.data.length > 0 &&
    'cells' in context.data.data[0]
  );
};

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
