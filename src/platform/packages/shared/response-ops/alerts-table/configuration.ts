/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUES,
  ALERT_MAINTENANCE_WINDOW_IDS,
  ALERT_REASON,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_NAME,
  ALERT_RULE_TAGS,
  ALERT_START,
  ALERT_STATUS,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import { SortCombinations } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';
import { FEATURE_LABEL } from './translations';

const columns = [
  {
    displayAsText: i18n.translate('xpack.triggersActionsUI.alertsTable.statusColumnDescription', {
      defaultMessage: 'Alert Status',
    }),
    id: ALERT_STATUS,
    initialWidth: 120,
  },
  {
    displayAsText: FEATURE_LABEL,
    id: ALERT_RULE_CONSUMER,
    schema: 'string',
    initialWidth: 180,
  },
  {
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.alertsTable.lastUpdatedColumnDescription',
      {
        defaultMessage: 'Last updated',
      }
    ),
    id: TIMESTAMP,
    initialWidth: 200,
    schema: 'datetime',
  },
  {
    displayAsText: i18n.translate('xpack.triggersActionsUI.alertsTable.startedColumnDescription', {
      defaultMessage: 'Started',
    }),
    id: ALERT_START,
    initialWidth: 200,
    schema: 'datetime',
  },
  {
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.alertsTable.ruleCategoryColumnDescription',
      {
        defaultMessage: 'Rule category',
      }
    ),
    id: ALERT_RULE_CATEGORY,
    initialWidth: 160,
  },
  {
    displayAsText: i18n.translate('xpack.triggersActionsUI.alertsTable.ruleColumnDescription', {
      defaultMessage: 'Rule',
    }),
    id: ALERT_RULE_NAME,
    initialWidth: 230,
  },
  {
    displayAsText: i18n.translate('xpack.triggersActionsUI.alertsTable.ruleTagsColumnDescription', {
      defaultMessage: 'Rule tags',
    }),
    id: ALERT_RULE_TAGS,
    initialWidth: 120,
  },
  {
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.alertsTable.evaluationValuesColumnDescription',
      {
        defaultMessage: 'Evaluation values',
      }
    ),
    id: ALERT_EVALUATION_VALUES,
    initialWidth: 120,
  },
  {
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.alertsTable.evaluationThresholdColumnDescription',
      {
        defaultMessage: 'Evaluation threshold',
      }
    ),
    id: ALERT_EVALUATION_THRESHOLD,
    initialWidth: 120,
  },
  {
    displayAsText: i18n.translate('xpack.triggersActionsUI.alertsTable.reasonColumnDescription', {
      defaultMessage: 'Reason',
    }),
    id: ALERT_REASON,
    linkField: '*',
    initialWidth: 260,
  },
  {
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.alertsTable.maintenanceWindowsColumnDescription',
      {
        defaultMessage: 'Maintenance windows',
      }
    ),
    id: ALERT_MAINTENANCE_WINDOW_IDS,
    schema: 'string',
    initialWidth: 180,
  },
];

export { columns as defaultAlertsTableColumns };

const sort: SortCombinations[] = [
  {
    [TIMESTAMP]: {
      order: 'desc',
    },
  },
];

export { sort as defaultAlertsTableSort };
