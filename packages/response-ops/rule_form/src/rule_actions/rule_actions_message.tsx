/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense, useMemo } from 'react';
import {
  EuiCallOut,
  EuiErrorBoundary,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import { ActionVariable, RuleActionParam } from '@kbn/alerting-types';
import { ActionConnector, ActionConnectorMode } from '@kbn/alerts-ui-shared';
import { useRuleFormState } from '../hooks';
import { RuleAction, RuleUiAction } from '../common';
import { getSelectedActionGroup } from '../utils';
import { ACTION_USE_AAD_TEMPLATE_FIELDS_LABEL } from '../translations';

export interface RuleActionsMessageProps {
  action: RuleUiAction;
  index: number;
  templateFields: ActionVariable[];
  useDefaultMessage: boolean;
  connector: ActionConnector;
  producerId: string;
  warning?: string | null;
  onParamsChange: (key: string, value: RuleActionParam) => void;
  onUseAadTemplateFieldsChange?: () => void;
}

export const RuleActionsMessage = (props: RuleActionsMessageProps) => {
  const {
    action,
    index,
    templateFields,
    useDefaultMessage,
    connector,
    producerId,
    warning,
    onParamsChange,
    onUseAadTemplateFieldsChange,
  } = props;

  const {
    plugins: { actionTypeRegistry },
    actionsParamsErrors = {},
    selectedRuleType,
    selectedRuleTypeModel,
    connectorTypes,
    showMustacheAutocompleteSwitch,
  } = useRuleFormState();

  const actionTypeModel = actionTypeRegistry.get(action.actionTypeId);

  const ParamsFieldsComponent = actionTypeModel.actionParamsFields;

  const actionsParamsError = actionsParamsErrors[action.uuid!] || {};

  const isSystemAction = useMemo(() => {
    return connectorTypes.some((actionType) => {
      return actionType.id === action.actionTypeId && actionType.isSystemActionType;
    });
  }, [action, connectorTypes]);

  const selectedActionGroup = useMemo(() => {
    if (isSystemAction) {
      return;
    }

    return getSelectedActionGroup({
      group: (action as RuleAction).group,
      ruleType: selectedRuleType,
      ruleTypeModel: selectedRuleTypeModel,
    });
  }, [isSystemAction, action, selectedRuleType, selectedRuleTypeModel]);

  const defaultMessage = useMemo(() => {
    if (isSystemAction) {
      return selectedRuleTypeModel.defaultSummaryMessage;
    }

    // if action is a summary action, show the default summary message
    return (action as RuleAction).frequency?.summary
      ? selectedRuleTypeModel.defaultSummaryMessage
      : selectedActionGroup?.defaultActionMessage ?? selectedRuleTypeModel.defaultActionMessage;
  }, [isSystemAction, action, selectedRuleTypeModel, selectedActionGroup]);

  if (!ParamsFieldsComponent) {
    return null;
  }

  return (
    <EuiErrorBoundary>
      <EuiFlexGroup direction="column" data-test-subj="ruleActionsMessage">
        {showMustacheAutocompleteSwitch && onUseAadTemplateFieldsChange && (
          <EuiFlexItem>
            <EuiSwitch
              label={ACTION_USE_AAD_TEMPLATE_FIELDS_LABEL}
              checked={(action as RuleAction).useAlertDataForTemplate || false}
              onChange={onUseAadTemplateFieldsChange}
              data-test-subj="ruleActionsMessageUseAadTemplateFieldsSwitch"
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <Suspense fallback={null}>
            <ParamsFieldsComponent
              actionParams={action.params as any}
              errors={actionsParamsError}
              index={index}
              selectedActionGroupId={selectedActionGroup?.id}
              editAction={onParamsChange}
              messageVariables={templateFields}
              defaultMessage={defaultMessage}
              useDefaultMessage={useDefaultMessage}
              actionConnector={connector}
              executionMode={ActionConnectorMode.ActionForm}
              ruleTypeId={selectedRuleType.id}
              producerId={producerId}
            />
            {warning ? (
              <>
                <EuiSpacer size="s" />
                <EuiCallOut size="s" color="warning" title={warning} />
              </>
            ) : null}
          </Suspense>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiErrorBoundary>
  );
};
