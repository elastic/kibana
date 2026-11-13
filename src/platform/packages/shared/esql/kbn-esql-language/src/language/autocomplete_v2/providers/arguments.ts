/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getNewUserDefinedColumnSuggestion } from '../../../commands/registry/complete_items';
import type { ISuggestionItem } from '../../../commands/registry/types';
import {
  resolveRole,
  type ColumnRole,
  type ConstantRole,
  type NewNameRole,
  type ResolvedRole,
} from '../../../esql_js_sim/definitions';
import { SuggestionCategory } from '../../autocomplete/utils/sorting/types';
import type { SuggestionContext } from '../types';

const ASSIGNMENT = '=';

/**
 * Whether the item for an argument ends with a space and opens the next suggestions. It does
 * unless the argument is an item of a list: there a separator can follow it, and the editor
 * offers the separator on the name itself, so that `a` becomes `a, ` and not `a , `.
 */
const movesOn = ({ afterName }: SuggestionContext): boolean =>
  afterName.position !== 'invalid' &&
  !afterName.followers.some((follower) => follower.class === 'separator');

/** The texts already written at the places that have the same role. */
const writtenWithRole = ({ ir }: SuggestionContext, { id }: ResolvedRole): string[] =>
  ir.written
    .filter(({ kind, open }) => kind === 'rule' && !open)
    .filter(
      (argument) =>
        resolveRole([...argument.ancestors.map((ancestor) => ancestor.id), argument.id])?.id === id
    )
    .map(({ text }) => text.replace(/`/g, ''));

/** The existing columns the role accepts. A column listed once is not offered again. */
export const provideColumns = async (
  role: ColumnRole,
  resolved: ResolvedRole,
  context: SuggestionContext
): Promise<ISuggestionItem[]> => {
  const moveOn = movesOn(context);

  return context.getColumnsByType(
    role.types ? [...role.types] : 'any',
    role.unique ? writtenWithRole(context, resolved) : [],
    { advanceCursor: moveOn, openSuggestions: moveOn }
  );
};

/**
 * A name for a new column, where the grammar wants the name assigned: a name the query does
 * not use yet, followed by the assignment. Where any name can be typed freely, as after
 * RENAME's AS, nothing is offered.
 */
export const provideNewName = (
  role: NewNameRole,
  context: SuggestionContext
): ISuggestionItem[] => {
  const isAssigned = context.afterName.followers.some(({ text }) => text === ASSIGNMENT);

  if (role.of !== 'column' || !isAssigned) {
    return [];
  }

  let index = 0;
  while (context.usedNames.has(`col${index}`)) {
    index++;
  }

  return [getNewUserDefinedColumnSuggestion(`col${index}`)];
};

/** The values a constant can take, when its role lists them. */
export const provideConstant = (
  role: ConstantRole,
  context: SuggestionContext
): ISuggestionItem[] => {
  const suffix = movesOn(context) ? ' ' : '';

  return (role.allowedValues ?? []).map((value) => ({
    label: value,
    text: `${value}${suffix}`,
    kind: 'Value',
    category: SuggestionCategory.VALUE,
  }));
};
