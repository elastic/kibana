/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { getAstAndSyntaxErrors } from '@kbn/esql-ast';

export function getESQLWithSafeLimit(esql: string, limit: number): string {
  const { ast } = getAstAndSyntaxErrors(esql);
  const sourceCommand = ast.find(({ name }) => ['from', 'metrics'].includes(name));
  if (!sourceCommand) {
    return esql;
  }

  let sortCommandIndex = -1;
  const sortCommand = ast.find(({ name }, index) => {
    sortCommandIndex = index;
    return name === 'sort';
  });

  if (!sortCommand || (sortCommand && sortCommandIndex !== 1)) {
    const sourcePipeText = esql.substring(
      sourceCommand.location.min,
      sourceCommand.location.max + 1
    );
    return esql.replace(sourcePipeText, `${sourcePipeText} \n| LIMIT ${limit}`);
  }

  const sourceSortPipeText = esql.substring(
    sourceCommand.location.min,
    sortCommand.location.max + 1
  );

  return esql.replace(sourceSortPipeText, `${sourceSortPipeText} \n| LIMIT ${limit}`);
}
