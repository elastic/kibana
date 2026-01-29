/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import { within } from '../../../ast/location';
import { isOptionNode } from '../../../ast/is';
import { buildFieldsDefinitionsWithMetadata } from '../../definitions/utils';
import type {
  ESQLAstAllCommands,
  ESQLAstJoinCommand,
  ESQLCommand,
  ESQLCommandOption,
  ESQLSingleAstItem,
} from '../../../types';

import type { ICommand } from '../registry';
import type { GetColumnsByTypeFn, ICommandContext, ISuggestionItem } from '../types';
import type { JoinCommandPosition, JoinStaticPosition } from './types';
import { SuggestionCategory } from '../../../shared/sorting/types';
import { getLookupJoinSource } from '../../definitions/utils/sources';

const REGEX =
  /^(?<type>\w+((?<after_type>\s+((?<mnemonic>(JOIN|JOI|JO|J)((?<after_mnemonic>\s+((?<index>\S+((?<after_index>\s+(?<as>(AS|A))?(?<after_as>\s+(((?<alias>\S+)?(?<after_alias>\s+)?)?))?((?<on>(ON|O))?))?))?))?))?))?))?/i;

const positions: JoinStaticPosition[] = [
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
  const joinTarget = getLookupJoinSource(command as ESQLAstJoinCommand);
  const columns = await getColumnsForQuery(`FROM ${joinTarget}`);

  if (joinTarget && lookupIndexFieldSet.key !== joinTarget) {
    lookupIndexFieldSet.set = new Set<string>(columns.map((c) => c.name));
    lookupIndexFieldSet.key = joinTarget;
  }

  return columns;
};

/** Returns the position based on regex matching. */
export const getStaticPosition = (text: string): JoinStaticPosition => {
  const match = text.match(REGEX);

  if (!match || !match.groups) {
    return 'none';
  }

  let pos: JoinStaticPosition = 'none';

  for (const position of positions) {
    if (match.groups[position]) {
      pos = position;
      break;
    }
  }

  return pos;
};

export const getOnOption = (command: ESQLAstJoinCommand): ESQLCommandOption | undefined => {
  return command.args?.find((arg) => isOptionNode(arg) && arg.name === 'on') as
    | ESQLCommandOption
    | undefined;
};

export const getPosition = (
  text: string,
  command: ESQLAstAllCommands,
  cursorPosition: number
): JoinCommandPosition => {
  const pos = getStaticPosition(text);
  const joinCommand = command as ESQLAstJoinCommand;
  const onOption = getOnOption(joinCommand);

  if (onOption) {
    const expressions = onOption.args as ESQLSingleAstItem[];

    // No expressions yet or starting new expression after comma
    if (expressions.length === 0 || /,\s*$/.test(text)) {
      return { pos: 'on_expression', expression: undefined, isExpressionComplete: false };
    }

    const lastExpression = expressions[expressions.length - 1];

    // Cursor within incomplete expression
    if (
      lastExpression?.incomplete &&
      lastExpression.location &&
      within(cursorPosition, lastExpression)
    ) {
      return { pos: 'on_expression', expression: lastExpression, isExpressionComplete: false };
    }

    // Cursor within any complete expression
    for (const expr of expressions) {
      if (expr.location && within(cursorPosition, expr)) {
        return { pos: 'on_expression', expression: expr, isExpressionComplete: !expr.incomplete };
      }
    }

    // Cursor after all expressions
    return {
      pos: 'on_expression',
      expression: lastExpression,
      isExpressionComplete: !lastExpression?.incomplete,
    };
  }

  return { pos };
};

/**
 * Identifies common fields between source and lookup suggestions and marks them appropriately.
 * Common fields are those that exist in both source and lookup with the same label.

 */
export const markCommonFields = (
  sourceSuggestions: ISuggestionItem[],
  lookupSuggestions: ISuggestionItem[]
): {
  markedSourceSuggestions: ISuggestionItem[];
  uniqueLookupSuggestions: ISuggestionItem[];
  commonFieldLabels: Set<string>;
} => {
  const sourceLabels = new Set(sourceSuggestions.map(({ label }) => label));
  const commonFieldLabels = new Set(
    lookupSuggestions.map(({ label }) => label).filter((label) => sourceLabels.has(label))
  );

  // Mark common fields in source suggestions
  const markedSourceSuggestions = sourceSuggestions.map((suggestion) => {
    if (commonFieldLabels.has(suggestion.label)) {
      let detail = suggestion.detail || '';

      if (detail) {
        detail += ' ';
      }

      detail += i18n.translate('kbn-esql-language.esql.autocomplete.join.commonFieldNote', {
        defaultMessage: '(common field)',
      });

      return {
        ...suggestion,
        sortText: '1-' + (suggestion.sortText || suggestion.label),
        detail,
        category: SuggestionCategory.LOOKUP_COMMON_FIELD,
        documentation: {
          value: i18n.translate('kbn-esql-language.esql.autocomplete.join.sharedField', {
            defaultMessage: 'Field shared between the source and the lookup index',
          }),
        },
      };
    }

    return suggestion;
  });

  // Filter out duplicate lookup fields
  const uniqueLookupSuggestions = lookupSuggestions.filter(
    ({ label }) => !commonFieldLabels.has(label)
  );

  return {
    markedSourceSuggestions,
    uniqueLookupSuggestions,
    commonFieldLabels,
  };
};

/** Creates an enriched context that includes lookup table fields in the columns map. */
export const createEnrichedContext = async (
  originalContext: ICommandContext | undefined,
  joinCommand: ESQLAstJoinCommand,
  getColumnsForQuery: (query: string) => Promise<ESQLFieldWithMetadata[]>
): Promise<ICommandContext | undefined> => {
  if (!originalContext) {
    return undefined;
  }

  const lookupFields = await getLookupFields(joinCommand, getColumnsForQuery, originalContext);
  const enrichedColumns = new Map(originalContext.columns);

  for (const field of lookupFields) {
    if (!enrichedColumns.has(field.name)) {
      enrichedColumns.set(field.name, field);
    }
  }

  return {
    ...originalContext,
    columns: enrichedColumns,
  };
};

/**
 * Creates an enriched getByType function that includes lookup table fields
 * in addition to the source table fields.
 */
export const createEnrichedGetByType = async (
  originalGetByType: GetColumnsByTypeFn,
  joinCommand: ESQLAstJoinCommand,
  getColumnsForQuery: (query: string) => Promise<ESQLFieldWithMetadata[]>,
  context?: ICommandContext
): Promise<GetColumnsByTypeFn> => {
  const lookupFields = await getLookupFields(joinCommand, getColumnsForQuery, context);

  // Return wrapper function
  return async (type: Readonly<string> | Readonly<string[]>, ignored?: string[], options?: any) => {
    const sourceColumns = await originalGetByType(type, ignored, options);
    const types = Array.isArray(type) ? type : [type];
    const filteredLookupFields = lookupFields.filter(({ name, type: t }) => {
      return !ignored?.includes(name) && (types[0] === 'any' || types.includes(t));
    });

    const lookupSuggestions = buildFieldsDefinitionsWithMetadata(
      filteredLookupFields,
      [],
      options,
      context?.variables
    );

    // Use the utility function to mark common fields
    const { markedSourceSuggestions, uniqueLookupSuggestions } = markCommonFields(
      sourceColumns,
      lookupSuggestions
    );

    return [...markedSourceSuggestions, ...uniqueLookupSuggestions];
  };
};

// Check if a field is common (exists in both source and lookup tables)
export const isCommonField = (fieldName: string, context?: ICommandContext): boolean => {
  if (!context?.columns) {
    return false;
  }

  return context.columns.has(fieldName) && lookupIndexFieldSet.set.has(fieldName);
};
