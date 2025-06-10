/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RuleCreationValidConsumer } from '@kbn/rule-data-utils';
import { AlertConsumers } from '@kbn/rule-data-utils';
import type { RuleTypeWithDescription } from '../common/types';

export const hasAlertsFields = ({
  ruleType,
  consumer,
  validConsumers,
}: {
  ruleType: RuleTypeWithDescription;
  consumer: string;
  validConsumers: RuleCreationValidConsumer[];
}) => {
  const hasAlertHasData = ruleType
    ? ruleType.producer === AlertConsumers.SIEM || ruleType.hasAlertsMappings
    : false;

  return !!hasAlertHasData;
};
