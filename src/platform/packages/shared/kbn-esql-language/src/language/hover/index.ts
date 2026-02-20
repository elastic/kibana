/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLCallbacks } from '@kbn/esql-types';
import { Walker, within } from '../../ast';
import { Parser } from '../../parser';

import type { ESQLFunction, ESQLSingleAstItem, ESQLSource } from '../../types';

import { getColumnsByTypeRetriever } from '../shared/columns_retrieval_helpers';
import { getPromqlHoverItem, getVariablesHoverContent } from './helpers';
import { correctQuerySyntax } from '../shared/query_syntax_helpers';
import { getPolicyHover } from './get_policy_hover';
import { getFunctionSignatureHover } from './get_function_signature_hover';
import { getQueryForFields } from '../shared/get_query_for_fields';
import { getFunctionArgumentHover } from './get_function_argument_hover';
import { getColumnHover } from './get_column_hover';
import { findSubquery } from '../shared/subqueries_helpers';

interface HoverContent {
  contents: Array<{ value: string }>;
}

export async function getHoverItem(fullText: string, offset: number, callbacks?: ESQLCallbacks) {
  const correctedQuery = correctQuerySyntax(fullText, offset);
  const { root } = Parser.parse(correctedQuery);

  const commandAtOffset = [...root.commands].reverse().find((cmd) => offset >= cmd.location.min);

  if (commandAtOffset?.name === 'promql') {
    return getPromqlHoverItem(root, offset);
  }

  let containingFunction: ESQLFunction<'variadic-call'> | undefined;
  let node: ESQLSingleAstItem | undefined;

  Walker.walk(root, {
    visitFunction: (fn) => {
      if (within(offset, fn)) node = fn;

      if (fn.subtype === 'variadic-call') {
        const parentheses = {
          left: fullText.indexOf('(', fn.location.min),
          right: fn.location.max,
        };
        if (parentheses.left < offset && parentheses.right > offset)
          containingFunction = fn as ESQLFunction<'variadic-call'>;
      }
    },
    visitSource: (source, parent, walker) => {
      if (within(offset, source)) {
        node = source;
        walker.abort();
      }
    },
    visitSingleAstItem: (_node) => {
      // ignore identifiers because we don't want to choose them as the node type
      // instead of the function node (functions can have an "operator" child which is
      // usually an identifer representing the name of the function)
      if (_node.type !== 'identifier' && within(offset, _node)) {
        node = _node;
      }
    },
  });

  const hoverContent: HoverContent = {
    contents: [],
  };

  if (!node) {
    return hoverContent;
  }

  const { subQuery } = findSubquery(root, offset);
  const astForContext = subQuery ?? root;

  const { getColumnMap } = getColumnsByTypeRetriever(
    getQueryForFields(fullText, astForContext),
    fullText,
    callbacks
  );

  // ES|QL variables hover
  const variables = callbacks?.getVariables?.();
  const variablesContent = getVariablesHoverContent(node, variables);

  if (variablesContent.length) {
    hoverContent.contents.push(...variablesContent);
  }

  // Function arguments hover
  if (containingFunction) {
    const argHints = await getFunctionArgumentHover(containingFunction, offset);
    hoverContent.contents.push(...argHints);
  }

  // Function signature hover
  if (node.type === 'function' && node.name !== '=') {
    const functionSignature = await getFunctionSignatureHover(node);
    hoverContent.contents.push(...functionSignature);
  }

  // Policy hover
  if (node.type === 'source' && node.sourceType === 'policy') {
    const source = node as ESQLSource;
    const policyHoverInfo = await getPolicyHover(source, callbacks);
    hoverContent.contents.push(...policyHoverInfo);
  }

  // Column hover
  if (node.type === 'column') {
    const columnHover = await getColumnHover(node, getColumnMap);
    hoverContent.contents.push(...columnHover);
  }

  return hoverContent;
}
