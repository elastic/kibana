/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AsApiContract, RewriteRequestCase } from '@kbn/actions-types';
import type { RuleType } from '@kbn/triggers-actions-ui-types';
import type { HttpStart } from '@kbn/core-http-browser';
import type { RuleTypeSolution } from '@kbn/alerting-types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../constants';

export interface InternalRuleType extends RuleType<string, string> {
  solution: RuleTypeSolution;
}

const rewriteResponse = (results: Array<AsApiContract<InternalRuleType>>): InternalRuleType[] => {
  return results.map((item) => rewriteRuleType(item));
};

const rewriteRuleType: RewriteRequestCase<InternalRuleType> = ({
  enabled_in_license: enabledInLicense,
  recovery_action_group: recoveryActionGroup,
  action_groups: actionGroups,
  default_action_group_id: defaultActionGroupId,
  minimum_license_required: minimumLicenseRequired,
  action_variables: actionVariables,
  authorized_consumers: authorizedConsumers,
  rule_task_timeout: ruleTaskTimeout,
  does_set_recovery_context: doesSetRecoveryContext,
  default_schedule_interval: defaultScheduleInterval,
  has_alerts_mappings: hasAlertsMappings,
  is_exportable: isExportable,
  auto_recover_alerts: autoRecoverAlerts,
  ...rest
}: AsApiContract<InternalRuleType>) => ({
  enabledInLicense,
  recoveryActionGroup,
  actionGroups,
  defaultActionGroupId,
  minimumLicenseRequired,
  actionVariables,
  authorizedConsumers,
  ruleTaskTimeout,
  doesSetRecoveryContext,
  defaultScheduleInterval,
  hasAlertsMappings,
  isExportable,
  autoRecoverAlerts,
  ...rest,
});

export async function getInternalRuleTypes({ http }: { http: HttpStart }) {
  const res = await http.get<Array<AsApiContract<InternalRuleType>>>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/_rule_types`
  );
  return rewriteResponse(res);
}
