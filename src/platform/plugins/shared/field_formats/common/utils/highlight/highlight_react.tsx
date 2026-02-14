/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment, type ReactNode } from 'react';
import { highlightTags } from './highlight_tags';

/**
 * CSS class used for search term highlighting in React output
 */
export const SEARCH_HIGHLIGHT_CLASS = 'ffSearch__highlight';

/**
 * Highlighted text component for search highlighting
 */
const HighlightedText = ({ children }: { children: ReactNode }) => (
  <mark className={SEARCH_HIGHLIGHT_CLASS}>{children}</mark>
);

/**
 * Extract the text portions that should be highlighted from a highlight string.
 * The highlight string contains the full context with special tags around matched terms.
 *
 * @example
 * Input: "foo @kibana-highlighted-field@bar@/kibana-highlighted-field@ baz"
 * Output: ["bar"]
 */
const extractHighlightedTerms = (highlight: string): string[] => {
  const terms: string[] = [];
  const parts = highlight.split(highlightTags.pre);

  for (let i = 1; i < parts.length; i++) {
    const endIndex = parts[i].indexOf(highlightTags.post);
    if (endIndex !== -1) {
      terms.push(parts[i].substring(0, endIndex));
    }
  }

  return terms;
};

/**
 * Get React elements with highlighted search terms.
 *
 * This is the React equivalent of getHighlightHtml. It processes the highlight
 * tags from Elasticsearch and wraps matched text in React elements instead of
 * generating HTML strings.
 *
 * @param fieldValue - The field value to process
 * @param highlights - Array of highlighted strings from Elasticsearch
 * @returns React elements with highlighted text wrapped in <mark> tags
 */
export const getHighlightReact = (
  fieldValue: string | object,
  highlights: string[] | undefined | null
): ReactNode => {
  const stringValue = typeof fieldValue === 'object' ? JSON.stringify(fieldValue) : fieldValue;

  if (!highlights || highlights.length === 0) {
    return stringValue;
  }

  // Collect all terms that should be highlighted
  const termsToHighlight = new Set<string>();
  highlights.forEach((highlight) => {
    const terms = extractHighlightedTerms(highlight);
    terms.forEach((term) => termsToHighlight.add(term));
  });

  if (termsToHighlight.size === 0) {
    return stringValue;
  }

  // Build a map of all highlight positions in the original string
  interface HighlightRange {
    start: number;
    end: number;
  }

  const ranges: HighlightRange[] = [];

  termsToHighlight.forEach((term) => {
    // Find all occurrences of this term in the field value
    let searchIndex = 0;
    while (searchIndex < stringValue.length) {
      const foundIndex = stringValue.indexOf(term, searchIndex);
      if (foundIndex === -1) break;

      ranges.push({
        start: foundIndex,
        end: foundIndex + term.length,
      });

      searchIndex = foundIndex + 1;
    }
  });

  if (ranges.length === 0) {
    return stringValue;
  }

  // Sort ranges by start position and merge overlapping ranges
  ranges.sort((a, b) => a.start - b.start);

  const mergedRanges: HighlightRange[] = [];
  for (const range of ranges) {
    const last = mergedRanges[mergedRanges.length - 1];
    if (last && range.start <= last.end) {
      // Merge overlapping ranges
      last.end = Math.max(last.end, range.end);
    } else {
      mergedRanges.push({ ...range });
    }
  }

  // Build React elements from the merged ranges
  const elements: ReactNode[] = [];
  let lastEnd = 0;

  mergedRanges.forEach((range, index) => {
    // Add text before this highlight
    if (range.start > lastEnd) {
      elements.push(
        <Fragment key={`text-${index}`}>{stringValue.slice(lastEnd, range.start)}</Fragment>
      );
    }

    // Add the highlighted text
    elements.push(
      <HighlightedText key={`highlight-${index}`}>
        {stringValue.slice(range.start, range.end)}
      </HighlightedText>
    );

    lastEnd = range.end;
  });

  // Add any remaining text after the last highlight
  if (lastEnd < stringValue.length) {
    elements.push(<Fragment key="text-final">{stringValue.slice(lastEnd)}</Fragment>);
  }

  return <>{elements}</>;
};
