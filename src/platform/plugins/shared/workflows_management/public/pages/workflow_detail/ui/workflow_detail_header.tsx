/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
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
import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { PLUGIN_ID } from '../../../../common';
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
import { useKibana } from '../../../hooks/use_kibana';
import {
  useWorkflowUrlState,
  type WorkflowUrlStateTabType,
} from '../../../hooks/use_workflow_url_state';
import { getSaveWorkflowTooltipContent } from '../../../shared/ui';
import { WorkflowUnsavedChangesBadge } from '../../../widgets/workflow_yaml_editor/ui/workflow_unsaved_changes_badge';

const executionsTabReadExecutionDisabledTooltip = i18n.translate(
  'workflows.workflowDetailHeader.executionsTabReadExecutionDisabledTooltip',
  {
    defaultMessage:
      'You need the Workflows "Read Workflow Execution" privilege to view workflow executions.',
  }
);

const Translations = {
  backLink: i18n.translate('workflows.workflowDetailHeader.backLink', {
    defaultMessage: 'Back to Workflows',
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
    const styles = useMemoCss(componentStyles);
    const { canCreateWorkflow, canUpdateWorkflow, canReadWorkflowExecution } =
      useWorkflowsCapabilities();

    const { setActiveTab } = useWorkflowUrlState();

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

    // Combined validity: syntax must parse AND no strict validation errors AND server considers it valid.
    // workflow?.valid !== false covers the initial page load before Monaco validates.
    const isSchemaValid =
      isSyntaxValid && !hasYamlSchemaValidationErrors && workflow?.valid !== false;

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

    return (
      <>
        <EuiPageTemplate offset={0} minHeight={0} grow={false} css={styles.pageTemplate}>
          <EuiPageTemplate.Header
            css={styles.header}
            restrictWidth={false}
            bottomBorder={false}
            paddingSize="m"
            alignItems="bottom"
          >
            <EuiPageHeaderSection css={styles.headerSection} data-test-subj="workflowDetailHeader">
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
                {workflowId && (
                  <EuiToolTip
                    content={
                      !canReadWorkflowExecution
                        ? executionsTabReadExecutionDisabledTooltip
                        : undefined
                    }
                  >
                    <EuiButtonEmpty
                      size="s"
                      iconType="play"
                      color="primary"
                      isDisabled={!canReadWorkflowExecution}
                      onClick={() =>
                        setActiveTab(
                          (isExecutionsTab ? 'workflow' : 'executions') as WorkflowUrlStateTabType
                        )
                      }
                      data-test-subj="workflowExecutionsToggleButton"
                    >
                      <FormattedMessage
                        id="workflows.workflowDetailHeader.executionsButton"
                        defaultMessage="Executions"
                      />
                    </EuiButtonEmpty>
                  </EuiToolTip>
                )}
                <EuiFlexItem grow={false} css={styles.separator} />
                <EuiToolTip content={saveWorkflowTooltipContent}>
                  <EuiButton
                    fill
                    color="primary"
                    size="s"
                    onClick={handleSaveWorkflow}
                    disabled={
                      isExecutionsTab || !canSaveWorkflow || isLoading || isSaving || !isYamlSynced
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
          </EuiPageTemplate.Header>
        </EuiPageTemplate>
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
