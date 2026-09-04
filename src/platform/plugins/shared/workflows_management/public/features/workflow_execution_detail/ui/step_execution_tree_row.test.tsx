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
  getTreeIndentGuideOffset,
  StepExecutionTreeRow,
  type StepExecutionTreeRowProps,
  TREE_ROW_CHEVRON_SLOT_PX,
} from './step_execution_tree_row';

jest.mock('../../../shared/ui/step_icons/step_icon', () => ({
  StepIcon: ({
    stepType,
    color,
    iconColor,
  }: {
    stepType: string;
    color?: string;
    iconColor?: string;
  }) => (
    <span
      data-test-subj="mock-step-icon"
      data-step-type={stepType}
      data-icon-color={color ?? iconColor ?? ''}
    />
  ),
}));

jest.mock('../../../shared/ui/token_usage_badge/token_usage_badge', () => ({
  TokenUsageBadge: ({ usage }: { usage: { totalTokens: number } }) => (
    <span data-test-subj="workflowStepTreeTokenUsage">{usage.totalTokens} tokens</span>
  ),
}));

jest.mock('@kbn/workflows-ui', () => {
  const actual = jest.requireActual('@kbn/workflows-ui');
  return {
    ...actual,
    getStepIconType: jest.fn((type: string) => actual.getStepIconType(type)),
  };
});

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
  it('computes indent-guide offset from row padding + half chevron slot', () => {
    expect(getTreeIndentGuideOffset('8px')).toBe('calc(8px + 8px)');
  });

  it('reserves the chevron gutter for leaf rows so icons align with parents', () => {
    renderRow();
    const slot = screen.getByTestId('workflowStepTreeChevronSlot');
    expect(slot).toHaveStyle({ width: `${TREE_ROW_CHEVRON_SLOT_PX}px` });
    expect(screen.queryByTestId('workflowStepTreeChevron')).not.toBeInTheDocument();
  });

  it('omits the chevron gutter when the sibling group does not reserve it', () => {
    renderRow({ reserveChevronSlot: false });
    expect(screen.queryByTestId('workflowStepTreeChevronSlot')).not.toBeInTheDocument();
  });

  it('uses gap-only horizontal spacing with no per-item margins on the row flex', () => {
    renderRow({
      status: ExecutionStatus.FAILED,
      executionTimeMs: 299,
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    });
    const inner = screen.getByTestId('workflowStepTreeRowInner');
    expect(inner).toHaveStyle({ gap: '8px' });
    const items = Array.from(inner.children) as HTMLElement[];
    for (const item of items) {
      expect(item.style.marginLeft || '').toBe('');
      expect(item.style.marginRight || '').toBe('');
    }
  });

  it('renders an expand chevron for parent rows', () => {
    const onToggleExpand = jest.fn();
    renderRow({ isExpandable: true, isExpanded: false, onToggleExpand });
    fireEvent.click(screen.getByTestId('workflowStepTreeChevron'));
    expect(onToggleExpand).toHaveBeenCalled();
  });

  it('renders metadata in fixed order: tokens, duration — omitting absent items', () => {
    renderRow({
      status: ExecutionStatus.FAILED,
      executionTimeMs: 299,
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    });
    const meta = screen.getByTestId('workflowStepTreeMeta');
    const texts = Array.from(meta.querySelectorAll('[data-test-subj]')).map((el) =>
      el.getAttribute('data-test-subj')
    );
    expect(texts).toEqual(['workflowStepTreeTokenUsage', 'workflowStepTreeDuration']);
  });

  it('places the in-progress status icon after the type icon, never in a leading slot', () => {
    renderRow({
      status: ExecutionStatus.RUNNING,
      isExpandable: true,
      onToggleExpand: jest.fn(),
    });
    const inner = screen.getByTestId('workflowStepTreeRowInner');
    const items = Array.from(inner.children) as HTMLElement[];
    expect(items[0]).toHaveAttribute('data-test-subj', 'workflowStepTreeChevronSlot');
    expect(items[1]).toHaveAttribute('data-test-subj', 'workflowStepTreeIconSlot');
    expect(screen.queryByTestId('workflowStepTreeStatusSlot')).toBe(items[items.length - 1]);
    expect(
      screen
        .getByTestId('workflowStepTreeMeta')
        .querySelector('[data-test-subj="workflowStepTreeStatusIcon"]')
    ).toBeNull();
    expect(screen.getByTestId('workflowStepTreeStatusIcon')).toBeInTheDocument();
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
    expect(texts).toEqual(['workflowStepTreeTokenUsage']);
  });

  it('does not render a token badge when usage total is zero', () => {
    renderRow({
      status: ExecutionStatus.COMPLETED,
      executionTimeMs: 10,
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    });
    expect(screen.queryByTestId('workflowStepTreeTokenUsage')).not.toBeInTheDocument();
  });

  it('renders iteration pin tags for failed and latest exemplars', () => {
    const onToggleExpand = jest.fn();
    renderRow({
      stepId: 'Iteration #46',
      stepType: 'foreach-iteration',
      isExpandable: true,
      isExpanded: true,
      onToggleExpand,
      iterationPinKinds: ['failed'],
      executionTimeMs: 40,
      status: ExecutionStatus.FAILED,
    });

    expect(screen.getByTestId('workflowStepTreeChevron')).toBeInTheDocument();
    expect(screen.getByTestId('workflowStepTreeIterationIcon')).toBeInTheDocument();
    expect(screen.queryByTestId('workflowStepTreeBranchGlyph')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowStepName')).toHaveTextContent('Iteration #46');
    expect(screen.getByTestId('workflowStepTreeIterationTag-failed')).toBeInTheDocument();
    expect(screen.getByTestId('workflowStepTreeStateTags')).toBeInTheDocument();
  });

  it('renders final state tag for the last retry attempt', () => {
    renderRow({
      stepId: 'Attempt #3',
      isRetryAttempt: true,
      attemptNumber: 3,
      stateTags: ['final'],
      status: ExecutionStatus.COMPLETED,
    });

    expect(screen.getByTestId('workflowStepName')).toHaveTextContent('Attempt #3');
    expect(screen.getByTestId('workflowStepTreeIterationTag-final')).toHaveTextContent('· final');
  });

  it('renders attempts badge with used of max and recovered annotation on the parent', () => {
    const { container } = renderRow({
      stepId: 'http_call',
      stepType: 'kibana.request',
      retryAttemptCount: 2,
      retryMaxAttempts: 3,
      status: ExecutionStatus.COMPLETED,
      stateTags: ['recovered'],
      isExpandable: true,
      isExpanded: true,
      onToggleExpand: jest.fn(),
    });

    expect(screen.getByTestId('workflowStepTreeAttemptsBadge')).toHaveTextContent(
      '2 of 3 attempts'
    );
    expect(screen.getByTestId('workflowStepTreeIterationTag-recovered')).toHaveTextContent(
      '· recovered'
    );
    const row = container.querySelector('[data-test-subj="workflowStepExecutionTreeRow"]');
    expect(row).toHaveAttribute('data-danger-fill', 'false');
  });

  it('shows the error panel only on the final failed attempt', () => {
    const onView = jest.fn();
    renderRow({
      stepId: 'Attempt #4',
      isRetryAttempt: true,
      stateTags: ['final'],
      status: ExecutionStatus.FAILED,
      error: { type: 'Error', message: 'boom' },
      onViewFailedStepInput: onView,
      retryAttemptCount: 4,
      errorPanelMessageOverride: 'All 4 attempts failed. Last error: boom',
      errorPanelAriaLabel: 'Error details for Attempt 4',
    });

    expect(screen.getByTestId('workflowFailedStepErrorPanel')).toBeInTheDocument();
    expect(screen.getByTestId('workflowFailedStepErrorMessage')).toHaveTextContent(
      /All 4 attempts failed/
    );
    expect(screen.queryByText('Why this step failed')).not.toBeInTheDocument();
  });

  it('does not show an error panel on earlier failed attempts', () => {
    renderRow({
      stepId: 'Attempt #1',
      isRetryAttempt: true,
      status: ExecutionStatus.FAILED,
      error: { type: 'Error', message: 'boom' },
      onViewFailedStepInput: jest.fn(),
    });

    expect(screen.queryByTestId('workflowFailedStepErrorPanel')).not.toBeInTheDocument();
  });

  it('does not render a status icon for successful steps', () => {
    renderRow({ status: ExecutionStatus.COMPLETED });
    expect(screen.queryByTestId('workflowStepTreeStatusIcon')).not.toBeInTheDocument();
  });

  it('tints the step icon and omits the error glyph on failed steps', () => {
    renderRow({ status: ExecutionStatus.FAILED });
    expect(screen.queryByTestId('workflowStepTreeStatusIcon')).not.toBeInTheDocument();
    expect(screen.getByTestId('mock-step-icon').getAttribute('data-icon-color')).toBeTruthy();
  });

  it('tints retry-attempt icons instead of showing an error glyph', () => {
    renderRow({
      stepId: 'Attempt #1',
      isRetryAttempt: true,
      status: ExecutionStatus.FAILED,
    });
    expect(screen.queryByTestId('workflowStepTreeStatusIcon')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowStepTreeRetryAttemptIcon')).toBeInTheDocument();
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

  it('marks selected failed rows with danger fill (selection border is theme-dependent)', () => {
    const { container } = renderRow({
      selected: true,
      status: ExecutionStatus.FAILED,
      showDangerSelectionBorder: true,
    });
    const row = container.querySelector('[data-selected="true"]');
    expect(row).toHaveAttribute('data-danger-fill', 'true');
    expect(row).toHaveAttribute('data-danger-selected', 'true');
  });

  it('does not mark unselected failed rows as danger-selected', () => {
    const { container } = renderRow({
      selected: false,
      status: ExecutionStatus.FAILED,
      showDangerSelectionBorder: false,
    });
    const row = container.querySelector('[data-danger-fill="true"]');
    expect(row).toHaveAttribute('data-danger-selected', 'false');
  });

  it('can show the danger selection border on an error region when a sibling attempt is selected', () => {
    const { container } = renderRow({
      selected: false,
      status: ExecutionStatus.FAILED,
      isRetryAttempt: true,
      stateTags: ['final'],
      showDangerSelectionBorder: true,
      error: { type: 'Error', message: 'boom' },
      onViewFailedStepInput: jest.fn(),
    });
    const row = container.querySelector('[data-danger-selected="true"]');
    expect(row).toBeTruthy();
    expect(row).toHaveAttribute('data-danger-fill', 'true');
  });

  it('renders a waiting step with exactly one trailing hourglass, the type icon, and a waiting-for-input annotation', () => {
    const { container } = renderRow({
      stepId: 'ask_analyst',
      stepType: 'http',
      status: ExecutionStatus.WAITING_FOR_INPUT,
      executionTimeMs: null,
    });
    const inner = screen.getByTestId('workflowStepTreeRowInner');
    const items = Array.from(inner.children) as HTMLElement[];
    expect(items[0]).toHaveAttribute('data-test-subj', 'workflowStepTreeChevronSlot');
    expect(items[1]).toHaveAttribute('data-test-subj', 'workflowStepTreeIconSlot');
    expect(screen.getByTestId('mock-step-icon')).toHaveAttribute('data-step-type', 'http');
    expect(container.querySelectorAll('[data-euiicon-type="hourglass"]')).toHaveLength(1);
    expect(screen.getByTestId('workflowStepTreeStatusSlot')).toBe(items[items.length - 1]);
    expect(screen.getByTestId('workflowStepTreeIterationTag-waitingForInput')).toHaveTextContent(
      '· waiting for input'
    );
  });

  it('omits the trailing hourglass when the waitForInput type icon is already hourglass-shaped', () => {
    const { getStepIconType } = jest.requireMock('@kbn/workflows-ui') as {
      getStepIconType: jest.Mock;
    };
    getStepIconType.mockReturnValueOnce('hourglass');

    const { container } = renderRow({
      stepId: 'collect_input',
      stepType: 'waitForInput',
      status: ExecutionStatus.WAITING_FOR_INPUT,
      executionTimeMs: null,
    });

    expect(screen.getByTestId('mock-step-icon')).toHaveAttribute('data-step-type', 'waitForInput');
    expect(container.querySelectorAll('[data-euiicon-type="hourglass"]')).toHaveLength(0);
    expect(screen.queryByTestId('workflowStepTreeStatusSlot')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowStepTreeIterationTag-waitingForInput')).toHaveTextContent(
      '· waiting for input'
    );
  });

  it('shows Not run in the duration slot for skipped steps', () => {
    renderRow({ status: ExecutionStatus.SKIPPED, executionTimeMs: null });
    expect(screen.getByText('Not run')).toBeInTheDocument();
  });

  it('does not apply Not run treatment to synthetic iteration rows with derived completed status', () => {
    const { onSelect } = renderRow({
      stepId: 'Iteration #0',
      stepType: 'foreach-iteration',
      status: ExecutionStatus.COMPLETED,
      executionTimeMs: 40,
      isExpandable: true,
      isExpanded: false,
      onToggleExpand: jest.fn(),
    });
    expect(screen.queryByText('Not run')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowStepTreeDuration')).toHaveTextContent('40ms');
    fireEvent.click(screen.getByTestId('workflowStepTreeRowInner'));
    expect(onSelect).toHaveBeenCalled();
    expect(screen.getByTestId('workflowStepTreeRowInner')).toHaveAttribute('tabIndex', '0');
  });

  it('calls onSelect when the row is activated', () => {
    const { onSelect } = renderRow();
    fireEvent.click(screen.getByTestId('workflowStepName'));
    expect(onSelect).toHaveBeenCalled();
  });
});
