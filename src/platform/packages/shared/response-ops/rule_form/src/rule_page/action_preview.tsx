/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiAccordion,
  EuiText,
  EuiErrorBoundary,
  EuiBetaBadge,
  EuiSplitPanel,
  useEuiTheme,
  EuiToolTip,
  EuiPanel,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { RuleAction } from '@kbn/alerting-plugin/common';
import {
  ActionConnector,
  ActionConnectorMode,
  ActionTypeModel,
  checkActionFormActionTypeEnabled,
} from '@kbn/alerts-ui-shared';
import { useRuleFormState } from '../hooks';
import {
  ACTION_UNABLE_TO_LOAD_CONNECTOR_DESCRIPTION,
  ACTION_UNABLE_TO_LOAD_CONNECTOR_TITLE,
  TECH_PREVIEW_DESCRIPTION,
  TECH_PREVIEW_LABEL,
} from '../translations';

export interface ActionTypePreviewProps {
  actionItem: RuleAction;
  actionConnector: ActionConnector;
  index: number;
  connectorType: ActionTypeModel;
  connectors: ActionConnector[];
}

const ACTION_TITLE = (connector: ActionConnector) =>
  i18n.translate('responseOpsRuleForm.ruleActionsItem.existingAlertActionTypeEditTitle', {
    defaultMessage: '{actionConnectorName}',
    values: {
      actionConnectorName: `${connector.name} ${
        connector.isPreconfigured ? '(preconfigured)' : ''
      }`,
    },
  });

export const ActionPreview = ({
  actionItem,
  actionConnector,
  connectorType,
  index,
}: ActionTypePreviewProps) => {
  const { actionsParamsErrors = {}, connectors, connectorTypes } = useRuleFormState();

  const actionType = connectorTypes.find(({ id }) => id === actionItem.actionTypeId);

  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(true);
  const ParamsFieldsComponent = connectorType.actionParamsFields;

  const actionsParamsError = actionsParamsErrors[actionItem.uuid!] || {};
  const checkEnabledResult = useMemo(() => {
    if (!actionType) {
      return null;
    }
    return checkActionFormActionTypeEnabled(
      actionType,
      connectors.filter((c) => c.isPreconfigured)
    );
  }, [actionType, connectors]);

  const accordionContent = useMemo(() => {
    if (!actionConnector || !checkEnabledResult) {
      return null;
    }

    if (!checkEnabledResult.isEnabled) {
      return (
        <EuiFlexGroup
          direction="column"
          style={{
            padding: euiTheme.size.l,
            backgroundColor: euiTheme.colors.backgroundBasePlain,
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
          backgroundColor: euiTheme.colors.backgroundBasePlain,
          borderRadius: euiTheme.border.radius.medium,
        }}
      >
        <EuiFlexItem>
          <EuiErrorBoundary>
            <EuiFlexGroup direction="column" data-test-subj="ruleActionsMessage">
              <EuiFlexItem>
                <Suspense fallback={null}>
                  <ParamsFieldsComponent
                    actionParams={actionItem.params as any}
                    errors={actionsParamsError}
                    index={index}
                    editAction={() => {}}
                    messageVariables={[]}
                    defaultMessage={''}
                    useDefaultMessage={false}
                    actionConnector={actionConnector}
                    executionMode={ActionConnectorMode.ActionForm}
                    ruleTypeId={''}
                    producerId={''}
                  />
                </Suspense>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiErrorBoundary>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionItem.params, actionConnector, checkEnabledResult]);

  const noConnectorContent = useMemo(() => {
    return (
      <EuiEmptyPrompt
        iconType="magnifyWithExclamation"
        title={<h2>{ACTION_UNABLE_TO_LOAD_CONNECTOR_TITLE}</h2>}
        body={ACTION_UNABLE_TO_LOAD_CONNECTOR_DESCRIPTION}
      />
    );
  }, []);

  const connectorTitle = useMemo(() => {
    const title = actionConnector ? ACTION_TITLE(actionConnector) : connectorType.actionTypeTitle;
    return (
      <EuiFlexItem grow={false} className=".eui-textBreakWord">
        <EuiText size="s">{title}</EuiText>
      </EuiFlexItem>
    );
  }, [actionConnector, connectorType]);

  return (
    <>
      <EuiSplitPanel.Outer hasShadow={isOpen}>
        <EuiAccordion
          initialIsOpen
          borders="all"
          key={index}
          style={{
            backgroundColor: euiTheme.colors.lightestShade,
            borderRadius: euiTheme.border.radius.medium,
          }}
          id={index.toString()}
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
          buttonContentClassName="eui-fullWidth"
          data-test-subj={`alertActionAccordion-${index}`}
          buttonContent={
            <EuiPanel color="transparent" paddingSize="m">
              <EuiFlexGroup alignItems="center" responsive={false}>
                <EuiToolTip content={actionConnector.name}>
                  <EuiIcon size="l" type={connectorType.iconClass} />
                </EuiToolTip>
                <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                  {connectorTitle}
                  {connectorType.isExperimental && (
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
              </EuiFlexGroup>
            </EuiPanel>
          }
        >
          {actionConnector && accordionContent}
          {!actionConnector && noConnectorContent}
        </EuiAccordion>
      </EuiSplitPanel.Outer>
      <EuiSpacer size="l" />
    </>
  );
};
