/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiAccordion, EuiFlexGroup, EuiFlexItem, EuiLink, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { formatDuration } from '../../../shared/lib/format_duration';

interface ForeachIterationStepListProps {
  stepExecution: WorkflowStepExecutionDto;
  allStepExecutions: WorkflowStepExecutionDto[];
  onSelectStep: (stepExecutionId: string) => void;
}

export const ForeachIterationStepList: React.FC<ForeachIterationStepListProps> = ({
  stepExecution,
  allStepExecutions,
  onSelectStep,
}) => {
  const { euiTheme } = useEuiTheme();

  const rows = useMemo(() => {
    const { stepId } = stepExecution;
    const result: Array<{ iterNum: number; step: WorkflowStepExecutionDto }> = [];

    for (const s of allStepExecutions) {
      const frame = s.scopeStack?.find((f) => f.stepId === stepId);
      const iterScope = frame?.nestedScopes.find((sc) => sc.scopeId !== undefined);
      if (!iterScope?.scopeId) continue;
      const iterNum = parseInt(iterScope.scopeId, 10);
      if (isNaN(iterNum)) continue;
      result.push({ iterNum, step: s });
    }

    result.sort(
      (a, b) =>
        a.iterNum - b.iterNum ||
        (a.step.globalExecutionIndex ?? 0) - (b.step.globalExecutionIndex ?? 0)
    );
    return result;
  }, [stepExecution, allStepExecutions]);

  if (rows.length === 0) return null;

  return (
    <EuiAccordion
      id={`foreach-output-${stepExecution.id}`}
      initialIsOpen={true}
      arrowDisplay="left"
      buttonContent={
        <EuiText size="s">
          <strong>
            {i18n.translate('workflowsManagement.foreachIterationStepList.outputTitle', {
              defaultMessage: 'Output',
            })}
          </strong>
        </EuiText>
      }
    >
      <EuiFlexGroup
        direction="column"
        gutterSize="none"
        css={css({ marginTop: euiTheme.size.s })}
      >
        {rows.map(({ iterNum, step }) => (
          <EuiFlexItem key={step.id} grow={false}>
            <EuiFlexGroup
              alignItems="center"
              gutterSize="s"
              responsive={false}
              css={css({ padding: `${euiTheme.size.xs} 0` })}
            >
              <EuiFlexItem
                grow={false}
                css={css({
                  color: euiTheme.colors.textSubdued,
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: euiTheme.font.scale.s * euiTheme.base,
                  minWidth: '2.5em',
                  textAlign: 'right',
                })}
              >
                #{iterNum}
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiLink onClick={() => onSelectStep(step.id)}>{step.stepId}</EuiLink>
              </EuiFlexItem>
              {step.executionTimeMs != null && (
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {formatDuration(step.executionTimeMs)}
                  </EuiText>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiAccordion>
  );
};
