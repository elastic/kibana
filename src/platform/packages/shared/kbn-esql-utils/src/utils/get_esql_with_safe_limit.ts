/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '@kbn/esql-language';

export function getESQLWithSafeLimit(esql: string, limit: number): string {
  const { root } = Parser.parse(esql);
  const sourceCommand = root.commands.find(({ name }) => ['from', 'ts'].includes(name));
  if (!sourceCommand) {
    return esql;
  }

  let sortCommandIndex = -1;
  const sortCommand = root.commands.find(({ name }, index) => {
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
