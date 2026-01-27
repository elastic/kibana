// Generated from src/parser/antlr/promql_parser.g4 by ANTLR 4.13.2

import {ParseTreeListener} from "antlr4";


/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */


import { SingleStatementContext } from "./promql_parser.js";
import { ValueExpressionContext } from "./promql_parser.js";
import { SubqueryContext } from "./promql_parser.js";
import { ParenthesizedContext } from "./promql_parser.js";
import { ArithmeticBinaryContext } from "./promql_parser.js";
import { ArithmeticUnaryContext } from "./promql_parser.js";
import { SubqueryResolutionContext } from "./promql_parser.js";
import { ValueContext } from "./promql_parser.js";
import { FunctionContext } from "./promql_parser.js";
import { FunctionParamsContext } from "./promql_parser.js";
import { GroupingContext } from "./promql_parser.js";
import { SelectorContext } from "./promql_parser.js";
import { SeriesMatcherContext } from "./promql_parser.js";
import { ModifierContext } from "./promql_parser.js";
import { LabelListContext } from "./promql_parser.js";
import { LabelsContext } from "./promql_parser.js";
import { LabelContext } from "./promql_parser.js";
import { LabelNameContext } from "./promql_parser.js";
import { IdentifierContext } from "./promql_parser.js";
import { EvaluationContext } from "./promql_parser.js";
import { OffsetContext } from "./promql_parser.js";
import { DurationContext } from "./promql_parser.js";
import { AtContext } from "./promql_parser.js";
import { ConstantContext } from "./promql_parser.js";
import { DecimalLiteralContext } from "./promql_parser.js";
import { IntegerLiteralContext } from "./promql_parser.js";
import { HexLiteralContext } from "./promql_parser.js";
import { StringContext } from "./promql_parser.js";
import { TimeValueContext } from "./promql_parser.js";
import { NonReservedContext } from "./promql_parser.js";


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

