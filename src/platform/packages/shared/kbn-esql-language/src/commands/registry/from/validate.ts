/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type {
  ESQLAst,
  ESQLMessage,
  ESQLCommandOption,
  ESQLSource,
  ESQLAstAllCommands,
} from '../../../types';
import { isColumn, isOptionNode, isSource } from '../../../ast/is';
import type { ICommandContext } from '../types';
import { METADATA_FIELDS } from '../options/metadata';
import { getMessageFromId } from '../../definitions/utils';
import { validateSources } from '../../definitions/utils/validation/sources';

export const validate = (
  command: ESQLAstAllCommands,
  ast: ESQLAst,
  context?: ICommandContext
): ESQLMessage[] => {
  const metadataStatement = command.args.find(
    (arg) => isOptionNode(arg) && arg.name === 'metadata'
  ) as ESQLCommandOption | undefined;

  const messages: ESQLMessage[] = [];

  const fields = metadataStatement?.args.filter(isColumn) ?? [];
  for (const field of fields) {
    if (!METADATA_FIELDS.includes(field.name)) {
      messages.push(
        getMessageFromId({
          messageId: 'unknownMetadataField',
          values: {
            value: field.name,
            availableFields: Array.from(METADATA_FIELDS).join(', '),
          },
          locations: field.location,
        })
      );
    }
  }
  const sources = command.args.filter((arg) => isSource(arg)) as ESQLSource[];
  messages.push(...validateSources(sources, context));

  return messages;
};
