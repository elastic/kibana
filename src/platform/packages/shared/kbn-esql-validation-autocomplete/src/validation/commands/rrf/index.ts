/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLAst, ESQLCommand, ESQLMessage } from '@kbn/esql-ast';
import { i18n } from '@kbn/i18n';
import { ReferenceMaps } from '../../types';

export function validate(
  command: ESQLCommand<'rrf'>,
  references: ReferenceMaps,
  ast: ESQLAst
): ESQLMessage[] {
  const messages: ESQLMessage[] = [];

  if (!isRrfImmediatelyAfterFork(ast)) {
    messages.push({
      location: command.location,
      text: i18n.translate(
        'kbn-esql-validation-autocomplete.esql.validation.rrfMissingScoreMetadata',
        {
          defaultMessage: '[RRF] Must be immediately preceded by a FORK command.',
        }
      ),
      type: 'error',
      code: 'rrfNotImmediatelyAfterFork',
    });
  }

  if (!references.fields.get('_id')) {
    messages.push(buildMissingMetadataMessage(command, '_id'));
  }

  if (!references.fields.get('_index')) {
    messages.push(buildMissingMetadataMessage(command, '_index'));
  }

  if (!references.fields.get('_score')) {
    messages.push(buildMissingMetadataMessage(command, '_score'));
  }

  return messages;
}

function buildMissingMetadataMessage(
  command: ESQLCommand<'rrf'>,
  metadataField: string
): ESQLMessage {
  return {
    location: command.location,
    text: i18n.translate('kbn-esql-validation-autocomplete.esql.validation.rrfMissingMetadata', {
      defaultMessage: `[RRF] The FROM command is missing the {metadataField} METADATA field.`,
      values: { metadataField },
    }),
    type: 'error',
    code: `rrfMissingMetadata`,
  };
}

function isRrfImmediatelyAfterFork(ast: ESQLAst): boolean {
  const forkIndex = ast.findIndex((cmd) => cmd.name === 'fork');
  const rrfIndex = ast.findIndex((cmd) => cmd.name === 'rrf');

  return forkIndex !== -1 && rrfIndex === forkIndex + 1;
}
