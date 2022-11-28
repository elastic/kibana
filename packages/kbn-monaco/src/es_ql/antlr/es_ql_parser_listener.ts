// @ts-nocheck
// Generated from ./src/es_ql/antlr/es_ql_parser.g4 by ANTLR 4.7.3-SNAPSHOT


import { ParseTreeListener } from "antlr4ts/tree/ParseTreeListener";

import { ValueExpressionDefaultContext } from "./es_ql_parser";
import { ComparisonContext } from "./es_ql_parser";
import { NullLiteralContext } from "./es_ql_parser";
import { NumericLiteralContext } from "./es_ql_parser";
import { BooleanLiteralContext } from "./es_ql_parser";
import { StringLiteralContext } from "./es_ql_parser";
import { DecimalLiteralContext } from "./es_ql_parser";
import { IntegerLiteralContext } from "./es_ql_parser";
import { ConstantDefaultContext } from "./es_ql_parser";
import { DereferenceContext } from "./es_ql_parser";
import { ParenthesizedExpressionContext } from "./es_ql_parser";
import { FunctionExpressionContext } from "./es_ql_parser";
import { SingleCommandQueryContext } from "./es_ql_parser";
import { CompositeQueryContext } from "./es_ql_parser";
import { LogicalNotContext } from "./es_ql_parser";
import { BooleanDefaultContext } from "./es_ql_parser";
import { LogicalBinaryContext } from "./es_ql_parser";
import { OperatorExpressionDefaultContext } from "./es_ql_parser";
import { ArithmeticUnaryContext } from "./es_ql_parser";
import { ArithmeticBinaryContext } from "./es_ql_parser";
import { SingleStatementContext } from "./es_ql_parser";
import { QueryContext } from "./es_ql_parser";
import { SourceCommandContext } from "./es_ql_parser";
import { ProcessingCommandContext } from "./es_ql_parser";
import { WhereCommandContext } from "./es_ql_parser";
import { BooleanExpressionContext } from "./es_ql_parser";
import { ValueExpressionContext } from "./es_ql_parser";
import { OperatorExpressionContext } from "./es_ql_parser";
import { PrimaryExpressionContext } from "./es_ql_parser";
import { RowCommandContext } from "./es_ql_parser";
import { FieldsContext } from "./es_ql_parser";
import { FieldContext } from "./es_ql_parser";
import { FromCommandContext } from "./es_ql_parser";
import { EvalCommandContext } from "./es_ql_parser";
import { StatsCommandContext } from "./es_ql_parser";
import { SourceIdentifierContext } from "./es_ql_parser";
import { QualifiedNameContext } from "./es_ql_parser";
import { QualifiedNamesContext } from "./es_ql_parser";
import { IdentifierContext } from "./es_ql_parser";
import { ConstantContext } from "./es_ql_parser";
import { LimitCommandContext } from "./es_ql_parser";
import { SortCommandContext } from "./es_ql_parser";
import { OrderExpressionContext } from "./es_ql_parser";
import { ProjectCommandContext } from "./es_ql_parser";
import { ProjectClauseContext } from "./es_ql_parser";
import { BooleanValueContext } from "./es_ql_parser";
import { NumberContext } from "./es_ql_parser";
import { StringContext } from "./es_ql_parser";
import { ComparisonOperatorContext } from "./es_ql_parser";
import { ExplainCommandContext } from "./es_ql_parser";
import { SubqueryExpressionContext } from "./es_ql_parser";


/**
 * This interface defines a complete listener for a parse tree produced by
 * `es_ql_parser`.
 */
export interface es_ql_parserListener extends ParseTreeListener {
	/**
	 * Enter a parse tree produced by the `valueExpressionDefault`
	 * labeled alternative in `es_ql_parser.valueExpression`.
	 * @param ctx the parse tree
	 */
	enterValueExpressionDefault?: (ctx: ValueExpressionDefaultContext) => void;
	/**
	 * Exit a parse tree produced by the `valueExpressionDefault`
	 * labeled alternative in `es_ql_parser.valueExpression`.
	 * @param ctx the parse tree
	 */
	exitValueExpressionDefault?: (ctx: ValueExpressionDefaultContext) => void;

	/**
	 * Enter a parse tree produced by the `comparison`
	 * labeled alternative in `es_ql_parser.valueExpression`.
	 * @param ctx the parse tree
	 */
	enterComparison?: (ctx: ComparisonContext) => void;
	/**
	 * Exit a parse tree produced by the `comparison`
	 * labeled alternative in `es_ql_parser.valueExpression`.
	 * @param ctx the parse tree
	 */
	exitComparison?: (ctx: ComparisonContext) => void;

	/**
	 * Enter a parse tree produced by the `nullLiteral`
	 * labeled alternative in `es_ql_parser.constant`.
	 * @param ctx the parse tree
	 */
	enterNullLiteral?: (ctx: NullLiteralContext) => void;
	/**
	 * Exit a parse tree produced by the `nullLiteral`
	 * labeled alternative in `es_ql_parser.constant`.
	 * @param ctx the parse tree
	 */
	exitNullLiteral?: (ctx: NullLiteralContext) => void;

	/**
	 * Enter a parse tree produced by the `numericLiteral`
	 * labeled alternative in `es_ql_parser.constant`.
	 * @param ctx the parse tree
	 */
	enterNumericLiteral?: (ctx: NumericLiteralContext) => void;
	/**
	 * Exit a parse tree produced by the `numericLiteral`
	 * labeled alternative in `es_ql_parser.constant`.
	 * @param ctx the parse tree
	 */
	exitNumericLiteral?: (ctx: NumericLiteralContext) => void;

	/**
	 * Enter a parse tree produced by the `booleanLiteral`
	 * labeled alternative in `es_ql_parser.constant`.
	 * @param ctx the parse tree
	 */
	enterBooleanLiteral?: (ctx: BooleanLiteralContext) => void;
	/**
	 * Exit a parse tree produced by the `booleanLiteral`
	 * labeled alternative in `es_ql_parser.constant`.
	 * @param ctx the parse tree
	 */
	exitBooleanLiteral?: (ctx: BooleanLiteralContext) => void;

	/**
	 * Enter a parse tree produced by the `stringLiteral`
	 * labeled alternative in `es_ql_parser.constant`.
	 * @param ctx the parse tree
	 */
	enterStringLiteral?: (ctx: StringLiteralContext) => void;
	/**
	 * Exit a parse tree produced by the `stringLiteral`
	 * labeled alternative in `es_ql_parser.constant`.
	 * @param ctx the parse tree
	 */
	exitStringLiteral?: (ctx: StringLiteralContext) => void;

	/**
	 * Enter a parse tree produced by the `decimalLiteral`
	 * labeled alternative in `es_ql_parser.number`.
	 * @param ctx the parse tree
	 */
	enterDecimalLiteral?: (ctx: DecimalLiteralContext) => void;
	/**
	 * Exit a parse tree produced by the `decimalLiteral`
	 * labeled alternative in `es_ql_parser.number`.
	 * @param ctx the parse tree
	 */
	exitDecimalLiteral?: (ctx: DecimalLiteralContext) => void;

	/**
	 * Enter a parse tree produced by the `integerLiteral`
	 * labeled alternative in `es_ql_parser.number`.
	 * @param ctx the parse tree
	 */
	enterIntegerLiteral?: (ctx: IntegerLiteralContext) => void;
	/**
	 * Exit a parse tree produced by the `integerLiteral`
	 * labeled alternative in `es_ql_parser.number`.
	 * @param ctx the parse tree
	 */
	exitIntegerLiteral?: (ctx: IntegerLiteralContext) => void;

	/**
	 * Enter a parse tree produced by the `constantDefault`
	 * labeled alternative in `es_ql_parser.primaryExpression`.
	 * @param ctx the parse tree
	 */
	enterConstantDefault?: (ctx: ConstantDefaultContext) => void;
	/**
	 * Exit a parse tree produced by the `constantDefault`
	 * labeled alternative in `es_ql_parser.primaryExpression`.
	 * @param ctx the parse tree
	 */
	exitConstantDefault?: (ctx: ConstantDefaultContext) => void;

	/**
	 * Enter a parse tree produced by the `dereference`
	 * labeled alternative in `es_ql_parser.primaryExpression`.
	 * @param ctx the parse tree
	 */
	enterDereference?: (ctx: DereferenceContext) => void;
	/**
	 * Exit a parse tree produced by the `dereference`
	 * labeled alternative in `es_ql_parser.primaryExpression`.
	 * @param ctx the parse tree
	 */
	exitDereference?: (ctx: DereferenceContext) => void;

	/**
	 * Enter a parse tree produced by the `parenthesizedExpression`
	 * labeled alternative in `es_ql_parser.primaryExpression`.
	 * @param ctx the parse tree
	 */
	enterParenthesizedExpression?: (ctx: ParenthesizedExpressionContext) => void;
	/**
	 * Exit a parse tree produced by the `parenthesizedExpression`
	 * labeled alternative in `es_ql_parser.primaryExpression`.
	 * @param ctx the parse tree
	 */
	exitParenthesizedExpression?: (ctx: ParenthesizedExpressionContext) => void;

	/**
	 * Enter a parse tree produced by the `functionExpression`
	 * labeled alternative in `es_ql_parser.primaryExpression`.
	 * @param ctx the parse tree
	 */
	enterFunctionExpression?: (ctx: FunctionExpressionContext) => void;
	/**
	 * Exit a parse tree produced by the `functionExpression`
	 * labeled alternative in `es_ql_parser.primaryExpression`.
	 * @param ctx the parse tree
	 */
	exitFunctionExpression?: (ctx: FunctionExpressionContext) => void;

	/**
	 * Enter a parse tree produced by the `singleCommandQuery`
	 * labeled alternative in `es_ql_parser.query`.
	 * @param ctx the parse tree
	 */
	enterSingleCommandQuery?: (ctx: SingleCommandQueryContext) => void;
	/**
	 * Exit a parse tree produced by the `singleCommandQuery`
	 * labeled alternative in `es_ql_parser.query`.
	 * @param ctx the parse tree
	 */
	exitSingleCommandQuery?: (ctx: SingleCommandQueryContext) => void;

	/**
	 * Enter a parse tree produced by the `compositeQuery`
	 * labeled alternative in `es_ql_parser.query`.
	 * @param ctx the parse tree
	 */
	enterCompositeQuery?: (ctx: CompositeQueryContext) => void;
	/**
	 * Exit a parse tree produced by the `compositeQuery`
	 * labeled alternative in `es_ql_parser.query`.
	 * @param ctx the parse tree
	 */
	exitCompositeQuery?: (ctx: CompositeQueryContext) => void;

	/**
	 * Enter a parse tree produced by the `logicalNot`
	 * labeled alternative in `es_ql_parser.booleanExpression`.
	 * @param ctx the parse tree
	 */
	enterLogicalNot?: (ctx: LogicalNotContext) => void;
	/**
	 * Exit a parse tree produced by the `logicalNot`
	 * labeled alternative in `es_ql_parser.booleanExpression`.
	 * @param ctx the parse tree
	 */
	exitLogicalNot?: (ctx: LogicalNotContext) => void;

	/**
	 * Enter a parse tree produced by the `booleanDefault`
	 * labeled alternative in `es_ql_parser.booleanExpression`.
	 * @param ctx the parse tree
	 */
	enterBooleanDefault?: (ctx: BooleanDefaultContext) => void;
	/**
	 * Exit a parse tree produced by the `booleanDefault`
	 * labeled alternative in `es_ql_parser.booleanExpression`.
	 * @param ctx the parse tree
	 */
	exitBooleanDefault?: (ctx: BooleanDefaultContext) => void;

	/**
	 * Enter a parse tree produced by the `logicalBinary`
	 * labeled alternative in `es_ql_parser.booleanExpression`.
	 * @param ctx the parse tree
	 */
	enterLogicalBinary?: (ctx: LogicalBinaryContext) => void;
	/**
	 * Exit a parse tree produced by the `logicalBinary`
	 * labeled alternative in `es_ql_parser.booleanExpression`.
	 * @param ctx the parse tree
	 */
	exitLogicalBinary?: (ctx: LogicalBinaryContext) => void;

	/**
	 * Enter a parse tree produced by the `operatorExpressionDefault`
	 * labeled alternative in `es_ql_parser.operatorExpression`.
	 * @param ctx the parse tree
	 */
	enterOperatorExpressionDefault?: (ctx: OperatorExpressionDefaultContext) => void;
	/**
	 * Exit a parse tree produced by the `operatorExpressionDefault`
	 * labeled alternative in `es_ql_parser.operatorExpression`.
	 * @param ctx the parse tree
	 */
	exitOperatorExpressionDefault?: (ctx: OperatorExpressionDefaultContext) => void;

	/**
	 * Enter a parse tree produced by the `arithmeticUnary`
	 * labeled alternative in `es_ql_parser.operatorExpression`.
	 * @param ctx the parse tree
	 */
	enterArithmeticUnary?: (ctx: ArithmeticUnaryContext) => void;
	/**
	 * Exit a parse tree produced by the `arithmeticUnary`
	 * labeled alternative in `es_ql_parser.operatorExpression`.
	 * @param ctx the parse tree
	 */
	exitArithmeticUnary?: (ctx: ArithmeticUnaryContext) => void;

	/**
	 * Enter a parse tree produced by the `arithmeticBinary`
	 * labeled alternative in `es_ql_parser.operatorExpression`.
	 * @param ctx the parse tree
	 */
	enterArithmeticBinary?: (ctx: ArithmeticBinaryContext) => void;
	/**
	 * Exit a parse tree produced by the `arithmeticBinary`
	 * labeled alternative in `es_ql_parser.operatorExpression`.
	 * @param ctx the parse tree
	 */
	exitArithmeticBinary?: (ctx: ArithmeticBinaryContext) => void;

	/**
	 * Enter a parse tree produced by `es_ql_parser.singleStatement`.
	 * @param ctx the parse tree
	 */
	enterSingleStatement?: (ctx: SingleStatementContext) => void;
	/**
	 * Exit a parse tree produced by `es_ql_parser.singleStatement`.
	 * @param ctx the parse tree
	 */
	exitSingleStatement?: (ctx: SingleStatementContext) => void;

	/**
	 * Enter a parse tree produced by `es_ql_parser.query`.
	 * @param ctx the parse tree
	 */
	enterQuery?: (ctx: QueryContext) => void;
	/**
	 * Exit a parse tree produced by `es_ql_parser.query`.
	 * @param ctx the parse tree
	 */
	exitQuery?: (ctx: QueryContext) => void;

	/**
	 * Enter a parse tree produced by `es_ql_parser.sourceCommand`.
	 * @param ctx the parse tree
	 */
	enterSourceCommand?: (ctx: SourceCommandContext) => void;
	/**
	 * Exit a parse tree produced by `es_ql_parser.sourceCommand`.
	 * @param ctx the parse tree
	 */
	exitSourceCommand?: (ctx: SourceCommandContext) => void;

	/**
	 * Enter a parse tree produced by `es_ql_parser.processingCommand`.
	 * @param ctx the parse tree
	 */
	enterProcessingCommand?: (ctx: ProcessingCommandContext) => void;
	/**
	 * Exit a parse tree produced by `es_ql_parser.processingCommand`.
	 * @param ctx the parse tree
	 */
	exitProcessingCommand?: (ctx: ProcessingCommandContext) => void;

	/**
	 * Enter a parse tree produced by `es_ql_parser.whereCommand`.
	 * @param ctx the parse tree
	 */
	enterWhereCommand?: (ctx: WhereCommandContext) => void;
	/**
	 * Exit a parse tree produced by `es_ql_parser.whereCommand`.
	 * @param ctx the parse tree
	 */
	exitWhereCommand?: (ctx: WhereCommandContext) => void;

	/**
	 * Enter a parse tree produced by `es_ql_parser.booleanExpression`.
	 * @param ctx the parse tree
	 */
	enterBooleanExpression?: (ctx: BooleanExpressionContext) => void;
	/**
	 * Exit a parse tree produced by `es_ql_parser.booleanExpression`.
	 * @param ctx the parse tree
	 */
	exitBooleanExpression?: (ctx: BooleanExpressionContext) => void;

	/**
	 * Enter a parse tree produced by `es_ql_parser.valueExpression`.
	 * @param ctx the parse tree
	 */
	enterValueExpression?: (ctx: ValueExpressionContext) => void;
	/**
	 * Exit a parse tree produced by `es_ql_parser.valueExpression`.
	 * @param ctx the parse tree
	 */
	exitValueExpression?: (ctx: ValueExpressionContext) => void;

	/**
	 * Enter a parse tree produced by `es_ql_parser.operatorExpression`.
	 * @param ctx the parse tree
	 */
	enterOperatorExpression?: (ctx: OperatorExpressionContext) => void;
	/**
	 * Exit a parse tree produced by `es_ql_parser.operatorExpression`.
	 * @param ctx the parse tree
	 */
	exitOperatorExpression?: (ctx: OperatorExpressionContext) => void;

	/**
	 * Enter a parse tree produced by `es_ql_parser.primaryExpression`.
	 * @param ctx the parse tree
	 */
	enterPrimaryExpression?: (ctx: PrimaryExpressionContext) => void;
	/**
	 * Exit a parse tree produced by `es_ql_parser.primaryExpression`.
	 * @param ctx the parse tree
	 */
	exitPrimaryExpression?: (ctx: PrimaryExpressionContext) => void;

	/**
	 * Enter a parse tree produced by `es_ql_parser.rowCommand`.
	 * @param ctx the parse tree
	 */
	enterRowCommand?: (ctx: RowCommandContext) => void;
	/**
	 * Exit a parse tree produced by `es_ql_parser.rowCommand`.
	 * @param ctx the parse tree
	 */
	exitRowCommand?: (ctx: RowCommandContext) => void;

	/**
	 * Enter a parse tree produced by `es_ql_parser.fields`.
	 * @param ctx the parse tree
	 */
	enterFields?: (ctx: FieldsContext) => void;
	/**
	 * Exit a parse tree produced by `es_ql_parser.fields`.
	 * @param ctx the parse tree
	 */
	exitFields?: (ctx: FieldsContext) => void;

	/**
	 * Enter a parse tree produced by `es_ql_parser.field`.
	 * @param ctx the parse tree
	 */
	enterField?: (ctx: FieldContext) => void;
	/**
	 * Exit a parse tree produced by `es_ql_parser.field`.
	 * @param ctx the parse tree
	 */
	exitField?: (ctx: FieldContext) => void;

	/**
	 * Enter a parse tree produced by `es_ql_parser.fromCommand`.
	 * @param ctx the parse tree
	 */
	enterFromCommand?: (ctx: FromCommandContext) => void;
	/**
	 * Exit a parse tree produced by `es_ql_parser.fromCommand`.
	 * @param ctx the parse tree
	 */
	exitFromCommand?: (ctx: FromCommandContext) => void;

	/**
	 * Enter a parse tree produced by `es_ql_parser.evalCommand`.
	 * @param ctx the parse tree
	 */
	enterEvalCommand?: (ctx: EvalCommandContext) => void;
	/**
	 * Exit a parse tree produced by `es_ql_parser.evalCommand`.
	 * @param ctx the parse tree
	 */
	exitEvalCommand?: (ctx: EvalCommandContext) => void;

	/**
	 * Enter a parse tree produced by `es_ql_parser.statsCommand`.
	 * @param ctx the parse tree
	 */
	enterStatsCommand?: (ctx: StatsCommandContext) => void;
	/**
	 * Exit a parse tree produced by `es_ql_parser.statsCommand`.
	 * @param ctx the parse tree
	 */
	exitStatsCommand?: (ctx: StatsCommandContext) => void;

	/**
	 * Enter a parse tree produced by `es_ql_parser.sourceIdentifier`.
	 * @param ctx the parse tree
	 */
	enterSourceIdentifier?: (ctx: SourceIdentifierContext) => void;
	/**
	 * Exit a parse tree produced by `es_ql_parser.sourceIdentifier`.
	 * @param ctx the parse tree
	 */
	exitSourceIdentifier?: (ctx: SourceIdentifierContext) => void;

	/**
	 * Enter a parse tree produced by `es_ql_parser.qualifiedName`.
	 * @param ctx the parse tree
	 */
	enterQualifiedName?: (ctx: QualifiedNameContext) => void;
	/**
	 * Exit a parse tree produced by `es_ql_parser.qualifiedName`.
	 * @param ctx the parse tree
	 */
	exitQualifiedName?: (ctx: QualifiedNameContext) => void;

	/**
	 * Enter a parse tree produced by `es_ql_parser.qualifiedNames`.
	 * @param ctx the parse tree
	 */
	enterQualifiedNames?: (ctx: QualifiedNamesContext) => void;
	/**
	 * Exit a parse tree produced by `es_ql_parser.qualifiedNames`.
	 * @param ctx the parse tree
	 */
	exitQualifiedNames?: (ctx: QualifiedNamesContext) => void;

	/**
	 * Enter a parse tree produced by `es_ql_parser.identifier`.
	 * @param ctx the parse tree
	 */
	enterIdentifier?: (ctx: IdentifierContext) => void;
	/**
	 * Exit a parse tree produced by `es_ql_parser.identifier`.
	 * @param ctx the parse tree
	 */
	exitIdentifier?: (ctx: IdentifierContext) => void;

	/**
	 * Enter a parse tree produced by `es_ql_parser.constant`.
	 * @param ctx the parse tree
	 */
	enterConstant?: (ctx: ConstantContext) => void;
	/**
	 * Exit a parse tree produced by `es_ql_parser.constant`.
	 * @param ctx the parse tree
	 */
	exitConstant?: (ctx: ConstantContext) => void;

	/**
	 * Enter a parse tree produced by `es_ql_parser.limitCommand`.
	 * @param ctx the parse tree
	 */
	enterLimitCommand?: (ctx: LimitCommandContext) => void;
	/**
	 * Exit a parse tree produced by `es_ql_parser.limitCommand`.
	 * @param ctx the parse tree
	 */
	exitLimitCommand?: (ctx: LimitCommandContext) => void;

	/**
	 * Enter a parse tree produced by `es_ql_parser.sortCommand`.
	 * @param ctx the parse tree
	 */
	enterSortCommand?: (ctx: SortCommandContext) => void;
	/**
	 * Exit a parse tree produced by `es_ql_parser.sortCommand`.
	 * @param ctx the parse tree
	 */
	exitSortCommand?: (ctx: SortCommandContext) => void;

	/**
	 * Enter a parse tree produced by `es_ql_parser.orderExpression`.
	 * @param ctx the parse tree
	 */
	enterOrderExpression?: (ctx: OrderExpressionContext) => void;
	/**
	 * Exit a parse tree produced by `es_ql_parser.orderExpression`.
	 * @param ctx the parse tree
	 */
	exitOrderExpression?: (ctx: OrderExpressionContext) => void;

	/**
	 * Enter a parse tree produced by `es_ql_parser.projectCommand`.
	 * @param ctx the parse tree
	 */
	enterProjectCommand?: (ctx: ProjectCommandContext) => void;
	/**
	 * Exit a parse tree produced by `es_ql_parser.projectCommand`.
	 * @param ctx the parse tree
	 */
	exitProjectCommand?: (ctx: ProjectCommandContext) => void;

	/**
	 * Enter a parse tree produced by `es_ql_parser.projectClause`.
	 * @param ctx the parse tree
	 */
	enterProjectClause?: (ctx: ProjectClauseContext) => void;
	/**
	 * Exit a parse tree produced by `es_ql_parser.projectClause`.
	 * @param ctx the parse tree
	 */
	exitProjectClause?: (ctx: ProjectClauseContext) => void;

	/**
	 * Enter a parse tree produced by `es_ql_parser.booleanValue`.
	 * @param ctx the parse tree
	 */
	enterBooleanValue?: (ctx: BooleanValueContext) => void;
	/**
	 * Exit a parse tree produced by `es_ql_parser.booleanValue`.
	 * @param ctx the parse tree
	 */
	exitBooleanValue?: (ctx: BooleanValueContext) => void;

	/**
	 * Enter a parse tree produced by `es_ql_parser.number`.
	 * @param ctx the parse tree
	 */
	enterNumber?: (ctx: NumberContext) => void;
	/**
	 * Exit a parse tree produced by `es_ql_parser.number`.
	 * @param ctx the parse tree
	 */
	exitNumber?: (ctx: NumberContext) => void;

	/**
	 * Enter a parse tree produced by `es_ql_parser.string`.
	 * @param ctx the parse tree
	 */
	enterString?: (ctx: StringContext) => void;
	/**
	 * Exit a parse tree produced by `es_ql_parser.string`.
	 * @param ctx the parse tree
	 */
	exitString?: (ctx: StringContext) => void;

	/**
	 * Enter a parse tree produced by `es_ql_parser.comparisonOperator`.
	 * @param ctx the parse tree
	 */
	enterComparisonOperator?: (ctx: ComparisonOperatorContext) => void;
	/**
	 * Exit a parse tree produced by `es_ql_parser.comparisonOperator`.
	 * @param ctx the parse tree
	 */
	exitComparisonOperator?: (ctx: ComparisonOperatorContext) => void;

	/**
	 * Enter a parse tree produced by `es_ql_parser.explainCommand`.
	 * @param ctx the parse tree
	 */
	enterExplainCommand?: (ctx: ExplainCommandContext) => void;
	/**
	 * Exit a parse tree produced by `es_ql_parser.explainCommand`.
	 * @param ctx the parse tree
	 */
	exitExplainCommand?: (ctx: ExplainCommandContext) => void;

	/**
	 * Enter a parse tree produced by `es_ql_parser.subqueryExpression`.
	 * @param ctx the parse tree
	 */
	enterSubqueryExpression?: (ctx: SubqueryExpressionContext) => void;
	/**
	 * Exit a parse tree produced by `es_ql_parser.subqueryExpression`.
	 * @param ctx the parse tree
	 */
	exitSubqueryExpression?: (ctx: SubqueryExpressionContext) => void;
}

