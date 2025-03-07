/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiResizableContainer,
  EuiSpacer,
  EuiSteps,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { checkActionFormActionTypeEnabled } from '@kbn/alerts-ui-shared';
import React, { useCallback, useMemo, useState } from 'react';
import { useRuleFormScreenContext, useRuleFormState, useRuleFormSteps } from '../hooks';
import { DISABLED_ACTIONS_WARNING_TITLE, RULE_FORM_RETURN_TITLE } from '../translations';
import type { RuleFormData } from '../types';
import { RulePageFooter } from './rule_page_footer';
import { RulePageNameInput } from './rule_page_name_input';
import { RuleActionsConnectorsModal } from '../rule_actions/rule_actions_connectors_modal';
import { RulePageShowRequestModal } from './rule_page_show_request_modal';
import { ConfirmRuleClose } from '../components';

export interface RulePageProps {
  isEdit?: boolean;
  isSaving?: boolean;
  onCancel?: () => void;
  onSave: (formData: RuleFormData) => void;
}

export const RulePage = (props: RulePageProps) => {
  const { isEdit = false, isSaving = false, onCancel = () => {}, onSave } = props;
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);

  const { formData, multiConsumerSelection, connectorTypes, connectors, touched, onInteraction } =
    useRuleFormState();

  const { steps } = useRuleFormSteps();

  const { actions } = formData;

  const styles = {
    backgroundColor: 'transparent',
  };

  const onSaveInternal = useCallback(() => {
    onSave({
      ...formData,
      ...(multiConsumerSelection ? { consumer: multiConsumerSelection } : {}),
    });
  }, [onSave, formData, multiConsumerSelection]);

  const onCancelInternal = useCallback(() => {
    if (touched) {
      setIsCancelModalOpen(true);
    } else {
      onCancel();
    }
  }, [touched, onCancel]);

  const { isConnectorsScreenVisible, isShowRequestScreenVisible } = useRuleFormScreenContext();

  const hasActionsDisabled = useMemo(() => {
    const preconfiguredConnectors = connectors.filter((connector) => connector.isPreconfigured);
    return actions.some((action) => {
      const actionType = connectorTypes.find(({ id }) => id === action.actionTypeId);
      if (!actionType) {
        return false;
      }
      const checkEnabledResult = checkActionFormActionTypeEnabled(
        actionType,
        preconfiguredConnectors
      );
      return !actionType.enabled && !checkEnabledResult.isEnabled;
    });
  }, [actions, connectors, connectorTypes]);

  return (
    <>
      <EuiPageTemplate
        grow
        bottomBorder
        offset={0}
        css={styles}
        onClick={onInteraction}
        onKeyDown={onInteraction}
        className="ruleForm__container"
        data-test-subj="ruleForm"
      >
        <EuiPageTemplate.Header>
          <EuiFlexGroup
            direction="column"
            gutterSize="none"
            alignItems="flexStart"
            className="eui-fullWidth"
          >
            <EuiFlexItem grow={false} style={{ alignItems: 'start' }}>
              <EuiButtonEmpty
                data-test-subj="rulePageReturnButton"
                onClick={onCancelInternal}
                style={{ padding: 0 }}
                iconType="arrowLeft"
                iconSide="left"
                aria-label="Return link"
              >
                {RULE_FORM_RETURN_TITLE}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiSpacer />
            <EuiFlexItem grow={false} className="eui-fullWidth">
              <RulePageNameInput />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPageTemplate.Header>
        <EuiPageTemplate.Section>
          <EuiResizableContainer>
            {(EuiResizablePanel, EuiResizableButton, { togglePanel }) => {
              return (
                <>
                  <EuiResizablePanel initialSize={70} minSize={'40%'} mode="main">
                    {hasActionsDisabled && (
                      <>
                        <EuiCallOut
                          size="s"
                          color="danger"
                          iconType="error"
                          data-test-subj="hasActionsDisabled"
                          title={DISABLED_ACTIONS_WARNING_TITLE}
                        />
                        <EuiSpacer />
                      </>
                    )}
                    <EuiSteps steps={steps} />
                  </EuiResizablePanel>
                  <EuiResizableButton />
                  <EuiResizablePanel
                    id={'preview'}
                    mode="collapsible"
                    initialSize={30}
                    minSize={'20%'}
                  >
                    <EuiTitle size="m">
                      <h3>Rule preview</h3>
                    </EuiTitle>
                    <EuiSpacer size="s" />
                    <EuiText color="subdued">
                      <p>Preview your rule before saving it.</p>
                    </EuiText>
                    <EuiSpacer size="s" />
                    {/* <EuiFlexGroup>
                      <EuiSuperUpdateButton
                        isDisabled={!isValidRule(rule, ruleErrors, ruleActionsErrors)}
                        iconType="refresh"
                        onClick={async () => {
                          setIsLoadingPreview(true);
                          const result = await previewRule({ http, rule: rule as RuleUpdates });

                          if (result.alerts.length > 0) {
                            setHasPreviewAlertData(true);
                            setAlertsTableQuery({
                              bool: {
                                filter: [
                                  {
                                    term: {
                                      [ALERT_RULE_EXECUTION_UUID]: result.uuid,
                                    },
                                  },
                                  {
                                    bool: {
                                      must_not: [
                                        {
                                          term: {
                                            [ALERT_STATUS]: 'preview-complete',
                                          },
                                        },
                                      ],
                                    },
                                  },
                                ],
                              },
                            });
                          } else {
                            setHasPreviewAlertData(false);
                          }

                          setPreviewActionData(result.actions ?? []);
                          setLoadedFirstPreview(true);
                          setIsLoadingPreview(false);
                        }}
                        color="primary"
                        fill={true}
                        data-test-subj="previewSubmitButton"
                      />
                      {isLoadingPreview ? <EuiLoadingSpinner size="xl" /> : null}
                    </EuiFlexGroup>
                    <EuiSpacer size="m" />
                    {hasPreviewAlertData && alertsTableQuery ? (
                      <>
                        <EuiTitle size="s">
                          <h3>Alert preview</h3>
                        </EuiTitle>
                        <EuiSpacer size="s" />
                        <EuiText color="subdued">
                          <p>The following alerts would have been detected</p>
                        </EuiText>
                        <EuiSpacer size="m" />
                        <AlertsTableState
                          id={'preview'}
                          configurationId={'preview'}
                          alertsTableConfigurationRegistry={
                            alertsTableConfigurationRegistry as TypeRegistry<AlertsTableConfigurationRegistry>
                          }
                          featureIds={['alerts']}
                          showExpandToDetails={false}
                          query={alertsTableQuery}
                        />
                        <EuiSpacer size="m" />
                      </>
                    ) : null}
                    {loadedFirstPreview && !hasPreviewAlertData ? (
                      <EuiPanel
                        hasBorder={true}
                        style={{
                          maxWidth: 500,
                        }}
                      >
                        <EuiFlexGroup
                          style={{ height: 150 }}
                          alignItems="center"
                          justifyContent="center"
                        >
                          <EuiFlexItem>
                            <EuiText size="s">
                              <EuiTitle>
                                <h3>
                                  <FormattedMessage
                                    id="xpack.triggersActionsUI.empty.title"
                                    defaultMessage="No alerts detected"
                                  />
                                </h3>
                              </EuiTitle>
                              <p>
                                <FormattedMessage
                                  id="xpack.triggersActionsUI.empty.description"
                                  defaultMessage="Try modifying your rule configuration"
                                />
                              </p>
                            </EuiText>
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiImage
                              style={{ width: 200, height: 148 }}
                              size="200"
                              alt=""
                              url={icon}
                            />
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiPanel>
                    ) : null}
                    {actionTypesIndex && previewActionData.length > 0 ? (
                      <>
                        <EuiTitle size="s">
                          <h3>Action preview</h3>
                        </EuiTitle>
                        <EuiSpacer size="s" />
                        <EuiText color="subdued">
                          <p>
                            The following{' '}
                            {previewActionData.length > 1
                              ? `${previewActionData.length} notifications`
                              : `notification`}{' '}
                            would have been sent
                          </p>
                        </EuiText>
                        <EuiSpacer size="m" />
                        {previewActionData.map((previewAction: RuleAction, index: number) => {
                          const actionConnector = connectors.find(
                            (field) => field.id === previewAction.id
                          );

                          return (
                            <ActionTypePreview
                              actionItem={previewAction}
                              actionConnector={actionConnector!}
                              index={index}
                              key={`action-preview-action-at-${index}`}
                              actionTypesIndex={actionTypesIndex}
                              connectors={connectors}
                              actionTypeRegistry={actionTypeRegistry}
                            />
                          );
                        })}
                      </>
                    ) : null}
                    {loadedFirstPreview && hasPreviewAlertData && !previewActionData.length ? (
                      <EuiTitle size="xxs">
                        <h5>
                          <EuiIcon type="iInCircle" />
                          Add actions to your rule configuration to preview their contents
                        </h5>
                      </EuiTitle>
                    ) : null} */}
                  </EuiResizablePanel>
                </>
              );
            }}
          </EuiResizableContainer>
        </EuiPageTemplate.Section>
        <EuiPageTemplate.Section>
          <RulePageFooter
            isEdit={isEdit}
            isSaving={isSaving}
            onCancel={onCancelInternal}
            onSave={onSaveInternal}
          />
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
      {isCancelModalOpen && (
        <ConfirmRuleClose onCancel={() => setIsCancelModalOpen(false)} onConfirm={onCancel} />
      )}
      {isConnectorsScreenVisible && <RuleActionsConnectorsModal />}
      {isShowRequestScreenVisible && <RulePageShowRequestModal isEdit={isEdit} />}
    </>
  );
};
