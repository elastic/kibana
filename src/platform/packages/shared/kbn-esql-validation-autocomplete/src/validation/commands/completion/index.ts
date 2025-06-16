/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLMessage } from '@kbn/esql-ast';
import { i18n } from '@kbn/i18n';
import { ESQLAstCommand, ESQLAstCompletionCommand } from '@kbn/esql-ast/src/types';
import { getExpressionType } from '../../../shared/helpers';
import { ReferenceMaps } from '../../types';

const supportedPromptTypes = ['text', 'keyword', 'unknown', 'param'];

/**
 * Validates the COMPLETION command:
 *
 * COMPLETION <prompt> WITH <inferenceId> (AS <targetField>)
 */
export const validate = (command: ESQLAstCommand, references: ReferenceMaps): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];

  const { prompt, location, targetField } = command as ESQLAstCompletionCommand;

  const promptExpressionType = getExpressionType(
    prompt,
    references.fields,
    references.userDefinedColumns
  );

  if (!supportedPromptTypes.includes(promptExpressionType)) {
    messages.push({
      location: 'location' in prompt ? prompt?.location : location,
      text: i18n.translate(
        'kbn-esql-validation-autocomplete.esql.validation.completionUnsupportedFieldType',
        {
          defaultMessage:
            '[COMPLETION] prompt must be of type [text] but is [{promptExpressionType}]',
          values: { promptExpressionType },
        }
      ),
      type: 'error',
      code: 'completionUnsupportedFieldType',
    });
  }

  const targetName = targetField?.name || 'completion';

  // Sets the target field so the column is recognized after the command is applied
  references.userDefinedColumns.set(targetName, [
    {
      name: targetName,
      location: targetField?.location || command.location,
      type: 'keyword',
    },
  ]);

  return messages;
};
