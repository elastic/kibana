/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmbeddingExplorerPoint } from '../../../common';

const tokenize = (value: string) =>
  value
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);

const getSubsequenceGapScore = (needle: string, haystack: string) => {
  let needleIndex = 0;
  let previousMatchIndex = -1;
  let gapCount = 0;

  for (let haystackIndex = 0; haystackIndex < haystack.length; haystackIndex += 1) {
    if (haystack[haystackIndex] !== needle[needleIndex]) {
      continue;
    }

    if (previousMatchIndex >= 0) {
      gapCount += haystackIndex - previousMatchIndex - 1;
    }

    previousMatchIndex = haystackIndex;
    needleIndex += 1;

    if (needleIndex === needle.length) {
      return gapCount;
    }
  }

  return null;
};

const getTokenScore = (term: string, token: string) => {
  if (token === term) {
    return 120;
  }

  if (token.startsWith(term)) {
    return 100 - Math.min(token.length - term.length, 20);
  }

  const substringIndex = token.indexOf(term);

  if (substringIndex >= 0) {
    return 80 - Math.min(substringIndex, 30);
  }

  const gapScore = getSubsequenceGapScore(term, token);

  if (gapScore !== null) {
    return 60 - Math.min(gapScore, 40);
  }

  return null;
};

const getSearchableText = (point: EmbeddingExplorerPoint) =>
  [
    point.label,
    point.summary,
    point.category,
    point.source,
    ...Object.values(point.metadata).flatMap((value) => (value == null ? [] : [String(value)])),
  ].join(' ');

export interface PointSearchMatch {
  pointId: string;
  score: number;
}

export const findPointSearchMatches = (
  points: readonly EmbeddingExplorerPoint[],
  rawQuery: string
): PointSearchMatch[] => {
  const query = rawQuery.trim().toLowerCase();

  if (!query) {
    return [];
  }

  const terms = tokenize(query);

  if (!terms.length) {
    return [];
  }

  return points
    .map((point) => {
      const searchableText = getSearchableText(point).toLowerCase();
      const searchableTokens = tokenize(searchableText);
      const phraseIndex = searchableText.indexOf(query);

      let score = phraseIndex >= 0 ? 200 - Math.min(phraseIndex, 100) : 0;

      for (const term of terms) {
        let bestTermScore: number | null = null;

        for (const token of searchableTokens) {
          const tokenScore = getTokenScore(term, token);

          if (tokenScore !== null && (bestTermScore === null || tokenScore > bestTermScore)) {
            bestTermScore = tokenScore;
          }
        }

        if (bestTermScore === null) {
          return null;
        }

        score += bestTermScore;
      }

      return {
        pointId: point.id,
        score,
      };
    })
    .filter((match): match is PointSearchMatch => match !== null)
    .sort((left, right) => {
      if (left.score === right.score) {
        return left.pointId.localeCompare(right.pointId);
      }

      return right.score - left.score;
    });
};
