/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const GROUPS_UNIT = (totalCount: number) =>
  i18n.translate('grouping.total.unit', {
    values: { totalCount, groupCount: totalCount.toLocaleString() },
    defaultMessage: `{groupCount} {totalCount, plural, =1 {group} other {groups}}`,
  });

export const TAKE_ACTION = i18n.translate('grouping.additionalActions.takeAction', {
  defaultMessage: 'Take actions',
});

export const GROUP_BY = i18n.translate('grouping.alerts.label', {
  defaultMessage: 'Group alerts by',
});

export const GROUP_BY_CUSTOM_FIELD = i18n.translate('grouping.customGroupByPanelTitle', {
  defaultMessage: 'Group By Custom Field',
});

export const SELECT_FIELD = (groupingLevelsCount: number) =>
  i18n.translate('grouping.groupByPanelTitle', {
    values: { groupingLevelsCount },
    defaultMessage: 'Select up to {groupingLevelsCount} groupings',
  });

export const SELECT_SINGLE_FIELD = i18n.translate('grouping.groupBySingleField', {
  defaultMessage: 'Select grouping',
});

export const NONE = i18n.translate('grouping.noneGroupByOptionName', {
  defaultMessage: 'None',
});

export const CUSTOM_FIELD = i18n.translate('grouping.customGroupByOptionName', {
  defaultMessage: 'Custom field',
});

export const DEFAULT_UNIT = (totalCount: number) =>
  i18n.translate('grouping.eventsTab.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {event} other {events}}`,
  });

export const NULL_GROUP = (selectedGroup: string, unit: string) =>
  i18n.translate('grouping.nullGroup.title', {
    values: { selectedGroup, unit },
    defaultMessage:
      'The selected group by field, {selectedGroup}, is missing a value for this group of {unit}.',
  });
