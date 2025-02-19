/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { ItemKind, SuggestionRawDefinition } from './types';
import { builtinFunctions } from '../definitions/builtin';
import { getOperatorSuggestion, TRIGGER_SUGGESTION_COMMAND } from './factories';
import { CommandDefinition, CommandTypeDefinition } from '../definitions/types';
import { getCommandDefinition } from '../shared/helpers';
import { getCommandSignature } from '../definitions/helpers';
import { buildDocumentation } from './documentation_util';

const techPreviewLabel = i18n.translate(
  'kbn-esql-validation-autocomplete.esql.autocomplete.techPreviewLabel',
  {
    defaultMessage: `Technical Preview`,
  }
);

export function getAssignmentDefinitionCompletitionItem() {
  const assignFn = builtinFunctions.find(({ name }) => name === '=')!;
  return getOperatorSuggestion(assignFn);
}

export const getCommandAutocompleteDefinitions = (
  commands: Array<CommandDefinition<string>>
): SuggestionRawDefinition[] => {
  const suggestions: SuggestionRawDefinition[] = [];

  for (const command of commands) {
    if (command.hidden) {
      continue;
    }

    const commandDefinition = getCommandDefinition(command.name);
    const label = commandDefinition.name.toUpperCase();
    const text = commandDefinition.signature.params.length
      ? `${commandDefinition.name.toUpperCase()} $0`
      : commandDefinition.name.toUpperCase();
    const types: CommandTypeDefinition[] = command.types ?? [
      {
        name: '',
        description: '',
      },
    ];

    for (const type of types) {
      let detail = type.description || commandDefinition.description;
      if (commandDefinition.preview) {
        detail = `[${techPreviewLabel}] ${detail}`;
      }
      const commandSignature = getCommandSignature(commandDefinition, type.name);
      const suggestion: SuggestionRawDefinition = {
        label: type.name ? `${type.name.toLocaleUpperCase()} ${label}` : label,
        text: type.name ? `${type.name.toLocaleUpperCase()} ${text}` : text,
        asSnippet: true,
        kind: 'Method',
        detail,
        documentation: {
          value: buildDocumentation(commandSignature.declaration, commandSignature.examples),
        },
        sortText: 'A-' + label + '-' + type.name,
        command: TRIGGER_SUGGESTION_COMMAND,
      };

      suggestions.push(suggestion);
    }
  }

  return suggestions;
};

function buildCharCompleteItem(
  label: string,
  detail: string,
  {
    sortText,
    quoted,
    advanceCursorAndOpenSuggestions,
  }: { sortText?: string; quoted: boolean; advanceCursorAndOpenSuggestions?: boolean } = {
    quoted: false,
  }
): SuggestionRawDefinition {
  return {
    label,
    text: (quoted ? `"${label}"` : label) + (advanceCursorAndOpenSuggestions ? ' ' : ''),
    kind: 'Keyword',
    detail,
    sortText,
    command: advanceCursorAndOpenSuggestions ? TRIGGER_SUGGESTION_COMMAND : undefined,
  };
}
export const pipeCompleteItem: SuggestionRawDefinition = {
  label: '|',
  text: '| ',
  kind: 'Keyword',
  detail: i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.pipeDoc', {
    defaultMessage: 'Pipe (|)',
  }),
  sortText: 'C',
  command: TRIGGER_SUGGESTION_COMMAND,
};

export const commaCompleteItem = buildCharCompleteItem(
  ',',
  i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.commaDoc', {
    defaultMessage: 'Comma (,)',
  }),
  { sortText: 'B', quoted: false }
);

export const colonCompleteItem = buildCharCompleteItem(
  ':',
  i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.colonDoc', {
    defaultMessage: 'Colon (:)',
  }),
  { sortText: 'A', quoted: true, advanceCursorAndOpenSuggestions: true }
);
export const semiColonCompleteItem = buildCharCompleteItem(
  ';',
  i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.semiColonDoc', {
    defaultMessage: 'Semi colon (;)',
  }),
  { sortText: 'A', quoted: true, advanceCursorAndOpenSuggestions: true }
);

export const listCompleteItem: SuggestionRawDefinition = {
  label: '( ... )',
  text: '( $0 )',
  asSnippet: true,
  kind: 'Operator',
  detail: i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.listDoc', {
    defaultMessage: 'List of items ( ...)',
  }),
  sortText: 'A',
  command: TRIGGER_SUGGESTION_COMMAND,
};

export const allStarConstant: SuggestionRawDefinition = {
  label: i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.allStarConstantDoc', {
    defaultMessage: 'All (*)',
  }),
  text: '*',
  kind: 'Constant' as ItemKind,
  detail: i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.allStarConstantDoc', {
    defaultMessage: 'All (*)',
  }),
  sortText: '1',
};
