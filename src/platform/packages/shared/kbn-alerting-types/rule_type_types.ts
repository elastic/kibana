/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LicenseType } from '@kbn/licensing-plugin/common/types';
import type { RecoveredActionGroupId, DefaultActionGroupId } from './builtin_action_groups_types';
import { ActionGroup } from './action_group_types';
import { ActionVariable } from './action_variable';

interface ConsumerPrivileges {
  read: boolean;
  all: boolean;
}

export interface RuleType<
  ActionGroupIds extends Exclude<string, RecoveredActionGroupId> = DefaultActionGroupId,
  RecoveryActionGroupId extends string = RecoveredActionGroupId
> {
  id: string;
  name: string;
  actionGroups: Array<ActionGroup<ActionGroupIds>>;
  recoveryActionGroup: ActionGroup<RecoveryActionGroupId>;
  actionVariables: {
    context: ActionVariable[];
    state: ActionVariable[];
    params: ActionVariable[];
  };
  defaultActionGroupId: ActionGroupIds;
  category: string;
  producer: string;
  minimumLicenseRequired: LicenseType;
  isExportable: boolean;
  ruleTaskTimeout?: string;
  defaultScheduleInterval?: string;
  doesSetRecoveryContext?: boolean;
  enabledInLicense: boolean;
  authorizedConsumers: Record<string, ConsumerPrivileges>;
}

export type ActionGroupIdsOf<T> = T extends ActionGroup<infer groups>
  ? groups
  : T extends Readonly<ActionGroup<infer groups>>
  ? groups
  : never;
