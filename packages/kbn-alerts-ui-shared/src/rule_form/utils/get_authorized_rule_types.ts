/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RuleCreationValidConsumer } from '@kbn/rule-data-utils';
import {
  RuleTypeModel,
  RuleTypeRegistryContract,
  RuleTypeWithDescription,
} from '../../common/types';
import { ALERTING_FEATURE_ID, MULTI_CONSUMER_RULE_TYPE_IDS } from '../constants';

export type RuleTypeItems = Array<{
  ruleTypeModel: RuleTypeModel;
  ruleType: RuleTypeWithDescription;
}>;

const hasAllPrivilege = (consumer: string, ruleType: RuleTypeWithDescription): boolean => {
  return ruleType.authorizedConsumers[consumer]?.all ?? false;
};

const authorizedToDisplayRuleType = ({
  consumer,
  ruleType,
  validConsumers,
}: {
  consumer: string;
  ruleType: RuleTypeWithDescription;
  validConsumers?: RuleCreationValidConsumer[];
}) => {
  if (!ruleType) {
    return false;
  }
  // If we have a generic threshold/ES query rule...
  if (MULTI_CONSUMER_RULE_TYPE_IDS.includes(ruleType.id)) {
    // And an array of valid consumers are passed in, we will show it
    // if the rule type has at least one of the consumers as authorized
    if (Array.isArray(validConsumers)) {
      return validConsumers.some((c) => hasAllPrivilege(c, ruleType));
    }
    // If no array was passed in, then we will show it if at least one of its
    // authorized consumers allows it to be shown.
    return Object.entries(ruleType.authorizedConsumers).some(([_, privilege]) => {
      return privilege.all;
    });
  }
  // For non-generic threshold/ES query rules, we will still do the check
  // against `alerts` since we are still setting rule consumers to `alerts`
  return hasAllPrivilege(consumer, ruleType);
};

export const getAvailableRuleTypes = ({
  consumer,
  ruleTypes,
  ruleTypeRegistry,
  validConsumers,
}: {
  consumer: string;
  ruleTypes: RuleTypeWithDescription[];
  ruleTypeRegistry: RuleTypeRegistryContract;
  validConsumers?: RuleCreationValidConsumer[];
}): RuleTypeItems => {
  return ruleTypeRegistry
    .list()
    .reduce((arr: RuleTypeItems, ruleTypeRegistryItem: RuleTypeModel) => {
      const ruleType = ruleTypes.find((item) => ruleTypeRegistryItem.id === item.id);
      if (ruleType) {
        arr.push({
          ruleType,
          ruleTypeModel: ruleTypeRegistryItem,
        });
      }
      return arr;
    }, [])
    .filter(({ ruleType }) =>
      authorizedToDisplayRuleType({
        consumer,
        ruleType,
        validConsumers,
      })
    )
    .filter((item) =>
      consumer === ALERTING_FEATURE_ID
        ? !item.ruleTypeModel.requiresAppContext
        : item.ruleType!.producer === consumer
    );
};
