/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLSource, EsqlQuery } from '@kbn/esql-ast';

export function replaceESQLQueryIndexPattern(esql: string, replacements: Record<string, string>) {
  const query = EsqlQuery.fromSrc(esql);
  const sourceCommand = query.ast.commands.find(({ name }) => ['from', 'ts'].includes(name));
  const args = (sourceCommand?.args ?? []) as ESQLSource[];
  args.forEach((arg) => {
    if (arg.sourceType === 'index' && arg.index && replacements[arg.index.valueUnquoted]) {
      arg.index.valueUnquoted = replacements[arg.index.valueUnquoted];
    }
  });

  return query.print();
}
