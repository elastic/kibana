/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { template, escape, keys } from 'lodash';
import { shortenDottedString } from '../../utils';
import { KBN_FIELD_TYPES } from '../../kbn_field_types/types';
import { FieldFormat } from '../field_format';
import { TextContextTypeConvert, HtmlContextTypeConvert, FIELD_FORMAT_IDS } from '../types';
import { UI_SETTINGS } from '../../constants';

/**
 * Remove all of the whitespace between html tags
 * so that inline elements don't have extra spaces.
 *
 * If you have inline elements (span, a, em, etc.) and any
 * amount of whitespace around them in your markup, then the
 * browser will push them apart. This is ugly in certain
 * scenarios and is only fixed by removing the whitespace
 * from the html in the first place (or ugly css hacks).
 *
 * @param  {string} html - the html to modify
 * @return {string} - modified html
 */
function noWhiteSpace(html: string) {
  const TAGS_WITH_WS = />\s+</g;
  return html.replace(TAGS_WITH_WS, '><');
}

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

  textConvert: TextContextTypeConvert = (value) => JSON.stringify(value);

  htmlConvert: HtmlContextTypeConvert = (value, options = {}) => {
    const { field, hit, indexPattern } = options;

    if (!field) {
      const converter = this.getConverterFor('text') as Function;

      return escape(converter(value));
    }

    const highlights = (hit && hit.highlight) || {};
    const formatted = indexPattern.formatHit(hit);
    const highlightPairs: any[] = [];
    const sourcePairs: any[] = [];
    const isShortDots = this.getConfig!(UI_SETTINGS.SHORT_DOTS_ENABLE);

    keys(formatted).forEach((key) => {
      const pairs = highlights[key] ? highlightPairs : sourcePairs;
      const newField = isShortDots ? shortenDottedString(key) : key;
      const val = formatted[key];
      pairs.push([newField, val]);
    }, []);

    return doTemplate({ defPairs: highlightPairs.concat(sourcePairs) });
  };
}
