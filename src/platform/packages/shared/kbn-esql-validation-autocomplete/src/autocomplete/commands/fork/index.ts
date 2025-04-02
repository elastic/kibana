/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLCommand } from '@kbn/esql-ast';
import {
  getCommandDefinition,
  getCommandsByName,
  pipePrecedesCurrentWord,
} from '../../../shared/helpers';
import { CommandSuggestParams } from '../../../definitions/types';
import type { SuggestionRawDefinition } from '../../types';
import { TRIGGER_SUGGESTION_COMMAND } from '../../factories';
import { suggest as suggestForWhere } from '../where';
import { suggest as suggestForSort } from '../sort';
import { suggest as suggestForLimit } from '../limit';
import { getCommandAutocompleteDefinitions, pipeCompleteItem } from '../../complete_items';

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
  if (!withinActiveBranch) {
    // not within a branch
    if (/\)\s+$/i.test(params.innerText)) {
      return [newBranchSuggestion, pipeCompleteItem];
    }
  }

  // within a branch
  if (activeBranch?.commands.length === 0 || pipePrecedesCurrentWord(params.innerText)) {
    return getCommandAutocompleteDefinitions(getCommandsByName(['limit', 'sort', 'where']));
  }

  const subCommand = activeBranch?.commands[activeBranch.commands.length - 1];
  switch (subCommand?.name) {
    case 'where':
      return suggestForWhere({
        ...params,
        command: subCommand as ESQLCommand<'where'>,
        definition: getCommandDefinition('where'),
      });

    case 'sort':
      return suggestForSort({
        ...params,
        command: subCommand as ESQLCommand<'sort'>,
        definition: getCommandDefinition('sort'),
      });

    case 'limit':
      return suggestForLimit({
        ...params,
        command: subCommand as ESQLCommand<'limit'>,
        definition: getCommandDefinition('limit'),
      });

    default:
      return [];
  }
}

const newBranchSuggestion: SuggestionRawDefinition = {
  kind: 'Issue',
  label: 'New branch',
  detail: 'Add a new branch to the fork',
  text: '($0)',
  asSnippet: true,
  command: TRIGGER_SUGGESTION_COMMAND,
};

const getActiveBranch = (command: ESQLCommand<'fork'>) => {
  const finalBranch = command.args[command.args.length - 1];

  if (Array.isArray(finalBranch) || finalBranch.type !== 'fork_branch') {
    // should never happen
    return;
  }

  return finalBranch;
};
