/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiSelectableOption, EuiSelectableProps } from '@elastic/eui';
import { distance } from 'fastest-levenshtein';

export type CommandPaletteOption = EuiSelectableOption<{
  keywords: string[];
  shortcutLabels: string[];
  run: () => void;
}>;

const MIN_FUZZY_TOKEN_LENGTH = 3;
const MAX_FUZZY_DISTANCE = 1;

const tokenize = (value: string) => {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
};

const matchesToken = (candidate: string, searchToken: string) => {
  if (candidate.includes(searchToken)) {
    return true;
  }

  if (
    searchToken.length < MIN_FUZZY_TOKEN_LENGTH ||
    Math.abs(candidate.length - searchToken.length) > 1
  ) {
    return false;
  }

  return distance(candidate, searchToken) <= MAX_FUZZY_DISTANCE;
};

export const commandPaletteOptionMatcher: NonNullable<
  EuiSelectableProps<CommandPaletteOption>['optionMatcher']
> = ({ option, normalizedSearchValue }) => {
  const searchTokens = tokenize(normalizedSearchValue);

  if (searchTokens.length === 0) {
    return true;
  }

  const candidates = [option.label, ...option.keywords];
  const candidateTokens = candidates.flatMap(tokenize);

  return searchTokens.every(
    (searchToken) =>
      candidates.some((candidate) => candidate.toLowerCase().includes(searchToken)) ||
      candidateTokens.some((candidateToken) => matchesToken(candidateToken, searchToken))
  );
};
