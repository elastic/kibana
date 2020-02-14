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

import _ from 'lodash';
import {
  FieldFormat,
  asPrettyString,
  KBN_FIELD_TYPES,
  TextContextTypeConvert,
  HtmlContextTypeConvert,
} from '../../../../../../plugins/data/common';
import { getHighlightHtml } from '../../../../../../plugins/data/common/field_formats/utils/highlight/highlight_html';
import { formatNetmonBoolean } from '../../../../../../netmon/field_formats/boolean_formats';

export function createBoolFormat() {
  const getTruthy = (value: any) => {
    switch (value) {
      case false:
      case 0:
      case 'false':
      case 'no':
        return false;
      case true:
      case 1:
      case 'true':
      case 'yes':
        return true;
      default:
        return null;
    }
  };

  const formatText = (value: any) => {
    if (typeof value === 'string') {
      value = value.trim().toLowerCase();
    }

    const truthy = getTruthy(value);

    if (truthy) {
      return 'true';
    } else if (truthy === false) {
      return 'false';
    }

    return asPrettyString(value);
  };

  const defaultHtml = (value: any, field?: any, hit?: Record<string, any>) => {
    const formatted = _.escape(formatText(value));

    if (!hit || !hit.highlight || !hit.highlight[field.name]) {
      return formatted;
    } else {
      return getHighlightHtml(formatted, hit.highlight[field.name]);
    }
  };

  return class BoolFormat extends FieldFormat {
    static id = 'boolean';
    static title = 'Boolean';
    static fieldType = [KBN_FIELD_TYPES.BOOLEAN, KBN_FIELD_TYPES.NUMBER, KBN_FIELD_TYPES.STRING];

    textConvert: TextContextTypeConvert = (value: any) => formatText(value);

    htmlConvert: HtmlContextTypeConvert = (value: any, field?: any, hit?: Record<string, any>) => {
      const truthy = getTruthy(value);

      if (!field || truthy === null) {
        return defaultHtml(value, field, hit);
      }

      return formatNetmonBoolean(value, field, hit) || defaultHtml(value, field, hit);
    };
  };
}
