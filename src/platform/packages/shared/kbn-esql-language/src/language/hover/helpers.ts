/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLControlVariable } from '@kbn/esql-types';
import { Walker, within, type WalkerAstNode } from '../../ast';
import type { PromQLFunction, PromQLLiteral, PromQLSelector } from '../../embedded_languages';
import { getPromqlFunctionSignatureHover } from './get_function_signature_hover';

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

export function getPromqlHoverItem(
  root: WalkerAstNode,
  offset: number
): { contents: Array<{ value: string }> } {
  let functionNode: PromQLFunction | undefined;
  let selectorNode: PromQLSelector | undefined;
  let literalNode: PromQLLiteral | undefined;

  Walker.walk(root, {
    promql: {
      visitPromqlFunction: (fn) => {
        if (within(offset, fn)) {
          functionNode = fn;
        }
      },
      visitPromqlSelector: (selector) => {
        if (selector.metric && within(offset, selector.metric)) {
          selectorNode = selector;
        }
      },
      visitPromqlLiteral: (literal) => {
        if (literal.literalType !== 'string' && within(offset, literal)) {
          literalNode = literal;
        }
      },
    },
  });

  if (literalNode) {
    const hoverType = literalNode.literalType === 'time' ? 'duration' : 'scalar';

    return { contents: [{ value: `**${literalNode.name}**: ${hoverType}` }] };
  }

  if (selectorNode?.metric) {
    const vectorType = selectorNode.duration ? 'range vector' : 'instant vector';

    return { contents: [{ value: `**${selectorNode.metric.name}**: ${vectorType}` }] };
  }

  if (functionNode) {
    return { contents: getPromqlFunctionSignatureHover(functionNode.name) };
  }

  return { contents: [] };
}
