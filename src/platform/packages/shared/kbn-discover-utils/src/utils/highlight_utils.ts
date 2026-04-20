/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { escape } from 'lodash';

// TODO: Remove these duplicated utils when we have a proper way to access the highlight tags
// or when we have a proper HTML field formatters
// Related issue for field formatters: https://github.com/elastic/kibana/issues/259286

// Duplicated from @kbn/field-formats-plugin because packages cannot depend on plugins.
const HTML_HIGHLIGHT_PRE_TAG = '<mark class="ffSearch__highlight">';
const HTML_HIGHLIGHT_POST_TAG = '</mark>';

const ES_HIGHLIGHT_PRE_TAG = '@kibana-highlighted-field@';
const ES_HIGHLIGHT_POST_TAG = '@/kibana-highlighted-field@';

/**
 * Escapes HTML in a string while preserving field-format highlight <mark> tags.
 * Used for values already processed by formatFieldValue / getHighlightHtml (e.g. resource badges).
 */
export function escapeAndPreserveHighlightTags(value: string): string {
  if (!value.includes(HTML_HIGHLIGHT_PRE_TAG)) {
    return escape(value);
  }

  return value
    .split(HTML_HIGHLIGHT_PRE_TAG)
    .map((segment, index) => {
      if (index === 0) return escape(segment);

      const postTagIndex = segment.indexOf(HTML_HIGHLIGHT_POST_TAG);
      if (postTagIndex === -1) return escape(segment);

      const highlighted = segment.substring(0, postTagIndex);
      const rest = segment.substring(postTagIndex + HTML_HIGHLIGHT_POST_TAG.length);

      return HTML_HIGHLIGHT_PRE_TAG + escape(highlighted) + HTML_HIGHLIGHT_POST_TAG + escape(rest);
    })
    .join('');
}

/**
 * Merges ES highlight snippets into a field value, producing safe HTML with <mark> tags.
 * Replicates the logic of getHighlightHtml from @kbn/field-formats-plugin, which packages
 * cannot import directly.
 *
 * Each snippet in the highlights array is the full field value with ES highlight tags
 * around matched terms. The function iterates over all snippets (handling multi-valued
 * fields), strips the ES tags to find the matching text, and replaces those occurrences
 * in the escaped field value with properly tagged <mark> elements.
 */
export function getHighlightedFieldValue(
  fieldValue: string,
  highlights: string[] | undefined
): string {
  if (!highlights?.length) {
    return escape(fieldValue);
  }

  let result = escape(fieldValue);

  for (const highlight of highlights) {
    const escapedHighlight = escape(highlight);

    const untaggedHighlight = escapedHighlight
      .split(ES_HIGHLIGHT_PRE_TAG)
      .join('')
      .split(ES_HIGHLIGHT_POST_TAG)
      .join('');

    const taggedHighlight = escapedHighlight
      .split(ES_HIGHLIGHT_PRE_TAG)
      .join(HTML_HIGHLIGHT_PRE_TAG)
      .split(ES_HIGHLIGHT_POST_TAG)
      .join(HTML_HIGHLIGHT_POST_TAG);

    result = result.split(untaggedHighlight).join(taggedHighlight);
  }

  return result;
}
