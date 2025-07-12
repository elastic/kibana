/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import { handleFragment, columnExists } from '../../../definitions/utils/autocomplete/helpers';
import { unescapeColumnName } from '../../../definitions/utils/shared';
import * as mutate from '../../../mutate';
import { LeafPrinter } from '../../../pretty_print/leaf_printer';
import { pipeCompleteItem, commaCompleteItem } from '../../complete_items';
import { buildFieldsDefinitionsWithMetadata } from '../../../definitions/utils/functions';
import { ICommand } from '../../registry';
import { ESQLAstJoinCommand, ESQLCommand, ESQLCommandOption } from '../../../types';
import {
  ESQLFieldWithMetadata,
  GetColumnsByTypeFn,
  ISuggestionItem,
  ICommandContext,
} from '../../types';
import { JoinCommandPosition, JoinPosition, JoinStaticPosition } from './types';
import { TRIGGER_SUGGESTION_COMMAND } from '../../constants';
import { isColumn } from '../../../ast/is';

const REGEX =
  /^(?<type>\w+((?<after_type>\s+((?<mnemonic>(JOIN|JOI|JO|J)((?<after_mnemonic>\s+((?<index>\S+((?<after_index>\s+(?<as>(AS|A))?(?<after_as>\s+(((?<alias>\S+)?(?<after_alias>\s+)?)?))?((?<on>(ON|O)((?<after_on>\s+(?<cond>[^\s])?)?))?))?))?))?))?))?))?/i;

const positions: Array<JoinStaticPosition | 'cond'> = [
  'cond',
  'after_on',
  'on',
  'after_alias',
  'alias',
  'after_as',
  'as',
  'after_index',
  'index',
  'after_mnemonic',
  'mnemonic',
  'after_type',
  'type',
];

export const getFullCommandMnemonics = (
  command: ICommand
): Array<[mnemonic: string, description: string]> => {
  const types = command.metadata.types ?? [];

  if (!types.length) {
    return [[command.name, command.metadata.description]];
  }

  return types.map((type) => [
    `${type.name.toUpperCase()} ${command.name.toUpperCase()}`,
    type.description ?? command.metadata.description,
  ]);
};

// facilitates fast checks for the existence of fields in the lookup index
// by caching the fields of the last lookup index pattern
const lookupIndexFieldSet = {
  set: new Set<string>(),
  key: '',
};

export const getLookupFields = async (
  command: ESQLCommand,
  getColumnsForQuery: (query: string) => Promise<ESQLFieldWithMetadata[]>,
  context?: ICommandContext
): Promise<ESQLFieldWithMetadata[]> => {
  if (!context) {
    return [];
  }
  const summary = mutate.commands.join.summarizeCommand(command as ESQLAstJoinCommand);
  const joinIndexPattern = LeafPrinter.print(summary.target.index);
  const columns = await getColumnsForQuery(`FROM ${joinIndexPattern}`);

  if (lookupIndexFieldSet.key !== joinIndexPattern) {
    lookupIndexFieldSet.set = new Set<string>(columns.map((c) => c.name));
    lookupIndexFieldSet.key = joinIndexPattern;
  }

  return columns;
};

export const getFieldSuggestions = async (
  command: ESQLCommand,
  getColumnsByType: GetColumnsByTypeFn,
  getColumnsForQuery: (query: string) => Promise<ESQLFieldWithMetadata[]>,
  context?: ICommandContext
) => {
  if (!context) {
    return { suggestions: [], lookupIndexFieldExists: () => false };
  }

  const onOption = command.args.find(
    (arg) => !Array.isArray(arg) && arg.name === 'on'
  ) as ESQLCommandOption;

  const ignoredFields = onOption.args.map((arg) => (isColumn(arg) ? arg.parts.join('.') : ''));

  const [lookupIndexFields, sourceFields] = await Promise.all([
    getLookupFields(command, getColumnsForQuery, context),
    getColumnsByType(['any'], ignoredFields, {
      advanceCursor: false,
      openSuggestions: true,
    }),
  ]);

  const supportsControls = context?.supportsControls ?? false;
  const joinFields = buildFieldsDefinitionsWithMetadata(
    lookupIndexFields.filter((f) => !ignoredFields.includes(f.name)),
    [],
    { supportsControls },
    context?.variables
  );

  const intersection = suggestionIntersection(joinFields, sourceFields);
  const union = suggestionUnion(sourceFields, joinFields);

  for (const commonField of intersection) {
    commonField.sortText = '1';
    commonField.documentation = {
      value: i18n.translate('kbn-esql-ast.esql.autocomplete.join.sharedField', {
        defaultMessage: 'Field shared between the source and the lookup index',
      }),
    };

    let detail = commonField.detail || '';

    if (detail) {
      detail += ' ';
    }

    detail += i18n.translate('kbn-esql-ast.esql.autocomplete.join.commonFieldNote', {
      defaultMessage: '(common field)',
    });

    commonField.detail = detail;
  }

  return {
    suggestions: [...intersection, ...union],
    lookupIndexFieldExists: (field: string) =>
      lookupIndexFieldSet.set.has(unescapeColumnName(field)),
  };
};

export const suggestFields = async (
  innerText: string,
  command: ESQLCommand,
  getColumnsByType: GetColumnsByTypeFn,
  getColumnsForQuery: (query: string) => Promise<ESQLFieldWithMetadata[]>,
  context?: ICommandContext
) => {
  if (!context) {
    return [];
  }

  const { suggestions: fieldSuggestions, lookupIndexFieldExists } = await getFieldSuggestions(
    command,
    getColumnsByType,
    getColumnsForQuery,
    context
  );

  return handleFragment(
    innerText,
    (fragment) => columnExists(fragment, context) || lookupIndexFieldExists(fragment),
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

      return finalSuggestions.map<ISuggestionItem>((s) => ({
        ...s,
        filterText: fragment,
        text: fragment + s.text,
        command: TRIGGER_SUGGESTION_COMMAND,
        rangeToReplace,
      }));
    }
  );
};

/**
 * Returns the static position, or `cond` if the caret is in the `<conditions>`
 * part of the command, in which case further parsing is needed.
 */
const getStaticPosition = (text: string): JoinStaticPosition | 'cond' => {
  const match = text.match(REGEX);

  if (!match || !match.groups) {
    return 'none';
  }

  let pos: JoinStaticPosition | 'cond' = 'cond';

  for (const position of positions) {
    if (match.groups[position]) {
      pos = position;
      break;
    }
  }

  return pos;
};

export const getPosition = (text: string): JoinCommandPosition => {
  const pos0: JoinStaticPosition | 'cond' = getStaticPosition(text);
  const pos: JoinPosition = pos0 === 'cond' ? 'condition' : pos0;

  return {
    pos,
    type: '',
  };
};

export const suggestionIntersection = (
  suggestions1: ISuggestionItem[],
  suggestions2: ISuggestionItem[]
): ISuggestionItem[] => {
  const labels1 = new Set<string>();
  const intersection: ISuggestionItem[] = [];

  for (const suggestion1 of suggestions1) {
    labels1.add(suggestion1.label);
  }

  for (const suggestion2 of suggestions2) {
    if (labels1.has(suggestion2.label)) {
      intersection.push({ ...suggestion2 });
    }
  }

  return intersection;
};

export const suggestionUnion = (
  suggestions1: ISuggestionItem[],
  suggestions2: ISuggestionItem[]
): ISuggestionItem[] => {
  const labels = new Set<string>();
  const union: ISuggestionItem[] = [];

  for (const suggestion of suggestions1) {
    const label = suggestion.label;

    if (!labels.has(label)) {
      union.push(suggestion);
      labels.add(label);
    }
  }

  for (const suggestion of suggestions2) {
    const label = suggestion.label;

    if (!labels.has(label)) {
      union.push(suggestion);
      labels.add(label);
    }
  }

  return union;
};
