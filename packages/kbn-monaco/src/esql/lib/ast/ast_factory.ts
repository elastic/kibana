/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ParserRuleContext, RecognitionException, Token } from 'antlr4ts';
import {
  BooleanExpressionContext,
  BooleanValueContext,
  CommandOptionContext,
  CommandOptionsContext,
  ComparisonContext,
  ComparisonOperatorContext,
  CompositeQueryContext,
  ConstantContext,
  DecimalLiteralContext,
  DecimalValueContext,
  DissectCommandContext,
  DropCommandContext,
  EnrichCommandContext,
  EnrichFieldIdentifierContext,
  EnrichIdentifierContext,
  EnrichWithClauseContext,
  esql_parser,
  EvalCommandContext,
  ExplainCommandContext,
  FieldContext,
  FieldsContext,
  FromCommandContext,
  FunctionExpressionArgumentContext,
  FunctionIdentifierContext,
  GrokCommandContext,
  IdentifierContext,
  IntegerLiteralContext,
  IntegerValueContext,
  KeepCommandContext,
  LimitCommandContext,
  MathEvalFnContext,
  MathFnContext,
  MathFunctionExpressionArgumentContext,
  MathFunctionIdentifierContext,
  MetadataContext,
  MvExpandCommandContext,
  NumberContext,
  NumericValueContext,
  OperatorExpressionContext,
  OrderExpressionContext,
  PrimaryExpressionContext,
  ProcessingCommandContext,
  ProjectCommandContext,
  QualifiedNameContext,
  QualifiedNamesContext,
  QueryContext,
  RegexBooleanExpressionContext,
  RenameClauseContext,
  RenameCommandContext,
  RenameVariableContext,
  RowCommandContext,
  ShowCommandContext,
  SingleCommandQueryContext,
  SingleStatementContext,
  SortCommandContext,
  SourceCommandContext,
  SourceIdentifierContext,
  StatsCommandContext,
  StringContext,
  SubqueryExpressionContext,
  UserVariableContext,
  ValueExpressionContext,
  WhereBooleanExpressionContext,
  WhereCommandContext,
} from '../../antlr/esql_parser';
import { esql_parserListener as ESQLParserListener } from '../../antlr/esql_parser_listener';
import { ESQLAst, ESQLCommand, ESQLErrors } from '../autocomplete/types';

export function nonNullable<T>(v: T): v is NonNullable<T> {
  return v != null;
}

const symbolsLookup: Record<number, string> = Object.entries(esql_parser)
  .filter(([k, v]) => typeof v === 'number' && !/RULE_/.test(k) && k.toUpperCase() === k)
  .reduce((memo, [k, v]: [string, number]) => {
    memo[v] = k;
    return memo;
  }, {} as Record<number, string>);

function getPosition(token: Token | undefined) {
  if (!token || token.startIndex < 0) {
    return;
  }
  return {
    min: token.startIndex,
    max: token.stopIndex > -1 ? Math.max(token.stopIndex + 1, token.startIndex) : undefined,
  };
}

function getExpectedSymbols(expectedTokens: RecognitionException['expectedTokens']) {
  const tokenIds = expectedTokens?.toIntegerList().toArray() || [];
  const list = [];
  for (const tokenId of tokenIds) {
    if (symbolsLookup[tokenId]) {
      list.push(symbolsLookup[tokenId]);
    } else if (tokenId === -1) {
      list.push('<EOF>');
    }
  }
  return list;
}

export class AstListener implements ESQLParserListener {
  private ast: ESQLAst = [];
  private errors: ESQLErrors[] = [];

  public getAstAndErrors() {
    return { ast: this.ast, errors: this.errors };
  }

  private getParentCommand() {
    const node = this.ast[this.ast.length - 1];
    if (node.type === 'command') {
      return node;
    }
  }

  private createError(exception: RecognitionException) {
    const token = exception.getOffendingToken();
    const expectedSymbols = getExpectedSymbols(exception.expectedTokens);
    if (
      token &&
      ['ASTERISK', 'UNQUOTED_IDENTIFIER', 'QUOTED_IDENTIFIER'].every(
        (s, i) => expectedSymbols[i] === s
      )
    ) {
      return {
        type: 'error' as const,
        text: `Unknown column ${token.text}`,
        location: getPosition(token),
      };
    }
    return {
      type: 'error' as const,
      text: token
        ? `SyntaxError: expected {${getExpectedSymbols(exception.expectedTokens).join(
            ', '
          )}} but found "${token.text}"`
        : 'Unknown parsing error',
      location: getPosition(token),
    };
  }

  /** Source commands  **/

  private createSourceCommand(name: string, ctx: ParserRuleContext) {
    const node: ESQLCommand = {
      type: 'command' as const,
      name,
      text: ctx.text,
      args: [],
      location: getPosition(ctx.start),
    };
    return node;
  }

  /**
   * Enter a parse tree produced by `esql_parser.sourceCommand`.
   * @param ctx the parse tree
   */
  enterSourceCommand(ctx: SourceCommandContext) {
    this.ast = [];
  }
  /**
   * Exit a parse tree produced by `esql_parser.sourceCommand`.
   * @param ctx the parse tree
   */
  exitSourceCommand(ctx: SourceCommandContext) {
    // the command is incomplete
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.rowCommand`.
   * @param ctx the parse tree
   */
  enterRowCommand(ctx: RowCommandContext) {
    this.ast.push(this.createSourceCommand('row', ctx));
  }

  /**
   * Exit a parse tree produced by `esql_parser.rowCommand`.
   * @param ctx the parse tree
   */
  exitRowCommand(ctx: RowCommandContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.fromCommand`.
   * @param ctx the parse tree
   */
  enterFromCommand(ctx: FromCommandContext) {
    this.ast.push(this.createSourceCommand('from', ctx));
  }
  /**
   * Exit a parse tree produced by `esql_parser.fromCommand`.
   * @param ctx the parse tree
   */
  exitFromCommand(ctx: FromCommandContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.showCommand`.
   * @param ctx the parse tree
   */
  enterShowCommand(ctx: ShowCommandContext) {
    this.ast.push(this.createSourceCommand('show', ctx));
  }
  /**
   * Exit a parse tree produced by `esql_parser.showCommand`.
   * @param ctx the parse tree
   */
  exitShowCommand(ctx: ShowCommandContext) {
    const commandAst = this.getParentCommand();
    if (ctx.exception) {
      return this.errors.push(this.createError(ctx.exception));
    }
    // update the text
    if (commandAst) {
      commandAst.text = ctx.text;
      const infoToken = ctx.tryGetToken(esql_parser.INFO, 0);
      if (infoToken) {
        commandAst?.args.push({
          type: 'function',
          name: 'info',
          text: ctx.text,
          location: getPosition(infoToken?.symbol),
        });
      }
      const infoFunctions = ctx.tryGetToken(esql_parser.FUNCTIONS, 0);
      if (infoFunctions) {
        commandAst?.args.push({
          type: 'function',
          name: 'functions',
          text: ctx.text,
          location: getPosition(infoFunctions?.symbol),
        });
      }
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.sourceIdentifier`.
   * @param ctx the parse tree
   */
  //   enterSourceIdentifier(ctx: SourceIdentifierContext) {}
  /**
   * Exit a parse tree produced by `esql_parser.sourceIdentifier`.
   * @param ctx the parse tree
   */
  exitSourceIdentifier(ctx: SourceIdentifierContext) {
    const commandAst = this.getParentCommand();
    commandAst?.args.push({
      type: 'source',
      name: ctx.text,
      text: ctx.text,
      location: getPosition(ctx.start),
    });
  }

  /** Shared area */

  /**
   * Enter a parse tree produced by `esql_parser.fields`.
   * @param ctx the parse tree
   */
  //   enterFields?: (ctx: FieldsContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.fields`.
   * @param ctx the parse tree
   */
  exitFields(ctx: FieldsContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.field`.
   * @param ctx the parse tree
   */
  //   enterField?: (ctx: FieldContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.field`.
   * @param ctx the parse tree
   */
  exitField(ctx: FieldContext) {
    const commandAst = this.getParentCommand();
    if (commandAst?.name === 'row') {
      commandAst.args.push({
        type: 'column',
        name: ctx.text,
        text: ctx.text,
        location: getPosition(ctx.start),
      });
    }
  }

  /**
   * Enter a parse tree produced by the `decimalLiteral`
   * labeled alternative in `esql_parser.number`.
   * @param ctx the parse tree
   */
  //   enterDecimalLiteral?: (ctx: DecimalLiteralContext) => void;
  /**
   * Exit a parse tree produced by the `decimalLiteral`
   * labeled alternative in `esql_parser.number`.
   * @param ctx the parse tree
   */
  exitDecimalLiteral(ctx: DecimalLiteralContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by the `integerLiteral`
   * labeled alternative in `esql_parser.number`.
   * @param ctx the parse tree
   */
  //   enterIntegerLiteral?: (ctx: IntegerLiteralContext) => void;
  /**
   * Exit a parse tree produced by the `integerLiteral`
   * labeled alternative in `esql_parser.number`.
   * @param ctx the parse tree
   */
  exitIntegerLiteral(ctx: IntegerLiteralContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by the `singleCommandQuery`
   * labeled alternative in `esql_parser.query`.
   * @param ctx the parse tree
   */
  //   enterSingleCommandQuery?: (ctx: SingleCommandQueryContext) => void;
  /**
   * Exit a parse tree produced by the `singleCommandQuery`
   * labeled alternative in `esql_parser.query`.
   * @param ctx the parse tree
   */
  exitSingleCommandQuery(ctx: SingleCommandQueryContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by the `compositeQuery`
   * labeled alternative in `esql_parser.query`.
   * @param ctx the parse tree
   */
  //   enterCompositeQuery?: (ctx: CompositeQueryContext) => void;
  /**
   * Exit a parse tree produced by the `compositeQuery`
   * labeled alternative in `esql_parser.query`.
   * @param ctx the parse tree
   */
  exitCompositeQuery(ctx: CompositeQueryContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
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
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.query`.
   * @param ctx the parse tree
   */
  //   enterQuery?: (ctx: QueryContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.query`.
   * @param ctx the parse tree
   */
  exitQuery(ctx: QueryContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.processingCommand`.
   * @param ctx the parse tree
   */
  //   enterProcessingCommand?: (ctx: ProcessingCommandContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.processingCommand`.
   * @param ctx the parse tree
   */
  exitProcessingCommand(ctx: ProcessingCommandContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.enrichCommand`.
   * @param ctx the parse tree
   */
  //   enterEnrichCommand?: (ctx: EnrichCommandContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.enrichCommand`.
   * @param ctx the parse tree
   */
  exitEnrichCommand(ctx: EnrichCommandContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.enrichWithClause`.
   * @param ctx the parse tree
   */
  //   enterEnrichWithClause?: (ctx: EnrichWithClauseContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.enrichWithClause`.
   * @param ctx the parse tree
   */
  exitEnrichWithClause(ctx: EnrichWithClauseContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.mvExpandCommand`.
   * @param ctx the parse tree
   */
  //   enterMvExpandCommand?: (ctx: MvExpandCommandContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.mvExpandCommand`.
   * @param ctx the parse tree
   */
  exitMvExpandCommand(ctx: MvExpandCommandContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.whereCommand`.
   * @param ctx the parse tree
   */
  //   enterWhereCommand?: (ctx: WhereCommandContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.whereCommand`.
   * @param ctx the parse tree
   */
  exitWhereCommand(ctx: WhereCommandContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.whereBooleanExpression`.
   * @param ctx the parse tree
   */
  //   enterWhereBooleanExpression?: (ctx: WhereBooleanExpressionContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.whereBooleanExpression`.
   * @param ctx the parse tree
   */
  exitWhereBooleanExpression(ctx: WhereBooleanExpressionContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.booleanExpression`.
   * @param ctx the parse tree
   */
  //   enterBooleanExpression?: (ctx: BooleanExpressionContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.booleanExpression`.
   * @param ctx the parse tree
   */
  exitBooleanExpression(ctx: BooleanExpressionContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.regexBooleanExpression`.
   * @param ctx the parse tree
   */
  //   enterRegexBooleanExpression?: (ctx: RegexBooleanExpressionContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.regexBooleanExpression`.
   * @param ctx the parse tree
   */
  exitRegexBooleanExpression(ctx: RegexBooleanExpressionContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.valueExpression`.
   * @param ctx the parse tree
   */
  //   enterValueExpression?: (ctx: ValueExpressionContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.valueExpression`.
   * @param ctx the parse tree
   */
  exitValueExpression(ctx: ValueExpressionContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.comparison`.
   * @param ctx the parse tree
   */
  //   enterComparison?: (ctx: ComparisonContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.comparison`.
   * @param ctx the parse tree
   */
  exitComparison(ctx: ComparisonContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.mathFn`.
   * @param ctx the parse tree
   */
  //   enterMathFn?: (ctx: MathFnContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.mathFn`.
   * @param ctx the parse tree
   */
  exitMathFn(ctx: MathFnContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.mathEvalFn`.
   * @param ctx the parse tree
   */
  //   enterMathEvalFn?: (ctx: MathEvalFnContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.mathEvalFn`.
   * @param ctx the parse tree
   */
  exitMathEvalFn(ctx: MathEvalFnContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.operatorExpression`.
   * @param ctx the parse tree
   */
  //   enterOperatorExpression?: (ctx: OperatorExpressionContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.operatorExpression`.
   * @param ctx the parse tree
   */
  exitOperatorExpression(ctx: OperatorExpressionContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.primaryExpression`.
   * @param ctx the parse tree
   */
  //   enterPrimaryExpression?: (ctx: PrimaryExpressionContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.primaryExpression`.
   * @param ctx the parse tree
   */
  exitPrimaryExpression(ctx: PrimaryExpressionContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.enrichFieldIdentifier`.
   * @param ctx the parse tree
   */
  //   enterEnrichFieldIdentifier?: (ctx: EnrichFieldIdentifierContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.enrichFieldIdentifier`.
   * @param ctx the parse tree
   */
  exitEnrichFieldIdentifier(ctx: EnrichFieldIdentifierContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.userVariable`.
   * @param ctx the parse tree
   */
  //   enterUserVariable?: (ctx: UserVariableContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.userVariable`.
   * @param ctx the parse tree
   */
  exitUserVariable(ctx: UserVariableContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.metadata`.
   * @param ctx the parse tree
   */
  //   enterMetadata?: (ctx: MetadataContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.metadata`.
   * @param ctx the parse tree
   */
  exitMetadata(ctx: MetadataContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.evalCommand`.
   * @param ctx the parse tree
   */
  //   enterEvalCommand?: (ctx: EvalCommandContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.evalCommand`.
   * @param ctx the parse tree
   */
  exitEvalCommand(ctx: EvalCommandContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.statsCommand`.
   * @param ctx the parse tree
   */
  //   enterStatsCommand?: (ctx: StatsCommandContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.statsCommand`.
   * @param ctx the parse tree
   */
  exitStatsCommand(ctx: StatsCommandContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.enrichIdentifier`.
   * @param ctx the parse tree
   */
  //   enterEnrichIdentifier?: (ctx: EnrichIdentifierContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.enrichIdentifier`.
   * @param ctx the parse tree
   */
  exitEnrichIdentifier(ctx: EnrichIdentifierContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.functionExpressionArgument`.
   * @param ctx the parse tree
   */
  //   enterFunctionExpressionArgument?: (ctx: FunctionExpressionArgumentContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.functionExpressionArgument`.
   * @param ctx the parse tree
   */
  exitFunctionExpressionArgument(ctx: FunctionExpressionArgumentContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.mathFunctionExpressionArgument`.
   * @param ctx the parse tree
   */
  //   enterMathFunctionExpressionArgument?: (ctx: MathFunctionExpressionArgumentContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.mathFunctionExpressionArgument`.
   * @param ctx the parse tree
   */
  exitMathFunctionExpressionArgument(ctx: MathFunctionExpressionArgumentContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.qualifiedName`.
   * @param ctx the parse tree
   */
  //   enterQualifiedName?: (ctx: QualifiedNameContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.qualifiedName`.
   * @param ctx the parse tree
   */
  exitQualifiedName(ctx: QualifiedNameContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.qualifiedNames`.
   * @param ctx the parse tree
   */
  //   enterQualifiedNames?: (ctx: QualifiedNamesContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.qualifiedNames`.
   * @param ctx the parse tree
   */
  exitQualifiedNames(ctx: QualifiedNamesContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.identifier`.
   * @param ctx the parse tree
   */
  //   enterIdentifier?: (ctx: IdentifierContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.identifier`.
   * @param ctx the parse tree
   */
  exitIdentifier(ctx: IdentifierContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.mathFunctionIdentifier`.
   * @param ctx the parse tree
   */
  //   enterMathFunctionIdentifier?: (ctx: MathFunctionIdentifierContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.mathFunctionIdentifier`.
   * @param ctx the parse tree
   */
  exitMathFunctionIdentifier(ctx: MathFunctionIdentifierContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.functionIdentifier`.
   * @param ctx the parse tree
   */
  //   enterFunctionIdentifier?: (ctx: FunctionIdentifierContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.functionIdentifier`.
   * @param ctx the parse tree
   */
  exitFunctionIdentifier(ctx: FunctionIdentifierContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.constant`.
   * @param ctx the parse tree
   */
  //   enterConstant?: (ctx: ConstantContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.constant`.
   * @param ctx the parse tree
   */
  exitConstant(ctx: ConstantContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.numericValue`.
   * @param ctx the parse tree
   */
  //   enterNumericValue?: (ctx: NumericValueContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.numericValue`.
   * @param ctx the parse tree
   */
  exitNumericValue(ctx: NumericValueContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.limitCommand`.
   * @param ctx the parse tree
   */
  //   enterLimitCommand?: (ctx: LimitCommandContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.limitCommand`.
   * @param ctx the parse tree
   */
  exitLimitCommand(ctx: LimitCommandContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.sortCommand`.
   * @param ctx the parse tree
   */
  //   enterSortCommand?: (ctx: SortCommandContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.sortCommand`.
   * @param ctx the parse tree
   */
  exitSortCommand(ctx: SortCommandContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.orderExpression`.
   * @param ctx the parse tree
   */
  //   enterOrderExpression?: (ctx: OrderExpressionContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.orderExpression`.
   * @param ctx the parse tree
   */
  exitOrderExpression(ctx: OrderExpressionContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.projectCommand`.
   * @param ctx the parse tree
   */
  //   enterProjectCommand?: (ctx: ProjectCommandContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.projectCommand`.
   * @param ctx the parse tree
   */
  exitProjectCommand(ctx: ProjectCommandContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.keepCommand`.
   * @param ctx the parse tree
   */
  //   enterKeepCommand?: (ctx: KeepCommandContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.keepCommand`.
   * @param ctx the parse tree
   */
  exitKeepCommand(ctx: KeepCommandContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.dropCommand`.
   * @param ctx the parse tree
   */
  //   enterDropCommand?: (ctx: DropCommandContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.dropCommand`.
   * @param ctx the parse tree
   */
  exitDropCommand(ctx: DropCommandContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.renameVariable`.
   * @param ctx the parse tree
   */
  //   enterRenameVariable?: (ctx: RenameVariableContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.renameVariable`.
   * @param ctx the parse tree
   */
  exitRenameVariable(ctx: RenameVariableContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.renameCommand`.
   * @param ctx the parse tree
   */
  //   enterRenameCommand?: (ctx: RenameCommandContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.renameCommand`.
   * @param ctx the parse tree
   */
  exitRenameCommand(ctx: RenameCommandContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.renameClause`.
   * @param ctx the parse tree
   */
  //   enterRenameClause?: (ctx: RenameClauseContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.renameClause`.
   * @param ctx the parse tree
   */
  exitRenameClause(ctx: RenameClauseContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.dissectCommand`.
   * @param ctx the parse tree
   */
  //   enterDissectCommand?: (ctx: DissectCommandContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.dissectCommand`.
   * @param ctx the parse tree
   */
  exitDissectCommand(ctx: DissectCommandContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.grokCommand`.
   * @param ctx the parse tree
   */
  //   enterGrokCommand?: (ctx: GrokCommandContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.grokCommand`.
   * @param ctx the parse tree
   */
  exitGrokCommand(ctx: GrokCommandContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.commandOptions`.
   * @param ctx the parse tree
   */
  //   enterCommandOptions?: (ctx: CommandOptionsContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.commandOptions`.
   * @param ctx the parse tree
   */
  exitCommandOptions(ctx: CommandOptionsContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.commandOption`.
   * @param ctx the parse tree
   */
  //   enterCommandOption?: (ctx: CommandOptionContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.commandOption`.
   * @param ctx the parse tree
   */
  exitCommandOption(ctx: CommandOptionContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.booleanValue`.
   * @param ctx the parse tree
   */
  //   enterBooleanValue?: (ctx: BooleanValueContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.booleanValue`.
   * @param ctx the parse tree
   */
  exitBooleanValue(ctx: BooleanValueContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.number`.
   * @param ctx the parse tree
   */
  //   enterNumber?: (ctx: NumberContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.number`.
   * @param ctx the parse tree
   */
  exitNumber(ctx: NumberContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.decimalValue`.
   * @param ctx the parse tree
   */
  //   enterDecimalValue?: (ctx: DecimalValueContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.decimalValue`.
   * @param ctx the parse tree
   */
  exitDecimalValue(ctx: DecimalValueContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.integerValue`.
   * @param ctx the parse tree
   */
  //   enterIntegerValue?: (ctx: IntegerValueContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.integerValue`.
   * @param ctx the parse tree
   */
  exitIntegerValue(ctx: IntegerValueContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.string`.
   * @param ctx the parse tree
   */
  //   enterString?: (ctx: StringContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.string`.
   * @param ctx the parse tree
   */
  exitString(ctx: StringContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.comparisonOperator`.
   * @param ctx the parse tree
   */
  //   enterComparisonOperator?: (ctx: ComparisonOperatorContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.comparisonOperator`.
   * @param ctx the parse tree
   */
  exitComparisonOperator(ctx: ComparisonOperatorContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.explainCommand`.
   * @param ctx the parse tree
   */
  //   enterExplainCommand?: (ctx: ExplainCommandContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.explainCommand`.
   * @param ctx the parse tree
   */
  exitExplainCommand(ctx: ExplainCommandContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.subqueryExpression`.
   * @param ctx the parse tree
   */
  //   enterSubqueryExpression?: (ctx: SubqueryExpressionContext) => void;
  /**
   * Exit a parse tree produced by `esql_parser.subqueryExpression`.
   * @param ctx the parse tree
   */
  exitSubqueryExpression(ctx: SubqueryExpressionContext) {
    if (ctx.exception) {
      this.errors.push(this.createError(ctx.exception));
    }
  }
}
