/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { isAssignment, isColumn, isOptionNode } from '../../../ast/is';
import { errors, getMessageFromId } from '../../definitions/utils/errors';
import { validateCommandArguments } from '../../definitions/utils/validation';
import type {
  ESQLAst,
  ESQLAstAllCommands,
  ESQLAstCommand,
  ESQLCommandOption,
  ESQLMessage,
  ESQLSource,
} from '../../../types';
import type { ESQLPolicy, ICommandCallbacks, ICommandContext } from '../types';
import { ENRICH_MODES } from './util';

export const validate = (
  command: ESQLAstAllCommands,
  ast: ESQLAst,
  context?: ICommandContext,
  callbacks?: ICommandCallbacks
): ESQLMessage[] => {
  const enrichCommand = command as ESQLAstCommand;
  const messages: ESQLMessage[] = [];
  const source = enrichCommand.args[0] as ESQLSource;
  const cluster = source.prefix;
  const index = source.index;
  const policies = context?.policies || new Map<string, ESQLPolicy>();

  if (index && !policies.has(index.valueUnquoted)) {
    messages.push(errors.unknownPolicy(index.valueUnquoted, index.location));
  }

  if (cluster) {
    const acceptedModes = new Set<string>(ENRICH_MODES.map(({ name }) => '_' + name.toLowerCase()));
    const isValidMode = acceptedModes.has(cluster.valueUnquoted.toLowerCase());

    if (!isValidMode) {
      messages.push(
        getMessageFromId({
          messageId: 'unsupportedMode',
          values: {
            command: 'ENRICH',
            value: cluster.valueUnquoted,
            expected: [...acceptedModes].join(', '),
          },
          locations: cluster.location,
        })
      );
    }
  }

  const policy = index && policies.get(index.valueUnquoted);
  const withOption = enrichCommand.args.find(
    (arg) => isOptionNode(arg) && arg.name === 'with'
  ) as ESQLCommandOption;

  if (withOption && policy) {
    withOption.args.forEach((arg) => {
      if (isAssignment(arg) && Array.isArray(arg.args[1]) && isColumn(arg.args[1][0])) {
        const column = arg.args[1][0];
        if (!policy.enrichFields.includes(column.parts.join('.'))) {
          messages.push(errors.unknownColumn(column));
        }
      }
    });
  }

  messages.push(
    ...validateCommandArguments(
      {
        ...enrichCommand,
        // exclude WITH from generic validation since it shouldn't be compared against the generic column list
        args: enrichCommand.args.filter((arg) => arg !== withOption),
      },
      ast,
      context,
      callbacks
    )
  );

  return messages;
};
