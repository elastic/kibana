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
  useEuiTheme,
  EuiButtonIcon,
  EuiDescriptionList,
  EuiSkeletonText,
  EuiButtonEmpty,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/unified-search-plugin/public/use_memo_css';
import { StatusBadge, getExecutionStatusIcon } from '../../../shared/ui';
import { useStepExecution } from '../model/use_step_execution';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';
import { StepExecutionTimelineSteteful } from './step_execution_timeline_steteful';
import { StepExecutionDataView } from './step_execution_data_view';

interface WorkflowStepExecutionFlyoutProps {
  workflowExecutionId: string;
  stepId: string;
  closeFlyout: () => void;
  goNext?: () => void;
  goPrevious?: () => void;
}

export const WorkflowStepExecutionFlyout = ({
  workflowExecutionId,
  stepId,
  closeFlyout,
  goNext,
  goPrevious,
}: WorkflowStepExecutionFlyoutProps) => {
  const { euiTheme } = useEuiTheme();
  const styles = useMemoCss(componentStyles);

  const { data: stepExecution, isLoading } = useStepExecution(workflowExecutionId, stepId);

  const { setSelectedStep } = useWorkflowUrlState();

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
    setSelectedStep(stepId);
    // reset the tab to the default one on step change
    setSelectedTabId(tabs[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId, tabs[0].id]);

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
    return <StepExecutionTimelineSteteful executionId={workflowExecutionId} stepId={stepId} />;
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
            <EuiFlexGroup alignItems="center">
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
            <EuiTitle size="m">
              <h2 id={complicatedFlyoutTitleId} css={styles.title}>
                {getExecutionStatusIcon(euiTheme, stepExecution.status)}
                {stepExecution.stepId}
              </h2>
            </EuiTitle>
          )}
          <EuiSpacer size="m" />
          <EuiText size="xs">
            {isLoading && <EuiSkeletonText lines={2} />}
            {stepExecution && (
              <EuiDescriptionList
                textStyle="reverse"
                type="responsiveColumn"
                compressed
                listItems={[
                  {
                    title: 'Status',
                    description: <StatusBadge status={stepExecution.status} />,
                  },
                  {
                    title: 'Execution time',
                    description: `${stepExecution.executionTimeMs}ms`,
                  },
                ]}
              />
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
      gap: euiTheme.size.s,
    }),
  tabs: css({
    marginBottom: -13,
  }),
  flyoutBody: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.m,
    }),
};
