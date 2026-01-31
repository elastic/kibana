/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCallbacks } from '@kbn/esql-types';
import { Parser } from '../../parser';
import { within, Walker } from '../../ast';
import type { ESQLAstPromqlCommand, ESQLFunction } from '../../types';
import {
  getFormattedFunctionSignature,
  getFunctionDefinition,
} from '../../commands/definitions/utils';
import { getFormattedPromqlFunctionSignature } from '../../commands/definitions/utils/hover/functions';
import { getPromqlFunctionDefinition } from '../../commands/definitions/utils/promql';
import { PromQLParser } from '../../promql/parser/parser';
import { getColumnsByTypeRetriever } from '../shared/columns_retrieval_helpers';
import { findSubquery } from '../shared/subqueries_helpers';
import { getQueryForFields } from '../shared/get_query_for_fields';
import { correctQuerySyntax } from '../shared/query_syntax_helpers';
import {
  calculatePromqlArgIndex,
  extractPromqlText,
  findPromqlFunctionAtOffset,
  getArgumentToHighlightIndex,
  getParameterList,
} from './helpers';
import { getUnmappedFieldsStrategy } from '../../commands/definitions/utils/settings';

const MAX_PARAM_TYPES_TO_SHOW = 3;

interface SignatureHelpItem {
  signatures: Array<{
    label: string;
    documentation?: string;
    parameters: Array<{
      label: string;
      documentation?: string;
    }>;
  }>;
  activeSignature: number;
  activeParameter: number;
}

export async function getSignatureHelp(
  fullText: string,
  offset: number,
  callbacks?: ESQLCallbacks
): Promise<SignatureHelpItem | undefined> {
  const innerText = fullText.substring(0, offset);

  // Corrects the query to be able to work with incomplete syntax
  const correctedQuery = correctQuerySyntax(fullText, offset);
  const { root } = Parser.parse(correctedQuery);

  // Check if cursor is inside a PROMQL command
  const promqlCommand = root.commands.find(
    (cmd): cmd is ESQLAstPromqlCommand => cmd.name === 'promql' && offset >= cmd.location.min
  );

  if (promqlCommand) {
    return getPromqlSignatureHelp(promqlCommand, fullText, offset);
  }

  // Find the function node that contains the cursor
  let fnNode: ESQLFunction | undefined;
  Walker.walk(root, {
    visitFunction: (fn) => {
      const leftParen = fullText.indexOf('(', fn.location.min);
      if (leftParen < offset && within(offset - 1, fn)) {
        fnNode = fn;
      }
    },
  });
  if (!fnNode) {
    return undefined;
  }

  // Get the function definition
  const fnDefinition = getFunctionDefinition(fnNode.name);
  if (!fnDefinition) {
    return undefined;
  }

  // Calculate the argument to highlight based on cursor position
  let currentArgIndex = getArgumentToHighlightIndex(innerText, fnNode, offset);
  // Handle repeating signatures like CASE(cond, value, cond, value...).
  const isSignatureRepeating =
    fnDefinition.signatures?.some((sig) => sig.isSignatureRepeating) ?? false;
  if (isSignatureRepeating) {
    const maxParams = Math.max(
      ...(fnDefinition.signatures?.map((sig) => sig.params.length) ?? [1])
    );
    currentArgIndex = currentArgIndex % maxParams;
  }

  // Gets the columns map of the query, to do type matching for the function arguments
  const { subQuery } = findSubquery(root, offset);
  const astForContext = subQuery ?? root;
  const { getColumnMap } = getColumnsByTypeRetriever(
    getQueryForFields(fullText, astForContext),
    fullText,
    callbacks
  );
  const columnsMap = await getColumnMap();

  const unmappedFieldsStrategy = getUnmappedFieldsStrategy(root.header);

  // Get the formatted function signature, with type filtering based on current args
  const formattedSignature = getFormattedFunctionSignature(
    fnDefinition,
    fnNode,
    columnsMap,
    unmappedFieldsStrategy,
    MAX_PARAM_TYPES_TO_SHOW
  );
  const parameters: string[] = getParameterList(formattedSignature);

  const signature = {
    label: formattedSignature,
    parameters:
      parameters.map((param) => {
        const paramDefinition = fnDefinition.signatures
          ?.flatMap((sig) => sig.params)
          .find((p) => param.startsWith(p.name));
        return {
          label: param,
          documentation: paramDefinition?.description ? paramDefinition?.description : '',
        };
      }) || [],
  };

  return {
    signatures: [signature],
    activeSignature: 0,
    // Math.min for the variadic functions, that can have more arguments than the defined parameters
    activeParameter: Math.min(currentArgIndex, parameters.length - 1),
  };
}

function getPromqlSignatureHelp(
  command: ESQLAstPromqlCommand,
  fullText: string,
  offset: number
): SignatureHelpItem | undefined {
  const extracted = extractPromqlText(command.query, fullText);
  if (!extracted) {
    return undefined;
  }

  const { text, start } = extracted;
  if (offset < start || offset > start + text.length) {
    return undefined;
  }

  const { root } = PromQLParser.parse(text, { offset: start });

  const functionNode = root.expression
    ? findPromqlFunctionAtOffset(root.expression, offset, fullText)
    : undefined;

  if (!functionNode) {
    return undefined;
  }

  const fnDefinition = getPromqlFunctionDefinition(functionNode.name);
  if (!fnDefinition) {
    return undefined;
  }

  const currentArgIndex = calculatePromqlArgIndex(fullText, functionNode, offset);
  const formattedSignature = getFormattedPromqlFunctionSignature(fnDefinition);
  const parameters = getParameterList(formattedSignature);

  return {
    signatures: [
      {
        label: formattedSignature,
        documentation: fnDefinition.description,
        parameters: parameters.map((param) => ({
          label: param,
          documentation:
            fnDefinition.signatures
              ?.flatMap((sig) => sig.params)
              .find((p) => param.startsWith(p.name))?.description ?? '',
        })),
      },
    ],
    activeSignature: 0,
    activeParameter: Math.min(currentArgIndex, parameters.length - 1),
  };
}
