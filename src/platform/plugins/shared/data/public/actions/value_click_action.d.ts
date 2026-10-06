/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery } from '@kbn/es-query';
import type { Datatable } from '@kbn/expressions-plugin/public';
import type { UiActionsActionDefinition, UiActionsStart } from '@kbn/ui-actions-plugin/public';
export type ValueClickActionContext = ValueClickContext;
export declare const ACTION_VALUE_CLICK = 'ACTION_VALUE_CLICK';
export interface ValueClickContext {
  embeddable?: unknown;
  data: {
    data: Array<{
      table: Pick<Datatable, 'rows' | 'columns'>;
      column: number;
      row: number;
      value: any;
    }>;
    timeFieldName?: string;
    negate?: boolean;
    query?: AggregateQuery;
  };
}
export declare function createValueClickActionDefinition(
  getStartServices: () => {
    uiActions: UiActionsStart;
  }
): UiActionsActionDefinition<ValueClickContext>;
