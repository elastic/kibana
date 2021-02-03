/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { template } from 'lodash';
import { IndexPattern } from '../../../kibana_services';

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
  const formatted = indexPattern.formatHit(hit);
  const highlightPairs: Array<[string, unknown]> = [];
  const sourcePairs: Array<[string, unknown]> = [];
  Object.entries(formatted).forEach(([key, val]) => {
    const pairs = highlights[key] ? highlightPairs : sourcePairs;
    pairs.push([key, val]);
  });
  return doTemplate({ defPairs: [...highlightPairs, ...sourcePairs] });
};
