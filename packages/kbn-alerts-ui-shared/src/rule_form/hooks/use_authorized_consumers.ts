/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useMemo } from 'react';
import { RuleCreationValidConsumer } from '@kbn/rule-data-utils';
import { RuleFormAppContext, RuleTypeModel } from '../types';
import { DEFAULT_VALID_CONSUMERS } from '../common/constants';

export const useAuthorizedConsumers = (
  ruleTypeModel: RuleTypeModel,
  validConsumers: RuleFormAppContext['validConsumers']
) =>
  useMemo(() => {
    if (!ruleTypeModel.authorizedConsumers) {
      return [];
    }

    return Object.entries(ruleTypeModel.authorizedConsumers).reduce<RuleCreationValidConsumer[]>(
      (result, [authorizedConsumer, privilege]) => {
        if (
          privilege.all &&
          (validConsumers || DEFAULT_VALID_CONSUMERS).includes(
            authorizedConsumer as RuleCreationValidConsumer
          )
        ) {
          result.push(authorizedConsumer as RuleCreationValidConsumer);
        }
        return result;
      },
      []
    );
  }, [ruleTypeModel, validConsumers]);
