/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TableHeader } from './table_header/table_header';
import { getServices } from '../../../../kibana_services';
import { SORT_DEFAULT_ORDER_SETTING, DOC_HIDE_TIME_COLUMN_SETTING } from '../../../../../common';
import { FORMATS_UI_SETTINGS } from '../../../../../../field_formats/common';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createTableHeaderDirective(reactDirective: any) {
  const { uiSettings: config } = getServices();

  return reactDirective(
    TableHeader,
    [
      ['columns', { watchDepth: 'collection' }],
      ['hideTimeColumn', { watchDepth: 'value' }],
      ['indexPattern', { watchDepth: 'reference' }],
      ['isShortDots', { watchDepth: 'value' }],
      ['onChangeSortOrder', { watchDepth: 'reference' }],
      ['onMoveColumn', { watchDepth: 'reference' }],
      ['onRemoveColumn', { watchDepth: 'reference' }],
      ['sortOrder', { watchDepth: 'collection' }],
    ],
    { restrict: 'A' },
    {
      hideTimeColumn: config.get(DOC_HIDE_TIME_COLUMN_SETTING, false),
      isShortDots: config.get(FORMATS_UI_SETTINGS.SHORT_DOTS_ENABLE),
      defaultSortOrder: config.get(SORT_DEFAULT_ORDER_SETTING, 'desc'),
    }
  );
}
