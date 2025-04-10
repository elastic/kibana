/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

function extractTextAndMarkTags(html: string) {
  const markTags: string[] = [];
  const cleanText = html.replace(/<\/?mark>/g, (match) => {
    markTags.push(match);
    return '';
  });

  return { cleanText, markTags };
}
export function truncateAndPreserveHighlightTags(value: string, maxLength: number): string {
  const { cleanText, markTags } = extractTextAndMarkTags(value);

  if (cleanText.length < maxLength) {
    return value;
  }

  const halfLength = maxLength / 2;
  const truncatedText = `${cleanText.slice(0, halfLength)}...${cleanText.slice(-halfLength)}`;

  if (markTags.length === 2) {
    return `${markTags[0]}${truncatedText}${markTags[1]}`;
  }

  return truncatedText;
}
