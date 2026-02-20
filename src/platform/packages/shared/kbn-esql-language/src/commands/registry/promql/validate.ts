/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ESQLAst,
  ESQLAstAllCommands,
  ESQLAstExpression,
  ESQLAstPromqlCommand,
  ESQLLocation,
  ESQLMessage,
} from '../../../types';
import { Walker } from '../../../ast';
import { isIdentifier, isList, isSource } from '../../../ast/is';
import type { ICommandContext } from '../types';
import { getMessageFromId } from '../../definitions/utils';
import {
  getPromqlFunctionDefinition,
  getPromqlOperatorDefinition,
  isPromqlAcrossSeriesFunction,
} from '../../definitions/utils/promql';
import { getPromqlExpressionType } from '../../definitions/utils/expressions';
import { sourceExists } from '../../definitions/utils/sources';
import { errors } from '../../definitions/utils/errors';
import { validateColumnForCommand } from '../../definitions/utils/validation/column';
import type { PromQLFunctionDefinition } from '../../definitions/types';
import {
  getPromqlFunctionArityCheck,
  getPromqlMatchingSignatures,
  getPromqlSignatureMismatch,
} from '../../definitions/utils/validation/function';
import type {
  PromQLBinaryExpression,
  PromQLFunction,
  PromQLLabelName,
  PromQLSelector,
} from '../../../embedded_languages/promql/types';
import {
  getUsedPromqlParamNames,
  IDENTIFIER_PATTERN,
  isPromqlParamName,
  looksLikePromqlParamAssignment,
  PROMQL_REQUIRED_PARAMS,
} from './utils';

// ISO 8601 with Z, optional milliseconds (e.g. 2024-01-15T10:00:00Z or ...00.000Z).
const FORMAT_DATE_LITERAL_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
// Prometheus duration format (one or more number+unit segments).
const FORMAT_STEP_DURATION_REGEX = /^([0-9]+(ms|s|m|h|d|w|y))+$/;
// Catches split step values like "step= 1 m" which the parser drops from params.
const STEP_WITH_SPACES_REGEX = /\bstep\s*=\s*\d+\s+[a-z]+/i;
// Extracts "param = value" from the query field when the last param is mis-parsed.
const PROMQL_QUERY_PARAM_VALUE_REGEX = new RegExp(`^\\s*(${IDENTIFIER_PATTERN})\\s*=\\s*(\\S*)`);

export const validate = (
  _command: ESQLAstAllCommands,
  _ast: ESQLAst,
  _context?: ICommandContext
): ESQLMessage[] => {
  const command = _command as ESQLAstPromqlCommand;
  const messages: ESQLMessage[] = [];
  const queryText = getPromqlQueryText(command);
  const paramValues = collectPromqlParamValues(command, queryText);
  const usedParams = new Set(paramValues.keys());

  for (const param of getUsedPromqlParamNames(command.text)) {
    usedParams.add(param);
  }

  if (STEP_WITH_SPACES_REGEX.test(command.text) && !paramValues.has('step')) {
    messages.push(
      getMessageFromId({
        messageId: 'promqlInvalidStepParam',
        values: {},
        locations: command.location,
      })
    );
  }

  for (const param of PROMQL_REQUIRED_PARAMS) {
    if (usedParams.has(param)) {
      continue;
    }

    messages.push({
      ...getMessageFromId({
        messageId: 'promqlMissingParam',
        values: { param },
        locations: command.location,
      }),
    });
  }

  const hasStart = usedParams.has('start');
  const hasEnd = usedParams.has('end');

  if (hasStart !== hasEnd) {
    messages.push({
      ...getMessageFromId({
        messageId: 'promqlMissingParam',
        values: { param: hasStart ? 'end' : 'start' },
        locations: command.location,
      }),
    });
  }

  if (_context?.timeSeriesSources) {
    const sourcesSet = new Set(_context.timeSeriesSources.map((src) => src.name));
    validateIndexSources(command, sourcesSet, messages, paramValues);
  }

  // Basic value checks: presence, and minimal format for start/end.
  for (const [param, { value, location, entryLocation, keyLocation }] of paramValues) {
    if (value === '') {
      messages.push({
        ...getMessageFromId({
          messageId: 'promqlMissingParamValue',
          values: { param },
          locations: entryLocation ?? location,
        }),
      });
      continue;
    }

    if (param === 'start' || param === 'end') {
      const normalized = stripQuotes(value);
      const isPlaceholder = normalized === '?_tstart' || normalized === '?_tend';

      if (!isPlaceholder && !FORMAT_DATE_LITERAL_REGEX.test(normalized)) {
        messages.push({
          ...getMessageFromId({
            messageId: 'promqlInvalidDateParam',
            values: { param },
            locations: location,
          }),
        });
      }
    }

    if (param === 'step') {
      const normalized = stripQuotes(value);

      if (!FORMAT_STEP_DURATION_REGEX.test(normalized)) {
        messages.push({
          ...getMessageFromId({
            messageId: 'promqlInvalidStepParam',
            values: {},
            locations: keyLocation ?? location,
          }),
        });
      }
    }
  }

  const hasQuery = hasValidQuery(command);

  if (!hasQuery) {
    messages.push({
      ...getMessageFromId({
        messageId: 'promqlMissingQuery',
        values: {},
        locations: command.location,
      }),
    });
  }

  const shouldValidateColumns = hasQuery && !command.query?.incomplete;
  return [...messages, ...validatePromqlQuery(command, _context, shouldValidateColumns)];
};

// ============================================================================
// Helpers
// ============================================================================

/* Normalizes quoted literals so validators can compare raw values. */
function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

/**
 * Checks if the command has a valid PromQL query using AST structure.
 * Returns true if query exists and is not a misplaced param assignment.
 */
function hasValidQuery(command: ESQLAstPromqlCommand): boolean {
  const query = command.query;

  if (!query) {
    return false;
  }

  if (query.type === 'parens' || query.type === 'function') {
    return true;
  }

  const text = query.text?.trim() ?? '';

  if (text === '' || text.startsWith('=')) {
    return false;
  }

  const expression = query.expression;

  if (
    query.incomplete &&
    expression?.type === 'selector' &&
    isPromqlParamName(expression.name ?? '')
  ) {
    return false;
  }

  return true;
}

/** Validates index sources with precise locations for each source in the list.*/
function validateIndexSources(
  command: ESQLAstPromqlCommand,
  sourcesSet: Set<string>,
  messages: ESQLMessage[],
  paramValues: Map<
    string,
    {
      value: string;
      location: ESQLLocation;
      entryLocation?: ESQLLocation;
      keyLocation?: ESQLLocation;
    }
  >
): void {
  const params = command.params;
  const indexEntry = params?.entries.find(
    (entry) => isIdentifier(entry.key) && entry.key.name.toLowerCase() === 'index'
  );

  if (indexEntry) {
    const indexValue = indexEntry.value;
    const sources = isList(indexValue)
      ? indexValue.values.filter(isSource)
      : isSource(indexValue)
      ? [indexValue]
      : [];

    for (const source of sources) {
      const indexName = source.name;

      if (indexName && isPromqlParamName(indexName.toLowerCase())) {
        continue;
      }

      if (indexName && !sourceExists(indexName, sourcesSet)) {
        messages.push(errors.byId('unknownIndex', source.location, { name: indexName }));
      }
    }

    return;
  }

  // Fallback: handles case when index is mis-parsed into query field
  const indexParam = paramValues.get('index');
  if (indexParam && indexParam.value) {
    const indexName = stripQuotes(indexParam.value);

    if (!sourceExists(indexName, sourcesSet)) {
      messages.push(errors.byId('unknownIndex', indexParam.location, { name: indexName }));
    }

    return;
  }
}

/* Collects param values from AST and from the query tail when the parser misplaces the last param. */
function collectPromqlParamValues(
  command: ESQLAstPromqlCommand,
  queryText: string
): Map<
  string,
  {
    value: string;
    location: ESQLLocation;
    entryLocation?: ESQLLocation;
    keyLocation?: ESQLLocation;
  }
> {
  const values = new Map<
    string,
    {
      value: string;
      location: ESQLLocation;
      entryLocation?: ESQLLocation;
      keyLocation?: ESQLLocation;
    }
  >();

  const params = command.params;

  if (params) {
    for (const entry of params.entries) {
      const key = isIdentifier(entry.key) ? entry.key.name.toLowerCase() : entry.key.text;

      if (!isPromqlParamName(key)) {
        continue;
      }

      const rawValue = getPromqlParamValueText(entry.value);
      const value = looksLikePromqlParamAssignment(rawValue) ? '' : rawValue;

      values.set(key, {
        value,
        location: entry.value.location ?? entry.location ?? command.location,
        // Keep the full entry location so empty values can highlight the param assignment, not the next token.
        entryLocation: entry.location ?? entry.key.location ?? command.location,
        // Keep the key location for errors that should only highlight the param name.
        keyLocation: entry.key.location ?? command.location,
      });
    }
  }

  if (queryText && looksLikePromqlParamAssignment(queryText)) {
    const parsed = extractTrailingParamFromQuery(queryText);

    if (parsed && isPromqlParamName(parsed.param)) {
      values.set(parsed.param, {
        value: parsed.value ?? '',
        location: command.query?.location ?? command.location,
      });
    }
  }

  return values;
}

function getPromqlParamValueText(value: ESQLAstExpression | undefined): string {
  if (!value) return '';

  const text = value.text?.trim();
  if (text) return text;

  if (isList(value)) {
    const parts = value.values
      .map((item) => item.text?.trim() || (isIdentifier(item) || isSource(item) ? item.name : ''))
      .filter(Boolean);

    return parts.join(',');
  }

  if (isIdentifier(value) || isSource(value)) return value.name;

  return '';
}
/**
 * Extracts the PromQL query text from AST.
 * Used to detect misplaced params in query field via extractTrailingParamFromQuery.
 */
function getPromqlQueryText(command: ESQLAstPromqlCommand): string {
  const query = command.query;

  if (!query) {
    return '';
  }

  if (query.text) {
    return query.text;
  }

  // For parens nodes, get the child text
  const parensNode = query as { type?: string; child?: { text?: string } };

  if (parensNode.type === 'parens' && parensNode.child?.text) {
    return parensNode.child.text;
  }

  return '';
}

/* Extracts the last param assignment when it is incorrectly placed in the query field. */
function extractTrailingParamFromQuery(
  queryText: string
): { param: string; value: string } | undefined {
  const match = queryText.match(PROMQL_QUERY_PARAM_VALUE_REGEX);
  if (!match) {
    return undefined;
  }

  const param = match[1].toLowerCase();
  if (!isPromqlParamName(param)) {
    return undefined;
  }

  return { param, value: match[2] ?? '' };
}

// ============================================================================
// PromQL query validation (walker-based)
// ============================================================================

function validatePromqlQuery(
  command: ESQLAstPromqlCommand,
  context?: ICommandContext,
  shouldValidateColumns: boolean = false
): ESQLMessage[] {
  const queryNode = command.query;

  if (!queryNode || queryNode.incomplete) {
    return [];
  }

  const messages: ESQLMessage[] = [];
  const selectors: PromQLSelector[] = [];
  const groupingArgs: PromQLLabelName[] = [];

  // ES|QL Walker needed: command.query can be ESQLParens/ESQLFunction wrapping PromQL content.
  Walker.walk(queryNode, {
    promql: {
      visitPromqlFunction: (fn) => {
        const definition = getPromqlFunctionDefinition(fn.name);

        messages.push(
          ...getUnknownFunctionErrors(fn, definition),
          ...getFunctionArityErrors(fn, definition),
          ...getMatchingSignatureErrors(fn, definition),
          ...getGroupingErrors(fn)
        );
        if (fn.grouping) groupingArgs.push(...fn.grouping.args);
      },

      visitPromqlSelector: (selector) => {
        selectors.push(selector);
      },

      visitPromqlBinaryExpression: (binary) => {
        const definition = getPromqlOperatorDefinition(binary.name);
        messages.push(...getBinaryOperatorTypeErrors(binary, definition));
      },
    },
  });

  if (context && shouldValidateColumns) {
    const completeSelectors = selectors.filter(({ incomplete }) => !incomplete);
    messages.push(...getColumnErrors(completeSelectors, groupingArgs, command.name, context));
  }

  return messages;
}

/* Returns an error when a function name is not present in the PromQL registry. */
function getUnknownFunctionErrors(
  fn: PromQLFunction,
  definition: PromQLFunctionDefinition | undefined
): ESQLMessage[] {
  if (!definition) {
    return [
      getMessageFromId({
        messageId: 'promqlUnknownFunction',
        values: { fn: fn.name },
        locations: fn.location,
      }),
    ];
  }

  return [];
}

/* Returns an error when function arity doesn't match signature min/max parameter counts. */
function getFunctionArityErrors(
  fn: PromQLFunction,
  definition: PromQLFunctionDefinition | undefined
): ESQLMessage[] {
  if (!definition) return [];

  const check = getPromqlFunctionArityCheck(fn, definition);
  if (!check) return [];

  return [
    getMessageFromId({
      messageId: 'promqlWrongNumberArgs',
      values: { fn: fn.name, expected: check.expected, actual: check.actual },
      locations: fn.location,
    }),
  ];
}

/* Returns an error when grouping (by/without) is used on a non-aggregation function. */
function getGroupingErrors(fn: PromQLFunction): ESQLMessage[] {
  const { grouping, name } = fn;

  if (!grouping || isPromqlAcrossSeriesFunction(name)) {
    return [];
  }

  return [
    getMessageFromId({
      messageId: 'promqlGroupingNotAllowed',
      values: { fn: name },
      locations: grouping.location,
    }),
  ];
}

/* Returns an error when argument types don't match any signature for the given arity. */
function getMatchingSignatureErrors(
  fn: PromQLFunction,
  definition: PromQLFunctionDefinition | undefined
): ESQLMessage[] {
  if (!definition || fn.incomplete) return [];

  const argTypes = fn.args.map((arg) => getPromqlExpressionType(arg));
  if (argTypes.some((argType) => argType === undefined)) return [];

  const matching = getPromqlMatchingSignatures(definition.signatures, argTypes);
  if (matching.length > 0) return [];

  const mismatch = getPromqlSignatureMismatch(definition.signatures, argTypes, fn.args.length);
  if (!mismatch) return [];

  return [
    getMessageFromId({
      messageId: 'promqlNoMatchingSignature',
      values: { fn: fn.name, required: mismatch.required },
      locations: getPromqlNodeLocation(fn.args[mismatch.mismatchIdx], fn.location),
    }),
  ];
}

/* Returns an error when binary operator operand types don't match any signature. */
function getBinaryOperatorTypeErrors(
  binary: PromQLBinaryExpression,
  definition: PromQLFunctionDefinition | undefined
): ESQLMessage[] {
  if (!definition || binary.incomplete) return [];

  const argTypes = [binary.left, binary.right].map(getPromqlExpressionType);
  if (argTypes.some((argType) => !argType)) return [];

  const matching = getPromqlMatchingSignatures(definition.signatures, argTypes);
  if (matching.length > 0) return [];

  const mismatch = getPromqlSignatureMismatch(definition.signatures, argTypes, 2);
  if (!mismatch) return [];

  const mismatchedNode = mismatch.mismatchIdx === 0 ? binary.left : binary.right;

  return [
    getMessageFromId({
      messageId: 'promqlNoMatchingSignature',
      values: { fn: binary.name, required: mismatch.required },
      locations: getPromqlNodeLocation(mismatchedNode, binary.location),
    }),
  ];
}

/* Returns errors for PromQL column references (metrics, labels, grouping) not found in ES|QL columns. */
function getColumnErrors(
  selectors: PromQLSelector[],
  groupingArgs: PromQLLabelName[],
  commandName: string,
  context: ICommandContext
): ESQLMessage[] {
  const metrics = selectors.map(({ metric }) => metric);
  const labels = selectors.flatMap(
    ({ labelMap }) => labelMap?.args.map(({ labelName }) => labelName) ?? []
  );

  const columns = [...metrics, ...labels, ...groupingArgs].filter((node) => isIdentifier(node));

  return columns.flatMap((column) =>
    validateColumnForCommand(
      { ...column, text: column.name, incomplete: !!column.incomplete },
      commandName,
      context
    )
  );
}

// ----------------------------------------------------------------------------
// Utilities
// ----------------------------------------------------------------------------

/* Extracts a node location for precise error highlighting. */
function getPromqlNodeLocation(node: unknown, fallback: ESQLLocation): ESQLLocation {
  if (node && typeof node === 'object' && 'location' in node) {
    const location = (node as { location?: ESQLLocation }).location;

    if (location?.min !== undefined && location?.max !== undefined) {
      return location;
    }
  }

  return fallback;
}
