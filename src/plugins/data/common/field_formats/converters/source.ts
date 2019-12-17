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

import { template, escape, keys } from 'lodash';
// @ts-ignore
import { noWhiteSpace } from '../../../../../legacy/core_plugins/kibana/common/utils/no_white_space';
import { shortenDottedString } from '../../utils';
import { KBN_FIELD_TYPES } from '../../kbn_field_types/types';
import { FieldFormat } from '../field_format';
import { TextContextTypeConvert, HtmlContextTypeConvert, FIELD_FORMAT_IDS } from '../types';
import { TEXT_CONTENT_TYPE } from '../content_types';

const templateHtml = `
  <dl class="source truncate-by-height">
    <% defPairs.forEach(function (def) { %>
      <dt><%- def[0] %>:</dt>
      <dd><%= def[1] %></dd>
      <%= ' ' %>
    <% }); %>
  </dl>`;
const doTemplate = template(noWhiteSpace(templateHtml));

export class SourceFormat extends FieldFormat {
  static id = FIELD_FORMAT_IDS._SOURCE;
  static title = '_source';
  static fieldType = KBN_FIELD_TYPES._SOURCE;

  textConvert: TextContextTypeConvert = value => JSON.stringify(value);

  htmlConvert: HtmlContextTypeConvert = (value, { field, hit } = {}) => {
    if (!field) {
      const converter = this.getConverterFor(TEXT_CONTENT_TYPE) as Function;

      return escape(converter(value));
    }

    const highlights = (hit && hit.highlight) || {};
    const formatted = field.indexPattern.formatHit(hit);
    const highlightPairs: any[] = [];
    const sourcePairs: any[] = [];
    const isShortDots = this.getConfig!('shortDots:enable');

    keys(formatted).forEach(key => {
      const pairs = highlights[key] ? highlightPairs : sourcePairs;
      const newField = isShortDots ? shortenDottedString(key) : key;
      const val = formatted[key];
      pairs.push([newField, val]);
    }, []);

    return doTemplate({ defPairs: highlightPairs.concat(sourcePairs) });
  };
}
