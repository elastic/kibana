/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLCommand } from '@kbn/esql-ast';
import { JoinCommandPosition, JoinPosition, JoinStaticPosition } from './types';
import { SuggestionRawDefinition } from '../../types';

const REGEX =
  /^(?<type>\w+((?<after_type>\s+((?<mnemonic>(JOIN|JOI|JO|J)((?<after_mnemonic>\s+((?<index>\S+((?<after_index>\s+(?<as>(AS|A))?(?<after_as>\s+(((?<alias>\S+)?(?<after_alias>\s+)?)?))?((?<on>(ON|O)((?<after_on>\s+(?<cond>[^\s])?)?))?))?))?))?))?))?))?/i;

const positions: Array<JoinStaticPosition | 'cond'> = [
  'cond',
  'after_on',
  'on',
  'after_alias',
  'alias',
  'after_as',
  'as',
  'after_index',
  'index',
  'after_mnemonic',
  'mnemonic',
  'after_type',
  'type',
];

/**
 * Returns the static position, or `cond` if the caret is in the `<conditions>`
 * part of the command, in which case further parsing is needed.
 */
const getStaticPosition = (text: string): JoinStaticPosition | 'cond' => {
  const match = text.match(REGEX);

  if (!match || !match.groups) {
    return 'none';
  }

  let pos: JoinStaticPosition | 'cond' = 'cond';

  for (const position of positions) {
    if (match.groups[position]) {
      pos = position;
      break;
    }
  }

  return pos;
};

export const getPosition = (text: string, command: ESQLCommand): JoinCommandPosition => {
  const pos0: JoinStaticPosition | 'cond' = getStaticPosition(text);
  const pos: JoinPosition = pos0 === 'cond' ? 'condition' : pos0;

  return {
    pos,
    type: '',
  };
};

export const suggestionIntersection = (
  suggestions1: SuggestionRawDefinition[],
  suggestions2: SuggestionRawDefinition[]
): SuggestionRawDefinition[] => {
  const labels1 = new Set<string>();
  const intersection: SuggestionRawDefinition[] = [];

  for (const suggestion1 of suggestions1) {
    labels1.add(suggestion1.label);
  }

  for (const suggestion2 of suggestions2) {
    if (labels1.has(suggestion2.label)) {
      intersection.push({ ...suggestion2 });
    }
  }

  return intersection;
};

export const suggestionUnion = (
  suggestions1: SuggestionRawDefinition[],
  suggestions2: SuggestionRawDefinition[]
): SuggestionRawDefinition[] => {
  const labels = new Set<string>();
  const union: SuggestionRawDefinition[] = [];

  for (const suggestion of suggestions1) {
    const label = suggestion.label;

    if (!labels.has(label)) {
      union.push(suggestion);
      labels.add(label);
    }
  }

  for (const suggestion of suggestions2) {
    const label = suggestion.label;

    if (!labels.has(label)) {
      union.push(suggestion);
      labels.add(label);
    }
  }

  return union;
};
