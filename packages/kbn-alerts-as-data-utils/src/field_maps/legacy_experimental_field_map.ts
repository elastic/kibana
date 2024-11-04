/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ALERT_CONTEXT,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_EVALUATION_VALUES,
  ALERT_GROUP,
  ALERT_GROUP_FIELD,
  ALERT_GROUP_VALUE,
} from '@kbn/rule-data-utils';

export const legacyExperimentalFieldMap = {
  [ALERT_EVALUATION_THRESHOLD]: {
    type: 'scaled_float',
    scaling_factor: 100,
    required: false,
  },
  [ALERT_EVALUATION_VALUE]: { type: 'scaled_float', scaling_factor: 100, required: false },
  [ALERT_CONTEXT]: { type: 'object', array: false, required: false },
  [ALERT_EVALUATION_VALUES]: {
    type: 'scaled_float',
    scaling_factor: 100,
    required: false,
    array: true,
  },
  [ALERT_GROUP]: {
    type: 'object',
    array: true,
    required: false,
  },
  [ALERT_GROUP_FIELD]: {
    type: 'keyword',
    array: true,
    required: false,
  },
  [ALERT_GROUP_VALUE]: {
    type: 'keyword',
    array: true,
    required: false,
  },
} as const;

export type ExperimentalRuleFieldMap = typeof legacyExperimentalFieldMap;
