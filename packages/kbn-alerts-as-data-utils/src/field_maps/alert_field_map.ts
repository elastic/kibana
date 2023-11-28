/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ALERT_ACTION_GROUP,
  ALERT_CASE_IDS,
  ALERT_DURATION,
  ALERT_END,
  ALERT_FLAPPING,
  ALERT_FLAPPING_HISTORY,
  ALERT_MAINTENANCE_WINDOW_IDS,
  ALERT_INSTANCE_ID,
  ALERT_LAST_DETECTED,
  ALERT_REASON,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_NAME,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_PRODUCER,
  ALERT_RULE_REVISION,
  ALERT_RULE_TAGS,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_TIME_RANGE,
  ALERT_URL,
  ALERT_UUID,
  ALERT_WORKFLOW_STATUS,
  ALERT_WORKFLOW_TAGS,
  SPACE_IDS,
  TIMESTAMP,
  VERSION,
  EVENT_ACTION,
  EVENT_KIND,
  TAGS,
} from '@kbn/rule-data-utils';

export const alertFieldMap = {
  [ALERT_ACTION_GROUP]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_CASE_IDS]: {
    type: 'keyword',
    array: true,
    required: false,
  },
  [ALERT_DURATION]: {
    type: 'long',
    array: false,
    required: false,
  },
  [ALERT_END]: {
    type: 'date',
    array: false,
    required: false,
  },
  [ALERT_FLAPPING]: {
    type: 'boolean',
    array: false,
    required: false,
  },
  [ALERT_FLAPPING_HISTORY]: {
    type: 'boolean',
    array: true,
    required: false,
  },
  [ALERT_MAINTENANCE_WINDOW_IDS]: {
    type: 'keyword',
    array: true,
    required: false,
  },
  [ALERT_INSTANCE_ID]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_LAST_DETECTED]: {
    type: 'date',
    required: false,
    array: false,
  },
  [ALERT_REASON]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_RULE_CATEGORY]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_RULE_CONSUMER]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_RULE_EXECUTION_UUID]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_RULE_NAME]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_RULE_PARAMETERS]: {
    array: false,
    type: 'flattened',
    ignore_above: 4096,
    required: false,
  },
  [ALERT_RULE_PRODUCER]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_RULE_REVISION]: {
    type: 'long',
    array: false,
    required: true,
  },
  [ALERT_RULE_TAGS]: {
    type: 'keyword',
    array: true,
    required: false,
  },
  [ALERT_RULE_TYPE_ID]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_RULE_UUID]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_START]: {
    type: 'date',
    array: false,
    required: false,
  },
  [ALERT_STATUS]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_TIME_RANGE]: {
    type: 'date_range',
    format: 'epoch_millis||strict_date_optional_time',
    array: false,
    required: false,
  },
  [ALERT_URL]: {
    type: 'keyword',
    array: false,
    index: false,
    required: false,
    ignore_above: 2048,
  },
  [ALERT_UUID]: {
    type: 'keyword',
    array: false,
    required: true,
  },
  [ALERT_WORKFLOW_STATUS]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_WORKFLOW_TAGS]: {
    type: 'keyword',
    array: true,
    required: false,
  },
  [EVENT_ACTION]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [EVENT_KIND]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [SPACE_IDS]: {
    type: 'keyword',
    array: true,
    required: true,
  },
  [TAGS]: {
    type: 'keyword',
    array: true,
    required: false,
  },
  [TIMESTAMP]: {
    type: 'date',
    required: true,
    array: false,
  },
  [VERSION]: {
    type: 'version',
    array: false,
    required: false,
  },
} as const;

export type AlertFieldMap = typeof alertFieldMap;
