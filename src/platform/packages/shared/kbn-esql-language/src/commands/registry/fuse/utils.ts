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
  ESQLAstAllCommands,
  ESQLAstFuseCommand,
  ESQLCommand,
  ESQLCommandOption,
  ESQLIdentifier,
  ESQLMessage,
} from '../../../types';

export const FUSE_OPTIONS = ['score by', 'key by', 'group by', 'with'] as const;
export type FuseOption = (typeof FUSE_OPTIONS)[number];

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
  name: FuseOption
): ESQLCommandOption | undefined {
  return command.args.find(
    (arg): arg is ESQLCommandOption =>
      isOptionNode(arg) && arg.name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * Checks if we are immediately after a field that belongs to an option.
 * This is useful for being able to decide we are still in the SCORE BY position.
 *
 * Example: "SCORE BY field_name/"  returns true
 *          "SCORE BY field_name /" returns false
 */
export function immediatelyAfterOptionField(innerText: string, optionName: FuseOption): boolean {
  const regex = new RegExp(`${optionName}\\s+\\S+$`, 'i');
  return regex.test(innerText);
}

/**
 * Checks if we are immediately after a field in a list of fields that belongs to an option
 * Example: "KEY BY field1, field2/"  returns true
 *          "KEY BY field1, field2 /" returns false
 */
export function immediatelyAfterOptionFieldsList(
  innerText: string,
  optionName: FuseOption
): boolean {
  const regex = new RegExp(`${optionName}(\\s+\\S+,?)+$`, 'i');
  return regex.test(innerText);
}

export function buildMissingMetadataMessage(
  command: ESQLAstAllCommands,
  metadataField: string
): ESQLMessage {
  return {
    location: command.location,
    text: i18n.translate('kbn-esql-language.esql.validation.fuseMissingMetadata', {
      defaultMessage: `[FUSE] The FROM command is missing the {metadataField} METADATA field.`,
      values: { metadataField },
    }),
    type: 'error',
    code: `fuseMissingMetadata`,
  };
}
