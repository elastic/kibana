/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import { TRIGGER_SUGGESTION_COMMAND } from '../constants';
import { ISuggestionItem } from '../types';
import { esqlCommandRegistry } from '..';
import { buildDocumentation } from '../../definitions/utils/documentation';
import { TIME_SYSTEM_PARAMS } from '../../definitions/utils/literals';

const techPreviewLabel = i18n.translate('kbn-esql-ast.esql.autocomplete.techPreviewLabel', {
  defaultMessage: `Technical Preview`,
});

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
): ISuggestionItem {
  return {
    label,
    text: (quoted ? `"${label}"` : label) + (advanceCursorAndOpenSuggestions ? ' ' : ''),
    kind: 'Keyword',
    detail,
    sortText,
    command: advanceCursorAndOpenSuggestions ? TRIGGER_SUGGESTION_COMMAND : undefined,
  };
}

export const pipeCompleteItem: ISuggestionItem = {
  label: '|',
  text: '| ',
  kind: 'Keyword',
  detail: i18n.translate('kbn-esql-ast.esql.autocomplete.pipeDoc', {
    defaultMessage: 'Pipe (|)',
  }),
  sortText: 'C',
  command: TRIGGER_SUGGESTION_COMMAND,
};

export const allStarConstant: ISuggestionItem = {
  label: i18n.translate('kbn-esql-ast.esql.autocomplete.allStarConstantDoc', {
    defaultMessage: 'All (*)',
  }),
  text: '*',
  kind: 'Constant',
  detail: i18n.translate('kbn-esql-ast.esql.autocomplete.allStarConstantDoc', {
    defaultMessage: 'All (*)',
  }),
  sortText: '1',
};

export const commaCompleteItem = buildCharCompleteItem(
  ',',
  i18n.translate('kbn-esql-ast.esql.autocomplete.commaDoc', {
    defaultMessage: 'Comma (,)',
  }),
  { sortText: 'B', quoted: false }
);

export const byCompleteItem: ISuggestionItem = {
  label: 'BY',
  text: 'BY ',
  kind: 'Reference',
  detail: 'By',
  sortText: '1',
  command: TRIGGER_SUGGESTION_COMMAND,
};

export const whereCompleteItem: ISuggestionItem = {
  label: 'WHERE',
  text: 'WHERE ',
  kind: 'Reference',
  detail: 'Where',
  sortText: '1',
  command: TRIGGER_SUGGESTION_COMMAND,
};

export const getNewUserDefinedColumnSuggestion = (label: string): ISuggestionItem => {
  return {
    label,
    text: `${label} = `,
    kind: 'Variable',
    detail: i18n.translate('kbn-esql-ast.esql.autocomplete.newVarDoc', {
      defaultMessage: 'Define a new column',
    }),
    sortText: '1',
    command: TRIGGER_SUGGESTION_COMMAND,
  };
};

export const assignCompletionItem: ISuggestionItem = {
  detail: i18n.translate('kbn-esql-ast.esql.autocomplete.newVarDoc', {
    defaultMessage: 'Define a new column',
  }),
  command: TRIGGER_SUGGESTION_COMMAND,
  label: '=',
  kind: 'Variable',
  sortText: '1',
  text: '= ',
};

export const asCompletionItem: ISuggestionItem = {
  detail: i18n.translate('kbn-esql-ast.esql.definitions.asDoc', {
    defaultMessage: 'As',
  }),
  kind: 'Reference',
  label: 'AS',
  sortText: '1',
  text: 'AS ',
};

export const colonCompleteItem = buildCharCompleteItem(
  ':',
  i18n.translate('kbn-esql-ast.esql.autocomplete.colonDoc', {
    defaultMessage: 'Colon (:)',
  }),
  { sortText: 'A', quoted: true, advanceCursorAndOpenSuggestions: true }
);

export const semiColonCompleteItem = buildCharCompleteItem(
  ';',
  i18n.translate('kbn-esql-ast.esql.autocomplete.semiColonDoc', {
    defaultMessage: 'Semi colon (;)',
  }),
  { sortText: 'A', quoted: true, advanceCursorAndOpenSuggestions: true }
);

export const listCompleteItem: ISuggestionItem = {
  label: '( ... )',
  text: '( $0 )',
  asSnippet: true,
  kind: 'Operator',
  detail: i18n.translate('kbn-esql-ast.esql.autocomplete.listDoc', {
    defaultMessage: 'List of items ( ...)',
  }),
  sortText: 'A',
  command: TRIGGER_SUGGESTION_COMMAND,
};

export const getCommandAutocompleteDefinitions = (commands: string[]): ISuggestionItem[] => {
  const suggestions: ISuggestionItem[] = [];

  for (const command of commands) {
    const commandDefinition = esqlCommandRegistry.getCommandByName(command);
    if (commandDefinition?.metadata?.hidden || !commandDefinition) {
      continue;
    }

    const label = commandDefinition.name.toUpperCase();
    const text = `${commandDefinition.name.toUpperCase()} `;
    const types = commandDefinition.metadata?.types ?? [
      {
        name: '',
        description: '',
      },
    ];

    for (const type of types) {
      let detail = type.description || commandDefinition.metadata.description;
      if (commandDefinition.metadata.preview) {
        detail = `[${techPreviewLabel}] ${detail}`;
      }
      const suggestion: ISuggestionItem = {
        label: type.name ? `${type.name.toLocaleUpperCase()} ${label}` : label,
        text: type.name ? `${type.name.toLocaleUpperCase()} ${text}` : text,
        kind: 'Method',
        detail,
        documentation: {
          value: buildDocumentation(
            commandDefinition.metadata.declaration,
            commandDefinition.metadata.examples
          ),
        },
        sortText: 'A-' + label + '-' + type.name,
        command: TRIGGER_SUGGESTION_COMMAND,
      };

      suggestions.push(suggestion);
    }
  }

  return suggestions;
};

export const getDateHistogramCompletionItem: (histogramBarTarget?: number) => ISuggestionItem = (
  histogramBarTarget: number = 50
) => ({
  label: i18n.translate('kbn-esql-ast.esql.autocomplete.addDateHistogram', {
    defaultMessage: 'Add date histogram',
  }),
  text: `BUCKET($0, ${histogramBarTarget}, ${TIME_SYSTEM_PARAMS.join(', ')})`,
  asSnippet: true,
  kind: 'Issue',
  detail: i18n.translate('kbn-esql-ast.esql.autocomplete.addDateHistogramDetail', {
    defaultMessage: 'Add date histogram using bucket()',
  }),
  sortText: '1',
  command: TRIGGER_SUGGESTION_COMMAND,
});
