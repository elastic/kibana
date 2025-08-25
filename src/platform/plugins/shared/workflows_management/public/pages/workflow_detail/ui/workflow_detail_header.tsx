/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiButtonGroupOptionProps } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeaderSection,
  EuiPageTemplate,
  EuiSkeletonTitle,
  EuiSwitch,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { WorkflowUrlStateTabType } from '../../../hooks/use_workflow_url_state';

interface WorkflowDetailHeaderProps {
  name: string | undefined;
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
}

export const WorkflowDetailHeader = ({
  name,
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
}: WorkflowDetailHeaderProps) => {
  const { euiTheme } = useEuiTheme();

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

  return (
    <EuiPageTemplate offset={0} minHeight={0} grow={false} css={{ flexGrow: 0 }}>
      <EuiPageTemplate.Header
        css={{
          backgroundColor: euiTheme.colors.backgroundBasePlain,
          overflow: 'hidden',
          borderBottom: `1px solid ${euiTheme.colors.borderBasePlain}`,
          '@media (max-width: 1024px)': {
            flexDirection: 'column',
          },
        }}
        restrictWidth={false}
        bottomBorder={false}
      >
        <EuiPageHeaderSection
          css={{
            flexBasis: '40%',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            width: '100%',
          }}
        >
          <EuiSkeletonTitle
            size="l"
            isLoading={isLoading}
            contentAriaLabel={name}
            css={{
              minWidth: '200px',
              display: 'inline-block',
            }}
          >
            <EuiTitle
              size="l"
              css={{
                width: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'inline-block',
              }}
            >
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
            <div css={{ height: '100%', display: 'flex', alignItems: 'center' }}>
              <EuiSwitch
                disabled={!canSaveWorkflow || isLoading}
                checked={isEnabled}
                onChange={() => handleToggleWorkflow()}
                label={
                  isEnabled
                    ? i18n.translate('workflows.workflowDetailHeader.enabled', {
                        defaultMessage: 'Enabled',
                      })
                    : i18n.translate('workflows.workflowDetailHeader.disabled', {
                        defaultMessage: 'Disabled',
                      })
                }
              />
            </div>
            <div
              css={{
                width: '1px',
                margin: '4px 0',
                backgroundColor: euiTheme.colors.lightShade,
                alignSelf: 'stretch',
              }}
            />
            <EuiButtonIcon
              display="base"
              iconType="beaker"
              size="s"
              disabled={isLoading || !canTestWorkflow}
              onClick={handleTestClick}
            >
              <FormattedMessage id="keepWorkflows.buttonText" defaultMessage="Test" ignoreTag />
            </EuiButtonIcon>
            <EuiButtonIcon
              color="success"
              display="base"
              iconType="play"
              size="s"
              onClick={handleRunClick}
              disabled={!canRunWorkflow || !isEnabled || isLoading}
              title={
                !canRunWorkflow
                  ? i18n.translate('workflows.workflowDetailHeader.runWorkflow.notAllowed', {
                      defaultMessage: 'You are not allowed to run workflows',
                    })
                  : !isEnabled
                  ? i18n.translate('workflows.workflowDetailHeader.runWorkflow.disabled', {
                      defaultMessage: 'Enable the workflow to run it',
                    })
                  : undefined
              }
            >
              <FormattedMessage id="keepWorkflows.buttonText" defaultMessage="Run" ignoreTag />
            </EuiButtonIcon>

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
  );
};
