// Generated from /Users/stratoulakalafateli/Documents/for_reviews/kibana/packages/kbn-monaco/src/esql/antlr/esql_parser.g4 by ANTLR 4.13.1
import org.antlr.v4.runtime.tree.ParseTreeListener;

/**
 * This interface defines a complete listener for a parse tree produced by
 * {@link esql_parser}.
 */
public interface esql_parserListener extends ParseTreeListener {
	/**
	 * Enter a parse tree produced by {@link esql_parser#singleStatement}.
	 * @param ctx the parse tree
	 */
	void enterSingleStatement(esql_parser.SingleStatementContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#singleStatement}.
	 * @param ctx the parse tree
	 */
	void exitSingleStatement(esql_parser.SingleStatementContext ctx);
	/**
	 * Enter a parse tree produced by the {@code compositeQuery}
	 * labeled alternative in {@link esql_parser#query}.
	 * @param ctx the parse tree
	 */
	void enterCompositeQuery(esql_parser.CompositeQueryContext ctx);
	/**
	 * Exit a parse tree produced by the {@code compositeQuery}
	 * labeled alternative in {@link esql_parser#query}.
	 * @param ctx the parse tree
	 */
	void exitCompositeQuery(esql_parser.CompositeQueryContext ctx);
	/**
	 * Enter a parse tree produced by the {@code singleCommandQuery}
	 * labeled alternative in {@link esql_parser#query}.
	 * @param ctx the parse tree
	 */
	void enterSingleCommandQuery(esql_parser.SingleCommandQueryContext ctx);
	/**
	 * Exit a parse tree produced by the {@code singleCommandQuery}
	 * labeled alternative in {@link esql_parser#query}.
	 * @param ctx the parse tree
	 */
	void exitSingleCommandQuery(esql_parser.SingleCommandQueryContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#sourceCommand}.
	 * @param ctx the parse tree
	 */
	void enterSourceCommand(esql_parser.SourceCommandContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#sourceCommand}.
	 * @param ctx the parse tree
	 */
	void exitSourceCommand(esql_parser.SourceCommandContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#processingCommand}.
	 * @param ctx the parse tree
	 */
	void enterProcessingCommand(esql_parser.ProcessingCommandContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#processingCommand}.
	 * @param ctx the parse tree
	 */
	void exitProcessingCommand(esql_parser.ProcessingCommandContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#whereCommand}.
	 * @param ctx the parse tree
	 */
	void enterWhereCommand(esql_parser.WhereCommandContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#whereCommand}.
	 * @param ctx the parse tree
	 */
	void exitWhereCommand(esql_parser.WhereCommandContext ctx);
	/**
	 * Enter a parse tree produced by the {@code logicalNot}
	 * labeled alternative in {@link esql_parser#booleanExpression}.
	 * @param ctx the parse tree
	 */
	void enterLogicalNot(esql_parser.LogicalNotContext ctx);
	/**
	 * Exit a parse tree produced by the {@code logicalNot}
	 * labeled alternative in {@link esql_parser#booleanExpression}.
	 * @param ctx the parse tree
	 */
	void exitLogicalNot(esql_parser.LogicalNotContext ctx);
	/**
	 * Enter a parse tree produced by the {@code booleanDefault}
	 * labeled alternative in {@link esql_parser#booleanExpression}.
	 * @param ctx the parse tree
	 */
	void enterBooleanDefault(esql_parser.BooleanDefaultContext ctx);
	/**
	 * Exit a parse tree produced by the {@code booleanDefault}
	 * labeled alternative in {@link esql_parser#booleanExpression}.
	 * @param ctx the parse tree
	 */
	void exitBooleanDefault(esql_parser.BooleanDefaultContext ctx);
	/**
	 * Enter a parse tree produced by the {@code isNull}
	 * labeled alternative in {@link esql_parser#booleanExpression}.
	 * @param ctx the parse tree
	 */
	void enterIsNull(esql_parser.IsNullContext ctx);
	/**
	 * Exit a parse tree produced by the {@code isNull}
	 * labeled alternative in {@link esql_parser#booleanExpression}.
	 * @param ctx the parse tree
	 */
	void exitIsNull(esql_parser.IsNullContext ctx);
	/**
	 * Enter a parse tree produced by the {@code regexExpression}
	 * labeled alternative in {@link esql_parser#booleanExpression}.
	 * @param ctx the parse tree
	 */
	void enterRegexExpression(esql_parser.RegexExpressionContext ctx);
	/**
	 * Exit a parse tree produced by the {@code regexExpression}
	 * labeled alternative in {@link esql_parser#booleanExpression}.
	 * @param ctx the parse tree
	 */
	void exitRegexExpression(esql_parser.RegexExpressionContext ctx);
	/**
	 * Enter a parse tree produced by the {@code logicalIn}
	 * labeled alternative in {@link esql_parser#booleanExpression}.
	 * @param ctx the parse tree
	 */
	void enterLogicalIn(esql_parser.LogicalInContext ctx);
	/**
	 * Exit a parse tree produced by the {@code logicalIn}
	 * labeled alternative in {@link esql_parser#booleanExpression}.
	 * @param ctx the parse tree
	 */
	void exitLogicalIn(esql_parser.LogicalInContext ctx);
	/**
	 * Enter a parse tree produced by the {@code logicalBinary}
	 * labeled alternative in {@link esql_parser#booleanExpression}.
	 * @param ctx the parse tree
	 */
	void enterLogicalBinary(esql_parser.LogicalBinaryContext ctx);
	/**
	 * Exit a parse tree produced by the {@code logicalBinary}
	 * labeled alternative in {@link esql_parser#booleanExpression}.
	 * @param ctx the parse tree
	 */
	void exitLogicalBinary(esql_parser.LogicalBinaryContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#regexBooleanExpression}.
	 * @param ctx the parse tree
	 */
	void enterRegexBooleanExpression(esql_parser.RegexBooleanExpressionContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#regexBooleanExpression}.
	 * @param ctx the parse tree
	 */
	void exitRegexBooleanExpression(esql_parser.RegexBooleanExpressionContext ctx);
	/**
	 * Enter a parse tree produced by the {@code valueExpressionDefault}
	 * labeled alternative in {@link esql_parser#valueExpression}.
	 * @param ctx the parse tree
	 */
	void enterValueExpressionDefault(esql_parser.ValueExpressionDefaultContext ctx);
	/**
	 * Exit a parse tree produced by the {@code valueExpressionDefault}
	 * labeled alternative in {@link esql_parser#valueExpression}.
	 * @param ctx the parse tree
	 */
	void exitValueExpressionDefault(esql_parser.ValueExpressionDefaultContext ctx);
	/**
	 * Enter a parse tree produced by the {@code comparison}
	 * labeled alternative in {@link esql_parser#valueExpression}.
	 * @param ctx the parse tree
	 */
	void enterComparison(esql_parser.ComparisonContext ctx);
	/**
	 * Exit a parse tree produced by the {@code comparison}
	 * labeled alternative in {@link esql_parser#valueExpression}.
	 * @param ctx the parse tree
	 */
	void exitComparison(esql_parser.ComparisonContext ctx);
	/**
	 * Enter a parse tree produced by the {@code operatorExpressionDefault}
	 * labeled alternative in {@link esql_parser#operatorExpression}.
	 * @param ctx the parse tree
	 */
	void enterOperatorExpressionDefault(esql_parser.OperatorExpressionDefaultContext ctx);
	/**
	 * Exit a parse tree produced by the {@code operatorExpressionDefault}
	 * labeled alternative in {@link esql_parser#operatorExpression}.
	 * @param ctx the parse tree
	 */
	void exitOperatorExpressionDefault(esql_parser.OperatorExpressionDefaultContext ctx);
	/**
	 * Enter a parse tree produced by the {@code arithmeticBinary}
	 * labeled alternative in {@link esql_parser#operatorExpression}.
	 * @param ctx the parse tree
	 */
	void enterArithmeticBinary(esql_parser.ArithmeticBinaryContext ctx);
	/**
	 * Exit a parse tree produced by the {@code arithmeticBinary}
	 * labeled alternative in {@link esql_parser#operatorExpression}.
	 * @param ctx the parse tree
	 */
	void exitArithmeticBinary(esql_parser.ArithmeticBinaryContext ctx);
	/**
	 * Enter a parse tree produced by the {@code arithmeticUnary}
	 * labeled alternative in {@link esql_parser#operatorExpression}.
	 * @param ctx the parse tree
	 */
	void enterArithmeticUnary(esql_parser.ArithmeticUnaryContext ctx);
	/**
	 * Exit a parse tree produced by the {@code arithmeticUnary}
	 * labeled alternative in {@link esql_parser#operatorExpression}.
	 * @param ctx the parse tree
	 */
	void exitArithmeticUnary(esql_parser.ArithmeticUnaryContext ctx);
	/**
	 * Enter a parse tree produced by the {@code constantDefault}
	 * labeled alternative in {@link esql_parser#primaryExpression}.
	 * @param ctx the parse tree
	 */
	void enterConstantDefault(esql_parser.ConstantDefaultContext ctx);
	/**
	 * Exit a parse tree produced by the {@code constantDefault}
	 * labeled alternative in {@link esql_parser#primaryExpression}.
	 * @param ctx the parse tree
	 */
	void exitConstantDefault(esql_parser.ConstantDefaultContext ctx);
	/**
	 * Enter a parse tree produced by the {@code dereference}
	 * labeled alternative in {@link esql_parser#primaryExpression}.
	 * @param ctx the parse tree
	 */
	void enterDereference(esql_parser.DereferenceContext ctx);
	/**
	 * Exit a parse tree produced by the {@code dereference}
	 * labeled alternative in {@link esql_parser#primaryExpression}.
	 * @param ctx the parse tree
	 */
	void exitDereference(esql_parser.DereferenceContext ctx);
	/**
	 * Enter a parse tree produced by the {@code function}
	 * labeled alternative in {@link esql_parser#primaryExpression}.
	 * @param ctx the parse tree
	 */
	void enterFunction(esql_parser.FunctionContext ctx);
	/**
	 * Exit a parse tree produced by the {@code function}
	 * labeled alternative in {@link esql_parser#primaryExpression}.
	 * @param ctx the parse tree
	 */
	void exitFunction(esql_parser.FunctionContext ctx);
	/**
	 * Enter a parse tree produced by the {@code parenthesizedExpression}
	 * labeled alternative in {@link esql_parser#primaryExpression}.
	 * @param ctx the parse tree
	 */
	void enterParenthesizedExpression(esql_parser.ParenthesizedExpressionContext ctx);
	/**
	 * Exit a parse tree produced by the {@code parenthesizedExpression}
	 * labeled alternative in {@link esql_parser#primaryExpression}.
	 * @param ctx the parse tree
	 */
	void exitParenthesizedExpression(esql_parser.ParenthesizedExpressionContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#functionExpression}.
	 * @param ctx the parse tree
	 */
	void enterFunctionExpression(esql_parser.FunctionExpressionContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#functionExpression}.
	 * @param ctx the parse tree
	 */
	void exitFunctionExpression(esql_parser.FunctionExpressionContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#rowCommand}.
	 * @param ctx the parse tree
	 */
	void enterRowCommand(esql_parser.RowCommandContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#rowCommand}.
	 * @param ctx the parse tree
	 */
	void exitRowCommand(esql_parser.RowCommandContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#fields}.
	 * @param ctx the parse tree
	 */
	void enterFields(esql_parser.FieldsContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#fields}.
	 * @param ctx the parse tree
	 */
	void exitFields(esql_parser.FieldsContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#field}.
	 * @param ctx the parse tree
	 */
	void enterField(esql_parser.FieldContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#field}.
	 * @param ctx the parse tree
	 */
	void exitField(esql_parser.FieldContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#fromCommand}.
	 * @param ctx the parse tree
	 */
	void enterFromCommand(esql_parser.FromCommandContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#fromCommand}.
	 * @param ctx the parse tree
	 */
	void exitFromCommand(esql_parser.FromCommandContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#metadata}.
	 * @param ctx the parse tree
	 */
	void enterMetadata(esql_parser.MetadataContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#metadata}.
	 * @param ctx the parse tree
	 */
	void exitMetadata(esql_parser.MetadataContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#evalCommand}.
	 * @param ctx the parse tree
	 */
	void enterEvalCommand(esql_parser.EvalCommandContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#evalCommand}.
	 * @param ctx the parse tree
	 */
	void exitEvalCommand(esql_parser.EvalCommandContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#statsCommand}.
	 * @param ctx the parse tree
	 */
	void enterStatsCommand(esql_parser.StatsCommandContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#statsCommand}.
	 * @param ctx the parse tree
	 */
	void exitStatsCommand(esql_parser.StatsCommandContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#inlinestatsCommand}.
	 * @param ctx the parse tree
	 */
	void enterInlinestatsCommand(esql_parser.InlinestatsCommandContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#inlinestatsCommand}.
	 * @param ctx the parse tree
	 */
	void exitInlinestatsCommand(esql_parser.InlinestatsCommandContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#grouping}.
	 * @param ctx the parse tree
	 */
	void enterGrouping(esql_parser.GroupingContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#grouping}.
	 * @param ctx the parse tree
	 */
	void exitGrouping(esql_parser.GroupingContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#fromIdentifier}.
	 * @param ctx the parse tree
	 */
	void enterFromIdentifier(esql_parser.FromIdentifierContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#fromIdentifier}.
	 * @param ctx the parse tree
	 */
	void exitFromIdentifier(esql_parser.FromIdentifierContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#qualifiedName}.
	 * @param ctx the parse tree
	 */
	void enterQualifiedName(esql_parser.QualifiedNameContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#qualifiedName}.
	 * @param ctx the parse tree
	 */
	void exitQualifiedName(esql_parser.QualifiedNameContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#qualifiedNamePattern}.
	 * @param ctx the parse tree
	 */
	void enterQualifiedNamePattern(esql_parser.QualifiedNamePatternContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#qualifiedNamePattern}.
	 * @param ctx the parse tree
	 */
	void exitQualifiedNamePattern(esql_parser.QualifiedNamePatternContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#identifier}.
	 * @param ctx the parse tree
	 */
	void enterIdentifier(esql_parser.IdentifierContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#identifier}.
	 * @param ctx the parse tree
	 */
	void exitIdentifier(esql_parser.IdentifierContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#identifierPattern}.
	 * @param ctx the parse tree
	 */
	void enterIdentifierPattern(esql_parser.IdentifierPatternContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#identifierPattern}.
	 * @param ctx the parse tree
	 */
	void exitIdentifierPattern(esql_parser.IdentifierPatternContext ctx);
	/**
	 * Enter a parse tree produced by the {@code nullLiteral}
	 * labeled alternative in {@link esql_parser#constant}.
	 * @param ctx the parse tree
	 */
	void enterNullLiteral(esql_parser.NullLiteralContext ctx);
	/**
	 * Exit a parse tree produced by the {@code nullLiteral}
	 * labeled alternative in {@link esql_parser#constant}.
	 * @param ctx the parse tree
	 */
	void exitNullLiteral(esql_parser.NullLiteralContext ctx);
	/**
	 * Enter a parse tree produced by the {@code qualifiedIntegerLiteral}
	 * labeled alternative in {@link esql_parser#constant}.
	 * @param ctx the parse tree
	 */
	void enterQualifiedIntegerLiteral(esql_parser.QualifiedIntegerLiteralContext ctx);
	/**
	 * Exit a parse tree produced by the {@code qualifiedIntegerLiteral}
	 * labeled alternative in {@link esql_parser#constant}.
	 * @param ctx the parse tree
	 */
	void exitQualifiedIntegerLiteral(esql_parser.QualifiedIntegerLiteralContext ctx);
	/**
	 * Enter a parse tree produced by the {@code decimalLiteral}
	 * labeled alternative in {@link esql_parser#constant}.
	 * @param ctx the parse tree
	 */
	void enterDecimalLiteral(esql_parser.DecimalLiteralContext ctx);
	/**
	 * Exit a parse tree produced by the {@code decimalLiteral}
	 * labeled alternative in {@link esql_parser#constant}.
	 * @param ctx the parse tree
	 */
	void exitDecimalLiteral(esql_parser.DecimalLiteralContext ctx);
	/**
	 * Enter a parse tree produced by the {@code integerLiteral}
	 * labeled alternative in {@link esql_parser#constant}.
	 * @param ctx the parse tree
	 */
	void enterIntegerLiteral(esql_parser.IntegerLiteralContext ctx);
	/**
	 * Exit a parse tree produced by the {@code integerLiteral}
	 * labeled alternative in {@link esql_parser#constant}.
	 * @param ctx the parse tree
	 */
	void exitIntegerLiteral(esql_parser.IntegerLiteralContext ctx);
	/**
	 * Enter a parse tree produced by the {@code booleanLiteral}
	 * labeled alternative in {@link esql_parser#constant}.
	 * @param ctx the parse tree
	 */
	void enterBooleanLiteral(esql_parser.BooleanLiteralContext ctx);
	/**
	 * Exit a parse tree produced by the {@code booleanLiteral}
	 * labeled alternative in {@link esql_parser#constant}.
	 * @param ctx the parse tree
	 */
	void exitBooleanLiteral(esql_parser.BooleanLiteralContext ctx);
	/**
	 * Enter a parse tree produced by the {@code inputParam}
	 * labeled alternative in {@link esql_parser#constant}.
	 * @param ctx the parse tree
	 */
	void enterInputParam(esql_parser.InputParamContext ctx);
	/**
	 * Exit a parse tree produced by the {@code inputParam}
	 * labeled alternative in {@link esql_parser#constant}.
	 * @param ctx the parse tree
	 */
	void exitInputParam(esql_parser.InputParamContext ctx);
	/**
	 * Enter a parse tree produced by the {@code stringLiteral}
	 * labeled alternative in {@link esql_parser#constant}.
	 * @param ctx the parse tree
	 */
	void enterStringLiteral(esql_parser.StringLiteralContext ctx);
	/**
	 * Exit a parse tree produced by the {@code stringLiteral}
	 * labeled alternative in {@link esql_parser#constant}.
	 * @param ctx the parse tree
	 */
	void exitStringLiteral(esql_parser.StringLiteralContext ctx);
	/**
	 * Enter a parse tree produced by the {@code numericArrayLiteral}
	 * labeled alternative in {@link esql_parser#constant}.
	 * @param ctx the parse tree
	 */
	void enterNumericArrayLiteral(esql_parser.NumericArrayLiteralContext ctx);
	/**
	 * Exit a parse tree produced by the {@code numericArrayLiteral}
	 * labeled alternative in {@link esql_parser#constant}.
	 * @param ctx the parse tree
	 */
	void exitNumericArrayLiteral(esql_parser.NumericArrayLiteralContext ctx);
	/**
	 * Enter a parse tree produced by the {@code booleanArrayLiteral}
	 * labeled alternative in {@link esql_parser#constant}.
	 * @param ctx the parse tree
	 */
	void enterBooleanArrayLiteral(esql_parser.BooleanArrayLiteralContext ctx);
	/**
	 * Exit a parse tree produced by the {@code booleanArrayLiteral}
	 * labeled alternative in {@link esql_parser#constant}.
	 * @param ctx the parse tree
	 */
	void exitBooleanArrayLiteral(esql_parser.BooleanArrayLiteralContext ctx);
	/**
	 * Enter a parse tree produced by the {@code stringArrayLiteral}
	 * labeled alternative in {@link esql_parser#constant}.
	 * @param ctx the parse tree
	 */
	void enterStringArrayLiteral(esql_parser.StringArrayLiteralContext ctx);
	/**
	 * Exit a parse tree produced by the {@code stringArrayLiteral}
	 * labeled alternative in {@link esql_parser#constant}.
	 * @param ctx the parse tree
	 */
	void exitStringArrayLiteral(esql_parser.StringArrayLiteralContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#limitCommand}.
	 * @param ctx the parse tree
	 */
	void enterLimitCommand(esql_parser.LimitCommandContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#limitCommand}.
	 * @param ctx the parse tree
	 */
	void exitLimitCommand(esql_parser.LimitCommandContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#sortCommand}.
	 * @param ctx the parse tree
	 */
	void enterSortCommand(esql_parser.SortCommandContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#sortCommand}.
	 * @param ctx the parse tree
	 */
	void exitSortCommand(esql_parser.SortCommandContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#orderExpression}.
	 * @param ctx the parse tree
	 */
	void enterOrderExpression(esql_parser.OrderExpressionContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#orderExpression}.
	 * @param ctx the parse tree
	 */
	void exitOrderExpression(esql_parser.OrderExpressionContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#keepCommand}.
	 * @param ctx the parse tree
	 */
	void enterKeepCommand(esql_parser.KeepCommandContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#keepCommand}.
	 * @param ctx the parse tree
	 */
	void exitKeepCommand(esql_parser.KeepCommandContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#dropCommand}.
	 * @param ctx the parse tree
	 */
	void enterDropCommand(esql_parser.DropCommandContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#dropCommand}.
	 * @param ctx the parse tree
	 */
	void exitDropCommand(esql_parser.DropCommandContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#renameCommand}.
	 * @param ctx the parse tree
	 */
	void enterRenameCommand(esql_parser.RenameCommandContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#renameCommand}.
	 * @param ctx the parse tree
	 */
	void exitRenameCommand(esql_parser.RenameCommandContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#renameClause}.
	 * @param ctx the parse tree
	 */
	void enterRenameClause(esql_parser.RenameClauseContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#renameClause}.
	 * @param ctx the parse tree
	 */
	void exitRenameClause(esql_parser.RenameClauseContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#dissectCommand}.
	 * @param ctx the parse tree
	 */
	void enterDissectCommand(esql_parser.DissectCommandContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#dissectCommand}.
	 * @param ctx the parse tree
	 */
	void exitDissectCommand(esql_parser.DissectCommandContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#grokCommand}.
	 * @param ctx the parse tree
	 */
	void enterGrokCommand(esql_parser.GrokCommandContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#grokCommand}.
	 * @param ctx the parse tree
	 */
	void exitGrokCommand(esql_parser.GrokCommandContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#mvExpandCommand}.
	 * @param ctx the parse tree
	 */
	void enterMvExpandCommand(esql_parser.MvExpandCommandContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#mvExpandCommand}.
	 * @param ctx the parse tree
	 */
	void exitMvExpandCommand(esql_parser.MvExpandCommandContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#commandOptions}.
	 * @param ctx the parse tree
	 */
	void enterCommandOptions(esql_parser.CommandOptionsContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#commandOptions}.
	 * @param ctx the parse tree
	 */
	void exitCommandOptions(esql_parser.CommandOptionsContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#commandOption}.
	 * @param ctx the parse tree
	 */
	void enterCommandOption(esql_parser.CommandOptionContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#commandOption}.
	 * @param ctx the parse tree
	 */
	void exitCommandOption(esql_parser.CommandOptionContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#booleanValue}.
	 * @param ctx the parse tree
	 */
	void enterBooleanValue(esql_parser.BooleanValueContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#booleanValue}.
	 * @param ctx the parse tree
	 */
	void exitBooleanValue(esql_parser.BooleanValueContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#numericValue}.
	 * @param ctx the parse tree
	 */
	void enterNumericValue(esql_parser.NumericValueContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#numericValue}.
	 * @param ctx the parse tree
	 */
	void exitNumericValue(esql_parser.NumericValueContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#decimalValue}.
	 * @param ctx the parse tree
	 */
	void enterDecimalValue(esql_parser.DecimalValueContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#decimalValue}.
	 * @param ctx the parse tree
	 */
	void exitDecimalValue(esql_parser.DecimalValueContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#integerValue}.
	 * @param ctx the parse tree
	 */
	void enterIntegerValue(esql_parser.IntegerValueContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#integerValue}.
	 * @param ctx the parse tree
	 */
	void exitIntegerValue(esql_parser.IntegerValueContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#string}.
	 * @param ctx the parse tree
	 */
	void enterString(esql_parser.StringContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#string}.
	 * @param ctx the parse tree
	 */
	void exitString(esql_parser.StringContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#comparisonOperator}.
	 * @param ctx the parse tree
	 */
	void enterComparisonOperator(esql_parser.ComparisonOperatorContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#comparisonOperator}.
	 * @param ctx the parse tree
	 */
	void exitComparisonOperator(esql_parser.ComparisonOperatorContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#explainCommand}.
	 * @param ctx the parse tree
	 */
	void enterExplainCommand(esql_parser.ExplainCommandContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#explainCommand}.
	 * @param ctx the parse tree
	 */
	void exitExplainCommand(esql_parser.ExplainCommandContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#subqueryExpression}.
	 * @param ctx the parse tree
	 */
	void enterSubqueryExpression(esql_parser.SubqueryExpressionContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#subqueryExpression}.
	 * @param ctx the parse tree
	 */
	void exitSubqueryExpression(esql_parser.SubqueryExpressionContext ctx);
	/**
	 * Enter a parse tree produced by the {@code showInfo}
	 * labeled alternative in {@link esql_parser#showCommand}.
	 * @param ctx the parse tree
	 */
	void enterShowInfo(esql_parser.ShowInfoContext ctx);
	/**
	 * Exit a parse tree produced by the {@code showInfo}
	 * labeled alternative in {@link esql_parser#showCommand}.
	 * @param ctx the parse tree
	 */
	void exitShowInfo(esql_parser.ShowInfoContext ctx);
	/**
	 * Enter a parse tree produced by the {@code showFunctions}
	 * labeled alternative in {@link esql_parser#showCommand}.
	 * @param ctx the parse tree
	 */
	void enterShowFunctions(esql_parser.ShowFunctionsContext ctx);
	/**
	 * Exit a parse tree produced by the {@code showFunctions}
	 * labeled alternative in {@link esql_parser#showCommand}.
	 * @param ctx the parse tree
	 */
	void exitShowFunctions(esql_parser.ShowFunctionsContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#enrichCommand}.
	 * @param ctx the parse tree
	 */
	void enterEnrichCommand(esql_parser.EnrichCommandContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#enrichCommand}.
	 * @param ctx the parse tree
	 */
	void exitEnrichCommand(esql_parser.EnrichCommandContext ctx);
	/**
	 * Enter a parse tree produced by {@link esql_parser#enrichWithClause}.
	 * @param ctx the parse tree
	 */
	void enterEnrichWithClause(esql_parser.EnrichWithClauseContext ctx);
	/**
	 * Exit a parse tree produced by {@link esql_parser#enrichWithClause}.
	 * @param ctx the parse tree
	 */
	void exitEnrichWithClause(esql_parser.EnrichWithClauseContext ctx);
}