/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiText } from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { JsonValue } from '@kbn/utility-types';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { ExecutionDataViewer } from '../../../shared/ui/execution_data_viewer';
import { getStepFieldPathPrefix } from '../lib/get_step_field_path_prefix';

const Titles = {
  output: i18n.translate('workflowsManagement.stepExecutionDataView.outputTitle', {
    defaultMessage: 'Output',
  }),
  error: i18n.translate('workflowsManagement.stepExecutionDataView.errorTitle', {
    defaultMessage: 'Error',
  }),
  input: i18n.translate('workflowsManagement.stepExecutionDataView.inputTitle', {
    defaultMessage: 'Input',
  }),
};

export function buildForeachOutput(
  stepExecution: WorkflowStepExecutionDto,
  allStepExecutions: WorkflowStepExecutionDto[]
): JsonValue {
  const { stepId } = stepExecution;
  const byIteration = new Map<number, Record<string, JsonValue>>();

  for (const s of allStepExecutions) {
    const frame = s.scopeStack?.find((f) => f.stepId === stepId);
    const iterScope = frame?.nestedScopes.find((sc) => sc.scopeId !== undefined);
    if (iterScope?.scopeId) {
      const iterNum = parseInt(iterScope.scopeId, 10);
      if (!isNaN(iterNum)) {
        if (!byIteration.has(iterNum)) {
          byIteration.set(iterNum, {});
        }
        if (s.output !== undefined && s.output !== null) {
          const iteration = byIteration.get(iterNum);
          if (iteration) {
            iteration[s.stepId] = s.output as JsonValue;
          }
        }
      }
    }
  }

  if (byIteration.size === 0) return null;
  const maxIter = Math.max(...byIteration.keys());
  return Array.from({ length: maxIter + 1 }, (_, i) => byIteration.get(i) ?? null);
}

interface StepExecutionDataViewProps {
  stepExecution: WorkflowStepExecutionDto;
  mode: 'input' | 'output';
  allStepExecutions?: WorkflowStepExecutionDto[];
}

export const StepExecutionDataView = React.memo<StepExecutionDataViewProps>(
  ({ stepExecution, mode }) => {
    const { data, title } = useMemo<{ data: JsonValue | undefined; title: string }>(() => {
      if (mode === 'input') {
        return { data: stepExecution.input, title: Titles.input };
      } else {
        if (stepExecution.error) {
          // When a HITL timeout (or other failure) persists partial output, surface
          // those fields alongside the error so channel / respondedBy / respondedAt
          // appear in the same field table without a separate callout.
          const partialOutput =
            stepExecution.output &&
            typeof stepExecution.output === 'object' &&
            !Array.isArray(stepExecution.output)
              ? (stepExecution.output as Record<string, JsonValue>)
              : undefined;
          return {
            data: {
              ...(partialOutput ?? {}),
              error: stepExecution.error as unknown as JsonValue,
            },
            title: Titles.error,
          };
        }
        return { data: stepExecution.output, title: Titles.output };
      }
    }, [mode, stepExecution]);

    const fieldPathActionsPrefix = useMemo(
      () =>
        getStepFieldPathPrefix({
          stepId: stepExecution.stepId,
          stepType: stepExecution.stepType,
          mode,
          hasError: Boolean(stepExecution.error),
        }),
      [mode, stepExecution.error, stepExecution.stepId, stepExecution.stepType]
    );

    if (data === undefined) {
      return (
        <EuiText color="subdued" size="xs">
          <FormattedMessage
            id="workflowsManagement.stepExecutionDataView.noData"
            defaultMessage="No {mode} data"
            values={{ mode: Titles[mode].toLowerCase() }}
          />
        </EuiText>
      );
    }

    return (
      <ExecutionDataViewer
        data={data}
        title={title}
        fieldPathActionsPrefix={fieldPathActionsPrefix}
      />
    );
  }
);

StepExecutionDataView.displayName = 'StepExecutionDataView';
