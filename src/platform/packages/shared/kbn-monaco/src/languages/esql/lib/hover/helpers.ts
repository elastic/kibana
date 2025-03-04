/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { parse, Walker } from '@kbn/esql-ast';
import type { ESQLControlVariable } from '@kbn/esql-types';

const getESQLQueryVariables = (esql: string): string[] => {
  const { root } = parse(esql);
  const usedVariablesInQuery = Walker.params(root);
  return usedVariablesInQuery.map((v) => v.text.replace('?', ''));
};

export const getVariablesHoverContent = (
  queryString: string,
  offset: number,
  variables?: ESQLControlVariable[]
) => {
  const innerText = queryString.substring(0, offset);
  const currentPipeIndex = innerText.split('|').length;
  const validQueryOnCurrentPipe = queryString.split('|').slice(0, currentPipeIndex).join('|');
  const usedVariablesInQuery = getESQLQueryVariables(queryString);
  const usedVariables = variables?.filter((v) => usedVariablesInQuery.includes(v.key));

  const hoverContents: Array<{ value: string }> = [];

  if (usedVariables?.length) {
    usedVariables.forEach((variable) => {
      if (validQueryOnCurrentPipe.includes(`?${variable.key}`)) {
        hoverContents.push({
          value: `**${variable.key}**: ${variable.value}`,
        });
      }
    });
  }

  return hoverContents;
};
