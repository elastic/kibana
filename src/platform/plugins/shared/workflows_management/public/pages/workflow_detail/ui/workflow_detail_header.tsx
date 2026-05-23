/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiButtonGroupOptionProps, UseEuiTheme } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeaderSection,
  EuiPageTemplate,
  EuiSkeletonLoading,
  EuiSkeletonRectangle,
  EuiSkeletonTitle,
  EuiSwitch,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { selectUnit } from '@formatjs/intl-utils';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { AppHeader as PageHeader } from '@kbn/app-header';
import type { AppHeaderBadge } from '@kbn/app-header';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useWorkflowsCapabilities } from '@kbn/workflows-ui';
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
import {
  useWorkflowUrlState,
  type WorkflowUrlStateTabType,
} from '../../../hooks/use_workflow_url_state';
import { getSaveWorkflowTooltipContent, getTestRunTooltipContent } from '../../../shared/ui';
import { WorkflowUnsavedChangesBadge } from '../../../widgets/workflow_yaml_editor/ui/workflow_unsaved_changes_badge';

const executionsTabReadExecutionDisabledTooltip = i18n.translate(
  'workflows.workflowDetailHeader.executionsTabReadExecutionDisabledTooltip',
  {
    defaultMessage:
      'You need the Workflows "Read Workflow Execution" privilege to view workflow executions.',
  }
);

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
  backLink: i18n.translate('workflows.workflowDetailHeader.backLink', {
    defaultMessage: 'Back to Workflows',
  }),
};

const ButtonGroupOptions: EuiButtonGroupOptionProps[] = [
  {
    id: 'workflow',
    label: i18n.translate('workflows.workflowDetailHeader.workflow', {
      defaultMessage: 'Workflow',
    }),
    iconType: 'grid',
  },
  {
    id: 'executions',
    label: i18n.translate('workflows.workflowDetailHeader.executions', {
      defaultMessage: 'Executions',
    }),
    iconType: 'play',
  },
];

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
    const styles = useMemoCss(componentStyles);
    const dispatch = useDispatch();
    const { canCreateWorkflow, canUpdateWorkflow, canExecuteWorkflow, canReadWorkflowExecution } =
      useWorkflowsCapabilities();

    const workflowDetailTabButtonOptions = useMemo(
      () =>
        ButtonGroupOptions.map((option) =>
          option.id === 'executions' && !canReadWorkflowExecution
            ? {
                ...option,
                isDisabled: true,
                title: '',
                toolTipContent: executionsTabReadExecutionDisabledTooltip,
              }
            : option
        ),
      [canReadWorkflowExecution]
    );

    const { activeTab, setActiveTab } = useWorkflowUrlState();

    const workflow = useSelector(selectWorkflow);
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
    const handleToggleWorkflow = useCallback(() => {
      updateWorkflow({ workflow: { enabled: !isEnabled } });
    }, [updateWorkflow, isEnabled]);

    const openTestModal = useCallback(() => {
      dispatch(setIsTestModalOpen(true));
    }, [dispatch]);

    const [showRunConfirmation, setShowRunConfirmation] = useState(false);

    // Combined validity: syntax must parse AND no strict validation errors AND server considers it valid.
    // workflow?.valid !== false covers the initial page load before Monaco validates.
    const isSchemaValid =
      isSyntaxValid && !hasYamlSchemaValidationErrors && workflow?.valid !== false;

    const runWorkflowTooltipContent = useMemo(() => {
      return getTestRunTooltipContent({
        isExecutionsTab,
        isValid: isSyntaxValid,
        canRunWorkflow: canExecuteWorkflow,
      });
    }, [isSyntaxValid, canExecuteWorkflow, isExecutionsTab]);

    const saveWorkflowTooltipContent = useMemo(() => {
      const isCreate = !workflowId;
      return getSaveWorkflowTooltipContent({
        isExecutionsTab,
        canSaveWorkflow: isCreate ? canCreateWorkflow : canUpdateWorkflow,
        isCreate,
      });
    }, [isExecutionsTab, workflowId, canCreateWorkflow, canUpdateWorkflow]);

    const canSaveWorkflow = useMemo(() => {
      return workflowId ? canUpdateWorkflow : canCreateWorkflow;
    }, [canUpdateWorkflow, canCreateWorkflow, workflowId]);

    const handleRunClickWithUnsavedCheck = useCallback(() => {
      if (hasUnsavedChanges) {
        setShowRunConfirmation(true);
      } else {
        openTestModal();
      }
    }, [hasUnsavedChanges, openTestModal]);

    const handleConfirmRun = useCallback(() => {
      setShowRunConfirmation(false);
      openTestModal();
    }, [openTestModal]);

    const handleCancelRun = useCallback(() => {
      setShowRunConfirmation(false);
    }, []);

    const navigateToIntegrations = useCallback(() => {
      application.navigateToApp('integrations', { path: '/browse' });
    }, [application]);

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

    const badges = useMemo<AppHeaderBadge[]>(() => {
      if (hasUnsavedChanges) {
        return [
          {
            label: i18n.translate('workflows.unsavedChangesBadge', {
              defaultMessage: 'Unsaved changes',
            }),
            color: 'primary',
            'data-test-subj': 'workflowUnsavedChangesBadge',
          },
        ];
      }
      if (workflowId && savedLabel) {
        return [
          {
            label: savedLabel,
            color: 'primary',
            'data-test-subj': 'workflowSavedChangesBadge',
          },
        ];
      }
      return [];
    }, [hasUnsavedChanges, workflowId, savedLabel]);

    const appMenu = useMemo<AppMenuConfig>(
      () => ({
        primaryActionItem: {
          id: 'saveWorkflow',
          label: i18n.translate('keepWorkflows.buttonText', {
            defaultMessage: 'Save',
          }),
          iconType: 'save',
          run: handleSaveWorkflow,
          disableButton:
            isExecutionsTab || !canSaveWorkflow || isLoading || isSaving || !isYamlSynced,
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
              'data-test-subj': 'workflowEnabledSwitch',
            }
          : undefined,
        items: [
          ...(workflowId
            ? [
                {
                  id: 'executions',
                  order: 1,
                  label: i18n.translate('workflows.workflowDetailHeader.executions', {
                    defaultMessage: 'Executions',
                  }),
                  iconType: 'videoPlayer' as const,
                  run: () => setActiveTab('executions' as WorkflowUrlStateTabType),
                  disableButton: !canReadWorkflowExecution,
                  tooltipContent: !canReadWorkflowExecution
                    ? executionsTabReadExecutionDisabledTooltip
                    : undefined,
                  testId: 'executionsTabButton',
                },
              ]
            : []),
          {
            id: 'runWorkflow',
            order: 2,
            label: Translations.runWorkflow,
            iconType: 'play' as const,
            overflow: true,
            run: handleRunClickWithUnsavedCheck,
            disableButton: isExecutionsTab || !canExecuteWorkflow || isLoading || !isSyntaxValid,
            tooltipContent: runWorkflowTooltipContent ?? undefined,
            testId: 'runWorkflowHeaderButton',
          },
        ],
      }),
      [
        handleSaveWorkflow,
        isExecutionsTab,
        canSaveWorkflow,
        isLoading,
        isSaving,
        isYamlSynced,
        saveWorkflowTooltipContent,
        workflowId,
        isEnabled,
        updateWorkflow,
        canUpdateWorkflow,
        isSchemaValid,
        hasUnsavedChanges,
        canReadWorkflowExecution,
        setActiveTab,
        handleRunClickWithUnsavedCheck,
        canExecuteWorkflow,
        isSyntaxValid,
        runWorkflowTooltipContent,
      ]
    );

    return (
      <>
        <EuiPageTemplate offset={0} minHeight={0} grow={false} css={styles.pageTemplate}>
          <PageHeader
            title={name}
            back={{
              href: `/app/${PLUGIN_ID}`,
              label: i18n.translate('workflows.workflowDetailHeader.backLink', {
                defaultMessage: 'Back to Workflows',
              }),
            }}
            badges={badges}
            menu={appMenu}
            docLink={WORKFLOWS_DOCUMENTATION_URL}
            integrationsHandler={navigateToIntegrations}
            fallback={{
              pageTitle: null,
              css: styles.header,
              restrictWidth: false,
              bottomBorder: false,
              paddingSize: 'm' as const,
              alignItems: 'bottom' as const,
              children: (
                <>
                  <EuiPageHeaderSection
                    css={styles.headerSection}
                    data-test-subj="workflowDetailHeader"
                  >
                    <EuiButtonEmpty
                      iconType="sortLeft"
                      size="xs"
                      flush="left"
                      onClick={() => {
                        application.navigateToApp(PLUGIN_ID);
                      }}
                      aria-label={Translations.backLink}
                    >
                      {Translations.backLink}
                    </EuiButtonEmpty>
                    <EuiFlexGroup
                      alignItems="center"
                      responsive={false}
                      gutterSize="m"
                      css={styles.titleGroup}
                    >
                      <EuiFlexItem grow={false} css={styles.titleItem}>
                        <EuiSkeletonTitle
                          size="m"
                          isLoading={isLoading}
                          contentAriaLabel={name}
                          css={styles.skeletonTitle}
                        >
                          <EuiTitle size="m" css={styles.title}>
                            <h2>{name}</h2>
                          </EuiTitle>
                        </EuiSkeletonTitle>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiSkeletonLoading
                          isLoading={isLoading}
                          loadingContent={<EuiSkeletonRectangle width="80px" height="20px" />}
                          loadedContent={
                            <WorkflowUnsavedChangesBadge
                              hasChanges={hasUnsavedChanges}
                              highlightDiff={highlightDiff}
                              setHighlightDiff={setHighlightDiff}
                              lastUpdatedAt={lastUpdatedAt}
                            />
                          }
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPageHeaderSection>
                  {workflowId && (
                    <EuiPageHeaderSection
                      css={{
                        flexBasis: '15%',
                      }}
                    >
                      <EuiFlexGroup justifyContent="center">
                        <EuiFlexItem grow={false}>
                          <EuiButtonGroup
                            buttonSize="compressed"
                            color="primary"
                            options={workflowDetailTabButtonOptions}
                            idSelected={activeTab}
                            legend="Switch between workflow and executions"
                            type="single"
                            hasAriaDisabled={!canReadWorkflowExecution}
                            onChange={(id) => setActiveTab(id as WorkflowUrlStateTabType)}
                          />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiPageHeaderSection>
                  )}
                  <EuiPageHeaderSection
                    css={{
                      flexBasis: '40%',
                    }}
                  >
                    <EuiFlexGroup justifyContent="flexEnd" alignItems="center" gutterSize="m">
                      <EuiToolTip
                        content={
                          hasUnsavedChanges
                            ? i18n.translate('workflows.workflowDetailHeader.unsaved', {
                                defaultMessage: 'Save changes to enable/disable workflow',
                              })
                            : !isSchemaValid
                            ? i18n.translate('workflows.workflowDetailHeader.invalid', {
                                defaultMessage: 'Fix validation errors to enable workflow',
                              })
                            : undefined
                        }
                      >
                        <EuiSwitch
                          disabled={
                            !workflowId ||
                            isLoading ||
                            !canUpdateWorkflow ||
                            !isSchemaValid ||
                            hasUnsavedChanges
                          }
                          checked={isEnabled}
                          onChange={handleToggleWorkflow}
                          label={i18n.translate('workflows.workflowDetailHeader.enabled', {
                            defaultMessage: 'Enabled',
                          })}
                        />
                      </EuiToolTip>
                      <EuiFlexItem grow={false} css={styles.separator} />
                      <EuiToolTip content={runWorkflowTooltipContent}>
                        <EuiButtonIcon
                          color="success"
                          display="base"
                          iconType="play"
                          size="s"
                          onClick={handleRunClickWithUnsavedCheck}
                          disabled={
                            isExecutionsTab || !canExecuteWorkflow || isLoading || !isSyntaxValid
                          }
                          aria-label={Translations.runWorkflow}
                          data-test-subj="runWorkflowHeaderButton"
                        />
                      </EuiToolTip>
                      <EuiToolTip content={saveWorkflowTooltipContent}>
                        <EuiButton
                          fill
                          color="primary"
                          size="s"
                          onClick={handleSaveWorkflow}
                          disabled={
                            isExecutionsTab ||
                            !canSaveWorkflow ||
                            isLoading ||
                            isSaving ||
                            !isYamlSynced
                          }
                          isLoading={isSaving}
                          data-test-subj="saveWorkflowHeaderButton"
                        >
                          <FormattedMessage
                            id="keepWorkflows.buttonText"
                            defaultMessage="Save"
                            ignoreTag
                          />
                        </EuiButton>
                      </EuiToolTip>
                    </EuiFlexGroup>
                  </EuiPageHeaderSection>
                </>
              ),
            }}
          />
        </EuiPageTemplate>
        {showRunConfirmation && (
          <EuiConfirmModal
            data-test-subj="runWorkflowWithUnsavedChangesConfirmationModal"
            title={Translations.runWithUnsavedChangesQuestion}
            onCancel={handleCancelRun}
            onConfirm={handleConfirmRun}
            cancelButtonText={Translations.runWorkflowCancel}
            confirmButtonText={Translations.runWorkflow}
            buttonColor="success"
            defaultFocusedButton="confirm"
            aria-label={Translations.runWithUnsavedChangesQuestion}
          >
            <p>
              <FormattedMessage
                id="workflows.workflowDetailHeader.runWithUnsavedChanges.message"
                defaultMessage="You have unsaved changes. Running the workflow will not save your changes. Are you sure you want to continue?"
              />
            </p>
          </EuiConfirmModal>
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
  header: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      overflow: 'hidden',
      borderBottom: `1px solid ${euiTheme.colors.borderBasePlain}`,
      '@media (max-width: 1024px)': {
        flexDirection: 'column',
      },
      '& > div > div': {
        gap: '24px', // increase gap between title+badge and the "workflow/executions" toggle
      },
    }),
  headerSection: css({
    flexBasis: '40%',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    width: '100%',
  }),
  separator: ({ euiTheme }: UseEuiTheme) =>
    css({
      width: '1px',
      margin: '4px 0',
      backgroundColor: euiTheme.colors.borderBasePlain,
      alignSelf: 'stretch',
    }),
  skeletonTitle: css({
    minWidth: '250px',
    width: '100%',
    display: 'inline-block',
  }),
  title: css({
    width: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'inline-block',
  }),
  titleGroup: css({
    overflow: 'hidden',
  }),
  titleItem: css({
    minWidth: 0,
    overflow: 'hidden',
  }),
};
