/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import {
  isIdentifier,
  type ESQLAstItem,
  type ESQLCommand,
  type ESQLFunction,
  type ESQLLiteral,
  ESQLAstQueryExpression,
  BasicPrettyPrinter,
  TIME_SYSTEM_PARAMS,
  type SupportedDataType,
  type FunctionReturnType,
  FunctionDefinitionTypes,
  FunctionDefinition,
} from '@kbn/esql-ast';
import { EDITOR_MARKER } from '@kbn/esql-ast/src/parser/constants';
import { getColumnForASTNode } from '@kbn/esql-ast/src/definitions/utils';
import {
  ESQLUserDefinedColumn,
  ESQLFieldWithMetadata,
} from '@kbn/esql-ast/src/commands_registry/types';
import { uniqBy } from 'lodash';
import { compareTypesWithLiterals } from '../shared/esql_types';
import {
  getFunctionDefinition,
  isAssignment,
  isColumnItem,
  isFunctionItem,
  isLiteralItem,
  isTimeIntervalItem,
} from '../shared/helpers';
import { ReferenceMaps } from '../validation/types';

/**
 * This function returns a list of closing brackets that can be appended to
 * a partial query to make it valid.
 *
 * A known limitation of this is that is not aware of commas "," or pipes "|"
 * so it is not yet helpful on a multiple commands errors (a workaround is to pass each command here...)
 * @param text
 * @returns
 */
export function getBracketsToClose(text: string) {
  const stack = [];
  const pairs: Record<string, string> = { '"""': '"""', '/*': '*/', '(': ')', '[': ']', '"': '"' };
  const pairsReversed: Record<string, string> = {
    '"""': '"""',
    '*/': '/*',
    ')': '(',
    ']': '[',
    '"': '"',
  };

  for (let i = 0; i < text.length; i++) {
    for (const openBracket in pairs) {
      if (!Object.hasOwn(pairs, openBracket)) {
        continue;
      }

      const substr = text.slice(i, i + openBracket.length);
      if (pairsReversed[substr] && pairsReversed[substr] === stack[stack.length - 1]) {
        stack.pop();
        break;
      } else if (substr === openBracket) {
        stack.push(substr);
        break;
      }
    }
  }
  return stack.reverse().map((bracket) => pairs[bracket]);
}

/**
 * This function attempts to correct the syntax of a partial query to make it valid.
 *
 * We are generally dealing with incomplete queries when the user is typing. But,
 * having an AST is helpful so we heuristically correct the syntax so it can be parsed.
 *
 * @param _query
 * @param context
 * @returns
 */
export function correctQuerySyntax(_query: string) {
  let query = _query;
  // check if all brackets are closed, otherwise close them
  const bracketsToAppend = getBracketsToClose(query);

  const endsWithBinaryOperatorRegex =
    /(?:\+|\/|==|>=|>|in|<=|<|like|:|%|\*|-|not in|not like|not rlike|!=|rlike|and|or|not|=|as)\s+$/i;
  const endsWithCommaRegex = /,\s+$/;

  if (endsWithBinaryOperatorRegex.test(query) || endsWithCommaRegex.test(query)) {
    query += ` ${EDITOR_MARKER}`;
  }

  query += bracketsToAppend.join('');

  return query;
}

function extractFunctionArgs(args: ESQLAstItem[]): ESQLFunction[] {
  return args.flatMap((arg) => (isAssignment(arg) ? arg.args[1] : arg)).filter(isFunctionItem);
}

function checkContent(fn: ESQLFunction): boolean {
  const fnDef = getFunctionDefinition(fn.name);
  return (
    (!!fnDef && fnDef.type === FunctionDefinitionTypes.AGG) ||
    extractFunctionArgs(fn.args).some(checkContent)
  );
}

export function isAggFunctionUsedAlready(command: ESQLCommand, argIndex: number) {
  if (argIndex < 0) {
    return false;
  }
  const arg = command.args[argIndex];
  return isFunctionItem(arg) ? checkContent(arg) : false;
}

function getFnContent(fn: ESQLFunction): string[] {
  return [fn.name].concat(extractFunctionArgs(fn.args).flatMap(getFnContent));
}

export function getFunctionsToIgnoreForStats(command: ESQLCommand, argIndex: number) {
  if (argIndex < 0) {
    return [];
  }
  const arg = command.args[argIndex];
  return isFunctionItem(arg) ? getFnContent(arg) : [];
}

/**
 * Given a function signature, returns the parameter at the given position, even if it's undefined or null
 *
 * @param {params}
 * @param position
 * @returns
 */
function strictlyGetParamAtPosition(
  { params }: FunctionDefinition['signatures'][number],
  position: number
) {
  return params[position] ? params[position] : null;
}

/**
 * This function is used to build the query that will be used to compute the
 * available fields for the current cursor location.
 *
 * Generally, this is the user's query up to the end of the previous command.
 *
 * @param queryString The original query string
 * @param commands
 * @returns
 */
export function getQueryForFields(queryString: string, root: ESQLAstQueryExpression): string {
  const commands = root.commands;
  const lastCommand = commands[commands.length - 1];
  if (lastCommand && lastCommand.name === 'fork' && lastCommand.args.length > 0) {
    /**
     * This translates the current fork command branch into a simpler but equivalent
     * query that is compatible with the existing field computation/caching strategy.
     *
     * The intuition here is that if the cursor is within a fork branch, the
     * previous context is equivalent to a query without the FORK command.:
     *
     * Original query: FROM lolz | EVAL foo = 1 | FORK (EVAL bar = 2) (EVAL baz = 3 | WHERE /)
     * Simplified: FROM lolz | EVAL foo = 1 | EVAL baz = 3 | WHERE /
     */
    const currentBranch = lastCommand.args[lastCommand.args.length - 1] as ESQLAstQueryExpression;
    const newCommands = commands.slice(0, -1).concat(currentBranch.commands.slice(0, -1));
    return BasicPrettyPrinter.print({ ...root, commands: newCommands });
  }

  // If there is only one source command and it does not require fields, do not
  // fetch fields, hence return an empty string.
  return commands.length === 1 && ['row', 'show'].includes(commands[0].name)
    ? ''
    : buildQueryUntilPreviousCommand(queryString, commands);
}

// TODO consider replacing this with a pretty printer-based solution
function buildQueryUntilPreviousCommand(queryString: string, commands: ESQLCommand[]) {
  const prevCommand = commands[Math.max(commands.length - 2, 0)];
  return prevCommand ? queryString.substring(0, prevCommand.location.max + 1) : queryString;
}

function getValidFunctionSignaturesForPreviousArgs(
  fnDefinition: FunctionDefinition,
  enrichedArgs: Array<
    ESQLAstItem & {
      dataType: string;
    }
  >,
  argIndex: number
) {
  // Filter down to signatures that match every params up to the current argIndex
  // e.g. BUCKET(longField, /) => all signatures with first param as long column type
  // or BUCKET(longField, 2, /) => all signatures with (longField, integer, ...)
  const relevantFuncSignatures = fnDefinition.signatures.filter(
    (s) =>
      s.params?.length >= argIndex &&
      s.params.slice(0, argIndex).every(({ type: dataType }, idx) => {
        return (
          dataType === enrichedArgs[idx].dataType ||
          compareTypesWithLiterals(dataType, enrichedArgs[idx].dataType)
        );
      })
  );
  return relevantFuncSignatures;
}

/**
 * Given a function signature, returns the compatible types to suggest for the next argument
 *
 * @param fnDefinition: the function definition
 * @param enrichedArgs: AST args with enriched esType info to match with function signatures
 * @param argIndex: the index of the argument to suggest for
 * @returns
 */
function getCompatibleTypesToSuggestNext(
  fnDefinition: FunctionDefinition,
  enrichedArgs: Array<
    ESQLAstItem & {
      dataType: string;
    }
  >,
  argIndex: number
) {
  // First, narrow down to valid function signatures based on previous arguments
  const relevantFuncSignatures = getValidFunctionSignaturesForPreviousArgs(
    fnDefinition,
    enrichedArgs,
    argIndex
  );

  // Then, get the compatible types to suggest for the next argument
  const compatibleTypesToSuggestForArg = uniqBy(
    relevantFuncSignatures.map((f) => f.params[argIndex]).filter((d) => d),
    (o) => `${o.type}-${o.constantOnly}`
  );
  return compatibleTypesToSuggestForArg;
}

function isValidDateString(dateString: unknown): boolean {
  if (typeof dateString !== 'string') return false;
  const timestamp = Date.parse(dateString.replace(/\"/g, ''));
  return !isNaN(timestamp);
}

/**
 * Returns true is node is a valid literal that represents a date
 * either a system time parameter or a date string generated by date picker
 * @param dateString
 * @returns
 */
export function isLiteralDateItem(nodeArg: ESQLAstItem): boolean {
  return (
    isLiteralItem(nodeArg) &&
    // If text is ?start or ?end, it's a system time parameter
    (TIME_SYSTEM_PARAMS.includes(nodeArg.text) ||
      // Or if it's a string generated by date picker
      isValidDateString(nodeArg.value))
  );
}

export function getValidSignaturesAndTypesToSuggestNext(
  node: ESQLFunction,
  references: {
    fields: Map<string, ESQLFieldWithMetadata>;
    userDefinedColumns: Map<string, ESQLUserDefinedColumn[]>;
  },
  fnDefinition: FunctionDefinition,
  fullText: string,
  offset: number
) {
  const enrichedArgs = node.args.map((nodeArg) => {
    let dataType = extractTypeFromASTArg(nodeArg, references);

    // For named system time parameters ?start and ?end, make sure it's compatiable
    if (isLiteralDateItem(nodeArg)) {
      dataType = 'date';
    }

    return { ...nodeArg, dataType } as ESQLAstItem & { dataType: string };
  });

  // pick the type of the next arg
  const shouldGetNextArgument = node.text.includes(EDITOR_MARKER);
  let argIndex = Math.max(node.args.length, 0);
  if (!shouldGetNextArgument && argIndex) {
    argIndex -= 1;
  }

  const validSignatures = getValidFunctionSignaturesForPreviousArgs(
    fnDefinition,
    enrichedArgs,
    argIndex
  );
  // Retrieve unique of types that are compatiable for the current arg
  const typesToSuggestNext = getCompatibleTypesToSuggestNext(fnDefinition, enrichedArgs, argIndex);
  const hasMoreMandatoryArgs = !validSignatures
    // Types available to suggest next after this argument is completed
    .map((signature) => strictlyGetParamAtPosition(signature, argIndex + 1))
    // when a param is null, it means param is optional
    // If there's at least one param that is optional, then
    // no need to suggest comma
    .some((p) => p === null || p?.optional === true);

  // Whether to prepend comma to suggestion string
  // E.g. if true, "fieldName" -> "fieldName, "
  const alreadyHasComma = fullText ? fullText[offset] === ',' : false;
  const shouldAddComma =
    hasMoreMandatoryArgs &&
    fnDefinition.type !== FunctionDefinitionTypes.OPERATOR &&
    !alreadyHasComma;
  const currentArg = enrichedArgs[argIndex];
  return {
    shouldAddComma,
    typesToSuggestNext,
    validSignatures,
    hasMoreMandatoryArgs,
    enrichedArgs,
    argIndex,
    currentArg,
  };
}

/** @deprecated — use getExpressionType instead (src/platform/packages/shared/kbn-esql-validation-autocomplete/src/shared/helpers.ts) */
export function extractTypeFromASTArg(
  arg: ESQLAstItem,
  references: Pick<ReferenceMaps, 'fields' | 'userDefinedColumns'>
):
  | ESQLLiteral['literalType']
  | SupportedDataType
  | FunctionReturnType
  | 'timeInterval'
  | string // @TODO remove this
  | undefined {
  if (Array.isArray(arg)) {
    return extractTypeFromASTArg(arg[0], references);
  }
  if (isLiteralItem(arg)) {
    return arg.literalType;
  }
  if (isColumnItem(arg) || isIdentifier(arg)) {
    const hit = getColumnForASTNode(arg, references);
    if (hit) {
      return hit.type;
    }
  }
  if (isTimeIntervalItem(arg)) {
    return arg.type;
  }
  if (isFunctionItem(arg)) {
    const fnDef = getFunctionDefinition(arg.name);
    if (fnDef) {
      // @TODO: improve this to better filter down the correct return type based on existing arguments
      // just mind that this can be highly recursive...
      return fnDef.signatures[0].returnType;
    }
  }
}
