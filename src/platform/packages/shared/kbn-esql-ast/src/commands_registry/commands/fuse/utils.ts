/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import { isOptionNode } from '../../../..';
import type {
  ESQLAstFuseCommand,
  ESQLCommand,
  ESQLCommandOption,
  ESQLIdentifier,
  ESQLMessage,
} from '../../../types';

export function extractFuseArgs(command: ESQLAstFuseCommand): Partial<{
  fuseType: ESQLIdentifier;
  scoreBy: ESQLCommandOption;
  keyBy: ESQLCommandOption;
  groupBy: ESQLCommandOption;
  withOption: ESQLCommandOption;
}> {
  const fuseType = command.fuseType;
  const scoreBy = findCommandOptionByName(command, 'score by');
  const keyBy = findCommandOptionByName(command, 'key by');
  const groupBy = findCommandOptionByName(command, 'group by');
  const withOption = findCommandOptionByName(command, 'with');

  return { fuseType, scoreBy, keyBy, groupBy, withOption };
}

export function findCommandOptionByName(
  command: ESQLCommand,
  name: string
): ESQLCommandOption | undefined {
  return command.args.find(
    (arg): arg is ESQLCommandOption =>
      isOptionNode(arg) && arg.name.toLowerCase() === name.toLowerCase()
  );
}

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
