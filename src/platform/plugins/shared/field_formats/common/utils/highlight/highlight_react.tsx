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

// Intermediate markers used to bridge iterative string replacement with React output.
// Null-byte delimiters won't appear in ES field values or highlight snippets.
const MARK_PRE = '\x00HL_PRE\x00';
const MARK_POST = '\x00HL_POST\x00';

/**
 * React equivalent of getHighlightHtml().
 * Takes a field value and ES highlight snippets, returns a ReactNode
 * with <mark> elements around highlighted segments.
 *
 * Mirrors the HTML version's iterative approach: all highlight snippets are
 * applied (not just the first match), so multi-snippet highlighting works.
 *
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

  let result = text;

  for (const highlight of highlights) {
    const untagged = highlight.split(highlightTags.pre).join('').split(highlightTags.post).join('');

    if (!untagged) {
      continue;
    }

    const tagged = highlight
      .split(highlightTags.pre)
      .join(MARK_PRE)
      .split(highlightTags.post)
      .join(MARK_POST);

    result = result.split(untagged).join(tagged);
  }

  if (result === text) {
    return text;
  }

  return parseMarkedString(result);
}

/**
 * Parses a string containing MARK_PRE/MARK_POST markers into React nodes,
 * wrapping marked portions in <mark> elements.
 */
function parseMarkedString(input: string): ReactNode {
  const segments: ReactNode[] = [];
  let remaining = input;
  let keyIdx = 0;

  while (remaining.length > 0) {
    const preIdx = remaining.indexOf(MARK_PRE);

    if (preIdx === -1) {
      segments.push(remaining);
      break;
    }

    if (preIdx > 0) {
      segments.push(remaining.slice(0, preIdx));
    }

    const afterPre = remaining.slice(preIdx + MARK_PRE.length);
    const postIdx = afterPre.indexOf(MARK_POST);

    if (postIdx === -1) {
      segments.push(remaining.slice(preIdx));
      break;
    }

    segments.push(
      <mark key={`mark-${keyIdx++}`} className="ffSearch__highlight">
        {afterPre.slice(0, postIdx)}
      </mark>
    );

    remaining = afterPre.slice(postIdx + MARK_POST.length);
  }

  return (
    <>
      {segments.map((seg, i) => (
        <React.Fragment key={`seg-${i}`}>{seg}</React.Fragment>
      ))}
    </>
  );
}
