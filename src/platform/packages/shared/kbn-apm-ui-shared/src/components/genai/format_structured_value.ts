/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { Document, isScalar, visit } from 'yaml';
import { isRecord } from './parse_genai_value';

export const MAX_ARRAY_ITEMS = 200;

// Appended to truncated arrays, then swapped for a YAML comment once the document is built.
const HIDDEN_ITEMS_MARKER = '\u0000kbn-genai-hidden-items:';

/** Caps arrays before serializing so very large tool outputs stay cheap to render. */
const truncateArrays = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ARRAY_ITEMS).map(truncateArrays);
    const hidden = value.length - MAX_ARRAY_ITEMS;
    return hidden > 0 ? [...items, `${HIDDEN_ITEMS_MARKER}${hidden}`] : items;
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, truncateArrays(item)])
    );
  }
  return value;
};

/**
 * Formats structured data as YAML for display: `key: value` rows, `-` list
 * items, and multi-line strings as literal `|` blocks so their line breaks are kept.
 */
export const formatStructuredValue = (value: unknown): string => {
  const doc = new Document(truncateArrays(value));

  visit(doc, {
    Seq(_, seq) {
      const last = seq.items[seq.items.length - 1];
      if (!isScalar(last) || typeof last.value !== 'string') return;
      if (!last.value.startsWith(HIDDEN_ITEMS_MARKER)) return;

      seq.items.pop();
      seq.comment = ` ${i18n.translate('apmUiShared.genAi.structuredValue.moreItems', {
        defaultMessage: '… {count} more items',
        values: { count: Number(last.value.slice(HIDDEN_ITEMS_MARKER.length)) },
      })}`;
    },
  });

  // lineWidth 0 disables folding, so long lines are left to the code block to wrap.
  return doc.toString({ lineWidth: 0, blockQuote: 'literal' }).trimEnd();
};
