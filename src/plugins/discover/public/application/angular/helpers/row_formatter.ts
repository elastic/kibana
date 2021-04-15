/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { template } from 'lodash';
import { MAX_DOC_FIELDS_DISPLAYED } from '../../../../common';
import { getServices, IndexPattern } from '../../../kibana_services';

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
export const doTemplate = template(noWhiteSpace(templateHtml));

export const formatRow = (hit: Record<string, any>, indexPattern: IndexPattern) => {
  const highlights = hit?.highlight ?? {};
  // Keys are sorted in the hits object
  const formatted = indexPattern.formatHit(hit);
  const fields = indexPattern.fields;
  const highlightPairs: Array<[string, unknown]> = [];
  const sourcePairs: Array<[string, unknown]> = [];
  Object.entries(formatted).forEach(([key, val]) => {
    const displayKey = fields.getByName ? fields.getByName(key)?.displayName : undefined;
    const pairs = highlights[key] ? highlightPairs : sourcePairs;
    pairs.push([displayKey ? displayKey : key, val]);
  });
  const maxEntries = getServices().uiSettings.get(MAX_DOC_FIELDS_DISPLAYED);
  return doTemplate({ defPairs: [...highlightPairs, ...sourcePairs].slice(0, maxEntries) });
};

export const formatTopLevelObject = (
  row: Record<string, any>,
  fields: Record<string, any>,
  indexPattern: IndexPattern
) => {
  const highlights = row.highlight ?? {};
  const highlightPairs: Array<[string, unknown]> = [];
  const sourcePairs: Array<[string, unknown]> = [];
  const sorted = Object.entries(fields).sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
  sorted.forEach(([key, values]) => {
    const field = indexPattern.getFieldByName(key);
    const displayKey = fields.getByName ? fields.getByName(key)?.displayName : undefined;
    const formatter = field
      ? indexPattern.getFormatterForField(field)
      : { convert: (v: string, ...rest: unknown[]) => String(v) };
    if (!values.map) return;
    const formatted = values
      .map((val: unknown) =>
        formatter.convert(val, 'html', {
          field,
          hit: row,
          indexPattern,
        })
      )
      .join(', ');
    const pairs = highlights[key] ? highlightPairs : sourcePairs;
    pairs.push([displayKey ? displayKey : key, formatted]);
  });
  const maxEntries = getServices().uiSettings.get(MAX_DOC_FIELDS_DISPLAYED);
  return doTemplate({ defPairs: [...highlightPairs, ...sourcePairs].slice(0, maxEntries) });
};
