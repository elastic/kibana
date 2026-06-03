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
  EuiScreenReaderOnly,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css, Global } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFetchAlertsIndexNamesQuery } from '@kbn/alerts-ui-shared';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { WorkflowYaml } from '@kbn/workflows';
import { extractNormalizedInputsFromYaml } from '@kbn/workflows/spec/lib/field_conversion';
import { useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { TRIGGER_TABS_DESCRIPTIONS, TRIGGER_TABS_LABELS } from './translations';
import type { WorkflowTriggerTab } from './types';
import { WorkflowExecuteAlertForm } from './workflow_execute_alert_form';
import { WorkflowExecuteEventForm } from './workflow_execute_event_form';
import { WorkflowExecuteHistoricalForm } from './workflow_execute_historical_form';
import { WorkflowExecuteIndexForm } from './workflow_execute_index_form';
import { WorkflowExecuteManualForm } from './workflow_execute_manual_form';
import { getWorkflowExecuteModalGlobalStyles } from './workflow_execute_modal_global_styles';
import {
  ensureSelectedTriggerTabVisible,
  getFallbackTriggerTab,
  getVisibleWorkflowTriggerTabs,
  hasCustomEventTrigger,
  hasWorkflowInputFields,
  isRacAlertsApiForbiddenError,
  isWorkflowTriggerTabDisabled,
  resolveInitialSelectedTrigger,
  type WorkflowTriggerTabAvailability,
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
    const runExecuteForbiddenTooltipDescriptionId = useGeneratedHtmlId({
      prefix: 'workflowExecuteModalRunForbidden',
    });
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

    const visibleTriggerTabs = useMemo(
      () => getVisibleWorkflowTriggerTabs(definition),
      [definition]
    );

    const triggerTabAvailability = useMemo<WorkflowTriggerTabAvailability>(
      () => ({
        hasAlertRacAccess,
        canReadWorkflowExecution,
        eventDrivenExecutionEnabled,
      }),
      [hasAlertRacAccess, canReadWorkflowExecution, eventDrivenExecutionEnabled]
    );

    const [selectedTrigger, setSelectedTrigger] = useState<WorkflowTriggerTab>(() =>
      resolveInitialSelectedTrigger(
        definition,
        initialExecutionId,
        hasAlertRacAccess,
        canReadWorkflowExecution,
        normalizedInputs,
        eventDrivenExecutionEnabled
      )
    );

    const [executionInput, setExecutionInput] = useState<string>('');
    const [executionInputErrors, setExecutionInputErrors] = useState<string | null>(null);
    const [eventTriggerTableSelectionCount, setEventTriggerTableSelectionCount] = useState(0);
    const [isEventGridFullScreen, setIsEventGridFullScreen] = useState(false);

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
        if (isWorkflowTriggerTabDisabled(trigger, triggerTabAvailability)) {
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
      [triggerTabAvailability, selectedTrigger]
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

    const autoRunFiredRef = useRef(false);

    useEffect(() => {
      if (!shouldAutoRun || autoRunFiredRef.current) {
        return;
      }
      autoRunFiredRef.current = true;
      onSubmit({}, 'manual');
      onClose();
    }, [shouldAutoRun, onSubmit, onClose]);

    useEffect(() => {
      if (selectedTrigger !== 'event' && isEventGridFullScreen) {
        setIsEventGridFullScreen(false);
      }
    }, [selectedTrigger, isEventGridFullScreen]);

    useEffect(() => {
      setSelectedTrigger((current) => {
        let next = current;
        if (current === 'alert' && !hasAlertRacAccess) {
          next = getFallbackTriggerTab(normalizedInputs, definition, canReadWorkflowExecution);
        } else if (current === 'historical' && !canReadWorkflowExecution) {
          next = getFallbackTriggerTab(normalizedInputs, definition, canReadWorkflowExecution);
        } else if (
          current === 'event' &&
          (!canReadWorkflowExecution || !eventDrivenExecutionEnabled)
        ) {
          next = getFallbackTriggerTab(normalizedInputs, definition, canReadWorkflowExecution);
        }
        return ensureSelectedTriggerTabVisible(next, visibleTriggerTabs, triggerTabAvailability);
      });
    }, [
      triggerTabAvailability,
      normalizedInputs,
      definition,
      visibleTriggerTabs,
      hasAlertRacAccess,
      canReadWorkflowExecution,
      eventDrivenExecutionEnabled,
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
      selectedTrigger === 'alert' ||
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
        <Global styles={getWorkflowExecuteModalGlobalStyles(euiTheme)} />
        <EuiModal
          className={
            isEventGridFullScreen
              ? 'workflowExecuteModal workflowExecuteModal--eventGridFullScreen'
              : 'workflowExecuteModal'
          }
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

              & .kbnQueryBar__textareaWrapOuter {
                overflow: visible;
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
              {!isEventGridFullScreen ? (
                <EuiFlexItem
                  data-test-subj="workflowExecuteModalTriggerTabs"
                  grow={false}
                  css={css`
                    padding: 0 ${euiTheme.size.l};
                  `}
                >
                  <EuiFlexGroup direction="row" gutterSize="s" alignItems="stretch">
                    {visibleTriggerTabs.map((trigger) => {
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
                      const isTriggerTabDisabled = isWorkflowTriggerTabDisabled(
                        trigger,
                        triggerTabAvailability
                      );
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
              ) : null}

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
                    onEventGridFullScreenChange={setIsEventGridFullScreen}
                    onOpenManualTab={() => handleChangeTrigger('manual')}
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
              <>
                <EuiScreenReaderOnly>
                  <span id={runExecuteForbiddenTooltipDescriptionId}>
                    {runExecuteForbiddenTooltip}
                  </span>
                </EuiScreenReaderOnly>
                <EuiToolTip content={runExecuteForbiddenTooltip} position="top" display="block">
                  <span
                    tabIndex={0}
                    aria-disabled={true}
                    aria-describedby={runExecuteForbiddenTooltipDescriptionId}
                    css={css`
                      display: inline-block;
                    `}
                  >
                    {renderRunWorkflowButton()}
                  </span>
                </EuiToolTip>
              </>
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
