/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLCommand } from '@kbn/esql-ast';
import { i18n } from '@kbn/i18n';
import { CommandSuggestParams } from '../../../definitions/types';
import {
  getCommandDefinition,
  getCommandsByName,
  pipePrecedesCurrentWord,
} from '../../../shared/helpers';
import { getCommandAutocompleteDefinitions, pipeCompleteItem } from '../../complete_items';
import { TRIGGER_SUGGESTION_COMMAND } from '../../factories';
import type { SuggestionRawDefinition } from '../../types';

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

export async function suggest(
  params: CommandSuggestParams<'fork'>
): Promise<SuggestionRawDefinition[]> {
  if (/FORK\s+$/i.test(params.innerText)) {
    return [newBranchSuggestion];
  }

  const activeBranch = getActiveBranch(params.command);
  const withinActiveBranch =
    activeBranch &&
    activeBranch.location.min <= params.innerText.length &&
    activeBranch.location.max >= params.innerText.length;

  if (!withinActiveBranch && /\)\s+$/i.test(params.innerText)) {
    const suggestions = [newBranchSuggestion];
    if (params.command.args.length > 1) {
      suggestions.push(pipeCompleteItem);
    }
    return suggestions;
  }

  // within a branch
  if (activeBranch?.commands.length === 0 || pipePrecedesCurrentWord(params.innerText)) {
    return getCommandAutocompleteDefinitions(getCommandsByName(FORK_AVAILABLE_COMMANDS));
  }

  const subCommand = activeBranch?.commands[activeBranch.commands.length - 1];

  if (!subCommand) {
    return [];
  }

  const commandDef = getCommandDefinition(subCommand?.name);

  return commandDef.suggest({
    ...params,
    command: subCommand as ESQLCommand,
    definition: commandDef,
  });
}

const newBranchSuggestion: SuggestionRawDefinition = {
  kind: 'Issue',
  label: i18n.translate('kbn-esql-validation-autocomplete.esql.suggestions.newBranchLabel', {
    defaultMessage: 'New branch',
  }),
  detail: i18n.translate('kbn-esql-validation-autocomplete.esql.suggestions.newBranchDetail', {
    defaultMessage: 'Add a new branch to the fork',
  }),
  text: '($0)',
  asSnippet: true,
  command: TRIGGER_SUGGESTION_COMMAND,
};

const getActiveBranch = (command: ESQLCommand<'fork'>) => {
  const finalBranch = command.args[command.args.length - 1];

  if (Array.isArray(finalBranch) || finalBranch.type !== 'query') {
    // should never happen
    return;
  }

  return finalBranch;
};
