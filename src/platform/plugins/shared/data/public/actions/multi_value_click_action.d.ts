/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Datatable } from '@kbn/expressions-plugin/public';
import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import type { BooleanRelation } from '@kbn/es-query';
import type { QueryStart } from '../query';
export type MultiValueClickActionContext = MultiValueClickContext;
export declare const ACTION_MULTI_VALUE_CLICK = 'ACTION_MULTI_VALUE_CLICK';
export interface MultiValueClickContext {
  embeddable?: unknown;
  data: {
    data: Array<{
      cells: Array<{
        column: number;
        row: number;
      }>;
      table: Pick<Datatable, 'rows' | 'columns' | 'meta'>;
      relation?: BooleanRelation;
    }>;
    timeFieldName?: string;
    negate?: boolean;
  };
}
export declare function createMultiValueClickActionDefinition(
  getStartServices: () => {
    query: QueryStart;
  }
): UiActionsActionDefinition<MultiValueClickContext>;
