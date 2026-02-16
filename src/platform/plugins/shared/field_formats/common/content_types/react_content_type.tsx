/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { isFunction } from 'lodash';
import type {
  IFieldFormat,
  ReactContextTypeConvert,
  FieldFormatsContentType,
} from '../types';

export const REACT_CONTEXT_TYPE: FieldFormatsContentType = 'react';

const HTML_TAG_RE = /<[^>]+>/;

/**
 * Creates a fallback wrapper that converts HTML output to a ReactNode.
 * If the HTML contains no tags, renders as plain text (no dangerouslySetInnerHTML).
 * Otherwise wraps via dangerouslySetInnerHTML — identical to what consumers do today.
 */
const createHtmlFallback = (format: IFieldFormat): ReactContextTypeConvert => {
  return (value, options = {}) => {
    const html: string = format.convert(value, 'html', options);

    if (!HTML_TAG_RE.test(html)) {
      return html;
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
  const highlight = (text: string) => (
    <span className="ffArray__highlight">{text}</span>
  );

  const recurse: ReactContextTypeConvert = (value, options = {}) => {
    if (!value || !isFunction(value.map)) {
      return convert.call(format, value, options);
    }

    const subValues: React.ReactNode[] = value.map((v: unknown, idx: number) =>
      recurse(v, options)
    );

    const useMultiLine = subValues.some(
      (sub) => typeof sub === 'string' && sub.indexOf('\n') > -1
    );

    const result: React.ReactNode[] = [];
    subValues.forEach((sub, idx) => {
      if (idx > 0) {
        result.push(
          <React.Fragment key={`sep-${idx}`}>
            {highlight(',')}
            {useMultiLine ? '\n' : ' '}
          </React.Fragment>
        );
      }
      result.push(<React.Fragment key={`val-${idx}`}>{sub}</React.Fragment>);
    });

    return <>{result}</>;
  };

  const wrap: ReactContextTypeConvert = (value, options) => {
    const convertedValue = recurse(value, options);

    if (!Array.isArray(value) || value.length < 2) {
      return convertedValue;
    }

    const hasNewlines =
      typeof convertedValue === 'string' && convertedValue.includes('\n');

    if (hasNewlines) {
      return (
        <>
          {highlight('[')}
          {'\n  '}
          {convertedValue}
          {'\n'}
          {highlight(']')}
        </>
      );
    }

    return (
      <>
        {highlight('[')}
        {convertedValue}
        {highlight(']')}
      </>
    );
  };

  return wrap;
};
