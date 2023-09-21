/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  type ValueExpressionDefaultContext,
  type ComparisonContext,
  type NullLiteralContext,
  type QualifiedIntegerLiteralContext,
  type DecimalLiteralContext,
  type IntegerLiteralContext,
  type BooleanLiteralContext,
  type InputParamContext,
  type StringLiteralContext,
  type NumericArrayLiteralContext,
  type BooleanArrayLiteralContext,
  type StringArrayLiteralContext,
  type ShowInfoContext,
  type ShowFunctionsContext,
  type ConstantDefaultContext,
  type DereferenceContext,
  type ParenthesizedExpressionContext,
  type FunctionExpressionContext,
  type SingleCommandQueryContext,
  type CompositeQueryContext,
  type LogicalNotContext,
  type BooleanDefaultContext,
  type RegexExpressionContext,
  type LogicalBinaryContext,
  type LogicalInContext,
  type IsNullContext,
  type OperatorExpressionDefaultContext,
  type ArithmeticUnaryContext,
  type ArithmeticBinaryContext,
  type SingleStatementContext,
  type QueryContext,
  type SourceCommandContext,
  type ProcessingCommandContext,
  type WhereCommandContext,
  type BooleanExpressionContext,
  type RegexBooleanExpressionContext,
  type ValueExpressionContext,
  type OperatorExpressionContext,
  type PrimaryExpressionContext,
  type RowCommandContext,
  type FieldsContext,
  type FieldContext,
  type FromCommandContext,
  type MetadataContext,
  type EvalCommandContext,
  type StatsCommandContext,
  type GroupingContext,
  type SourceIdentifierContext,
  type QualifiedNameContext,
  type IdentifierContext,
  type ConstantContext,
  type LimitCommandContext,
  type SortCommandContext,
  type OrderExpressionContext,
  type KeepCommandContext,
  type DropCommandContext,
  type RenameCommandContext,
  type RenameClauseContext,
  type DissectCommandContext,
  type GrokCommandContext,
  type MvExpandCommandContext,
  type CommandOptionsContext,
  type CommandOptionContext,
  type BooleanValueContext,
  type NumericValueContext,
  type DecimalValueContext,
  type IntegerValueContext,
  type StringContext,
  type ComparisonOperatorContext,
  type ShowCommandContext,
  type EnrichCommandContext,
  type EnrichWithClauseContext,
} from '../../antlr/esql_parser';
import { esql_parserListener as ESQLParserListener } from '../../antlr/esql_parser_listener';
import {
  createError,
  createCommand,
  createLiteral,
  getPosition,
  getParentCommand,
  createColumn,
  createOption,
  createFunction,
  collectAllSourceIdentifiers,
  collectAllFieldsStatements,
} from './helpers';
import { ESQLAst, ESQLMessage } from './types';

export class AstListener implements ESQLParserListener {
  private ast: ESQLAst = [];
  private errors: ESQLMessage[] = [];

  public getAstAndErrors() {
    return { ast: this.ast, errors: this.errors };
  }

  /**
   * Enter a parse tree produced by the `valueExpressionDefault`
   * labeled alternative in `esql_parser.valueExpression`.
   * @param ctx the parse tree
   */
  enterValueExpressionDefault(ctx: ValueExpressionDefaultContext) {}
  /**
   * Exit a parse tree produced by the `valueExpressionDefault`
   * labeled alternative in `esql_parser.valueExpression`.
   * @param ctx the parse tree
   */
  exitValueExpressionDefault(ctx: ValueExpressionDefaultContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by the `comparison`
   * labeled alternative in `esql_parser.valueExpression`.
   * @param ctx the parse tree
   */
  enterComparison(ctx: ComparisonContext) {}
  /**
   * Exit a parse tree produced by the `comparison`
   * labeled alternative in `esql_parser.valueExpression`.
   * @param ctx the parse tree
   */
  exitComparison(ctx: ComparisonContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by the `nullLiteral`
   * labeled alternative in `esql_parser.constant`.
   * @param ctx the parse tree
   */
  enterNullLiteral(ctx: NullLiteralContext) {}
  /**
   * Exit a parse tree produced by the `nullLiteral`
   * labeled alternative in `esql_parser.constant`.
   * @param ctx the parse tree
   */
  exitNullLiteral(ctx: NullLiteralContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by the `qualifiedIntegerLiteral`
   * labeled alternative in `esql_parser.constant`.
   * @param ctx the parse tree
   */
  enterQualifiedIntegerLiteral(ctx: QualifiedIntegerLiteralContext) {}
  /**
   * Exit a parse tree produced by the `qualifiedIntegerLiteral`
   * labeled alternative in `esql_parser.constant`.
   * @param ctx the parse tree
   */
  exitQualifiedIntegerLiteral(ctx: QualifiedIntegerLiteralContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by the `decimalLiteral`
   * labeled alternative in `esql_parser.constant`.
   * @param ctx the parse tree
   */
  enterDecimalLiteral(ctx: DecimalLiteralContext) {}
  /**
   * Exit a parse tree produced by the `decimalLiteral`
   * labeled alternative in `esql_parser.constant`.
   * @param ctx the parse tree
   */
  exitDecimalLiteral(ctx: DecimalLiteralContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by the `integerLiteral`
   * labeled alternative in `esql_parser.constant`.
   * @param ctx the parse tree
   */
  enterIntegerLiteral(ctx: IntegerLiteralContext) {}
  /**
   * Exit a parse tree produced by the `integerLiteral`
   * labeled alternative in `esql_parser.constant`.
   * @param ctx the parse tree
   */
  exitIntegerLiteral(ctx: IntegerLiteralContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by the `booleanLiteral`
   * labeled alternative in `esql_parser.constant`.
   * @param ctx the parse tree
   */
  enterBooleanLiteral(ctx: BooleanLiteralContext) {}
  /**
   * Exit a parse tree produced by the `booleanLiteral`
   * labeled alternative in `esql_parser.constant`.
   * @param ctx the parse tree
   */
  exitBooleanLiteral(ctx: BooleanLiteralContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by the `inputParam`
   * labeled alternative in `esql_parser.constant`.
   * @param ctx the parse tree
   */
  enterInputParam(ctx: InputParamContext) {}
  /**
   * Exit a parse tree produced by the `inputParam`
   * labeled alternative in `esql_parser.constant`.
   * @param ctx the parse tree
   */
  exitInputParam(ctx: InputParamContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by the `stringLiteral`
   * labeled alternative in `esql_parser.constant`.
   * @param ctx the parse tree
   */
  enterStringLiteral(ctx: StringLiteralContext) {}
  /**
   * Exit a parse tree produced by the `stringLiteral`
   * labeled alternative in `esql_parser.constant`.
   * @param ctx the parse tree
   */
  exitStringLiteral(ctx: StringLiteralContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by the `numericArrayLiteral`
   * labeled alternative in `esql_parser.constant`.
   * @param ctx the parse tree
   */
  enterNumericArrayLiteral(ctx: NumericArrayLiteralContext) {}
  /**
   * Exit a parse tree produced by the `numericArrayLiteral`
   * labeled alternative in `esql_parser.constant`.
   * @param ctx the parse tree
   */
  exitNumericArrayLiteral(ctx: NumericArrayLiteralContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by the `booleanArrayLiteral`
   * labeled alternative in `esql_parser.constant`.
   * @param ctx the parse tree
   */
  enterBooleanArrayLiteral(ctx: BooleanArrayLiteralContext) {}
  /**
   * Exit a parse tree produced by the `booleanArrayLiteral`
   * labeled alternative in `esql_parser.constant`.
   * @param ctx the parse tree
   */
  exitBooleanArrayLiteral(ctx: BooleanArrayLiteralContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by the `stringArrayLiteral`
   * labeled alternative in `esql_parser.constant`.
   * @param ctx the parse tree
   */
  enterStringArrayLiteral(ctx: StringArrayLiteralContext) {}
  /**
   * Exit a parse tree produced by the `stringArrayLiteral`
   * labeled alternative in `esql_parser.constant`.
   * @param ctx the parse tree
   */
  exitStringArrayLiteral(ctx: StringArrayLiteralContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by the `showInfo`
   * labeled alternative in `esql_parser.showCommand`.
   * @param ctx the parse tree
   */
  enterShowInfo(ctx: ShowInfoContext) {}
  /**
   * Exit a parse tree produced by the `showInfo`
   * labeled alternative in `esql_parser.showCommand`.
   * @param ctx the parse tree
   */
  exitShowInfo(ctx: ShowInfoContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
    const commandAst = createCommand('show', ctx);

    this.ast.push(commandAst);
    // update the text
    commandAst.text = ctx.text;
    commandAst?.args.push(createFunction('info', ctx, getPosition(ctx.INFO().symbol)));
  }

  /**
   * Enter a parse tree produced by the `showFunctions`
   * labeled alternative in `esql_parser.showCommand`.
   * @param ctx the parse tree
   */
  enterShowFunctions(ctx: ShowFunctionsContext) {}
  /**
   * Exit a parse tree produced by the `showFunctions`
   * labeled alternative in `esql_parser.showCommand`.
   * @param ctx the parse tree
   */
  exitShowFunctions(ctx: ShowFunctionsContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }

    const commandAst = createCommand('show', ctx);
    this.ast.push(commandAst);
    // update the text
    commandAst.text = ctx.text;
    commandAst?.args.push(createFunction('functions', ctx, getPosition(ctx.FUNCTIONS().symbol)));
  }

  /**
   * Enter a parse tree produced by the `constantDefault`
   * labeled alternative in `esql_parser.primaryExpression`.
   * @param ctx the parse tree
   */
  enterConstantDefault(ctx: ConstantDefaultContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }
  /**
   * Exit a parse tree produced by the `constantDefault`
   * labeled alternative in `esql_parser.primaryExpression`.
   * @param ctx the parse tree
   */
  exitConstantDefault(ctx: ConstantDefaultContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by the `dereference`
   * labeled alternative in `esql_parser.primaryExpression`.
   * @param ctx the parse tree
   */
  enterDereference(ctx: DereferenceContext) {}
  /**
   * Exit a parse tree produced by the `dereference`
   * labeled alternative in `esql_parser.primaryExpression`.
   * @param ctx the parse tree
   */
  exitDereference(ctx: DereferenceContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by the `parenthesizedExpression`
   * labeled alternative in `esql_parser.primaryExpression`.
   * @param ctx the parse tree
   */
  enterParenthesizedExpression(ctx: ParenthesizedExpressionContext) {}
  /**
   * Exit a parse tree produced by the `parenthesizedExpression`
   * labeled alternative in `esql_parser.primaryExpression`.
   * @param ctx the parse tree
   */
  exitParenthesizedExpression(ctx: ParenthesizedExpressionContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by the `functionExpression`
   * labeled alternative in `esql_parser.primaryExpression`.
   * @param ctx the parse tree
   */
  enterFunctionExpression(ctx: FunctionExpressionContext) {}
  /**
   * Exit a parse tree produced by the `functionExpression`
   * labeled alternative in `esql_parser.primaryExpression`.
   * @param ctx the parse tree
   */
  exitFunctionExpression(ctx: FunctionExpressionContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by the `singleCommandQuery`
   * labeled alternative in `esql_parser.query`.
   * @param ctx the parse tree
   */
  enterSingleCommandQuery(ctx: SingleCommandQueryContext) {}
  /**
   * Exit a parse tree produced by the `singleCommandQuery`
   * labeled alternative in `esql_parser.query`.
   * @param ctx the parse tree
   */
  exitSingleCommandQuery(ctx: SingleCommandQueryContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by the `compositeQuery`
   * labeled alternative in `esql_parser.query`.
   * @param ctx the parse tree
   */
  enterCompositeQuery(ctx: CompositeQueryContext) {}
  /**
   * Exit a parse tree produced by the `compositeQuery`
   * labeled alternative in `esql_parser.query`.
   * @param ctx the parse tree
   */
  exitCompositeQuery(ctx: CompositeQueryContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by the `logicalNot`
   * labeled alternative in `esql_parser.booleanExpression`.
   * @param ctx the parse tree
   */
  enterLogicalNot(ctx: LogicalNotContext) {}
  /**
   * Exit a parse tree produced by the `logicalNot`
   * labeled alternative in `esql_parser.booleanExpression`.
   * @param ctx the parse tree
   */
  exitLogicalNot(ctx: LogicalNotContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by the `booleanDefault`
   * labeled alternative in `esql_parser.booleanExpression`.
   * @param ctx the parse tree
   */
  enterBooleanDefault(ctx: BooleanDefaultContext) {}
  /**
   * Exit a parse tree produced by the `booleanDefault`
   * labeled alternative in `esql_parser.booleanExpression`.
   * @param ctx the parse tree
   */
  exitBooleanDefault(ctx: BooleanDefaultContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by the `regexExpression`
   * labeled alternative in `esql_parser.booleanExpression`.
   * @param ctx the parse tree
   */
  enterRegexExpression(ctx: RegexExpressionContext) {}
  /**
   * Exit a parse tree produced by the `regexExpression`
   * labeled alternative in `esql_parser.booleanExpression`.
   * @param ctx the parse tree
   */
  exitRegexExpression(ctx: RegexExpressionContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by the `logicalBinary`
   * labeled alternative in `esql_parser.booleanExpression`.
   * @param ctx the parse tree
   */
  enterLogicalBinary(ctx: LogicalBinaryContext) {}
  /**
   * Exit a parse tree produced by the `logicalBinary`
   * labeled alternative in `esql_parser.booleanExpression`.
   * @param ctx the parse tree
   */
  exitLogicalBinary(ctx: LogicalBinaryContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by the `logicalIn`
   * labeled alternative in `esql_parser.booleanExpression`.
   * @param ctx the parse tree
   */
  enterLogicalIn(ctx: LogicalInContext) {}
  /**
   * Exit a parse tree produced by the `logicalIn`
   * labeled alternative in `esql_parser.booleanExpression`.
   * @param ctx the parse tree
   */
  exitLogicalIn(ctx: LogicalInContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by the `isNull`
   * labeled alternative in `esql_parser.booleanExpression`.
   * @param ctx the parse tree
   */
  enterIsNull(ctx: IsNullContext) {}
  /**
   * Exit a parse tree produced by the `isNull`
   * labeled alternative in `esql_parser.booleanExpression`.
   * @param ctx the parse tree
   */
  exitIsNull(ctx: IsNullContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by the `operatorExpressionDefault`
   * labeled alternative in `esql_parser.operatorExpression`.
   * @param ctx the parse tree
   */
  enterOperatorExpressionDefault(ctx: OperatorExpressionDefaultContext) {}
  /**
   * Exit a parse tree produced by the `operatorExpressionDefault`
   * labeled alternative in `esql_parser.operatorExpression`.
   * @param ctx the parse tree
   */
  exitOperatorExpressionDefault(ctx: OperatorExpressionDefaultContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by the `arithmeticUnary`
   * labeled alternative in `esql_parser.operatorExpression`.
   * @param ctx the parse tree
   */
  enterArithmeticUnary(ctx: ArithmeticUnaryContext) {}
  /**
   * Exit a parse tree produced by the `arithmeticUnary`
   * labeled alternative in `esql_parser.operatorExpression`.
   * @param ctx the parse tree
   */
  exitArithmeticUnary(ctx: ArithmeticUnaryContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by the `arithmeticBinary`
   * labeled alternative in `esql_parser.operatorExpression`.
   * @param ctx the parse tree
   */
  enterArithmeticBinary(ctx: ArithmeticBinaryContext) {}
  /**
   * Exit a parse tree produced by the `arithmeticBinary`
   * labeled alternative in `esql_parser.operatorExpression`.
   * @param ctx the parse tree
   */
  exitArithmeticBinary(ctx: ArithmeticBinaryContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.singleStatement`.
   * @param ctx the parse tree
   */
  enterSingleStatement(ctx: SingleStatementContext) {
    this.ast = [];
    this.errors = [];
  }
  /**
   * Exit a parse tree produced by `esql_parser.singleStatement`.
   * @param ctx the parse tree
   */
  exitSingleStatement(ctx: SingleStatementContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.query`.
   * @param ctx the parse tree
   */
  enterQuery(ctx: QueryContext) {}
  /**
   * Exit a parse tree produced by `esql_parser.query`.
   * @param ctx the parse tree
   */
  exitQuery(ctx: QueryContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.sourceCommand`.
   * @param ctx the parse tree
   */
  enterSourceCommand(ctx: SourceCommandContext) {}
  /**
   * Exit a parse tree produced by `esql_parser.sourceCommand`.
   * @param ctx the parse tree
   */
  exitSourceCommand(ctx: SourceCommandContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.processingCommand`.
   * @param ctx the parse tree
   */
  enterProcessingCommand(ctx: ProcessingCommandContext) {}
  /**
   * Exit a parse tree produced by `esql_parser.processingCommand`.
   * @param ctx the parse tree
   */
  exitProcessingCommand(ctx: ProcessingCommandContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.whereCommand`.
   * @param ctx the parse tree
   */
  enterWhereCommand(ctx: WhereCommandContext) {}
  /**
   * Exit a parse tree produced by `esql_parser.whereCommand`.
   * @param ctx the parse tree
   */
  exitWhereCommand(ctx: WhereCommandContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.booleanExpression`.
   * @param ctx the parse tree
   */
  enterBooleanExpression(ctx: BooleanExpressionContext) {}
  /**
   * Exit a parse tree produced by `esql_parser.booleanExpression`.
   * @param ctx the parse tree
   */
  exitBooleanExpression(ctx: BooleanExpressionContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.regexBooleanExpression`.
   * @param ctx the parse tree
   */
  enterRegexBooleanExpression(ctx: RegexBooleanExpressionContext) {}
  /**
   * Exit a parse tree produced by `esql_parser.regexBooleanExpression`.
   * @param ctx the parse tree
   */
  exitRegexBooleanExpression(ctx: RegexBooleanExpressionContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.valueExpression`.
   * @param ctx the parse tree
   */
  enterValueExpression(ctx: ValueExpressionContext) {}
  /**
   * Exit a parse tree produced by `esql_parser.valueExpression`.
   * @param ctx the parse tree
   */
  exitValueExpression(ctx: ValueExpressionContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.operatorExpression`.
   * @param ctx the parse tree
   */
  enterOperatorExpression(ctx: OperatorExpressionContext) {}
  /**
   * Exit a parse tree produced by `esql_parser.operatorExpression`.
   * @param ctx the parse tree
   */
  exitOperatorExpression(ctx: OperatorExpressionContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.primaryExpression`.
   * @param ctx the parse tree
   */
  enterPrimaryExpression(ctx: PrimaryExpressionContext) {}
  /**
   * Exit a parse tree produced by `esql_parser.primaryExpression`.
   * @param ctx the parse tree
   */
  exitPrimaryExpression(ctx: PrimaryExpressionContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.rowCommand`.
   * @param ctx the parse tree
   */
  enterRowCommand(ctx: RowCommandContext) {
    const command = createCommand('row', ctx);
    this.ast.push(command);
  }
  /**
   * Exit a parse tree produced by `esql_parser.rowCommand`.
   * @param ctx the parse tree
   */
  exitRowCommand(ctx: RowCommandContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.fields`.
   * @param ctx the parse tree
   */
  enterFields(ctx: FieldsContext) {}
  /**
   * Exit a parse tree produced by `esql_parser.fields`.
   * @param ctx the parse tree
   */
  exitFields(ctx: FieldsContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.field`.
   * @param ctx the parse tree
   */
  enterField(ctx: FieldContext) {}
  /**
   * Exit a parse tree produced by `esql_parser.field`.
   * @param ctx the parse tree
   */
  exitField(ctx: FieldContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
    const commandAst = getParentCommand(this.ast);
    switch (commandAst?.name) {
      case 'row':
        commandAst.args.push(createColumn(ctx));
      default:
        return;
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.fromCommand`.
   * @param ctx the parse tree
   */
  enterFromCommand(ctx: FromCommandContext) {
    const command = createCommand('from', ctx);
    this.ast.push(command);
  }
  /**
   * Exit a parse tree produced by `esql_parser.fromCommand`.
   * @param ctx the parse tree
   */
  exitFromCommand(ctx: FromCommandContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
    const commandAst = getParentCommand(this.ast)!;
    if (commandAst) {
      commandAst.text = ctx.text;
      commandAst.args.push(...collectAllSourceIdentifiers(ctx));
      const metadataContext = ctx.metadata();
      if (metadataContext) {
        const option = createOption(metadataContext.text.toLowerCase(), metadataContext);
        commandAst.args.push(option);
      }
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.metadata`.
   * @param ctx the parse tree
   */
  enterMetadata(ctx: MetadataContext) {}
  /**
   * Exit a parse tree produced by `esql_parser.metadata`.
   * @param ctx the parse tree
   */
  exitMetadata(ctx: MetadataContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.evalCommand`.
   * @param ctx the parse tree
   */
  enterEvalCommand(ctx: EvalCommandContext) {
    const command = createCommand('eval', ctx);
    this.ast.push(command);
  }
  /**
   * Exit a parse tree produced by `esql_parser.evalCommand`.
   * @param ctx the parse tree
   */
  exitEvalCommand(ctx: EvalCommandContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
    const commandAst = getParentCommand(this.ast)!;
    commandAst.args.push(...collectAllFieldsStatements(ctx.fields()));
  }

  /**
   * Enter a parse tree produced by `esql_parser.statsCommand`.
   * @param ctx the parse tree
   */
  enterStatsCommand(ctx: StatsCommandContext) {
    const command = createCommand('stats', ctx);
    this.ast.push(command);
  }
  /**
   * Exit a parse tree produced by `esql_parser.statsCommand`.
   * @param ctx the parse tree
   */
  exitStatsCommand(ctx: StatsCommandContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.grouping`.
   * @param ctx the parse tree
   */
  enterGrouping(ctx: GroupingContext) {}
  /**
   * Exit a parse tree produced by `esql_parser.grouping`.
   * @param ctx the parse tree
   */
  exitGrouping(ctx: GroupingContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.sourceIdentifier`.
   * @param ctx the parse tree
   */
  enterSourceIdentifier(ctx: SourceIdentifierContext) {}

  /**
   * Exit a parse tree produced by `esql_parser.sourceIdentifier`.
   * @param ctx the parse tree
   */
  exitSourceIdentifier(ctx: SourceIdentifierContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.qualifiedName`.
   * @param ctx the parse tree
   */
  enterQualifiedName(ctx: QualifiedNameContext) {}
  /**
   * Exit a parse tree produced by `esql_parser.qualifiedName`.
   * @param ctx the parse tree
   */
  exitQualifiedName(ctx: QualifiedNameContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.identifier`.
   * @param ctx the parse tree
   */
  enterIdentifier(ctx: IdentifierContext) {}
  /**
   * Exit a parse tree produced by `esql_parser.identifier`.
   * @param ctx the parse tree
   */
  exitIdentifier(ctx: IdentifierContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.constant`.
   * @param ctx the parse tree
   */
  enterConstant(ctx: ConstantContext) {}
  /**
   * Exit a parse tree produced by `esql_parser.constant`.
   * @param ctx the parse tree
   */
  exitConstant(ctx: ConstantContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.limitCommand`.
   * @param ctx the parse tree
   */
  enterLimitCommand(ctx: LimitCommandContext) {
    const command = createCommand('limit', ctx);
    this.ast.push(command);
  }
  /**
   * Exit a parse tree produced by `esql_parser.limitCommand`.
   * @param ctx the parse tree
   */
  exitLimitCommand(ctx: LimitCommandContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
    const commandAst = getParentCommand(this.ast)!;
    // refresh text
    commandAst.text = ctx.text;
    commandAst.args.push(createLiteral('number', ctx.INTEGER_LITERAL()));
  }

  /**
   * Enter a parse tree produced by `esql_parser.sortCommand`.
   * @param ctx the parse tree
   */
  enterSortCommand(ctx: SortCommandContext) {
    const command = createCommand('sort', ctx);
    this.ast.push(command);
  }
  /**
   * Exit a parse tree produced by `esql_parser.sortCommand`.
   * @param ctx the parse tree
   */
  exitSortCommand(ctx: SortCommandContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.orderExpression`.
   * @param ctx the parse tree
   */
  enterOrderExpression(ctx: OrderExpressionContext) {}
  /**
   * Exit a parse tree produced by `esql_parser.orderExpression`.
   * @param ctx the parse tree
   */
  exitOrderExpression(ctx: OrderExpressionContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.keepCommand`.
   * @param ctx the parse tree
   */
  enterKeepCommand(ctx: KeepCommandContext) {
    const command = createCommand('keep', ctx);
    this.ast.push(command);
  }
  /**
   * Exit a parse tree produced by `esql_parser.keepCommand`.
   * @param ctx the parse tree
   */
  exitKeepCommand(ctx: KeepCommandContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.dropCommand`.
   * @param ctx the parse tree
   */
  enterDropCommand(ctx: DropCommandContext) {
    const command = createCommand('drop', ctx);
    this.ast.push(command);
  }
  /**
   * Exit a parse tree produced by `esql_parser.dropCommand`.
   * @param ctx the parse tree
   */
  exitDropCommand(ctx: DropCommandContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.renameCommand`.
   * @param ctx the parse tree
   */
  enterRenameCommand(ctx: RenameCommandContext) {
    const command = createCommand('rename', ctx);
    this.ast.push(command);
  }
  /**
   * Exit a parse tree produced by `esql_parser.renameCommand`.
   * @param ctx the parse tree
   */
  exitRenameCommand(ctx: RenameCommandContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.renameClause`.
   * @param ctx the parse tree
   */
  enterRenameClause(ctx: RenameClauseContext) {}
  /**
   * Exit a parse tree produced by `esql_parser.renameClause`.
   * @param ctx the parse tree
   */
  exitRenameClause(ctx: RenameClauseContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.dissectCommand`.
   * @param ctx the parse tree
   */
  enterDissectCommand(ctx: DissectCommandContext) {
    const command = createCommand('dissect', ctx);
    this.ast.push(command);
  }
  /**
   * Exit a parse tree produced by `esql_parser.dissectCommand`.
   * @param ctx the parse tree
   */
  exitDissectCommand(ctx: DissectCommandContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.grokCommand`.
   * @param ctx the parse tree
   */
  enterGrokCommand(ctx: GrokCommandContext) {
    const command = createCommand('grok', ctx);
    this.ast.push(command);
  }
  /**
   * Exit a parse tree produced by `esql_parser.grokCommand`.
   * @param ctx the parse tree
   */
  exitGrokCommand(ctx: GrokCommandContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.mvExpandCommand`.
   * @param ctx the parse tree
   */
  enterMvExpandCommand(ctx: MvExpandCommandContext) {
    const command = createCommand('mvExpand', ctx);
    this.ast.push(command);
  }
  /**
   * Exit a parse tree produced by `esql_parser.mvExpandCommand`.
   * @param ctx the parse tree
   */
  exitMvExpandCommand(ctx: MvExpandCommandContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.commandOptions`.
   * @param ctx the parse tree
   */
  enterCommandOptions(ctx: CommandOptionsContext) {}
  /**
   * Exit a parse tree produced by `esql_parser.commandOptions`.
   * @param ctx the parse tree
   */
  exitCommandOptions(ctx: CommandOptionsContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.commandOption`.
   * @param ctx the parse tree
   */
  enterCommandOption(ctx: CommandOptionContext) {}
  /**
   * Exit a parse tree produced by `esql_parser.commandOption`.
   * @param ctx the parse tree
   */
  exitCommandOption(ctx: CommandOptionContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.booleanValue`.
   * @param ctx the parse tree
   */
  enterBooleanValue(ctx: BooleanValueContext) {}
  /**
   * Exit a parse tree produced by `esql_parser.booleanValue`.
   * @param ctx the parse tree
   */
  exitBooleanValue(ctx: BooleanValueContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.numericValue`.
   * @param ctx the parse tree
   */
  enterNumericValue(ctx: NumericValueContext) {}
  /**
   * Exit a parse tree produced by `esql_parser.numericValue`.
   * @param ctx the parse tree
   */
  exitNumericValue(ctx: NumericValueContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.decimalValue`.
   * @param ctx the parse tree
   */
  enterDecimalValue(ctx: DecimalValueContext) {}
  /**
   * Exit a parse tree produced by `esql_parser.decimalValue`.
   * @param ctx the parse tree
   */
  exitDecimalValue(ctx: DecimalValueContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.integerValue`.
   * @param ctx the parse tree
   */
  enterIntegerValue(ctx: IntegerValueContext) {}
  /**
   * Exit a parse tree produced by `esql_parser.integerValue`.
   * @param ctx the parse tree
   */
  exitIntegerValue(ctx: IntegerValueContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.string`.
   * @param ctx the parse tree
   */
  enterString(ctx: StringContext) {}
  /**
   * Exit a parse tree produced by `esql_parser.string`.
   * @param ctx the parse tree
   */
  exitString(ctx: StringContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.comparisonOperator`.
   * @param ctx the parse tree
   */
  enterComparisonOperator(ctx: ComparisonOperatorContext) {}
  /**
   * Exit a parse tree produced by `esql_parser.comparisonOperator`.
   * @param ctx the parse tree
   */
  exitComparisonOperator(ctx: ComparisonOperatorContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.showCommand`.
   * @param ctx the parse tree
   */
  enterShowCommand(ctx: ShowCommandContext) {
    const command = createCommand('show', ctx);
    this.ast.push(command);
  }
  /**
   * Exit a parse tree produced by `esql_parser.showCommand`.
   * @param ctx the parse tree
   */
  exitShowCommand(ctx: ShowCommandContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.enrichCommand`.
   * @param ctx the parse tree
   */
  enterEnrichCommand(ctx: EnrichCommandContext) {
    const command = createCommand('enrich', ctx);
    this.ast.push(command);
  }
  /**
   * Exit a parse tree produced by `esql_parser.enrichCommand`.
   * @param ctx the parse tree
   */
  exitEnrichCommand(ctx: EnrichCommandContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.enrichWithClause`.
   * @param ctx the parse tree
   */
  enterEnrichWithClause(ctx: EnrichWithClauseContext) {}
  /**
   * Exit a parse tree produced by `esql_parser.enrichWithClause`.
   * @param ctx the parse tree
   */
  exitEnrichWithClause(ctx: EnrichWithClauseContext) {
    if (ctx.exception) {
      this.errors.push(createError(ctx.exception));
    }
  }
}
