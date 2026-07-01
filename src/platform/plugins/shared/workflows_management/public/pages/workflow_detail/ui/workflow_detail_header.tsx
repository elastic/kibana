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
  EuiButtonEmpty,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPageTemplate,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { selectUnit } from '@formatjs/intl-utils';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useParams } from 'react-router-dom';
import type { AppHeaderBadge } from '@kbn/app-header';
import { AppHeader } from '@kbn/app-header';
import type { AppMenuConfig, AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { WorkflowDetailActionsMenu } from './workflow_detail_actions_menu';
import { PLUGIN_ID, WORKFLOWS_DOCUMENTATION_URL } from '../../../../common';
import { useSaveYaml } from '../../../entities/workflows/model/use_save_yaml';
import { useUpdateWorkflow } from '../../../entities/workflows/model/use_update_workflow';
import {
  selectHasChanges,
  selectHasYamlSchemaValidationErrors,
  selectIsExecutionsTab,
  selectIsSavingYaml,
  selectIsYamlSynced,
  selectIsYamlSyntaxValid,
  selectWorkflow,
} from '../../../entities/workflows/store/workflow_detail/selectors';
import { setIsTestModalOpen } from '../../../entities/workflows/store/workflow_detail/slice';
import { useKibana } from '../../../hooks/use_kibana';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';
import { getSaveWorkflowTooltipContent, getTestRunTooltipContent } from '../../../shared/ui';
import {
  navigateToWorkflowsList,
  type WorkflowDetailRouteState,
} from '../../../shared/utils/workflow_navigation';

const executionsTabReadExecutionDisabledTooltip = i18n.translate(
  'workflows.workflowDetailHeader.executionsTabReadExecutionDisabledTooltip',
  {
    defaultMessage:
      'You need the Workflows "Read Workflow Execution" privilege to view workflow executions.',
  }
);

const executionsTabReadManagedExecutionDisabledTooltip = i18n.translate(
  'workflows.workflowDetailHeader.executionsTabReadManagedExecutionDisabledTooltip',
  {
    defaultMessage:
      'You need the Workflows "Read workflow executions" and "Read managed workflow executions" privileges to view managed workflow executions.',
  }
);

export const SkipUnsavedRunConfirmationStorageKey = 'workflows:skipUnsavedRunConfirmation';

const Translations = {
  runWorkflow: i18n.translate('workflows.workflowDetailHeader.runWorkflow', {
    defaultMessage: 'Run',
  }),
  runWithUnsavedChangesQuestion: i18n.translate(
    'workflows.workflowDetailHeader.runWithUnsavedChangesQuestion',
    { defaultMessage: 'Run workflow with unsaved changes?' }
  ),
  runWorkflowCancel: i18n.translate('workflows.workflowDetailHeader.runWorkflowCancel', {
    defaultMessage: 'Cancel',
  }),
  dontAskAgain: i18n.translate('workflows.workflowDetailHeader.dontAskAgain', {
    defaultMessage: "Don't ask again",
  }),
};

export interface WorkflowDetailHeaderProps {
  isLoading: boolean;
  // TODO: manage it in a workflow state context
  highlightDiff: boolean;
  setHighlightDiff: React.Dispatch<React.SetStateAction<boolean>>;
}

export const WorkflowDetailHeader = React.memo(
  ({ isLoading, highlightDiff, setHighlightDiff }: WorkflowDetailHeaderProps) => {
    const { id: workflowId } = useParams<{ id?: string }>();
    const { application } = useKibana().services;
    const location = useLocation<WorkflowDetailRouteState | undefined>();
    const styles = useMemoCss(componentStyles);
    const dispatch = useDispatch();
    const {
      canCreateWorkflow,
      canUpdateWorkflow,
      canExecuteWorkflow,
      canReadWorkflowExecution,
      canReadManagedWorkflowExecution,
    } = useWorkflowsCapabilities();

    const { setActiveTab } = useWorkflowUrlState();

    const workflow = useSelector(selectWorkflow);
    const isManagedWorkflow = workflow?.managed === true;
    const canReadVisibleWorkflowExecution =
      canReadWorkflowExecution && (!isManagedWorkflow || canReadManagedWorkflowExecution);
    const executionsTabDisabledTooltip = isManagedWorkflow
      ? executionsTabReadManagedExecutionDisabledTooltip
      : executionsTabReadExecutionDisabledTooltip;
    const isSyntaxValid = useSelector(selectIsYamlSyntaxValid);
    const hasYamlSchemaValidationErrors = useSelector(selectHasYamlSchemaValidationErrors);
    const hasUnsavedChanges = useSelector(selectHasChanges);
    const isExecutionsTab = useSelector(selectIsExecutionsTab);
    const isYamlSynced = useSelector(selectIsYamlSynced);

    const { name, isEnabled, lastUpdatedAt } = useMemo(
      () => ({
        name: workflow?.name ?? 'New workflow',
        isEnabled: workflow?.enabled ?? false,
        lastUpdatedAt: workflow ? new Date(workflow.lastUpdatedAt) : null,
      }),
      [workflow]
    );

    const saveYaml = useSaveYaml();
    const isSaving = useSelector(selectIsSavingYaml);
    const handleSaveWorkflow = useCallback(() => {
      saveYaml();
    }, [saveYaml]);

    const updateWorkflow = useUpdateWorkflow();

    const openTestModal = useCallback(() => {
      dispatch(setIsTestModalOpen(true));
    }, [dispatch]);

    const [showRunConfirmation, setShowRunConfirmation] = useState(false);
    const [dontAskAgain, setDontAskAgain] = useState(false);
    const [savedLabel, setSavedLabel] = useState<string>('');

    useEffect(() => {
      if (hasUnsavedChanges || !workflowId || !lastUpdatedAt) {
        return;
      }

      const formatter = new Intl.RelativeTimeFormat(i18n.getLocale(), {
        numeric: 'auto',
        style: 'short',
      });

      const updateLabel = () => {
        const { value, unit } = selectUnit(lastUpdatedAt);
        if (unit === 'second') {
          setSavedLabel(
            i18n.translate('workflows.savedJustNow', {
              defaultMessage: 'Saved just now',
            })
          );
        } else {
          setSavedLabel(
            i18n.translate('workflows.savedAgo', {
              defaultMessage: 'Saved {relativeTime}',
              values: { relativeTime: formatter.format(value, unit) },
            })
          );
        }
      };

      updateLabel();
      const interval = setInterval(updateLabel, 30_000);

      return () => clearInterval(interval);
    }, [hasUnsavedChanges, workflowId, lastUpdatedAt]);

    // Combined validity: syntax must parse AND no strict validation errors AND server considers it valid.
    // workflow?.valid !== false covers the initial page load before Monaco validates.
    const isSchemaValid =
      isSyntaxValid && !hasYamlSchemaValidationErrors && workflow?.valid !== false;

    const runWorkflowTooltipContent = useMemo(() => {
      return getTestRunTooltipContent({
        isExecutionsTab,
        isValid: isSyntaxValid,
        canRunWorkflow: canExecuteWorkflow,
        isSaving,
      });
    }, [isSyntaxValid, canExecuteWorkflow, isExecutionsTab, isSaving]);

    const saveWorkflowTooltipContent = useMemo(() => {
      const isCreate = !workflowId;
      return getSaveWorkflowTooltipContent({
        isExecutionsTab,
        canSaveWorkflow: isCreate ? canCreateWorkflow : canUpdateWorkflow,
        isCreate,
        hasUnsavedChanges,
      });
    }, [isExecutionsTab, workflowId, canCreateWorkflow, canUpdateWorkflow, hasUnsavedChanges]);

    const canSaveWorkflow = useMemo(() => {
      return workflowId ? canUpdateWorkflow : canCreateWorkflow;
    }, [canUpdateWorkflow, canCreateWorkflow, workflowId]);

    const enabledSwitchTooltipContent = useMemo(() => {
      if (hasUnsavedChanges) {
        return i18n.translate('workflows.workflowDetailHeader.unsaved', {
          defaultMessage: 'Save changes to enable/disable workflow',
        });
      }
      if (!isSchemaValid) {
        return i18n.translate('workflows.workflowDetailHeader.invalid', {
          defaultMessage: 'Fix validation errors to enable workflow',
        });
      }
      return undefined;
    }, [hasUnsavedChanges, isSchemaValid]);

    const viewToggleItem = useMemo<AppMenuItemType>(
      () =>
        isExecutionsTab
          ? {
              id: 'viewWorkflow',
              order: 1,
              label: i18n.translate('workflows.workflowDetailHeader.workflowButton', {
                defaultMessage: 'Workflow',
              }),
              iconType: 'grid',
              run: () => setActiveTab('workflow'),
              testId: 'workflowDetailWorkflowButton',
            }
          : {
              id: 'viewExecutions',
              order: 1,
              label: i18n.translate('workflows.workflowDetailHeader.executionsButton', {
                defaultMessage: 'Executions',
              }),
              iconType: 'videoPlayer',
              run: () => setActiveTab('executions'),
              disableButton: !canReadVisibleWorkflowExecution,
              tooltipContent: !canReadVisibleWorkflowExecution
                ? executionsTabDisabledTooltip
                : undefined,
              testId: 'workflowDetailExecutionsButton',
            },
      [isExecutionsTab, setActiveTab, canReadVisibleWorkflowExecution, executionsTabDisabledTooltip]
    );

    const handleRunClickWithUnsavedCheck = useCallback(() => {
      const shouldSkipUnsavedRunConfirmation =
        localStorage.getItem(SkipUnsavedRunConfirmationStorageKey) === 'true';
      if (hasUnsavedChanges && !shouldSkipUnsavedRunConfirmation) {
        setDontAskAgain(false);
        setShowRunConfirmation(true);
      } else {
        openTestModal();
      }
    }, [hasUnsavedChanges, openTestModal]);

    const handleConfirmRun = useCallback(() => {
      if (dontAskAgain) {
        localStorage.setItem(SkipUnsavedRunConfirmationStorageKey, 'true');
      }
      setShowRunConfirmation(false);
      openTestModal();
    }, [dontAskAgain, openTestModal]);

    const handleCancelRun = useCallback(() => {
      setDontAskAgain(false);
      setShowRunConfirmation(false);
    }, []);

    const badges = useMemo<AppHeaderBadge[]>(() => {
      const result: AppHeaderBadge[] = [];

      if (isManagedWorkflow) {
        result.push({
          label: i18n.translate('workflows.managedWorkflowBadge.label', {
            defaultMessage: 'Managed',
          }),
          color: 'primary',
          tooltip: i18n.translate('workflows.managedWorkflowBadge.tooltip', {
            defaultMessage: 'Elastic manages this workflow.',
          }),
          'data-test-subj': 'workflowDetailManagedBadge',
        });
      }

      if (hasUnsavedChanges) {
        result.push({
          label: i18n.translate('workflows.unsavedChangesBadge', {
            defaultMessage: 'Unsaved changes',
          }),
          color: 'primary',
          onClick: () => setHighlightDiff((state) => !state),
          onClickAriaLabel: highlightDiff
            ? i18n.translate('workflows.unsavedChangesBadge.hideDiff', {
                defaultMessage: 'Hide diff highlighting',
              })
            : i18n.translate('workflows.unsavedChangesBadge.showDiff', {
                defaultMessage: 'Show diff highlighting',
              }),
          'data-test-subj': 'workflowUnsavedChangesBadge',
        });
      } else if (workflowId && savedLabel) {
        result.push({
          label: savedLabel,
          color: 'primary',
          'data-test-subj': 'workflowSavedChangesBadge',
        });
      }

      return result;
    }, [
      isManagedWorkflow,
      hasUnsavedChanges,
      workflowId,
      savedLabel,
      highlightDiff,
      setHighlightDiff,
    ]);

    const appMenu = useMemo<AppMenuConfig>(() => {
      return {
        primaryActionItem: {
          id: 'saveWorkflow',
          label: i18n.translate('keepWorkflows.buttonText', {
            defaultMessage: 'Save',
          }),
          iconType: 'save',
          run: handleSaveWorkflow,
          disableButton:
            isExecutionsTab ||
            !canSaveWorkflow ||
            isLoading ||
            isSaving ||
            isManagedWorkflow ||
            !isYamlSynced ||
            !hasUnsavedChanges,
          isLoading: isSaving,
          tooltipContent: saveWorkflowTooltipContent ?? undefined,
          testId: 'saveWorkflowHeaderButton',
        },
        switch: workflowId
          ? {
              id: 'enabledSwitch',
              label: i18n.translate('workflows.workflowDetailHeader.enabled', {
                defaultMessage: 'Enabled',
              }),
              labelProps: {},
              checked: isEnabled,
              onChange: (checked: boolean) => {
                updateWorkflow({ workflow: { enabled: checked } });
              },
              disabled:
                !workflowId ||
                isLoading ||
                !canUpdateWorkflow ||
                !isSchemaValid ||
                hasUnsavedChanges,
              tooltipContent: enabledSwitchTooltipContent,
              'data-test-subj': 'workflowEnabledSwitch',
            }
          : undefined,
        items: [
          ...(workflowId ? [viewToggleItem] : []),
          {
            id: 'runWorkflow',
            order: 2,
            overflow: true,
            label: Translations.runWorkflow,
            iconType: 'play',
            run: handleRunClickWithUnsavedCheck,
            disableButton:
              isExecutionsTab || !canExecuteWorkflow || isLoading || isSaving || !isSyntaxValid,
            tooltipContent: runWorkflowTooltipContent ?? undefined,
            testId: 'runWorkflowHeaderButton',
          },
        ],
      };
    }, [
      isExecutionsTab,
      viewToggleItem,
      handleSaveWorkflow,
      canSaveWorkflow,
      isLoading,
      isSaving,
      isManagedWorkflow,
      isYamlSynced,
      saveWorkflowTooltipContent,
      workflowId,
      isEnabled,
      updateWorkflow,
      canUpdateWorkflow,
      isSchemaValid,
      hasUnsavedChanges,
      enabledSwitchTooltipContent,
      handleRunClickWithUnsavedCheck,
      canExecuteWorkflow,
      isSyntaxValid,
      runWorkflowTooltipContent,
    ]);

    return (
      <>
        <EuiPageTemplate offset={0} minHeight={0} grow={false} css={styles.pageTemplate}>
          <AppHeader
            title={name}
            back={{
              href: `/app/${PLUGIN_ID}`,
              label: i18n.translate('workflows.workflowDetailHeader.backLinkLabel', {
                defaultMessage: 'Workflows',
              }),
              onClick: (event) => {
                event.preventDefault();
                void navigateToWorkflowsList(application, location.state);
              },
            }}
            badges={badges}
            menu={appMenu}
            docLink={WORKFLOWS_DOCUMENTATION_URL}
            showAddIntegrations
          />
          {workflowId && !isExecutionsTab ? <WorkflowDetailActionsMenu /> : null}
        </EuiPageTemplate>
        {showRunConfirmation && (
          <EuiModal
            className="euiModal--confirmation"
            data-test-subj="runWorkflowWithUnsavedChangesConfirmationModal"
            onClose={handleCancelRun}
            role="alertdialog"
            initialFocus="[data-test-subj='confirmModalConfirmButton']"
            aria-label={Translations.runWithUnsavedChangesQuestion}
          >
            <EuiModalHeader>
              <EuiModalHeaderTitle data-test-subj="confirmModalTitleText">
                {Translations.runWithUnsavedChangesQuestion}
              </EuiModalHeaderTitle>
            </EuiModalHeader>
            <EuiModalBody>
              <EuiText data-test-subj="confirmModalBodyText">
                <p>
                  <FormattedMessage
                    id="workflows.workflowDetailHeader.runWithUnsavedChanges.message"
                    defaultMessage="You have unsaved changes. Running the workflow will not save your changes. Are you sure you want to continue?"
                  />
                </p>
              </EuiText>
            </EuiModalBody>
            <EuiModalFooter css={styles.runConfirmationFooter}>
              <EuiCheckbox
                id="workflowsRunWithUnsavedChangesDontAskAgain"
                data-test-subj="runWorkflowWithUnsavedChangesDontAskAgain"
                label={Translations.dontAskAgain}
                checked={dontAskAgain}
                onChange={(event) => setDontAskAgain(event.target.checked)}
              />
              <EuiFlexGroup gutterSize="m" justifyContent="flexEnd" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj="confirmModalCancelButton"
                    onClick={handleCancelRun}
                  >
                    {Translations.runWorkflowCancel}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    data-test-subj="confirmModalConfirmButton"
                    onClick={handleConfirmRun}
                    fill
                    color="success"
                  >
                    {Translations.runWorkflow}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiModalFooter>
          </EuiModal>
        )}
      </>
    );
  }
);
WorkflowDetailHeader.displayName = 'WorkflowDetailHeader';

const componentStyles = {
  pageTemplate: css({
    flexGrow: 0,
  }),
  runConfirmationFooter: css({
    alignItems: 'center',
    justifyContent: 'space-between',
  }),
};
