/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import type { ESQLCommand } from '../../../types';
import { pipeCompleteItem, getCommandAutocompleteDefinitions } from '../../utils/complete_items';
import { pipePrecedesCurrentWord } from '../../../definitions/utils/shared';
import { type ISuggestionItem, type ICommandContext, ICommandCallbacks } from '../../types';
import { TRIGGER_SUGGESTION_COMMAND } from '../../constants';
import { esqlCommandRegistry } from '../..';

// ToDo: this is hardcoded, we should find a better way to take care of the fork commands
const FORK_AVAILABLE_COMMANDS = [
  'limit',
  'sort',
  'where',
  'dissect',
  'stats',
  'eval',
  'completion',
  'grok',
  'change_point',
  'mv_expand',
  'keep',
  'drop',
  'rename',
  'sample',
  'join',
  'enrich',
];

export async function autocomplete(
  query: string,
  command: ESQLCommand,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext
): Promise<ISuggestionItem[]> {
  if (/FORK\s+$/i.test(query)) {
    return [newBranchSuggestion];
  }

  const activeBranch = getActiveBranch(command);
  const withinActiveBranch =
    activeBranch &&
    activeBranch.location.min <= query.length &&
    activeBranch.location.max >= query.length;

  if (!withinActiveBranch && /\)\s+$/i.test(query)) {
    const suggestions = [newBranchSuggestion];
    if (command.args.length > 1) {
      suggestions.push(pipeCompleteItem);
    }
    return suggestions;
  }

  // within a branch
  if (activeBranch?.commands.length === 0 || pipePrecedesCurrentWord(query)) {
    return getCommandAutocompleteDefinitions(FORK_AVAILABLE_COMMANDS);
  }

  const subCommand = activeBranch?.commands[activeBranch.commands.length - 1];

  if (!subCommand) {
    return [];
  }

  const subCommandMethods = esqlCommandRegistry.getCommandMethods(subCommand.name);
  return (
    subCommandMethods?.autocomplete(query, subCommand as ESQLCommand, callbacks, context) || []
  );
}

const newBranchSuggestion: ISuggestionItem = {
  kind: 'Issue',
  label: i18n.translate('kbn-esql-ast.esql.suggestions.newBranchLabel', {
    defaultMessage: 'New branch',
  }),
  detail: i18n.translate('kbn-esql-ast.esql.suggestions.newBranchDetail', {
    defaultMessage: 'Add a new branch to the fork',
  }),
  text: '($0)',
  asSnippet: true,
  command: TRIGGER_SUGGESTION_COMMAND,
};

const getActiveBranch = (command: ESQLCommand) => {
  const finalBranch = command.args[command.args.length - 1];

  if (Array.isArray(finalBranch) || finalBranch.type !== 'query') {
    // should never happen
    return;
  }

  return finalBranch;
};
