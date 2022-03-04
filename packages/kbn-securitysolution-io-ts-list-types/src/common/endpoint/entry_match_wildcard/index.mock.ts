/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ENTRY_VALUE, FIELD, OPERATOR, WILDCARD } from '../../../constants/index.mock';
import { EndpointEntryMatchWildcard } from './index';

export const getEndpointEntryMatchWildcardMock = (): EndpointEntryMatchWildcard => ({
  field: FIELD,
  operator: OPERATOR,
  type: WILDCARD,
  value: ENTRY_VALUE,
});
