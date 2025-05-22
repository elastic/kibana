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
import { ReferenceMaps } from '../../types';

export function validate(command: ESQLCommand<'rrf'>, references: ReferenceMaps): ESQLMessage[] {
  const messages: ESQLMessage[] = [];

  if (!references.fields.get('_fork')) {
    messages.push({
      location: command.location,
      text: i18n.translate(
        'kbn-esql-validation-autocomplete.esql.validation.rrfMissingScoreMetadata',
        {
          defaultMessage: '[RRF] Must be preceded by a FORK command.',
        }
      ),
      type: 'error',
      code: 'rrfMissingScoreMetadata',
    });
  }

  if (!references.fields.get('_id')) {
    messages.push(buildMissingMetadataMessage(command, '_id', 'Id'));
  }

  if (!references.fields.get('_index')) {
    messages.push(buildMissingMetadataMessage(command, '_index', 'Index'));
  }

  if (!references.fields.get('_score')) {
    messages.push(buildMissingMetadataMessage(command, '_score', 'Score'));
  }

  return messages;
}

function buildMissingMetadataMessage(
  command: ESQLCommand<'rrf'>,
  metadataField: string,
  fieldName: string
): ESQLMessage {
  return {
    location: command.location,
    text: i18n.translate('kbn-esql-validation-autocomplete.esql.validation.rrfMissingMetadata', {
      defaultMessage: `[RRF] {metadataField} metadata must be selected in the FROM command.`,
      values: { metadataField },
    }),
    type: 'error',
    code: `rrfMissing${fieldName}Metadata`,
  };
}
