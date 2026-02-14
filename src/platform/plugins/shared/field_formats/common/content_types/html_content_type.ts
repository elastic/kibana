/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { escape, isFunction } from 'lodash';
import type { IFieldFormat, HtmlContextTypeConvert, FieldFormatsContentType } from '../types';
import { getHighlightHtml } from '../utils';

export const HTML_CONTEXT_TYPE: FieldFormatsContentType = 'html';

/**
 * @internal
 * Temporary telemetry for tracking legacy HTML render path usage during React migration.
 * Logs formatter ID when HTML conversion is invoked in development mode.
 * TODO: Remove after React migration is complete (see issue #383)
 */
const logLegacyHtmlUsage = (() => {
  const loggedFormatters = new Set<string>();

  return (formatId: string, hasCustomHtmlConvert: boolean) => {
    if (process.env.NODE_ENV === 'development' && !loggedFormatters.has(formatId)) {
      loggedFormatters.add(formatId);
      // eslint-disable-next-line no-console
      console.debug(
        `[field-formats] Legacy HTML render path used for formatter "${formatId}"` +
          (hasCustomHtmlConvert ? ' (custom htmlConvert)' : ' (fallback)')
      );
    }
  };
})();

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
  const highlight = (text: string) => `<span class="ffArray__highlight">${text}</span>`;
  const formatId = format.type?.id ?? 'unknown';
  const hasCustomHtmlConvert = Boolean(htmlContextTypeConvert);

  const recurse: HtmlContextTypeConvert = (value, options = {}) => {
    if (!value || !isFunction(value.map)) {
      logLegacyHtmlUsage(formatId, hasCustomHtmlConvert);
      return convert.call(format, value, options);
    }

    const subValues = value.map((v: unknown) => recurse(v, options));
    const useMultiLine = subValues.some((sub: string) => sub.indexOf('\n') > -1);

    return subValues.join(highlight(',') + (useMultiLine ? '\n' : ' '));
  };

  const wrap: HtmlContextTypeConvert = (value, options) => {
    const convertedValue = recurse(value, options);

    if (!Array.isArray(value) || value.length < 2) {
      return convertedValue;
    }

    if (convertedValue.includes('\n')) {
      const indentedValue = convertedValue.replaceAll(/(\n+)/g, '$1  ');

      return highlight('[') + `\n  ${indentedValue}\n` + highlight(']');
    }

    return highlight('[') + convertedValue + highlight(']');
  };

  return wrap;
};
