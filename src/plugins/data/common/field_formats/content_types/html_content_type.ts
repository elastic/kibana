/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { escape, isFunction } from 'lodash';
import { FieldFormatConvert, IFieldFormat, HtmlContextTypeConvert } from '../types';

import { asPrettyString, getHighlightHtml } from '../utils';

export const HTML_CONTEXT_TYPE = 'html';

const getConvertFn = (
  format: IFieldFormat,
  fieldFormatConvert: Partial<FieldFormatConvert>
): HtmlContextTypeConvert => {
  const fallbackHtml: HtmlContextTypeConvert = (value, field, hit) => {
    const formatted = escape(format.convert(value, 'text'));

    return !field || !hit || !hit.highlight || !hit.highlight[field.name]
      ? formatted
      : getHighlightHtml(formatted, hit.highlight[field.name]);
  };

  return (fieldFormatConvert[HTML_CONTEXT_TYPE] || fallbackHtml) as HtmlContextTypeConvert;
};

export const setup = (
  format: IFieldFormat,
  fieldFormatConvert: Partial<FieldFormatConvert>
): HtmlContextTypeConvert => {
  const convert = getConvertFn(format, fieldFormatConvert);

  const recurse: HtmlContextTypeConvert = (value, field, hit, meta) => {
    if (value == null) {
      return asPrettyString(value);
    }

    if (!value || !isFunction(value.map)) {
      return convert.call(format, value, field, hit, meta);
    }

    const subValues = value.map((v: any) => {
      return recurse(v, field, hit, meta);
    });
    const useMultiLine = subValues.some((sub: any) => {
      return sub.indexOf('\n') > -1;
    });

    return subValues.join(',' + (useMultiLine ? '\n' : ' '));
  };

  const wrap: HtmlContextTypeConvert = (value, field, hit, meta) => {
    return `<span ng-non-bindable>${recurse(value, field, hit, meta)}</span>`;
  };

  return wrap;
};
