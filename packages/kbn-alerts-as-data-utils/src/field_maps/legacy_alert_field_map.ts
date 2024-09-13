/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ALERT_RISK_SCORE,
  ALERT_RULE_AUTHOR,
  ALERT_RULE_CREATED_AT,
  ALERT_RULE_CREATED_BY,
  ALERT_RULE_DESCRIPTION,
  ALERT_RULE_ENABLED,
  ALERT_RULE_FROM,
  ALERT_RULE_INTERVAL,
  ALERT_RULE_LICENSE,
  ALERT_RULE_NOTE,
  ALERT_RULE_REFERENCES,
  ALERT_RULE_RULE_ID,
  ALERT_RULE_RULE_NAME_OVERRIDE,
  ALERT_RULE_TO,
  ALERT_RULE_TYPE,
  ALERT_RULE_UPDATED_AT,
  ALERT_RULE_UPDATED_BY,
  ALERT_RULE_VERSION,
  ALERT_SEVERITY,
  ALERT_SUPPRESSION_DOCS_COUNT,
  ALERT_SUPPRESSION_END,
  ALERT_SUPPRESSION_FIELD,
  ALERT_SUPPRESSION_START,
  ALERT_SUPPRESSION_VALUE,
  ALERT_SYSTEM_STATUS,
  ALERT_WORKFLOW_REASON,
  ALERT_WORKFLOW_STATUS_UPDATED_AT,
  ALERT_WORKFLOW_USER,
  ECS_VERSION,
} from '@kbn/rule-data-utils';

export const legacyAlertFieldMap = {
  [ALERT_RISK_SCORE]: {
    type: 'float',
    array: false,
    required: false,
  },
  [ALERT_RULE_AUTHOR]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_RULE_CREATED_AT]: {
    type: 'date',
    array: false,
    required: false,
  },
  [ALERT_RULE_CREATED_BY]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_RULE_DESCRIPTION]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_RULE_ENABLED]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_RULE_FROM]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_RULE_INTERVAL]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_RULE_LICENSE]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_RULE_NOTE]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_RULE_REFERENCES]: {
    type: 'keyword',
    array: true,
    required: false,
  },
  [ALERT_RULE_RULE_ID]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_RULE_RULE_NAME_OVERRIDE]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_RULE_TO]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_RULE_TYPE]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_RULE_UPDATED_AT]: {
    type: 'date',
    array: false,
    required: false,
  },
  [ALERT_RULE_UPDATED_BY]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_RULE_VERSION]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_SEVERITY]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_SUPPRESSION_DOCS_COUNT]: {
    type: 'long',
    array: false,
    required: false,
  },
  [ALERT_SUPPRESSION_END]: {
    type: 'date',
    array: false,
    required: false,
  },
  [ALERT_SUPPRESSION_FIELD]: {
    type: 'keyword',
    array: true,
    required: false,
  },
  [ALERT_SUPPRESSION_START]: {
    type: 'date',
    array: false,
    required: false,
  },
  [ALERT_SUPPRESSION_VALUE]: {
    type: 'keyword',
    array: true,
    required: false,
  },
  [ALERT_SYSTEM_STATUS]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_WORKFLOW_REASON]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_WORKFLOW_USER]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_WORKFLOW_STATUS_UPDATED_AT]: {
    type: 'date',
    array: false,
    required: false,
  },
  // get these from ecs field map when available
  [ECS_VERSION]: {
    type: 'keyword',
    array: false,
    required: false,
  },
} as const;

export type LegacyAlertFieldMap = typeof legacyAlertFieldMap;
