/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const OptionsListStrings = {
  popover: {
    getSortPopoverTitle: () =>
      i18n.translate('unifiedSearch.optionsList.popover.sortTitle', {
        defaultMessage: 'Sort by',
      }),
    getOrderPopoverTitle: () =>
      i18n.translate('unifiedSearch.optionsList.popover.orderTitle', {
        defaultMessage: 'Order',
      }),
    getSortPopoverDescription: () =>
      i18n.translate('unifiedSearch.optionsList.popover.sortDescription', {
        defaultMessage: 'Define the sort order',
      }),
  },
  editorAndPopover: {
    getSortDirectionLegend: () =>
      i18n.translate('unifiedSearch.optionsList.popover.sortDirections', {
        defaultMessage: 'Sort directions',
      }),
    sortBy: {
      _key: {
        getSortByLabel: () =>
          i18n.translate('unifiedSearch.optionsList.popover.sortBy.alphabetical', {
            defaultMessage: 'Alphabetically',
          }),
      },
    },
    sortOrder: {
      asc: {
        getSortOrderLabel: () =>
          i18n.translate('unifiedSearch.optionsList.popover.sortOrder.asc', {
            defaultMessage: 'Ascending',
          }),
      },
      desc: {
        getSortOrderLabel: () =>
          i18n.translate('unifiedSearch.optionsList.popover.sortOrder.desc', {
            defaultMessage: 'Descending',
          }),
      },
    },
    adhoc: {
      getTemporaryDataviewLabel: () =>
        i18n.translate('unifiedSearch.query.queryBar.indexPattern.temporaryDataviewLabel', {
          defaultMessage: 'Temporary',
        }),
    },
    search: {
      getSearchPlaceholder: () =>
        i18n.translate('unifiedSearch.query.queryBar.indexPattern.findDataView', {
          defaultMessage: 'Find a data view',
        }),
    },
  },
};
