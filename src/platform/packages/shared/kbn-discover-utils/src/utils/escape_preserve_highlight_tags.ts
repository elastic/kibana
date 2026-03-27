/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { escape } from 'lodash';

// TODO: These constants are duplicated from @kbn/field-formats-plugin (html_tags.ts / highlight_tags.ts).
// They are kept locally because packages cannot depend on plugins. This is a temporary
// workaround until we reach an agreement on how to handle formatted/highlighted content
// across packages and plugins.
const HTML_HIGHLIGHT_PRE_TAG = '<mark class="ffSearch__highlight">';
const HTML_HIGHLIGHT_POST_TAG = '</mark>';

const ES_HIGHLIGHT_PRE_TAG = '@kibana-highlighted-field@';
const ES_HIGHLIGHT_POST_TAG = '@/kibana-highlighted-field@';

const escapeAndConvertHighlightTags = (value: string, preTag: string, postTag: string): string => {
  return value
    .split(preTag)
    .map((segment, index) => {
      // if first segment, escape it and return
      if (index === 0) return escape(segment);

      const postTagIndex = segment.indexOf(postTag);

      // if post tag is not found, escape it and return
      if (postTagIndex === -1) return escape(segment);

      const highlightedSnippet = segment.substring(0, postTagIndex);
      const rest = segment.substring(postTagIndex + postTag.length);

      return (
        HTML_HIGHLIGHT_PRE_TAG + escape(highlightedSnippet) + HTML_HIGHLIGHT_POST_TAG + escape(rest)
      );
    })
    .join('');
};

export function escapeAndPreserveHighlightTags(value: string): string {
  if (value.includes(ES_HIGHLIGHT_PRE_TAG)) {
    return escapeAndConvertHighlightTags(value, ES_HIGHLIGHT_PRE_TAG, ES_HIGHLIGHT_POST_TAG);
  }

  if (value.includes(HTML_HIGHLIGHT_PRE_TAG)) {
    return escapeAndConvertHighlightTags(value, HTML_HIGHLIGHT_PRE_TAG, HTML_HIGHLIGHT_POST_TAG);
  }

  return escape(value);
}
