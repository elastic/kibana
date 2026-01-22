/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Builder, mutate } from '@kbn/esql-language';
import type { Query } from '../types';

export const buildQueryAst = (source: Query) => {
  const { root, commands } = source;
  const queryAst = Builder.expression.query([...root.commands]);
  for (const command of commands) {
    mutate.generic.commands.append(queryAst, command);
  }

  return queryAst;
};
