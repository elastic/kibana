/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Walker } from '@elastic/esql';
import type { ESQLAstAllCommands, ESQLSingleAstItem } from '@elastic/esql/types';
import { FULL_TEXT_SEARCH_DEFINITIONS } from '../../../commands/definitions/constants';
import {
  buildFieldsDefinitionsWithMetadata,
  getExpressionType,
  suggestForExpression,
} from '../../../commands/definitions/utils';
import type { SuggestForExpressionParams } from '../../../commands/definitions/utils/autocomplete/expressions/types';
import { isExpressionComplete } from '../../../commands/definitions/utils/expressions';
import { getUnmappedFieldsStrategy } from '../../../commands/definitions/utils/settings';
import { withAutoSuggest } from '../../../commands/definitions/utils/autocomplete/helpers';
import {
  Location,
  type ESQLColumnData,
  type ICommandCallbacks,
  type ICommandContext,
  type ISuggestionItem,
} from '../../../commands/registry/types';
import {
  FUNCTION_CALL,
  type CallSiteId,
  type ExpressionMode,
  type ExpressionRole,
  type ResolvedRole,
} from '../../../esql_js_sim/definitions';
import type { CursorIR } from '../../../esql_js_sim/grammar';
import { enhanceWithFunctionsContext } from '../../autocomplete/get_command_context';
import { getAutocompleteCursorContext } from '../../shared/parse_for_autocomplete_query';
import type { SuggestionContext, SuggestionRequest } from '../types';
import { decideExpression } from './expression_decisions';
import { describeExpressionPosition } from './expression_position';
import { getLambdas, getLambdaState, type LambdaParameter, type LambdaState } from './lambdas';

/** What the expression at the cursor offers, and whether the command can go on after it. */
export interface ExpressionSuggestions {
  /** The call site of the expression. */
  entry: CallSiteId;
  items: ISuggestionItem[];
  /** Something is written that is not yet a whole expression of the type its role asks for. */
  isUnfinished: boolean;
}

/**
 * The set of functions and operators a mode stands for, in the terms of the function
 * definitions. This table and `locationOf` are the only place the engine uses these terms.
 */
const MODE_LOCATIONS: Readonly<Record<ExpressionMode, Location>> = {
  scalar: Location.SORT,
  aggregation: Location.STATS,
  grouping: Location.STATS_BY,
  filter: Location.WHERE,
  constant: Location.ROW,
  full_text: Location.HIGHLIGHT_QUERY,
};

/** The cursor is between the brackets of a function call. */
const isInFunctionCall = ({ written }: CursorIR): boolean =>
  written.at(-1)?.ancestors.some(({ id, open }) => id === FUNCTION_CALL && open) ?? false;

const locationOf = (
  role: ExpressionRole,
  { enclosing }: ResolvedRole,
  { ir, sourceIsTimeSeries }: SuggestionContext
): Location => {
  const isInAggregation = enclosing.some(
    (outer) => outer.role.kind === 'expression' && outer.role.mode === 'aggregation'
  );

  if (role.mode === 'filter' && isInAggregation) {
    return Location.STATS_WHERE;
  }
  // An aggregation over a time series takes the time-series aggregations as its arguments.
  if (role.mode === 'aggregation' && sourceIsTimeSeries && isInFunctionCall(ir)) {
    return Location.STATS_TIMESERIES;
  }
  // Where full-text functions have a place, the wider set of functions applies.
  if (role.mode === 'scalar' && role.fullTextOnlyIn) {
    return Location.EVAL;
  }

  return MODE_LOCATIONS[role.mode];
};

// The modes that read a column only as the argument of a function.
const COLUMNS_IN_CALLS_ONLY: readonly ExpressionMode[] = ['constant', 'aggregation', 'full_text'];

const readsColumnsHere = (role: ExpressionRole, ir: CursorIR): boolean =>
  !COLUMNS_IN_CALLS_ONLY.includes(role.mode) || isInFunctionCall(ir);

/**
 * Where the expression at the cursor starts, when part of it is written: the start of the
 * place the last written thing belongs to, or of the word being typed.
 */
const getWrittenStart = (ir: CursorIR, entry: CallSiteId): number | undefined => {
  const written = ir.written.at(-1)?.ancestors.find(({ id }) => id === entry);

  return written?.start ?? ir.word?.start;
};

/**
 * The node of the command for the expression that starts at `start`: the first one from there
 * on, and the widest of those that start together. Brackets around it belong to no node.
 */
const findExpressionRoot = (
  command: ESQLAstAllCommands,
  start: number | undefined
): ESQLSingleAstItem | undefined => {
  if (start === undefined) {
    return undefined;
  }

  const candidates = Walker.findAll(
    command,
    (node) => node !== command && node.location !== undefined && node.location.min >= start
  ) as ESQLSingleAstItem[];

  return candidates.reduce<ESQLSingleAstItem | undefined>((best, node) => {
    const { min, max } = node.location;
    const isBetter =
      !best || min < best.location.min || (min === best.location.min && max > best.location.max);

    return isBetter ? node : best;
  }, undefined);
};

const ARROW = '->';
const PARAMETER_NAMES: readonly string[] = ['x', 'y', 'z'];

/**
 * The parameters of lambdas as columns. A parameter has the type of the argument whose values
 * it stands for, when the function says which.
 */
const asColumns = (
  parameters: LambdaParameter[],
  command: ESQLAstAllCommands,
  columns: Map<string, ESQLColumnData>
): ESQLColumnData[] =>
  parameters.map(({ name, valuesFrom }) => ({
    name,
    type: getExpressionType(findExpressionRoot(command, valuesFrom), columns),
    userDefined: true,
    location: { min: 0, max: 0 },
  }));

/** The items of the head of a lambda: its parameters with the arrow, or the arrow alone. */
const provideLambdaHead = (
  lambda: Exclude<LambdaState, { kind: 'body' }>,
  { usedNames }: SuggestionContext
): ISuggestionItem[] => {
  if (lambda.kind === 'arrow') {
    return [withAutoSuggest({ label: ARROW, text: `${ARROW} `, kind: 'Operator', detail: '' })];
  }

  const free = PARAMETER_NAMES.filter((name) => !usedNames.has(name));
  const names = (free.length >= lambda.count ? free : PARAMETER_NAMES).slice(0, lambda.count);
  const head = names.length === 1 ? names[0] : `(${names.join(', ')})`;

  return [
    withAutoSuggest({
      label: `${head} ${ARROW}`,
      text: `${head} ${ARROW} `,
      kind: 'Variable',
      detail: '',
    }),
  ];
};

const getCallbacks = (
  role: ExpressionRole,
  parameters: ESQLColumnData[],
  context: SuggestionContext
): ICommandCallbacks | undefined => {
  const { callbacks, hasLicense, getColumnsByType, usedNames } = context;
  const getColumnsFor = callbacks?.getColumnsFor;
  const getByType: ICommandCallbacks['getByType'] = async (type, ignored, options) => [
    ...buildFieldsDefinitionsWithMetadata(
      parameters.filter(
        ({ type: own }) => type === 'any' || type.includes('any') || type.includes(own)
      ),
      [],
      options
    ),
    ...(await getColumnsByType(type, ignored, options)),
  ];

  return {
    getByType: readsColumnsHere(role, context.ir) || parameters.length ? getByType : undefined,
    getSuggestedUserDefinedColumnName: () => {
      let index = 0;
      while (usedNames.has(`col${index}`)) {
        index++;
      }

      return `col${index}`;
    },
    getColumnsForQuery: getColumnsFor && (async (query: string) => getColumnsFor({ query })),
    hasMinimumLicenseRequired: hasLicense,
    getKqlSuggestions: callbacks?.getKqlSuggestions,
    canCreateLookupIndex: callbacks?.canCreateLookupIndex,
    canSuggestResourceBrowser: callbacks?.canSuggestResourceBrowser,
    isServerless: callbacks?.isServerless,
  };
};

/**
 * The expression at the cursor, by the role of the argument it is. The items come from the
 * expression engine the commands share today; this provider tells it what the role and the
 * grammar know: which functions apply, which types, and what is written of the expression.
 */
export const provideExpression = async (
  { role, resolved, entry }: Extract<SuggestionRequest, { kind: 'expression' }>,
  context: SuggestionContext
): Promise<ExpressionSuggestions> => {
  const { offset, ir, callbacks } = context;
  const lambda = getLambdaState(ir);

  if (lambda && lambda.kind !== 'body') {
    return { entry, items: provideLambdaHead(lambda, context), isUnfinished: true };
  }

  // The body of a lambda is the value of the argument: the expression engine reads it as
  // that once the parameters and the arrow before it are blanked out.
  const lambdas = getLambdas(ir);
  const text = lambdas.reduce(
    (blanked, { head: { start, end } }) =>
      `${blanked.slice(0, start)}${' '.repeat(end - start)}${blanked.slice(end)}`,
    context.text
  );
  const { root, astContext } = getAutocompleteCursorContext(text, offset);

  if (astContext.type !== 'expression') {
    return { entry, items: [], isUnfinished: false };
  }

  const { command, isCursorInSubquery } = astContext;
  const expressionRoot = findExpressionRoot(command, getWrittenStart(ir, entry));
  const canBrowseFields = (await callbacks?.canSuggestResourceBrowser?.()) ?? false;
  const columns = await context.getColumnMap();
  // Every parameter has a type for what is written with it; only the lambdas around the cursor
  // offer theirs.
  const typed = asColumns(
    lambdas.flatMap((written) => written.parameters),
    command,
    columns
  );
  const inScope = lambda?.kind === 'body' ? lambda.parameters.map(({ name }) => name) : [];
  const parameters = typed.filter(({ name }) => inScope.includes(name));
  const commandContext: ICommandContext = {
    columns: new Map([
      ...columns,
      ...typed.map((column): [string, ESQLColumnData] => [column.name, column]),
    ]),
    activeProduct: context.activeProduct,
    isCursorInSubquery,
    isFieldsBrowserEnabled: canBrowseFields && !isCursorInSubquery,
    unmappedFieldsStrategy: getUnmappedFieldsStrategy(root.header),
    isTimeseriesSource: context.sourceIsTimeSeries,
  };

  const fullContext = {
    ...commandContext,
    ...(await enhanceWithFunctionsContext(command, commandContext, callbacks)),
  };
  const request: SuggestForExpressionParams = {
    query: text,
    expressionRoot,
    command,
    cursorPosition: offset,
    location: locationOf(role, resolved, context),
    context: fullContext,
    callbacks: getCallbacks(role, parameters, context),
    options: {
      ...(role.types && { preferredExpressionType: [...role.types] }),
      ...(role.subqueries && { allowSubquery: true }),
      ...(!readsColumnsHere(role, ir) && { suggestFields: false }),
      ...(role.fullTextOnlyIn && {
        getFunctionsToIgnore: () => ({
          names: [...FULL_TEXT_SEARCH_DEFINITIONS],
          allowedInsideFunctions: Object.fromEntries(
            FULL_TEXT_SEARCH_DEFINITIONS.map((name) => [name, [role.fullTextOnlyIn ?? '']])
          ),
        }),
      }),
    },
  };
  const expressionType = getExpressionType(
    expressionRoot,
    fullContext.columns,
    fullContext.unmappedFieldsStrategy,
    fullContext.isTimeseriesSource === true
  );
  // The position comes from the grammar. A position that is not decided here yet still goes
  // to the expression engine of the current flow.
  const position = describeExpressionPosition(ir, entry);
  const items =
    (await decideExpression({ ir, position, request, expressionType })) ??
    (await suggestForExpression(request)).suggestions;
  const isComplete = isExpressionComplete(expressionType, text.slice(0, offset));
  const hasItsType = !role.completeAs || expressionType === role.completeAs;

  return {
    entry,
    items,
    isUnfinished: expressionRoot !== undefined && !(isComplete && hasItsType),
  };
};
