/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiTabs,
  EuiTab,
  EuiSkeletonText,
  EuiStat,
  EuiPanel,
  EuiButtonIcon,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { StatusBadge } from '../../../shared/ui';
import { StepExecutionTimelineStateful } from './step_execution_timeline_stateful';
import { StepExecutionDataView } from './step_execution_data_view';
import { useGetFormattedDateTime } from '../../../shared/ui/use_formatted_date';
import { formatDuration } from '../../../shared/lib/format_duration';

interface WorkflowStepExecutionDetailsProps {
  workflowExecutionId: string;
  stepExecution: WorkflowStepExecutionDto;
  isLoading: boolean;
  onClose: () => void;
  setSelectedStepId: (stepId: string | null) => void;
}

export const WorkflowStepExecutionDetails = ({
  workflowExecutionId,
  stepExecution,
  setSelectedStepId,
  onClose,
  isLoading,
}: WorkflowStepExecutionDetailsProps) => {
  const styles = useMemoCss(componentStyles);
  const getFormattedDateTime = useGetFormattedDateTime();

  const complicatedFlyoutTitleId = `Step ${stepExecution?.stepId} Execution Details`;

  const tabs = useMemo(
    () => [
      {
        id: 'input',
        name: 'Input',
      },
      {
        id: 'output',
        name: stepExecution?.output ? 'Output' : 'Error',
      },
      {
        id: 'timeline',
        name: 'Timeline',
      },
    ],
    [stepExecution]
  );

  const [selectedTabId, setSelectedTabId] = useState<string>(tabs[0].id);

  useEffect(() => {
    setSelectedStepId(stepExecution?.stepId || null);
    // reset the tab to the default one on step change
    setSelectedTabId(tabs[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepExecution?.stepId, tabs[0].id]);

  const renderInput = () => {
    return (
      <StepExecutionDataView
        data={stepExecution?.input}
        title="Step Input"
        data-test-subj="stepExecutionInputTable"
      />
    );
  };

  const renderOutput = () => {
    if (stepExecution?.error) {
      return (
        <StepExecutionDataView
          data={{ error: stepExecution.error }}
          title="Step Error"
          data-test-subj="stepExecutionErrorTable"
        />
      );
    }
    return (
      <StepExecutionDataView
        data={stepExecution?.output}
        title="Step Output"
        data-test-subj="stepExecutionOutputTable"
      />
    );
  };

  const renderTimeline = () => {
    return (
      <StepExecutionTimelineStateful
        executionId={workflowExecutionId}
        stepExecutionId={stepExecution.id}
      />
    );
  };

  return (
    <EuiPanel hasShadow={false} paddingSize="m">
      <div css={styles.titleContainer}>
        {isLoading && <EuiSkeletonText lines={1} />}
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexStart" direction="row">
          <EuiFlexItem grow={false}>
            <p>{getFormattedDateTime(new Date(stepExecution.startedAt))}</p>
            <EuiTitle size="m">
              <h2 id={complicatedFlyoutTitleId} css={styles.title}>
                {stepExecution.stepId}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="cross"
              color="text"
              onClick={onClose}
              aria-label="close step detail"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiText size="xs">
          {isLoading && <EuiSkeletonText lines={2} />}
          {stepExecution && (
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem>
                <EuiPanel hasBorder={true} paddingSize="s">
                  <EuiStat
                    css={styles.stat}
                    title={
                      <StatusBadge
                        textProps={{ css: styles.statusBadge }}
                        status={stepExecution.status}
                      />
                    }
                    titleSize="xxs"
                    textAlign="left"
                    isLoading={isLoading}
                    description="Status"
                  />
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel hasBorder={true} paddingSize="s">
                  <EuiStat
                    css={styles.stat}
                    title={formatDuration(stepExecution.executionTimeMs ?? 0)}
                    titleSize="xxs"
                    textAlign="left"
                    isLoading={isLoading || stepExecution.executionTimeMs === undefined}
                    description="Execution time"
                  />
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </EuiText>
        <EuiSpacer size="m" />
        <EuiTabs css={styles.tabs}>
          {tabs.map((tab, index) => (
            <EuiTab
              onClick={() => setSelectedTabId(tab.id)}
              isSelected={tab.id === selectedTabId}
              key={index}
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>
      </div>
      <EuiPanel hasShadow={false} paddingSize="m">
        {isLoading && <EuiSkeletonText lines={2} />}
        {selectedTabId === 'input' && renderInput()}
        {selectedTabId === 'output' && renderOutput()}
        {selectedTabId === 'timeline' && renderTimeline()}
      </EuiPanel>
    </EuiPanel>
  );
};

const componentStyles = {
  flyoutHeader: ({ euiTheme }: UseEuiTheme) =>
    css({
      width: '100%',
      borderBottom: `1px solid ${euiTheme.colors.borderBasePlain}`,
      padding: euiTheme.size.s,
    }),
  titleContainer: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.m,
    }),
  title: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      alignItems: 'center',
      gap: euiTheme.size.xs,
    }),
  stat: css`
    & .euiStat__title {
      margin-block-end: 0;
    }
  `,
  statusBadge: css`
    font-weight: 600;
  `,
  tabs: css({
    marginBottom: -13,
  }),
};
