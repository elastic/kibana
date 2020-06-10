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

import { i18n } from '@kbn/i18n';
import { findLast, cloneDeep, template, escape } from 'lodash';
import { KBN_FIELD_TYPES } from '../../kbn_field_types/types';
import { FieldFormat } from '../field_format';
import { HtmlContextTypeConvert, FIELD_FORMAT_IDS } from '../types';
import { asPrettyString } from '../utils';
import { DEFAULT_CONVERTER_COLOR } from '../constants/color_default';

const convertTemplate = template('<span style="<%- style %>"><%- val %></span>');

export class ColorFormat extends FieldFormat {
  static id = FIELD_FORMAT_IDS.COLOR;
  static title = i18n.translate('data.fieldFormats.color.title', {
    defaultMessage: 'Color',
  });
  static fieldType = [KBN_FIELD_TYPES.NUMBER, KBN_FIELD_TYPES.STRING];

  getParamDefaults() {
    return {
      fieldType: null, // populated by editor, see controller below
      colors: [cloneDeep(DEFAULT_CONVERTER_COLOR)],
    };
  }

  findColorRuleForVal(val: any) {
    switch (this.param('fieldType')) {
      case 'string':
        return findLast(this.param('colors'), (colorParam: typeof DEFAULT_CONVERTER_COLOR) => {
          return new RegExp(colorParam.regex).test(val);
        });

      case 'number':
        return findLast(this.param('colors'), ({ range }) => {
          if (!range) return;
          const [start, end] = range.split(':');
          return val >= Number(start) && val <= Number(end);
        });

      default:
        return null;
    }
  }

  htmlConvert: HtmlContextTypeConvert = (val) => {
    const color = this.findColorRuleForVal(val) as typeof DEFAULT_CONVERTER_COLOR;
    if (!color) return escape(asPrettyString(val));

    let style = '';
    if (color.text) style += `color: ${color.text};`;
    if (color.background) style += `background-color: ${color.background};`;
    return convertTemplate({ val, style });
  };
}
