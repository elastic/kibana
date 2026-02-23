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

const HTML_TAG_RE = /<[^>]+>/;

const HTML_ENTITY_RE = /&(?:#\d+|#x[\da-fA-F]+|[a-zA-Z]+);/;

/**
 * Decodes HTML entities in a string that contains no HTML tags.
 * Only invoked on tag-free strings, so a minimal set of common entities suffices.
 */
const decodeHTMLEntities = (html: string): string => {
  if (!HTML_ENTITY_RE.test(html)) {
    return html;
  }
  return html
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&#x27;', "'");
};

/**
 * Creates a fallback wrapper that converts HTML output to a ReactNode.
 * If the HTML contains no tags, decodes entities and returns plain text.
 * Otherwise wraps via dangerouslySetInnerHTML — identical to what consumers do today.
 */
const createHtmlFallback = (format: IFieldFormat): ReactContextTypeConvert => {
  return (value, options = {}) => {
    const html: string = format.convert(value, 'html', options);

    if (!HTML_TAG_RE.test(html)) {
      return decodeHTMLEntities(html);
    }

    // eslint-disable-next-line react/no-danger
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };
};

const getConvertFn = (
  format: IFieldFormat,
  convert?: ReactContextTypeConvert
): ReactContextTypeConvert => {
  return convert ?? createHtmlFallback(format);
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
