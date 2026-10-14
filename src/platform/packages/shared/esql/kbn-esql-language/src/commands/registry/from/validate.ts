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
  ESQLCommandOption,
  ESQLSource,
  ESQLAstAllCommands,
} from '@elastic/esql/types';
import { isColumn, isOptionNode, isSource } from '@elastic/esql';
import type { ICommandCallbacks, ICommandContext } from '../types';
import { getAvailableMetadataFields, isValidMetadataField } from '../options/metadata';
import { getMessageFromId } from '../../definitions/utils';
import { validateSources } from '../../definitions/utils/validation/sources';
import type { ESQLMessage } from '../../definitions/types';

export const validate = (
  command: ESQLAstAllCommands,
  ast: ESQLAst,
  context?: ICommandContext,
  callbacks?: ICommandCallbacks
): ESQLMessage[] => {
  const metadataStatement = command.args.find(
    (arg) => isOptionNode(arg) && arg.name === 'metadata'
  ) as ESQLCommandOption | undefined;

  const messages: ESQLMessage[] = [];

  const fields = metadataStatement?.args.filter(isColumn) ?? [];
  for (const field of fields) {
    if (!isValidMetadataField(field.name, callbacks?.isServerless)) {
      messages.push(
        getMessageFromId({
          messageId: 'unknownMetadataField',
          values: {
            value: field.name,
            availableFields: getAvailableMetadataFields(callbacks?.isServerless).join(', '),
          },
          locations: field.location,
        })
      );
    }
  }
  const sources = command.args.filter((arg) => isSource(arg)) as ESQLSource[];
  // Use "Unknown data source" only at root FROM; in subqueries use "Unknown index"
  const isRootFrom = Array.isArray(ast) && ast.length > 0 && ast[0] === command;
  messages.push(...validateSources(sources, context, { useGenericDataSourceError: isRootFrom }));

  return messages;
};
