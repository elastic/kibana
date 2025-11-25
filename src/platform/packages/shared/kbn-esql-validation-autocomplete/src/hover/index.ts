/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { Walker, parse, within } from '@kbn/esql-ast';
import {
  type ESQLFunction,
  type ESQLSingleAstItem,
  type ESQLSource,
} from '@kbn/esql-ast/src/types';

import type { ESQLCallbacks } from '../shared/types';
import { getColumnsByTypeRetriever } from '../shared/columns';
import { correctQuerySyntax, getVariablesHoverContent } from './helpers';
import { getPolicyHover } from './get_policy_hover';
import { getFunctionSignatureHover } from './get_function_signature_hover';
import { getQueryForFields } from '../autocomplete/get_query_for_fields';
import { getFunctionArgumentHover } from './get_function_argument_hover';
import { getColumnHover } from './get_column_hover';
import { getAstContext } from '../shared/context';

interface HoverContent {
  contents: Array<{ value: string }>;
}

export async function getHoverItem(fullText: string, offset: number, callbacks?: ESQLCallbacks) {
  const correctedQuery = correctQuerySyntax(fullText, offset);
  const { root } = parse(correctedQuery);

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

  const astContext = getAstContext(correctedQuery, root, offset);
  const astForContext = astContext.astForContext;

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
  if (node.type === 'function') {
    const functionSignature = await getFunctionSignatureHover(node, getColumnMap);
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
