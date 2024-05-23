/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RuleCreationValidConsumer } from '@kbn/rule-data-utils';
import { RuleTypeWithDescription } from '../../common/types';
import { ALERTING_FEATURE_ID } from '../constants';

export const getAuthorizedConsumers = ({
  consumer,
  ruleType,
  validConsumers,
}: {
  consumer: string;
  ruleType: RuleTypeWithDescription;
  validConsumers: RuleCreationValidConsumer[];
}) => {
  // If the app context provides a consumer, we assume that consumer is
  // is what we set for all rules that is created in that context
  if (consumer !== ALERTING_FEATURE_ID) {
    return [];
  }

  if (!ruleType.authorizedConsumers) {
    return [];
  }
  return Object.entries(ruleType.authorizedConsumers).reduce<RuleCreationValidConsumer[]>(
    (result, [authorizedConsumer, privilege]) => {
      if (
        privilege.all &&
        validConsumers.includes(authorizedConsumer as RuleCreationValidConsumer)
      ) {
        result.push(authorizedConsumer as RuleCreationValidConsumer);
      }
      return result;
    },
    []
  );
};
