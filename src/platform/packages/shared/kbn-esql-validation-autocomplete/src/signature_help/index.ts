/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Walker, Parser, type ESQLFunction, Builder } from '@kbn/esql-ast';
import { within } from '@kbn/esql-ast/src/ast/location';
import { getFunctionDefinition } from '@kbn/esql-ast/src/definitions/utils';
import { SignatureAnalyzer } from '@kbn/esql-ast/src/definitions/utils/autocomplete/expressions/signature_analyzer';
import { unescapeColumnName } from '@kbn/esql-ast/src/definitions/utils/shared';
import type { FunctionParameter, Signature } from '@kbn/esql-ast/src/definitions/types';
import type { ESQLCallbacks } from '../shared/types';
import { getColumnsByTypeRetriever } from '../autocomplete/autocomplete';

export interface SignatureHelpItem {
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

/**
 * Fallback to find a function call by analyzing text when AST parsing fails.
 * Creates mock function nodes without type information - types are enriched later.
 */
function findFunctionByTextAnalysis(
  fullText: string,
  offset: number
): ESQLFunction<'variadic-call'> | undefined {
  let parenDepth = 0;
  let openParenPos = -1;

  // Find opening parenthesis by walking backwards
  for (let charIndex = offset - 1; charIndex >= 0; charIndex--) {
    const char = fullText[charIndex];

    if (char === ')') {
      parenDepth++;
    } else if (char === '(') {
      if (parenDepth === 0) {
        openParenPos = charIndex;
        break;
      }

      parenDepth--;
    }
  }

  if (openParenPos === -1) {
    return undefined;
  }

  // Extract function name before the parenthesis
  const textBeforeParen = fullText.substring(0, openParenPos);
  const functionNameMatch = textBeforeParen.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*$/);

  if (!functionNameMatch) {
    return undefined;
  }

  const functionName = functionNameMatch[1].toLowerCase();
  const argsText = fullText.substring(openParenPos + 1, offset);
  const args = parseSimpleArguments(argsText);

  return {
    name: functionName,
    type: 'function',
    subtype: 'variadic-call',
    text: '',
    location: {
      min: openParenPos - functionName.length,
      max: offset,
    },
    args,
    incomplete: false,
  } as unknown as ESQLFunction<'variadic-call'>;
}

/**
 * Parse arguments from text, accounting for nested parentheses.
 * Essential for incomplete queries where AST parsing fails.
 * Example: "BUCKET(bytes, " → args: ["bytes", ""]
 */
function parseSimpleArguments(argsText: string): any[] {
  const args: any[] = [];
  let currentArg = '';
  let parenDepth = 0;
  let lastWasComma = false;

  for (let charIndex = 0; charIndex < argsText.length; charIndex++) {
    const char = argsText[charIndex];

    if (char === '(') {
      parenDepth++;
      currentArg += char;
    } else if (char === ')') {
      parenDepth--;
      currentArg += char;
    } else if (char === ',' && parenDepth === 0) {
      args.push(createMockArgument(currentArg.trim()));
      currentArg = '';
      lastWasComma = true;
    } else {
      currentArg += char;
    }
  }

  // Add last argument (or empty arg if trailing comma)
  if (currentArg.trim() || lastWasComma) {
    args.push(createMockArgument(currentArg.trim()));
  }

  return args;
}

/**
 * Create minimal mock argument nodes for text-based detection.
 * Only distinguish literals (for type inference) from columns.
 */
function createMockArgument(argText: string): any {
  if (!argText) {
    return { type: 'unknown', text: '', incomplete: true, location: { min: 0, max: 0 }, name: '' };
  }

  const numValue = Number(argText);

  if (!isNaN(numValue)) {
    return Number.isInteger(numValue)
      ? Builder.expression.literal.integer(numValue)
      : Builder.expression.literal.decimal(numValue);
  }

  // Note: unescaping will be handled later by getColumnWithPrefixMatch
  return Builder.expression.column(argText);
}

const columnPrefixCache = new WeakMap<Map<string, any>, Map<string, any>>();

/**
 * Get column info with prefix matching and caching.
 * First tries direct lookup, then prefix match for partial column names.
 */
function getColumnWithPrefixMatch(
  columnsMap: Map<string, any>,
  columnName: string
): any | undefined {
  const unescaped = unescapeColumnName(columnName);

  // Direct lookup first
  const direct = columnsMap.get(unescaped);
  if (direct) {
    return direct;
  }

  // Check cache for prefix matches
  if (!columnPrefixCache.has(columnsMap)) {
    const prefixMap = new Map<string, any>();

    Array.from(columnsMap.entries()).forEach(([name, info]) => {
      const lowerName = name.toLowerCase();

      // Add prefixes of length 1, 2, and 3
      for (let len = 1; len <= 3 && len <= lowerName.length; len++) {
        const prefix = lowerName.substring(0, len);

        if (!prefixMap.has(prefix)) {
          prefixMap.set(prefix, info);
        }
      }
    });

    columnPrefixCache.set(columnsMap, prefixMap);
  }

  // Use cached prefix match with unescaped name
  const prefixMap = columnPrefixCache.get(columnsMap)!;
  const prefix = unescaped.toLowerCase();

  // Try exact prefix match first, then progressively shorter prefixes
  for (let len = Math.min(prefix.length, 3); len >= 1; len--) {
    const searchPrefix = prefix.substring(0, len);
    const match = prefixMap.get(searchPrefix);

    if (match) {
      return match;
    }
  }

  return undefined;
}

/**
 * Score a signature based on how well it matches the provided argument types.
 * Higher score = better match
 */
function scoreSignature(signature: Signature, argTypes: (string | undefined)[]): number {
  let score = 0;

  for (let i = 0; i < argTypes.length && i < signature.params.length; i++) {
    const argType = argTypes[i];

    if (!argType) {
      continue;
    }

    const paramType = signature.params[i]?.type;

    if (!paramType) {
      continue;
    }

    const matches = Array.isArray(paramType) ? paramType.includes(argType) : paramType === argType;

    if (matches) {
      score += 10; // High score for exact type match
    }
  }

  // Bonus for longer signatures (more specific)
  score += signature.params.length;

  return score;
}

/**
 * Get columns map for the correct command context
 */
async function getColumnsMapForCommand(
  root: any,
  fullText: string,
  callbacks: ESQLCallbacks | undefined,
  commandIndex: number
): Promise<Map<string, any>> {
  if (commandIndex > 0) {
    const queryBeforeCommand = {
      ...root,
      commands: root.commands.slice(0, commandIndex),
    };
    const { getColumnMap } = getColumnsByTypeRetriever(queryBeforeCommand, fullText, callbacks);

    return await getColumnMap();
  }

  const { getColumnMap } = getColumnsByTypeRetriever(root, fullText, callbacks);

  return await getColumnMap();
}

export async function getSignatureHelp(
  fullText: string,
  offset: number,
  callbacks?: ESQLCallbacks
): Promise<SignatureHelpItem | undefined> {
  const { root } = Parser.parse(fullText);

  const astFunctionNode = Walker.findAll(root, (node): node is ESQLFunction<'variadic-call'> => {
    if (node.type !== 'function' || node.subtype !== 'variadic-call') {
      return false;
    }

    // Check if cursor is within the function arguments (after opening paren)
    const leftParen = fullText.indexOf('(', node.location.min);

    return leftParen < offset && within(offset, node);
  })[0] as ESQLFunction<'variadic-call'> | undefined;

  // Fallback: try text-based detection for incomplete queries
  const functionNode = astFunctionNode || findFunctionByTextAnalysis(fullText, offset);

  if (!functionNode) {
    return undefined;
  }

  const { location } = functionNode;
  let commandIndex = -1;

  if (location) {
    commandIndex = root.commands.findIndex(
      ({ location: cmdLocation }) =>
        cmdLocation.min <= location.min && cmdLocation.max >= location.max
    );
  }

  if (commandIndex === -1) {
    commandIndex = root.commands.findIndex((cmd) => {
      const functionsInCommand = Walker.findAll(cmd, (node) => node.type === 'function');

      return functionsInCommand.some((fn) => fn === functionNode);
    });
  }

  const columnsMap = await getColumnsMapForCommand(root, fullText, callbacks, commandIndex);
  const fnDefinition = getFunctionDefinition(functionNode.name);

  if (!fnDefinition) {
    return undefined;
  }

  // Use SignatureAnalyzer for type analysis and signature filtering
  const analyzer = SignatureAnalyzer.fromNode(functionNode, { columns: columnsMap }, fnDefinition);

  let validSignatures = analyzer ? analyzer.getValidSignatures() : fnDefinition.signatures;
  const argIndex = analyzer
    ? analyzer.getCurrentParameterIndex()
    : Math.max(functionNode.args.length - 1, 0);

  if (functionNode.args.length > 0) {
    const argTypes: (string | undefined)[] = functionNode.args.map((arg) => {
      if (!arg || !('type' in arg) || arg.type !== 'column' || !('name' in arg)) {
        return undefined;
      }

      // Get column info (unescaping is handled by getColumnWithPrefixMatch)
      const columnName = String(arg.name);
      const columnInfo = getColumnWithPrefixMatch(columnsMap, columnName);

      return columnInfo && 'type' in columnInfo ? columnInfo.type : undefined;
    });

    const hasKnownTypes = argTypes.some((type) => type !== undefined);

    if (hasKnownTypes) {
      validSignatures = [...validSignatures].sort(
        (a, b) => scoreSignature(b, argTypes) - scoreSignature(a, argTypes)
      );
    }
  }

  const signatures = validSignatures.map((signature) => ({
    label: buildSignatureLabel(functionNode.name, signature),
    documentation: fnDefinition.description,
    parameters: signature.params.map((param) => ({
      label: buildParameterLabel(param),
      documentation: buildParameterDocumentation(param),
    })),
  }));

  return {
    signatures,
    activeSignature: 0,
    activeParameter: Math.min(argIndex, signatures[0]?.parameters.length - 1 ?? 0),
  };
}

function buildSignatureLabel(functionName: string, { params, returnType }: Signature): string {
  const paramsLabel = params.map((param) => buildParameterLabel(param)).join(', ');

  return `${functionName.toUpperCase()}(${paramsLabel}): ${returnType}`;
}

function buildParameterLabel({ name, optional, type }: FunctionParameter): string {
  const optionalMarker = optional ? '?' : '';
  const typeStr = Array.isArray(type) ? type.join(' | ') : type;

  return `${name}${optionalMarker}: ${typeStr}`;
}

function buildParameterDocumentation(param: FunctionParameter): string {
  return [
    param.constantOnly && 'constant value only',
    param.fieldsOnly && 'field names only',
    param.supportsWildcard && 'supports wildcards',
    param.optional && 'optional',
  ]
    .filter(Boolean)
    .join(', ');
}
