/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import { ESQLAstExpression, ESQLAstRerankCommand, EditorError } from '@kbn/esql-ast/src/types';
import {
  isAssignment,
  isBinaryExpression,
  isColumn,
  isContained,
  isStringLiteral,
} from '@kbn/esql-ast/src/ast/helpers';
import { Walker, type ESQLCommand, type ESQLMessage } from '@kbn/esql-ast';
import { isParam } from '../../shared/helpers';
import { errors } from '../../validation/errors';
import type { CommandDefinition } from '../types';
import { validateColumnForCommand } from '../../validation/validation';
import { ReferenceMaps } from '../../validation/types';

const parsingErrorsToMessages = (parsingErrors: EditorError[], cmd: ESQLCommand): ESQLMessage[] => {
  const command = cmd as ESQLAstRerankCommand;
  const messages: ESQLMessage[] = [];

  const { inferenceId } = command;
  const inferenceIdParsingError = parsingErrors.some((error) => isContained(inferenceId, error));

  // Check if there is a problem with parsing inference ID.
  if (inferenceIdParsingError) {
    const error = errors.rerankInferenceIdMustBeIdentifier(inferenceId);

    messages.push(error);
  }

  return messages;
};

/**
 * Returns tru if a field is *named*. Named field is one where a column is
 * used directly, e.g. `field.name`, or where a new column is defined using
 * an assignment, e.g. `field.name = AVG(1, 2, 4)`.
 */
const isNamedField = (field: ESQLAstExpression) => {
  if (isColumn(field)) {
    return true;
  }

  if (isBinaryExpression(field)) {
    if (field.name !== '=') {
      return false;
    }

    const left = field.args[0];

    return isColumn(left);
  }

  return false;
};

const validate = (cmd: ESQLCommand, references: ReferenceMaps) => {
  const command = cmd as ESQLAstRerankCommand;
  const messages: ESQLMessage[] = [];

  if (command.args.length < 3) {
    messages.push({
      location: command.location,
      text: i18n.translate('kbn-esql-validation-autocomplete.esql.validation.forkTooFewArguments', {
        defaultMessage: '[RERANK] Command is not complete.',
      }),
      type: 'error',
      code: 'rerankTooFewArguments',
    });
  }

  const { query, fields } = command;

  // Check that <query> is a string literal or a parameter
  if (!isStringLiteral(query) && !isParam(query)) {
    const error = errors.rerankQueryMustBeString(query);

    messages.push(error);
  }

  const fieldLength = fields.length;

  for (let i = 0; i < fieldLength; i++) {
    const field = fields[i];

    // Check that <fields> are either columns or new column definitions
    if (!isNamedField(field)) {
      const error = errors.rerankFieldMustBeNamed(field);

      messages.push(error);
    }

    // Check if all (deeply nested) columns exist.
    const columnExpressionToCheck = isAssignment(field) ? field.args[1] : field;

    Walker.walk(columnExpressionToCheck, {
      visitColumn: (node) => {
        const fieldErrors = validateColumnForCommand(node, 'rerank', references);

        if (fieldErrors.length > 0) {
          messages.push(...fieldErrors);
        }
      },
    });
  }

  return messages;
};

export const definition = {
  hidden: true,
  name: 'rerank',
  preview: true,
  description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.forkDoc', {
    defaultMessage: 'Reorder results using a semantic reranker.',
  }),
  declaration: 'RERANK <query> ON <field1> [, <field2> [, ...]] WITH <inferenceID>',
  examples: [],
  suggest: () => {
    throw new Error('Not implemented');
  },
  parsingErrorsToMessages,
  validate,
  // TODO: implement `.fieldsSuggestionsAfter()`
} satisfies CommandDefinition<'rerank'>;
