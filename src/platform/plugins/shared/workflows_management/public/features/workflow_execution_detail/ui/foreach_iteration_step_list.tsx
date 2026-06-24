/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiAccordion, EuiLink, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { formatDuration } from '../../../shared/lib/format_duration';

export interface ForeachIterationRow {
  iterNum: number;
  step: WorkflowStepExecutionDto;
}

interface ForeachIterationStepListProps {
  executionId: string;
  rows: ForeachIterationRow[];
  onSelectStep: (stepExecutionId: string) => void;
}

export const ForeachIterationStepList: React.FC<ForeachIterationStepListProps> = ({
  executionId,
  rows,
  onSelectStep,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiAccordion
      id={`foreach-output-${executionId}`}
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
      <div css={css({ padding: `${euiTheme.size.s} 0 2px` })}>
      <div
        css={css({
          border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
          borderRadius: '6px',
        })}
      >
        <div css={css({ padding: '16px' })}>
        <div
          css={css({
            display: 'flex',
            borderBottom: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
            padding: '7px 8px',
          })}
        >
          <span css={css({ flex: '0 0 40px', fontSize: '12px', fontWeight: 600 })}>#</span>
          <span css={css({ flex: 1, fontSize: '12px', fontWeight: 600 })}>
            {i18n.translate('workflowsManagement.foreachIterationStepList.stepColumn', {
              defaultMessage: 'Step',
            })}
          </span>
          <span css={css({ fontSize: '12px', fontWeight: 600 })}>
            {i18n.translate('workflowsManagement.foreachIterationStepList.durationColumn', {
              defaultMessage: 'Duration',
            })}
          </span>
        </div>
        {rows.map(({ iterNum, step }, idx) => (
          <div
            key={step.id}
            css={css({
              display: 'flex',
              borderBottom:
                idx < rows.length - 1
                  ? `1px solid ${euiTheme.colors.borderBaseSubdued}`
                  : 'none',
              padding: '4px 8px',
              minHeight: '33px',
              alignItems: 'center',
            })}
          >
            <span
              css={css({
                flex: '0 0 40px',
                fontSize: '12px',
                color: euiTheme.colors.textSubdued,
                fontVariantNumeric: 'tabular-nums',
              })}
            >
              #{iterNum}
            </span>
            <span css={css({ flex: 1, fontSize: '12px' })}>
              <EuiLink onClick={() => onSelectStep(step.id)}>{step.stepId}</EuiLink>
            </span>
            {step.executionTimeMs != null && (
              <span css={css({ fontSize: '12px', color: euiTheme.colors.textSubdued })}>
                {formatDuration(step.executionTimeMs)}
              </span>
            )}
          </div>
        ))}
        </div>
      </div>
      </div>
    </EuiAccordion>
  );
};
