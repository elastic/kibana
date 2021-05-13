/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { NonEmptyString } from '@kbn/securitysolution-io-ts-types';
import { nonEmptyNestedEntriesArray } from '../non_empty_nested_entries_array';

export const entriesNested = t.exact(
  t.type({
    entries: nonEmptyNestedEntriesArray,
    field: NonEmptyString,
    type: t.keyof({ nested: null }),
  })
);
export type EntryNested = t.TypeOf<typeof entriesNested>;
