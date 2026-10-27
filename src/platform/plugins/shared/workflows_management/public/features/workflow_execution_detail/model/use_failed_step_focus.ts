/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import type { FailedStepPosition } from '../lib/get_failed_step_position';
import { getFailedStepPosition } from '../lib/get_failed_step_position';

interface UseFailedStepFocusParams {
  workflowExecution: WorkflowExecutionDto | undefined;
  /** Switches the flyout to the tab that lists the steps. */
  showStepsTab: () => void;
  selectStepExecution: (stepExecutionId: string | null) => void;
}

interface FailedStepFocus {
  failedPosition: FailedStepPosition | null;
  autoExpandErrorForStepId: string | null;
  errorArrivalPulseStepId: string | null;
  focusFailedStep: (stepExecutionId: string) => void;
}

/**
 * Finds the step a failed run stopped at, highlights it once per run, and lets the user jump back
 * to it. Opening the failed step's detail panel is left to an explicit click.
 */
export const useFailedStepFocus = ({
  workflowExecution,
  showStepsTab,
  selectStepExecution,
}: UseFailedStepFocusParams): FailedStepFocus => {
  const [autoExpandErrorForStepId, setAutoExpandErrorForStepId] = useState<string | null>(null);
  const [errorArrivalPulseStepId, setErrorArrivalPulseStepId] = useState<string | null>(null);
  const autoExpandedForExecutionIdRef = useRef<string | null>(null);

  const workflowDefinition = workflowExecution?.workflowDefinition ?? null;
  const failedPosition = useMemo(
    () => getFailedStepPosition(workflowExecution, workflowDefinition),
    [workflowExecution, workflowDefinition]
  );

  const scrollToFailedStep = useCallback((stepExecutionId: string) => {
    // Wait for Table tree paint (including tab switch + ancestor expand).
    window.setTimeout(() => {
      const node = document.querySelector(
        `[data-test-subj="workflowStepTreeNode"][data-step-execution-id="${stepExecutionId}"]`
      );
      const errorRegion = node?.querySelector('[data-test-subj="workflowFailedStepErrorPanel"]');
      (errorRegion ?? node)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  }, []);

  const focusFailedStep = useCallback(
    (stepExecutionId: string) => {
      showStepsTab();
      selectStepExecution(stepExecutionId);
      setAutoExpandErrorForStepId(stepExecutionId);
      setErrorArrivalPulseStepId(stepExecutionId);
      scrollToFailedStep(stepExecutionId);
    },
    [scrollToFailedStep, selectStepExecution, showStepsTab]
  );

  // Clear the one-shot arrival pulse after the animation window (~1.2s).
  useEffect(() => {
    if (!errorArrivalPulseStepId) return;
    const timer = window.setTimeout(() => {
      setErrorArrivalPulseStepId(null);
    }, 1300);
    return () => window.clearTimeout(timer);
  }, [errorArrivalPulseStepId]);

  // Highlight the failed step in the tree once per execution open (not on tab switches).
  // Do not open the step-detail sub-flyout — that is only for an explicit step click.
  useEffect(() => {
    if (!workflowExecution || !failedPosition) return;
    if (autoExpandedForExecutionIdRef.current === workflowExecution.id) return;
    autoExpandedForExecutionIdRef.current = workflowExecution.id;
    showStepsTab();
    setAutoExpandErrorForStepId(failedPosition.step.id);
    setErrorArrivalPulseStepId(failedPosition.step.id);
    scrollToFailedStep(failedPosition.step.id);
  }, [workflowExecution, failedPosition, scrollToFailedStep, showStepsTab]);

  return { failedPosition, autoExpandErrorForStepId, errorArrivalPulseStepId, focusFailedStep };
};
