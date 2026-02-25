/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createElement } from 'react';
import type { ReactNode } from 'react';
import { isFunction } from 'lodash';
import { EMPTY_LABEL, MISSING_TOKEN, NULL_LABEL } from '@kbn/field-formats-common';
import type {
  IFieldFormat,
  ReactContextTypeConvert,
  ReactContextTypeOptions,
  FieldFormatsContentType,
} from '../types';

export const REACT_CONTEXT_TYPE: FieldFormatsContentType = 'react';

/**
 * React equivalent of checkForMissingValueHtml — returns a ReactNode
 * with the appropriate empty/missing label wrapped in a span.
 * Exported so individual formatters can use it in their reactConvert methods.
 */
export const checkForMissingValueReact = (val: unknown): ReactNode | void => {
  if (val === '') {
    return createElement('span', { className: 'ffString__emptyValue' }, EMPTY_LABEL);
  }
  if (val == null || val === MISSING_TOKEN) {
    return createElement('span', { className: 'ffString__emptyValue' }, NULL_LABEL);
  }
};

/**
 * Creates a plain-text fallback for formatters that don't define reactConvert.
 * Delegates to the text content type — no HTML, no dangerouslySetInnerHTML.
 */
const createTextFallback = (format: IFieldFormat): ReactContextTypeConvert => {
  return (value, options = {}) => {
    return format.convert(value, 'text', options);
  };
};

const getConvertFn = (
  format: IFieldFormat,
  convert?: ReactContextTypeConvert
): ReactContextTypeConvert => {
  return convert ?? createTextFallback(format);
};

export const setup = (
  format: IFieldFormat,
  reactContextTypeConvert?: ReactContextTypeConvert
): ReactContextTypeConvert => {
  const convert = getConvertFn(format, reactContextTypeConvert);
  const highlight = (text: string) => <span className="ffArray__highlight">{text}</span>;

  interface RecurseResult {
    node: React.ReactNode;
    hasNewlines: boolean;
  }

  const recurse = (value: unknown, options: ReactContextTypeOptions = {}): RecurseResult => {
    if (!value || !isFunction((value as { map?: unknown }).map)) {
      const node = convert.call(format, value, options);
      const hasNewlines = typeof node === 'string' && node.includes('\n');
      return { node, hasNewlines };
    }

    const subResults: RecurseResult[] = (value as unknown[]).map((v) => recurse(v, options));
    const hasNewlines = subResults.some((r) => r.hasNewlines);

    const result: React.ReactNode[] = [];
    for (let idx = 0; idx < subResults.length; idx++) {
      if (idx > 0) {
        result.push(
          <React.Fragment key={`sep-${idx}`}>
            {highlight(',')}
            {hasNewlines ? '\n' : ' '}
          </React.Fragment>
        );
      }
      result.push(<React.Fragment key={`val-${idx}`}>{subResults[idx].node}</React.Fragment>);
    }

    return { node: <>{result}</>, hasNewlines };
  };

  const wrap: ReactContextTypeConvert = (value, options) => {
    const { node, hasNewlines } = recurse(value, options);

    if (!Array.isArray(value) || value.length < 2) {
      return node;
    }

    if (hasNewlines) {
      return (
        <>
          {highlight('[')}
          {'\n  '}
          {node}
          {'\n'}
          {highlight(']')}
        </>
      );
    }

    return (
      <>
        {highlight('[')}
        {node}
        {highlight(']')}
      </>
    );
  };

  return wrap;
};
