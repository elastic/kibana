/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { highlightTags } from '@kbn/field-formats-plugin/common';
import type { ESQLHighlightTags } from '@kbn/esql-utils';
import type { EsHitRecord } from '../types';

/**
 * Maximum number of characters of a raw field value that compact views (data grid cells,
 * document summary) format and render. Longer string values (and arrays of strings,
 * cumulatively) are cut and rendered with a trailing '…'. The limit applies per field value,
 * not per cell. Full values remain available in the expanded cell popover and in the doc viewer.
 */
export const MAX_RENDERED_FIELD_VALUE_LENGTH = 5_000;

export interface TruncateFieldValueResult {
  value: unknown;
  isTruncated: boolean;
}

export interface TruncateFieldValueWithHighlightsResult extends TruncateFieldValueResult {
  hit: EsHitRecord;
}

interface CutString {
  original: string;
  kept: string;
}

/**
 * Cuts a raw field value (a string, or an array of strings sharing the budget cumulatively)
 * to the given character budget, so it can be truncated before any formatting work happens.
 */
export const truncateFieldValue = (
  value: unknown,
  maxLength: number | undefined
): TruncateFieldValueResult => {
  if (maxLength === undefined) {
    return { value, isTruncated: false };
  }

  if (typeof value === 'string' && value.length > maxLength) {
    return { value: truncateString(value, maxLength), isTruncated: true };
  }

  if (Array.isArray(value)) {
    let remaining = maxLength;

    for (let i = 0; i < value.length; i++) {
      const item = value[i];

      // only string items are truncated, other values (including objects) are rendered in full
      if (typeof item !== 'string') {
        continue;
      }

      if (item.length <= remaining) {
        remaining -= item.length;
        continue;
      }

      // never mutate the original array, it is shared with copy/filter actions
      const truncated = value.slice(0, i);

      if (remaining > 0) {
        truncated.push(truncateString(item, remaining));
      }

      return { value: truncated, isTruncated: true };
    }
  }

  return { value, isTruncated: false };
};

/**
 * Truncates a raw field value like `truncateFieldValue` and adjusts the search highlights of the hit,
 * so that highlights within the kept part of the value are still rendered.
 */
export const truncateFieldValueWithHighlights = ({
  value,
  maxLength,
  fieldName,
  hit,
}: {
  value: unknown;
  maxLength: number | undefined;
  fieldName: string | undefined;
  hit: EsHitRecord;
}): TruncateFieldValueWithHighlightsResult => {
  const { value: truncatedValue, isTruncated } = truncateFieldValue(value, maxLength);
  const cut = getCutString(value, truncatedValue);

  if (!isTruncated || !fieldName || !cut) {
    return { value: truncatedValue, isTruncated, hit };
  }

  // DSL highlights are fragments of the full value, which no longer match the truncated value
  const fragments = hit.highlight?.[fieldName];

  if (fragments?.length) {
    return {
      value: truncatedValue,
      isTruncated,
      hit: { ...hit, highlight: { ...hit.highlight, [fieldName]: clipFragments(fragments, cut) } },
    };
  }

  // ES|QL highlight tags are inlined in the value, so the cut can split a tag or leave it open
  const inlineTags = hit.inline_highlights?.[fieldName];

  if (inlineTags) {
    return {
      value: replaceCutString(truncatedValue, closeInlineHighlight(cut.kept, inlineTags)),
      isTruncated,
      hit,
    };
  }

  return { value: truncatedValue, isTruncated, hit };
};

// avoid cutting in the middle of a surrogate pair, which would render a replacement character
const truncateString = (value: string, maxLength: number): string => {
  const charCode = value.charCodeAt(maxLength - 1);
  const endsWithHighSurrogate = charCode >= 0xd800 && charCode <= 0xdbff;

  return value.slice(0, endsWithHighSurrogate ? maxLength - 1 : maxLength);
};

// a truncated value has at most one cut string: the value itself or the last kept array item
const getCutString = (value: unknown, truncatedValue: unknown): CutString | undefined => {
  if (typeof value === 'string' && typeof truncatedValue === 'string') {
    return { original: value, kept: truncatedValue };
  }

  if (!Array.isArray(value) || !Array.isArray(truncatedValue) || !truncatedValue.length) {
    return undefined;
  }

  const original = value[truncatedValue.length - 1];
  const kept = truncatedValue[truncatedValue.length - 1];

  return typeof original === 'string' && typeof kept === 'string' && original !== kept
    ? { original, kept }
    : undefined;
};

const replaceCutString = (truncatedValue: unknown, cutString: string): unknown =>
  Array.isArray(truncatedValue) ? [...truncatedValue.slice(0, -1), cutString] : cutString;

// fragments are kept as they are, since they can belong to other array items and can't match within the kept part
const clipFragments = (fragments: string[], { original, kept }: CutString): string[] =>
  fragments.flatMap((fragment) => {
    const plaintext = fragment.split(highlightTags.pre).join('').split(highlightTags.post).join('');
    const anchor = original.indexOf(plaintext);

    if (anchor === -1 || anchor >= kept.length || anchor + plaintext.length <= kept.length) {
      return [fragment];
    }

    const clipped = clipFragment(fragment, kept.length - anchor);

    return clipped ? [fragment, clipped] : [fragment];
  });

// keeps the first `maxLength` plaintext characters of a fragment, together with their highlight tags
const clipFragment = (fragment: string, maxLength: number): string | undefined => {
  const [head, ...highlightedParts] = fragment.split(highlightTags.pre);
  let clipped = head.slice(0, maxLength);
  let remaining = maxLength - clipped.length;
  let hasHighlight = false;

  for (const part of highlightedParts) {
    if (remaining <= 0) {
      break;
    }

    const [highlighted, ...rest] = part.split(highlightTags.post);
    const keptHighlighted = highlighted.slice(0, remaining);
    const keptPlain = rest.join('').slice(0, remaining - keptHighlighted.length);

    clipped += `${highlightTags.pre}${keptHighlighted}${highlightTags.post}${keptPlain}`;
    remaining -= keptHighlighted.length + keptPlain.length;
    hasHighlight = hasHighlight || keptHighlighted.length > 0;
  }

  return hasHighlight ? clipped : undefined;
};

const closeInlineHighlight = (value: string, { preTag, postTag }: ESQLHighlightTags): string => {
  // identical tags (e.g. `**`) alternate between opening and closing, so an odd count leaves a highlight open
  const isHighlightOpen =
    preTag === postTag
      ? value.split(preTag).length % 2 === 0
      : value.lastIndexOf(preTag) > value.lastIndexOf(postTag);

  if (!isHighlightOpen) {
    return removePartialTagSuffix(value, preTag);
  }

  return value.endsWith(preTag)
    ? value.slice(0, -preTag.length)
    : `${removePartialTagSuffix(value, postTag)}${postTag}`;
};

const removePartialTagSuffix = (value: string, tag: string): string => {
  for (let length = tag.length - 1; length > 0; length--) {
    if (value.endsWith(tag.slice(0, length))) {
      return value.slice(0, -length);
    }
  }

  return value;
};
