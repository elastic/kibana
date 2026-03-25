/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IFieldFormat, HtmlLinkContextTypeConvert, FieldFormatsContentType } from '../types';
import { asPrettyString } from '../utils';
import { setup as html_setup} from './html_content_type';

export const HTML_LINK_CONTEXT_TYPE: FieldFormatsContentType = 'link';

export const setup = (
  format: IFieldFormat,
  convert: HtmlLinkContextTypeConvert = asPrettyString
): HtmlLinkContextTypeConvert => {
  const htmlConvertFn = html_setup(format, convert);

  const wrapAsLink: HtmlLinkContextTypeConvert = (value, options) => {
    if (!(options?.link)) {
      return htmlConvertFn(value, options);
    }

    return `<a href="${options?.link}" target="_blank">${htmlConvertFn(value, options)}</a>`;
  }
  return wrapAsLink;
};
