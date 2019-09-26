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
import { asPrettyString } from '../../../../../../plugins/data/common/field_formats';
import { DEFAULT_COLOR } from './color_default';

const convertTemplate = _.template('<span style="<%- style %>"><%- val %></span>');

export function createColorFormat(FieldFormat) {
  class ColorFormat extends FieldFormat {
    getParamDefaults() {
      return {
        fieldType: null, // populated by editor, see controller below
        colors: [_.cloneDeep(DEFAULT_COLOR)]
      };
    }

    findColorRuleForVal(val) {
      switch (this.param('fieldType')) {
        case 'string':
          return _.findLast(this.param('colors'), (colorParam) => {
            return new RegExp(colorParam.regex).test(val);
          });

        case 'number':
          return _.findLast(this.param('colors'), ({ range }) => {
            if (!range) return;
            const [start, end] = range.split(':');
            return val >= Number(start) && val <= Number(end);
          });

        default:
          return null;
      }
    }

    static id = 'color';
    static title = 'Color';
    static fieldType = [
      'number',
      'string'
    ];
  }

  ColorFormat.prototype._convert = {
    html(val) {
      const color = this.findColorRuleForVal(val);
      if (!color) return _.escape(asPrettyString(val));

      let style = '';
      if (color.text) style += `color: ${color.text};`;
      if (color.background) style += `background-color: ${color.background};`;
      return convertTemplate({ val, style });
    }
  };

  return ColorFormat;
}
