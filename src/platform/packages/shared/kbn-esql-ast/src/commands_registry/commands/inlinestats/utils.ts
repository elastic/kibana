/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCommand } from '../../../types';

export type InlineStatsStaticPosition =
  | 'type'
  | 'after_type'
  | 'mnemonic'
  | 'after_mnemonic'
  | 'none';

export interface InlineStatsPosition {
  position: InlineStatsStaticPosition;
  isTyping: boolean;
}

const positions: InlineStatsStaticPosition[] = ['after_mnemonic', 'mnemonic', 'after_type', 'type'];

// Matches: INLINE STATS, INLINE STA, INLINE ST, INLINE S, INLINE, INL, etc.
const INLINE_STATS_REGEX =
  /^(?<type>(INLINE|INLIN|INLI|INL|IN|I))?(?<after_type>\s+(?<mnemonic>(STATS|STAT|STA|ST|S))?(?<after_mnemonic>\s+.*)?)?/i;

export const getStaticPosition = (innerText: string): InlineStatsStaticPosition => {
  const match = innerText.match(INLINE_STATS_REGEX);

  if (!match || !match.groups) {
    return 'none';
  }

  return positions.find((position) => match.groups![position]) ?? 'none';
};

export function getPosition(query: string, command: ESQLCommand): InlineStatsPosition {
  const innerText = query.substring(command.location.min);
  const position = getStaticPosition(innerText);

  const currentInput = innerText.trim().toUpperCase();
  const afterInline = innerText.replace(/^.*INLINE\s+/i, '').toUpperCase();
  // User typed something like "I", "IN", "INL", "INLINE"
  const isBeforeInline = 'INLINE'.startsWith(currentInput) && currentInput.length <= 6;
  // User typed "INLINE " and now typing "STATS"
  const isAfterInline = 'STATS'.startsWith(afterInline) && afterInline.length <= 5;

  return { position, isTyping: position === 'type' ? isBeforeInline : isAfterInline };
}
