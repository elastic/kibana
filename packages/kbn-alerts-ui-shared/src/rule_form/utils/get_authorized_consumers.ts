/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RuleCreationValidConsumer } from '@kbn/rule-data-utils';
import { RuleTypeWithDescription } from '../../common/types';

export const getAuthorizedConsumers = ({
  ruleType,
  validConsumers,
}: {
  ruleType: RuleTypeWithDescription;
  validConsumers: RuleCreationValidConsumer[];
}) => {
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
