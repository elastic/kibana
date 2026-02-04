/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { BasicPrettyPrinter, Parser } from '@kbn/esql-language';

export const appendLimitToQuery = (queryString: string, limit: number) => {
  const { root } = Parser.parse(queryString);
  const prettyQueryString = BasicPrettyPrinter.print(root);
  return `${prettyQueryString} | LIMIT ${limit}`;
};
