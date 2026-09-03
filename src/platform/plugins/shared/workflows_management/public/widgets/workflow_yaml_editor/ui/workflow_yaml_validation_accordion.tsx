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
  EuiButtonIcon,
  EuiCopy,
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
import { partition } from 'lodash';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux-v7';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { AiButtonIcon } from '@kbn/shared-ux-ai-components';
import { selectWorkflowId } from '../../../entities/workflows/store/workflow_detail/selectors';
import type { YamlValidationResult } from '../../../features/validate_workflow_yaml/model/types';
import { useTelemetry } from '../../../hooks/use_telemetry';
import { FIX_WITH_AI_LABEL } from '../lib/fix_with_ai_label';

const severityOrder = ['error', 'warning'];

const copyErrorMessageLabel = i18n.translate(
  'workflowsManagement.workflowYAMLValidationErrors.copyMessage',
  {
    defaultMessage: 'Copy message',
  }
);

const copiedErrorMessageLabel = i18n.translate(
  'workflowsManagement.workflowYAMLValidationErrors.copiedMessage',
  {
    defaultMessage: 'Copied',
  }
);

/** A selection elsewhere on the page, the editor included, must not block navigation. */
const hasTextSelectionInside = (node: HTMLElement | null): boolean => {
  const selection = window.getSelection();
  if (!node || !selection || selection.isCollapsed || selection.toString().length === 0) {
    return false;
  }
  return Array.from({ length: selection.rangeCount }, (_, index) =>
    selection.getRangeAt(index)
  ).some((range) => range.intersectsNode(node));
};

interface WorkflowYamlValidationAccordionProps {
  isMounted: boolean;
  isLoading: boolean;
  error: Error | null;
  validationErrors: YamlValidationResult[] | null;
  onErrorClick?: (error: YamlValidationResult) => void;
  onFixWithAi?: (error: YamlValidationResult) => void;
  extraAction?: React.ReactNode;
}

function useGroupedErrors(allValidationErrors: YamlValidationResult[] | null) {
  const [errors, warnings] = useMemo(
    () => partition(allValidationErrors ?? [], { severity: 'error' }),
    [allValidationErrors]
  );

  const errorCount = errors.length;
  const warningCount = warnings.length;
  const highestSeverity = errorCount ? 'error' : warningCount ? 'warning' : null;

  const parts = useMemo(() => {
    const arr = [];
    if (errorCount > 0) {
      arr.push(
        i18n.translate('workflowsManagement.workflowYAMLValidationErrors.errorCount', {
          defaultMessage: '{errorCount} error{errorCount, plural, one {} other {s}}',
          values: { errorCount },
        })
      );
    }
    if (warningCount > 0) {
      arr.push(
        i18n.translate('workflowsManagement.workflowYAMLValidationErrors.warningCount', {
          defaultMessage: '{warningCount} warning{warningCount, plural, one {} other {s}}',
          values: { warningCount },
        })
      );
    }
    return arr;
  }, [errorCount, warningCount]);

  const sortedValidationErrors = useMemo(() => {
    return allValidationErrors?.toSorted((a, b) => {
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
  }, [allValidationErrors]);

  return { highestSeverity, parts, sortedValidationErrors };
}

interface ValidationErrorRowProps {
  error: YamlValidationResult;
  onErrorClick?: (error: YamlValidationResult) => void;
  onFixWithAi?: (error: YamlValidationResult) => void;
}

const ValidationErrorRow = React.memo(function ValidationErrorRow({
  error,
  onErrorClick,
  onFixWithAi,
}: ValidationErrorRowProps) {
  const styles = useMemoCss(componentStyles);
  const { euiTheme } = useEuiTheme();
  const message = error.message ?? '';

  const triggerRef = useRef<HTMLDivElement | null>(null);

  const handleRowClick = useCallback(() => {
    if (hasTextSelectionInside(triggerRef.current)) {
      return;
    }
    onErrorClick?.(error);
  }, [error, onErrorClick]);

  const handleRowKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleRowClick();
      }
    },
    [handleRowClick]
  );

  const handleFixWithAi = useCallback(() => {
    onFixWithAi?.(error);
  }, [error, onFixWithAi]);

  return (
    <div css={styles.validationError} data-test-subj="workflowYamlValidationErrorRow">
      <EuiFlexItem grow={false}>
        <EuiIcon
          type={
            error.severity === 'error'
              ? 'errorFill'
              : error.severity === 'warning'
              ? 'warningFill'
              : 'info'
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
          aria-hidden={true}
        />
      </EuiFlexItem>
      <EuiFlexItem css={styles.validationErrorText}>
        <div
          ref={triggerRef}
          role="button"
          tabIndex={0}
          css={styles.validationErrorTrigger}
          data-test-subj="workflowYamlValidationErrorMessage"
          onClick={handleRowClick}
          onKeyDown={handleRowKeyDown}
        >
          <EuiText color="text" size="xs" component="span">
            <span className="validation-error-message">{message}</span>
          </EuiText>
          <EuiText color="subdued" size="xs" component="span" css={styles.validationErrorLocation}>
            <span>
              <FormattedMessage
                id="workflowsManagement.workflowYAMLValidationErrors.lineAndColumn"
                defaultMessage="Ln {lineNumber}, Col {columnNumber}"
                values={{
                  lineNumber: error.startLineNumber,
                  columnNumber: error.startColumn,
                }}
              />
            </span>
          </EuiText>
          {error.ruleId ? (
            <EuiText color="subdued" size="xs" component="span" css={styles.validationErrorMeta}>
              <span>{error.ruleId}</span>
            </EuiText>
          ) : null}
        </div>
      </EuiFlexItem>
      {onFixWithAi || message ? (
        <EuiFlexItem grow={false} css={styles.rowActions}>
          <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
            {onFixWithAi ? (
              <EuiFlexItem grow={false}>
                <AiButtonIcon
                  iconType="productAgent"
                  aria-label={FIX_WITH_AI_LABEL}
                  size="xs"
                  variant="empty"
                  withToolTip
                  data-test-subj="workflowYamlValidationErrorFixWithAiButton"
                  onClick={handleFixWithAi}
                />
              </EuiFlexItem>
            ) : null}
            {message ? (
              <EuiFlexItem grow={false}>
                <EuiCopy
                  textToCopy={message}
                  beforeMessage={copyErrorMessageLabel}
                  afterMessage={copiedErrorMessageLabel}
                >
                  {(copy) => (
                    <EuiButtonIcon
                      iconType="copy"
                      aria-label={copyErrorMessageLabel}
                      size="xs"
                      color="text"
                      data-test-subj="workflowYamlValidationErrorCopyButton"
                      onClick={copy}
                    />
                  )}
                </EuiCopy>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
      ) : null}
    </div>
  );
});

export const WorkflowYamlValidationAccordion = React.memo(function WorkflowYamlValidationAccordion({
  isMounted,
  isLoading,
  error: errorValidating,
  validationErrors,
  onErrorClick,
  onFixWithAi,
  extraAction,
}: WorkflowYamlValidationAccordionProps) {
  const styles = useMemoCss(componentStyles);
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({ prefix: 'wf-yaml-editor-validation-errors' });
  const workflowId = useSelector(selectWorkflowId);
  const telemetry = useTelemetry();
  const previousErrorsRef = useRef<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const onToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  let icon: React.ReactNode | null = null;
  let buttonContent: React.ReactNode | null = null;

  const allValidationErrors: YamlValidationResult[] = useMemo(
    () =>
      validationErrors?.filter(
        (validationError) =>
          validationError.severity === 'error' || validationError.severity === 'warning'
      ) ?? [],
    [validationErrors]
  );
  const hasAccordionContent = allValidationErrors.length > 0;

  // Not while loading: validation clears its results when connector types reload, and the
  // accordion should not snap shut across that gap.
  useEffect(() => {
    if (!hasAccordionContent && !isLoading && isMounted) {
      setIsOpen(false);
    }
  }, [hasAccordionContent, isLoading, isMounted]);

  // Report telemetry when validation errors change (only when errors are present and stable)
  useEffect(() => {
    // Only report if validation is complete (not loading) and there are errors
    if (!isLoading && isMounted && allValidationErrors.length > 0) {
      // Create a stable key from error set to detect actual changes
      const errorKey = allValidationErrors
        .map((e) => `${e.owner}-${e.startLineNumber}-${e.startColumn}`)
        .sort()
        .join('|');

      // Only report if the error set has actually changed
      if (errorKey !== previousErrorsRef.current) {
        previousErrorsRef.current = errorKey;
        telemetry.reportWorkflowValidationError({
          workflowId,
          validationResults: allValidationErrors,
          editorType: 'yaml', // Validation always happens in YAML editor context
        });
      }
    } else if (!isLoading && isMounted && allValidationErrors.length === 0) {
      // Clear the previous errors ref when there are no errors
      previousErrorsRef.current = '';
    }
  }, [isLoading, isMounted, allValidationErrors, workflowId, telemetry]);

  const { parts, highestSeverity, sortedValidationErrors } = useGroupedErrors(allValidationErrors);

  if (!isMounted) {
    icon = <EuiLoadingSpinner size="m" />;
    buttonContent = i18n.translate(
      'workflowsManagement.workflowYAMLValidationErrors.loadingEditor',
      {
        defaultMessage: 'Loading editor...',
      }
    );
  } else if (!allValidationErrors || isLoading) {
    icon = <EuiLoadingSpinner size="m" />;
    buttonContent = i18n.translate(
      'workflowsManagement.workflowYAMLValidationErrors.initializingValidation',
      {
        defaultMessage: 'Initializing validation...',
      }
    );
  } else if (errorValidating) {
    icon = <EuiIcon type="errorFill" color="danger" size="m" aria-hidden={true} />;
    buttonContent = errorValidating.message;
  } else if (allValidationErrors.length === 0) {
    icon = (
      <EuiIcon
        type="checkCircleFill"
        color={euiTheme.colors.vis.euiColorVisSuccess0}
        size="m"
        aria-hidden={true}
      />
    );
    buttonContent = i18n.translate('workflowsManagement.workflowYAMLValidationErrors.noErrors', {
      defaultMessage: 'No validation errors',
    });
  } else {
    icon = (
      <EuiIcon
        type={highestSeverity === 'error' ? 'errorFill' : 'warningFill'}
        color={highestSeverity === 'error' ? 'danger' : euiTheme.colors.vis.euiColorVis8}
        size="m"
        aria-hidden={true}
      />
    );

    buttonContent = parts.join(', ');
  }

  return (
    <EuiAccordion
      id={accordionId}
      data-test-subj="workflowYamlEditorValidationErrorsList"
      buttonContent={
        <EuiFlexGroup
          alignItems="center"
          gutterSize="s"
          css={styles.buttonContent}
          responsive={false}
        >
          <EuiFlexItem grow={false}>{icon}</EuiFlexItem>
          <EuiFlexItem
            css={styles.buttonContentText}
            className="button-content-text"
            data-test-subj={errorValidating ? 'workflowValidationRunError' : undefined}
          >
            {buttonContent}
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      arrowDisplay={hasAccordionContent ? 'left' : 'none'}
      isDisabled={!hasAccordionContent}
      forceState={isOpen ? 'open' : 'closed'}
      onToggle={onToggle}
      css={styles.accordion}
      extraAction={extraAction}
    >
      <div css={styles.separator} />
      <div css={styles.accordionContent} className="eui-yScrollWithShadows">
        <EuiFlexGroup direction="column" gutterSize="s">
          {sortedValidationErrors?.map((error, index) => (
            <ValidationErrorRow
              key={`${error.startLineNumber}-${error.startColumn}-${error.message}-${index}-${error.severity}`}
              error={error}
              onErrorClick={onErrorClick}
              onFixWithAi={onFixWithAi}
            />
          ))}
        </EuiFlexGroup>
      </div>
    </EuiAccordion>
  );
});

const componentStyles = {
  accordion: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: `0 ${euiTheme.size.m}`,
      borderTop: `1px solid ${euiTheme.colors.borderBasePlain}`,
      backgroundColor: euiTheme.colors.backgroundBasePlain,

      '& .euiAccordion__buttonContent': {
        width: '100%',
      },

      // apply underline only to the button content text, not the right side
      '& .euiAccordion__button:hover:not(:disabled), & .euiAccordion__button:focus:not(:disabled)':
        {
          textDecoration: 'none !important',
          '& .button-content-text': {
            textDecoration: 'underline',
          },
        },
    }),
  buttonContent: ({ euiTheme }: UseEuiTheme) => css`
    width: 100%;
    // using min-height to avoid jumping when right side is present/absent
    min-height: 48px;
    padding: ${euiTheme.size.s} 0;
    color: ${euiTheme.colors.textParagraph};
    flex-wrap: nowrap !important;
  `,
  buttonContentText: (euiThemeContext: UseEuiTheme) =>
    css({
      ...euiFontSize(euiThemeContext, 'xs'),
      whiteSpace: 'nowrap',
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
      textAlign: 'left',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: euiThemeContext.euiTheme.size.s,
      userSelect: 'text',
    }),
  validationErrorTrigger: css({
    cursor: 'pointer',
    '&:hover .validation-error-message, &:focus-visible .validation-error-message': {
      textDecoration: 'underline',
    },
  }),
  validationErrorText: css({
    minWidth: 0,
  }),
  validationErrorLocation: ({ euiTheme }: UseEuiTheme) =>
    css({
      marginLeft: euiTheme.size.s,
      whiteSpace: 'nowrap',
    }),
  validationErrorMeta: ({ euiTheme }: UseEuiTheme) =>
    css({
      marginLeft: euiTheme.size.s,
    }),
  validationErrorIcon: css({
    marginTop: '0.125rem',
    flexShrink: 0,
  }),
  rowActions: css({
    flexShrink: 0,
    userSelect: 'none',
  }),
};
