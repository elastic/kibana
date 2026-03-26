/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { escape } from 'lodash';

// TODO: These constants are duplicated from @kbn/field-formats-plugin (html_tags.ts).
// They are kept locally because packages cannot depend on plugins. This is a temporary
// workaround until we reach an agreement on how to handle formatted/highlighted content
// across packages and plugins.
const HIGHLIGHT_PRE_TAG = '<mark class="ffSearch__highlight">';
const HIGHLIGHT_POST_TAG = '</mark>';
const HIGHLIGHT_TAGS_REGEX = new RegExp(`${HIGHLIGHT_PRE_TAG}|${HIGHLIGHT_POST_TAG}`, 'g');

export function escapeAndPreserveHighlightTags(value: string): string {
  const markTags: string[] = [];
  const cleanText = value.replace(HIGHLIGHT_TAGS_REGEX, (match) => {
    markTags.push(match);
    return '';
  });

  const escapedText = escape(cleanText);

  return markTags.length === 2 ? `${markTags[0]}${escapedText}${markTags[1]}` : escapedText;
}
