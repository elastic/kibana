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

const ARRAY_HIGHLIGHT_PRE_TAG = '<span class="ffArray__highlight">';
const ARRAY_HIGHLIGHT_POST_TAG = '</span>';

// Matches all candidate tags in one pass; state tracking below decides which to preserve.
const TAGS_REGEX = new RegExp(
  [
    HTML_HIGHLIGHT_PRE_TAG,
    HTML_HIGHLIGHT_POST_TAG,
    ARRAY_HIGHLIGHT_PRE_TAG,
    ARRAY_HIGHLIGHT_POST_TAG,
  ]
    .map((tag) => tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|'),
  'g'
);

/**
 * Escapes HTML in a string while preserving field-format highlight <mark> tags
 * and array-formatting <span class="ffArray__highlight"> tags.
 * Used for values already processed by formatFieldValue / getHighlightHtml (e.g. resource badges).
 *
 * Closing tags are only preserved when a matching opening tag was already seen, so orphaned
 * </mark> or </span> in arbitrary input are still escaped.
 */
export function escapeAndPreserveHighlightTags(value: string): string {
  const parts: string[] = [];
  let lastIndex = 0;
  let inSearchHighlight = false;
  let inArrayHighlight = false;

  for (const match of value.matchAll(TAGS_REGEX)) {
    const tag = match[0];
    const before = value.slice(lastIndex, match.index);

    if (tag === HTML_HIGHLIGHT_PRE_TAG) {
      parts.push(escape(before), tag);
      inSearchHighlight = true;
    } else if (tag === HTML_HIGHLIGHT_POST_TAG && inSearchHighlight) {
      parts.push(escape(before), tag);
      inSearchHighlight = false;
    } else if (tag === ARRAY_HIGHLIGHT_PRE_TAG) {
      parts.push(escape(before), tag);
      inArrayHighlight = true;
    } else if (tag === ARRAY_HIGHLIGHT_POST_TAG && inArrayHighlight) {
      parts.push(escape(before), tag);
      inArrayHighlight = false;
    } else {
      // Orphaned closing tag — escape it along with the preceding text
      parts.push(escape(before + tag));
    }

    lastIndex = match.index! + tag.length;
  }

  parts.push(escape(value.slice(lastIndex)));
  return parts.join('');
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
