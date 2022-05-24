/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isFunction } from 'lodash';
import { IFieldFormat, TextContextTypeConvert, FieldFormatsContentType } from '../types';
import { asPrettyString } from '../utils';

export const TEXT_CONTEXT_TYPE: FieldFormatsContentType = 'text';

export const setup = (
  format: IFieldFormat,
  convert: TextContextTypeConvert = asPrettyString
): TextContextTypeConvert => {
  const recurse: TextContextTypeConvert = (value, options) => {
    if (!value || !isFunction(value.map)) {
      return convert.call(format, value, options);
    }

    // format a list of values. In text contexts we just use JSON encoding
    return JSON.stringify(value.map(recurse));
  };

  return recurse;
};
