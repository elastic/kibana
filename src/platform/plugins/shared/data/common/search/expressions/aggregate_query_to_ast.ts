/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { buildExpressionFunction, ExpressionAstFunction } from '@kbn/expressions-plugin/common';
import { AggregateQuery } from '../../query';
import { EsqlExpressionFunctionDefinition } from './esql';

export const aggregateQueryToAst = ({
  query,
  timeField,
  titleForInspector,
  descriptionForInspector,
}: {
  query: AggregateQuery;
  timeField?: string;
  titleForInspector?: string;
  descriptionForInspector?: string;
}): undefined | ExpressionAstFunction => {
  return buildExpressionFunction<EsqlExpressionFunctionDefinition>('esql', {
    query: query.esql,
    timeField,
    locale: i18n.getLocale(),
    titleForInspector,
    descriptionForInspector,
  }).toAst();
};
