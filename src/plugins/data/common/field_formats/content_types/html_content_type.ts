/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { escape, isFunction } from 'lodash';
import { IFieldFormat, HtmlContextTypeConvert, FieldFormatsContentType } from '../types';
import { asPrettyString, getHighlightHtml } from '../utils';

export const HTML_CONTEXT_TYPE: FieldFormatsContentType = 'html';

const getConvertFn = (
  format: IFieldFormat,
  convert?: HtmlContextTypeConvert
): HtmlContextTypeConvert => {
  const fallbackHtml: HtmlContextTypeConvert = (value, options = {}) => {
    const { field, hit } = options;
    const formatted = escape(format.convert(value, 'text'));

    return !field || !hit || !hit.highlight || !hit.highlight[field.name]
      ? formatted
      : getHighlightHtml(formatted, hit.highlight[field.name]);
  };

  return (convert || fallbackHtml) as HtmlContextTypeConvert;
};

export const setup = (
  format: IFieldFormat,
  htmlContextTypeConvert?: HtmlContextTypeConvert
): HtmlContextTypeConvert => {
  const convert = getConvertFn(format, htmlContextTypeConvert);

  const recurse: HtmlContextTypeConvert = (value, options = {}) => {
    if (value == null) {
      return asPrettyString(value);
    }

    if (!value || !isFunction(value.map)) {
      return convert.call(format, value, options);
    }

    const subValues = value.map((v: any) => recurse(v, options));
    const useMultiLine = subValues.some((sub: string) => sub.indexOf('\n') > -1);

    return subValues.join(',' + (useMultiLine ? '\n' : ' '));
  };

  const wrap: HtmlContextTypeConvert = (value, options) => {
    return `<span ng-non-bindable>${recurse(value, options)}</span>`;
  };

  return wrap;
};
