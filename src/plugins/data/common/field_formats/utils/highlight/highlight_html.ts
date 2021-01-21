/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';
import { highlightTags } from './highlight_tags';
import { htmlTags } from './html_tags';

export function getHighlightHtml(fieldValue: any, highlights: any) {
  let highlightHtml = typeof fieldValue === 'object' ? JSON.stringify(fieldValue) : fieldValue;

  _.each(highlights, function (highlight) {
    const escapedHighlight = _.escape(highlight);

    // Strip out the highlight tags to compare against the field text
    const untaggedHighlight = escapedHighlight
      .split(highlightTags.pre)
      .join('')
      .split(highlightTags.post)
      .join('');

    // Replace all highlight tags with proper html tags
    const taggedHighlight = escapedHighlight
      .split(highlightTags.pre)
      .join(htmlTags.pre)
      .split(highlightTags.post)
      .join(htmlTags.post);

    // Replace all instances of the untagged string with the properly tagged string
    highlightHtml = highlightHtml.split(untaggedHighlight).join(taggedHighlight);
  });

  return highlightHtml;
}
