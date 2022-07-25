/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildExpression, buildExpressionFunction } from '@kbn/expressions-plugin/common';
import { Query } from '../../query';
import { ExpressionFunctionKql } from './kql';
import { ExpressionFunctionLucene } from './lucene';

export const queryToAst = (query: Query) => {
  if (query.language === 'kuery') {
    return buildExpression([
      buildExpressionFunction<ExpressionFunctionKql>('kql', { q: query.query as string }),
    ]).toAst();
  }
  return buildExpression([
    buildExpressionFunction<ExpressionFunctionLucene>('lucene', { q: JSON.stringify(query.query) }),
  ]).toAst();
};
