/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { ESQLCommand, mutate, LeafPrinter } from '@kbn/esql-ast';
import type { ESQLAstJoinCommand, ESQLCommandOption } from '@kbn/esql-ast';
import { isColumnItem, isSingleItem, unescapeColumnName } from '../../../shared/helpers';
import { ESQLFieldWithMetadata } from '../../../validation/types';
import type { ESQLCallbacks } from '../../../shared/types';
import {
  CommandDefinition,
  CommandSuggestFunction,
  CommandSuggestParams,
  CommandTypeDefinition,
} from '../../../definitions/types';
import { specialIndicesToSuggestions } from '../../helper';
import { getPosition, suggestionIntersection, suggestionUnion } from './util';
import { TRIGGER_SUGGESTION_COMMAND, buildFieldsDefinitionsWithMetadata } from '../../factories';
import type { GetColumnsByTypeFn, SuggestionRawDefinition } from '../../types';
import { commaCompleteItem, pipeCompleteItem } from '../../complete_items';
import { handleFragment } from '../../helper';

const getFullCommandMnemonics = (
  definition: CommandDefinition<string>
): Array<[mnemonic: string, description: string]> => {
  const types: CommandTypeDefinition[] = definition.types ?? [];

  if (!types.length) {
    return [[definition.name, definition.description]];
  }

  return types.map((type) => [
    `${type.name.toUpperCase()} ${definition.name.toUpperCase()}`,
    type.description ?? definition.description,
  ]);
};

// facilitates fast checks for the existence of fields in the lookup index
// by caching the fields of the last lookup index pattern
const lookupIndexFieldSet = {
  set: new Set<string>(),
  key: '',
};

const getLookupFields = async (
  command: ESQLCommand<'join'>,
  callbacks: ESQLCallbacks
): Promise<ESQLFieldWithMetadata[]> => {
  if (!callbacks.getColumnsFor) {
    return [];
  }
  const summary = mutate.commands.join.summarizeCommand(command as ESQLAstJoinCommand);
  const joinIndexPattern = LeafPrinter.print(summary.target.index);
  const columns = await callbacks.getColumnsFor({ query: `FROM ${joinIndexPattern}` });

  if (lookupIndexFieldSet.key !== joinIndexPattern) {
    lookupIndexFieldSet.set = new Set<string>(columns.map((c) => c.name));
    lookupIndexFieldSet.key = joinIndexPattern;
  }

  return columns;
};

const getFieldSuggestions = async (
  command: ESQLCommand<'join'>,
  getColumnsByType: GetColumnsByTypeFn,
  callbacks?: ESQLCallbacks
) => {
  if (!callbacks) {
    return { suggestions: [], lookupIndexFieldExists: () => false };
  }

  const onOption = command.args.find(
    (arg) => isSingleItem(arg) && arg.name === 'on'
  ) as ESQLCommandOption;

  const ignoredFields = onOption.args.map((arg) => (isColumnItem(arg) ? arg.parts.join('.') : ''));

  const [lookupIndexFields, sourceFields] = await Promise.all([
    getLookupFields(command, callbacks),
    getColumnsByType(['any'], ignoredFields, {
      advanceCursor: false,
      openSuggestions: true,
    }),
  ]);

  const supportsControls = callbacks?.canSuggestVariables?.() ?? false;
  const getVariables = callbacks?.getVariables;
  const joinFields = buildFieldsDefinitionsWithMetadata(
    lookupIndexFields.filter((f) => !ignoredFields.includes(f.name)),
    [],
    { supportsControls },
    getVariables
  );

  const intersection = suggestionIntersection(joinFields, sourceFields);
  const union = suggestionUnion(sourceFields, joinFields);

  for (const commonField of intersection) {
    commonField.sortText = '1';
    commonField.documentation = {
      value: i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.join.sharedField', {
        defaultMessage: 'Field shared between the source and the lookup index',
      }),
    };

    let detail = commonField.detail || '';

    if (detail) {
      detail += ' ';
    }

    detail += i18n.translate(
      'kbn-esql-validation-autocomplete.esql.autocomplete.join.commonFieldNote',
      {
        defaultMessage: '(common field)',
      }
    );

    commonField.detail = detail;
  }

  return {
    suggestions: [...intersection, ...union],
    lookupIndexFieldExists: (field: string) =>
      lookupIndexFieldSet.set.has(unescapeColumnName(field)),
  };
};

const suggestFields = async (
  innerText: string,
  command: ESQLCommand<'join'>,
  getColumnsByType: GetColumnsByTypeFn,
  callbacks: ESQLCallbacks | undefined,
  columnExists: (fragment: string) => boolean
) => {
  if (!callbacks) {
    return [];
  }

  const { suggestions: fieldSuggestions, lookupIndexFieldExists } = await getFieldSuggestions(
    command,
    getColumnsByType,
    callbacks
  );

  return handleFragment(
    innerText,
    (fragment) => columnExists(fragment) || lookupIndexFieldExists(fragment),
    (_fragment: string, rangeToReplace?: { start: number; end: number }) => {
      // fie<suggest>
      return fieldSuggestions.map((suggestion) => {
        return {
          ...suggestion,
          text: suggestion.text,
          command: TRIGGER_SUGGESTION_COMMAND,
          rangeToReplace,
        };
      });
    },
    (fragment: string, rangeToReplace: { start: number; end: number }) => {
      // field<suggest>
      const finalSuggestions = [{ ...pipeCompleteItem, text: ' | ' }];
      // when we fix the editor marker, this should probably be checked against 0 instead of 1
      // this is because the last field in the AST is currently getting removed (because it contains
      // the editor marker) so it is not included in the ignored list which is used to filter out
      // existing fields above.
      if (fieldSuggestions.length > 1) finalSuggestions.push({ ...commaCompleteItem, text: ', ' });

      return finalSuggestions.map<SuggestionRawDefinition>((s) => ({
        ...s,
        filterText: fragment,
        text: fragment + s.text,
        command: TRIGGER_SUGGESTION_COMMAND,
        rangeToReplace,
      }));
    }
  );
};

export const suggest: CommandSuggestFunction<'join'> = async ({
  innerText,
  command,
  getColumnsByType,
  columnExists,
  definition,
  callbacks,
}: CommandSuggestParams<'join'>): Promise<SuggestionRawDefinition[]> => {
  let commandText: string = innerText;

  if (command.location) {
    commandText = innerText.slice(command.location.min);
  }

  const position = getPosition(commandText, command);

  switch (position.pos) {
    case 'type':
    case 'after_type':
    case 'mnemonic': {
      const allMnemonics = getFullCommandMnemonics(definition! as CommandDefinition<string>);
      const filteredMnemonics = allMnemonics.filter(([mnemonic]) =>
        mnemonic.startsWith(commandText.toUpperCase())
      );

      if (!filteredMnemonics.length) {
        return [];
      }

      return filteredMnemonics.map(
        ([mnemonic, description], i) =>
          ({
            label: mnemonic,
            text: mnemonic + ' $0',
            detail: description,
            kind: 'Keyword',
            sortText: `${i}-MNEMONIC`,
            command: TRIGGER_SUGGESTION_COMMAND,
          } as SuggestionRawDefinition)
      );
    }

    case 'after_mnemonic':
    case 'index': {
      const joinIndices = await callbacks?.getJoinIndices?.();

      if (!joinIndices) {
        return [];
      }

      return specialIndicesToSuggestions(joinIndices.indices);
    }

    case 'after_index': {
      const suggestion: SuggestionRawDefinition = {
        label: 'ON',
        text: 'ON ',
        detail: i18n.translate(
          'kbn-esql-validation-autocomplete.esql.autocomplete.join.onKeyword',
          {
            defaultMessage: 'Specify JOIN field conditions',
          }
        ),
        kind: 'Keyword',
        sortText: '0-ON',
        command: TRIGGER_SUGGESTION_COMMAND,
      };

      return [suggestion];
    }

    case 'after_on': {
      return suggestFields(innerText, command, getColumnsByType, callbacks, columnExists);
    }

    case 'condition': {
      if (/(?<!\,)\s+$/.test(innerText)) {
        // this trailing whitespace was not proceeded by a comma
        return [commaCompleteItem, pipeCompleteItem];
      }

      const fields = await suggestFields(
        innerText,
        command,
        getColumnsByType,
        callbacks,
        columnExists
      );

      return fields;
    }
  }

  const suggestions: SuggestionRawDefinition[] = [];

  return suggestions;
};
