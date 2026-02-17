/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ReactNode } from 'react';
import { highlightTags } from './highlight_tags';

/**
 * React equivalent of getHighlightHtml().
 * Takes a field value and ES highlight snippets, returns a ReactNode
 * with <mark> elements around highlighted segments.
 * No HTML string concatenation or escaping needed — React handles XSS natively.
 */
export function getHighlightReact(
  fieldValue: string | object,
  highlights: string[] | undefined | null
): ReactNode {
  const text = typeof fieldValue === 'object' ? JSON.stringify(fieldValue) : fieldValue;

  if (!highlights || highlights.length === 0) {
    return text;
  }

  // Process each highlight snippet: extract the untagged text and build a mapping
  // of plain text -> segments with <mark> tags
  for (const highlight of highlights) {
    const untagged = highlight.split(highlightTags.pre).join('').split(highlightTags.post).join('');

    // Skip empty/no-op highlights to avoid splitting on an empty string
    if (!untagged) {
      continue;
    }

    // Build the replacement segments from the highlight
    const segments = parseHighlightSegments(highlight);

    // Replace all occurrences of the untagged text in the field value with the highlighted version
    const parts = text.split(untagged);
    if (parts.length > 1) {
      const result: ReactNode[] = [];
      parts.forEach((part, idx) => {
        if (idx > 0) {
          segments.forEach((segment, segIdx) => {
            result.push(<React.Fragment key={`hl-${idx}-${segIdx}`}>{segment}</React.Fragment>);
          });
        }
        if (part) {
          result.push(<React.Fragment key={`txt-${idx}`}>{part}</React.Fragment>);
        }
      });
      return <>{result}</>;
    }
  }

  return text;
}

/**
 * Parses a highlight string with highlight tags into an array of ReactNodes,
 * wrapping highlighted portions in <mark> elements.
 */
function parseHighlightSegments(highlight: string): ReactNode[] {
  const segments: ReactNode[] = [];
  let remaining = highlight;
  let keyIdx = 0;

  while (remaining.length > 0) {
    const preIdx = remaining.indexOf(highlightTags.pre);

    if (preIdx === -1) {
      segments.push(remaining);
      break;
    }

    if (preIdx > 0) {
      segments.push(remaining.slice(0, preIdx));
    }

    const afterPre = remaining.slice(preIdx + highlightTags.pre.length);
    const postIdx = afterPre.indexOf(highlightTags.post);

    if (postIdx === -1) {
      segments.push(remaining.slice(preIdx));
      break;
    }

    const highlightedText = afterPre.slice(0, postIdx);
    segments.push(
      <mark key={`mark-${keyIdx++}`} className="ffSearch__highlight">
        {highlightedText}
      </mark>
    );

    remaining = afterPre.slice(postIdx + highlightTags.post.length);
  }

  return segments;
}
