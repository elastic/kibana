/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EndpointEntriesArray } from '.';
import { getEndpointEntryMatchMock } from '../entry_match/index.mock';
import { getEndpointEntryMatchAnyMock } from '../entry_match_any/index.mock';
import { getEndpointEntryNestedMock } from '../entry_nested/index.mock';
import { getEndpointEntryMatchWildcardMock } from '../entry_match_wildcard/index.mock';

export const getEndpointEntriesArrayMock = (): EndpointEntriesArray => [
  getEndpointEntryMatchMock(),
  getEndpointEntryMatchAnyMock(),
  getEndpointEntryNestedMock(),
  getEndpointEntryMatchWildcardMock(),
];
