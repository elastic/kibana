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
import { isIdentifier, isList, isSource } from '../../../ast/is';
import type { ICommandContext } from '../types';
import { getMessageFromId } from '../../definitions/utils';
import { sourceExists } from '../../definitions/utils/sources';
import { errors } from '../../definitions/utils/errors';
import {
  getUsedPromqlParamNames,
  IDENTIFIER_PATTERN,
  isPromqlParamName,
  looksLikePromqlParamAssignment,
  PROMQL_KEYWORD,
  PROMQL_PARAM_NAMES,
  PROMQL_REQUIRED_PARAMS,
} from './utils';

// ISO 8601 with Z, optional milliseconds (e.g. 2024-01-15T10:00:00Z or ...00.000Z).
const FORMAT_DATE_LITERAL_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
// Prometheus duration format (one or more number+unit segments).
const FORMAT_STEP_DURATION_REGEX = /^([0-9]+(ms|s|m|h|d|w|y))+$/;
// Catches split step values like "step= 1 m" which the parser drops from params.
const STEP_WITH_SPACES_REGEX = /\bstep\s*=\s*\d+\s+[a-z]+/i;
// Strips the leading PROMQL keyword from the raw command text.
const PROMQL_LEADING_KEYWORD_REGEX = new RegExp(`^\\s*${PROMQL_KEYWORD}\\s*`, 'i');
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
  const requiredParams = PROMQL_REQUIRED_PARAMS;

  if (STEP_WITH_SPACES_REGEX.test(command.text) && !paramValues.has('step')) {
    messages.push(
      getMessageFromId({
        messageId: 'promqlInvalidStepParam',
        values: {},
        locations: command.location,
      })
    );
  }

  for (const param of PROMQL_PARAM_NAMES) {
    if (!paramValues.has(param) && hasEmptyParamAssignment(command.text, param)) {
      messages.push({
        ...getMessageFromId({
          messageId: 'promqlMissingParamValue',
          values: { param },
          locations: command.location,
        }),
      });
    }
  }

  for (const param of requiredParams) {
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

  const indexParam = paramValues.get('index');
  if (indexParam && _context?.timeSeriesSources) {
    const indexValue = stripQuotes(indexParam.value);
    const hasWildcard = indexValue.includes('*');

    if (!hasWildcard && indexValue !== '') {
      const sourcesSet = new Set(_context.timeSeriesSources.map((source) => source.name));

      if (!sourceExists(indexValue, sourcesSet)) {
        messages.push(errors.byId('unknownIndex', indexParam.location, { name: indexValue }));
      }
    }
  }

  // Basic value checks: presence, and minimal format for start/end.
  for (const [param, { value, location, entryLocation }] of paramValues) {
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
            locations: location,
          }),
        });
      }
    }
  }

  const trimmedQueryText = queryText.trim();
  const tailQueryText = getPromqlQueryTail(command);
  const hasQuery = [trimmedQueryText, tailQueryText].some(
    (text) => text !== '' && !looksLikePromqlParamAssignment(text)
  );

  if (!hasQuery) {
    const queryLocation = looksLikePromqlParamAssignment(trimmedQueryText)
      ? command.location
      : command.query?.location ?? command.location;
    messages.push({
      ...getMessageFromId({
        messageId: 'promqlMissingQuery',
        values: {},
        locations: queryLocation,
      }),
    });
  }

  return messages;
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

/* Collects param values from AST and from the query tail when the parser misplaces the last param. */
function collectPromqlParamValues(
  command: ESQLAstPromqlCommand,
  queryText: string
): Map<string, { value: string; location: ESQLLocation; entryLocation?: ESQLLocation }> {
  const values = new Map<
    string,
    { value: string; location: ESQLLocation; entryLocation?: ESQLLocation }
  >();

  const params = getPromqlParamsMap(command);
  if (params && params.type === 'map') {
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
/*
 * Extracts the PromQL query text from the AST.
 *
 * Examples of what this function returns:
 *   PROMQL (rate(x[5m]))           → "rate(x[5m])"
 *   PROMQL rate(x[5m])             → "rate(x[5m])"
 *   PROMQL col0=(rate(x[5m]))      → "" (assignment case, use getPromqlQueryTail instead)
 */
function getPromqlQueryText(command: ESQLAstPromqlCommand): string {
  if (command.query?.text) {
    return command.query.text;
  }

  const queryNode = command.query as { type?: string; child?: { text?: string } } | undefined;

  if (queryNode?.type === 'parens' && queryNode.child?.text) {
    return queryNode.child.text;
  }

  const args = (command as { args?: Array<{ type?: string; text?: string }> }).args;
  if (!args || args.length === 0) {
    return '';
  }

  if (args.length === 2) {
    return args[1]?.text ?? '';
  }

  if (args.length === 1 && args[0]?.type !== 'map') {
    return args[0]?.text ?? '';
  }

  return '';
}

/* Pulls the params map from the command args when present. */
function getPromqlParamsMap(command: ESQLAstPromqlCommand) {
  return command.args && command.args.length > 0 && !Array.isArray(command.args[0])
    ? command.args[0]
    : undefined;
}

/*
 * Text-based extraction of the query portion from command.text.
 * Strips the PROMQL keyword and known params, returning whatever remains.
 * Needed when getPromqlQueryText can't extract from AST (e.g. assignment case).
 *
 * Example: "PROMQL step=5m col0=(rate(x[5m]))" → "col0=(rate(x[5m]))"
 */
function getPromqlQueryTail(command: ESQLAstPromqlCommand): string {
  let rest = command.text.replace(PROMQL_LEADING_KEYWORD_REGEX, '');
  const params = getPromqlParamsMap(command);

  if (params && params.type === 'map') {
    for (const entry of params.entries) {
      // Consume whitespace and an optional comma separator before the next param.
      rest = rest.trimStart();

      if (rest.startsWith(',')) {
        rest = rest.slice(1).trimStart();
      }

      const key = isIdentifier(entry.key) ? entry.key.name : entry.key.text;
      const normalizedKey = key.toLowerCase();

      if (!isPromqlParamName(normalizedKey)) {
        continue;
      }

      const rawValue = getPromqlParamValueText(entry.value);
      const keyPrefix = `${key}=`;
      const valuePrefix = `${keyPrefix}${rawValue}`;
      const lowerRest = rest.toLowerCase();

      if (lowerRest.startsWith(valuePrefix.toLowerCase())) {
        rest = rest.slice(valuePrefix.length);
        continue;
      }

      if (lowerRest.startsWith(keyPrefix.toLowerCase())) {
        rest = rest.slice(keyPrefix.length);
      }
    }
  }

  return rest.trim();
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

/* Detects empty "<param>=" assignments in a loose, text-only way. */
function hasEmptyParamAssignment(text: string, param: string): boolean {
  const compact = text.toLowerCase().replace(/\s+/g, '');
  const needle = `${param.toLowerCase()}=`;
  const indexPos = compact.indexOf(needle);

  if (indexPos === -1) {
    return false;
  }

  const after = compact.slice(indexPos + needle.length);
  if (after === '') {
    return true;
  }

  return PROMQL_PARAM_NAMES.some((name) => after.startsWith(`${name}=`));
}
