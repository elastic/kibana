/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLCommand } from '@kbn/esql-ast';

const REGEX =
  /^(?<type>\w+((?<after_type>\s+((?<mnemonic>(JOIN|JOI|JO|J)((?<after_mnemonic>\s+((?<index>\S+((?<after_index>\s+(?<as>(AS|A))?(?<after_as>\s+)?(((?<alias>\S+)?(?<after_alias>\s+)?((?<on>ON((?<after_on>\s+)?))?))?))?))?))?))?))?))?/i;

/**
 * Position of the caret in the JOIN command:
 *
 * ```
 * <type> JOIN <index> [ AS <alias> ] ON <condition> [, <condition> [, ...]]
 * |     ||   ||      |  | ||      |  | ||          |   |          |
 * |     ||   ||      |  | ||      |  | ||          |   |          |
 * |     ||   ||      |  | ||      |  | ||          |   |          after_condition
 * |     ||   ||      |  | ||      |  | ||          |   condition
 * |     ||   ||      |  | ||      |  | ||          after_condition
 * |     ||   ||      |  | ||      |  | |condition
 * |     ||   ||      |  | ||      |  | after_on
 * |     ||   ||      |  | ||      |  on
 * |     ||   ||      |  | ||      after_alias
 * |     ||   ||      |  | |alias
 * |     ||   ||      |  | after_as
 * |     ||   ||      |  as
 * |     ||   ||      after_index
 * |     ||   |index
 * |     ||   after_mnemonic
 * |     |mnemonic
 * |     after_type
 * type
 * ```
 */
export interface JoinCaretPosition {
  pos:
    | 'none'
    | 'type'
    | 'after_type'
    | 'mnemonic'
    | 'after_mnemonic'
    | 'index'
    | 'after_index'
    | 'alias'
    | 'after_alias'
    | 'on'
    | 'after_on'
    | 'condition'
    | 'after_condition';
}

const positions: Array<JoinCaretPosition['pos']> = [
  'after_condition',
  'condition',
  'after_on',
  'on',
  'after_alias',
  'alias',
  'after_index',
  'index',
  'after_mnemonic',
  'mnemonic',
  'after_type',
  'type',
];

export const getPosition = (text: string, command: ESQLCommand): JoinCaretPosition => {
  const match = text.match(REGEX);

  if (!match || !match.groups) {
    return {
      pos: 'none',
    };
  }

  let pos: JoinCaretPosition['pos'] = 'none';

  for (const position of positions) {
    if (match.groups[position]) {
      pos = position;
      break;
    }
  }

  return {
    pos,
  };
};
