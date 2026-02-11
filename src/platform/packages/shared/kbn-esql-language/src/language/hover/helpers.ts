/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLControlVariable } from '@kbn/esql-types';
import { Walker, type WalkerAstNode } from '../../ast';

export const getVariablesHoverContent = (
  node?: WalkerAstNode,
  variables?: ESQLControlVariable[]
) => {
  const usedVariablesInNode = node ? Walker.params(node).map((v) => v.text.replace('?', '')) : [];
  const usedVariables = variables?.filter((v) => usedVariablesInNode.includes(v.key));

  const hoverContents: Array<{ value: string }> = [];

  if (usedVariables?.length) {
    usedVariables.forEach((variable) => {
      hoverContents.push({
        value: `**${variable.key}**: ${variable.value}`,
      });
    });
  }

  return hoverContents;
};
