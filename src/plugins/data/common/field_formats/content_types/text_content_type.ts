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

import { isFunction } from 'lodash';
import { IFieldFormat, FieldFormatConvert, TextContextTypeConvert } from '../types';

import { asPrettyString } from '../utils';

const CONTEXT_TYPE = 'text';

const getConvertFn = (fieldFormatConvert: FieldFormatConvert): TextContextTypeConvert =>
  (fieldFormatConvert[CONTEXT_TYPE] || asPrettyString) as TextContextTypeConvert;

export const setup = (
  format: IFieldFormat,
  fieldFormatConvert: FieldFormatConvert
): FieldFormatConvert => {
  const convert = getConvertFn(fieldFormatConvert);

  const recurse: TextContextTypeConvert = value => {
    if (!value || !isFunction(value.map)) {
      return convert.call(format, value);
    }

    // format a list of values. In text contexts we just use JSON encoding
    return JSON.stringify(value.map(recurse));
  };

  return { [CONTEXT_TYPE]: recurse };
};
