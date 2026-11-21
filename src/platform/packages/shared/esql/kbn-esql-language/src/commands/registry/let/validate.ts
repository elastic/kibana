/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Walker } from '@elastic/esql';
import type { ESQLAstAllCommands, ESQLCommand, ESQLSource } from '@elastic/esql/types';
import type { ICommandContext } from '../types';
import { getMessageFromId } from '../../definitions/utils';
import {
  findNamedSubqueryForSource,
  getNamedSubqueriesAvailableTo,
  type NamedSubquery,
} from '../../definitions/utils/named_subqueries';
import type { ESQLMessage } from '../../definitions/types';

export const validate = (
  command: ESQLAstAllCommands,
  _commands: ESQLCommand[],
  context?: ICommandContext
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];
  const namedSubqueries = context?.namedSubqueries ?? [];

  const namedSubquery = namedSubqueries.find((binding) => binding.command === command);
  if (command.incomplete || !namedSubquery) {
    return messages;
  }

  const { name, identifier } = namedSubquery;
  if (name !== name.toLowerCase()) {
    messages.push(
      getMessageFromId({
        messageId: 'namedSubqueryNameNotLowercase',
        values: { name },
        locations: identifier.location,
      })
    );
    return messages;
  }

  const declaredBefore = getNamedSubqueriesAvailableTo(namedSubqueries, namedSubquery);
  if (declaredBefore.some((previous) => previous.name === name)) {
    messages.push(
      getMessageFromId({
        messageId: 'namedSubqueryDuplicateName',
        values: { name },
        locations: identifier.location,
      })
    );
    return messages;
  }

  messages.push(...validateForwardReferences(namedSubquery, namedSubqueries, declaredBefore));

  return messages;
};

// Elasticsearch rejects a LET body that reads itself or a later LET, even when the LET is unused.
const validateForwardReferences = (
  { query }: NamedSubquery,
  namedSubqueries: readonly NamedSubquery[],
  declaredBefore: readonly NamedSubquery[]
): ESQLMessage[] => {
  const sources = Walker.matchAll(query.commands, { type: 'source' }) as ESQLSource[];

  return sources
    .filter(
      (source) =>
        findNamedSubqueryForSource(source, namedSubqueries) !== undefined &&
        findNamedSubqueryForSource(source, declaredBefore) === undefined
    )
    .map((source) =>
      getMessageFromId({
        messageId: 'namedSubqueryForwardReference',
        values: { name: source.name },
        locations: source.location,
      })
    );
};
