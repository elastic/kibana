/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { isTerminalStatus } from '@kbn/workflows';
import { buildStepExecutionsTree } from './build_step_executions_tree';
import { StepDetailAccordionSection } from './step_detail_accordion_section';
import { StepExecutionOpenTree } from './workflow_step_execution_tree';

interface ForeachIterationsSectionProps {
  foreachStep: WorkflowStepExecutionDto;
  allStepExecutions: WorkflowStepExecutionDto[];
  selectedId: string | null;
  onSelectStep: (stepExecutionId: string) => void;
  executionStatus?: WorkflowStepExecutionDto['status'];
}

/**
 * Navigable Iterations section for foreach/while (and similar repetitive control)
 * step subflyouts. Full flat list of high-level iteration rows (no pin/gap
 * collapse) — selecting one opens that iteration in the step panel.
 */
export const ForeachIterationsSection: React.FC<ForeachIterationsSectionProps> = ({
  foreachStep,
  allStepExecutions,
  selectedId,
  onSelectStep,
  executionStatus,
}) => {
  const foreachRoot = useMemo(() => {
    const tree = buildStepExecutionsTree(allStepExecutions);
    const find = (
      items: ReturnType<typeof buildStepExecutionsTree>
    ): ReturnType<typeof buildStepExecutionsTree>[number] | undefined => {
      for (const item of items) {
        const isForeachType = item.stepType === 'foreach' || item.stepType === 'while';
        const hasIterationChildren = item.children.some(
          (c) => c.stepType === 'foreach-iteration' || c.stepType === 'while-iteration'
        );
        if (
          item.stepId === foreachStep.stepId &&
          (item.stepExecutionId === foreachStep.id || isForeachType || hasIterationChildren)
        ) {
          return item;
        }
        const nested = find(item.children);
        if (nested) return nested;
      }
      return undefined;
    };
    return find(tree);
  }, [allStepExecutions, foreachStep.id, foreachStep.stepId]);

  const iterationCount = foreachRoot?.children.length ?? 0;

  const headerLabel =
    iterationCount > 0
      ? i18n.translate('workflows.executionFlyout.iterationsSection.titleWithCount', {
          defaultMessage: 'Iterations · {count}',
          values: { count: iterationCount },
        })
      : i18n.translate('workflows.executionFlyout.iterationsSection.title', {
          defaultMessage: 'Iterations',
        });

  if (!foreachRoot || iterationCount === 0) {
    return null;
  }

  return (
    <StepDetailAccordionSection
      data-test-subj="workflowExecutionIterationsSection"
      title={headerLabel}
    >
      <div role="group" aria-label={headerLabel}>
        <StepExecutionOpenTree
          roots={[foreachRoot]}
          stepExecutions={allStepExecutions}
          selectedId={selectedId}
          onStepExecutionClick={onSelectStep}
          isExecutionComplete={executionStatus != null ? isTerminalStatus(executionStatus) : true}
          childrenOnly
          data-test-subj="workflowExecutionIterationsTree"
        />
      </div>
    </StepDetailAccordionSection>
  );
};
