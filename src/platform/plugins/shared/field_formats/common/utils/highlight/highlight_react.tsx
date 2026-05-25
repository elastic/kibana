/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { FieldFormatHighlightTags, ReactContextTypeHit } from '../../types';
import { highlightTags } from './highlight_tags';

export type HighlightTags = FieldFormatHighlightTags;
export type HighlightHit = ReactContextTypeHit;

/**
 * Applies search highlighting to a field value, returning React nodes.
 *
 * Step 1: for each highlight, strip its Kibana tags to get the plain substring,
 * then replace every occurrence of that substring in the working string with
 * the tagged version. React automatically escapes text node content.
 *
 * Step 2: convert the tag-substituted string to React nodes, wrapping each
 * highlighted span in a <mark> element.
 */
export function getHighlightReact(
  fieldValue: string,
  highlights: string[] | undefined | null
): React.ReactNode {
  if (!highlights?.length) return fieldValue;

  // Step 1 — replacement loop.
  //
  // ES highlight snippets are fragments of the field value, not the full value.
  // We locate each highlighted substring within the full value and inject the
  // Kibana tags there, so that Step 2 can mark every match in context.
  //
  //   fieldValue = "lorem ipsum dolor ipsum amet"
  //   highlight  = "@kibana-highlighted-field@ipsum@/kibana-highlighted-field@"  ← ES snippet
  //   untagged   = "ipsum"               ← strip tags to get the plain substring
  //   result     = "lorem @kibana-highlighted-field@ipsum@/kibana-highlighted-field@ dolor @kibana-highlighted-field@ipsum@/kibana-highlighted-field@ amet"  ← all occurrences tagged
  let result = fieldValue;
  for (const highlight of highlights) {
    const untagged = highlight.split(highlightTags.pre).join('').split(highlightTags.post).join('');
    if (!untagged) continue;
    result = result.split(untagged).join(highlight);
  }

  if (!result.includes(highlightTags.pre)) return fieldValue;

  // Step 2 — convert to React nodes.
  //
  // Splitting on @kibana-highlighted-field@ gives:
  //   ["lorem ", "ipsum@/kibana-highlighted-field@ dolor ", "ipsum@/kibana-highlighted-field@ amet"]
  //    ^prefix   ^part 0                                    ^part 1
  //
  // Each part then splits on @/kibana-highlighted-field@ to separate the
  // highlighted text from the plain text that follows it:
  //   "ipsum@/kibana-highlighted-field@ dolor " → highlighted="ipsum"  after=" dolor "
  //   "ipsum@/kibana-highlighted-field@ amet"   → highlighted="ipsum"  after=" amet"
  //
  // Final nodes: ["lorem ", <mark>ipsum</mark>, " dolor ", <mark>ipsum</mark>, " amet"]
  const nodes: React.ReactNode[] = [];
  const [prefix, ...highlightedParts] = result.split(highlightTags.pre);

  if (prefix) nodes.push(prefix);
  for (const [i, part] of highlightedParts.entries()) {
    const [highlighted, after] = part.split(highlightTags.post);
    if (highlighted)
      nodes.push(
        <mark className="ffSearch__highlight" key={i}>
          {highlighted}
        </mark>
      );
    if (after) nodes.push(after);
  }

  if (nodes.length === 0) return fieldValue;
  if (nodes.length === 1) return nodes[0];
  return <>{nodes}</>;
}

/**
 * Resolves the applicable highlight source for a formatted field value.
 * DSL snippet highlights take precedence over ES|QL inline-tag highlights.
 */
export function getFieldHighlightReact(
  fieldValue: string,
  fieldName: string | undefined,
  hit: HighlightHit | undefined
): React.ReactNode {
  if (!fieldName) return fieldValue;

  const highlights = hit?.highlight?.[fieldName];
  if (highlights?.length) {
    return getHighlightReact(fieldValue, highlights);
  }

  const inlineHighlightTags = hit?.esql_highlight?.[fieldName];
  if (!inlineHighlightTags) {
    return fieldValue;
  }

  return getInlineTagHighlightReact(fieldValue, inlineHighlightTags);
}

export function getInlineTagHighlightReact(
  fieldValue: string,
  tags: HighlightTags | undefined | null
): React.ReactNode {
  if (!tags?.preTag || !tags?.postTag) {
    return fieldValue;
  }

  const { preTag, postTag } = tags;
  if (!fieldValue.includes(preTag)) {
    return fieldValue;
  }

  const nodes: React.ReactNode[] = [];
  let remaining = fieldValue;
  let key = 0;

  while (remaining.length > 0) {
    const openIndex = remaining.indexOf(preTag);
    if (openIndex === -1) {
      nodes.push(remaining);
      break;
    }

    if (openIndex > 0) {
      nodes.push(remaining.slice(0, openIndex));
    }

    const contentStart = openIndex + preTag.length;
    const closeIndex = remaining.indexOf(postTag, contentStart);

    if (closeIndex === -1) {
      nodes.push(remaining.slice(openIndex));
      break;
    }

    nodes.push(
      <mark className="ffSearch__highlight" key={key++}>
        {remaining.slice(contentStart, closeIndex)}
      </mark>
    );
    remaining = remaining.slice(closeIndex + postTag.length);
  }

  if (nodes.length === 0) return fieldValue;
  if (nodes.length === 1) return nodes[0];
  return <>{nodes}</>;
}

export function stripInlineHighlightTags(
  fieldValue: string,
  tags: HighlightTags | undefined | null
): string {
  if (!tags?.preTag || !tags?.postTag) {
    return fieldValue;
  }

  return fieldValue.split(tags.preTag).join('').split(tags.postTag).join('');
}

export function injectWholeValueInlineHighlight(
  fieldValue: string,
  rawValue: string,
  tags: HighlightTags | undefined | null
): string {
  if (!tags?.preTag || !tags?.postTag) {
    return fieldValue;
  }

  const strippedRawValue = stripInlineHighlightTags(rawValue, tags);
  if (`${tags.preTag}${strippedRawValue}${tags.postTag}` !== rawValue) {
    return fieldValue;
  }

  return `${tags.preTag}${fieldValue}${tags.postTag}`;
}
