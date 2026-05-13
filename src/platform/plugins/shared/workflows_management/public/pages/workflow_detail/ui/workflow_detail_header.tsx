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

/**
 * Custom "background task / scheduled run" glyph for the Executions toggle.
 * Source: Figma node 10735:23836 — a play triangle inside a dashed circle.
 * `currentColor` lets the EUI button's `color` prop drive the fill.
 */
const ExecutionsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 15 15"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
    {...props}
  >
    <g fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.1562 8.01367C10.1997 8.02059 10.2428 8.03031 10.2852 8.04297C10.37 8.06831 10.4522 8.10512 10.5293 8.15332L14.5293 10.6533C14.8215 10.8361 14.999 11.1563 14.999 11.501C14.999 11.7163 14.9299 11.9221 14.8066 12.0908C14.784 12.1218 14.7577 12.1504 14.7314 12.1787C14.6721 12.2429 14.6053 12.3011 14.5293 12.3486L10.5293 14.8486C10.2212 15.0412 9.83252 15.0519 9.51465 14.876C9.1967 14.6997 8.99902 14.3645 8.99902 14.001V9.00098L9.00781 8.86621C9.03704 8.65105 9.1364 8.45285 9.28711 8.2998C9.32642 8.25992 9.36901 8.22261 9.41504 8.18945L9.51465 8.12598C9.71319 8.01607 9.93934 7.97909 10.1562 8.01367ZM9.99902 14.001L13.999 11.501L12.877 10.7988L12.0283 10.2695L9.99902 9.00098V14.001Z"
      />
      <path d="M5.44824 12.7949C5.95055 12.9298 6.47206 12.9996 6.99902 13V14C6.38326 13.9996 5.7744 13.9181 5.18848 13.7607L5.44824 12.7949Z" />
      <path d="M2.75684 11.2432C3.13002 11.616 3.54895 11.9353 4 12.1953L3.5 13.0615C2.9741 12.7583 2.48566 12.3857 2.0498 11.9502L2.75684 11.2432Z" />
      <path d="M1.2041 8.55078C1.27131 8.80041 1.35528 9.04923 1.45703 9.29492C1.55881 9.54063 1.67569 9.77594 1.80469 10L1.37109 10.249L0.938477 10.499C0.787961 10.2376 0.651574 9.96349 0.533203 9.67773C0.41487 9.39202 0.316701 9.10179 0.238281 8.81055L0.720703 8.68164L1.2041 8.55078Z" />
      <path d="M7 0C10.8656 0.000263847 13.9997 3.13439 14 7C14 7.68288 13.8991 8.34208 13.7158 8.96582L12.8291 8.41113C12.9389 7.95842 13 7.48631 13 7C12.9997 3.68668 10.3133 1.00026 7 1V0Z" />
      <path d="M1.80371 3.99805C1.54804 4.44158 1.34428 4.92614 1.20508 5.44531C1.06589 5.96478 0.99939 6.48683 0.999023 6.99902L0 7C0.000369666 6.40121 0.0772484 5.79115 0.239258 5.18652C0.401226 4.58238 0.638672 4.01644 0.9375 3.49805L1.80371 3.99805Z" />
      <path d="M5.44824 1.20215C4.43248 1.47536 3.50139 2.01286 2.75684 2.75586L2.4043 2.40137L2.05078 2.04785C2.91907 1.18141 4.00393 0.554953 5.18848 0.236328L5.44824 1.20215Z" />
    </g>
  </svg>
);

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
                      iconType={ExecutionsIcon}
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
