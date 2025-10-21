/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RuleType as CommonRuleType } from '@kbn/alerting-types';
import type { HttpSetup } from '@kbn/core/public';
import type { ReactNode } from 'react';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public/types';
import type { ActionVariables } from './action_variable_types';
import type { RULE_DETAIL_DESCRIPTION_FIELD_TYPES } from './rule_detail_description_type';

type PrebuildField<T> = (props: T) => {
  title: string;
  description: NonNullable<React.ReactNode>;
};

export interface PrebuildFieldsMap {
  [RULE_DETAIL_DESCRIPTION_FIELD_TYPES.INDEX_PATTERN]: PrebuildField<string[]>;
  [RULE_DETAIL_DESCRIPTION_FIELD_TYPES.CUSTOM_QUERY]: PrebuildField<string>;
  [RULE_DETAIL_DESCRIPTION_FIELD_TYPES.ESQL_QUERY]: PrebuildField<string>;
  [RULE_DETAIL_DESCRIPTION_FIELD_TYPES.DATA_VIEW_ID]: PrebuildField<string>;
  [RULE_DETAIL_DESCRIPTION_FIELD_TYPES.DATA_VIEW_INDEX_PATTERN]: PrebuildField<string>;
}

export type GetDescriptionFieldsFn = ({
  rule,
  prebuildFields,
  http,
}: {
  rule: Rule;
  prebuildFields: PrebuildFieldsMap | undefined;
  http: HttpSetup | undefined;
}) => { title: string; description: NonNullable<ReactNode> }[];

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
    | 'isExportable'
    | 'autoRecoverAlerts'
  > {
  actionVariables: ActionVariables;
  authorizedConsumers: Record<string, { read: boolean; all: boolean }>;
  enabledInLicense: boolean;
  hasAlertsMappings?: boolean;
  isInternallyManaged: boolean;
  getDescriptionFields?: GetDescriptionFieldsFn;
}

export type RuleTypeIndex = Map<string, RuleType>;

export type RuleTypeWithDescription = RuleType<string, string> & { description?: string };

export type RuleTypeIndexWithDescriptions = Map<string, RuleTypeWithDescription>;
