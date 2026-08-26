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

/** A `[start, end)` range within a field value, in character offsets. */
type MarkRange = [start: number, end: number];

/**
 * Strips the Kibana tags from a single ES highlight fragment, returning the
 * plaintext and the spans (in plaintext coordinates) that were tagged.
 *
 *   "@kibana-highlighted-field@ipsum@/kibana-highlighted-field@ dolor"
 *   → { plaintext: "ipsum dolor", taggedSpans: [[0, 5]] }
 */
function parseTaggedFragment(fragment: string): { plaintext: string; taggedSpans: MarkRange[] } {
  const [head, ...taggedParts] = fragment.split(highlightTags.pre);
  let plaintext = head;
  const taggedSpans: MarkRange[] = [];
  for (const part of taggedParts) {
    const [highlighted, ...rest] = part.split(highlightTags.post);
    taggedSpans.push([plaintext.length, plaintext.length + highlighted.length]);
    plaintext += highlighted + rest.join('');
  }
  return { plaintext, taggedSpans };
}

/**
 * Computes the highlighted ranges (in `fieldValue` coordinates) for the DSL
 * case, where each ES highlight is a context-window fragment of the field value
 * with only the matched portions wrapped in Kibana tags.
 *
 * Ranges are computed against the original value — never a partially tagged
 * working string — so one fragment's markers can never be matched by another
 * fragment's text (searching e.g. "field" would otherwise match inside a
 * previously inserted `@kibana-highlighted-field@` literal and render tag
 * debris). Occurrences of a fragment are matched left-to-right without overlap,
 * and a later occurrence is skipped when an earlier fragment placed a tag
 * strictly inside it.
 */
function findMarkRanges(fieldValue: string, highlights: string[]): MarkRange[] {
  const markRanges: MarkRange[] = [];
  const seenFragments = new Set<string>();

  for (const fragment of highlights) {
    if (seenFragments.has(fragment)) continue;
    seenFragments.add(fragment);

    const { plaintext, taggedSpans } = parseTaggedFragment(fragment);
    if (!plaintext || !taggedSpans.length) continue;

    let anchor = fieldValue.indexOf(plaintext);
    while (anchor !== -1) {
      const anchorEnd = anchor + plaintext.length;
      const brokenByPriorTag = markRanges.some(
        ([start, end]) => (anchor < start && start < anchorEnd) || (anchor < end && end < anchorEnd)
      );
      if (brokenByPriorTag) {
        anchor = fieldValue.indexOf(plaintext, anchor + 1);
        continue;
      }
      for (const [spanStart, spanEnd] of taggedSpans) {
        markRanges.push([anchor + spanStart, anchor + spanEnd]);
      }
      anchor = fieldValue.indexOf(plaintext, anchorEnd);
    }
  }

  return markRanges;
}

/**
 * Applies DSL search highlighting to a field value, returning React nodes.
 *
 * ES sends the clean field value plus a list of highlight fragments; we resolve
 * those to mark ranges over the original value, then render plain segments
 * interleaved with <mark> elements. React escapes text node content.
 */
function highlightWithSubstrings(
  fieldValue: string,
  highlights: string[] | undefined | null
): React.ReactNode {
  if (!highlights?.length) return fieldValue;

  const markRanges = findMarkRanges(fieldValue, highlights);
  if (!markRanges.length) return fieldValue;

  markRanges.sort(([aStart], [bStart]) => aStart - bStart);

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
