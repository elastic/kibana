/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Generated from src/parser/antlr/promql_parser.g4 by ANTLR 4.13.2

import { ParseTreeListener } from 'antlr4';

import type { SingleStatementContext } from './promql_parser.js';
import type { ValueExpressionContext } from './promql_parser.js';
import type { SubqueryContext } from './promql_parser.js';
import type { ParenthesizedContext } from './promql_parser.js';
import type { ArithmeticBinaryContext } from './promql_parser.js';
import type { ArithmeticUnaryContext } from './promql_parser.js';
import type { SubqueryResolutionContext } from './promql_parser.js';
import type { ValueContext } from './promql_parser.js';
import type { FunctionContext } from './promql_parser.js';
import type { FunctionParamsContext } from './promql_parser.js';
import type { GroupingContext } from './promql_parser.js';
import type { SelectorContext } from './promql_parser.js';
import type { SeriesMatcherContext } from './promql_parser.js';
import type { ModifierContext } from './promql_parser.js';
import type { LabelListContext } from './promql_parser.js';
import type { LabelsContext } from './promql_parser.js';
import type { LabelContext } from './promql_parser.js';
import type { LabelNameContext } from './promql_parser.js';
import type { IdentifierContext } from './promql_parser.js';
import type { EvaluationContext } from './promql_parser.js';
import type { OffsetContext } from './promql_parser.js';
import type { DurationContext } from './promql_parser.js';
import type { AtContext } from './promql_parser.js';
import type { ConstantContext } from './promql_parser.js';
import type { DecimalLiteralContext } from './promql_parser.js';
import type { IntegerLiteralContext } from './promql_parser.js';
import type { HexLiteralContext } from './promql_parser.js';
import type { StringContext } from './promql_parser.js';
import type { TimeValueContext } from './promql_parser.js';
import type { NonReservedContext } from './promql_parser.js';

/**
 * This interface defines a complete listener for a parse tree produced by
 * `promql_parser`.
 */
export default class promql_parserListener extends ParseTreeListener {
  /**
   * Enter a parse tree produced by `promql_parser.singleStatement`.
   * @param ctx the parse tree
   */
  enterSingleStatement?: (ctx: SingleStatementContext) => void;
  /**
   * Exit a parse tree produced by `promql_parser.singleStatement`.
   * @param ctx the parse tree
   */
  exitSingleStatement?: (ctx: SingleStatementContext) => void;
  /**
   * Enter a parse tree produced by the `valueExpression`
   * labeled alternative in `promql_parser.expression`.
   * @param ctx the parse tree
   */
  enterValueExpression?: (ctx: ValueExpressionContext) => void;
  /**
   * Exit a parse tree produced by the `valueExpression`
   * labeled alternative in `promql_parser.expression`.
   * @param ctx the parse tree
   */
  exitValueExpression?: (ctx: ValueExpressionContext) => void;
  /**
   * Enter a parse tree produced by the `subquery`
   * labeled alternative in `promql_parser.expression`.
   * @param ctx the parse tree
   */
  enterSubquery?: (ctx: SubqueryContext) => void;
  /**
   * Exit a parse tree produced by the `subquery`
   * labeled alternative in `promql_parser.expression`.
   * @param ctx the parse tree
   */
  exitSubquery?: (ctx: SubqueryContext) => void;
  /**
   * Enter a parse tree produced by the `parenthesized`
   * labeled alternative in `promql_parser.expression`.
   * @param ctx the parse tree
   */
  enterParenthesized?: (ctx: ParenthesizedContext) => void;
  /**
   * Exit a parse tree produced by the `parenthesized`
   * labeled alternative in `promql_parser.expression`.
   * @param ctx the parse tree
   */
  exitParenthesized?: (ctx: ParenthesizedContext) => void;
  /**
   * Enter a parse tree produced by the `arithmeticBinary`
   * labeled alternative in `promql_parser.expression`.
   * @param ctx the parse tree
   */
  enterArithmeticBinary?: (ctx: ArithmeticBinaryContext) => void;
  /**
   * Exit a parse tree produced by the `arithmeticBinary`
   * labeled alternative in `promql_parser.expression`.
   * @param ctx the parse tree
   */
  exitArithmeticBinary?: (ctx: ArithmeticBinaryContext) => void;
  /**
   * Enter a parse tree produced by the `arithmeticUnary`
   * labeled alternative in `promql_parser.expression`.
   * @param ctx the parse tree
   */
  enterArithmeticUnary?: (ctx: ArithmeticUnaryContext) => void;
  /**
   * Exit a parse tree produced by the `arithmeticUnary`
   * labeled alternative in `promql_parser.expression`.
   * @param ctx the parse tree
   */
  exitArithmeticUnary?: (ctx: ArithmeticUnaryContext) => void;
  /**
   * Enter a parse tree produced by `promql_parser.subqueryResolution`.
   * @param ctx the parse tree
   */
  enterSubqueryResolution?: (ctx: SubqueryResolutionContext) => void;
  /**
   * Exit a parse tree produced by `promql_parser.subqueryResolution`.
   * @param ctx the parse tree
   */
  exitSubqueryResolution?: (ctx: SubqueryResolutionContext) => void;
  /**
   * Enter a parse tree produced by `promql_parser.value`.
   * @param ctx the parse tree
   */
  enterValue?: (ctx: ValueContext) => void;
  /**
   * Exit a parse tree produced by `promql_parser.value`.
   * @param ctx the parse tree
   */
  exitValue?: (ctx: ValueContext) => void;
  /**
   * Enter a parse tree produced by `promql_parser.function`.
   * @param ctx the parse tree
   */
  enterFunction?: (ctx: FunctionContext) => void;
  /**
   * Exit a parse tree produced by `promql_parser.function`.
   * @param ctx the parse tree
   */
  exitFunction?: (ctx: FunctionContext) => void;
  /**
   * Enter a parse tree produced by `promql_parser.functionParams`.
   * @param ctx the parse tree
   */
  enterFunctionParams?: (ctx: FunctionParamsContext) => void;
  /**
   * Exit a parse tree produced by `promql_parser.functionParams`.
   * @param ctx the parse tree
   */
  exitFunctionParams?: (ctx: FunctionParamsContext) => void;
  /**
   * Enter a parse tree produced by `promql_parser.grouping`.
   * @param ctx the parse tree
   */
  enterGrouping?: (ctx: GroupingContext) => void;
  /**
   * Exit a parse tree produced by `promql_parser.grouping`.
   * @param ctx the parse tree
   */
  exitGrouping?: (ctx: GroupingContext) => void;
  /**
   * Enter a parse tree produced by `promql_parser.selector`.
   * @param ctx the parse tree
   */
  enterSelector?: (ctx: SelectorContext) => void;
  /**
   * Exit a parse tree produced by `promql_parser.selector`.
   * @param ctx the parse tree
   */
  exitSelector?: (ctx: SelectorContext) => void;
  /**
   * Enter a parse tree produced by `promql_parser.seriesMatcher`.
   * @param ctx the parse tree
   */
  enterSeriesMatcher?: (ctx: SeriesMatcherContext) => void;
  /**
   * Exit a parse tree produced by `promql_parser.seriesMatcher`.
   * @param ctx the parse tree
   */
  exitSeriesMatcher?: (ctx: SeriesMatcherContext) => void;
  /**
   * Enter a parse tree produced by `promql_parser.modifier`.
   * @param ctx the parse tree
   */
  enterModifier?: (ctx: ModifierContext) => void;
  /**
   * Exit a parse tree produced by `promql_parser.modifier`.
   * @param ctx the parse tree
   */
  exitModifier?: (ctx: ModifierContext) => void;
  /**
   * Enter a parse tree produced by `promql_parser.labelList`.
   * @param ctx the parse tree
   */
  enterLabelList?: (ctx: LabelListContext) => void;
  /**
   * Exit a parse tree produced by `promql_parser.labelList`.
   * @param ctx the parse tree
   */
  exitLabelList?: (ctx: LabelListContext) => void;
  /**
   * Enter a parse tree produced by `promql_parser.labels`.
   * @param ctx the parse tree
   */
  enterLabels?: (ctx: LabelsContext) => void;
  /**
   * Exit a parse tree produced by `promql_parser.labels`.
   * @param ctx the parse tree
   */
  exitLabels?: (ctx: LabelsContext) => void;
  /**
   * Enter a parse tree produced by `promql_parser.label`.
   * @param ctx the parse tree
   */
  enterLabel?: (ctx: LabelContext) => void;
  /**
   * Exit a parse tree produced by `promql_parser.label`.
   * @param ctx the parse tree
   */
  exitLabel?: (ctx: LabelContext) => void;
  /**
   * Enter a parse tree produced by `promql_parser.labelName`.
   * @param ctx the parse tree
   */
  enterLabelName?: (ctx: LabelNameContext) => void;
  /**
   * Exit a parse tree produced by `promql_parser.labelName`.
   * @param ctx the parse tree
   */
  exitLabelName?: (ctx: LabelNameContext) => void;
  /**
   * Enter a parse tree produced by `promql_parser.identifier`.
   * @param ctx the parse tree
   */
  enterIdentifier?: (ctx: IdentifierContext) => void;
  /**
   * Exit a parse tree produced by `promql_parser.identifier`.
   * @param ctx the parse tree
   */
  exitIdentifier?: (ctx: IdentifierContext) => void;
  /**
   * Enter a parse tree produced by `promql_parser.evaluation`.
   * @param ctx the parse tree
   */
  enterEvaluation?: (ctx: EvaluationContext) => void;
  /**
   * Exit a parse tree produced by `promql_parser.evaluation`.
   * @param ctx the parse tree
   */
  exitEvaluation?: (ctx: EvaluationContext) => void;
  /**
   * Enter a parse tree produced by `promql_parser.offset`.
   * @param ctx the parse tree
   */
  enterOffset?: (ctx: OffsetContext) => void;
  /**
   * Exit a parse tree produced by `promql_parser.offset`.
   * @param ctx the parse tree
   */
  exitOffset?: (ctx: OffsetContext) => void;
  /**
   * Enter a parse tree produced by `promql_parser.duration`.
   * @param ctx the parse tree
   */
  enterDuration?: (ctx: DurationContext) => void;
  /**
   * Exit a parse tree produced by `promql_parser.duration`.
   * @param ctx the parse tree
   */
  exitDuration?: (ctx: DurationContext) => void;
  /**
   * Enter a parse tree produced by `promql_parser.at`.
   * @param ctx the parse tree
   */
  enterAt?: (ctx: AtContext) => void;
  /**
   * Exit a parse tree produced by `promql_parser.at`.
   * @param ctx the parse tree
   */
  exitAt?: (ctx: AtContext) => void;
  /**
   * Enter a parse tree produced by `promql_parser.constant`.
   * @param ctx the parse tree
   */
  enterConstant?: (ctx: ConstantContext) => void;
  /**
   * Exit a parse tree produced by `promql_parser.constant`.
   * @param ctx the parse tree
   */
  exitConstant?: (ctx: ConstantContext) => void;
  /**
   * Enter a parse tree produced by the `decimalLiteral`
   * labeled alternative in `promql_parser.number`.
   * @param ctx the parse tree
   */
  enterDecimalLiteral?: (ctx: DecimalLiteralContext) => void;
  /**
   * Exit a parse tree produced by the `decimalLiteral`
   * labeled alternative in `promql_parser.number`.
   * @param ctx the parse tree
   */
  exitDecimalLiteral?: (ctx: DecimalLiteralContext) => void;
  /**
   * Enter a parse tree produced by the `integerLiteral`
   * labeled alternative in `promql_parser.number`.
   * @param ctx the parse tree
   */
  enterIntegerLiteral?: (ctx: IntegerLiteralContext) => void;
  /**
   * Exit a parse tree produced by the `integerLiteral`
   * labeled alternative in `promql_parser.number`.
   * @param ctx the parse tree
   */
  exitIntegerLiteral?: (ctx: IntegerLiteralContext) => void;
  /**
   * Enter a parse tree produced by the `hexLiteral`
   * labeled alternative in `promql_parser.number`.
   * @param ctx the parse tree
   */
  enterHexLiteral?: (ctx: HexLiteralContext) => void;
  /**
   * Exit a parse tree produced by the `hexLiteral`
   * labeled alternative in `promql_parser.number`.
   * @param ctx the parse tree
   */
  exitHexLiteral?: (ctx: HexLiteralContext) => void;
  /**
   * Enter a parse tree produced by `promql_parser.string`.
   * @param ctx the parse tree
   */
  enterString?: (ctx: StringContext) => void;
  /**
   * Exit a parse tree produced by `promql_parser.string`.
   * @param ctx the parse tree
   */
  exitString?: (ctx: StringContext) => void;
  /**
   * Enter a parse tree produced by `promql_parser.timeValue`.
   * @param ctx the parse tree
   */
  enterTimeValue?: (ctx: TimeValueContext) => void;
  /**
   * Exit a parse tree produced by `promql_parser.timeValue`.
   * @param ctx the parse tree
   */
  exitTimeValue?: (ctx: TimeValueContext) => void;
  /**
   * Enter a parse tree produced by `promql_parser.nonReserved`.
   * @param ctx the parse tree
   */
  enterNonReserved?: (ctx: NonReservedContext) => void;
  /**
   * Exit a parse tree produced by `promql_parser.nonReserved`.
   * @param ctx the parse tree
   */
  exitNonReserved?: (ctx: NonReservedContext) => void;
}
