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
import { EuiLoadingSpinner, EuiIcon } from '@elastic/eui';
import { YamlValidationError } from '../model/types';

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
  if (!isMounted) {
    return (
      <div
        css={css`
          background-color: #f3f4f6;
          font-size: 0.875rem;
          display: flex;
          align-items: flex-start;
          gap: 0.25rem;
          padding: 0.25rem 1rem;
          z-index: 10;
          border-top: 1px solid #e5e7eb;
        `}
        data-testid="wf-yaml-editor-validation-errors-loading"
      >
        <EuiLoadingSpinner
          size="s"
          css={css`
            margin-top: 0.125rem;
          `}
        />
        Loading editor...
      </div>
    );
  }

  if (!validationErrors) {
    return (
      <div
        css={css`
          background-color: #f3f4f6;
          font-size: 0.875rem;
          display: flex;
          align-items: flex-start;
          gap: 0.25rem;
          padding: 0.25rem 1rem;
          z-index: 10;
          border-top: 1px solid #e5e7eb;
        `}
        data-testid="wf-yaml-editor-validation-errors-initializing"
      >
        <EuiLoadingSpinner
          size="s"
          css={css`
            margin-top: 0.125rem;
          `}
        />
        Initializing validation...
      </div>
    );
  }

  const highestSeverity = validationErrors.reduce((acc: string | null, error) => {
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

  if (validationErrors.length === 0) {
    return (
      <div
        css={css`
          background-color: white;
          font-size: 0.875rem;
          display: flex;
          align-items: flex-start;
          gap: 0.25rem;
          padding: 0.25rem 1rem;
          z-index: 10;
          border-top: 1px solid #e5e7eb;
        `}
        data-testid="wf-yaml-editor-validation-errors-no-errors"
      >
        <EuiIcon
          type="check"
          color="success"
          size="s"
          css={css`
            margin-top: 0.125rem;
            flex-shrink: 0;
          `}
        />
        No validation errors
      </div>
    );
  }

  const sortedValidationErrors = validationErrors.sort((a, b) => {
    if (a.lineNumber === b.lineNumber) {
      if (a.column === b.column) {
        return severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity);
      }
      return a.column - b.column;
    }
    return a.lineNumber - b.lineNumber;
  });

  const getBackgroundColor = (severity: string) => {
    switch (severity) {
      case 'info':
        return '#dbeafe';
      case 'warning':
        return '#fef3c7';
      case 'error':
        return '#fee2e2';
      default:
        return 'white';
    }
  };

  return (
    <details
      css={css`
        border-top: 1px solid #e5e7eb;
        z-index: 10;
        background-color: ${getBackgroundColor(highestSeverity || '')};
      `}
      data-testid="wf-yaml-editor-validation-errors"
      open={validationErrors.length < 5}
    >
      <summary
        css={css`
          font-size: 0.875rem;
          cursor: pointer;
          gap: 0.25rem;
          padding: 0.25rem 1rem;
          &:hover {
            text-decoration: underline;
          }
        `}
        data-testid="wf-yaml-editor-validation-errors-summary"
      >
        {`${validationErrors.length} validation ${
          validationErrors.length === 1 ? 'error' : 'errors'
        }`}
      </summary>
      <div
        css={css`
          display: flex;
          flex-direction: column;
        `}
        data-testid="wf-yaml-editor-validation-errors-list"
      >
        {sortedValidationErrors.map((error, index) => (
          <div
            key={`${error.lineNumber}-${error.column}-${error.message}-${index}-${error.severity}`}
            css={css`
              font-size: 0.875rem;
              cursor: pointer;
              display: flex;
              align-items: flex-start;
              gap: 0.25rem;
              padding: 0.25rem 1rem;
              background-color: ${getBackgroundColor(error.severity)};
              &:hover {
                text-decoration: underline;
              }
            `}
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
            <EuiIcon
              type={
                error.severity === 'error'
                  ? 'alert'
                  : error.severity === 'warning'
                  ? 'warning'
                  : 'iInCircle'
              }
              color={
                error.severity === 'error'
                  ? 'danger'
                  : error.severity === 'warning'
                  ? 'warning'
                  : 'primary'
              }
              size="s"
              css={css`
                margin-top: 0.125rem;
                flex-shrink: 0;
              `}
            />
            <span
              css={css`
                font-size: 0.875rem;
                display: flex;
              `}
            >
              <span
                css={css`
                  opacity: 0.7;
                  min-width: 3rem;
                `}
              >
                {error.lineNumber}:{error.column}
              </span>
              <span>{error.message}</span>
            </span>
          </div>
        ))}
      </div>
    </details>
  );
}
