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
  EuiButtonGroup,
  EuiButtonIcon,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeaderSection,
  EuiPageTemplate,
  EuiSkeletonTitle,
  EuiSwitch,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo, useState } from 'react';
import type { WorkflowUrlStateTabType } from '../../../hooks/use_workflow_url_state';
import { getRunWorkflowTooltipContent } from '../../../shared/ui';

export interface WorkflowDetailHeaderProps {
  name: string | undefined;
  yaml?: string;
  isLoading: boolean;
  activeTab: WorkflowUrlStateTabType;
  handleTabChange: (tab: WorkflowUrlStateTabType) => void;
  canRunWorkflow: boolean;
  handleRunClick: () => void;
  canSaveWorkflow: boolean;
  handleSave: () => void;
  isEnabled: boolean;
  handleToggleWorkflow: () => void;
  canTestWorkflow: boolean;
  handleTestClick: () => void;
  isValid: boolean;
  hasUnsavedChanges: boolean;
}

export const WorkflowDetailHeader = ({
  name,
  yaml,
  isLoading,
  activeTab,
  canRunWorkflow,
  handleRunClick,
  handleSave,
  canSaveWorkflow,
  isEnabled,
  handleToggleWorkflow,
  canTestWorkflow,
  handleTestClick,
  handleTabChange,
  isValid,
  hasUnsavedChanges,
}: WorkflowDetailHeaderProps) => {
  const styles = useMemoCss(componentStyles);
  const [showRunConfirmation, setShowRunConfirmation] = useState(false);

  const buttonGroupOptions: EuiButtonGroupOptionProps[] = useMemo(
    () => [
      {
        id: 'workflow',
        label: 'Workflow',
        iconType: 'grid',
        type: 'button',
      },
      {
        id: 'executions',
        label: 'Executions',
        iconType: 'play',
      },
    ],
    []
  );

  const runWorkflowTooltipContent = useMemo(() => {
    return getRunWorkflowTooltipContent(isValid, canRunWorkflow, isEnabled);
  }, [isValid, canRunWorkflow, isEnabled]);

  const handleRunClickWithUnsavedCheck = () => {
    if (hasUnsavedChanges) {
      setShowRunConfirmation(true);
    } else {
      handleRunClick();
    }
  };

  const handleConfirmRun = () => {
    setShowRunConfirmation(false);
    handleRunClick();
  };

  const handleCancelRun = () => {
    setShowRunConfirmation(false);
  };

  return (
    <>
      <EuiPageTemplate offset={0} minHeight={0} grow={false} css={styles.pageTemplate}>
        <EuiPageTemplate.Header css={styles.header} restrictWidth={false} bottomBorder={false}>
          <EuiPageHeaderSection css={styles.headerSection}>
            <EuiSkeletonTitle
              size="l"
              isLoading={isLoading}
              contentAriaLabel={name}
              css={styles.skeletonTitle}
            >
              <EuiTitle size="l" css={styles.title}>
                <span>{name}</span>
              </EuiTitle>
            </EuiSkeletonTitle>
          </EuiPageHeaderSection>
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
                  options={buttonGroupOptions}
                  idSelected={activeTab}
                  legend="Switch between workflow and executions"
                  type="single"
                  onChange={(id) => handleTabChange(id as WorkflowUrlStateTabType)}
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
                    : !isValid
                    ? i18n.translate('workflows.workflowDetailHeader.invalid', {
                        defaultMessage: 'Fix errors to enable workflow',
                      })
                    : undefined
                }
              >
                <EuiSwitch
                  disabled={isLoading || !canSaveWorkflow || !isValid || hasUnsavedChanges}
                  checked={isEnabled}
                  onChange={() => handleToggleWorkflow()}
                  label={i18n.translate('workflows.workflowDetailHeader.enabled', {
                    defaultMessage: 'Enabled',
                  })}
                />
              </EuiToolTip>
              <EuiFlexItem grow={false} css={styles.separator} />
              <EuiToolTip content={runWorkflowTooltipContent}>
                <EuiButtonIcon
                  display="base"
                  iconType="beaker"
                  size="s"
                  disabled={isLoading || !canTestWorkflow || !isValid}
                  onClick={handleTestClick}
                  title={runWorkflowTooltipContent ?? undefined}
                  aria-label={i18n.translate(
                    'workflows.workflowDetailHeader.testWorkflow.ariaLabel',
                    {
                      defaultMessage: 'Test workflow',
                    }
                  )}
                />
              </EuiToolTip>
              <EuiToolTip content={runWorkflowTooltipContent}>
                <EuiButtonIcon
                  color="success"
                  display="base"
                  iconType="play"
                  size="s"
                  onClick={handleRunClickWithUnsavedCheck}
                  disabled={!canRunWorkflow || !isEnabled || isLoading || !isValid}
                  title={runWorkflowTooltipContent ?? undefined}
                  aria-label={i18n.translate(
                    'workflows.workflowDetailHeader.runWorkflow.ariaLabel',
                    {
                      defaultMessage: 'Run workflow',
                    }
                  )}
                />
              </EuiToolTip>
              <EuiButton
                fill
                color="primary"
                size="s"
                onClick={handleSave}
                disabled={!canSaveWorkflow || isLoading}
              >
                <FormattedMessage id="keepWorkflows.buttonText" defaultMessage="Save" ignoreTag />
              </EuiButton>
            </EuiFlexGroup>
          </EuiPageHeaderSection>
        </EuiPageTemplate.Header>
      </EuiPageTemplate>
      {showRunConfirmation && (
        <EuiConfirmModal
          title={i18n.translate('workflows.workflowDetailHeader.runWithUnsavedChanges.title', {
            defaultMessage: 'Run workflow with unsaved changes?',
          })}
          onCancel={handleCancelRun}
          onConfirm={handleConfirmRun}
          cancelButtonText={i18n.translate(
            'workflows.workflowDetailHeader.runWithUnsavedChanges.cancel',
            {
              defaultMessage: 'Cancel',
            }
          )}
          confirmButtonText={i18n.translate(
            'workflows.workflowDetailHeader.runWithUnsavedChanges.confirm',
            {
              defaultMessage: 'Run workflow',
            }
          )}
          buttonColor="success"
          defaultFocusedButton="confirm"
          aria-label={i18n.translate('workflows.workflowDetailHeader.runWithUnsavedChanges.title', {
            defaultMessage: 'Run workflow with unsaved changes?',
          })}
        >
          <p>
            {i18n.translate('workflows.workflowDetailHeader.runWithUnsavedChanges.message', {
              defaultMessage:
                'You have unsaved changes. Running the workflow will not save your changes. Are you sure you want to continue?',
            })}
          </p>
        </EuiConfirmModal>
      )}
    </>
  );
};

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
    minWidth: '200px',
    display: 'inline-block',
  }),
  title: css({
    width: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'inline-block',
  }),
};
