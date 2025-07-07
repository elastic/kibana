/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GroupOption } from '@kbn/grouping';
import { i18n } from '@kbn/i18n';
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';

export const DEFAULT_PAGE_SIZE = 25;
export const DEFAULT_PAGE_INDEX = 0;
export const MAX_GROUPING_LEVELS = 3;

export const getDefaultGroupingOptionsPerDataView = (dataViewName: string): GroupOption[] => {
  switch (dataViewName) {
    case '.alerts-security.alerts-default,apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*,-*elastic-cloud-logs-*':
      return [
        {
          label: i18n.translate('discover.grouping.ungrouped.label.alert', {
            defaultMessage: 'Rule name',
          }),
          key: ALERT_RULE_NAME,
        },
        {
          label: i18n.translate('discover.grouping.ungrouped.label.user', {
            defaultMessage: 'User name',
          }),
          key: 'user.name',
        },
        {
          label: i18n.translate('discover.grouping.ungrouped.label.host', {
            defaultMessage: 'Host name',
          }),
          key: 'host.name',
        },
      ];
    case '.kibana-event-log-*':
      return [
        {
          label: i18n.translate('discover.grouping.ungrouped.label.event_action', {
            defaultMessage: 'Event action',
          }),
          key: 'event.action',
        },
        {
          label: i18n.translate('discover.grouping.ungrouped.label.event_category', {
            defaultMessage: 'Event category',
          }),
          key: 'event.category',
        },
      ];
    default:
      return [];
  }
};
