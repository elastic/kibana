/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

/** Words the sort actions by the kind of values of a column, like EuiDataGrid does. */
export const getSortLabels = (schema?: string): { asc: string; desc: string } => {
  switch (schema) {
    case 'datetime':
      return {
        asc: i18n.translate('kbnDataGrid.header.sortOldNew', { defaultMessage: 'Sort Old-New' }),
        desc: i18n.translate('kbnDataGrid.header.sortNewOld', { defaultMessage: 'Sort New-Old' }),
      };
    case 'numeric':
      return {
        asc: i18n.translate('kbnDataGrid.header.sortLowHigh', { defaultMessage: 'Sort Low-High' }),
        desc: i18n.translate('kbnDataGrid.header.sortHighLow', { defaultMessage: 'Sort High-Low' }),
      };
    case 'boolean':
      return {
        asc: i18n.translate('kbnDataGrid.header.sortFalseTrue', {
          defaultMessage: 'Sort False-True',
        }),
        desc: i18n.translate('kbnDataGrid.header.sortTrueFalse', {
          defaultMessage: 'Sort True-False',
        }),
      };
    default:
      return {
        asc: i18n.translate('kbnDataGrid.header.sortAZ', { defaultMessage: 'Sort A → Z' }),
        desc: i18n.translate('kbnDataGrid.header.sortZA', { defaultMessage: 'Sort Z → A' }),
      };
  }
};
