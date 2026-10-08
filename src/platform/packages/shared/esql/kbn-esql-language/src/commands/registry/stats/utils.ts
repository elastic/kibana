/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type {
  ESQLAstAllCommands,
  ESQLAstItem,
  ESQLAstQueryExpression,
  ESQLCommand,
  ESQLCommandOption,
  ESQLFunction,
  ESQLProperNode,
  ESQLSingleAstItem,
} from '@elastic/esql/types';
import {
  isFunctionExpression,
  isFieldExpression,
  isWhereExpression,
  isParamLiteral,
  isOptionNode,
  isLiteral,
  isAssignment,
  isColumn,
  Parser,
  Walker,
} from '@elastic/esql';
import { commaCompleteItem, newLineCompleteItem, pipeCompleteItem } from '../complete_items';
import { withAutoSuggest } from '../../definitions/utils/autocomplete/helpers';
import type {
  ESQLColumnData,
  ESQLUserDefinedColumn,
  GetColumnsByTypeFn,
  ICommandCallbacks,
  ICommandContext,
  ISuggestionItem,
  UnmappedFieldsStrategy,
} from '../types';
import { getExpressionType } from '../../definitions/utils/expressions';
import { buildColumnSuggestions, getFunctionDefinition } from '../../definitions/utils/functions';
import { FunctionDefinitionTypes } from '../../definitions/types';
import { ReplacementRangeStrategyKind } from '../../../language/autocomplete/utils/prefix_range';
import { endsWithComma, endsWithWhitespace } from '../../definitions/utils/regex';
import { getColumnName } from '../../definitions/utils/columns';
import {
  findAstPosition,
  getBracketsToClose,
  removeAutocompleteMarkers,
} from '../../definitions/utils/ast';
import { EDITOR_MARKER } from '../../definitions/constants';
import { NOT_SUGGESTED_TYPES } from '../../../query_columns_service';

/**
 * Position of the caret in the sort command:
*
* ```
* STATS [column1 =] expression1[, ..., [columnN =] expressionN] [BY [column1 =] grouping_expression1[, ..., grouping_expressionN]]
        |           |          |                                    |           |                   |
        |           |          expression_complete                  |           |                   grouping_expression_complete
        |           expression_after_assignment                     |           grouping_expression_after_assignment
        expression_without_assignment                               grouping_expression_without_assignment

* ```
*/
export type CaretPosition =
  | 'expression_without_assignment'
  | 'expression_after_assignment'
  | 'grouping_expression_without_assignment'
  | 'grouping_expression_after_assignment'
  | 'after_where';

export const getPosition = (command: ESQLAstAllCommands, innerText: string): CaretPosition => {
  const lastCommandArg = command.args[command.args.length - 1];

  if (isOptionNode(lastCommandArg) && lastCommandArg.name === 'by') {
    // in the BY clause

    const lastOptionArg = lastCommandArg.args[lastCommandArg.args.length - 1];
    if (isAssignment(lastOptionArg) && !endsWithComma(innerText)) {
      return 'grouping_expression_after_assignment';
    }

    return 'grouping_expression_without_assignment';
  }

  if (isAssignment(lastCommandArg) && !endsWithComma(innerText)) {
    return 'expression_after_assignment';
  }

  if (isWhereExpression(lastCommandArg) && !endsWithComma(innerText)) {
    return 'after_where';
  }

  return 'expression_without_assignment';
};

export const byCompleteItem: ISuggestionItem = withAutoSuggest({
  label: 'BY',
  text: 'BY ',
  kind: 'Reference',
  detail: 'By',
});

export const whereCompleteItem: ISuggestionItem = withAutoSuggest({
  label: 'WHERE',
  text: 'WHERE ',
  kind: 'Reference',
  detail: 'Where',
});

function isAggregation(arg: ESQLAstItem): arg is ESQLFunction {
  return (
    isFunctionExpression(arg) &&
    getFunctionDefinition(arg.name)?.type === FunctionDefinitionTypes.AGG
  );
}

function isNotAnAggregation(arg: ESQLAstItem): arg is ESQLFunction {
  return (
    isFunctionExpression(arg) &&
    getFunctionDefinition(arg.name)?.type !== FunctionDefinitionTypes.AGG
  );
}

const isFunctionOperatorParam = (fn: ESQLFunction): boolean =>
  !!fn.operator && isParamLiteral(fn.operator);

export function checkAggExistence(arg: ESQLFunction): boolean {
  if (isWhereExpression(arg)) {
    return checkAggExistence(arg.args[0] as ESQLFunction);
  }

  if (isFieldExpression(arg)) {
    const agg = arg.args[1];
    const firstFunction = Walker.match(agg, { type: 'function' });

    if (!firstFunction) {
      return false;
    }

    return checkAggExistence(firstFunction as ESQLFunction);
  }

  // TODO the grouping function check may not
  // hold true for all future cases
  if (isAggregation(arg) || isFunctionOperatorParam(arg)) {
    return true;
  }

  if (isNotAnAggregation(arg)) {
    return (arg as ESQLFunction).args.filter(isFunctionExpression).some(checkAggExistence);
  }

  return false;
}

// now check that:
// * the agg function is at root level
// * or if it's a operators function, then all operands are agg functions or literals
// * or if it's a eval function then all arguments are agg functions or literals
// * or if a named param is used
export function checkFunctionContent(arg: ESQLFunction) {
  // TODO the grouping function check may not
  // hold true for all future cases
  if (isAggregation(arg) || isFunctionOperatorParam(arg)) {
    return true;
  }
  return (arg as ESQLFunction).args.every((subArg): boolean => {
    // Differentiate between array and non-array arguments
    if (Array.isArray(subArg)) {
      return subArg.every((item) => checkFunctionContent(item as ESQLFunction));
    }
    return (
      isLiteral(subArg) ||
      isAggregation(subArg) ||
      (isNotAnAggregation(subArg) ? checkFunctionContent(subArg) : false)
    );
  });
}

export const rightAfterColumn = (
  innerText: string,
  expressionRoot: ESQLSingleAstItem | undefined,
  columnExists: (name: string) => boolean
): boolean => {
  if (!expressionRoot) return false;

  let col: ESQLProperNode | undefined;

  Walker.walk(expressionRoot, {
    visitColumn(node) {
      if (node.location.max === innerText.length - 1) col = node;
    },
  });

  return isColumn(col) && columnExists(col.parts.join('.'));
};

export const getCommaAndPipe = (
  innerText: string,
  expressionRoot: ESQLSingleAstItem | undefined,
  columnExists: (name: string) => boolean
): ISuggestionItem[] => {
  const pipeSuggestion = { ...pipeCompleteItem };
  const commaSuggestion = withAutoSuggest({
    ...commaCompleteItem,
    text: ', ',
  });

  // does the query end with whitespace?
  if (endsWithWhitespace(innerText)) {
    commaSuggestion.replacementRangeStrategy = {
      kind: ReplacementRangeStrategyKind.TRAILING_WHITESPACE,
    };
  }
  // special case: cursor right after a column name
  else if (isColumn(expressionRoot) && rightAfterColumn(innerText, expressionRoot, columnExists)) {
    pipeSuggestion.text = ` ${pipeSuggestion.text}`;
    pipeSuggestion.preserveTypedPrefix = true;

    commaSuggestion.preserveTypedPrefix = true;
  }

  return [newLineCompleteItem, pipeSuggestion, commaSuggestion];
};

type StatsCommand = ESQLCommand<'stats'> | ESQLCommand<'inline stats'>;

export const isStatsCommand = (command: ESQLAstAllCommands): command is StatsCommand =>
  command.type === 'command' && (command.name === 'stats' || command.name === 'inline stats');

export const isByOption = (arg: ESQLAstItem): arg is ESQLCommandOption =>
  !Array.isArray(arg) && isOptionNode(arg) && arg.name === 'by';

/**
 * Returns the columns defined in the BY clause, keyed by name with the rightmost
 * definition winning (as Elasticsearch does when a name is reused).
 * Given | STATS count = COUNT() BY addr = address
 * returns { addr, { type: 'keyword' ... } }
 * A bare expression grouping (e.g. BUCKET(@timestamp, 1 d)) defines an implicitly-named column;
 * `query` is required to recover its source text, which is the name aggregations reference.
 */
export const getColumnsDefinedInByClause = (
  command: Pick<ESQLCommand, 'args'>,
  inputColumns: Map<string, ESQLColumnData>,
  query?: string,
  unmappedFieldsStrategy?: UnmappedFieldsStrategy
): Map<string, ESQLUserDefinedColumn> => {
  const typeOf = (thing: ESQLAstItem) =>
    getExpressionType(thing, inputColumns, unmappedFieldsStrategy);

  const assignments = new Map<string, ESQLUserDefinedColumn>();

  for (const arg of command.args) {
    if (!isByOption(arg)) {
      continue;
    }

    for (const grouping of arg.args) {
      // `name = expression` defines a new column, typed from the input columns.
      if (isAssignment(grouping) && isColumn(grouping.args[0])) {
        const target = grouping.args[0];
        const name = getColumnName(target);
        assignments.set(name, {
          name,
          type: typeOf(grouping.args[1]),
          location: target.location,
          userDefined: true,
        });
        continue;
      }

      // A bare column grouping references an input field already in scope, unless it reuses an
      // assigned name — then it shadows that assignment with the input column it points to.
      if (isColumn(grouping)) {
        const name = getColumnName(grouping);
        if (assignments.has(name)) {
          assignments.set(name, {
            name,
            type: typeOf(grouping),
            location: grouping.location,
            userDefined: true,
          });
        }
        continue;
      }

      // A bare expression grouping (e.g. `BUCKET(@timestamp, 1 d)`) defines an implicitly-named
      // column whose name is its source text; aggregations reference it via a backtick identifier.
      if (query !== undefined && !Array.isArray(grouping) && !isOptionNode(grouping)) {
        const name = query.substring(grouping.location.min, grouping.location.max + 1);
        assignments.set(name, {
          name,
          type: typeOf(grouping),
          location: grouping.location,
          userDefined: true,
        });
      }
    }
  }

  return assignments;
};

/**
 * Wraps a column retriever so the BY-clause columns are suggested alongside the input
 * columns, filtered by the requested type and shadowing input fields of the same name.
 */
const suggestWithByColumns =
  (
    getByType: GetColumnsByTypeFn,
    byColumns: Map<string, ESQLUserDefinedColumn>
  ): GetColumnsByTypeFn =>
  async (expectedType = 'any', ignored = [], options) => {
    const baseSuggestions = await getByType(expectedType, ignored, options);
    const requestedTypes = Array.isArray(expectedType) ? expectedType : [expectedType];

    const matchingColumns = [...byColumns.values()].filter(
      (column) =>
        !ignored.includes(column.name) &&
        (requestedTypes[0] === 'any' || requestedTypes.includes(column.type)) &&
        !NOT_SUGGESTED_TYPES.includes(column.type)
    );

    // The base suggestions already carry the fields browser, so avoid building a second one.
    const byColumnSuggestions = buildColumnSuggestions(matchingColumns, [], {
      ...options,
      isFieldsBrowserEnabled: false,
    });

    // BY columns shadow input fields of the same name, so drop the shadowed base suggestions.
    const byColumnNames = new Set(matchingColumns.map((column) => column.name));
    return [
      ...byColumnSuggestions,
      ...baseSuggestions.filter((suggestion) => !byColumnNames.has(suggestion.label)),
    ];
  };

const statsWithByAtCursor = (
  root: ESQLAstQueryExpression,
  cursorPosition: number
): ESQLCommand | undefined => {
  const { command } = findAstPosition(root, cursorPosition);
  return command?.type === 'command' && isStatsCommand(command) && command.args.some(isByOption)
    ? command
    : undefined;
};

/**
 * The query is parsed only up to the cursor, so a BY clause typed after the cursor is missing
 * from the command. Recover the stats command together with its BY clause: the full query usually
 * parses with the BY clause intact, but an incomplete expression at the cursor (e.g. an empty
 * WHERE or an unclosed function call) can swallow it. In that case, complete the expression with an
 * editor marker and close the brackets left open at the cursor so the BY clause parses as its own
 * option instead of being pulled inside the unterminated expression. Returns undefined when there
 * is nothing meaningful after the cursor or no BY clause is found.
 */
const getCommandAtCursor = (query: string, cursorPosition: number): ESQLCommand | undefined => {
  const afterCursor = query.slice(cursorPosition);
  if (!afterCursor.trim()) {
    return undefined;
  }

  const fromFullQuery = statsWithByAtCursor(Parser.parse(query).root, cursorPosition);
  if (fromFullQuery) {
    return fromFullQuery;
  }

  const beforeCursor = `${query.slice(0, cursorPosition)} ${EDITOR_MARKER} `;
  const corrected = `${beforeCursor}${getBracketsToClose(beforeCursor).join('')}${afterCursor}`;
  const root = removeAutocompleteMarkers(Parser.parse(corrected).root);
  return statsWithByAtCursor(root, cursorPosition);
};

/**
 * Returns the context and callbacks used to autocomplete the aggregation expressions and the
 * per-aggregation WHERE clause: the columns defined in the BY clause are overlaid so they
 * resolve correctly and are offered as suggestions. Leaves the BY clause scope untouched.
 */
export const getAggregationScope = (
  fullQuery: string,
  cursorPosition: number,
  command: ESQLAstAllCommands,
  context?: ICommandContext,
  callbacks?: ICommandCallbacks
): { context?: ICommandContext; callbacks?: ICommandCallbacks } => {
  if (!context || !isStatsCommand(command)) {
    return { context, callbacks };
  }

  const byColumns = getColumnsDefinedInByClause(
    // The command param is built from the query up to the cursor, so a BY clause typed after the cursor is missing,
    // We need to parse the full text again.
    getCommandAtCursor(fullQuery, cursorPosition) ?? command,
    context.columns,
    fullQuery,
    context.unmappedFieldsStrategy
  );

  if (byColumns.size === 0) {
    return { context, callbacks };
  }

  const scopedContext: ICommandContext = {
    ...context,
    columns: new Map([...context.columns, ...byColumns]),
  };

  const getByType = callbacks?.getByType;
  const scopedCallbacks: ICommandCallbacks | undefined = getByType
    ? { ...callbacks, getByType: suggestWithByColumns(getByType, byColumns) }
    : callbacks;

  return { context: scopedContext, callbacks: scopedCallbacks };
};
