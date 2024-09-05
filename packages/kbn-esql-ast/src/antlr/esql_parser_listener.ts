// @ts-nocheck
// Generated from src/antlr/esql_parser.g4 by ANTLR 4.13.2

import {ParseTreeListener} from "antlr4";


/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */


import { SingleStatementContext } from "./esql_parser.js";
import { CompositeQueryContext } from "./esql_parser.js";
import { SingleCommandQueryContext } from "./esql_parser.js";
import { SourceCommandContext } from "./esql_parser.js";
import { ProcessingCommandContext } from "./esql_parser.js";
import { WhereCommandContext } from "./esql_parser.js";
import { MatchExpressionContext } from "./esql_parser.js";
import { LogicalNotContext } from "./esql_parser.js";
import { BooleanDefaultContext } from "./esql_parser.js";
import { IsNullContext } from "./esql_parser.js";
import { RegexExpressionContext } from "./esql_parser.js";
import { LogicalInContext } from "./esql_parser.js";
import { LogicalBinaryContext } from "./esql_parser.js";
import { RegexBooleanExpressionContext } from "./esql_parser.js";
import { MatchBooleanExpressionContext } from "./esql_parser.js";
import { ValueExpressionDefaultContext } from "./esql_parser.js";
import { ComparisonContext } from "./esql_parser.js";
import { OperatorExpressionDefaultContext } from "./esql_parser.js";
import { ArithmeticBinaryContext } from "./esql_parser.js";
import { ArithmeticUnaryContext } from "./esql_parser.js";
import { DereferenceContext } from "./esql_parser.js";
import { InlineCastContext } from "./esql_parser.js";
import { ConstantDefaultContext } from "./esql_parser.js";
import { ParenthesizedExpressionContext } from "./esql_parser.js";
import { FunctionContext } from "./esql_parser.js";
import { FunctionExpressionContext } from "./esql_parser.js";
import { ToDataTypeContext } from "./esql_parser.js";
import { RowCommandContext } from "./esql_parser.js";
import { FieldsContext } from "./esql_parser.js";
import { FieldContext } from "./esql_parser.js";
import { FromCommandContext } from "./esql_parser.js";
import { IndexPatternContext } from "./esql_parser.js";
import { ClusterStringContext } from "./esql_parser.js";
import { IndexStringContext } from "./esql_parser.js";
import { MetadataContext } from "./esql_parser.js";
import { MetadataOptionContext } from "./esql_parser.js";
import { Deprecated_metadataContext } from "./esql_parser.js";
import { MetricsCommandContext } from "./esql_parser.js";
import { EvalCommandContext } from "./esql_parser.js";
import { StatsCommandContext } from "./esql_parser.js";
import { QualifiedNameContext } from "./esql_parser.js";
import { QualifiedNamePatternContext } from "./esql_parser.js";
import { QualifiedNamePatternsContext } from "./esql_parser.js";
import { IdentifierContext } from "./esql_parser.js";
import { IdentifierPatternContext } from "./esql_parser.js";
import { NullLiteralContext } from "./esql_parser.js";
import { QualifiedIntegerLiteralContext } from "./esql_parser.js";
import { DecimalLiteralContext } from "./esql_parser.js";
import { IntegerLiteralContext } from "./esql_parser.js";
import { BooleanLiteralContext } from "./esql_parser.js";
import { InputParamsContext } from "./esql_parser.js";
import { StringLiteralContext } from "./esql_parser.js";
import { NumericArrayLiteralContext } from "./esql_parser.js";
import { BooleanArrayLiteralContext } from "./esql_parser.js";
import { StringArrayLiteralContext } from "./esql_parser.js";
import { InputParamContext } from "./esql_parser.js";
import { InputNamedOrPositionalParamContext } from "./esql_parser.js";
import { LimitCommandContext } from "./esql_parser.js";
import { SortCommandContext } from "./esql_parser.js";
import { OrderExpressionContext } from "./esql_parser.js";
import { KeepCommandContext } from "./esql_parser.js";
import { DropCommandContext } from "./esql_parser.js";
import { RenameCommandContext } from "./esql_parser.js";
import { RenameClauseContext } from "./esql_parser.js";
import { DissectCommandContext } from "./esql_parser.js";
import { GrokCommandContext } from "./esql_parser.js";
import { MvExpandCommandContext } from "./esql_parser.js";
import { CommandOptionsContext } from "./esql_parser.js";
import { CommandOptionContext } from "./esql_parser.js";
import { BooleanValueContext } from "./esql_parser.js";
import { NumericValueContext } from "./esql_parser.js";
import { DecimalValueContext } from "./esql_parser.js";
import { IntegerValueContext } from "./esql_parser.js";
import { StringContext } from "./esql_parser.js";
import { ComparisonOperatorContext } from "./esql_parser.js";
import { ExplainCommandContext } from "./esql_parser.js";
import { SubqueryExpressionContext } from "./esql_parser.js";
import { ShowInfoContext } from "./esql_parser.js";
import { MetaFunctionsContext } from "./esql_parser.js";
import { EnrichCommandContext } from "./esql_parser.js";
import { EnrichWithClauseContext } from "./esql_parser.js";
import { LookupCommandContext } from "./esql_parser.js";
import { InlinestatsCommandContext } from "./esql_parser.js";
import { MatchCommandContext } from "./esql_parser.js";
import { MatchQueryContext } from "./esql_parser.js";


/**
 * This interface defines a complete listener for a parse tree produced by
 * `esql_parser`.
 */
export default class esql_parserListener extends ParseTreeListener {
	/**
	 * Enter a parse tree produced by `esql_parser.singleStatement`.
	 * @param ctx the parse tree
	 */
	enterSingleStatement?: (ctx: SingleStatementContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.singleStatement`.
	 * @param ctx the parse tree
	 */
	exitSingleStatement?: (ctx: SingleStatementContext) => void;
	/**
	 * Enter a parse tree produced by the `compositeQuery`
	 * labeled alternative in `esql_parser.query`.
	 * @param ctx the parse tree
	 */
	enterCompositeQuery?: (ctx: CompositeQueryContext) => void;
	/**
	 * Exit a parse tree produced by the `compositeQuery`
	 * labeled alternative in `esql_parser.query`.
	 * @param ctx the parse tree
	 */
	exitCompositeQuery?: (ctx: CompositeQueryContext) => void;
	/**
	 * Enter a parse tree produced by the `singleCommandQuery`
	 * labeled alternative in `esql_parser.query`.
	 * @param ctx the parse tree
	 */
	enterSingleCommandQuery?: (ctx: SingleCommandQueryContext) => void;
	/**
	 * Exit a parse tree produced by the `singleCommandQuery`
	 * labeled alternative in `esql_parser.query`.
	 * @param ctx the parse tree
	 */
	exitSingleCommandQuery?: (ctx: SingleCommandQueryContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.sourceCommand`.
	 * @param ctx the parse tree
	 */
	enterSourceCommand?: (ctx: SourceCommandContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.sourceCommand`.
	 * @param ctx the parse tree
	 */
	exitSourceCommand?: (ctx: SourceCommandContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.processingCommand`.
	 * @param ctx the parse tree
	 */
	enterProcessingCommand?: (ctx: ProcessingCommandContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.processingCommand`.
	 * @param ctx the parse tree
	 */
	exitProcessingCommand?: (ctx: ProcessingCommandContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.whereCommand`.
	 * @param ctx the parse tree
	 */
	enterWhereCommand?: (ctx: WhereCommandContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.whereCommand`.
	 * @param ctx the parse tree
	 */
	exitWhereCommand?: (ctx: WhereCommandContext) => void;
	/**
	 * Enter a parse tree produced by the `matchExpression`
	 * labeled alternative in `esql_parser.booleanExpression`.
	 * @param ctx the parse tree
	 */
	enterMatchExpression?: (ctx: MatchExpressionContext) => void;
	/**
	 * Exit a parse tree produced by the `matchExpression`
	 * labeled alternative in `esql_parser.booleanExpression`.
	 * @param ctx the parse tree
	 */
	exitMatchExpression?: (ctx: MatchExpressionContext) => void;
	/**
	 * Enter a parse tree produced by the `logicalNot`
	 * labeled alternative in `esql_parser.booleanExpression`.
	 * @param ctx the parse tree
	 */
	enterLogicalNot?: (ctx: LogicalNotContext) => void;
	/**
	 * Exit a parse tree produced by the `logicalNot`
	 * labeled alternative in `esql_parser.booleanExpression`.
	 * @param ctx the parse tree
	 */
	exitLogicalNot?: (ctx: LogicalNotContext) => void;
	/**
	 * Enter a parse tree produced by the `booleanDefault`
	 * labeled alternative in `esql_parser.booleanExpression`.
	 * @param ctx the parse tree
	 */
	enterBooleanDefault?: (ctx: BooleanDefaultContext) => void;
	/**
	 * Exit a parse tree produced by the `booleanDefault`
	 * labeled alternative in `esql_parser.booleanExpression`.
	 * @param ctx the parse tree
	 */
	exitBooleanDefault?: (ctx: BooleanDefaultContext) => void;
	/**
	 * Enter a parse tree produced by the `isNull`
	 * labeled alternative in `esql_parser.booleanExpression`.
	 * @param ctx the parse tree
	 */
	enterIsNull?: (ctx: IsNullContext) => void;
	/**
	 * Exit a parse tree produced by the `isNull`
	 * labeled alternative in `esql_parser.booleanExpression`.
	 * @param ctx the parse tree
	 */
	exitIsNull?: (ctx: IsNullContext) => void;
	/**
	 * Enter a parse tree produced by the `regexExpression`
	 * labeled alternative in `esql_parser.booleanExpression`.
	 * @param ctx the parse tree
	 */
	enterRegexExpression?: (ctx: RegexExpressionContext) => void;
	/**
	 * Exit a parse tree produced by the `regexExpression`
	 * labeled alternative in `esql_parser.booleanExpression`.
	 * @param ctx the parse tree
	 */
	exitRegexExpression?: (ctx: RegexExpressionContext) => void;
	/**
	 * Enter a parse tree produced by the `logicalIn`
	 * labeled alternative in `esql_parser.booleanExpression`.
	 * @param ctx the parse tree
	 */
	enterLogicalIn?: (ctx: LogicalInContext) => void;
	/**
	 * Exit a parse tree produced by the `logicalIn`
	 * labeled alternative in `esql_parser.booleanExpression`.
	 * @param ctx the parse tree
	 */
	exitLogicalIn?: (ctx: LogicalInContext) => void;
	/**
	 * Enter a parse tree produced by the `logicalBinary`
	 * labeled alternative in `esql_parser.booleanExpression`.
	 * @param ctx the parse tree
	 */
	enterLogicalBinary?: (ctx: LogicalBinaryContext) => void;
	/**
	 * Exit a parse tree produced by the `logicalBinary`
	 * labeled alternative in `esql_parser.booleanExpression`.
	 * @param ctx the parse tree
	 */
	exitLogicalBinary?: (ctx: LogicalBinaryContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.regexBooleanExpression`.
	 * @param ctx the parse tree
	 */
	enterRegexBooleanExpression?: (ctx: RegexBooleanExpressionContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.regexBooleanExpression`.
	 * @param ctx the parse tree
	 */
	exitRegexBooleanExpression?: (ctx: RegexBooleanExpressionContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.matchBooleanExpression`.
	 * @param ctx the parse tree
	 */
	enterMatchBooleanExpression?: (ctx: MatchBooleanExpressionContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.matchBooleanExpression`.
	 * @param ctx the parse tree
	 */
	exitMatchBooleanExpression?: (ctx: MatchBooleanExpressionContext) => void;
	/**
	 * Enter a parse tree produced by the `valueExpressionDefault`
	 * labeled alternative in `esql_parser.valueExpression`.
	 * @param ctx the parse tree
	 */
	enterValueExpressionDefault?: (ctx: ValueExpressionDefaultContext) => void;
	/**
	 * Exit a parse tree produced by the `valueExpressionDefault`
	 * labeled alternative in `esql_parser.valueExpression`.
	 * @param ctx the parse tree
	 */
	exitValueExpressionDefault?: (ctx: ValueExpressionDefaultContext) => void;
	/**
	 * Enter a parse tree produced by the `comparison`
	 * labeled alternative in `esql_parser.valueExpression`.
	 * @param ctx the parse tree
	 */
	enterComparison?: (ctx: ComparisonContext) => void;
	/**
	 * Exit a parse tree produced by the `comparison`
	 * labeled alternative in `esql_parser.valueExpression`.
	 * @param ctx the parse tree
	 */
	exitComparison?: (ctx: ComparisonContext) => void;
	/**
	 * Enter a parse tree produced by the `operatorExpressionDefault`
	 * labeled alternative in `esql_parser.operatorExpression`.
	 * @param ctx the parse tree
	 */
	enterOperatorExpressionDefault?: (ctx: OperatorExpressionDefaultContext) => void;
	/**
	 * Exit a parse tree produced by the `operatorExpressionDefault`
	 * labeled alternative in `esql_parser.operatorExpression`.
	 * @param ctx the parse tree
	 */
	exitOperatorExpressionDefault?: (ctx: OperatorExpressionDefaultContext) => void;
	/**
	 * Enter a parse tree produced by the `arithmeticBinary`
	 * labeled alternative in `esql_parser.operatorExpression`.
	 * @param ctx the parse tree
	 */
	enterArithmeticBinary?: (ctx: ArithmeticBinaryContext) => void;
	/**
	 * Exit a parse tree produced by the `arithmeticBinary`
	 * labeled alternative in `esql_parser.operatorExpression`.
	 * @param ctx the parse tree
	 */
	exitArithmeticBinary?: (ctx: ArithmeticBinaryContext) => void;
	/**
	 * Enter a parse tree produced by the `arithmeticUnary`
	 * labeled alternative in `esql_parser.operatorExpression`.
	 * @param ctx the parse tree
	 */
	enterArithmeticUnary?: (ctx: ArithmeticUnaryContext) => void;
	/**
	 * Exit a parse tree produced by the `arithmeticUnary`
	 * labeled alternative in `esql_parser.operatorExpression`.
	 * @param ctx the parse tree
	 */
	exitArithmeticUnary?: (ctx: ArithmeticUnaryContext) => void;
	/**
	 * Enter a parse tree produced by the `dereference`
	 * labeled alternative in `esql_parser.primaryExpression`.
	 * @param ctx the parse tree
	 */
	enterDereference?: (ctx: DereferenceContext) => void;
	/**
	 * Exit a parse tree produced by the `dereference`
	 * labeled alternative in `esql_parser.primaryExpression`.
	 * @param ctx the parse tree
	 */
	exitDereference?: (ctx: DereferenceContext) => void;
	/**
	 * Enter a parse tree produced by the `inlineCast`
	 * labeled alternative in `esql_parser.primaryExpression`.
	 * @param ctx the parse tree
	 */
	enterInlineCast?: (ctx: InlineCastContext) => void;
	/**
	 * Exit a parse tree produced by the `inlineCast`
	 * labeled alternative in `esql_parser.primaryExpression`.
	 * @param ctx the parse tree
	 */
	exitInlineCast?: (ctx: InlineCastContext) => void;
	/**
	 * Enter a parse tree produced by the `constantDefault`
	 * labeled alternative in `esql_parser.primaryExpression`.
	 * @param ctx the parse tree
	 */
	enterConstantDefault?: (ctx: ConstantDefaultContext) => void;
	/**
	 * Exit a parse tree produced by the `constantDefault`
	 * labeled alternative in `esql_parser.primaryExpression`.
	 * @param ctx the parse tree
	 */
	exitConstantDefault?: (ctx: ConstantDefaultContext) => void;
	/**
	 * Enter a parse tree produced by the `parenthesizedExpression`
	 * labeled alternative in `esql_parser.primaryExpression`.
	 * @param ctx the parse tree
	 */
	enterParenthesizedExpression?: (ctx: ParenthesizedExpressionContext) => void;
	/**
	 * Exit a parse tree produced by the `parenthesizedExpression`
	 * labeled alternative in `esql_parser.primaryExpression`.
	 * @param ctx the parse tree
	 */
	exitParenthesizedExpression?: (ctx: ParenthesizedExpressionContext) => void;
	/**
	 * Enter a parse tree produced by the `function`
	 * labeled alternative in `esql_parser.primaryExpression`.
	 * @param ctx the parse tree
	 */
	enterFunction?: (ctx: FunctionContext) => void;
	/**
	 * Exit a parse tree produced by the `function`
	 * labeled alternative in `esql_parser.primaryExpression`.
	 * @param ctx the parse tree
	 */
	exitFunction?: (ctx: FunctionContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.functionExpression`.
	 * @param ctx the parse tree
	 */
	enterFunctionExpression?: (ctx: FunctionExpressionContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.functionExpression`.
	 * @param ctx the parse tree
	 */
	exitFunctionExpression?: (ctx: FunctionExpressionContext) => void;
	/**
	 * Enter a parse tree produced by the `toDataType`
	 * labeled alternative in `esql_parser.dataType`.
	 * @param ctx the parse tree
	 */
	enterToDataType?: (ctx: ToDataTypeContext) => void;
	/**
	 * Exit a parse tree produced by the `toDataType`
	 * labeled alternative in `esql_parser.dataType`.
	 * @param ctx the parse tree
	 */
	exitToDataType?: (ctx: ToDataTypeContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.rowCommand`.
	 * @param ctx the parse tree
	 */
	enterRowCommand?: (ctx: RowCommandContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.rowCommand`.
	 * @param ctx the parse tree
	 */
	exitRowCommand?: (ctx: RowCommandContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.fields`.
	 * @param ctx the parse tree
	 */
	enterFields?: (ctx: FieldsContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.fields`.
	 * @param ctx the parse tree
	 */
	exitFields?: (ctx: FieldsContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.field`.
	 * @param ctx the parse tree
	 */
	enterField?: (ctx: FieldContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.field`.
	 * @param ctx the parse tree
	 */
	exitField?: (ctx: FieldContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.fromCommand`.
	 * @param ctx the parse tree
	 */
	enterFromCommand?: (ctx: FromCommandContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.fromCommand`.
	 * @param ctx the parse tree
	 */
	exitFromCommand?: (ctx: FromCommandContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.indexPattern`.
	 * @param ctx the parse tree
	 */
	enterIndexPattern?: (ctx: IndexPatternContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.indexPattern`.
	 * @param ctx the parse tree
	 */
	exitIndexPattern?: (ctx: IndexPatternContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.clusterString`.
	 * @param ctx the parse tree
	 */
	enterClusterString?: (ctx: ClusterStringContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.clusterString`.
	 * @param ctx the parse tree
	 */
	exitClusterString?: (ctx: ClusterStringContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.indexString`.
	 * @param ctx the parse tree
	 */
	enterIndexString?: (ctx: IndexStringContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.indexString`.
	 * @param ctx the parse tree
	 */
	exitIndexString?: (ctx: IndexStringContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.metadata`.
	 * @param ctx the parse tree
	 */
	enterMetadata?: (ctx: MetadataContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.metadata`.
	 * @param ctx the parse tree
	 */
	exitMetadata?: (ctx: MetadataContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.metadataOption`.
	 * @param ctx the parse tree
	 */
	enterMetadataOption?: (ctx: MetadataOptionContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.metadataOption`.
	 * @param ctx the parse tree
	 */
	exitMetadataOption?: (ctx: MetadataOptionContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.deprecated_metadata`.
	 * @param ctx the parse tree
	 */
	enterDeprecated_metadata?: (ctx: Deprecated_metadataContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.deprecated_metadata`.
	 * @param ctx the parse tree
	 */
	exitDeprecated_metadata?: (ctx: Deprecated_metadataContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.metricsCommand`.
	 * @param ctx the parse tree
	 */
	enterMetricsCommand?: (ctx: MetricsCommandContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.metricsCommand`.
	 * @param ctx the parse tree
	 */
	exitMetricsCommand?: (ctx: MetricsCommandContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.evalCommand`.
	 * @param ctx the parse tree
	 */
	enterEvalCommand?: (ctx: EvalCommandContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.evalCommand`.
	 * @param ctx the parse tree
	 */
	exitEvalCommand?: (ctx: EvalCommandContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.statsCommand`.
	 * @param ctx the parse tree
	 */
	enterStatsCommand?: (ctx: StatsCommandContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.statsCommand`.
	 * @param ctx the parse tree
	 */
	exitStatsCommand?: (ctx: StatsCommandContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.qualifiedName`.
	 * @param ctx the parse tree
	 */
	enterQualifiedName?: (ctx: QualifiedNameContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.qualifiedName`.
	 * @param ctx the parse tree
	 */
	exitQualifiedName?: (ctx: QualifiedNameContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.qualifiedNamePattern`.
	 * @param ctx the parse tree
	 */
	enterQualifiedNamePattern?: (ctx: QualifiedNamePatternContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.qualifiedNamePattern`.
	 * @param ctx the parse tree
	 */
	exitQualifiedNamePattern?: (ctx: QualifiedNamePatternContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.qualifiedNamePatterns`.
	 * @param ctx the parse tree
	 */
	enterQualifiedNamePatterns?: (ctx: QualifiedNamePatternsContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.qualifiedNamePatterns`.
	 * @param ctx the parse tree
	 */
	exitQualifiedNamePatterns?: (ctx: QualifiedNamePatternsContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.identifier`.
	 * @param ctx the parse tree
	 */
	enterIdentifier?: (ctx: IdentifierContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.identifier`.
	 * @param ctx the parse tree
	 */
	exitIdentifier?: (ctx: IdentifierContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.identifierPattern`.
	 * @param ctx the parse tree
	 */
	enterIdentifierPattern?: (ctx: IdentifierPatternContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.identifierPattern`.
	 * @param ctx the parse tree
	 */
	exitIdentifierPattern?: (ctx: IdentifierPatternContext) => void;
	/**
	 * Enter a parse tree produced by the `nullLiteral`
	 * labeled alternative in `esql_parser.constant`.
	 * @param ctx the parse tree
	 */
	enterNullLiteral?: (ctx: NullLiteralContext) => void;
	/**
	 * Exit a parse tree produced by the `nullLiteral`
	 * labeled alternative in `esql_parser.constant`.
	 * @param ctx the parse tree
	 */
	exitNullLiteral?: (ctx: NullLiteralContext) => void;
	/**
	 * Enter a parse tree produced by the `qualifiedIntegerLiteral`
	 * labeled alternative in `esql_parser.constant`.
	 * @param ctx the parse tree
	 */
	enterQualifiedIntegerLiteral?: (ctx: QualifiedIntegerLiteralContext) => void;
	/**
	 * Exit a parse tree produced by the `qualifiedIntegerLiteral`
	 * labeled alternative in `esql_parser.constant`.
	 * @param ctx the parse tree
	 */
	exitQualifiedIntegerLiteral?: (ctx: QualifiedIntegerLiteralContext) => void;
	/**
	 * Enter a parse tree produced by the `decimalLiteral`
	 * labeled alternative in `esql_parser.constant`.
	 * @param ctx the parse tree
	 */
	enterDecimalLiteral?: (ctx: DecimalLiteralContext) => void;
	/**
	 * Exit a parse tree produced by the `decimalLiteral`
	 * labeled alternative in `esql_parser.constant`.
	 * @param ctx the parse tree
	 */
	exitDecimalLiteral?: (ctx: DecimalLiteralContext) => void;
	/**
	 * Enter a parse tree produced by the `integerLiteral`
	 * labeled alternative in `esql_parser.constant`.
	 * @param ctx the parse tree
	 */
	enterIntegerLiteral?: (ctx: IntegerLiteralContext) => void;
	/**
	 * Exit a parse tree produced by the `integerLiteral`
	 * labeled alternative in `esql_parser.constant`.
	 * @param ctx the parse tree
	 */
	exitIntegerLiteral?: (ctx: IntegerLiteralContext) => void;
	/**
	 * Enter a parse tree produced by the `booleanLiteral`
	 * labeled alternative in `esql_parser.constant`.
	 * @param ctx the parse tree
	 */
	enterBooleanLiteral?: (ctx: BooleanLiteralContext) => void;
	/**
	 * Exit a parse tree produced by the `booleanLiteral`
	 * labeled alternative in `esql_parser.constant`.
	 * @param ctx the parse tree
	 */
	exitBooleanLiteral?: (ctx: BooleanLiteralContext) => void;
	/**
	 * Enter a parse tree produced by the `inputParams`
	 * labeled alternative in `esql_parser.constant`.
	 * @param ctx the parse tree
	 */
	enterInputParams?: (ctx: InputParamsContext) => void;
	/**
	 * Exit a parse tree produced by the `inputParams`
	 * labeled alternative in `esql_parser.constant`.
	 * @param ctx the parse tree
	 */
	exitInputParams?: (ctx: InputParamsContext) => void;
	/**
	 * Enter a parse tree produced by the `stringLiteral`
	 * labeled alternative in `esql_parser.constant`.
	 * @param ctx the parse tree
	 */
	enterStringLiteral?: (ctx: StringLiteralContext) => void;
	/**
	 * Exit a parse tree produced by the `stringLiteral`
	 * labeled alternative in `esql_parser.constant`.
	 * @param ctx the parse tree
	 */
	exitStringLiteral?: (ctx: StringLiteralContext) => void;
	/**
	 * Enter a parse tree produced by the `numericArrayLiteral`
	 * labeled alternative in `esql_parser.constant`.
	 * @param ctx the parse tree
	 */
	enterNumericArrayLiteral?: (ctx: NumericArrayLiteralContext) => void;
	/**
	 * Exit a parse tree produced by the `numericArrayLiteral`
	 * labeled alternative in `esql_parser.constant`.
	 * @param ctx the parse tree
	 */
	exitNumericArrayLiteral?: (ctx: NumericArrayLiteralContext) => void;
	/**
	 * Enter a parse tree produced by the `booleanArrayLiteral`
	 * labeled alternative in `esql_parser.constant`.
	 * @param ctx the parse tree
	 */
	enterBooleanArrayLiteral?: (ctx: BooleanArrayLiteralContext) => void;
	/**
	 * Exit a parse tree produced by the `booleanArrayLiteral`
	 * labeled alternative in `esql_parser.constant`.
	 * @param ctx the parse tree
	 */
	exitBooleanArrayLiteral?: (ctx: BooleanArrayLiteralContext) => void;
	/**
	 * Enter a parse tree produced by the `stringArrayLiteral`
	 * labeled alternative in `esql_parser.constant`.
	 * @param ctx the parse tree
	 */
	enterStringArrayLiteral?: (ctx: StringArrayLiteralContext) => void;
	/**
	 * Exit a parse tree produced by the `stringArrayLiteral`
	 * labeled alternative in `esql_parser.constant`.
	 * @param ctx the parse tree
	 */
	exitStringArrayLiteral?: (ctx: StringArrayLiteralContext) => void;
	/**
	 * Enter a parse tree produced by the `inputParam`
	 * labeled alternative in `esql_parser.params`.
	 * @param ctx the parse tree
	 */
	enterInputParam?: (ctx: InputParamContext) => void;
	/**
	 * Exit a parse tree produced by the `inputParam`
	 * labeled alternative in `esql_parser.params`.
	 * @param ctx the parse tree
	 */
	exitInputParam?: (ctx: InputParamContext) => void;
	/**
	 * Enter a parse tree produced by the `inputNamedOrPositionalParam`
	 * labeled alternative in `esql_parser.params`.
	 * @param ctx the parse tree
	 */
	enterInputNamedOrPositionalParam?: (ctx: InputNamedOrPositionalParamContext) => void;
	/**
	 * Exit a parse tree produced by the `inputNamedOrPositionalParam`
	 * labeled alternative in `esql_parser.params`.
	 * @param ctx the parse tree
	 */
	exitInputNamedOrPositionalParam?: (ctx: InputNamedOrPositionalParamContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.limitCommand`.
	 * @param ctx the parse tree
	 */
	enterLimitCommand?: (ctx: LimitCommandContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.limitCommand`.
	 * @param ctx the parse tree
	 */
	exitLimitCommand?: (ctx: LimitCommandContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.sortCommand`.
	 * @param ctx the parse tree
	 */
	enterSortCommand?: (ctx: SortCommandContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.sortCommand`.
	 * @param ctx the parse tree
	 */
	exitSortCommand?: (ctx: SortCommandContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.orderExpression`.
	 * @param ctx the parse tree
	 */
	enterOrderExpression?: (ctx: OrderExpressionContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.orderExpression`.
	 * @param ctx the parse tree
	 */
	exitOrderExpression?: (ctx: OrderExpressionContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.keepCommand`.
	 * @param ctx the parse tree
	 */
	enterKeepCommand?: (ctx: KeepCommandContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.keepCommand`.
	 * @param ctx the parse tree
	 */
	exitKeepCommand?: (ctx: KeepCommandContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.dropCommand`.
	 * @param ctx the parse tree
	 */
	enterDropCommand?: (ctx: DropCommandContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.dropCommand`.
	 * @param ctx the parse tree
	 */
	exitDropCommand?: (ctx: DropCommandContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.renameCommand`.
	 * @param ctx the parse tree
	 */
	enterRenameCommand?: (ctx: RenameCommandContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.renameCommand`.
	 * @param ctx the parse tree
	 */
	exitRenameCommand?: (ctx: RenameCommandContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.renameClause`.
	 * @param ctx the parse tree
	 */
	enterRenameClause?: (ctx: RenameClauseContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.renameClause`.
	 * @param ctx the parse tree
	 */
	exitRenameClause?: (ctx: RenameClauseContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.dissectCommand`.
	 * @param ctx the parse tree
	 */
	enterDissectCommand?: (ctx: DissectCommandContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.dissectCommand`.
	 * @param ctx the parse tree
	 */
	exitDissectCommand?: (ctx: DissectCommandContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.grokCommand`.
	 * @param ctx the parse tree
	 */
	enterGrokCommand?: (ctx: GrokCommandContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.grokCommand`.
	 * @param ctx the parse tree
	 */
	exitGrokCommand?: (ctx: GrokCommandContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.mvExpandCommand`.
	 * @param ctx the parse tree
	 */
	enterMvExpandCommand?: (ctx: MvExpandCommandContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.mvExpandCommand`.
	 * @param ctx the parse tree
	 */
	exitMvExpandCommand?: (ctx: MvExpandCommandContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.commandOptions`.
	 * @param ctx the parse tree
	 */
	enterCommandOptions?: (ctx: CommandOptionsContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.commandOptions`.
	 * @param ctx the parse tree
	 */
	exitCommandOptions?: (ctx: CommandOptionsContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.commandOption`.
	 * @param ctx the parse tree
	 */
	enterCommandOption?: (ctx: CommandOptionContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.commandOption`.
	 * @param ctx the parse tree
	 */
	exitCommandOption?: (ctx: CommandOptionContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.booleanValue`.
	 * @param ctx the parse tree
	 */
	enterBooleanValue?: (ctx: BooleanValueContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.booleanValue`.
	 * @param ctx the parse tree
	 */
	exitBooleanValue?: (ctx: BooleanValueContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.numericValue`.
	 * @param ctx the parse tree
	 */
	enterNumericValue?: (ctx: NumericValueContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.numericValue`.
	 * @param ctx the parse tree
	 */
	exitNumericValue?: (ctx: NumericValueContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.decimalValue`.
	 * @param ctx the parse tree
	 */
	enterDecimalValue?: (ctx: DecimalValueContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.decimalValue`.
	 * @param ctx the parse tree
	 */
	exitDecimalValue?: (ctx: DecimalValueContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.integerValue`.
	 * @param ctx the parse tree
	 */
	enterIntegerValue?: (ctx: IntegerValueContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.integerValue`.
	 * @param ctx the parse tree
	 */
	exitIntegerValue?: (ctx: IntegerValueContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.string`.
	 * @param ctx the parse tree
	 */
	enterString?: (ctx: StringContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.string`.
	 * @param ctx the parse tree
	 */
	exitString?: (ctx: StringContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.comparisonOperator`.
	 * @param ctx the parse tree
	 */
	enterComparisonOperator?: (ctx: ComparisonOperatorContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.comparisonOperator`.
	 * @param ctx the parse tree
	 */
	exitComparisonOperator?: (ctx: ComparisonOperatorContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.explainCommand`.
	 * @param ctx the parse tree
	 */
	enterExplainCommand?: (ctx: ExplainCommandContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.explainCommand`.
	 * @param ctx the parse tree
	 */
	exitExplainCommand?: (ctx: ExplainCommandContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.subqueryExpression`.
	 * @param ctx the parse tree
	 */
	enterSubqueryExpression?: (ctx: SubqueryExpressionContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.subqueryExpression`.
	 * @param ctx the parse tree
	 */
	exitSubqueryExpression?: (ctx: SubqueryExpressionContext) => void;
	/**
	 * Enter a parse tree produced by the `showInfo`
	 * labeled alternative in `esql_parser.showCommand`.
	 * @param ctx the parse tree
	 */
	enterShowInfo?: (ctx: ShowInfoContext) => void;
	/**
	 * Exit a parse tree produced by the `showInfo`
	 * labeled alternative in `esql_parser.showCommand`.
	 * @param ctx the parse tree
	 */
	exitShowInfo?: (ctx: ShowInfoContext) => void;
	/**
	 * Enter a parse tree produced by the `metaFunctions`
	 * labeled alternative in `esql_parser.metaCommand`.
	 * @param ctx the parse tree
	 */
	enterMetaFunctions?: (ctx: MetaFunctionsContext) => void;
	/**
	 * Exit a parse tree produced by the `metaFunctions`
	 * labeled alternative in `esql_parser.metaCommand`.
	 * @param ctx the parse tree
	 */
	exitMetaFunctions?: (ctx: MetaFunctionsContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.enrichCommand`.
	 * @param ctx the parse tree
	 */
	enterEnrichCommand?: (ctx: EnrichCommandContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.enrichCommand`.
	 * @param ctx the parse tree
	 */
	exitEnrichCommand?: (ctx: EnrichCommandContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.enrichWithClause`.
	 * @param ctx the parse tree
	 */
	enterEnrichWithClause?: (ctx: EnrichWithClauseContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.enrichWithClause`.
	 * @param ctx the parse tree
	 */
	exitEnrichWithClause?: (ctx: EnrichWithClauseContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.lookupCommand`.
	 * @param ctx the parse tree
	 */
	enterLookupCommand?: (ctx: LookupCommandContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.lookupCommand`.
	 * @param ctx the parse tree
	 */
	exitLookupCommand?: (ctx: LookupCommandContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.inlinestatsCommand`.
	 * @param ctx the parse tree
	 */
	enterInlinestatsCommand?: (ctx: InlinestatsCommandContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.inlinestatsCommand`.
	 * @param ctx the parse tree
	 */
	exitInlinestatsCommand?: (ctx: InlinestatsCommandContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.matchCommand`.
	 * @param ctx the parse tree
	 */
	enterMatchCommand?: (ctx: MatchCommandContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.matchCommand`.
	 * @param ctx the parse tree
	 */
	exitMatchCommand?: (ctx: MatchCommandContext) => void;
	/**
	 * Enter a parse tree produced by `esql_parser.matchQuery`.
	 * @param ctx the parse tree
	 */
	enterMatchQuery?: (ctx: MatchQueryContext) => void;
	/**
	 * Exit a parse tree produced by `esql_parser.matchQuery`.
	 * @param ctx the parse tree
	 */
	exitMatchQuery?: (ctx: MatchQueryContext) => void;
}

