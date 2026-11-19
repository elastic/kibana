/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isColumn, isFunctionExpression, isList, isMap, isStringLiteral } from '@elastic/esql';
import type {
  ESQLAstAllCommands,
  ESQLAst,
  ESQLAstHighlightCommand,
  ESQLAstItem,
  ESQLMap,
} from '@elastic/esql/types';
import type { ESQLMessage } from '../../definitions/types';
import { FULL_TEXT_SEARCH_DEFINITIONS } from '../../definitions/constants';
import { getExpressionType } from '../../definitions/utils/expressions';
import { getMessageFromId } from '../../definitions/utils/errors';
import { validateCommandArguments } from '../../definitions/utils/validation';
import { validateMap } from '../../definitions/utils/validation/map';
import { getMapEntryByStringKeyFromAst } from '../../definitions/utils/maps';
import type { ICommandContext, ICommandCallbacks } from '../types';
import { HIGHLIGHT_PREFIX_KEYWORD, getPrefixKeyword, getQueryFieldNames } from './utils';

// `pre_tags`/`post_tags` accept `keyword | keyword[]`; using type=[keyword] still validates
// list values because getExpressionType delegates a list's type to its first element.
const HIGHLIGHT_MAP_DEFINITION =
  "{name='analyzer', description='Analyzer used to re-analyze the ON fields before highlighting', type=[keyword]}" +
  "{name='pre_tags', description='HTML tag to insert before highlighted text', type=[keyword]}" +
  "{name='post_tags', description='HTML tag to insert after highlighted text', type=[keyword]}" +
  "{name='number_of_fragments', description='Maximum number of fragments to return', type=[integer]}" +
  "{name='fragment_size', description='Size of each fragment in characters', type=[integer]}" +
  "{name='encoder', values=[default, html], description='Encoding for highlighted text', type=[keyword]}" +
  "{name='boundary_scanner', values=[sentence, word], description='How to split fragments', type=[keyword]}" +
  "{name='boundary_scanner_locale', description='Locale for boundary scanning', type=[keyword]}" +
  "{name='order', values=[none, score], description='Order of fragments', type=[keyword]}" +
  "{name='no_match_size', description='Minimum characters to return when there is no match', type=[integer]}" +
  "{name='max_analyzed_offset', description='Maximum character offset to analyze, or -1 to unset', type=[integer]}";

/**
 * Field types accepted by ES for the HIGHLIGHT ON list. `param` and `unknown` cannot be
 * resolved at validation time, so they are let through.
 */
const ALLOWED_HIGHLIGHT_FIELD_TYPES = ['text', 'keyword', 'semantic_text', 'param', 'unknown'];

/** Types reported to the user when an ON field is rejected. */
const SUPPORTED_HIGHLIGHT_FIELD_TYPES = 'text or keyword';

/** Boolean operators that may combine full-text queries. */
const BOOLEAN_QUERY_OPERATORS = ['and', 'or', 'not'];

/**
 * Returns the first node that Elasticsearch would reject as a HIGHLIGHT query, or undefined when
 * the whole expression is valid. Valid shapes are a string literal, a full-text function
 * (including the `:` operator), and AND/OR/NOT combinations of those — mirroring
 * `HighlightQueryBuilders.verifyQueryStructure`.
 */
const findInvalidQueryNode = (expression: ESQLAstItem): ESQLAstItem | undefined => {
  if (Array.isArray(expression)) {
    return expression.map(findInvalidQueryNode).find(Boolean);
  }

  if (isStringLiteral(expression)) {
    return undefined;
  }

  if (!isFunctionExpression(expression)) {
    return expression;
  }

  const functionName = expression.name.toLowerCase();

  if (BOOLEAN_QUERY_OPERATORS.includes(functionName)) {
    return expression.args.map(findInvalidQueryNode).find(Boolean);
  }

  return FULL_TEXT_SEARCH_DEFINITIONS.includes(functionName) ? undefined : expression;
};

const WILDCARD = '*';

const ENCODER_VALUES = ['default', 'html'];
const SINGLE_TAG_OPTIONS = ['pre_tags', 'post_tags'];

/**
 * Checks what the shared map validation cannot express: `encoder` is case-sensitive in
 * Elasticsearch (the other enumerated options are not), and `pre_tags` / `post_tags` take a
 * single tag, as a string or a one-element array.
 */
const validateCaseSensitiveAndSingleValueOptions = (map: ESQLMap): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];

  const encoder = getMapEntryByStringKeyFromAst(map, 'encoder');

  if (
    encoder &&
    !encoder.incomplete &&
    isStringLiteral(encoder.value) &&
    !ENCODER_VALUES.includes(encoder.value.valueUnquoted)
  ) {
    messages.push(
      getMessageFromId({
        messageId: 'invalidMapParameterValue',
        values: {
          paramName: 'encoder',
          value: encoder.value.valueUnquoted,
          allowedValues: ENCODER_VALUES.join(', '),
        },
        locations: encoder.value.location,
      })
    );
  }

  for (const optionName of SINGLE_TAG_OPTIONS) {
    const tags = getMapEntryByStringKeyFromAst(map, optionName);

    if (tags && !tags.incomplete && isList(tags.value) && tags.value.values.length > 1) {
      messages.push(
        getMessageFromId({
          messageId: 'invalidMapParameterValue',
          values: {
            paramName: optionName,
            value: tags.value.text,
            allowedValues: 'a single tag',
          },
          locations: tags.value.location,
        })
      );
    }
  }

  return messages;
};

export const validate = (
  command: ESQLAstAllCommands,
  ast: ESQLAst,
  context?: ICommandContext,
  callbacks?: ICommandCallbacks
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];

  const highlightCommand = command as ESQLAstHighlightCommand;
  const { highlightFields, namedParameters, queryExpression } = highlightCommand;

  // ES rejects any modifier keyword other than `prefix`, so the assignment is only a valid
  // prefix clause when the left-hand identifier matches.
  const prefixKeyword = getPrefixKeyword(highlightCommand);

  if (
    prefixKeyword !== undefined &&
    prefixKeyword.name.toLowerCase() !== HIGHLIGHT_PREFIX_KEYWORD
  ) {
    messages.push(
      getMessageFromId({
        messageId: 'highlightInvalidPrefixModifier',
        values: { keyword: prefixKeyword.name },
        locations: prefixKeyword.location,
      })
    );
  }

  const invalidQueryNode = queryExpression ? findInvalidQueryNode(queryExpression) : undefined;

  // A disallowed *function* is already reported by the shared location check
  // ("Function X not allowed in HIGHLIGHT"), so only report the shapes it cannot see.
  if (
    invalidQueryNode !== undefined &&
    !Array.isArray(invalidQueryNode) &&
    !isFunctionExpression(invalidQueryNode)
  ) {
    messages.push(
      getMessageFromId({
        messageId: 'highlightInvalidQueryExpression',
        values: { expression: invalidQueryNode.text },
        locations: invalidQueryNode.location,
      })
    );
  }

  const onFields = highlightFields ?? [];
  const hasWildcardField = onFields.some((field) => isColumn(field) && field.name === WILDCARD);

  // ES only accepts `*` on its own: other patterns, or `*` next to other fields, are rejected.
  for (const field of onFields) {
    if (!isColumn(field) || !field.name.includes(WILDCARD)) {
      continue;
    }

    if (field.name !== WILDCARD) {
      messages.push(
        getMessageFromId({
          messageId: 'highlightInvalidOnPattern',
          values: { pattern: field.name },
          locations: field.location,
        })
      );
    } else if (onFields.length > 1) {
      messages.push(
        getMessageFromId({
          messageId: 'highlightWildcardWithFields',
          values: {},
          locations: field.location,
        })
      );
    }
  }

  // With both the query and ON explicit, every field the query targets must be in ON. A
  // parameter in ON cannot be resolved here, so it may hold any of them.
  if (
    queryExpression !== undefined &&
    onFields.length > 0 &&
    !hasWildcardField &&
    onFields.every(isColumn)
  ) {
    const onFieldNames = onFields.filter(isColumn).map(({ name }) => name);

    for (const queryField of getQueryFieldNames(queryExpression)) {
      if (!onFieldNames.includes(queryField)) {
        messages.push(
          getMessageFromId({
            messageId: 'highlightQueryFieldNotInOn',
            values: { field: queryField, fields: onFieldNames.join(', ') },
            locations: queryExpression.location,
          })
        );
      }
    }
  }

  // Validate ON field types: each field must be text, keyword or semantic_text.
  for (const field of onFields) {
    const fieldType = getExpressionType(field, context?.columns, context?.unmappedFieldsStrategy);

    if (!ALLOWED_HIGHLIGHT_FIELD_TYPES.includes(fieldType)) {
      messages.push(
        getMessageFromId({
          messageId: 'unsupportedColumnTypeForCommand',
          values: {
            command: 'HIGHLIGHT',
            type: SUPPORTED_HIGHLIGHT_FIELD_TYPES,
            givenType: fieldType,
            column: field.name,
          },
          locations: field.location,
        })
      );
    }
  }

  if (namedParameters !== undefined && !Array.isArray(namedParameters) && isMap(namedParameters)) {
    const mapError = validateMap(namedParameters, HIGHLIGHT_MAP_DEFINITION);
    if (mapError) {
      messages.push(mapError);
    } else {
      messages.push(...validateCaseSensitiveAndSingleValueOptions(namedParameters));
    }
  }

  messages.push(...validateCommandArguments(command, ast, context, callbacks));

  return messages;
};
