/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  AlertConsumers,
  RuleCreationValidConsumer,
  STACK_ALERTS_FEATURE_ID,
} from '@kbn/rule-data-utils';

export const ALERTING_FEATURE_ID = 'alerts';

export const DEFAULT_VALID_CONSUMERS: RuleCreationValidConsumer[] = [
  AlertConsumers.LOGS,
  AlertConsumers.INFRASTRUCTURE,
  STACK_ALERTS_FEATURE_ID,
  ALERTING_FEATURE_ID,
];

export const INTEGER_REGEX = /^[1-9][0-9]*$/;

export enum ValidationStatus {
  COMPLETE,
  INCOMPLETE,
  INVALID,
}
