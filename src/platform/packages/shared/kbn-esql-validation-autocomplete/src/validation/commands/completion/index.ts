/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLCommand, ESQLMessage } from '@kbn/esql-ast';
import { i18n } from '@kbn/i18n';
import { getExpressionType } from '../../../shared/helpers';
import { ReferenceMaps } from '../../types';

const supportedPromptTypes = ['text', 'keyword', 'unknown'];

/**
 * Validates the COMPLETION command:
 *
 * COMPLETION <prompt> WITH <inferenceId> (AS <targetField>)
 */
export const validate = (command: ESQLCommand, references: ReferenceMaps): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];

  const prompt = command.args[0];

  const promptExpressionType = getExpressionType(
    prompt,
    references.fields,
    references.userDefinedColumns
  );

  if (!supportedPromptTypes.includes(promptExpressionType)) {
    messages.push({
      location: 'location' in prompt ? prompt?.location : command.location,
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

  return messages;
};
