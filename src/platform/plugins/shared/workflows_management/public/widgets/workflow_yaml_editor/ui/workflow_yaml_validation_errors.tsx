/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  euiFontSize,
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type {
  YamlValidationErrorSeverity,
  YamlValidationResult,
} from '../../../features/validate_workflow_yaml/model/types';

const severityOrder = ['error', 'warning', 'info'];

interface WorkflowYAMLValidationErrorsProps {
  isMounted: boolean;
  isLoading: boolean;
  error: Error | null;
  validationErrors: YamlValidationResult[] | null;
  onErrorClick?: (error: YamlValidationResult) => void;
  rightSide?: React.ReactNode;
}

export function WorkflowYAMLValidationErrors({
  isMounted,
  isLoading,
  error: errorValidating,
  validationErrors,
  onErrorClick,
  rightSide,
}: WorkflowYAMLValidationErrorsProps) {
  const styles = useMemoCss(componentStyles);
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({ prefix: 'wf-yaml-editor-validation-errors' });
  let icon: React.ReactNode | null = null;
  let buttonContent: React.ReactNode | null = null;

  const allValidationErrors: YamlValidationResult[] = [
    ...(validationErrors || []),
    ...(errorValidating
      ? [
          {
            id: 'error-validating',
            endLineNumber: 0,
            endColumn: 0,
            hoverMessage: null,
            severity: 'error' as YamlValidationErrorSeverity,
            message: errorValidating.message,
            owner: 'variable-validation' as YamlValidationResult['owner'],
            startLineNumber: 0,
            startColumn: 0,
            afterMessage: null,
          },
        ]
      : []),
  ];

  const highestSeverity = allValidationErrors?.reduce((acc: string | null, error) => {
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
  } else if (!allValidationErrors || isLoading) {
    icon = <EuiLoadingSpinner size="m" />;
    buttonContent = 'Initializing validation...';
  } else if (allValidationErrors?.length === 0) {
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
    buttonContent = `${allValidationErrors?.length} validation ${
      allValidationErrors?.length === 1 ? 'error' : 'errors'
    }`;
  }

  const sortedValidationErrors = allValidationErrors?.sort((a, b) => {
    if (a.startLineNumber === b.startLineNumber) {
      if (a.startColumn === b.startColumn) {
        if (a.severity && b.severity) {
          return severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity);
        }
        return 0;
      }
      return a.startColumn - b.startColumn;
    }
    return a.startLineNumber - b.startLineNumber;
  });

  return (
    <EuiAccordion
      id={accordionId}
      data-testid="wf-yaml-editor-validation-errors-list"
      buttonContent={
        <EuiFlexGroup alignItems="center" gutterSize="s" css={styles.buttonContent}>
          <EuiFlexItem grow={false}>{icon}</EuiFlexItem>
          <EuiFlexItem css={styles.buttonContentText} className="button-content-text">
            {buttonContent}
          </EuiFlexItem>
          <EuiFlexItem css={styles.buttonContentRightSide} grow={false}>
            {rightSide}
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      arrowDisplay={
        allValidationErrors !== null && allValidationErrors.length > 0 ? 'left' : 'none'
      }
      initialIsOpen={allValidationErrors !== null && allValidationErrors.length > 0}
      isDisabled={allValidationErrors == null || allValidationErrors.length === 0}
      css={styles.accordion}
    >
      <div css={styles.separator} />
      <div css={styles.accordionContent} className="eui-yScrollWithShadows">
        <EuiFlexGroup direction="column" gutterSize="s">
          {sortedValidationErrors?.map((error, index) => (
            <button
              type="button"
              key={`${error.startLineNumber}-${error.startColumn}-${error.message}-${index}-${error.severity}`}
              css={styles.validationError}
              onClick={() => onErrorClick?.(error)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onErrorClick?.(error);
                }
              }}
              tabIndex={0}
            >
              <EuiFlexItem grow={false} css={styles.validationErrorLineNumber}>
                <b>{error.startLineNumber}</b>
                {':'}
                {error.startColumn}
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
                <EuiText color="text" size="xs">
                  <span>{error.message}</span>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText color="subdued" size="xs">
                  <span>{error.source}</span>
                </EuiText>
              </EuiFlexItem>
            </button>
          ))}
        </EuiFlexGroup>
      </div>
    </EuiAccordion>
  );
}

const componentStyles = {
  accordion: ({ euiTheme }: UseEuiTheme) =>
    css({
      height: '100%',
      padding: `0 ${euiTheme.size.m}`,
      borderTop: `1px solid ${euiTheme.colors.borderBasePlain}`,
      backgroundColor: euiTheme.colors.backgroundBasePlain,

      '& .euiAccordion__buttonContent': {
        width: '100%',
      },

      // apply underline only to the button content text, not the right side
      '& .euiAccordion__button:hover, & .euiAccordion__button:focus': {
        textDecoration: 'none !important',
        '& .button-content-text': {
          textDecoration: 'underline',
        },
      },
    }),
  buttonContent: ({ euiTheme }: UseEuiTheme) => css`
    width: 100%;
    padding: ${euiTheme.size.s} 0;
    color: ${euiTheme.colors.textParagraph};
    flex-wrap: nowrap !important;
  `,
  buttonContentText: (euiThemeContext: UseEuiTheme) =>
    css({
      ...euiFontSize(euiThemeContext, 'xs'),
      whiteSpace: 'nowrap',
    }),
  buttonContentRightSide: css({
    justifySelf: 'flex-end',
  }),
  accordionContent: ({ euiTheme }: UseEuiTheme) =>
    css({
      maxHeight: '200px',
      overflowY: 'auto',
      padding: euiTheme.size.s,
      position: 'relative',
    }),
  separator: ({ euiTheme }: UseEuiTheme) =>
    css({
      borderTop: `1px solid ${euiTheme.colors.borderBasePlain}`,
    }),
  validationError: (euiThemeContext: UseEuiTheme) =>
    css({
      ...euiFontSize(euiThemeContext, 'xs'),
      // override default button styles
      textAlign: 'left',
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
