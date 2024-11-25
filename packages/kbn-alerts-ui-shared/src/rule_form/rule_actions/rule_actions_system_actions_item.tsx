/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { isEmpty, some } from 'lodash';
import {
  EuiAccordion,
  EuiBadge,
  EuiBetaBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiToolTip,
  useEuiBackgroundColor,
  useEuiTheme,
} from '@elastic/eui';
import { RuleActionParam, RuleSystemAction } from '@kbn/alerting-types';
import { SavedObjectAttribute } from '@kbn/core/types';
import { css } from '@emotion/react';
import { useRuleFormDispatch, useRuleFormState } from '../hooks';
import { ActionConnector, RuleFormParamsErrors } from '../../common';
import {
  ACTION_ERROR_TOOLTIP,
  ACTION_WARNING_TITLE,
  TECH_PREVIEW_DESCRIPTION,
  TECH_PREVIEW_LABEL,
} from '../translations';
import { RuleActionsMessage } from './rule_actions_message';
import { validateParamsForWarnings } from '../validation';
import { getAvailableActionVariables } from '../../action_variables';
import {
  IsDisabledResult,
  IsEnabledResult,
  checkActionFormActionTypeEnabled,
} from '../utils/check_action_type_enabled';

interface RuleActionsSystemActionsItemProps {
  action: RuleSystemAction;
  index: number;
  producerId: string;
}

interface SystemActionAccordionContentProps extends RuleActionsSystemActionsItemProps {
  connector: ActionConnector;
  checkEnabledResult?: IsEnabledResult | IsDisabledResult | null;
  warning?: string | null;
  onParamsChange: (key: string, value: RuleActionParam) => void;
}

const SystemActionAccordionContent: React.FC<SystemActionAccordionContentProps> = React.memo(
  ({ connector, checkEnabledResult, action, index, producerId, warning, onParamsChange }) => {
    const { aadTemplateFields } = useRuleFormState();
    const { euiTheme } = useEuiTheme();
    const plain = useEuiBackgroundColor('plain');

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
        data-test-subj="ruleActionsSystemActionsItemAccordionContent"
        direction="column"
        style={{
          padding: euiTheme.size.l,
          backgroundColor: plain,
        }}
      >
        <EuiFlexItem>
          <RuleActionsMessage
            useDefaultMessage
            action={action}
            index={index}
            connector={connector}
            producerId={producerId}
            warning={warning}
            templateFields={aadTemplateFields}
            onParamsChange={onParamsChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

export const RuleActionsSystemActionsItem = (props: RuleActionsSystemActionsItemProps) => {
  const { action, index, producerId } = props;

  const {
    plugins: { actionTypeRegistry, http },
    actionsParamsErrors = {},
    selectedRuleType,
    connectorTypes,
    connectors,
  } = useRuleFormState();

  const [isOpen, setIsOpen] = useState(true);
  const [storedActionParamsForAadToggle, setStoredActionParamsForAadToggle] = useState<
    Record<string, SavedObjectAttribute>
  >({});
  const [warning, setWarning] = useState<string | null>(null);

  const subdued = useEuiBackgroundColor('subdued');
  const { euiTheme } = useEuiTheme();

  const dispatch = useRuleFormDispatch();
  const actionTypeModel = actionTypeRegistry.get(action.actionTypeId);
  const actionType = connectorTypes.find(({ id }) => id === action.actionTypeId)!;
  const connector = connectors.find(({ id }) => id === action.id)!;

  const actionParamsError = actionsParamsErrors[action.uuid!] || {};

  const availableActionVariables = useMemo(() => {
    const messageVariables = selectedRuleType.actionVariables;

    return messageVariables
      ? getAvailableActionVariables(messageVariables, undefined, undefined, true)
      : [];
  }, [selectedRuleType]);

  const showActionGroupErrorIcon = (): boolean => {
    return !isOpen && some(actionParamsError, (error) => !isEmpty(error));
  };

  const onDelete = (id: string) => {
    dispatch({ type: 'removeAction', payload: { uuid: id } });
  };

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

  const checkEnabledResult = useMemo(() => {
    if (!actionType) {
      return null;
    }
    return checkActionFormActionTypeEnabled(actionType, []);
  }, [actionType]);

  return (
    <EuiAccordion
      data-test-subj="ruleActionsSystemActionsItem"
      initialIsOpen
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
          data-test-subj="ruleActionsSystemActionsItemDeleteActionButton"
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
        <EuiPanel
          data-test-subj="ruleActionsSystemActionsItemAccordionButton"
          color="subdued"
          paddingSize="m"
        >
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
              <EuiText>{connector.name}</EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                <strong>{actionType?.name}</strong>
              </EuiText>
            </EuiFlexItem>
            {warning && !isOpen && (
              <EuiFlexItem grow={false}>
                <EuiBadge data-test-subj="warning-badge" iconType="warning" color="warning">
                  {ACTION_WARNING_TITLE}
                </EuiBadge>
              </EuiFlexItem>
            )}
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
      <SystemActionAccordionContent
        action={action}
        index={index}
        producerId={producerId}
        warning={warning}
        connector={connector}
        checkEnabledResult={checkEnabledResult}
        onParamsChange={onParamsChange}
      />
    </EuiAccordion>
  );
};
