/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { Datatable } from '@kbn/expressions-plugin';
import { Trigger } from '.';

export const ROW_CLICK_TRIGGER = 'ROW_CLICK_TRIGGER';

export const rowClickTrigger: Trigger = {
  id: ROW_CLICK_TRIGGER,
  title: i18n.translate('uiActions.triggers.rowClickTitle', {
    defaultMessage: 'Table row click',
  }),
  description: i18n.translate('uiActions.triggers.rowClickkDescription', {
    defaultMessage: 'A click on a table row',
  }),
};

export interface RowClickContext {
  // Need to make this unknown to prevent circular dependencies.
  // Apps using this property will need to cast to `IEmbeddable`.
  embeddable?: unknown;
  data: {
    /**
     * Row index, starting from 0, where user clicked.
     */
    rowIndex: number;

    table: Datatable;

    /**
     * Sorted list column IDs that were visible to the user. Useful when only
     * a subset of datatable columns should be used.
     */
    columns?: string[];
  };
}
