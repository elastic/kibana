/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RuleLastRunOutcomes } from '@kbn/alerting-plugin/common';
import { assertUnreachable } from '../../../../utility_types';
import type { RuleExecutionStatus, RuleExecutionStatusOrder } from './execution_status.gen';
import { RuleExecutionStatusEnum } from './execution_status.gen';

export const ruleExecutionStatusToNumber = (
  status: RuleExecutionStatus
): RuleExecutionStatusOrder => {
  switch (status) {
    case RuleExecutionStatusEnum.succeeded:
      return 0;
    case RuleExecutionStatusEnum['going to run']:
      return 10;
    case RuleExecutionStatusEnum.running:
      return 15;
    case RuleExecutionStatusEnum['partial failure']:
      return 20;
    case RuleExecutionStatusEnum.failed:
      return 30;
    default:
      assertUnreachable(status);
      return 0;
  }
};

export const ruleLastRunOutcomeToExecutionStatus = (
  outcome: RuleLastRunOutcomes
): RuleExecutionStatus => {
  switch (outcome) {
    case 'succeeded':
      return RuleExecutionStatusEnum.succeeded;
    case 'warning':
      return RuleExecutionStatusEnum['partial failure'];
    case 'failed':
      return RuleExecutionStatusEnum.failed;
    default:
      assertUnreachable(outcome);
      return RuleExecutionStatusEnum.failed;
  }
};
