/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FC, type ReactNode, memo, useMemo } from 'react';
import type { IFieldFormat, HtmlContextTypeOptions, ReactContextTypeOptions } from '../../common';

/**
 * Props for the FormattedValue component
 */
export interface FormattedValueProps {
  /**
   * The field formatter instance to use
   */
  fieldFormat: IFieldFormat;

  /**
   * The raw value to format
   */
  value: unknown;

  /**
   * Options passed to the formatter (field, hit with highlight data, etc.)
   */
  options?: HtmlContextTypeOptions & ReactContextTypeOptions;

  /**
   * Optional CSS class name to apply to the wrapper element
   * (only used when rendering via legacy HTML adapter)
   */
  className?: string;

  /**
   * Optional test subject for E2E testing
   */
  'data-test-subj'?: string;
}

/**
 * Whether to log deprecation warnings for legacy HTML usage in development.
 * Can be controlled via environment for testing purposes.
 */
const ENABLE_LEGACY_WARNINGS =
  process.env.NODE_ENV === 'development' && !process.env.DISABLE_FIELD_FORMAT_DEPRECATION_WARNINGS;

/**
 * Whether to enforce strict React mode (throw error if formatter doesn't support React).
 * Enable this in development to catch migration gaps early.
 * Set FIELD_FORMAT_STRICT_REACT_MODE=true to enable.
 */
const STRICT_REACT_MODE =
  process.env.NODE_ENV === 'development' && process.env.FIELD_FORMAT_STRICT_REACT_MODE === 'true';

/**
 * Track which formatters have already logged deprecation warnings
 * to avoid spamming the console.
 */
const warnedFormatters = new Set<string>();

/**
 * Log a deprecation warning for a formatter that doesn't support React rendering.
 * In strict mode, throws an error instead to help identify migration gaps.
 *
 * @throws Error in strict mode when a formatter doesn't support React rendering
 */
const logLegacyAdapterUsage = (formatterId: string): void => {
  if (STRICT_REACT_MODE) {
    throw new Error(
      `[field-formats] Strict React mode: Formatter "${formatterId}" does not support React rendering. ` +
        `Implement reactConvert on the formatter or disable strict mode by removing ` +
        `FIELD_FORMAT_STRICT_REACT_MODE from the environment.`
    );
  }

  if (!ENABLE_LEGACY_WARNINGS || warnedFormatters.has(formatterId)) {
    return;
  }

  warnedFormatters.add(formatterId);
  // eslint-disable-next-line no-console
  console.warn(
    `[field-formats] DEPRECATION: Formatter "${formatterId}" does not support React rendering. ` +
      `Using legacy HTML adapter with dangerouslySetInnerHTML. ` +
      `This is deprecated and will be removed in a future version. ` +
      `Migrate to reactConvert for improved security and performance. ` +
      `See @kbn/field-formats-plugin README for migration guidance.`
  );
};

/**
 * Internal component that renders formatter HTML output via dangerouslySetInnerHTML.
 *
 * This is the ONLY place in the codebase where formatter HTML output should be
 * rendered using dangerouslySetInnerHTML. All consumers should use FormattedValue
 * instead of implementing their own dangerouslySetInnerHTML rendering.
 *
 * The HTML output from formatters is sanitized by the formatters themselves
 * (via lodash escape) and is considered safe for rendering.
 */
const LegacyHtmlAdapter: FC<{
  html: string;
  className?: string;
  'data-test-subj'?: string;
}> = memo(({ html, className, 'data-test-subj': dataTestSubj }) => {
  return (
    <span
      className={className}
      data-test-subj={dataTestSubj}
      // The HTML from field formatters is sanitized and safe for rendering.
      // This adapter is the centralized location for all formatter HTML rendering.
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

LegacyHtmlAdapter.displayName = 'LegacyHtmlAdapter';

/**
 * Renders a formatted field value using the most appropriate rendering path.
 *
 * This component is the primary way to render formatted values in React UIs.
 * It automatically selects the best rendering approach:
 *
 * 1. **React rendering (preferred)**: If the formatter supports `reactConvert`,
 *    the value is rendered directly as a React element without any HTML parsing.
 *
 * 2. **Legacy HTML adapter (fallback)**: If the formatter only supports `htmlConvert`,
 *    the HTML string is rendered via a centralized adapter using dangerouslySetInnerHTML.
 *    A deprecation warning is logged in development mode to encourage migration.
 *
 * ## Usage
 *
 * ```tsx
 * import { FormattedValue } from '@kbn/field-formats-plugin/public';
 *
 * <FormattedValue
 *   fieldFormat={dataView.getFormatterForField(field)}
 *   value={row.flattened[field.name]}
 *   options={{ field, hit: row.raw }}
 *   className="myCustomClass"
 * />
 * ```
 *
 * ## Migration Path
 *
 * Consumers that currently use `dangerouslySetInnerHTML` with formatter HTML output
 * should migrate to using this component. This provides:
 * - Automatic upgrade path when formatters add React support
 * - Centralized HTML rendering for easier security auditing
 * - Deprecation tracking to help prioritize formatter migrations
 *
 * @public
 */
export const FormattedValue: FC<FormattedValueProps> = memo(
  ({ fieldFormat, value, options = {}, className, 'data-test-subj': dataTestSubj }) => {
    const formattedContent = useMemo<ReactNode>(() => {
      // Try React rendering first (preferred path)
      const reactResult = fieldFormat.convertToReact(value, { ...options, className });
      if (reactResult !== undefined) {
        return reactResult;
      }

      // Fall back to HTML rendering via legacy adapter
      const formatterId = fieldFormat.type?.id ?? 'unknown';
      logLegacyAdapterUsage(formatterId);

      const htmlResult = fieldFormat.convert(value, 'html', options);
      return (
        <LegacyHtmlAdapter html={htmlResult} className={className} data-test-subj={dataTestSubj} />
      );
    }, [fieldFormat, value, options, className, dataTestSubj]);

    // If React rendering was used directly, wrap in span for consistent structure
    if (fieldFormat.hasReactSupport()) {
      return (
        <span className={className} data-test-subj={dataTestSubj}>
          {formattedContent}
        </span>
      );
    }

    // Legacy adapter already renders the span
    return <>{formattedContent}</>;
  }
);

FormattedValue.displayName = 'FormattedValue';
