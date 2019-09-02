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

import { isFunction, transform, size, cloneDeep, get, defaults } from 'lodash';
import { createCustomFieldFormat } from './converters/custom';
import { ContentType, FieldFormatConvert, IFieldFormat } from './types';

import { htmlContentTypeSetup, textContentTypeSetup } from './content_types';

const DEFAULT_CONTEXT_TYPE = 'text';

export type FieldFormatConvert = { [key: string]: Function } | Function;

export abstract class FieldFormat implements IFieldFormat {
  _convert: FieldFormatConvert = FieldFormat.setupContentType(this, get(this, '_convert', {}));
  type = this.constructor;

  constructor(public _params: any = {}) {}

  convert(value: any, contentType: ContentType = DEFAULT_CONTEXT_TYPE) {
    const converter = this.getConverterFor(contentType);

    if (converter) {
      return converter.call(this, value);
    }

    return value;
  }

  getConverterFor(contentType: ContentType = DEFAULT_CONTEXT_TYPE) {
    if (this._convert) {
      return this._convert[contentType];
    }

    return null;
  }

  getParamDefaults() {
    return {};
  }

  param(name: string) {
    const val = get(this._params, name);

    if (val || val === false || val === 0) {
      // truthy, false, or 0 are fine
      // '', NaN, null, undefined, etc are not
      return val;
    }

    return get(this.getParamDefaults(), name);
  }

  params() {
    return cloneDeep(defaults({}, this._params, this.getParamDefaults()));
  }

  toJSON() {
    const id = get(this.type, 'id');
    const defaultsParams = this.getParamDefaults() || {};

    const params = transform(
      this._params,
      (uniqParams, val, param) => {
        if (param && val !== get(defaultsParams, param)) {
          uniqParams[param] = val;
        }
      },
      {}
    );

    return {
      id,
      params: size(params) ? params : undefined,
    };
  }

  static from(convertFn: Function) {
    return createCustomFieldFormat(FieldFormat.toConvertObject(convertFn));
  }

  private static setupContentType(
    fieldFormat: IFieldFormat,
    convert: FieldFormatConvert | Function
  ): FieldFormatConvert {
    const convertObject = FieldFormat.toConvertObject(convert);

    return {
      ...textContentTypeSetup(fieldFormat, convertObject),
      ...htmlContentTypeSetup(fieldFormat, convertObject),
    };
  }

  private static toConvertObject(convert: FieldFormatConvert | Function): FieldFormatConvert {
    if (isFunction(convert)) {
      return {
        [DEFAULT_CONTEXT_TYPE]: convert,
      };
    }
    return convert;
  }
}
