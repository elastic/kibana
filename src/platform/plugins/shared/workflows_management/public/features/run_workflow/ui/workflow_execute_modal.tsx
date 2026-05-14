/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiRadio,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css, Global } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFetchAlertsIndexNamesQuery } from '@kbn/alerts-ui-shared';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { WorkflowYaml } from '@kbn/workflows';
import { extractNormalizedInputsFromYaml } from '@kbn/workflows/spec/lib/field_conversion';
import { useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { ENABLED_TRIGGER_TABS } from './constants';
import { TRIGGER_TABS_DESCRIPTIONS, TRIGGER_TABS_LABELS } from './translations';
import type { WorkflowTriggerTab } from './types';
import { WorkflowExecuteAlertForm } from './workflow_execute_alert_form';
import { WorkflowExecuteEventForm } from './workflow_execute_event_form';
import { WorkflowExecuteHistoricalForm } from './workflow_execute_historical_form';
import { WorkflowExecuteIndexForm } from './workflow_execute_index_form';
import { WorkflowExecuteManualForm } from './workflow_execute_manual_form';
import {
  getFallbackTriggerTab,
  hasCustomEventTrigger,
  hasWorkflowInputFields,
  isRacAlertsApiForbiddenError,
  resolveInitialSelectedTrigger,
} from './workflow_execute_modal_helpers';
import { useKibana } from '../../../hooks/use_kibana';
import { sanitizeText } from '../../../shared/lib/sanitize_text';
import { useEventDrivenExecutionStatus } from '../../workflow_list/ui/use_event_driven_execution_status';

export interface WorkflowExecuteModalProps {
  definition: WorkflowYaml | null;
  workflowId?: string;
  isTestRun: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>, triggerTab: WorkflowTriggerTab) => void;
  yamlString?: string;
  /** When set, open with Historical tab and this execution pre-selected */
  initialExecutionId?: string;
}
export const WorkflowExecuteModal = React.memo<WorkflowExecuteModalProps>(
  ({ definition, workflowId, onClose, onSubmit, isTestRun, yamlString, initialExecutionId }) => {
    const modalTitleId = useGeneratedHtmlId();
    const { services } = useKibana();
    const { http } = services;
    const { canReadWorkflowExecution, canExecuteWorkflow } = useWorkflowsCapabilities();
    const { eventDrivenExecutionEnabled } = useEventDrivenExecutionStatus();

    const [hasAlertRacAccess, setHasAlertRacAccess] = useState(true);

    useFetchAlertsIndexNamesQuery(
      { http, ruleTypeIds: [] },
      {
        enabled: hasAlertRacAccess,
        retry: false,
        onError: (err: unknown) => {
          if (isRacAlertsApiForbiddenError(err)) {
            setHasAlertRacAccess(false);
          }
        },
      }
    );

    const normalizedInputs = useMemo(
      () => extractNormalizedInputsFromYaml(definition, yamlString),
      [definition, yamlString]
    );

    const [selectedTrigger, setSelectedTrigger] = useState<WorkflowTriggerTab>(() =>
      resolveInitialSelectedTrigger(
        definition,
        initialExecutionId,
        hasAlertRacAccess,
        canReadWorkflowExecution,
        normalizedInputs
      )
    );

    const [executionInput, setExecutionInput] = useState<string>('');
    const [executionInputErrors, setExecutionInputErrors] = useState<string | null>(null);
    const [eventTriggerTableSelectionCount, setEventTriggerTableSelectionCount] = useState(0);

    const { euiTheme } = useEuiTheme();

    const handleInputChange = useCallback((value: string) => {
      setExecutionInput(sanitizeText(value));
    }, []);

    const handleEventTriggerTableSelectionCountChange = useCallback((count: number) => {
      setEventTriggerTableSelectionCount(count);
    }, []);

    const handleSubmit = useCallback(() => {
      if (!canExecuteWorkflow) {
        return;
      }
      const trimmed = executionInput.trim();
      if (selectedTrigger === 'event' && trimmed === '') {
        setExecutionInputErrors(
          i18n.translate('workflows.workflowExecuteModal.eventSelectionRequired', {
            defaultMessage: 'Select a trigger event row to use as the run input.',
          })
        );
        return;
      }
      if (selectedTrigger === 'event' && eventTriggerTableSelectionCount > 1) {
        setExecutionInputErrors(
          i18n.translate('workflows.workflowExecuteModal.eventMultipleRowsSelected', {
            defaultMessage: 'Select only one trigger event row before running the workflow.',
          })
        );
        return;
      }
      let parsed: Record<string, unknown>;
      try {
        parsed = trimmed === '' ? {} : (JSON.parse(executionInput) as Record<string, unknown>);
      } catch {
        setExecutionInputErrors(
          i18n.translate('workflows.workflowExecuteModal.invalidRunPayloadJson', {
            defaultMessage: 'Fix invalid JSON in the run payload before continuing.',
          })
        );
        return;
      }
      setExecutionInputErrors(null);
      onSubmit(parsed, selectedTrigger);
      onClose();
    }, [
      canExecuteWorkflow,
      selectedTrigger,
      onSubmit,
      onClose,
      executionInput,
      eventTriggerTableSelectionCount,
    ]);

    const handleChangeTrigger = useCallback(
      (trigger: WorkflowTriggerTab): void => {
        if (trigger === 'alert' && !hasAlertRacAccess) {
          return;
        }
        if (trigger === 'historical' && !canReadWorkflowExecution) {
          return;
        }
        if (trigger === 'event' && (!canReadWorkflowExecution || !eventDrivenExecutionEnabled)) {
          return;
        }
        if (trigger === selectedTrigger) {
          return;
        }
        setExecutionInput('');
        setExecutionInputErrors(null);
        setEventTriggerTableSelectionCount(0);
        setSelectedTrigger(trigger);
      },
      [hasAlertRacAccess, canReadWorkflowExecution, eventDrivenExecutionEnabled, selectedTrigger]
    );

    const shouldAutoRun = useMemo(() => {
      if (!definition) {
        return false;
      }
      if (hasCustomEventTrigger(definition)) {
        return false;
      }
      const hasAlertTrigger = definition.triggers?.some((trigger) => trigger.type === 'alert');
      return !hasAlertTrigger && !hasWorkflowInputFields(normalizedInputs);
    }, [definition, normalizedInputs]);

    useEffect(() => {
      if (shouldAutoRun) {
        onSubmit({}, 'manual');
        onClose();
      }
    }, [shouldAutoRun, onSubmit, onClose]);

    useEffect(() => {
      setSelectedTrigger((current) => {
        if (current === 'alert' && !hasAlertRacAccess) {
          return getFallbackTriggerTab(normalizedInputs, definition, canReadWorkflowExecution);
        }
        if (current === 'historical' && !canReadWorkflowExecution) {
          return getFallbackTriggerTab(normalizedInputs, definition, canReadWorkflowExecution);
        }
        if (current === 'event' && (!canReadWorkflowExecution || !eventDrivenExecutionEnabled)) {
          return getFallbackTriggerTab(normalizedInputs, definition, canReadWorkflowExecution);
        }
        return current;
      });
    }, [
      hasAlertRacAccess,
      canReadWorkflowExecution,
      eventDrivenExecutionEnabled,
      normalizedInputs,
      definition,
    ]);

    if (shouldAutoRun) {
      return null;
    }

    const alertTabDisabledTooltip = i18n.translate(
      'workflows.workflowExecuteModal.alertTabRacDisabledTooltip',
      {
        defaultMessage:
          'You need Rule Registry (rac) access—typically via Stack Rules, Security alerts, SLOs, or another alerts-capable feature—to use this option.',
      }
    );

    const historicalTabDisabledTooltip = i18n.translate(
      'workflows.workflowExecuteModal.historicalTabExecutionReadDisabledTooltip',
      {
        defaultMessage:
          'You need the Workflows "Read Workflow Execution" privilege to reuse input from previous runs.',
      }
    );

    const eventTabExecutionReadDisabledTooltip = i18n.translate(
      'workflows.workflowExecuteModal.eventTabExecutionReadDisabledTooltip',
      {
        defaultMessage:
          'You need the Workflows "Read Workflow Execution" privilege to browse and replay trigger events.',
      }
    );

    const runExecuteForbiddenTooltip = i18n.translate(
      'workflows.workflowExecuteModal.runExecuteForbiddenTooltip',
      {
        defaultMessage: 'You need the Workflows Execute privilege to run this workflow.',
      }
    );

    const eventTabEventDrivenDisabledTooltip = i18n.translate(
      'workflows.workflowExecuteModal.eventTabEventDrivenDisabledTooltip',
      {
        defaultMessage:
          'Event-driven workflows are disabled in this deployment. Enable event-driven execution to browse trigger events.',
      }
    );

    const modalTitle = isTestRun
      ? {
          id: 'workflows.workflowExecuteModal.testTitle',
          defaultMessage: 'Test Workflow',
        }
      : {
          id: 'workflows.workflowExecuteModal.runTitle',
          defaultMessage: 'Run Workflow',
        };

    const isFillHeightTriggerBody =
      selectedTrigger === 'event' ||
      selectedTrigger === 'manual' ||
      selectedTrigger === 'historical';

    const runIsDisabled =
      !canExecuteWorkflow ||
      Boolean(executionInputErrors) ||
      (selectedTrigger === 'event' && executionInput.trim() === '') ||
      (selectedTrigger === 'event' && eventTriggerTableSelectionCount > 1);

    const renderRunWorkflowButton = () => (
      <EuiButton
        onClick={handleSubmit}
        iconType="play"
        disabled={runIsDisabled}
        color="success"
        data-test-subj="executeWorkflowButton"
      >
        <FormattedMessage id="keepWorkflows.buttonText" defaultMessage="Run" ignoreTag />
      </EuiButton>
    );

    return (
      <>
        <Global
          styles={css`
            .euiOverlayMask:has(.workflowExecuteModal) {
              z-index: 4000;
            }
            .workflowExecuteModal [data-test-subj='workflow-query-input'] {
              position: relative;
              z-index: 1;
            }
            .workflowExecuteModal .kbnQueryBar__textareaWrapOuter {
              overflow: visible;
            }
            .workflowExecuteModal .kbnTypeahead,
            .workflowExecuteModal .kbnTypeahead__popover {
              z-index: 4002 !important;
            }

            #kibana-body
              .workflowExecuteModal
              .workflowTriggerEventsRoot:has(.euiDataGrid--fullScreen) {
              top: 0 !important;
              height: 100dvh !important;
              max-height: 100dvh !important;
            }

            .workflowExecuteModal .workflowTriggerEventsRoot:has(.euiDataGrid--fullScreen) {
              position: fixed !important;
              inset: 0 !important;
              box-sizing: border-box !important;
              width: 100vw !important;
              height: 100dvh !important;
              max-width: none !important;
              max-height: 100dvh !important;
              min-height: 0 !important;
              z-index: 8001 !important;
              margin: 0 !important;
              border-radius: 0 !important;
              display: flex !important;
              flex-direction: column !important;
              overflow-x: hidden !important;
              overflow-y: auto !important;
              padding-block-start: max(
                calc(${euiTheme.size.xxl} * 2.25),
                env(safe-area-inset-top, 0px)
              ) !important;
              padding-inline: ${euiTheme.size.m} !important;
              padding-block-end: ${euiTheme.size.xs} !important;
            }

            .workflowExecuteModal:has(.euiDataGrid--fullScreen)
              [data-test-subj='workflowExecuteModalTriggerTabs'] {
              display: none !important;
            }

            .workflowExecuteModal:has(.euiDataGrid--fullScreen)
              .euiModalBody
              .euiModalBody__overflow {
              overflow: visible !important;
            }
            .workflowExecuteModal:has(.euiDataGrid--fullScreen)
              [data-test-subj='workflowExecuteModalBodyContent'] {
              overflow: visible !important;
            }
            .workflowExecuteModal:has(.euiDataGrid--fullScreen)
              .euiModalBody__overflow
              > .euiFlexGroup {
              overflow: visible !important;
            }

            .workflowExecuteModal
              .workflowTriggerEventsRoot:has(.euiDataGrid--fullScreen)
              > .euiFlexItem:first-of-type {
              flex-shrink: 0 !important;
              min-height: min-content !important;
              overflow: visible !important;
            }

            .workflowExecuteModal
              .workflowTriggerEventsRoot:has(.euiDataGrid--fullScreen)
              .euiDataGrid.euiDataGrid--fullScreen {
              position: relative !important;
              inset: auto !important;
              width: 100% !important;
              height: 100% !important;
              max-width: none !important;
              max-height: none !important;
              min-height: 0 !important;
              flex: 1 1 auto !important;
              z-index: auto !important;
            }

            .workflowExecuteModal
              .workflowTriggerEventsRoot:has(.euiDataGrid--fullScreen)
              .unifiedDataTableToolbar,
            .workflowExecuteModal
              .workflowTriggerEventsRoot:has(.euiDataGrid--fullScreen)
              .unifiedDataTableToolbarBottom {
              flex-shrink: 0 !important;
            }

            .workflowExecuteModal
              .workflowTriggerEventsRoot:has(.euiDataGrid--fullScreen)
              .euiDataGrid__content {
              flex: 1 1 auto !important;
              min-height: 0 !important;
            }

            .workflowExecuteModal
              .workflowTriggerEventsRoot:has(.euiDataGrid--fullScreen)
              .euiDataGrid__focusWrap:has(.euiDataGrid--fullScreen) {
              flex: 1 1 auto !important;
              display: flex !important;
              flex-direction: column !important;
              min-height: 0 !important;
              height: 100% !important;
            }

            .workflowExecuteModal:has(.euiDataGrid--fullScreen) .kbnTypeahead,
            .workflowExecuteModal:has(.euiDataGrid--fullScreen) .kbnTypeahead__popover {
              z-index: 9002 !important;
            }

            .euiOverlayMask:has(.workflowExecuteModal .euiDataGrid--fullScreen) {
              padding: 0 !important;
              align-items: stretch !important;
            }
            .euiOverlayMask:has(.workflowExecuteModal .euiDataGrid--fullScreen)
              .workflowExecuteModal {
              width: 100vw !important;
              max-width: none !important;
              height: 100dvh !important;
              max-block-size: 100dvh !important;
              min-block-size: 100dvh !important;
              margin: 0 !important;
              border-radius: 0 !important;
            }

            .workflowExecuteModal:has(.euiDataGrid--fullScreen) *:not(.euiDataGrid--fullScreen *) {
              transform: none !important;
            }
          `}
        />
        <EuiModal
          className="workflowExecuteModal"
          aria-labelledby={modalTitleId}
          maxWidth={false}
          onClose={onClose}
          style={{ width: '1200px', height: '100vh' }}
          data-test-subj="workflowExecuteModal"
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle id={modalTitleId}>
              {i18n.translate(modalTitle.id, { defaultMessage: modalTitle.defaultMessage })}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody
            css={css`
              border-top: ${euiTheme.colors.borderBasePlain};
              border-bottom: ${euiTheme.colors.borderBasePlain};
              .euiModalBody__overflow {
                flex: 1;
                min-height: 0;
                display: flex;
                flex-direction: column;
                padding-inline: 0;
                overflow: hidden;
              }
            `}
          >
            <EuiFlexGroup
              direction="column"
              gutterSize="m"
              css={css`
                flex: 1;
                min-height: 0;
              `}
            >
              <EuiFlexItem
                data-test-subj="workflowExecuteModalTriggerTabs"
                grow={false}
                css={css`
                  padding: 0 ${euiTheme.size.l};
                `}
              >
                <EuiFlexGroup direction="row" gutterSize="s" alignItems="stretch">
                  {ENABLED_TRIGGER_TABS.map((trigger) => {
                    let triggerDisabledTooltip: string | undefined;
                    if (trigger === 'alert' && !hasAlertRacAccess) {
                      triggerDisabledTooltip = alertTabDisabledTooltip;
                    } else if (trigger === 'historical' && !canReadWorkflowExecution) {
                      triggerDisabledTooltip = historicalTabDisabledTooltip;
                    } else if (trigger === 'event') {
                      if (!canReadWorkflowExecution) {
                        triggerDisabledTooltip = eventTabExecutionReadDisabledTooltip;
                      } else if (!eventDrivenExecutionEnabled) {
                        triggerDisabledTooltip = eventTabEventDrivenDisabledTooltip;
                      }
                    }
                    const isTriggerTabDisabled = triggerDisabledTooltip !== undefined;
                    const triggerButton = (
                      <EuiButton
                        color={selectedTrigger === trigger ? 'primary' : 'text'}
                        onClick={() => handleChangeTrigger(trigger)}
                        isDisabled={isTriggerTabDisabled}
                        iconSide="right"
                        data-test-subj={`workflowExecuteModalTrigger-${trigger}`}
                        contentProps={{
                          style: {
                            justifyContent: 'flex-start',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            textAlign: 'left',
                          },
                        }}
                        css={css`
                          width: 100%;
                          flex: 1;
                          min-height: 0;
                          align-self: stretch;
                          padding: ${euiTheme.size.m};
                        `}
                      >
                        <EuiRadio
                          name={TRIGGER_TABS_LABELS[trigger]}
                          label={TRIGGER_TABS_LABELS[trigger]}
                          id={trigger}
                          checked={selectedTrigger === trigger}
                          disabled={isTriggerTabDisabled}
                          onChange={() => {}}
                          css={{ fontWeight: euiTheme.font.weight.bold }}
                        />
                        <EuiText
                          size="s"
                          css={css`
                            text-wrap: auto;
                            margin-left: ${euiTheme.size.l};
                          `}
                        >
                          {TRIGGER_TABS_DESCRIPTIONS[trigger]}
                        </EuiText>
                      </EuiButton>
                    );

                    return (
                      <EuiFlexItem
                        key={trigger}
                        grow={true}
                        css={css`
                          display: flex;
                          flex-direction: column;
                          min-width: 0;
                        `}
                      >
                        {triggerDisabledTooltip ? (
                          <div
                            css={css`
                              flex: 1;
                              min-height: 0;
                              width: 100%;
                              display: flex;
                              flex-direction: column;
                            `}
                          >
                            <EuiToolTip
                              content={triggerDisabledTooltip}
                              position="top"
                              display="block"
                              anchorProps={{
                                style: {
                                  flex: 1,
                                  minHeight: 0,
                                  width: '100%',
                                  display: 'flex',
                                  flexDirection: 'column',
                                },
                              }}
                            >
                              <span
                                tabIndex={0}
                                css={css`
                                  display: flex;
                                  flex-direction: column;
                                  flex: 1;
                                  min-height: 0;
                                  width: 100%;
                                `}
                              >
                                {triggerButton}
                              </span>
                            </EuiToolTip>
                          </div>
                        ) : (
                          triggerButton
                        )}
                      </EuiFlexItem>
                    );
                  })}
                </EuiFlexGroup>
              </EuiFlexItem>

              <EuiFlexItem
                data-test-subj="workflowExecuteModalBodyContent"
                grow={isFillHeightTriggerBody}
                css={css`
                  ${isFillHeightTriggerBody
                    ? css`
                        flex: 1;
                        min-height: 0;
                        overflow: hidden;
                      `
                    : css`
                        flex: 0 1 auto;
                        overflow: visible;
                      `}
                  display: flex;
                  flex-direction: column;
                  background-color: ${euiTheme.colors.backgroundBaseSubdued};
                  padding: ${euiTheme.size.m} ${euiTheme.size.l}
                    ${selectedTrigger === 'event' ? 0 : euiTheme.size.m};
                `}
              >
                {selectedTrigger === 'alert' && (
                  <WorkflowExecuteAlertForm
                    value={executionInput}
                    setValue={handleInputChange}
                    errors={executionInputErrors}
                    setErrors={setExecutionInputErrors}
                    racQueriesEnabled={hasAlertRacAccess}
                  />
                )}
                {selectedTrigger === 'manual' && (
                  <WorkflowExecuteManualForm
                    value={executionInput}
                    inputs={normalizedInputs}
                    errors={executionInputErrors}
                    setErrors={setExecutionInputErrors}
                    setValue={handleInputChange}
                  />
                )}
                {selectedTrigger === 'index' && (
                  <WorkflowExecuteIndexForm
                    setValue={handleInputChange}
                    errors={executionInputErrors}
                    setErrors={setExecutionInputErrors}
                  />
                )}
                {selectedTrigger === 'event' && (
                  <WorkflowExecuteEventForm
                    definition={definition}
                    value={executionInput}
                    setValue={handleInputChange}
                    errors={executionInputErrors}
                    setErrors={setExecutionInputErrors}
                    onTriggerEventTableSelectionCountChange={
                      handleEventTriggerTableSelectionCountChange
                    }
                  />
                )}
                {selectedTrigger === 'historical' && (
                  <WorkflowExecuteHistoricalForm
                    workflowId={workflowId}
                    inputs={normalizedInputs}
                    initialExecutionId={initialExecutionId}
                    value={executionInput}
                    setValue={handleInputChange}
                    errors={executionInputErrors}
                    setErrors={setExecutionInputErrors}
                  />
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiModalBody>
          <EuiModalFooter>
            {!canExecuteWorkflow ? (
              <EuiToolTip content={runExecuteForbiddenTooltip} position="top" display="block">
                <span
                  tabIndex={0}
                  css={css`
                    display: inline-block;
                  `}
                >
                  {renderRunWorkflowButton()}
                </span>
              </EuiToolTip>
            ) : (
              renderRunWorkflowButton()
            )}
          </EuiModalFooter>
        </EuiModal>
      </>
    );
  }
);
WorkflowExecuteModal.displayName = 'WorkflowExecuteModal';
