/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import type { ESQLAst, ESQLCommand, ESQLMessage } from '../../../types';
import { ICommandContext } from '../../types';

export const validate = (
  command: ESQLCommand,
  ast: ESQLAst,
  context?: ICommandContext
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];

  if (command.args.length < 2) {
    messages.push({
      location: command.location,
      text: i18n.translate('kbn-esql-ast.esql.validation.forkTooFewBranches', {
        defaultMessage: '[FORK] Must include at least two branches.',
      }),
      type: 'error',
      code: 'forkTooFewBranches',
    });
  }

  context?.fields.set('_fork', {
    name: '_fork',
    type: 'keyword',
  });

  return messages;
};
