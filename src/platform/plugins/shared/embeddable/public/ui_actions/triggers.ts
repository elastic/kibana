/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { Datatable, DatatableColumnMeta } from '@kbn/expressions-plugin/common';
import type { RowClickContext } from '@kbn/ui-actions-plugin/public';
import type { BooleanRelation } from '@kbn/es-query';

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
