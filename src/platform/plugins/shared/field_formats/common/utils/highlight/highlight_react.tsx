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
import type { FieldFormatHighlightTags, ReactContextTypeHit } from '../../types';
import { searchHighlightStyles } from '../../field_format_styles';

/**
 * Resolves the applicable highlight method for a field value.
 *
 * - DSL: we receive a clean fieldValue and a side list of substrings to be highlighted.
 *   Example:
 *   fieldValue = "lorem ipsum dolor"
 *   fieldName = "myField"
 *   hit = { highlight: { myField: ["ipsum", "dolor"] } }
 *   return = "lorem <mark>ipsum</mark> <mark>dolor</mark>"
 *
 * - ES|QL: we receive a fieldValue with inline <em> (or custom) tags.
 *   Example:
 *   fieldValue = "<em>lorem</em> ipsum <em>dolor</em>"
 *   fieldName = "myField"
 *   hit = { inline_highlights: { myField: { preTag: "<em>", postTag: "</em>" } } }
 *   return = "<mark>lorem</mark> ipsum <mark>dolor</mark>"
 */
export function getHighlightReact(
  fieldValue: string,
  fieldName: string | undefined,
  hit: ReactContextTypeHit | undefined
): React.ReactNode {
  if (!fieldName || !hit) {
    return fieldValue;
  }

  // DSL -  we receive a clean fieldValue and a side list of substrings to be highlighted.
  const highlightedSubstrings = hit.highlight?.[fieldName];
  if (highlightedSubstrings?.length) {
    return highlightWithSubstrings(fieldValue, highlightedSubstrings);
  }

  // ES|QL - we receive a fieldValue with inline <em> (or custom) tags.
  const inlineHighlightTags = hit.inline_highlights?.[fieldName];
  if (inlineHighlightTags) {
    return highlightWithInlineTags(fieldValue, inlineHighlightTags);
  }

  return fieldValue;
}

/**
 * Applies search highlighting to a field value, returning React nodes.
 *
 * Receives a field value and a list of substrings that requires highlighting.
 *
 * Step 1: for each highlight, strip its Kibana tags to get the plain substring,
 * then replace every occurrence of that substring in the working string with
 * the tagged version. React automatically escapes text node content.
 *
 * Step 2: convert the tag-substituted string to React nodes, wrapping each
 * highlighted span in a <mark> element.
 */
function highlightWithSubstrings(
  fieldValue: string,
  highlights: string[] | undefined | null
): React.ReactNode {
  if (!highlights?.length) return fieldValue;

  // Step 1 — compute the highlighted ranges within the full value.
  //
  // ES highlight snippets are context-window fragments of the field value in
  // which only the matched portions carry the Kibana tags, e.g.
  //   "@kibana-highlighted-field@ipsum@/kibana-highlighted-field@ dolor amet".
  // For each fragment, strip the tags while recording which spans of the plain
  // fragment were tagged, anchor the plain fragment inside the full value, and
  // project the tagged spans to value coordinates.
  //
  // All ranges are computed against the original value — never against a
  // partially tagged working string — so one fragment's markers can never be
  // matched by another fragment's text (searching for e.g. "field" would
  // otherwise match inside a previously inserted @kibana-highlighted-field@
  // literal and render tag debris). Two semantics of the previous
  // string-substitution loop are preserved: occurrences of one fragment are
  // matched left-to-right without overlap, and a later fragment's occurrence
  // is skipped when an earlier fragment placed a tag strictly inside it (the
  // substitution would no longer have found its text contiguously).
  const tagPositions: number[] = [];
  const markRanges: Array<[start: number, end: number]> = [];
  const seenFragments = new Set<string>();

  for (const fragment of highlights) {
    if (seenFragments.has(fragment)) continue;
    seenFragments.add(fragment);

    // strip the tags, recording the tagged spans in plain-fragment coordinates
    const [head, ...taggedParts] = fragment.split(highlightTags.pre);
    let untagged = head;
    const spans: Array<[start: number, end: number]> = [];
    for (const part of taggedParts) {
      const [highlighted, ...rest] = part.split(highlightTags.post);
      spans.push([untagged.length, untagged.length + highlighted.length]);
      untagged += highlighted + rest.join('');
    }
    if (!untagged || !spans.length) continue;

    let anchor = fieldValue.indexOf(untagged);
    while (anchor !== -1) {
      const anchorEnd = anchor + untagged.length;
      const brokenByPriorTag = tagPositions.some((pos) => anchor < pos && pos < anchorEnd);
      if (brokenByPriorTag) {
        anchor = fieldValue.indexOf(untagged, anchor + 1);
        continue;
      }
      for (const [spanStart, spanEnd] of spans) {
        markRanges.push([anchor + spanStart, anchor + spanEnd]);
        tagPositions.push(anchor + spanStart, anchor + spanEnd);
      }
      anchor = fieldValue.indexOf(untagged, anchorEnd);
    }
  }

  if (!markRanges.length) return fieldValue;

  markRanges.sort(([aStart], [bStart]) => aStart - bStart);

  // Step 2 — convert to React nodes: plain segments interleaved with <mark>
  // elements for each highlighted range.
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  for (const [rangeStart, rangeEnd] of markRanges) {
    if (rangeStart < cursor) continue; // duplicate or nested range, already rendered
    if (rangeStart > cursor) nodes.push(fieldValue.slice(cursor, rangeStart));
    if (rangeEnd > rangeStart) {
      nodes.push(
        <mark css={searchHighlightStyles} key={rangeStart}>
          {fieldValue.slice(rangeStart, rangeEnd)}
        </mark>
      );
    }
    cursor = Math.max(cursor, rangeEnd);
  }
  if (cursor < fieldValue.length) nodes.push(fieldValue.slice(cursor));

  if (nodes.length === 0) return fieldValue;
  if (nodes.length === 1) return nodes[0];
  return <>{nodes}</>;
}

/**
 * Applies highlighting to a field value, returning React nodes.
 *
 * Receives a field value and the tags used to highlight the value.
 * This function replaces them with <mark> elements in a safe manner.
 */
function highlightWithInlineTags(
  fieldValue: string,
  tags: FieldFormatHighlightTags | undefined | null
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
      <mark css={searchHighlightStyles} key={key++}>
        {remaining.slice(contentStart, closeIndex)}
      </mark>
    );
    remaining = remaining.slice(closeIndex + postTag.length);
  }

  if (nodes.length === 0) return fieldValue;
  if (nodes.length === 1) return nodes[0];
  return <>{nodes}</>;
}
