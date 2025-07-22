/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { getMessageFromId } from '../../../definitions/utils/errors';
import type { ESQLSource, ESQLCommand, ESQLMessage, ESQLAst } from '../../../types';
import { ENRICH_MODES } from './util';
import type { ESQLPolicy, ICommandContext } from '../../types';
import { validateCommandArguments } from '../../../definitions/utils/validation';

function hasWildcard(name: string) {
  return /\*/.test(name);
}

export const validate = (
  command: ESQLCommand,
  ast: ESQLAst,
  context?: ICommandContext
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];
  const source = command.args[0] as ESQLSource;
  const cluster = source.prefix;
  const index = source.index;
  const policies = context?.policies || new Map<string, ESQLPolicy>();

  if (index) {
    if (hasWildcard(index.valueUnquoted)) {
      messages.push(
        getMessageFromId({
          messageId: 'wildcardNotSupportedForCommand',
          values: { command: 'ENRICH', value: index.valueUnquoted },
          locations: index.location,
        })
      );
    } else if (!policies.has(index.valueUnquoted)) {
      messages.push(
        getMessageFromId({
          messageId: 'unknownPolicy',
          values: { name: index.valueUnquoted },
          locations: index.location,
        })
      );
    }
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

  messages.push(...validateCommandArguments(command, ast, context));

  return messages;
};
