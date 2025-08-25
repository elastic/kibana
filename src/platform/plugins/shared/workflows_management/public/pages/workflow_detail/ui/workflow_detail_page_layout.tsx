/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { WorkflowDetailDto } from '@kbn/workflows';
import React, { useState } from 'react';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { WorkflowUrlStateTabType } from '../../../hooks/use_workflow_url_state';
import { WorkflowDetailHeader } from './workflow_detail_header';

export interface WorkflowDetailPageLayoutProps {
  isVisualEditorEnabled: boolean;
  isLoading: boolean;
  workflow: WorkflowDetailDto;
  selectedExecutionId: boolean;
}

export function WorkflowDetailPageLayout({
  workflow,
  isLoading,
  isVisualEditorEnabled,
  selectedExecutionId,
}: WorkflowDetailPageLayoutProps) {
  const styles = useMemoCss(componentStyles);
  const [activeTab, setActiveTab] = useState<WorkflowUrlStateTabType>('workflow');

  return (
    <div css={styles.pageContainer}>
      <WorkflowDetailHeader
        name={workflow?.name}
        isLoading={isLoading}
        activeTab={activeTab}
        canRunWorkflow={false}
        canSaveWorkflow={false}
        isEnabled={workflow?.enabled ?? false}
        handleRunClick={() => {}}
        handleSave={() => {}}
        handleToggleWorkflow={() => {}}
        canTestWorkflow={true}
        handleTestClick={() => {}}
        handleTabChange={(tab) => {
          setActiveTab(tab);
        }}
      />
      <EuiFlexGroup gutterSize="none" css={styles.container}>
        {activeTab === 'executions' && (
          <EuiFlexItem css={styles.executionListColumn}>
            <div css={{ height: '1200px' }}>Executions List</div>
          </EuiFlexItem>
        )}
        <EuiFlexItem css={styles.workflowMainColumn}>
          <EuiFlexGroup gutterSize="none">
            <EuiFlexItem css={styles.workflowYamlEditorColumn}>YAML Editor</EuiFlexItem>
            {isVisualEditorEnabled && workflow && (
              <EuiFlexItem css={styles.workflowVisualEditorColumn}>Visual Editor</EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        {selectedExecutionId && (
          <EuiFlexItem css={styles.stepExecutionListColumn}>Step Execution Details</EuiFlexItem>
        )}
      </EuiFlexGroup>
    </div>
  );
}

const componentStyles = {
  pageContainer: css({
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 auto',
    overflow: 'hidden',
  }),
  container: css`
    flex: 1 1 auto;
    height: 100%;
    min-height: 0;
    flex-wrap: nowrap !important;
  `,
  executionListColumn: ({ euiTheme }: UseEuiTheme) =>
    css({
      flexBasis: '200px',
      maxWidth: '200px',
      flex: 1,
      //   backgroundColor: euiTheme.colors.backgroundBasePlain,
      borderRight: `1px solid ${euiTheme.colors.borderBasePlain}`,
      backgroundColor: 'green',
    }),
  workflowMainColumn: css({
    flex: 1,
    overflow: 'hidden',
    backgroundColor: 'red',
  }),
  workflowYamlEditorColumn: css({
    flex: 1,
    overflow: 'hidden',
    backgroundColor: 'blue',
  }),
  workflowVisualEditorColumn: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: 1,
      overflow: 'hidden',
      borderLeft: `1px solid ${euiTheme.colors.borderBasePlain}`,
    }),
  stepExecutionListColumn: ({ euiTheme }: UseEuiTheme) =>
    css({
      flexBasis: '275px',
      maxWidth: '275px',
      flex: 1,
      borderLeft: `1px solid ${euiTheme.colors.borderBasePlain}`,
      paddingBottom: '48px', // height of the validation errors bottom bar
      backgroundColor: 'yellow',
    }),
};
