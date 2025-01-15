/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RuleTypeWithDescription } from '../common';
import { MULTI_CONSUMER_RULE_TYPE_IDS } from '../constants';

export const getInitialConsumer = ({
  consumer,
  ruleType,
  shouldUseRuleProducer,
}: {
  consumer: string;
  ruleType: RuleTypeWithDescription;
  shouldUseRuleProducer: boolean;
}) => {
  if (shouldUseRuleProducer && !MULTI_CONSUMER_RULE_TYPE_IDS.includes(ruleType.id)) {
    return ruleType.producer;
  }
  return consumer;
};
