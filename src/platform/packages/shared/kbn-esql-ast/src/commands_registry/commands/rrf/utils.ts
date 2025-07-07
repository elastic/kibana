/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import type { ESQLCommand, ESQLMessage, ESQLAst } from '../../../types';

export function buildMissingMetadataMessage(
  command: ESQLCommand,
  metadataField: string
): ESQLMessage {
  return {
    location: command.location,
    text: i18n.translate('kbn-esql-ast.esql.validation.rrfMissingMetadata', {
      defaultMessage: `[RRF] The FROM command is missing the {metadataField} METADATA field.`,
      values: { metadataField },
    }),
    type: 'error',
    code: `rrfMissingMetadata`,
  };
}

export function isRrfImmediatelyAfterFork(ast: ESQLAst): boolean {
  const forkIndex = ast.findIndex((cmd) => cmd.name === 'fork');
  const rrfIndex = ast.findIndex((cmd) => cmd.name === 'rrf');

  return forkIndex !== -1 && rrfIndex === forkIndex + 1;
}
