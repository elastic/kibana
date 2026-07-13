/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLVariableType, VariableNamePrefix } from '@kbn/esql-types';

export const getVariableNamePrefix = (type: ESQLVariableType) => {
  switch (type) {
    case ESQLVariableType.FIELDS:
    case ESQLVariableType.FUNCTIONS:
      return VariableNamePrefix.IDENTIFIER;
    case ESQLVariableType.VALUES:
    case ESQLVariableType.TIME_LITERAL:
    case ESQLVariableType.MULTI_VALUES:
    default:
      return VariableNamePrefix.VALUE;
  }
};
