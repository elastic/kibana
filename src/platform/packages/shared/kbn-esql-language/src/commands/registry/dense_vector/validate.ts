/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isMap } from '@elastic/esql';
import type { ESQLAst, ESQLAstAllCommands, ESQLAstDenseVectorCommand } from '@elastic/esql/types';
import type { ESQLMessage } from '../../definitions/types';
import { getExpressionType } from '../../definitions/utils/expressions';
import { getMessageFromId } from '../../definitions/utils/errors';
import { validateCommandArguments } from '../../definitions/utils/validation';
import { validateMap } from '../../definitions/utils/validation/map';
import type { ICommandContext, ICommandCallbacks } from '../types';
import { DENSE_VECTOR_SUFFIX_KEYWORD, getNamingKeyword } from './utils';

// `inference_id` is optional: Elasticsearch falls back to a built-in text embedding endpoint.
const DENSE_VECTOR_MAP_DEFINITION =
  "{name='inference_id', description='Text embedding inference endpoint used to generate the embeddings', type=[keyword]}" +
  "{name='timeout', description='Maximum time to wait for each inference request', type=[keyword]}";

/**
 * Field types accepted by ES for the DENSE_VECTOR field list. `param` and `unknown` cannot be
 * resolved at validation time, so they are let through.
 */
const ALLOWED_DENSE_VECTOR_FIELD_TYPES = ['text', 'keyword', 'param', 'unknown'];

/** Types reported to the user when a field is rejected. */
const SUPPORTED_DENSE_VECTOR_FIELD_TYPES = 'text or keyword';

export const validate = (
  command: ESQLAstAllCommands,
  ast: ESQLAst,
  context?: ICommandContext,
  callbacks?: ICommandCallbacks
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];

  const denseVectorCommand = command as ESQLAstDenseVectorCommand;
  const { fields, namedParameters, suffix, targetField } = denseVectorCommand;

  const namingKeyword = getNamingKeyword(denseVectorCommand);

  // ES rejects any keyword other than `suffix` in front of a suffix, but the grammar accepts
  // every identifier, so `foo = "_dv" ON title` parses without a syntax error.
  if (
    suffix !== undefined &&
    namingKeyword !== undefined &&
    namingKeyword.name.toLowerCase() !== DENSE_VECTOR_SUFFIX_KEYWORD
  ) {
    messages.push(
      getMessageFromId({
        messageId: 'denseVectorInvalidSuffixModifier',
        values: { keyword: namingKeyword.name },
        locations: namingKeyword.location,
      })
    );
  }

  // An explicit output name produces a single column, so it cannot cover several fields.
  if (targetField !== undefined && (fields ?? []).length > 1) {
    messages.push(
      getMessageFromId({
        messageId: 'denseVectorMultipleFieldsWithTarget',
        values: { target: targetField.name },
        locations: targetField.location,
      })
    );
  }

  // Only string fields are embeddable.
  for (const field of fields ?? []) {
    const fieldType = getExpressionType(field, context?.columns, context?.unmappedFieldsStrategy);

    if (!ALLOWED_DENSE_VECTOR_FIELD_TYPES.includes(fieldType)) {
      messages.push(
        getMessageFromId({
          messageId: 'unsupportedColumnTypeForCommand',
          values: {
            command: 'DENSE_VECTOR',
            type: SUPPORTED_DENSE_VECTOR_FIELD_TYPES,
            givenType: fieldType,
            column: field.name,
          },
          locations: field.location,
        })
      );
    }
  }

  if (namedParameters !== undefined && !Array.isArray(namedParameters) && isMap(namedParameters)) {
    const mapError = validateMap(namedParameters, DENSE_VECTOR_MAP_DEFINITION);
    if (mapError) {
      messages.push(mapError);
    }
  }

  messages.push(...validateCommandArguments(command, ast, context, callbacks));

  return messages;
};
