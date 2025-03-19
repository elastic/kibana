/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RuleType as CommonRuleType } from '@kbn/alerting-types';
import type { ActionVariables } from './action_variable_types';

export interface RuleType<
  ActionGroupIds extends string = string,
  RecoveryActionGroupId extends string = string
> extends Pick<
    CommonRuleType<ActionGroupIds, RecoveryActionGroupId>,
    | 'id'
    | 'name'
    | 'actionGroups'
    | 'producer'
    | 'minimumLicenseRequired'
    | 'recoveryActionGroup'
    | 'defaultActionGroupId'
    | 'ruleTaskTimeout'
    | 'defaultScheduleInterval'
    | 'doesSetRecoveryContext'
    | 'category'
  > {
  actionVariables: ActionVariables;
  authorizedConsumers: Record<string, { read: boolean; all: boolean }>;
  enabledInLicense: boolean;
  hasFieldsForAAD?: boolean;
  hasAlertsMappings?: boolean;
}

export type RuleTypeIndex = Map<string, RuleType>;

export type RuleTypeWithDescription = RuleType<string, string> & { description?: string };

export type RuleTypeIndexWithDescriptions = Map<string, RuleTypeWithDescription>;
