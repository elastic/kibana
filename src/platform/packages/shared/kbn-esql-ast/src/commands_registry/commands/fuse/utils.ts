/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import type { ESQLCommand, ESQLMessage } from '../../../types';

export function buildMissingMetadataMessage(
  command: ESQLCommand,
  metadataField: string
): ESQLMessage {
  return {
    location: command.location,
    text: i18n.translate('kbn-esql-ast.esql.validation.fuseMissingMetadata', {
      defaultMessage: `[FUSE] The FROM command is missing the {metadataField} METADATA field.`,
      values: { metadataField },
    }),
    type: 'error',
    code: `fuseMissingMetadata`,
  };
}
