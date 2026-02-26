/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { within } from '../../../../../ast/location';
import type {
  PromQLAstQueryExpression,
  PromQLBinaryExpression,
  PromQLFunction,
  PromQLLabel,
  PromQLSelector,
} from '../../../../../embedded_languages/promql/types';
import type { PromQLFunctionParamType } from '../../../types';
import type { CursorMatch, PromqlDetailedPosition } from './types';
import {
  findCursorContext,
  isAfterCompleteExpression,
  isCursorInsideGrouping,
} from './cursor_context';
import {
  computeParamIndexFromArgs,
  findNearestAggregation,
  findSelectorAfterBinaryInArgs,
  getBinaryNodeAtCursor,
  getLabelMapTextFallbackPosition,
  getMaxParamsForFunction,
  getSignatureTypesFromAncestors,
  hasGroupingTrailingIdentifier,
  isAfterAggregationName,
  isAtFunctionArgStart,
} from './query_helpers';
import {
  getPromqlBinaryOperatorParamTypes,
  getPromqlFunctionDefinition,
  getPromqlFunctionParamTypes,
} from '../../promql';
import { promqlOperatorDefinitions } from '../../../generated/promql_operators';

const TRAILING_COMMA_WITH_SPACES_REGEX = /,\s*$/;
const SELECTOR_DURATION_START_REGEX = /^\s*\[$/;

// Builds a regex pattern like `\+|\-|\*|==|and|or|...` from all binary operator definitions.
// Used to detect trailing operators via text when the AST is incomplete (e.g. `a + |`).
const PROMQL_BINARY_OPS_PATTERN = promqlOperatorDefinitions
  .filter((definition) => definition.signatures.some((signature) => signature.params.length >= 2))
  .map((definition) =>
    (definition.operator ?? definition.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  )
  .join('|');

const PROMQL_TRAILING_BINARY_OP_REGEX = new RegExp(`(${PROMQL_BINARY_OPS_PATTERN})\\s*$`, 'i');

/** Routes cursor to the appropriate domain resolver based on deepest AST node. */
export function getQueryPosition(
  root: PromQLAstQueryExpression,
  cursor: number,
  text: string
): PromqlDetailedPosition {
  const textBeforeCursor = text.slice(0, cursor).trimEnd();
  const lastChar = textBeforeCursor.at(-1);
  const { match, innermostFunc, outermostIncompleteBinary } = findCursorContext(root, cursor);
  const binaryNodeAtCursor = getBinaryNodeAtCursor(match, outermostIncompleteBinary);
  const funcAtCursor = match
    ? [match.node, match.parent].find((node) => node?.type === 'function')
    : undefined;

  let cachedSignatureTypes: PromQLFunctionParamType[] | undefined;
  const getSignatureTypes = (): PromQLFunctionParamType[] => {
    if (cachedSignatureTypes === undefined) {
      cachedSignatureTypes = getSignatureTypesFromAncestors(
        text,
        cursor,
        innermostFunc,
        funcAtCursor
      );
    }

    return cachedSignatureTypes;
  };

  // Text-based fast paths (operator trailing, label map fallback)
  const trailingBinaryOperator = textBeforeCursor.match(PROMQL_TRAILING_BINARY_OP_REGEX)?.[1];

  if (trailingBinaryOperator) {
    const signatureTypes = getPromqlBinaryOperatorParamTypes(trailingBinaryOperator, 1);

    if (signatureTypes.length) {
      return { type: 'after_operator', signatureTypes };
    }
  }

  const labelMapFallback = getLabelMapTextFallbackPosition(text, cursor);

  if (labelMapFallback) {
    return labelMapFallback;
  }

  // AST-based binary operator resolution
  if (binaryNodeAtCursor) {
    const pos = resolveAfterOperatorPosition({ cursor, binaryNode: binaryNodeAtCursor });

    if (pos) {
      return pos;
    }
  }

  // No AST match: empty query or cursor outside any node
  if (!match) {
    if (lastChar === '(' || lastChar === '=') {
      return { type: 'inside_function_args', signatureTypes: getSignatureTypes() };
    }

    return resolveTopLevelPosition(root, cursor, text, undefined, textBeforeCursor);
  }

  const { node, parent } = match;

  // Label context: {job="api", status=~"5.."}
  const inLabelContext =
    node.type === 'label-map' ||
    node.type === 'label' ||
    parent?.type === 'label-map' ||
    parent?.type === 'label';

  if (inLabelContext) {
    const skipLabel =
      node.type === 'identifier' &&
      parent?.type === 'label-map' &&
      innermostFunc &&
      TRAILING_COMMA_WITH_SPACES_REGEX.test(textBeforeCursor);

    if (!skipLabel) {
      const labelPos = resolveLabelPosition(match, cursor, textBeforeCursor, getSignatureTypes());
      if (labelPos) {
        return labelPos;
      }
    }
  }

  // Grouping context: by (label1, label2)
  if (node.type === 'grouping' || parent?.type === 'grouping') {
    const groupingNode = (node.type === 'grouping' ? node : parent) as {
      location: { min: number; max: number };
      args: unknown[];
    };
    const groupingPos = resolveGroupingPosition(cursor, text, groupingNode);

    if (groupingPos) {
      if (parent?.type === 'grouping' && node.type === 'identifier' && within(cursor, node)) {
        return { type: 'inside_grouping', isCompleteLabel: true };
      }

      return groupingPos;
    }
  }

  // Selector context: metric{labels}[duration]
  let selectorNode: PromQLSelector | undefined;

  if (node.type === 'selector') {
    selectorNode = node as PromQLSelector;
  } else if (parent?.type === 'selector') {
    selectorNode = parent as PromQLSelector;
  } else if (innermostFunc) {
    selectorNode = findSelectorAfterBinaryInArgs(innermostFunc, cursor);
  }

  if (selectorNode) {
    const selectorPos = resolveSelectorPosition(
      selectorNode,
      cursor,
      textBeforeCursor,
      getSignatureTypes()
    );

    if (selectorPos) {
      return selectorPos;
    }

    if (
      !getPromqlFunctionDefinition(selectorNode.metric?.name) &&
      selectorNode.metric &&
      cursor >= selectorNode.metric.location.max &&
      (!selectorNode.labelMap || cursor < selectorNode.labelMap.location.min)
    ) {
      return {
        type: 'after_metric',
        selector: selectorNode,
        signatureTypes: getSignatureTypes(),
      };
    }
  }

  // Selector as function argument: rate(metric{labels} |)
  if (innermostFunc && within(cursor, innermostFunc)) {
    const selectorArgPos = resolveSelectorArgPosition(
      innermostFunc,
      cursor,
      textBeforeCursor,
      getSignatureTypes()
    );

    if (selectorArgPos) {
      return selectorArgPos;
    }
  }

  // Top-level: complete expression or can add grouping
  const topLevelPosition = resolveTopLevelPosition(root, cursor, text, undefined, textBeforeCursor);

  if (topLevelPosition.canAddGrouping || isAfterCompleteExpression(root, cursor)) {
    return topLevelPosition;
  }

  // Function args: rate(|), rate(metric, |)
  if (innermostFunc) {
    const funcPos = resolveFunctionPosition(
      innermostFunc,
      cursor,
      text,
      getSignatureTypes(),
      textBeforeCursor
    );

    if (funcPos) {
      return funcPos;
    }
  }

  // Range vector fallback: metric{labels}| expects [duration]
  if (getSignatureTypes().includes('range_vector') && textBeforeCursor.endsWith('}')) {
    return {
      type: 'after_label_selector',
      canSuggestRangeSelector: true,
      signatureTypes: getSignatureTypes(),
    };
  }

  // Open paren/equals fallback
  if (lastChar === '(' || lastChar === '=') {
    return { type: 'inside_function_args', signatureTypes: getSignatureTypes() };
  }

  // Default: top-level query position
  return resolveTopLevelPosition(root, cursor, text, undefined, textBeforeCursor);
}

/* Determines if cursor is at a top-level position where grouping or operators can follow. */
function resolveTopLevelPosition(
  root: PromQLAstQueryExpression,
  cursor: number,
  text: string,
  precomputedCanAddGrouping?: boolean,
  textBeforeCursorArg?: string
): PromqlDetailedPosition {
  if (precomputedCanAddGrouping !== undefined) {
    return {
      type: 'inside_query',
      canAddGrouping: precomputedCanAddGrouping,
      isAfterAggregationName: isAfterAggregationName(textBeforeCursorArg ?? text.slice(0, cursor)),
    };
  }

  const textBeforeCursor = textBeforeCursorArg ?? text.slice(0, cursor).trimEnd();
  const logicalCursor = textBeforeCursor.length;
  const nearest = findNearestAggregation(root, logicalCursor);
  const afterAggregationName = isAfterAggregationName(textBeforeCursor);
  const canAddGrouping =
    logicalCursor > 0 && (nearest?.location.max === logicalCursor - 1 || afterAggregationName);

  return { type: 'inside_query', canAddGrouping, isAfterAggregationName: afterAggregationName };
}

/* Checks if cursor expects a right-hand operand after a binary operator like `a + |`. */
function resolveAfterOperatorPosition({
  cursor,
  binaryNode,
}: {
  cursor: number;
  binaryNode?: PromQLBinaryExpression;
}): PromqlDetailedPosition | undefined {
  if (!binaryNode) {
    return undefined;
  }

  const isExpectingRightOperand =
    binaryNode.incomplete &&
    binaryNode.right.type === 'unknown' &&
    (cursor > binaryNode.left.location.max || cursor >= binaryNode.location.max);

  if (!isExpectingRightOperand) {
    return undefined;
  }

  const signatureTypes = getPromqlBinaryOperatorParamTypes(binaryNode.name, 1);

  if (!signatureTypes?.length) {
    return undefined;
  }

  return {
    type: 'after_operator',
    signatureTypes,
  };
}

/* Resolves cursor position inside a label map: after brace, name, operator, or value. */
function resolveLabelPosition(
  match: CursorMatch,
  cursor: number,
  textBeforeCursor: string,
  signatureTypes: PromQLFunctionParamType[]
): PromqlDetailedPosition | undefined {
  const { node, parent } = match;

  const selectorNode =
    node.type === 'selector'
      ? (node as PromQLSelector)
      : parent?.type === 'selector'
      ? (parent as PromQLSelector)
      : undefined;

  if (
    selectorNode?.labelMap &&
    selectorNode.duration &&
    cursor <= selectorNode.duration.location.min &&
    cursor > selectorNode.labelMap.location.max &&
    textBeforeCursor.slice(selectorNode.labelMap.location.min, cursor).includes('}')
  ) {
    return {
      type: 'after_label_selector',
      selector: selectorNode,
      canSuggestRangeSelector: true,
      signatureTypes,
    };
  }

  if (node.type === 'label-map') {
    if (cursor <= node.location.min) {
      return undefined;
    }

    return { type: 'after_label_brace' };
  }

  const lastChar = textBeforeCursor.trimEnd().at(-1);

  if (lastChar === ',' && (parent?.type === 'label-map' || parent?.type === 'label')) {
    return { type: 'after_label_brace' };
  }

  if (parent?.type === 'label-map' && node.type === 'identifier') {
    return { type: 'after_label_name' };
  }

  let labelNode: PromQLLabel | undefined;

  if (parent?.type === 'label') {
    labelNode = parent as PromQLLabel;
  } else if (parent?.type === 'label-map' && node.type === 'label') {
    labelNode = node as PromQLLabel;
  }

  if (labelNode) {
    return mapLabelToPosition(labelNode);
  }

  return undefined;
}

/* Resolves cursor position inside a grouping clause like `by (job, |)`. */
function resolveGroupingPosition(
  cursor: number,
  text: string,
  groupingNode: { location: { min: number; max: number }; args: unknown[] }
): PromqlDetailedPosition | undefined {
  if (!isCursorInsideGrouping(cursor, groupingNode)) {
    return undefined;
  }

  if (text.slice(0, cursor).trimEnd().endsWith(',')) {
    return { type: 'inside_grouping', isCompleteLabel: false };
  }

  const isComplete = hasGroupingTrailingIdentifier(text, cursor, groupingNode.location.min);

  return { type: 'inside_grouping', isCompleteLabel: isComplete };
}

/* Resolves cursor within a selector: after metric, inside labels, or after closing brace. */
function resolveSelectorPosition(
  selector: PromQLSelector,
  cursor: number,
  textBeforeCursor: string,
  signatureTypes: PromQLFunctionParamType[]
): PromqlDetailedPosition | undefined {
  const { metric, labelMap } = selector;
  const metricName = metric?.name;
  const isFunctionLikeMetric = !!metricName && !!getPromqlFunctionDefinition(metricName);

  if (
    !isFunctionLikeMetric &&
    metric &&
    cursor > metric.location.max &&
    (!labelMap || cursor < labelMap.location.min)
  ) {
    return { type: 'after_metric', selector, signatureTypes };
  }

  if (!labelMap || cursor < labelMap.location.min) {
    return undefined;
  }

  if (labelMap.args.length === 0) {
    return { type: 'after_label_brace' };
  }

  const firstLabel = labelMap.args[0];

  if (cursor <= firstLabel.location.min) {
    return { type: 'after_label_brace' };
  }

  const lastLabel = labelMap.args[labelMap.args.length - 1];
  const lastChar = textBeforeCursor.trimEnd().at(-1);

  if (lastChar === ',') {
    return { type: 'after_label_brace' };
  }

  if (lastLabel.incomplete && !lastLabel.value) {
    if (lastLabel.labelName.incomplete) {
      return { type: 'after_label_brace' };
    }

    return { type: 'after_label_operator' };
  }

  if (
    !labelMap.incomplete &&
    cursor > lastLabel.location.max &&
    textBeforeCursor.slice(labelMap.location.min, cursor).includes('}')
  ) {
    const canSuggestRangeSelector = !selector.duration || cursor <= selector.duration.location.min;

    return {
      type: 'after_label_selector',
      selector,
      canSuggestRangeSelector,
      signatureTypes,
    };
  }

  const labelPosition = mapLabelToPosition(lastLabel);

  if (labelPosition) {
    return labelPosition;
  }

  if (labelMap.incomplete) {
    return { type: 'after_label_brace' };
  }

  return undefined;
}

/* Resolves cursor after a selector that is a function argument: `rate(metric{} |)`. */
function resolveSelectorArgPosition(
  func: PromQLFunction,
  cursor: number,
  textBeforeCursor: string,
  signatureTypes: PromQLFunctionParamType[]
): PromqlDetailedPosition | undefined {
  for (const arg of func.args) {
    if (arg.type !== 'selector') {
      continue;
    }

    const selector = arg as PromQLSelector;
    const selectorMetricName = selector.metric?.name;
    const isFunctionLikeMetric =
      !!selectorMetricName && !!getPromqlFunctionDefinition(selectorMetricName);

    if (
      !isFunctionLikeMetric &&
      selector.metric &&
      !selector.labelMap &&
      !selector.duration &&
      cursor > selector.metric.location.max
    ) {
      return { type: 'after_metric', selector, signatureTypes };
    }

    if (
      selector.labelMap &&
      !selector.duration &&
      cursor > selector.labelMap.location.max &&
      textBeforeCursor.slice(selector.labelMap.location.min, cursor).includes('}')
    ) {
      return {
        type: 'after_label_selector',
        selector,
        canSuggestRangeSelector: true,
        signatureTypes,
      };
    }
  }

  return undefined;
}

/* Resolves cursor inside a function call: arg start, between args, or after complete arg. */
function resolveFunctionPosition(
  func: PromQLFunction,
  cursor: number,
  text: string,
  signatureTypes: PromQLFunctionParamType[],
  textBeforeCursor: string
): PromqlDetailedPosition | undefined {
  const lastChar = textBeforeCursor.at(-1);

  if (isAtFunctionArgStart(text, cursor, func)) {
    const maxParams = getMaxParamsForFunction(func.name);

    if (
      maxParams !== undefined &&
      func.args.length >= maxParams &&
      !func.args.some((arg) => arg.location.min >= cursor)
    ) {
      return undefined;
    }

    return { type: 'inside_function_args', signatureTypes };
  }

  for (const arg of func.args) {
    if (arg.incomplete) {
      continue;
    }

    if (cursor >= arg.location.min && cursor <= arg.location.max) {
      return { type: 'inside_function_args', signatureTypes };
    }
  }

  if (func.args.length === 0) {
    return undefined;
  }

  const lastArg = func.args[func.args.length - 1];

  if (lastArg.incomplete || cursor <= lastArg.location.max || cursor > func.location.max + 1) {
    return undefined;
  }

  const textAfterLastArg = text.slice(lastArg.location.max + 1, cursor);

  if (textAfterLastArg.includes(')')) {
    return undefined;
  }

  if (
    lastArg.type === 'selector' &&
    SELECTOR_DURATION_START_REGEX.test(text.slice(lastArg.location.max + 1, cursor + 1))
  ) {
    if (lastArg.labelMap) {
      return {
        type: 'after_label_selector',
        selector: lastArg,
        canSuggestRangeSelector: true,
        signatureTypes,
      };
    }

    return { type: 'inside_query', canAddGrouping: false };
  }

  if (
    lastArg.type === 'selector' &&
    lastArg.labelMap &&
    !lastArg.duration &&
    textBeforeCursor.slice(lastArg.labelMap.location.min, cursor).includes('}')
  ) {
    return {
      type: 'after_label_selector',
      selector: lastArg,
      canSuggestRangeSelector: true,
      signatureTypes,
    };
  }

  if (signatureTypes.includes('range_vector')) {
    if (textAfterLastArg.includes('}') && !textAfterLastArg.includes('[')) {
      return {
        type: 'after_label_selector',
        canSuggestRangeSelector: true,
        signatureTypes,
      };
    }
  }

  const maxParams = getMaxParamsForFunction(func.name);

  if (!maxParams || lastChar === ',') {
    return { type: 'inside_function_args', signatureTypes };
  }

  const paramIndex = computeParamIndexFromArgs(func, cursor, text);
  const correctSignatureTypes = getPromqlFunctionParamTypes(func.name, paramIndex);

  return {
    type: 'after_complete_arg',
    canSuggestCommaInFunctionArgs: paramIndex < maxParams - 1,
    signatureTypes: correctSignatureTypes,
  };
}

/* Maps a single label node to its cursor position: name, operator, or value. */
function mapLabelToPosition(label: PromQLLabel): PromqlDetailedPosition | undefined {
  if (!label.value) {
    return label.incomplete ? { type: 'after_label_operator' } : { type: 'after_label_name' };
  }

  return { type: 'after_label_brace', isCompleteLabel: true };
}
