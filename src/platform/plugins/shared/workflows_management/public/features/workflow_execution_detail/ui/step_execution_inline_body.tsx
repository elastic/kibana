/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiButtonIcon, EuiCopy, EuiPanel, EuiSkeletonText, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { StepExecutionDataView } from './step_execution_data_view';

const i18nTexts = {
  input: i18n.translate('workflowsManagement.stepExecutionInlineBody.input', {
    defaultMessage: 'Input',
  }),
  output: i18n.translate('workflowsManagement.stepExecutionInlineBody.output', {
    defaultMessage: 'Output',
  }),
  copy: i18n.translate('workflowsManagement.stepExecutionInlineBody.copy', {
    defaultMessage: 'Copy',
  }),
};

const INLINE_TABLE_PAGE_SIZE = 10;
const INLINE_CODE_CLAMP_LINES = 10;

// Recursively detect whether a value carries any actual content. Empty objects/arrays,
// objects whose values are all empty/null, and empty strings count as "no data" — the
// section is hidden entirely instead of rendering with nothing inside.
function hasMeaningfulData(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.length > 0;
  if (Array.isArray(value)) return value.some(hasMeaningfulData);
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(hasMeaningfulData);
  }
  return true; // numbers, booleans
}

export interface StepExecutionInlineBodyProps {
  stepExecution: WorkflowStepExecutionDto | undefined;
  isLoading: boolean;
}

export const StepExecutionInlineBody = React.memo<StepExecutionInlineBodyProps>(
  ({ stepExecution, isLoading }) => {
    const styles = useMemoCss(componentStyles);

    if (isLoading || !stepExecution) {
      return (
        <EuiPanel hasShadow={false} paddingSize="m" css={styles.section}>
          <EuiSkeletonText lines={4} />
        </EuiPanel>
      );
    }

    const hasInput = hasMeaningfulData(stepExecution.input);
    const hasError = hasMeaningfulData(stepExecution.error);
    const hasOutput = hasMeaningfulData(stepExecution.output) || hasError;

    if (!hasInput && !hasOutput) {
      return (
        <EuiPanel hasShadow={false} paddingSize="m" css={styles.section}>
          <EuiText size="s" color="subdued">
            {i18n.translate('workflowsManagement.stepExecutionInlineBody.noData', {
              defaultMessage: 'No input or output recorded for this step.',
            })}
          </EuiText>
        </EuiPanel>
      );
    }

    // Single-section layout: when only input or only output exists, render one box
    // labeled "Output" with the data as code (height auto-fits content).
    if (hasInput && !hasOutput) {
      return (
        <div css={styles.bodyWrapper}>
          <Section
            title={i18nTexts.output}
            copyText={JSON.stringify(stepExecution.input, null, 2)}
            initialViewMode="json"
          >
            <StepExecutionDataView
              stepExecution={stepExecution}
              mode="input"
              defaultPageSize={INLINE_TABLE_PAGE_SIZE}
              initialViewMode="json"
              hideToolbar
              jsonClampLines={INLINE_CODE_CLAMP_LINES}
            />
          </Section>
        </div>
      );
    }

    if (!hasInput && hasOutput) {
      return (
        <div css={styles.bodyWrapper}>
          <Section
            title={i18nTexts.output}
            copyText={JSON.stringify(stepExecution.output ?? stepExecution.error, null, 2)}
            initialViewMode="json"
          >
            <StepExecutionDataView
              stepExecution={stepExecution}
              mode="output"
              defaultPageSize={INLINE_TABLE_PAGE_SIZE}
              initialViewMode="json"
              hideToolbar
              jsonClampLines={INLINE_CODE_CLAMP_LINES}
            />
          </Section>
        </div>
      );
    }

    // Both input and output have meaningful data: render two stacked sections, both as code.
    return (
      <div css={styles.bodyWrapper}>
        <Section
          title={i18nTexts.input}
          copyText={JSON.stringify(stepExecution.input, null, 2)}
          initialViewMode="json"
        >
          <StepExecutionDataView
            stepExecution={stepExecution}
            mode="input"
            defaultPageSize={INLINE_TABLE_PAGE_SIZE}
            initialViewMode="json"
            hideToolbar
            jsonClampLines={INLINE_CODE_CLAMP_LINES}
          />
        </Section>
        <Section
          title={i18nTexts.output}
          copyText={JSON.stringify(stepExecution.output ?? stepExecution.error, null, 2)}
          initialViewMode="json"
        >
          <StepExecutionDataView
            stepExecution={stepExecution}
            mode="output"
            defaultPageSize={INLINE_TABLE_PAGE_SIZE}
            initialViewMode="json"
            hideToolbar
            jsonClampLines={INLINE_CODE_CLAMP_LINES}
          />
        </Section>
      </div>
    );
  }
);
StepExecutionInlineBody.displayName = 'StepExecutionInlineBody';

const Section: React.FC<{
  title: string;
  copyText: string;
  initialViewMode: 'table' | 'json';
  children: React.ReactNode;
}> = ({ title, copyText, children }) => {
  const styles = useMemoCss(componentStyles);
  return (
    <div css={styles.section} data-test-subj={`workflowStepInlineSection_${title.toLowerCase()}`}>
      <div css={styles.sectionHeader}>
        <span css={styles.sectionTitle}>{title}</span>
        <EuiCopy textToCopy={copyText}>
          {(copy) => (
            <EuiButtonIcon
              iconType="copy"
              size="xs"
              color="text"
              aria-label={i18nTexts.copy}
              onClick={copy}
            />
          )}
        </EuiCopy>
      </div>
      <div css={styles.sectionBody}>{children}</div>
    </div>
  );
};

const componentStyles = {
  bodyWrapper: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      flexDirection: 'column',
      gap: euiTheme.size.m,
    }),
  // Section: no card border. The expanded row's tinted background already groups
  // the data visually. We keep a minimalist title row + a flat code area.
  section: () =>
    css({
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
    }),
  sectionHeader: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: euiTheme.size.xs,
    }),
  sectionTitle: ({ euiTheme }: UseEuiTheme) =>
    css({
      lineHeight: 1,
      letterSpacing: '0.04em',
      fontSize: '11px',
      fontWeight: euiTheme.font.weight.semiBold,
      textTransform: 'uppercase',
      color: euiTheme.colors.textSubdued,
    }),
  sectionBody: ({ euiTheme }: UseEuiTheme) =>
    css({
      borderRadius: euiTheme.border.radius.medium,
      overflow: 'hidden',
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
    }),
};
