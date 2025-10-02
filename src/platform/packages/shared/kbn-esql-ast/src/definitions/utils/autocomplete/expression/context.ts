/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PricingProduct } from '@kbn/core-pricing-common/src/types';
import type { LicenseType } from '@kbn/licensing-types';
import { isFunctionExpression } from '../../../../ast/is';
import type {
  GetColumnsByTypeFn,
  ICommandCallbacks,
  ICommandContext,
} from '../../../../commands_registry/types';
import { Location } from '../../../../commands_registry/types';
import { getLocationInfo } from '../../../../commands_registry/location';
import type {
  ESQLCommand,
  ESQLColumn,
  ESQLCommandOption,
  ESQLSingleAstItem,
} from '../../../../types';
import { parse } from '../../../../parser';
import { correctQuerySyntax, findAstPosition } from '../../ast';
import { getFunctionDefinition } from '../../functions';
import { getAllFunctions } from '../../functions';
import type { SupportedDataType } from '../../../types';
import { FunctionDefinitionTypes } from '../../../types';
import { getValidSignaturesAndTypesToSuggestNext, type FunctionParameterContext } from '../helpers';
import {
  isAggFunctionUsedAlready,
  getFunctionsToIgnoreForStats,
  isTimeseriesAggUsedAlready,
} from '../functions';
import type { ExpressionPosition } from './position';
import { isCommand, isFunction } from './utils';

export interface ResolvedEnv {
  getColumnsByType: GetColumnsByTypeFn;
  hasMinimumLicenseRequired?: (minimumLicenseRequired: LicenseType) => boolean;
  activeProduct?: PricingProduct;
}

export interface ExpressionContextOptions {
  functionParameterContext?: FunctionParameterContext;
  preferredExpressionType?: SupportedDataType;
  advanceCursorAfterInitialColumn?: boolean;
  ignoredColumnsForEmptyExpression?: string[];
  isCursorFollowedByComma?: boolean;
}

export interface ExpressionContext {
  query: string;
  cursorPosition: number;
  innerText: string;
  expressionRoot?: ESQLSingleAstItem;
  position?: ExpressionPosition;
  location: Location;
  command: ESQLCommand;
  context?: ICommandContext;
  callbacks?: ICommandCallbacks;
  env: ResolvedEnv;
  options: ExpressionContextOptions;
}

export function getExpressionContext(
  query: string,
  command: ESQLCommand,
  cursorPosition?: number,
  context?: ICommandContext
): {
  ast: any;
  node: any;
  location: Location;
  functionParameterContext?: FunctionParameterContext;
} | null {
  const innerText = query.substring(0, cursorPosition);
  const correctedQuery = correctQuerySyntax(innerText);
  const { ast } = parse(correctedQuery, { withFormatting: true });
  // Use innerText.length instead of cursorPosition because correctQuerySyntax may add characters
  const { node, containingFunction } = findAstPosition(ast, innerText.length);

  if (!node) {
    return null;
  }

  // When node is an option but containingFunction exists, prefer the function context
  // This handles cases where the parser creates spurious options during incomplete expressions
  const effectiveNode = node.type === 'option' && containingFunction ? containingFunction : node;

  // Calculate location dynamically (same as original getInsideFunctionsSuggestions)
  // This handles command options (like BY in STATS) and timeseries context detection
  const commandArgIndex = command.args.findIndex(
    (cmdArg) => !Array.isArray(cmdArg) && cmdArg?.location?.max >= effectiveNode.location.max
  );
  const isStats = isCommand(command.name, 'stats') || isCommand(command.name, 'inline stats');
  const finalCommandArgIndex = !isStats
    ? -1
    : commandArgIndex < 0
    ? Math.max(command.args.length - 1, 0)
    : commandArgIndex;

  const location = getLocationInfo(
    cursorPosition ?? 0,
    command,
    ast,
    isAggFunctionUsedAlready(command, finalCommandArgIndex)
  ).id;

  if (effectiveNode.type === 'literal' && effectiveNode.literalType === 'keyword') {
    return null;
  }

  if (effectiveNode.type === 'function') {
    // CASE binary expressions - handled by afterOperator handler
    if (
      containingFunction &&
      isFunction(containingFunction.name, 'case') &&
      !Array.isArray(effectiveNode) &&
      effectiveNode?.subtype === 'binary-expression'
    ) {
      return null;
    }

    // IN/NOT IN operators - handled by afterOperator handler
    if (['in', 'not in'].includes(effectiveNode.name)) {
      return null;
    }

    const isOperator = getFunctionDefinition(node.name)?.type === FunctionDefinitionTypes.OPERATOR;

    if (isNotEnrichClauseAssigment(effectiveNode, command) && !isOperator) {
      // This is where we build the functionParameterContext for regular function parameters
      const targetFunction =
        isFunctionExpression(effectiveNode) && effectiveNode.subtype === 'variadic-call'
          ? effectiveNode
          : containingFunction;

      if (targetFunction && isFunctionExpression(targetFunction)) {
        const fnDefinition = getFunctionDefinition(targetFunction.name);

        if (fnDefinition) {
          const references = {
            columns: context?.columns || new Map(),
          };

          const validationResult = getValidSignaturesAndTypesToSuggestNext(
            targetFunction,
            references,
            fnDefinition
          );

          const fnToIgnore = [targetFunction.name];

          fnToIgnore.push(
            ...getAllFunctions({ type: FunctionDefinitionTypes.GROUPING }).map(({ name }) => name)
          );

          const finalArg = command.args[finalCommandArgIndex];
          const isStatsWithByClause =
            !(isCommand(command.name, 'stats') || isCommand(command.name, 'inline stats')) ||
            (finalArg &&
              !Array.isArray(finalArg) &&
              finalArg.type === 'option' &&
              finalArg.name === 'by');

          if (!isStatsWithByClause) {
            fnToIgnore.push(
              ...getFunctionsToIgnoreForStats(command, finalCommandArgIndex),
              ...(isAggFunctionUsedAlready(command, finalCommandArgIndex)
                ? getAllFunctions({ type: FunctionDefinitionTypes.AGG }).map(({ name }) => name)
                : []),
              ...(isTimeseriesAggUsedAlready(command, finalCommandArgIndex)
                ? getAllFunctions({ type: FunctionDefinitionTypes.TIME_SERIES_AGG }).map(
                    ({ name }) => name
                  )
                : [])
            );
          }

          const functionParameterContext = {
            paramDefinitions: validationResult.compatibleParamDefs,
            functionsToIgnore: fnToIgnore,
            hasMoreMandatoryArgs: validationResult.hasMoreMandatoryArgs,
            functionDefinition: fnDefinition,
          };

          return { ast, node: effectiveNode, location, functionParameterContext };
        }
      }
    }
  }

  return null;
}

export interface BuildContextParams {
  query: string;
  command: ESQLCommand;
  cursorPosition: number;
  context?: ICommandContext;
  callbacks?: ICommandCallbacks;
  location?: Location;
  expressionRoot?: ESQLSingleAstItem;
  options?: ExpressionContextOptions;
}

export function buildExpressionContext(params: BuildContextParams): ExpressionContext {
  const {
    query,
    command,
    cursorPosition,
    expressionRoot: explicitExpressionRoot,
    location: explicitLocation,
    options,
    context,
    callbacks,
  } = params;
  let location = explicitLocation;
  let expressionRoot = explicitExpressionRoot;
  let functionParameterContext = options?.functionParameterContext;
  const preferredExpressionType = options?.preferredExpressionType;
  let advanceCursorAfterInitialColumn = options?.advanceCursorAfterInitialColumn;
  let ignoredColumnsForEmptyExpression = options?.ignoredColumnsForEmptyExpression;

  const innerText = query.substring(0, cursorPosition);
  const isCursorFollowedByComma = query.substring(cursorPosition).trimStart().startsWith(',');

  // Check if the key exists in params, not if the value is defined
  const shouldDeriveExpressionRoot = !('expressionRoot' in params);

  if (shouldDeriveExpressionRoot) {
    const expressionContext = getExpressionContext(query, command, cursorPosition, context);

    if (expressionContext) {
      expressionRoot = expressionContext.node as ESQLSingleAstItem | undefined;
      location = explicitLocation ?? expressionContext.location;
      functionParameterContext = expressionContext.functionParameterContext;
    } else {
      // No specific context - use command.args[0] for top-level locations only
      const normalizedCommandName = command.name.toLowerCase().replace(/\s+/g, '_');
      const isTopLevelLocation =
        !explicitLocation ||
        explicitLocation.toLowerCase() === normalizedCommandName ||
        (normalizedCommandName === 'inline_stats' && explicitLocation.toLowerCase() === 'stats');

      if (isTopLevelLocation) {
        expressionRoot = command.args[0] as ESQLSingleAstItem | undefined;
      }

      location = explicitLocation;
    }
  }

  const shouldDerive = !explicitExpressionRoot;

  if (advanceCursorAfterInitialColumn === undefined && shouldDerive && location) {
    advanceCursorAfterInitialColumn = deriveAdvanceCursor(command, location);
  }

  if (ignoredColumnsForEmptyExpression === undefined && shouldDerive && location) {
    ignoredColumnsForEmptyExpression = deriveIgnoredColumns(command, location);
  }

  const env: ResolvedEnv = {
    getColumnsByType: (callbacks?.getByType as any) ?? ((..._args: any[]) => Promise.resolve([])),
    hasMinimumLicenseRequired: callbacks?.hasMinimumLicenseRequired,
    activeProduct: context?.activeProduct,
  };

  return {
    query,
    cursorPosition,
    innerText,
    expressionRoot,
    location: location!,
    command,
    context,
    callbacks,
    env,
    options: {
      functionParameterContext,
      preferredExpressionType,
      advanceCursorAfterInitialColumn: advanceCursorAfterInitialColumn ?? true,
      ignoredColumnsForEmptyExpression: ignoredColumnsForEmptyExpression ?? [],
      isCursorFollowedByComma,
    },
  };
}

function deriveIgnoredColumns(command: ESQLCommand, location?: Location): string[] {
  if (!location) {
    return [];
  }

  if (
    (isCommand(command.name, 'stats') || isCommand(command.name, 'inline stats')) &&
    location === Location.STATS
  ) {
    const byOption = command.args.find((arg) => !Array.isArray(arg) && arg.name === 'by') as
      | ESQLCommandOption
      | undefined;

    if (byOption) {
      const columnNodes = (byOption.args.filter(
        (arg) => !Array.isArray(arg) && arg.type === 'column'
      ) ?? []) as ESQLColumn[];

      return columnNodes.map((node) => node.parts.join('.'));
    }
  }

  return [];
}

function deriveAdvanceCursor(command: ESQLCommand, location?: Location): boolean {
  if (!location) {
    return true;
  }

  if (isCommand(command.name, 'sort') && location === Location.SORT) {
    return false;
  }

  if (
    (isCommand(command.name, 'stats') || isCommand(command.name, 'inline stats')) &&
    location === Location.STATS
  ) {
    return false;
  }

  return true;
}

// ENRICH uses special = syntax, guard against interference
function isNotEnrichClauseAssigment(node: { name: string }, command: ESQLCommand) {
  return node.name !== '=' && !isCommand(command.name, 'enrich');
}
