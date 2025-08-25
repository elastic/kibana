/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiLoadingSpinner,
  EuiIcon,
  useGeneratedHtmlId,
  EuiAccordion,
  EuiFlexItem,
  EuiFlexGroup,
  useEuiTheme,
  euiFontSize,
} from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { YamlValidationError } from '../model/types';

const severityOrder = ['error', 'warning', 'info'];

export function WorkflowYAMLValidationErrors({
  isMounted,
  validationErrors,
  onErrorClick,
}: {
  isMounted: boolean;
  validationErrors: YamlValidationError[] | null;
  onErrorClick?: (error: YamlValidationError) => void;
}) {
  const styles = useMemoCss(componentStyles);
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({ prefix: 'wf-yaml-editor-validation-errors' });
  let icon: React.ReactNode | null = null;
  let buttonContent: React.ReactNode | null = null;

  const highestSeverity = validationErrors?.reduce((acc: string | null, error) => {
    if (error.severity === 'error') {
      return 'error';
    }
    if (error.severity === 'warning' && acc !== 'error') {
      return 'warning';
    }
    if (error.severity === 'info' && acc !== 'error' && acc !== 'warning') {
      return 'info';
    }
    return acc;
  }, null);

  if (!isMounted) {
    icon = <EuiLoadingSpinner size="m" />;
    buttonContent = 'Loading editor...';
  } else if (!validationErrors) {
    icon = <EuiLoadingSpinner size="m" />;
    buttonContent = 'Initializing validation...';
  } else if (validationErrors?.length === 0) {
    icon = (
      <EuiIcon
        type="checkInCircleFilled"
        color={euiTheme.colors.vis.euiColorVisSuccess0}
        size="m"
      />
    );
    buttonContent = 'No validation errors';
  } else {
    icon = (
      <EuiIcon
        type={highestSeverity === 'error' ? 'errorFilled' : 'warningFilled'}
        color={highestSeverity === 'error' ? 'danger' : euiTheme.colors.vis.euiColorVis8}
        size="m"
      />
    );
    buttonContent = `${validationErrors?.length} validation ${
      validationErrors?.length === 1 ? 'error' : 'errors'
    }`;
  }

  const sortedValidationErrors = validationErrors?.sort((a, b) => {
    if (a.lineNumber === b.lineNumber) {
      if (a.column === b.column) {
        return severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity);
      }
      return a.column - b.column;
    }
    return a.lineNumber - b.lineNumber;
  });

  return (
    <div css={styles.container}>
      <EuiAccordion
        id={accordionId}
        key={validationErrors?.length}
        data-testid="wf-yaml-editor-validation-errors-list"
        buttonContent={
          <EuiFlexGroup alignItems="center" gutterSize="s" css={styles.buttonContent}>
            <EuiFlexItem grow={false}>{icon}</EuiFlexItem>
            <EuiFlexItem css={styles.buttonContentText}>{buttonContent}</EuiFlexItem>
          </EuiFlexGroup>
        }
        arrowDisplay={validationErrors?.length === 0 ? 'none' : 'left'}
        initialIsOpen={validationErrors !== null && validationErrors.length > 0}
        isDisabled={validationErrors?.length === 0}
      >
        <div css={styles.accordionContent}>
          <EuiFlexGroup direction="column" gutterSize="s">
            {sortedValidationErrors?.map((error, index) => (
              <EuiFlexItem
                key={`${error.lineNumber}-${error.column}-${error.message}-${index}-${error.severity}`}
                css={styles.validationErrorRow}
                onClick={() => onErrorClick?.(error)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onErrorClick?.(error);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <EuiFlexItem grow={false} css={styles.validationErrorLineNumber}>
                  <b>{error.lineNumber}</b>:{error.column}
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIcon
                    type={
                      error.severity === 'error'
                        ? 'errorFilled'
                        : error.severity === 'warning'
                        ? 'warningFilled'
                        : 'iInCircle'
                    }
                    color={
                      error.severity === 'error'
                        ? 'danger'
                        : error.severity === 'warning'
                        ? euiTheme.colors.vis.euiColorVis8
                        : 'primary'
                    }
                    size="s"
                    css={styles.validationErrorIcon}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <span>{error.message}</span>
                </EuiFlexItem>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </div>
      </EuiAccordion>
    </div>
  );
}

const componentStyles = {
  container: ({ euiTheme }: UseEuiTheme) =>
    css({
      width: '100%',
      minHeight: '48px',
      padding: `0 ${euiTheme.size.m}`,
      zIndex: 1000,
      borderTop: `1px solid ${euiTheme.colors.borderBasePlain}`,
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: euiTheme.colors.backgroundBasePlain,
    }),
  buttonContent: ({ euiTheme }: UseEuiTheme) => css`
    width: 100%;
    padding: ${euiTheme.size.m} 0;
    color: ${euiTheme.colors.textParagraph};
    flex-wrap: nowrap !important;
  `,
  buttonContentText: css({
    whiteSpace: 'nowrap',
  }),
  accordionContent: ({ euiTheme }: UseEuiTheme) =>
    css({
      maxHeight: '200px',
      overflow: 'auto',
      padding: `${euiTheme.size.s} 0`,
      borderTop: `1px solid ${euiTheme.colors.lightShade}`,
    }),
  validationErrorRow: (euiThemeContext: UseEuiTheme) =>
    css({
      fontSize: euiFontSize(euiThemeContext, 's').fontSize,
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: euiThemeContext.euiTheme.size.s,
      '&:hover': {
        textDecoration: 'underline',
      },
    }),
  validationErrorLineNumber: css({
    minWidth: '3rem',
    display: 'block',
  }),
  validationErrorIcon: css({
    marginTop: '0.125rem',
    flexShrink: 0,
  }),
};
