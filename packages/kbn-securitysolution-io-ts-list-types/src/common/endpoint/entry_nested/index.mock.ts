/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EndpointEntryNested } from '.';
import { FIELD, NESTED } from '../../../constants/index.mock';
import { getEndpointEntryMatchMock } from '../entry_match/index.mock';
import { getEndpointEntryMatchAnyMock } from '../entry_match_any/index.mock';

export const getEndpointEntryNestedMock = (): EndpointEntryNested => ({
  entries: [getEndpointEntryMatchMock(), getEndpointEntryMatchAnyMock()],
  field: FIELD,
  type: NESTED,
});
