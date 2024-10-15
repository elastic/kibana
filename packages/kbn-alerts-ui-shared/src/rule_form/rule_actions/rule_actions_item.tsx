/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import React, { Suspense, useCallback, useMemo, useState } from 'react';
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
  RecursivePartial,
  EuiBetaBadge,
  EuiEmptyPrompt,
} from '@elastic/eui';
import {
  ActionVariable,
  AlertsFilter,
  AlertsFilterTimeframe,
  RuleAction,
  RuleActionFrequency,
  RuleActionParam,
  RuleActionParams,
} from '@kbn/alerting-types';
import { isEmpty, some } from 'lodash';
import { css } from '@emotion/react';
import { SavedObjectAttribute } from '@kbn/core/types';
import { useRuleFormDispatch, useRuleFormState } from '../hooks';
import { ActionConnector, RuleFormParamsErrors } from '../../common/types';
import { getAvailableActionVariables } from '../../action_variables';
import { validateAction, validateParamsForWarnings } from '../validation';

import { RuleActionsSettings } from './rule_actions_settings';
import { getDefaultParams, getSelectedActionGroup } from '../utils';
import { RuleActionsMessage } from './rule_actions_message';
import {
  ACTION_ERROR_TOOLTIP,
  ACTION_UNABLE_TO_LOAD_CONNECTOR_DESCRIPTION,
  ACTION_UNABLE_TO_LOAD_CONNECTOR_TITLE,
  ACTION_WARNING_TITLE,
  TECH_PREVIEW_DESCRIPTION,
  TECH_PREVIEW_LABEL,
} from '../translations';
import { checkActionFormActionTypeEnabled } from '../utils/check_action_type_enabled';

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

const ACTION_TITLE = (connector: ActionConnector) =>
  i18n.translate('alertsUIShared.ruleActionsItem.existingAlertActionTypeEditTitle', {
    defaultMessage: '{actionConnectorName}',
    values: {
      actionConnectorName: `${connector.name} ${
        connector.isPreconfigured ? '(preconfigured)' : ''
      }`,
    },
  });

export interface RuleActionsItemProps {
  action: RuleAction;
  index: number;
  producerId: string;
}

type ParamsType = RecursivePartial<any>;

const MESSAGES_TAB = 'messages';
const SETTINGS_TAB = 'settings';

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

  const [tab, setTab] = useState<string>(MESSAGES_TAB);
  const subdued = useEuiBackgroundColor('subdued');
  const plain = useEuiBackgroundColor('plain');
  const { euiTheme } = useEuiTheme();

  const [availableActionVariables, setAvailableActionVariables] = useState<ActionVariable[]>(() => {
    if (!selectedRuleType.actionVariables) {
      return [];
    }

    const selectedActionGroup = getSelectedActionGroup({
      group: action.group,
      ruleType: selectedRuleType,
      ruleTypeModel: selectedRuleTypeModel,
    });

    return getAvailableActionVariables(
      selectedRuleType.actionVariables,
      // TODO: this is always undefined for now, might need to make this a prop later on
      undefined,
      selectedActionGroup,
      !!action.frequency?.summary
    );
  });

  const [useDefaultMessage, setUseDefaultMessage] = useState(false);

  const [storedActionParamsForAadToggle, setStoredActionParamsForAadToggle] = useState<
    Record<string, SavedObjectAttribute>
  >({});

  const [warning, setWarning] = useState<string | null>(null);

  const [isOpen, setIsOpen] = useState(true);

  const dispatch = useRuleFormDispatch();
  const actionTypeModel = actionTypeRegistry.get(action.actionTypeId);
  const actionType = connectorTypes.find(({ id }) => id === action.actionTypeId);
  const connector = connectors.find(({ id }) => id === action.id);

  const showActionGroupErrorIcon = useMemo(() => {
    const actionParamsError = actionsParamsErrors[action.uuid!] || {};
    return !isOpen && some(actionParamsError, (error) => !isEmpty(error));
  }, [isOpen, action, actionsParamsErrors]);

  const selectedActionGroup = getSelectedActionGroup({
    group: action.group,
    ruleType: selectedRuleType,
    ruleTypeModel: selectedRuleTypeModel,
  });

  const templateFields = action.useAlertDataForTemplate
    ? aadTemplateFields
    : availableActionVariables;

  const checkEnabledResult = useMemo(() => {
    if (!actionType) {
      return null;
    }
    return checkActionFormActionTypeEnabled(
      actionType,
      connectors.filter((c) => c.isPreconfigured)
    );
  }, [actionType, connectors]);

  const onDelete = (id: string) => {
    dispatch({ type: 'removeAction', payload: { uuid: id } });
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
    ({ actionGroup, summary: isSummaryAction }: { actionGroup: string; summary?: boolean }) => {
      const messageVariables = selectedRuleType.actionVariables;

      if (!messageVariables) {
        setAvailableActionVariables([]);
        return;
      }

      const newSelectedActionGroup = getSelectedActionGroup({
        group: actionGroup,
        ruleType: selectedRuleType,
        ruleTypeModel: selectedRuleTypeModel,
      });

      setAvailableActionVariables(
        getAvailableActionVariables(
          messageVariables,
          undefined,
          newSelectedActionGroup,
          !!isSummaryAction
        )
      );
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
      const newDefaultParams: ParamsType = {};
      const defaultAADParams: ParamsType = {};
      for (const [key, paramValue] of Object.entries(defaultParams)) {
        newDefaultParams[key] = paramValue;
        // Collects AAD params by checking if the value is {x}.{y}
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

      if (!newAlertsFilter.query) {
        delete newAlertsFilter.query;
      }

      const alertsFilter = isEmpty(newAlertsFilter) ? undefined : newAlertsFilter;

      const newAction = {
        ...action,
        alertsFilter,
      };

      dispatch({
        type: 'setActionProperty',
        payload: {
          uuid: action.uuid!,
          key: 'alertsFilter',
          value: alertsFilter,
        },
      });
      validateActionBase(newAction);
    },
    [action, dispatch, validateActionBase]
  );

  const onTimeframeChange = useCallback(
    (timeframe?: AlertsFilterTimeframe) => {
      const newAlertsFilter = {
        ...action.alertsFilter,
        timeframe,
      };

      if (!newAlertsFilter.timeframe) {
        delete newAlertsFilter.timeframe;
      }

      const alertsFilter = isEmpty(newAlertsFilter) ? undefined : newAlertsFilter;

      const newAction = {
        ...action,
        alertsFilter,
      };

      dispatch({
        type: 'setActionProperty',
        payload: {
          uuid: action.uuid!,
          key: 'alertsFilter',
          value: alertsFilter,
        },
      });
      validateActionBase(newAction);
    },
    [action, dispatch, validateActionBase]
  );

  const onUseAadTemplateFieldsChange = useCallback(() => {
    dispatch({
      type: 'setActionProperty',
      payload: {
        uuid: action.uuid!,
        key: 'useAlertDataForTemplate',
        value: !!!action.useAlertDataForTemplate,
      },
    });

    const currentActionParams = { ...action.params };
    const newActionParams: RuleActionParams = {};
    for (const key of Object.keys(currentActionParams)) {
      newActionParams[key] = storedActionParamsForAadToggle[key] ?? '';
    }

    dispatch({
      type: 'setActionParams',
      payload: {
        uuid: action.uuid!,
        value: newActionParams,
      },
    });

    setStoredActionParamsForAadToggle(currentActionParams);
  }, [action, storedActionParamsForAadToggle, dispatch]);

  const accordionContent = useMemo(() => {
    if (!connector || !checkEnabledResult) {
      return null;
    }

    if (!checkEnabledResult.isEnabled) {
      return (
        <EuiFlexGroup
          direction="column"
          style={{
            padding: euiTheme.size.l,
            backgroundColor: plain,
            borderRadius: euiTheme.border.radius.medium,
          }}
        >
          <EuiFlexItem>{checkEnabledResult.messageCard}</EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    return (
      <EuiFlexGroup
        direction="column"
        style={{
          padding: euiTheme.size.l,
          backgroundColor: plain,
          borderRadius: euiTheme.border.radius.medium,
        }}
      >
        <EuiFlexItem>
          <EuiTabs>
            <EuiTab isSelected={tab === MESSAGES_TAB} onClick={() => setTab(MESSAGES_TAB)}>
              Message
            </EuiTab>
            <EuiTab isSelected={tab === SETTINGS_TAB} onClick={() => setTab(SETTINGS_TAB)}>
              Settings
            </EuiTab>
          </EuiTabs>
        </EuiFlexItem>
        <EuiFlexItem>
          {tab === MESSAGES_TAB && (
            <RuleActionsMessage
              action={action}
              index={index}
              useDefaultMessage={useDefaultMessage}
              connector={connector}
              producerId={producerId}
              warning={warning}
              templateFields={templateFields}
              onParamsChange={onParamsChange}
              onUseAadTemplateFieldsChange={onUseAadTemplateFieldsChange}
            />
          )}
          {tab === SETTINGS_TAB && (
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
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, [
    action,
    connector,
    producerId,
    euiTheme,
    plain,
    index,
    tab,
    templateFields,
    useDefaultMessage,
    warning,
    checkEnabledResult,
    onNotifyWhenChange,
    onActionGroupChange,
    onAlertsFilterChange,
    onTimeframeChange,
    onParamsChange,
    onUseAadTemplateFieldsChange,
  ]);

  const noConnectorContent = useMemo(() => {
    return (
      <EuiEmptyPrompt
        iconType="magnifyWithExclamation"
        title={<h2>{ACTION_UNABLE_TO_LOAD_CONNECTOR_TITLE}</h2>}
        body={ACTION_UNABLE_TO_LOAD_CONNECTOR_DESCRIPTION}
      />
    );
  }, []);

  const accordionIcon = useMemo(() => {
    if (!connector) {
      return (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={ACTION_UNABLE_TO_LOAD_CONNECTOR_TITLE}>
            <EuiIcon
              data-test-subj="action-group-error-icon"
              type="warning"
              color="danger"
              size="l"
            />
          </EuiToolTip>
        </EuiFlexItem>
      );
    }

    return (
      <EuiFlexItem grow={false}>
        {showActionGroupErrorIcon ? (
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
    );
  }, [connector, showActionGroupErrorIcon, actionTypeModel]);

  const connectorTitle = useMemo(() => {
    const title = connector ? ACTION_TITLE(connector) : actionTypeModel.actionTypeTitle;
    return (
      <EuiFlexItem grow={false}>
        <EuiText>{title}</EuiText>
      </EuiFlexItem>
    );
  }, [connector, actionTypeModel]);

  const actionTypeTitle = useMemo(() => {
    if (!connector || !actionType) {
      return null;
    }
    return (
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued">
          <strong>{actionType.name}</strong>
        </EuiText>
      </EuiFlexItem>
    );
  }, [connector, actionType]);

  const runWhenTitle = useMemo(() => {
    if (!connector) {
      return null;
    }
    if (isOpen) {
      return null;
    }
    if (selectedActionGroup || action.frequency?.summary) {
      return (
        <EuiFlexItem grow={false}>
          <EuiBadge iconType="clock">
            {action.frequency?.summary
              ? SUMMARY_GROUP_TITLE
              : RUN_WHEN_GROUP_TITLE(selectedActionGroup!.name.toLocaleLowerCase())}
          </EuiBadge>
        </EuiFlexItem>
      );
    }
  }, [connector, isOpen, selectedActionGroup, action]);

  const warningIcon = useMemo(() => {
    if (!connector) {
      return null;
    }
    if (isOpen) {
      return null;
    }
    if (warning) {
      return (
        <EuiFlexItem grow={false}>
          <EuiBadge data-test-subj="warning-badge" iconType="warning" color="warning">
            {ACTION_WARNING_TITLE}
          </EuiBadge>
        </EuiFlexItem>
      );
    }
  }, [connector, isOpen, warning]);

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
          <EuiFlexGroup alignItems="center" responsive={false}>
            {accordionIcon}
            {connectorTitle}
            {actionTypeTitle}
            {runWhenTitle}
            {warningIcon}
            {actionTypeModel.isExperimental && (
              <EuiFlexItem grow={false}>
                <EuiBetaBadge
                  alignment="middle"
                  data-test-subj="ruleActionsSystemActionsItemBetaBadge"
                  label={TECH_PREVIEW_LABEL}
                  tooltipContent={TECH_PREVIEW_DESCRIPTION}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiPanel>
      }
    >
      {connector && accordionContent}
      {!connector && noConnectorContent}
    </EuiAccordion>
  );
};
