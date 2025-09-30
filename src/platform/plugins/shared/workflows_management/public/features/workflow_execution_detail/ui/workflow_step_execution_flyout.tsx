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
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiTabs,
  EuiTab,
  EuiButtonIcon,
  EuiSkeletonText,
  EuiButtonEmpty,
  EuiStat,
  EuiPanel,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { StatusBadge } from '../../../shared/ui';
import { StepExecutionTimelineStateful } from './step_execution_timeline_stateful';
import { StepExecutionDataView } from './step_execution_data_view';
import { useGetFormattedDateTime } from '../../../shared/ui/use_formatted_date';
import { formatDuration } from '../../../shared/lib/format_duration';

interface WorkflowStepExecutionFlyoutProps {
  workflowExecutionId: string;
  stepExecutionId: string;
  stepExecution: WorkflowStepExecutionDto | null;
  isLoading: boolean;
  closeFlyout: () => void;
  goNext?: () => void;
  goPrevious?: () => void;
  setSelectedStepId: (stepId: string | null) => void;
}

export const WorkflowStepExecutionFlyout = ({
  workflowExecutionId,
  stepExecutionId,
  stepExecution,
  closeFlyout,
  goNext,
  goPrevious,
  setSelectedStepId,
  isLoading = false,
}: WorkflowStepExecutionFlyoutProps) => {
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
        stepExecutionId={stepExecutionId}
      />
    );
  };

  return (
    <EuiFlyout
      ownFocus
      onClose={closeFlyout}
      hideCloseButton
      aria-labelledby={complicatedFlyoutTitleId}
      paddingSize="none"
      type="push"
      size="s"
      pushMinBreakpoint="xl"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" css={styles.flyoutHeader}>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="xs">
              <EuiButtonEmpty
                size="xs"
                iconType="arrowLeft"
                aria-label="Previous step"
                onClick={goPrevious}
                disabled={!goPrevious}
                css={{ cursor: goPrevious ? 'pointer' : 'not-allowed' }}
              >
                Previous
              </EuiButtonEmpty>
              <EuiButtonEmpty
                size="xs"
                iconType="arrowRight"
                iconSide="right"
                aria-label="Next step"
                onClick={goNext}
                disabled={!goNext}
                css={{ cursor: goNext ? 'pointer' : 'not-allowed' }}
              >
                Next
              </EuiButtonEmpty>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon iconType="cross" color="text" onClick={closeFlyout} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <div css={styles.titleContainer}>
          {isLoading && <EuiSkeletonText lines={1} />}
          {stepExecution && (
            <div>
              <p>{getFormattedDateTime(new Date(stepExecution.startedAt))}</p>
              <EuiTitle size="m">
                <h2 id={complicatedFlyoutTitleId} css={styles.title}>
                  {/* <StepIcon
                    stepType={stepExecution.stepType}
                    executionStatus={stepExecution.status}
                  /> */}
                  {stepExecution.stepId}
                </h2>
              </EuiTitle>
            </div>
          )}
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
      </EuiFlyoutHeader>

      {/* hack to avoid white gradient overlaying the content */}
      <EuiFlyoutBody banner={' '} css={styles.flyoutBody}>
        {isLoading && <EuiSkeletonText lines={2} />}
        {selectedTabId === 'input' && renderInput()}
        {selectedTabId === 'output' && renderOutput()}
        {selectedTabId === 'timeline' && renderTimeline()}
      </EuiFlyoutBody>
    </EuiFlyout>
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
  flyoutBody: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.m,
    }),
};
