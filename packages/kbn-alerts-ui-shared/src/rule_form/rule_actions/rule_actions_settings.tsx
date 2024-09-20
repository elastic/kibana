/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormLabel, EuiFormRow, EuiSuperSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  AlertsFilter,
  AlertsFilterTimeframe,
  RecoveredActionGroup,
  RuleActionFrequency,
} from '@kbn/alerting-types';
import { AlertConsumers, ValidFeatureId } from '@kbn/rule-data-utils';
import { useRuleFormState } from '../hooks';
import { RuleAction, RuleTypeWithDescription } from '../../common';
import {
  getActionGroups,
  getDurationNumberInItsUnit,
  getDurationUnitValue,
  getSelectedActionGroup,
  hasFieldsForAad,
  parseDuration,
} from '../utils';
import { DEFAULT_VALID_CONSUMERS } from '../constants';

import { RuleActionsNotifyWhen } from './rule_actions_notify_when';
import { RuleActionsAlertsFilter } from './rule_actions_alerts_filter';
import { RuleActionsAlertsFilterTimeframe } from './rule_actions_alerts_filter_timeframe';

const getMinimumThrottleWarnings = ({
  actionThrottle,
  actionThrottleUnit,
  minimumActionThrottle,
  minimumActionThrottleUnit,
}: {
  actionThrottle: number | null;
  actionThrottleUnit: string;
  minimumActionThrottle: number;
  minimumActionThrottleUnit: string;
}) => {
  try {
    if (!actionThrottle) return [false, false];
    const throttleUnitDuration = parseDuration(`1${actionThrottleUnit}`);
    const minThrottleUnitDuration = parseDuration(`1${minimumActionThrottleUnit}`);
    const boundedThrottle =
      throttleUnitDuration > minThrottleUnitDuration
        ? actionThrottle
        : Math.max(actionThrottle, minimumActionThrottle);
    const boundedThrottleUnit =
      parseDuration(`${actionThrottle}${actionThrottleUnit}`) >= minThrottleUnitDuration
        ? actionThrottleUnit
        : minimumActionThrottleUnit;
    return [boundedThrottle !== actionThrottle, boundedThrottleUnit !== actionThrottleUnit];
  } catch (e) {
    return [false, false];
  }
};

const ACTION_GROUP_NOT_SUPPORTED = (actionGroupName: string) =>
  i18n.translate('alertsUIShared.ruleActionsSetting.actionGroupNotSupported', {
    defaultMessage: '{actionGroupName} (Not Currently Supported)',
    values: { actionGroupName },
  });

const ACTION_GROUP_RUN_WHEN = i18n.translate(
  'alertsUIShared.ruleActionsSetting.actionGroupRunWhen',
  {
    defaultMessage: 'Run when',
  }
);

const DisabledActionGroupsByActionType: Record<string, string[]> = {
  [RecoveredActionGroup.id]: ['.jira', '.resilient'],
};

const DisabledActionTypeIdsForActionGroup: Map<string, string[]> = new Map(
  Object.entries(DisabledActionGroupsByActionType)
);

function isActionGroupDisabledForActionTypeId(actionGroup: string, actionTypeId: string): boolean {
  return (
    DisabledActionTypeIdsForActionGroup.has(actionGroup) &&
    DisabledActionTypeIdsForActionGroup.get(actionGroup)!.includes(actionTypeId)
  );
}

const isActionGroupDisabledForActionType = (
  ruleType: RuleTypeWithDescription,
  actionGroupId: string,
  actionTypeId: string
): boolean => {
  return isActionGroupDisabledForActionTypeId(
    actionGroupId === ruleType?.recoveryActionGroup?.id ? RecoveredActionGroup.id : actionGroupId,
    actionTypeId
  );
};

const actionGroupDisplay = ({
  ruleType,
  actionGroupId,
  actionGroupName,
  actionTypeId,
}: {
  ruleType: RuleTypeWithDescription;
  actionGroupId: string;
  actionGroupName: string;
  actionTypeId: string;
}): string => {
  if (isActionGroupDisabledForActionType(ruleType, actionGroupId, actionTypeId)) {
    return ACTION_GROUP_NOT_SUPPORTED(actionGroupName);
  }
  return actionGroupName;
};

export interface RuleActionsSettingsProps {
  action: RuleAction;
  producerId: string;
  onUseDefaultMessageChange: () => void;
  onNotifyWhenChange: (frequency: RuleActionFrequency) => void;
  onActionGroupChange: (group: string) => void;
  onAlertsFilterChange: (query?: AlertsFilter['query']) => void;
  onTimeframeChange: (timeframe?: AlertsFilterTimeframe) => void;
}

export const RuleActionsSettings = (props: RuleActionsSettingsProps) => {
  const {
    action,
    producerId,
    onUseDefaultMessageChange,
    onNotifyWhenChange,
    onActionGroupChange,
    onAlertsFilterChange,
    onTimeframeChange,
  } = props;

  const {
    plugins: { settings },
    formData: {
      consumer,
      schedule: { interval },
    },
    actionsErrors = {},
    validConsumers = DEFAULT_VALID_CONSUMERS,
    selectedRuleType,
    selectedRuleTypeModel,
  } = useRuleFormState();

  const actionGroups = getActionGroups({
    ruleType: selectedRuleType,
    ruleTypeModel: selectedRuleTypeModel,
  });

  const selectedActionGroup = getSelectedActionGroup({
    group: action.group,
    ruleType: selectedRuleType,
    ruleTypeModel: selectedRuleTypeModel,
  });

  const actionError = actionsErrors[action.uuid!] || {};

  const showSelectActionGroup = actionGroups && selectedActionGroup && !action.frequency?.summary;

  const intervalNumber = getDurationNumberInItsUnit(interval ?? 1);

  const intervalUnit = getDurationUnitValue(interval);

  const actionThrottle = action.frequency?.throttle
    ? getDurationNumberInItsUnit(action.frequency.throttle)
    : null;

  const actionThrottleUnit = action.frequency?.throttle
    ? getDurationUnitValue(action.frequency?.throttle)
    : 'h';

  const [minimumActionThrottle = -1, minimumActionThrottleUnit] = [
    intervalNumber,
    intervalUnit,
  ] ?? [-1, 's'];

  const [showMinimumThrottleWarning, showMinimumThrottleUnitWarning] = getMinimumThrottleWarnings({
    actionThrottle,
    actionThrottleUnit,
    minimumActionThrottle,
    minimumActionThrottleUnit,
  });

  const showActionAlertsFilter =
    hasFieldsForAad({
      ruleType: selectedRuleType,
      consumer,
      validConsumers,
    }) || producerId === AlertConsumers.SIEM;

  return (
    <EuiFlexGroup direction="column" data-test-subj="ruleActionsSettings">
      <EuiFlexItem>
        <EuiFlexGroup alignItems="flexEnd">
          <EuiFlexItem>
            <RuleActionsNotifyWhen
              frequency={action.frequency}
              throttle={actionThrottle}
              throttleUnit={actionThrottleUnit}
              hasAlertsMappings={selectedRuleType.hasAlertsMappings}
              onChange={onNotifyWhenChange}
              onUseDefaultMessage={onUseDefaultMessageChange}
              showMinimumThrottleWarning={showMinimumThrottleWarning}
              showMinimumThrottleUnitWarning={showMinimumThrottleUnitWarning}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            {showSelectActionGroup && (
              <EuiSuperSelect
                prepend={
                  <EuiFormLabel htmlFor={`addNewActionConnectorActionGroup-${action.actionTypeId}`}>
                    {ACTION_GROUP_RUN_WHEN}
                  </EuiFormLabel>
                }
                data-test-subj="ruleActionsSettingsSelectActionGroup"
                fullWidth
                id={`addNewActionConnectorActionGroup-${action.actionTypeId}`}
                options={actionGroups.map(({ id: value, name }) => ({
                  value,
                  ['data-test-subj']: `addNewActionConnectorActionGroup-${value}`,
                  inputDisplay: actionGroupDisplay({
                    ruleType: selectedRuleType,
                    actionGroupId: value,
                    actionGroupName: name,
                    actionTypeId: action.actionTypeId,
                  }),
                  disabled: isActionGroupDisabledForActionType(
                    selectedRuleType,
                    value,
                    action.actionTypeId
                  ),
                }))}
                valueOfSelected={selectedActionGroup.id}
                onChange={onActionGroupChange}
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      {showActionAlertsFilter && (
        <EuiFlexItem>
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              <EuiFormRow
                fullWidth
                error={actionError.filterQuery}
                isInvalid={!!actionError.filterQuery?.length}
              >
                <RuleActionsAlertsFilter
                  action={action}
                  onChange={onAlertsFilterChange}
                  featureIds={[
                    producerId === 'alerts' ? 'stackAlerts' : (producerId as ValidFeatureId),
                  ]}
                  appName="stackAlerts"
                  ruleTypeId={selectedRuleType.id}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <RuleActionsAlertsFilterTimeframe
                action={action}
                settings={settings}
                onChange={onTimeframeChange}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
