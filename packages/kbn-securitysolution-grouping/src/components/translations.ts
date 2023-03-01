/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const GROUPS_UNIT = (totalCount: number) =>
  i18n.translate('packages.alertsGrouping.total.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {group} other {groups}}`,
  });

export const TAKE_ACTION = i18n.translate('packages.alertsGrouping.additionalActions.takeAction', {
  defaultMessage: 'Take actions',
});

export const BETA = i18n.translate('packages.alertsGrouping.betaLabel', {
  defaultMessage: 'Beta',
});

export const BETA_TOOL_TIP = i18n.translate('packages.alertsGrouping.betaToolTip', {
  defaultMessage:
    'Grouping may show only a subset of alerts while in beta. To see all alerts, use the list view by selecting "None"',
});

export const GROUP_BY = i18n.translate('packages.alertsGrouping.grouping.label', {
  defaultMessage: 'Group alerts by',
});

export const GROUP_BY_CUSTOM_FIELD = i18n.translate(
  'packages.alertsGrouping.customGroupByPanelTitle',
  {
    defaultMessage: 'Group By Custom Field',
  }
);

export const SELECT_FIELD = i18n.translate('packages.alertsGrouping.groupByPanelTitle', {
  defaultMessage: 'Select Field',
});

export const NONE = i18n.translate('packages.alertsGrouping.noneGroupByOptionName', {
  defaultMessage: 'None',
});

export const CUSTOM_FIELD = i18n.translate('packages.alertsGrouping.customGroupByOptionName', {
  defaultMessage: 'Custom field',
});

export const ALERTS_UNIT = (totalCount: number) =>
  i18n.translate('packages.alertsGrouping.eventsTab.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {alert} other {alerts}}`,
  });
