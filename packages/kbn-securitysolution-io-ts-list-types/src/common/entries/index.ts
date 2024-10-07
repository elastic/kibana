/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';
import { entriesExists } from '../entries_exist';
import { entriesList } from '../entries_list';
import { entriesMatch } from '../entry_match';
import { entriesMatchAny } from '../entry_match_any';
import { entriesMatchWildcard } from '../entry_match_wildcard';
import { entriesNested } from '../entry_nested';

// NOTE: Type nested is not included here to denote it's non-recursive nature.
// So a nested entry is really just a collection of `Entry` types.
export const entry = t.union([
  entriesMatch,
  entriesMatchAny,
  entriesList,
  entriesExists,
  entriesMatchWildcard,
]);
export type Entry = t.TypeOf<typeof entry>;

export const entriesArray = t.array(
  t.union([
    entriesMatch,
    entriesMatchAny,
    entriesList,
    entriesExists,
    entriesNested,
    entriesMatchWildcard,
  ])
);
export type EntriesArray = t.TypeOf<typeof entriesArray>;

export const entriesArrayOrUndefined = t.union([entriesArray, t.undefined]);
export type EntriesArrayOrUndefined = t.TypeOf<typeof entriesArrayOrUndefined>;
