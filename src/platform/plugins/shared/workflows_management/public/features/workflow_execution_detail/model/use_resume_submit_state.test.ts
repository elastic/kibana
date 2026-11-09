/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import { useResumeSubmitState } from './use_resume_submit_state';

interface Props {
  executionId: string;
  waitingStepExecutionId: string | undefined;
}

describe('useResumeSubmitState', () => {
  const renderState = (initialProps: Props) =>
    renderHook(
      ({ executionId, waitingStepExecutionId }: Props) =>
        useResumeSubmitState(executionId, waitingStepExecutionId),
      { initialProps }
    );

  const submit = (state: ReturnType<typeof useResumeSubmitState>) => {
    act(() => {
      state.setSubmitting(true);
      state.setSubmitted(true);
    });
  };

  it('starts neither submitting nor submitted', () => {
    const { result } = renderState({ executionId: 'run-1', waitingStepExecutionId: 'step-1' });

    expect(result.current).toMatchObject({ isSubmitting: false, isSubmitted: false });
  });

  it('shares what a submit sets', () => {
    const { result } = renderState({ executionId: 'run-1', waitingStepExecutionId: 'step-1' });

    submit(result.current);

    expect(result.current).toMatchObject({ isSubmitting: true, isSubmitted: true });
  });

  it('resets when the run changes', () => {
    const { result, rerender } = renderState({
      executionId: 'run-1',
      waitingStepExecutionId: 'step-1',
    });
    submit(result.current);

    rerender({ executionId: 'run-2', waitingStepExecutionId: 'step-1' });

    expect(result.current).toMatchObject({ isSubmitting: false, isSubmitted: false });
  });

  it('resets when the waiting step changes', () => {
    const { result, rerender } = renderState({
      executionId: 'run-1',
      waitingStepExecutionId: 'step-1',
    });
    submit(result.current);

    rerender({ executionId: 'run-1', waitingStepExecutionId: 'step-2' });

    expect(result.current).toMatchObject({ isSubmitting: false, isSubmitted: false });
  });

  it('keeps the submit while neither the run nor the waiting step changes', () => {
    const { result, rerender } = renderState({
      executionId: 'run-1',
      waitingStepExecutionId: 'step-1',
    });
    submit(result.current);

    rerender({ executionId: 'run-1', waitingStepExecutionId: 'step-1' });

    expect(result.current).toMatchObject({ isSubmitting: true, isSubmitted: true });
  });
});
