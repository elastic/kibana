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

import { i18n } from '@kbn/i18n';
import { Trigger } from '.';
import type { Datatable } from '../../../expressions';

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
