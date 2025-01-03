/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AlertConsumers, RuleCreationValidConsumer } from '@kbn/rule-data-utils';
import { RuleTypeWithDescription } from '../common/types';
import { MULTI_CONSUMER_RULE_TYPE_IDS } from '../constants';
import { FEATURE_NAME_MAP } from '../translations';
import { getAuthorizedConsumers } from './get_authorized_consumers';

export const getValidatedMultiConsumer = ({
  multiConsumerSelection,
  validConsumers,
}: {
  multiConsumerSelection?: RuleCreationValidConsumer | null;
  validConsumers: RuleCreationValidConsumer[];
}) => {
  if (
    multiConsumerSelection &&
    validConsumers.includes(multiConsumerSelection) &&
    FEATURE_NAME_MAP[multiConsumerSelection]
  ) {
    return multiConsumerSelection;
  }
  return null;
};

export const getInitialMultiConsumer = ({
  multiConsumerSelection,
  validConsumers,
  ruleType,
  ruleTypes,
}: {
  multiConsumerSelection?: RuleCreationValidConsumer | null;
  validConsumers: RuleCreationValidConsumer[];
  ruleType: RuleTypeWithDescription;
  ruleTypes: RuleTypeWithDescription[];
}): RuleCreationValidConsumer | null => {
  // If rule type doesn't support multi-consumer or no valid consumers exists,
  // return nothing
  if (!MULTI_CONSUMER_RULE_TYPE_IDS.includes(ruleType.id) || validConsumers.length === 0) {
    return null;
  }

  // Use the only value in valid consumers
  if (validConsumers.length === 1) {
    return validConsumers[0];
  }

  // If o11y is in the valid consumers, just use that
  if (validConsumers.includes(AlertConsumers.OBSERVABILITY)) {
    return AlertConsumers.OBSERVABILITY;
  }

  const selectedAvailableRuleType = ruleTypes.find((availableRuleType) => {
    return availableRuleType.id === ruleType.id;
  });

  if (!selectedAvailableRuleType?.authorizedConsumers) {
    return null;
  }

  const authorizedConsumers = getAuthorizedConsumers({
    ruleType: selectedAvailableRuleType,
    validConsumers,
  });

  if (authorizedConsumers.length === 1) {
    return authorizedConsumers[0];
  }

  // User passed in null explicitly, won't set initial consumer
  if (multiConsumerSelection === null) {
    return null;
  }

  const validatedConsumer = getValidatedMultiConsumer({
    multiConsumerSelection,
    validConsumers,
  });

  // If validated consumer exists and no o11y in valid consumers, just use that
  if (validatedConsumer) {
    return validatedConsumer;
  }

  // If validated consumer doesn't exist and stack alerts does, use that
  if (validConsumers.includes(AlertConsumers.STACK_ALERTS)) {
    return AlertConsumers.STACK_ALERTS;
  }

  // All else fails, just use the first valid consumer
  return validConsumers[0] || null;
};
