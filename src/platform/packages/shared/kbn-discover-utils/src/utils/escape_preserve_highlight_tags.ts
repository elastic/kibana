/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { escape } from 'lodash';

export function escapeAndPreserveHighlightTags(value: string): string {
  const markTags: string[] = [];
  const cleanText = value.replace(/<\/?mark[^>]*>/g, (match) => {
    markTags.push(match);
    return '';
  });

  const escapedText = escape(cleanText);

  return markTags.length === 2 ? `${markTags[0]}${escapedText}${markTags[1]}` : escapedText;
}
