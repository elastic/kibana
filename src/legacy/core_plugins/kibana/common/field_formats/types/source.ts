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
import { noWhiteSpace } from '../../utils/no_white_space';
// @ts-ignore
import { shortenDottedString } from '../../utils/shorten_dotted_string';
import {
  FieldFormat,
  TEXT_CONTEXT_TYPE,
  HTML_CONTEXT_TYPE,
} from '../../../../../../plugins/data/common/';

const templateHtml = `
  <dl class="source truncate-by-height">
    <% defPairs.forEach(function (def) { %>
      <dt><%- def[0] %>:</dt>
      <dd><%= def[1] %></dd>
      <%= ' ' %>
    <% }); %>
  </dl>`;
const doTemplate = template(noWhiteSpace(templateHtml));

export function createSourceFormat() {
  class SourceFormat extends FieldFormat {
    static id = '_source';
    static title = '_source';
    static fieldType = '_source';

    private getConfig: Function;

    constructor(params: any, getConfig: Function) {
      super(params);

      this.getConfig = getConfig;
    }

    _convert = {
      [TEXT_CONTEXT_TYPE]: (value: any) => JSON.stringify(value),
      [HTML_CONTEXT_TYPE]: function sourceToHtml(
        this: SourceFormat,
        source: any,
        field: any,
        hit: any
      ) {
        if (!field) {
          const converter = this.getConverterFor('text') as Function;

          return escape(converter(source));
        }

        const highlights = (hit && hit.highlight) || {};
        const formatted = field.indexPattern.formatHit(hit);
        const highlightPairs: any[] = [];
        const sourcePairs: any[] = [];

        const isShortDots = this.getConfig('shortDots:enable');
        keys(formatted).forEach(key => {
          const pairs = highlights[key] ? highlightPairs : sourcePairs;
          const newField = isShortDots ? shortenDottedString(key) : key;
          const val = formatted[key];
          pairs.push([newField, val]);
        }, []);

        return doTemplate({ defPairs: highlightPairs.concat(sourcePairs) });
      },
    };
  }

  return SourceFormat;
}
