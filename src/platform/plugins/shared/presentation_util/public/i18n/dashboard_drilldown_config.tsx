/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const dashboardDrilldownConfigStrings = {
  component: {
    getUseCurrentFiltersLabel: () =>
      i18n.translate(
        'presentationUtil.dashboardDrilldownConfig.components.useCurrentFiltersLabel',
        {
          defaultMessage: 'Use filters and query from origin dashboard',
        }
      ),
    getUseCurrentDateRange: () =>
      i18n.translate('presentationUtil.dashboardDrilldownConfig.components.useCurrentDateRange', {
        defaultMessage: 'Use date range from origin dashboard',
      }),
    getOpenInNewTab: () =>
      i18n.translate('presentationUtil.dashboardDrilldownConfig.components.openInNewTab', {
        defaultMessage: 'Open dashboard in new tab',
      }),
  },
};
