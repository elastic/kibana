/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EntryNested } from '.';
import { NESTED, NESTED_FIELD } from '../../constants/index.mock';
import { getEntryExistsMock } from '../entries_exist/index.mock';
import { getEntryMatchExcludeMock, getEntryMatchMock } from '../entry_match/index.mock';
import { getEntryMatchAnyExcludeMock, getEntryMatchAnyMock } from '../entry_match_any/index.mock';

export const getEntryNestedMock = (): EntryNested => ({
  entries: [getEntryMatchMock(), getEntryMatchAnyMock()],
  field: NESTED_FIELD,
  type: NESTED,
});

export const getEntryNestedExcludeMock = (): EntryNested => ({
  ...getEntryNestedMock(),
  entries: [getEntryMatchExcludeMock(), getEntryMatchAnyExcludeMock()],
});

export const getEntryNestedMixedEntries = (): EntryNested => ({
  ...getEntryNestedMock(),
  entries: [getEntryMatchMock(), getEntryMatchAnyExcludeMock(), getEntryExistsMock()],
});
