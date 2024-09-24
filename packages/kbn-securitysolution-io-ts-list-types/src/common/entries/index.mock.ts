/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EntriesArray } from '.';
import { getEntryExistsMock } from '../entries_exist/index.mock';
import { getEntryListMock } from '../entries_list/index.mock';
import { getEntryMatchMock } from '../entry_match/index.mock';
import { getEntryMatchAnyMock } from '../entry_match_any/index.mock';
import { getEntryNestedMock } from '../entry_nested/index.mock';

export const getListAndNonListEntriesArrayMock = (): EntriesArray => [
  getEntryMatchMock(),
  getEntryMatchAnyMock(),
  getEntryListMock(),
  getEntryExistsMock(),
  getEntryNestedMock(),
];

export const getListEntriesArrayMock = (): EntriesArray => [getEntryListMock(), getEntryListMock()];

export const getEntriesArrayMock = (): EntriesArray => [
  getEntryMatchMock(),
  getEntryMatchAnyMock(),
  getEntryExistsMock(),
  getEntryNestedMock(),
];
