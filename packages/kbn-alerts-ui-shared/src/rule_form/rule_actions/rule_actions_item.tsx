/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import React, { Suspense, useCallback, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiAccordion,
  EuiPanel,
  EuiButtonIcon,
  useEuiTheme,
  useEuiBackgroundColor,
  EuiIcon,
  EuiText,
  EuiTabs,
  EuiTab,
  EuiToolTip,
  EuiBadge,
} from '@elastic/eui';
import {
  ActionVariable,
  AlertsFilter,
  AlertsFilterTimeframe,
  RuleAction,
  RuleActionFrequency,
  RuleActionParam,
} from '@kbn/alerting-types';
import { isEmpty, some } from 'lodash';
import { css } from '@emotion/react';
import { SavedObjectAttribute } from '@kbn/core/types';
import { useRuleFormDispatch, useRuleFormState } from '../hooks';
import {
  ActionConnector,
  ActionTypeModel,
  RuleFormParamsErrors,
  RuleTypeWithDescription,
} from '../../common/types';
import { getAvailableActionVariables } from '../../action_variables';
import { validateAction, validateParamsForWarnings } from '../validation';

import { RuleActionsSettings } from './rule_actions_settings';
import { getSelectedActionGroup } from '../utils';
import { RuleActionsMessage } from './rule_actions_message';
import { ACTION_ERROR_TOOLTIP, ACTION_WARNING_TITLE } from '../translations';

const SUMMARY_GROUP_TITLE = i18n.translate('alertsUIShared.ruleActionsItem.summaryGroupTitle', {
  defaultMessage: 'Summary of alerts',
});

const RUN_WHEN_GROUP_TITLE = (groupName: string) =>
  i18n.translate('alertsUIShared.ruleActionsItem.runWhenGroupTitle', {
    defaultMessage: 'Run when {groupName}',
    values: {
      groupName,
    },
  });

const PRECONFIGURED_ACTION_TITLE = (connector: ActionConnector) =>
  i18n.translate('alertsUIShared.ruleActionsItem.existingAlertActionTypeEditTitle', {
    defaultMessage: '{actionConnectorName}',
    values: {
      actionConnectorName: `${connector.name} ${
        connector.isPreconfigured ? '(preconfigured)' : ''
      }`,
    },
  });

const getDefaultParams = ({
  group,
  ruleType,
  actionTypeModel,
}: {
  group: string;
  actionTypeModel: ActionTypeModel;
  ruleType: RuleTypeWithDescription;
}) => {
  if (group === ruleType.recoveryActionGroup.id) {
    return actionTypeModel.defaultRecoveredActionParams;
  } else {
    return actionTypeModel.defaultActionParams;
  }
};

interface RuleActionsItemProps {
  action: RuleAction;
  index: number;
  producerId: string;
}

export const RuleActionsItem = (props: RuleActionsItemProps) => {
  const { action, index, producerId } = props;

  const {
    plugins: { actionTypeRegistry, http },
    actionsParamsErrors = {},
    selectedRuleType,
    selectedRuleTypeModel,
    connectors,
    connectorTypes,
    aadTemplateFields,
  } = useRuleFormState();

  const [tab, setTab] = useState<string>('settings');
  const subdued = useEuiBackgroundColor('subdued');
  const plain = useEuiBackgroundColor('plain');
  const { euiTheme } = useEuiTheme();

  const [availableActionVariables, setAvailableActionVariables] = useState<ActionVariable[]>([]);

  const [useDefaultMessage, setUseDefaultMessage] = useState(false);

  const [storedActionParamsForAadToggle, setStoredActionParamsForAadToggle] = useState<
    Record<string, SavedObjectAttribute>
  >({});

  const [warning, setWarning] = useState<string | null>(null);

  const [isOpen, setIsOpen] = useState(true);

  const dispatch = useRuleFormDispatch();
  const actionTypeModel = actionTypeRegistry.get(action.actionTypeId);
  const actionType = connectorTypes.find(({ id }) => id === action.actionTypeId)!;
  const connector = connectors.find(({ id }) => id === action.id)!;

  const actionParamsError = actionsParamsErrors[action.uuid!] || {};

  const showActionGroupErrorIcon = (): boolean => {
    return !isOpen && some(actionParamsError, (error) => !isEmpty(error));
  };

  const selectedActionGroup = getSelectedActionGroup({
    group: action.group,
    ruleType: selectedRuleType,
    ruleTypeModel: selectedRuleTypeModel,
  });

  const templateFields = action.useAlertDataForTemplate
    ? aadTemplateFields
    : availableActionVariables;

  const onDelete = (id: string) => {
    dispatch({ type: 'removeAction', payload: id });
  };

  const validateActionBase = useCallback(
    (newAction: RuleAction) => {
      const errors = validateAction({ action: newAction });
      dispatch({
        type: 'setActionError',
        payload: {
          uuid: newAction.uuid!,
          errors,
        },
      });
    },
    [dispatch]
  );

  const validateActionParams = useCallback(
    async (params: RuleActionParam) => {
      const res: { errors: RuleFormParamsErrors } = await actionTypeRegistry
        .get(action.actionTypeId)
        ?.validateParams(params);

      dispatch({
        type: 'setActionParamsError',
        payload: {
          uuid: action.uuid!,
          errors: res.errors,
        },
      });
    },
    [actionTypeRegistry, action, dispatch]
  );

  const onStoredActionParamsChange = useCallback(
    (
      aadParams: Record<string, SavedObjectAttribute>,
      params: Record<string, SavedObjectAttribute>
    ) => {
      if (isEmpty(aadParams) && action.params.subAction) {
        setStoredActionParamsForAadToggle(params);
      } else {
        setStoredActionParamsForAadToggle(aadParams);
      }
    },
    [action]
  );

  const onAvailableActionVariablesChange = useCallback(
    ({ actionGroup, summary }: { actionGroup: string; summary?: boolean }) => {
      const messageVariables = selectedRuleType.actionVariables;

      const newSelectedActionGroup = getSelectedActionGroup({
        group: actionGroup,
        ruleType: selectedRuleType,
        ruleTypeModel: selectedRuleTypeModel,
      });

      if (messageVariables) {
        setAvailableActionVariables(
          getAvailableActionVariables(messageVariables, undefined, newSelectedActionGroup, summary)
        );
      } else {
        setAvailableActionVariables([]);
      }
    },
    [selectedRuleType, selectedRuleTypeModel]
  );

  const setDefaultParams = useCallback(
    (actionGroup: string) => {
      const defaultParams = getDefaultParams({
        group: actionGroup,
        ruleType: selectedRuleType,
        actionTypeModel,
      });

      if (!defaultParams) {
        return;
      }
      const newDefaultParams: typeof defaultParams = {};
      const defaultAADParams: typeof defaultParams = {};
      for (const [key, paramValue] of Object.entries(defaultParams)) {
        newDefaultParams[key] = paramValue;
        if (typeof paramValue !== 'string' || !paramValue.match(/{{.*?}}/g)) {
          defaultAADParams[key] = paramValue;
        }
      }
      const newParams = {
        ...action.params,
        ...newDefaultParams,
      };
      dispatch({
        type: 'setActionParams',
        payload: {
          uuid: action.uuid!,
          value: newParams,
        },
      });
      validateActionParams(newParams);
      onStoredActionParamsChange(defaultAADParams, newParams);
    },
    [
      action,
      dispatch,
      validateActionParams,
      selectedRuleType,
      actionTypeModel,
      onStoredActionParamsChange,
    ]
  );

  const onDefaultParamsChange = useCallback(
    (actionGroup: string, summary?: boolean) => {
      onAvailableActionVariablesChange({
        actionGroup,
        summary,
      });
      setDefaultParams(actionGroup);
    },
    [onAvailableActionVariablesChange, setDefaultParams]
  );

  const onParamsChange = useCallback(
    (key: string, value: RuleActionParam) => {
      const newParams = {
        ...action.params,
        [key]: value,
      };
      dispatch({
        type: 'setActionParams',
        payload: {
          uuid: action.uuid!,
          value: newParams,
        },
      });
      setWarning(
        validateParamsForWarnings({
          value,
          publicBaseUrl: http.basePath.publicBaseUrl,
          actionVariables: availableActionVariables,
        })
      );
      validateActionParams(newParams);
      onStoredActionParamsChange(storedActionParamsForAadToggle, newParams);
    },
    [
      http,
      action,
      availableActionVariables,
      dispatch,
      validateActionParams,
      onStoredActionParamsChange,
      storedActionParamsForAadToggle,
    ]
  );

  const onNotifyWhenChange = useCallback(
    (frequency: RuleActionFrequency) => {
      dispatch({
        type: 'setActionProperty',
        payload: {
          uuid: action.uuid!,
          key: 'frequency',
          value: frequency,
        },
      });
      if (frequency.summary !== action.frequency?.summary) {
        onDefaultParamsChange(action.group, frequency.summary);
      }
    },
    [action, onDefaultParamsChange, dispatch]
  );

  const onActionGroupChange = useCallback(
    (group: string) => {
      dispatch({
        type: 'setActionProperty',
        payload: {
          uuid: action.uuid!,
          key: 'group',
          value: group,
        },
      });
      onDefaultParamsChange(group, action.frequency?.summary);
    },
    [action, onDefaultParamsChange, dispatch]
  );

  const onAlertsFilterChange = useCallback(
    (query?: AlertsFilter['query']) => {
      const newAlertsFilter = {
        ...action.alertsFilter,
        query,
      };
      const newAction = {
        ...action,
        alertsFilter: newAlertsFilter,
      };
      dispatch({
        type: 'setActionProperty',
        payload: {
          uuid: action.uuid!,
          key: 'alertsFilter',
          value: newAlertsFilter,
        },
      });
      validateActionBase(newAction);
    },
    [action, dispatch, validateActionBase]
  );

  const onTimeframeChange = useCallback(
    (timeframe?: AlertsFilterTimeframe) => {
      dispatch({
        type: 'setActionProperty',
        payload: {
          uuid: action.uuid!,
          key: 'alertsFilter',
          value: {
            ...action.alertsFilter,
            timeframe,
          },
        },
      });
    },
    [action, dispatch]
  );

  return (
    <EuiAccordion
      initialIsOpen
      data-test-subj="ruleActionsItem"
      borders="all"
      style={{
        backgroundColor: subdued,
        borderRadius: euiTheme.border.radius.medium,
      }}
      id={action.id}
      onToggle={setIsOpen}
      buttonProps={{
        style: {
          width: '100%',
        },
      }}
      arrowProps={{
        css: css`
          margin-left: ${euiTheme.size.m};
        `,
      }}
      extraAction={
        <EuiButtonIcon
          data-test-subj="ruleActionsItemDeleteButton"
          style={{
            marginRight: euiTheme.size.l,
          }}
          aria-label={i18n.translate(
            'alertsUIShared.ruleActionsSystemActionsItem.deleteActionAriaLabel',
            {
              defaultMessage: 'delete action',
            }
          )}
          iconType="trash"
          color="danger"
          onClick={() => onDelete(action.uuid!)}
        />
      }
      buttonContentClassName="eui-fullWidth"
      buttonContent={
        <EuiPanel color="subdued" paddingSize="m">
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              {showActionGroupErrorIcon() ? (
                <EuiToolTip content={ACTION_ERROR_TOOLTIP}>
                  <EuiIcon
                    data-test-subj="action-group-error-icon"
                    type="warning"
                    color="danger"
                    size="l"
                  />
                </EuiToolTip>
              ) : (
                <Suspense fallback={null}>
                  <EuiIcon size="l" type={actionTypeModel.iconClass} />
                </Suspense>
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText>{PRECONFIGURED_ACTION_TITLE(connector)}</EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                <strong>{actionType?.name}</strong>
              </EuiText>
            </EuiFlexItem>
            {(selectedActionGroup || action.frequency?.summary) && !isOpen && (
              <EuiFlexItem grow={false}>
                <EuiBadge iconType="clock">
                  {action.frequency?.summary
                    ? SUMMARY_GROUP_TITLE
                    : RUN_WHEN_GROUP_TITLE(selectedActionGroup!.name.toLocaleLowerCase())}
                </EuiBadge>
              </EuiFlexItem>
            )}
            {warning && !isOpen && (
              <EuiFlexItem grow={false}>
                <EuiBadge data-test-subj="warning-badge" iconType="warning" color="warning">
                  {ACTION_WARNING_TITLE}
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiPanel>
      }
    >
      <EuiFlexGroup
        direction="column"
        style={{
          padding: euiTheme.size.l,
          backgroundColor: plain,
        }}
      >
        <EuiFlexItem>
          <EuiTabs>
            <EuiTab isSelected={tab === 'settings'} onClick={() => setTab('settings')}>
              Settings
            </EuiTab>
            <EuiTab isSelected={tab === 'messages'} onClick={() => setTab('messages')}>
              Message
            </EuiTab>
          </EuiTabs>
        </EuiFlexItem>
        <EuiFlexItem>
          {tab === 'settings' && (
            <RuleActionsSettings
              action={action}
              producerId={producerId}
              onUseDefaultMessageChange={() => setUseDefaultMessage(true)}
              onNotifyWhenChange={onNotifyWhenChange}
              onActionGroupChange={onActionGroupChange}
              onAlertsFilterChange={onAlertsFilterChange}
              onTimeframeChange={onTimeframeChange}
            />
          )}
          {tab === 'messages' && (
            <RuleActionsMessage
              action={action}
              index={index}
              useDefaultMessage={useDefaultMessage}
              connector={connector}
              producerId={producerId}
              warning={warning}
              templateFields={templateFields}
              onParamsChange={onParamsChange}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiAccordion>
  );
};
