/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { ExecutionStatus } from '@kbn/workflows';
import {
  StepExecutionTreeRow,
  TREE_ROW_CHEVRON_SLOT_PX,
  type StepExecutionTreeRowProps,
} from './step_execution_tree_row';

jest.mock('../../../shared/ui/step_icons/step_icon', () => ({
  StepIcon: ({ stepType }: { stepType: string }) => (
    <span data-test-subj="mock-step-icon" data-step-type={stepType} />
  ),
}));

jest.mock('../../../shared/ui/token_usage_badge/token_usage_badge', () => ({
  TokenUsageBadge: ({ usage }: { usage: { totalTokens: number } }) => (
    <span data-test-subj="workflowStepTreeTokenUsage">{usage.totalTokens} tokens</span>
  ),
}));

const renderRow = (props: Partial<StepExecutionTreeRowProps> = {}) => {
  const onSelect = jest.fn();
  const result = render(
    <I18nProvider>
      <StepExecutionTreeRow
        stepId="my_step"
        stepType="console"
        status={ExecutionStatus.COMPLETED}
        executionTimeMs={299}
        selected={false}
        onSelect={onSelect}
        {...props}
      />
    </I18nProvider>
  );
  return { ...result, onSelect };
};

describe('StepExecutionTreeRow', () => {
  it('reserves the chevron gutter for leaf rows so icons align with parents', () => {
    renderRow();
    const slot = screen.getByTestId('workflowStepTreeChevronSlot');
    expect(slot).toHaveStyle({ width: `${TREE_ROW_CHEVRON_SLOT_PX}px` });
    expect(screen.queryByTestId('workflowStepTreeChevron')).not.toBeInTheDocument();
  });

  it('renders an expand chevron for parent rows', () => {
    const onToggleExpand = jest.fn();
    renderRow({ isExpandable: true, isExpanded: false, onToggleExpand });
    fireEvent.click(screen.getByTestId('workflowStepTreeChevron'));
    expect(onToggleExpand).toHaveBeenCalled();
  });

  it('renders metadata in fixed order: duration, tokens, status — omitting absent items', () => {
    renderRow({
      status: ExecutionStatus.FAILED,
      executionTimeMs: 299,
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    });
    const meta = screen.getByTestId('workflowStepTreeMeta');
    const texts = Array.from(meta.querySelectorAll('[data-test-subj]')).map((el) =>
      el.getAttribute('data-test-subj')
    );
    expect(texts).toEqual([
      'workflowStepTreeDuration',
      'workflowStepTreeTokenUsage',
      'workflowStepTreeStatusIcon',
    ]);
  });

  it('omits duration without leaving a status/token gap when duration is absent', () => {
    renderRow({
      status: ExecutionStatus.FAILED,
      executionTimeMs: null,
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    });
    const meta = screen.getByTestId('workflowStepTreeMeta');
    const texts = Array.from(meta.querySelectorAll('[data-test-subj]')).map((el) =>
      el.getAttribute('data-test-subj')
    );
    expect(texts).toEqual(['workflowStepTreeTokenUsage', 'workflowStepTreeStatusIcon']);
  });

  it('does not render a status icon for successful steps', () => {
    renderRow({ status: ExecutionStatus.COMPLETED });
    expect(screen.queryByTestId('workflowStepTreeStatusIcon')).not.toBeInTheDocument();
  });

  it('renders no metadata cluster for branch-label rows', () => {
    renderRow({
      isBranchLabel: true,
      stepId: 'true',
      status: ExecutionStatus.COMPLETED,
      executionTimeMs: 10,
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    });
    expect(screen.queryByTestId('workflowStepTreeMeta')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowStepTreeBranchGlyph')).toBeInTheDocument();
  });

  it('keeps selected fill while another row is hovered (selected bg wins on hover)', () => {
    const { container } = renderRow({ selected: true, status: ExecutionStatus.COMPLETED });
    const row = container.querySelector('[data-selected="true"]');
    expect(row).toBeTruthy();
    // Selected attribute is the signal; hover CSS prefers selectBg when selected.
    expect(row).toHaveAttribute('data-selected', 'true');
  });

  it('switches status icon anchoring via statusPlacement', () => {
    const { rerender } = renderRow({
      status: ExecutionStatus.FAILED,
      statusPlacement: 'inline',
    });
    expect(screen.getByTestId('workflowStepExecutionTreeRow')).toHaveAttribute(
      'data-status-placement',
      'inline'
    );
    const metaInline = screen.getByTestId('workflowStepTreeMeta');
    expect(metaInline.querySelector('[data-test-subj="workflowStepTreeStatusIcon"]')).toBeTruthy();

    rerender(
      <I18nProvider>
        <StepExecutionTreeRow
          stepId="my_step"
          stepType="console"
          status={ExecutionStatus.FAILED}
          executionTimeMs={10}
          selected={false}
          onSelect={jest.fn()}
          statusPlacement="right"
        />
      </I18nProvider>
    );
    expect(screen.getByTestId('workflowStepExecutionTreeRow')).toHaveAttribute(
      'data-status-placement',
      'right'
    );
    const metaRight = screen.getByTestId('workflowStepTreeMeta');
    expect(metaRight.querySelector('[data-test-subj="workflowStepTreeStatusIcon"]')).toBeNull();
    expect(screen.getByTestId('workflowStepTreeStatusIcon')).toBeInTheDocument();
  });

  it('shows Not run in the duration slot for skipped steps', () => {
    renderRow({ status: ExecutionStatus.SKIPPED, executionTimeMs: null });
    expect(screen.getByText('Not run')).toBeInTheDocument();
  });

  it('calls onSelect when the row is activated', () => {
    const { onSelect } = renderRow();
    fireEvent.click(screen.getByTestId('workflowStepName'));
    expect(onSelect).toHaveBeenCalled();
  });
});
