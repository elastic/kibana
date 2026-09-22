/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLCallbacks, ESQLControlVariable } from '@kbn/esql-types';
import { Walker, within, type WalkerAstNode } from '@elastic/esql';
import type { PromQLFunction, PromQLLiteral, PromQLSelector } from '@elastic/esql';
import { getPromqlFunctionSignatureHover } from './get_function_signature_hover';

const buildVariablesHoverContent = (
  usedVariablesInNode: string[],
  variables?: ESQLControlVariable[]
) => {
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

export const getVariablesHoverContent = (
  node?: WalkerAstNode,
  variables?: ESQLControlVariable[]
) => {
  const usedVariablesInNode = node ? Walker.params(node).map((v) => v.text.replace('?', '')) : [];

  return buildVariablesHoverContent(usedVariablesInNode, variables);
};

const getParamNameAtOffset = (text: string, offset: number): string | undefined => {
  let start = offset;
  while (start > 0 && /\w/.test(text[start - 1])) start--;
  if (start > 0 && text[start - 1] === '?') {
    let end = offset;
    while (end < text.length && /\w/.test(text[end])) end++;
    return text.slice(start, end);
  }
  return undefined;
};

export function getPromqlHoverItem(
  root: WalkerAstNode,
  offset: number,
  callbacks?: ESQLCallbacks,
  fullText?: string
): { contents: Array<{ value: string }> } {
  let functionNode: PromQLFunction | undefined;
  let selectorNode: PromQLSelector | undefined;
  let literalNode: PromQLLiteral | undefined;
  let paramNode: PromQLLiteral | undefined;

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
        if (!within(offset, literal)) return;

        if (literal.literalType === 'param') paramNode = literal;
        else if (literal.literalType !== 'string') literalNode = literal;
      },
    },
  });

  if (paramNode) {
    const variables = callbacks?.getVariables?.();
    const usedVariablesInNode = [paramNode.text.replace('?', '')];
    const variablesContent = buildVariablesHoverContent(usedVariablesInNode, variables);

    if (variablesContent.length) {
      return { contents: variablesContent };
    }
  }

  // Fallback for params in PromQL label matchers: the PromQL parser doesn't store
  // named params in label.value, so the Walker never visits them. Scan the raw text.
  if (!paramNode && fullText) {
    const paramName = getParamNameAtOffset(fullText, offset);
    if (paramName) {
      const variables = callbacks?.getVariables?.();
      const variablesContent = buildVariablesHoverContent([paramName], variables);
      if (variablesContent.length) {
        return { contents: variablesContent };
      }
    }
  }

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
