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
export interface SelectRangeActionContext {
  embeddable?: unknown;
  data: {
    table: Datatable;
    column: number;
    range: number[];
    timeFieldName?: string;
    query?: AggregateQuery;
  };
}
export declare const ACTION_SELECT_RANGE = 'ACTION_SELECT_RANGE';
export declare function createSelectRangeActionDefinition(
  getStartServices: () => {
    uiActions: UiActionsStart;
  }
): UiActionsActionDefinition<SelectRangeActionContext>;
