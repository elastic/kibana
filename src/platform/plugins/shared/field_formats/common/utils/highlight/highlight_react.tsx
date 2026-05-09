/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { highlightTags } from './highlight_tags';

/**
 * React equivalent of getHighlightHtml. Mirrors the same two-step algorithm:
 *
 * Step 1 (identical to getHighlightHtml): for each highlight, strip its Kibana
 * tags to get the plain substring, then replace every occurrence of that
 * substring in the working string with the tagged version. Note: getHighlightHtml
 * HTML-escapes each highlight before this step; that is omitted here because
 * React automatically escapes text node content.
 *
 * Step 2 (React-specific): convert the tag-substituted string to React nodes,
 * wrapping each highlighted span in a <mark> element instead of an HTML string.
 */
export function getHighlightReact(
  fieldValue: string,
  highlights: string[] | undefined | null
): React.ReactNode {
  if (!highlights?.length) return fieldValue;

  // Step 1 — mirror of getHighlightHtml's replacement loop.
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
