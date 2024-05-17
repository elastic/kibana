// @ts-nocheck
// Generated from src/antlr/esql_parser.g4 by ANTLR 4.13.1
// noinspection ES6UnusedImports,JSUnusedGlobalSymbols,JSUnusedLocalSymbols

import {
  ATN,
  ATNDeserializer,
  BailErrorStrategy,
  DFA,
  DecisionState,
  FailedPredicateException,
  Interval,
  IntervalSet,
  NoViableAltException,
  Parser,
  ParserATNSimulator,
  ParserRuleContext,
  PredictionContextCache,
  PredictionMode,
  RecognitionException,
  RuleContext,
  RuleNode,
  TerminalNode,
  Token,
  TokenStream,
} from 'antlr4';
import esql_parserListener from './esql_parserListener.js';
// for running tests with parameters, TODO: discuss strategy for typed parameters in CI
// eslint-disable-next-line no-unused-vars
type int = number;

export default class esql_parser extends Parser {
  public static readonly DISSECT = 1;
  public static readonly DROP = 2;
  public static readonly ENRICH = 3;
  public static readonly EVAL = 4;
  public static readonly EXPLAIN = 5;
  public static readonly FROM = 6;
  public static readonly GROK = 7;
  public static readonly INLINESTATS = 8;
  public static readonly KEEP = 9;
  public static readonly LIMIT = 10;
  public static readonly META = 11;
  public static readonly MV_EXPAND = 12;
  public static readonly RENAME = 13;
  public static readonly ROW = 14;
  public static readonly SHOW = 15;
  public static readonly SORT = 16;
  public static readonly STATS = 17;
  public static readonly WHERE = 18;
  public static readonly UNKNOWN_CMD = 19;
  public static readonly LINE_COMMENT = 20;
  public static readonly MULTILINE_COMMENT = 21;
  public static readonly WS = 22;
  public static readonly EXPLAIN_WS = 23;
  public static readonly EXPLAIN_LINE_COMMENT = 24;
  public static readonly EXPLAIN_MULTILINE_COMMENT = 25;
  public static readonly PIPE = 26;
  public static readonly QUOTED_STRING = 27;
  public static readonly INTEGER_LITERAL = 28;
  public static readonly DECIMAL_LITERAL = 29;
  public static readonly BY = 30;
  public static readonly AND = 31;
  public static readonly ASC = 32;
  public static readonly ASSIGN = 33;
  public static readonly CAST_OP = 34;
  public static readonly COMMA = 35;
  public static readonly DESC = 36;
  public static readonly DOT = 37;
  public static readonly FALSE = 38;
  public static readonly FIRST = 39;
  public static readonly LAST = 40;
  public static readonly LP = 41;
  public static readonly IN = 42;
  public static readonly IS = 43;
  public static readonly LIKE = 44;
  public static readonly NOT = 45;
  public static readonly NULL = 46;
  public static readonly NULLS = 47;
  public static readonly OR = 48;
  public static readonly PARAM = 49;
  public static readonly RLIKE = 50;
  public static readonly RP = 51;
  public static readonly TRUE = 52;
  public static readonly EQ = 53;
  public static readonly CIEQ = 54;
  public static readonly NEQ = 55;
  public static readonly LT = 56;
  public static readonly LTE = 57;
  public static readonly GT = 58;
  public static readonly GTE = 59;
  public static readonly PLUS = 60;
  public static readonly MINUS = 61;
  public static readonly ASTERISK = 62;
  public static readonly SLASH = 63;
  public static readonly PERCENT = 64;
  public static readonly OPENING_BRACKET = 65;
  public static readonly CLOSING_BRACKET = 66;
  public static readonly UNQUOTED_IDENTIFIER = 67;
  public static readonly QUOTED_IDENTIFIER = 68;
  public static readonly EXPR_LINE_COMMENT = 69;
  public static readonly EXPR_MULTILINE_COMMENT = 70;
  public static readonly EXPR_WS = 71;
  public static readonly METADATA = 72;
  public static readonly FROM_UNQUOTED_IDENTIFIER = 73;
  public static readonly FROM_LINE_COMMENT = 74;
  public static readonly FROM_MULTILINE_COMMENT = 75;
  public static readonly FROM_WS = 76;
  public static readonly ID_PATTERN = 77;
  public static readonly PROJECT_LINE_COMMENT = 78;
  public static readonly PROJECT_MULTILINE_COMMENT = 79;
  public static readonly PROJECT_WS = 80;
  public static readonly AS = 81;
  public static readonly RENAME_LINE_COMMENT = 82;
  public static readonly RENAME_MULTILINE_COMMENT = 83;
  public static readonly RENAME_WS = 84;
  public static readonly ON = 85;
  public static readonly WITH = 86;
  public static readonly ENRICH_POLICY_NAME = 87;
  public static readonly ENRICH_LINE_COMMENT = 88;
  public static readonly ENRICH_MULTILINE_COMMENT = 89;
  public static readonly ENRICH_WS = 90;
  public static readonly ENRICH_FIELD_LINE_COMMENT = 91;
  public static readonly ENRICH_FIELD_MULTILINE_COMMENT = 92;
  public static readonly ENRICH_FIELD_WS = 93;
  public static readonly MVEXPAND_LINE_COMMENT = 94;
  public static readonly MVEXPAND_MULTILINE_COMMENT = 95;
  public static readonly MVEXPAND_WS = 96;
  public static readonly INFO = 97;
  public static readonly SHOW_LINE_COMMENT = 98;
  public static readonly SHOW_MULTILINE_COMMENT = 99;
  public static readonly SHOW_WS = 100;
  public static readonly FUNCTIONS = 101;
  public static readonly META_LINE_COMMENT = 102;
  public static readonly META_MULTILINE_COMMENT = 103;
  public static readonly META_WS = 104;
  public static readonly COLON = 105;
  public static readonly SETTING = 106;
  public static readonly SETTING_LINE_COMMENT = 107;
  public static readonly SETTTING_MULTILINE_COMMENT = 108;
  public static readonly SETTING_WS = 109;
  public static readonly EOF = Token.EOF;
  public static readonly RULE_singleStatement = 0;
  public static readonly RULE_query = 1;
  public static readonly RULE_sourceCommand = 2;
  public static readonly RULE_processingCommand = 3;
  public static readonly RULE_whereCommand = 4;
  public static readonly RULE_booleanExpression = 5;
  public static readonly RULE_regexBooleanExpression = 6;
  public static readonly RULE_valueExpression = 7;
  public static readonly RULE_operatorExpression = 8;
  public static readonly RULE_primaryExpression = 9;
  public static readonly RULE_functionExpression = 10;
  public static readonly RULE_dataType = 11;
  public static readonly RULE_rowCommand = 12;
  public static readonly RULE_fields = 13;
  public static readonly RULE_field = 14;
  public static readonly RULE_fromCommand = 15;
  public static readonly RULE_fromIdentifier = 16;
  public static readonly RULE_metadata = 17;
  public static readonly RULE_metadataOption = 18;
  public static readonly RULE_deprecated_metadata = 19;
  public static readonly RULE_evalCommand = 20;
  public static readonly RULE_statsCommand = 21;
  public static readonly RULE_inlinestatsCommand = 22;
  public static readonly RULE_qualifiedName = 23;
  public static readonly RULE_qualifiedNamePattern = 24;
  public static readonly RULE_identifier = 25;
  public static readonly RULE_identifierPattern = 26;
  public static readonly RULE_constant = 27;
  public static readonly RULE_limitCommand = 28;
  public static readonly RULE_sortCommand = 29;
  public static readonly RULE_orderExpression = 30;
  public static readonly RULE_keepCommand = 31;
  public static readonly RULE_dropCommand = 32;
  public static readonly RULE_renameCommand = 33;
  public static readonly RULE_renameClause = 34;
  public static readonly RULE_dissectCommand = 35;
  public static readonly RULE_grokCommand = 36;
  public static readonly RULE_mvExpandCommand = 37;
  public static readonly RULE_commandOptions = 38;
  public static readonly RULE_commandOption = 39;
  public static readonly RULE_booleanValue = 40;
  public static readonly RULE_numericValue = 41;
  public static readonly RULE_decimalValue = 42;
  public static readonly RULE_integerValue = 43;
  public static readonly RULE_string = 44;
  public static readonly RULE_comparisonOperator = 45;
  public static readonly RULE_explainCommand = 46;
  public static readonly RULE_subqueryExpression = 47;
  public static readonly RULE_showCommand = 48;
  public static readonly RULE_metaCommand = 49;
  public static readonly RULE_enrichCommand = 50;
  public static readonly RULE_enrichWithClause = 51;
  public static readonly literalNames: (string | null)[] = [
    null,
    "'dissect'",
    "'drop'",
    "'enrich'",
    "'eval'",
    "'explain'",
    "'from'",
    "'grok'",
    "'inlinestats'",
    "'keep'",
    "'limit'",
    "'meta'",
    "'mv_expand'",
    "'rename'",
    "'row'",
    "'show'",
    "'sort'",
    "'stats'",
    "'where'",
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    "'|'",
    null,
    null,
    null,
    "'by'",
    "'and'",
    "'asc'",
    "'='",
    "'::'",
    "','",
    "'desc'",
    "'.'",
    "'false'",
    "'first'",
    "'last'",
    "'('",
    "'in'",
    "'is'",
    "'like'",
    "'not'",
    "'null'",
    "'nulls'",
    "'or'",
    "'?'",
    "'rlike'",
    "')'",
    "'true'",
    "'=='",
    "'=~'",
    "'!='",
    "'<'",
    "'<='",
    "'>'",
    "'>='",
    "'+'",
    "'-'",
    "'*'",
    "'/'",
    "'%'",
    null,
    "']'",
    null,
    null,
    null,
    null,
    null,
    "'metadata'",
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    "'as'",
    null,
    null,
    null,
    "'on'",
    "'with'",
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    "'info'",
    null,
    null,
    null,
    "'functions'",
    null,
    null,
    null,
    "':'",
  ];
  public static readonly symbolicNames: (string | null)[] = [
    null,
    'DISSECT',
    'DROP',
    'ENRICH',
    'EVAL',
    'EXPLAIN',
    'FROM',
    'GROK',
    'INLINESTATS',
    'KEEP',
    'LIMIT',
    'META',
    'MV_EXPAND',
    'RENAME',
    'ROW',
    'SHOW',
    'SORT',
    'STATS',
    'WHERE',
    'UNKNOWN_CMD',
    'LINE_COMMENT',
    'MULTILINE_COMMENT',
    'WS',
    'EXPLAIN_WS',
    'EXPLAIN_LINE_COMMENT',
    'EXPLAIN_MULTILINE_COMMENT',
    'PIPE',
    'QUOTED_STRING',
    'INTEGER_LITERAL',
    'DECIMAL_LITERAL',
    'BY',
    'AND',
    'ASC',
    'ASSIGN',
    'CAST_OP',
    'COMMA',
    'DESC',
    'DOT',
    'FALSE',
    'FIRST',
    'LAST',
    'LP',
    'IN',
    'IS',
    'LIKE',
    'NOT',
    'NULL',
    'NULLS',
    'OR',
    'PARAM',
    'RLIKE',
    'RP',
    'TRUE',
    'EQ',
    'CIEQ',
    'NEQ',
    'LT',
    'LTE',
    'GT',
    'GTE',
    'PLUS',
    'MINUS',
    'ASTERISK',
    'SLASH',
    'PERCENT',
    'OPENING_BRACKET',
    'CLOSING_BRACKET',
    'UNQUOTED_IDENTIFIER',
    'QUOTED_IDENTIFIER',
    'EXPR_LINE_COMMENT',
    'EXPR_MULTILINE_COMMENT',
    'EXPR_WS',
    'METADATA',
    'FROM_UNQUOTED_IDENTIFIER',
    'FROM_LINE_COMMENT',
    'FROM_MULTILINE_COMMENT',
    'FROM_WS',
    'ID_PATTERN',
    'PROJECT_LINE_COMMENT',
    'PROJECT_MULTILINE_COMMENT',
    'PROJECT_WS',
    'AS',
    'RENAME_LINE_COMMENT',
    'RENAME_MULTILINE_COMMENT',
    'RENAME_WS',
    'ON',
    'WITH',
    'ENRICH_POLICY_NAME',
    'ENRICH_LINE_COMMENT',
    'ENRICH_MULTILINE_COMMENT',
    'ENRICH_WS',
    'ENRICH_FIELD_LINE_COMMENT',
    'ENRICH_FIELD_MULTILINE_COMMENT',
    'ENRICH_FIELD_WS',
    'MVEXPAND_LINE_COMMENT',
    'MVEXPAND_MULTILINE_COMMENT',
    'MVEXPAND_WS',
    'INFO',
    'SHOW_LINE_COMMENT',
    'SHOW_MULTILINE_COMMENT',
    'SHOW_WS',
    'FUNCTIONS',
    'META_LINE_COMMENT',
    'META_MULTILINE_COMMENT',
    'META_WS',
    'COLON',
    'SETTING',
    'SETTING_LINE_COMMENT',
    'SETTTING_MULTILINE_COMMENT',
    'SETTING_WS',
  ];
  // tslint:disable:no-trailing-whitespace
  public static readonly ruleNames: string[] = [
    'singleStatement',
    'query',
    'sourceCommand',
    'processingCommand',
    'whereCommand',
    'booleanExpression',
    'regexBooleanExpression',
    'valueExpression',
    'operatorExpression',
    'primaryExpression',
    'functionExpression',
    'dataType',
    'rowCommand',
    'fields',
    'field',
    'fromCommand',
    'fromIdentifier',
    'metadata',
    'metadataOption',
    'deprecated_metadata',
    'evalCommand',
    'statsCommand',
    'inlinestatsCommand',
    'qualifiedName',
    'qualifiedNamePattern',
    'identifier',
    'identifierPattern',
    'constant',
    'limitCommand',
    'sortCommand',
    'orderExpression',
    'keepCommand',
    'dropCommand',
    'renameCommand',
    'renameClause',
    'dissectCommand',
    'grokCommand',
    'mvExpandCommand',
    'commandOptions',
    'commandOption',
    'booleanValue',
    'numericValue',
    'decimalValue',
    'integerValue',
    'string',
    'comparisonOperator',
    'explainCommand',
    'subqueryExpression',
    'showCommand',
    'metaCommand',
    'enrichCommand',
    'enrichWithClause',
  ];
  public get grammarFileName(): string {
    return 'esql_parser.g4';
  }
  public get literalNames(): (string | null)[] {
    return esql_parser.literalNames;
  }
  public get symbolicNames(): (string | null)[] {
    return esql_parser.symbolicNames;
  }
  public get ruleNames(): string[] {
    return esql_parser.ruleNames;
  }
  public get serializedATN(): number[] {
    return esql_parser._serializedATN;
  }

  protected createFailedPredicateException(
    predicate?: string,
    message?: string
  ): FailedPredicateException {
    return new FailedPredicateException(this, predicate, message);
  }

  constructor(input: TokenStream) {
    super(input);
    this._interp = new ParserATNSimulator(
      this,
      esql_parser._ATN,
      esql_parser.DecisionsToDFA,
      new PredictionContextCache()
    );
  }
  // @RuleVersion(0)
  public singleStatement(): SingleStatementContext {
    let localctx: SingleStatementContext = new SingleStatementContext(this, this._ctx, this.state);
    this.enterRule(localctx, 0, esql_parser.RULE_singleStatement);
    try {
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 104;
        this.query(0);
        this.state = 105;
        this.match(esql_parser.EOF);
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }

  public query(): QueryContext;
  public query(_p: number): QueryContext;
  // @RuleVersion(0)
  public query(_p?: number): QueryContext {
    if (_p === undefined) {
      _p = 0;
    }

    let _parentctx: ParserRuleContext = this._ctx;
    let _parentState: number = this.state;
    let localctx: QueryContext = new QueryContext(this, this._ctx, _parentState);
    let _prevctx: QueryContext = localctx;
    let _startState: number = 2;
    this.enterRecursionRule(localctx, 2, esql_parser.RULE_query, _p);
    try {
      let _alt: number;
      this.enterOuterAlt(localctx, 1);
      {
        {
          localctx = new SingleCommandQueryContext(this, localctx);
          this._ctx = localctx;
          _prevctx = localctx;

          this.state = 108;
          this.sourceCommand();
        }
        this._ctx.stop = this._input.LT(-1);
        this.state = 115;
        this._errHandler.sync(this);
        _alt = this._interp.adaptivePredict(this._input, 0, this._ctx);
        while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
          if (_alt === 1) {
            if (this._parseListeners != null) {
              this.triggerExitRuleEvent();
            }
            _prevctx = localctx;
            {
              {
                localctx = new CompositeQueryContext(
                  this,
                  new QueryContext(this, _parentctx, _parentState)
                );
                this.pushNewRecursionContext(localctx, _startState, esql_parser.RULE_query);
                this.state = 110;
                if (!this.precpred(this._ctx, 1)) {
                  throw this.createFailedPredicateException('this.precpred(this._ctx, 1)');
                }
                this.state = 111;
                this.match(esql_parser.PIPE);
                this.state = 112;
                this.processingCommand();
              }
            }
          }
          this.state = 117;
          this._errHandler.sync(this);
          _alt = this._interp.adaptivePredict(this._input, 0, this._ctx);
        }
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.unrollRecursionContexts(_parentctx);
    }
    return localctx;
  }
  // @RuleVersion(0)
  public sourceCommand(): SourceCommandContext {
    let localctx: SourceCommandContext = new SourceCommandContext(this, this._ctx, this.state);
    this.enterRule(localctx, 4, esql_parser.RULE_sourceCommand);
    try {
      this.state = 123;
      this._errHandler.sync(this);
      switch (this._input.LA(1)) {
        case 5:
          this.enterOuterAlt(localctx, 1);
          {
            this.state = 118;
            this.explainCommand();
          }
          break;
        case 6:
          this.enterOuterAlt(localctx, 2);
          {
            this.state = 119;
            this.fromCommand();
          }
          break;
        case 14:
          this.enterOuterAlt(localctx, 3);
          {
            this.state = 120;
            this.rowCommand();
          }
          break;
        case 15:
          this.enterOuterAlt(localctx, 4);
          {
            this.state = 121;
            this.showCommand();
          }
          break;
        case 11:
          this.enterOuterAlt(localctx, 5);
          {
            this.state = 122;
            this.metaCommand();
          }
          break;
        default:
          throw new NoViableAltException(this);
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public processingCommand(): ProcessingCommandContext {
    let localctx: ProcessingCommandContext = new ProcessingCommandContext(
      this,
      this._ctx,
      this.state
    );
    this.enterRule(localctx, 6, esql_parser.RULE_processingCommand);
    try {
      this.state = 138;
      this._errHandler.sync(this);
      switch (this._input.LA(1)) {
        case 4:
          this.enterOuterAlt(localctx, 1);
          {
            this.state = 125;
            this.evalCommand();
          }
          break;
        case 8:
          this.enterOuterAlt(localctx, 2);
          {
            this.state = 126;
            this.inlinestatsCommand();
          }
          break;
        case 10:
          this.enterOuterAlt(localctx, 3);
          {
            this.state = 127;
            this.limitCommand();
          }
          break;
        case 9:
          this.enterOuterAlt(localctx, 4);
          {
            this.state = 128;
            this.keepCommand();
          }
          break;
        case 16:
          this.enterOuterAlt(localctx, 5);
          {
            this.state = 129;
            this.sortCommand();
          }
          break;
        case 17:
          this.enterOuterAlt(localctx, 6);
          {
            this.state = 130;
            this.statsCommand();
          }
          break;
        case 18:
          this.enterOuterAlt(localctx, 7);
          {
            this.state = 131;
            this.whereCommand();
          }
          break;
        case 2:
          this.enterOuterAlt(localctx, 8);
          {
            this.state = 132;
            this.dropCommand();
          }
          break;
        case 13:
          this.enterOuterAlt(localctx, 9);
          {
            this.state = 133;
            this.renameCommand();
          }
          break;
        case 1:
          this.enterOuterAlt(localctx, 10);
          {
            this.state = 134;
            this.dissectCommand();
          }
          break;
        case 7:
          this.enterOuterAlt(localctx, 11);
          {
            this.state = 135;
            this.grokCommand();
          }
          break;
        case 3:
          this.enterOuterAlt(localctx, 12);
          {
            this.state = 136;
            this.enrichCommand();
          }
          break;
        case 12:
          this.enterOuterAlt(localctx, 13);
          {
            this.state = 137;
            this.mvExpandCommand();
          }
          break;
        default:
          throw new NoViableAltException(this);
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public whereCommand(): WhereCommandContext {
    let localctx: WhereCommandContext = new WhereCommandContext(this, this._ctx, this.state);
    this.enterRule(localctx, 8, esql_parser.RULE_whereCommand);
    try {
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 140;
        this.match(esql_parser.WHERE);
        this.state = 141;
        this.booleanExpression(0);
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }

  public booleanExpression(): BooleanExpressionContext;
  public booleanExpression(_p: number): BooleanExpressionContext;
  // @RuleVersion(0)
  public booleanExpression(_p?: number): BooleanExpressionContext {
    if (_p === undefined) {
      _p = 0;
    }

    let _parentctx: ParserRuleContext = this._ctx;
    let _parentState: number = this.state;
    let localctx: BooleanExpressionContext = new BooleanExpressionContext(
      this,
      this._ctx,
      _parentState
    );
    let _prevctx: BooleanExpressionContext = localctx;
    let _startState: number = 10;
    this.enterRecursionRule(localctx, 10, esql_parser.RULE_booleanExpression, _p);
    let _la: number;
    try {
      let _alt: number;
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 171;
        this._errHandler.sync(this);
        switch (this._interp.adaptivePredict(this._input, 6, this._ctx)) {
          case 1:
            {
              localctx = new LogicalNotContext(this, localctx);
              this._ctx = localctx;
              _prevctx = localctx;

              this.state = 144;
              this.match(esql_parser.NOT);
              this.state = 145;
              this.booleanExpression(7);
            }
            break;
          case 2:
            {
              localctx = new BooleanDefaultContext(this, localctx);
              this._ctx = localctx;
              _prevctx = localctx;
              this.state = 146;
              this.valueExpression();
            }
            break;
          case 3:
            {
              localctx = new RegexExpressionContext(this, localctx);
              this._ctx = localctx;
              _prevctx = localctx;
              this.state = 147;
              this.regexBooleanExpression();
            }
            break;
          case 4:
            {
              localctx = new LogicalInContext(this, localctx);
              this._ctx = localctx;
              _prevctx = localctx;
              this.state = 148;
              this.valueExpression();
              this.state = 150;
              this._errHandler.sync(this);
              _la = this._input.LA(1);
              if (_la === 45) {
                {
                  this.state = 149;
                  this.match(esql_parser.NOT);
                }
              }

              this.state = 152;
              this.match(esql_parser.IN);
              this.state = 153;
              this.match(esql_parser.LP);
              this.state = 154;
              this.valueExpression();
              this.state = 159;
              this._errHandler.sync(this);
              _la = this._input.LA(1);
              while (_la === 35) {
                {
                  {
                    this.state = 155;
                    this.match(esql_parser.COMMA);
                    this.state = 156;
                    this.valueExpression();
                  }
                }
                this.state = 161;
                this._errHandler.sync(this);
                _la = this._input.LA(1);
              }
              this.state = 162;
              this.match(esql_parser.RP);
            }
            break;
          case 5:
            {
              localctx = new IsNullContext(this, localctx);
              this._ctx = localctx;
              _prevctx = localctx;
              this.state = 164;
              this.valueExpression();
              this.state = 165;
              this.match(esql_parser.IS);
              this.state = 167;
              this._errHandler.sync(this);
              _la = this._input.LA(1);
              if (_la === 45) {
                {
                  this.state = 166;
                  this.match(esql_parser.NOT);
                }
              }

              this.state = 169;
              this.match(esql_parser.NULL);
            }
            break;
        }
        this._ctx.stop = this._input.LT(-1);
        this.state = 181;
        this._errHandler.sync(this);
        _alt = this._interp.adaptivePredict(this._input, 8, this._ctx);
        while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
          if (_alt === 1) {
            if (this._parseListeners != null) {
              this.triggerExitRuleEvent();
            }
            _prevctx = localctx;
            {
              this.state = 179;
              this._errHandler.sync(this);
              switch (this._interp.adaptivePredict(this._input, 7, this._ctx)) {
                case 1:
                  {
                    localctx = new LogicalBinaryContext(
                      this,
                      new BooleanExpressionContext(this, _parentctx, _parentState)
                    );
                    (localctx as LogicalBinaryContext)._left = _prevctx;
                    this.pushNewRecursionContext(
                      localctx,
                      _startState,
                      esql_parser.RULE_booleanExpression
                    );
                    this.state = 173;
                    if (!this.precpred(this._ctx, 4)) {
                      throw this.createFailedPredicateException('this.precpred(this._ctx, 4)');
                    }
                    this.state = 174;
                    (localctx as LogicalBinaryContext)._operator = this.match(esql_parser.AND);
                    this.state = 175;
                    (localctx as LogicalBinaryContext)._right = this.booleanExpression(5);
                  }
                  break;
                case 2:
                  {
                    localctx = new LogicalBinaryContext(
                      this,
                      new BooleanExpressionContext(this, _parentctx, _parentState)
                    );
                    (localctx as LogicalBinaryContext)._left = _prevctx;
                    this.pushNewRecursionContext(
                      localctx,
                      _startState,
                      esql_parser.RULE_booleanExpression
                    );
                    this.state = 176;
                    if (!this.precpred(this._ctx, 3)) {
                      throw this.createFailedPredicateException('this.precpred(this._ctx, 3)');
                    }
                    this.state = 177;
                    (localctx as LogicalBinaryContext)._operator = this.match(esql_parser.OR);
                    this.state = 178;
                    (localctx as LogicalBinaryContext)._right = this.booleanExpression(4);
                  }
                  break;
              }
            }
          }
          this.state = 183;
          this._errHandler.sync(this);
          _alt = this._interp.adaptivePredict(this._input, 8, this._ctx);
        }
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.unrollRecursionContexts(_parentctx);
    }
    return localctx;
  }
  // @RuleVersion(0)
  public regexBooleanExpression(): RegexBooleanExpressionContext {
    let localctx: RegexBooleanExpressionContext = new RegexBooleanExpressionContext(
      this,
      this._ctx,
      this.state
    );
    this.enterRule(localctx, 12, esql_parser.RULE_regexBooleanExpression);
    let _la: number;
    try {
      this.state = 198;
      this._errHandler.sync(this);
      switch (this._interp.adaptivePredict(this._input, 11, this._ctx)) {
        case 1:
          this.enterOuterAlt(localctx, 1);
          {
            this.state = 184;
            this.valueExpression();
            this.state = 186;
            this._errHandler.sync(this);
            _la = this._input.LA(1);
            if (_la === 45) {
              {
                this.state = 185;
                this.match(esql_parser.NOT);
              }
            }

            this.state = 188;
            localctx._kind = this.match(esql_parser.LIKE);
            this.state = 189;
            localctx._pattern = this.string_();
          }
          break;
        case 2:
          this.enterOuterAlt(localctx, 2);
          {
            this.state = 191;
            this.valueExpression();
            this.state = 193;
            this._errHandler.sync(this);
            _la = this._input.LA(1);
            if (_la === 45) {
              {
                this.state = 192;
                this.match(esql_parser.NOT);
              }
            }

            this.state = 195;
            localctx._kind = this.match(esql_parser.RLIKE);
            this.state = 196;
            localctx._pattern = this.string_();
          }
          break;
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public valueExpression(): ValueExpressionContext {
    let localctx: ValueExpressionContext = new ValueExpressionContext(this, this._ctx, this.state);
    this.enterRule(localctx, 14, esql_parser.RULE_valueExpression);
    try {
      this.state = 205;
      this._errHandler.sync(this);
      switch (this._interp.adaptivePredict(this._input, 12, this._ctx)) {
        case 1:
          localctx = new ValueExpressionDefaultContext(this, localctx);
          this.enterOuterAlt(localctx, 1);
          {
            this.state = 200;
            this.operatorExpression(0);
          }
          break;
        case 2:
          localctx = new ComparisonContext(this, localctx);
          this.enterOuterAlt(localctx, 2);
          {
            this.state = 201;
            (localctx as ComparisonContext)._left = this.operatorExpression(0);
            this.state = 202;
            this.comparisonOperator();
            this.state = 203;
            (localctx as ComparisonContext)._right = this.operatorExpression(0);
          }
          break;
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }

  public operatorExpression(): OperatorExpressionContext;
  public operatorExpression(_p: number): OperatorExpressionContext;
  // @RuleVersion(0)
  public operatorExpression(_p?: number): OperatorExpressionContext {
    if (_p === undefined) {
      _p = 0;
    }

    let _parentctx: ParserRuleContext = this._ctx;
    let _parentState: number = this.state;
    let localctx: OperatorExpressionContext = new OperatorExpressionContext(
      this,
      this._ctx,
      _parentState
    );
    let _prevctx: OperatorExpressionContext = localctx;
    let _startState: number = 16;
    this.enterRecursionRule(localctx, 16, esql_parser.RULE_operatorExpression, _p);
    let _la: number;
    try {
      let _alt: number;
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 211;
        this._errHandler.sync(this);
        switch (this._interp.adaptivePredict(this._input, 13, this._ctx)) {
          case 1:
            {
              localctx = new OperatorExpressionDefaultContext(this, localctx);
              this._ctx = localctx;
              _prevctx = localctx;

              this.state = 208;
              this.primaryExpression(0);
            }
            break;
          case 2:
            {
              localctx = new ArithmeticUnaryContext(this, localctx);
              this._ctx = localctx;
              _prevctx = localctx;
              this.state = 209;
              (localctx as ArithmeticUnaryContext)._operator = this._input.LT(1);
              _la = this._input.LA(1);
              if (!(_la === 60 || _la === 61)) {
                (localctx as ArithmeticUnaryContext)._operator =
                  this._errHandler.recoverInline(this);
              } else {
                this._errHandler.reportMatch(this);
                this.consume();
              }
              this.state = 210;
              this.operatorExpression(3);
            }
            break;
        }
        this._ctx.stop = this._input.LT(-1);
        this.state = 221;
        this._errHandler.sync(this);
        _alt = this._interp.adaptivePredict(this._input, 15, this._ctx);
        while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
          if (_alt === 1) {
            if (this._parseListeners != null) {
              this.triggerExitRuleEvent();
            }
            _prevctx = localctx;
            {
              this.state = 219;
              this._errHandler.sync(this);
              switch (this._interp.adaptivePredict(this._input, 14, this._ctx)) {
                case 1:
                  {
                    localctx = new ArithmeticBinaryContext(
                      this,
                      new OperatorExpressionContext(this, _parentctx, _parentState)
                    );
                    (localctx as ArithmeticBinaryContext)._left = _prevctx;
                    this.pushNewRecursionContext(
                      localctx,
                      _startState,
                      esql_parser.RULE_operatorExpression
                    );
                    this.state = 213;
                    if (!this.precpred(this._ctx, 2)) {
                      throw this.createFailedPredicateException('this.precpred(this._ctx, 2)');
                    }
                    this.state = 214;
                    (localctx as ArithmeticBinaryContext)._operator = this._input.LT(1);
                    _la = this._input.LA(1);
                    if (!(((_la - 62) & ~0x1f) === 0 && ((1 << (_la - 62)) & 7) !== 0)) {
                      (localctx as ArithmeticBinaryContext)._operator =
                        this._errHandler.recoverInline(this);
                    } else {
                      this._errHandler.reportMatch(this);
                      this.consume();
                    }
                    this.state = 215;
                    (localctx as ArithmeticBinaryContext)._right = this.operatorExpression(3);
                  }
                  break;
                case 2:
                  {
                    localctx = new ArithmeticBinaryContext(
                      this,
                      new OperatorExpressionContext(this, _parentctx, _parentState)
                    );
                    (localctx as ArithmeticBinaryContext)._left = _prevctx;
                    this.pushNewRecursionContext(
                      localctx,
                      _startState,
                      esql_parser.RULE_operatorExpression
                    );
                    this.state = 216;
                    if (!this.precpred(this._ctx, 1)) {
                      throw this.createFailedPredicateException('this.precpred(this._ctx, 1)');
                    }
                    this.state = 217;
                    (localctx as ArithmeticBinaryContext)._operator = this._input.LT(1);
                    _la = this._input.LA(1);
                    if (!(_la === 60 || _la === 61)) {
                      (localctx as ArithmeticBinaryContext)._operator =
                        this._errHandler.recoverInline(this);
                    } else {
                      this._errHandler.reportMatch(this);
                      this.consume();
                    }
                    this.state = 218;
                    (localctx as ArithmeticBinaryContext)._right = this.operatorExpression(2);
                  }
                  break;
              }
            }
          }
          this.state = 223;
          this._errHandler.sync(this);
          _alt = this._interp.adaptivePredict(this._input, 15, this._ctx);
        }
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.unrollRecursionContexts(_parentctx);
    }
    return localctx;
  }

  public primaryExpression(): PrimaryExpressionContext;
  public primaryExpression(_p: number): PrimaryExpressionContext;
  // @RuleVersion(0)
  public primaryExpression(_p?: number): PrimaryExpressionContext {
    if (_p === undefined) {
      _p = 0;
    }

    let _parentctx: ParserRuleContext = this._ctx;
    let _parentState: number = this.state;
    let localctx: PrimaryExpressionContext = new PrimaryExpressionContext(
      this,
      this._ctx,
      _parentState
    );
    let _prevctx: PrimaryExpressionContext = localctx;
    let _startState: number = 18;
    this.enterRecursionRule(localctx, 18, esql_parser.RULE_primaryExpression, _p);
    try {
      let _alt: number;
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 232;
        this._errHandler.sync(this);
        switch (this._interp.adaptivePredict(this._input, 16, this._ctx)) {
          case 1:
            {
              localctx = new ConstantDefaultContext(this, localctx);
              this._ctx = localctx;
              _prevctx = localctx;

              this.state = 225;
              this.constant();
            }
            break;
          case 2:
            {
              localctx = new DereferenceContext(this, localctx);
              this._ctx = localctx;
              _prevctx = localctx;
              this.state = 226;
              this.qualifiedName();
            }
            break;
          case 3:
            {
              localctx = new FunctionContext(this, localctx);
              this._ctx = localctx;
              _prevctx = localctx;
              this.state = 227;
              this.functionExpression();
            }
            break;
          case 4:
            {
              localctx = new ParenthesizedExpressionContext(this, localctx);
              this._ctx = localctx;
              _prevctx = localctx;
              this.state = 228;
              this.match(esql_parser.LP);
              this.state = 229;
              this.booleanExpression(0);
              this.state = 230;
              this.match(esql_parser.RP);
            }
            break;
        }
        this._ctx.stop = this._input.LT(-1);
        this.state = 239;
        this._errHandler.sync(this);
        _alt = this._interp.adaptivePredict(this._input, 17, this._ctx);
        while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
          if (_alt === 1) {
            if (this._parseListeners != null) {
              this.triggerExitRuleEvent();
            }
            _prevctx = localctx;
            {
              {
                localctx = new InlineCastContext(
                  this,
                  new PrimaryExpressionContext(this, _parentctx, _parentState)
                );
                this.pushNewRecursionContext(
                  localctx,
                  _startState,
                  esql_parser.RULE_primaryExpression
                );
                this.state = 234;
                if (!this.precpred(this._ctx, 1)) {
                  throw this.createFailedPredicateException('this.precpred(this._ctx, 1)');
                }
                this.state = 235;
                this.match(esql_parser.CAST_OP);
                this.state = 236;
                this.dataType();
              }
            }
          }
          this.state = 241;
          this._errHandler.sync(this);
          _alt = this._interp.adaptivePredict(this._input, 17, this._ctx);
        }
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.unrollRecursionContexts(_parentctx);
    }
    return localctx;
  }
  // @RuleVersion(0)
  public functionExpression(): FunctionExpressionContext {
    let localctx: FunctionExpressionContext = new FunctionExpressionContext(
      this,
      this._ctx,
      this.state
    );
    this.enterRule(localctx, 20, esql_parser.RULE_functionExpression);
    let _la: number;
    try {
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 242;
        this.identifier();
        this.state = 243;
        this.match(esql_parser.LP);
        this.state = 253;
        this._errHandler.sync(this);
        switch (this._input.LA(1)) {
          case 62:
            {
              this.state = 244;
              this.match(esql_parser.ASTERISK);
            }
            break;
          case 27:
          case 28:
          case 29:
          case 38:
          case 41:
          case 45:
          case 46:
          case 49:
          case 52:
          case 60:
          case 61:
          case 65:
          case 67:
          case 68:
            {
              {
                this.state = 245;
                this.booleanExpression(0);
                this.state = 250;
                this._errHandler.sync(this);
                _la = this._input.LA(1);
                while (_la === 35) {
                  {
                    {
                      this.state = 246;
                      this.match(esql_parser.COMMA);
                      this.state = 247;
                      this.booleanExpression(0);
                    }
                  }
                  this.state = 252;
                  this._errHandler.sync(this);
                  _la = this._input.LA(1);
                }
              }
            }
            break;
          case 51:
            break;
          default:
            break;
        }
        this.state = 255;
        this.match(esql_parser.RP);
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public dataType(): DataTypeContext {
    let localctx: DataTypeContext = new DataTypeContext(this, this._ctx, this.state);
    this.enterRule(localctx, 22, esql_parser.RULE_dataType);
    try {
      localctx = new ToDataTypeContext(this, localctx);
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 257;
        this.identifier();
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public rowCommand(): RowCommandContext {
    let localctx: RowCommandContext = new RowCommandContext(this, this._ctx, this.state);
    this.enterRule(localctx, 24, esql_parser.RULE_rowCommand);
    try {
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 259;
        this.match(esql_parser.ROW);
        this.state = 260;
        this.fields();
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public fields(): FieldsContext {
    let localctx: FieldsContext = new FieldsContext(this, this._ctx, this.state);
    this.enterRule(localctx, 26, esql_parser.RULE_fields);
    try {
      let _alt: number;
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 262;
        this.field();
        this.state = 267;
        this._errHandler.sync(this);
        _alt = this._interp.adaptivePredict(this._input, 20, this._ctx);
        while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
          if (_alt === 1) {
            {
              {
                this.state = 263;
                this.match(esql_parser.COMMA);
                this.state = 264;
                this.field();
              }
            }
          }
          this.state = 269;
          this._errHandler.sync(this);
          _alt = this._interp.adaptivePredict(this._input, 20, this._ctx);
        }
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public field(): FieldContext {
    let localctx: FieldContext = new FieldContext(this, this._ctx, this.state);
    this.enterRule(localctx, 28, esql_parser.RULE_field);
    try {
      this.state = 275;
      this._errHandler.sync(this);
      switch (this._interp.adaptivePredict(this._input, 21, this._ctx)) {
        case 1:
          this.enterOuterAlt(localctx, 1);
          {
            this.state = 270;
            this.booleanExpression(0);
          }
          break;
        case 2:
          this.enterOuterAlt(localctx, 2);
          {
            this.state = 271;
            this.qualifiedName();
            this.state = 272;
            this.match(esql_parser.ASSIGN);
            this.state = 273;
            this.booleanExpression(0);
          }
          break;
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public fromCommand(): FromCommandContext {
    let localctx: FromCommandContext = new FromCommandContext(this, this._ctx, this.state);
    this.enterRule(localctx, 30, esql_parser.RULE_fromCommand);
    try {
      let _alt: number;
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 277;
        this.match(esql_parser.FROM);
        this.state = 278;
        this.fromIdentifier();
        this.state = 283;
        this._errHandler.sync(this);
        _alt = this._interp.adaptivePredict(this._input, 22, this._ctx);
        while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
          if (_alt === 1) {
            {
              {
                this.state = 279;
                this.match(esql_parser.COMMA);
                this.state = 280;
                this.fromIdentifier();
              }
            }
          }
          this.state = 285;
          this._errHandler.sync(this);
          _alt = this._interp.adaptivePredict(this._input, 22, this._ctx);
        }
        this.state = 287;
        this._errHandler.sync(this);
        switch (this._interp.adaptivePredict(this._input, 23, this._ctx)) {
          case 1:
            {
              this.state = 286;
              this.metadata();
            }
            break;
        }
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public fromIdentifier(): FromIdentifierContext {
    let localctx: FromIdentifierContext = new FromIdentifierContext(this, this._ctx, this.state);
    this.enterRule(localctx, 32, esql_parser.RULE_fromIdentifier);
    try {
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 289;
        this.match(esql_parser.FROM_UNQUOTED_IDENTIFIER);
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public metadata(): MetadataContext {
    let localctx: MetadataContext = new MetadataContext(this, this._ctx, this.state);
    this.enterRule(localctx, 34, esql_parser.RULE_metadata);
    try {
      this.state = 293;
      this._errHandler.sync(this);
      switch (this._input.LA(1)) {
        case 72:
          this.enterOuterAlt(localctx, 1);
          {
            this.state = 291;
            this.metadataOption();
          }
          break;
        case 65:
          this.enterOuterAlt(localctx, 2);
          {
            this.state = 292;
            this.deprecated_metadata();
          }
          break;
        default:
          throw new NoViableAltException(this);
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public metadataOption(): MetadataOptionContext {
    let localctx: MetadataOptionContext = new MetadataOptionContext(this, this._ctx, this.state);
    this.enterRule(localctx, 36, esql_parser.RULE_metadataOption);
    try {
      let _alt: number;
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 295;
        this.match(esql_parser.METADATA);
        this.state = 296;
        this.fromIdentifier();
        this.state = 301;
        this._errHandler.sync(this);
        _alt = this._interp.adaptivePredict(this._input, 25, this._ctx);
        while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
          if (_alt === 1) {
            {
              {
                this.state = 297;
                this.match(esql_parser.COMMA);
                this.state = 298;
                this.fromIdentifier();
              }
            }
          }
          this.state = 303;
          this._errHandler.sync(this);
          _alt = this._interp.adaptivePredict(this._input, 25, this._ctx);
        }
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public deprecated_metadata(): Deprecated_metadataContext {
    let localctx: Deprecated_metadataContext = new Deprecated_metadataContext(
      this,
      this._ctx,
      this.state
    );
    this.enterRule(localctx, 38, esql_parser.RULE_deprecated_metadata);
    try {
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 304;
        this.match(esql_parser.OPENING_BRACKET);
        this.state = 305;
        this.metadataOption();
        this.state = 306;
        this.match(esql_parser.CLOSING_BRACKET);
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public evalCommand(): EvalCommandContext {
    let localctx: EvalCommandContext = new EvalCommandContext(this, this._ctx, this.state);
    this.enterRule(localctx, 40, esql_parser.RULE_evalCommand);
    try {
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 308;
        this.match(esql_parser.EVAL);
        this.state = 309;
        this.fields();
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public statsCommand(): StatsCommandContext {
    let localctx: StatsCommandContext = new StatsCommandContext(this, this._ctx, this.state);
    this.enterRule(localctx, 42, esql_parser.RULE_statsCommand);
    try {
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 311;
        this.match(esql_parser.STATS);
        this.state = 313;
        this._errHandler.sync(this);
        switch (this._interp.adaptivePredict(this._input, 26, this._ctx)) {
          case 1:
            {
              this.state = 312;
              localctx._stats = this.fields();
            }
            break;
        }
        this.state = 317;
        this._errHandler.sync(this);
        switch (this._interp.adaptivePredict(this._input, 27, this._ctx)) {
          case 1:
            {
              this.state = 315;
              this.match(esql_parser.BY);
              this.state = 316;
              localctx._grouping = this.fields();
            }
            break;
        }
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public inlinestatsCommand(): InlinestatsCommandContext {
    let localctx: InlinestatsCommandContext = new InlinestatsCommandContext(
      this,
      this._ctx,
      this.state
    );
    this.enterRule(localctx, 44, esql_parser.RULE_inlinestatsCommand);
    try {
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 319;
        this.match(esql_parser.INLINESTATS);
        this.state = 320;
        localctx._stats = this.fields();
        this.state = 323;
        this._errHandler.sync(this);
        switch (this._interp.adaptivePredict(this._input, 28, this._ctx)) {
          case 1:
            {
              this.state = 321;
              this.match(esql_parser.BY);
              this.state = 322;
              localctx._grouping = this.fields();
            }
            break;
        }
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public qualifiedName(): QualifiedNameContext {
    let localctx: QualifiedNameContext = new QualifiedNameContext(this, this._ctx, this.state);
    this.enterRule(localctx, 46, esql_parser.RULE_qualifiedName);
    try {
      let _alt: number;
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 325;
        this.identifier();
        this.state = 330;
        this._errHandler.sync(this);
        _alt = this._interp.adaptivePredict(this._input, 29, this._ctx);
        while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
          if (_alt === 1) {
            {
              {
                this.state = 326;
                this.match(esql_parser.DOT);
                this.state = 327;
                this.identifier();
              }
            }
          }
          this.state = 332;
          this._errHandler.sync(this);
          _alt = this._interp.adaptivePredict(this._input, 29, this._ctx);
        }
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public qualifiedNamePattern(): QualifiedNamePatternContext {
    let localctx: QualifiedNamePatternContext = new QualifiedNamePatternContext(
      this,
      this._ctx,
      this.state
    );
    this.enterRule(localctx, 48, esql_parser.RULE_qualifiedNamePattern);
    try {
      let _alt: number;
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 333;
        this.identifierPattern();
        this.state = 338;
        this._errHandler.sync(this);
        _alt = this._interp.adaptivePredict(this._input, 30, this._ctx);
        while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
          if (_alt === 1) {
            {
              {
                this.state = 334;
                this.match(esql_parser.DOT);
                this.state = 335;
                this.identifierPattern();
              }
            }
          }
          this.state = 340;
          this._errHandler.sync(this);
          _alt = this._interp.adaptivePredict(this._input, 30, this._ctx);
        }
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public identifier(): IdentifierContext {
    let localctx: IdentifierContext = new IdentifierContext(this, this._ctx, this.state);
    this.enterRule(localctx, 50, esql_parser.RULE_identifier);
    let _la: number;
    try {
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 341;
        _la = this._input.LA(1);
        if (!(_la === 67 || _la === 68)) {
          this._errHandler.recoverInline(this);
        } else {
          this._errHandler.reportMatch(this);
          this.consume();
        }
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public identifierPattern(): IdentifierPatternContext {
    let localctx: IdentifierPatternContext = new IdentifierPatternContext(
      this,
      this._ctx,
      this.state
    );
    this.enterRule(localctx, 52, esql_parser.RULE_identifierPattern);
    try {
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 343;
        this.match(esql_parser.ID_PATTERN);
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public constant(): ConstantContext {
    let localctx: ConstantContext = new ConstantContext(this, this._ctx, this.state);
    this.enterRule(localctx, 54, esql_parser.RULE_constant);
    let _la: number;
    try {
      this.state = 387;
      this._errHandler.sync(this);
      switch (this._interp.adaptivePredict(this._input, 34, this._ctx)) {
        case 1:
          localctx = new NullLiteralContext(this, localctx);
          this.enterOuterAlt(localctx, 1);
          {
            this.state = 345;
            this.match(esql_parser.NULL);
          }
          break;
        case 2:
          localctx = new QualifiedIntegerLiteralContext(this, localctx);
          this.enterOuterAlt(localctx, 2);
          {
            this.state = 346;
            this.integerValue();
            this.state = 347;
            this.match(esql_parser.UNQUOTED_IDENTIFIER);
          }
          break;
        case 3:
          localctx = new DecimalLiteralContext(this, localctx);
          this.enterOuterAlt(localctx, 3);
          {
            this.state = 349;
            this.decimalValue();
          }
          break;
        case 4:
          localctx = new IntegerLiteralContext(this, localctx);
          this.enterOuterAlt(localctx, 4);
          {
            this.state = 350;
            this.integerValue();
          }
          break;
        case 5:
          localctx = new BooleanLiteralContext(this, localctx);
          this.enterOuterAlt(localctx, 5);
          {
            this.state = 351;
            this.booleanValue();
          }
          break;
        case 6:
          localctx = new InputParamContext(this, localctx);
          this.enterOuterAlt(localctx, 6);
          {
            this.state = 352;
            this.match(esql_parser.PARAM);
          }
          break;
        case 7:
          localctx = new StringLiteralContext(this, localctx);
          this.enterOuterAlt(localctx, 7);
          {
            this.state = 353;
            this.string_();
          }
          break;
        case 8:
          localctx = new NumericArrayLiteralContext(this, localctx);
          this.enterOuterAlt(localctx, 8);
          {
            this.state = 354;
            this.match(esql_parser.OPENING_BRACKET);
            this.state = 355;
            this.numericValue();
            this.state = 360;
            this._errHandler.sync(this);
            _la = this._input.LA(1);
            while (_la === 35) {
              {
                {
                  this.state = 356;
                  this.match(esql_parser.COMMA);
                  this.state = 357;
                  this.numericValue();
                }
              }
              this.state = 362;
              this._errHandler.sync(this);
              _la = this._input.LA(1);
            }
            this.state = 363;
            this.match(esql_parser.CLOSING_BRACKET);
          }
          break;
        case 9:
          localctx = new BooleanArrayLiteralContext(this, localctx);
          this.enterOuterAlt(localctx, 9);
          {
            this.state = 365;
            this.match(esql_parser.OPENING_BRACKET);
            this.state = 366;
            this.booleanValue();
            this.state = 371;
            this._errHandler.sync(this);
            _la = this._input.LA(1);
            while (_la === 35) {
              {
                {
                  this.state = 367;
                  this.match(esql_parser.COMMA);
                  this.state = 368;
                  this.booleanValue();
                }
              }
              this.state = 373;
              this._errHandler.sync(this);
              _la = this._input.LA(1);
            }
            this.state = 374;
            this.match(esql_parser.CLOSING_BRACKET);
          }
          break;
        case 10:
          localctx = new StringArrayLiteralContext(this, localctx);
          this.enterOuterAlt(localctx, 10);
          {
            this.state = 376;
            this.match(esql_parser.OPENING_BRACKET);
            this.state = 377;
            this.string_();
            this.state = 382;
            this._errHandler.sync(this);
            _la = this._input.LA(1);
            while (_la === 35) {
              {
                {
                  this.state = 378;
                  this.match(esql_parser.COMMA);
                  this.state = 379;
                  this.string_();
                }
              }
              this.state = 384;
              this._errHandler.sync(this);
              _la = this._input.LA(1);
            }
            this.state = 385;
            this.match(esql_parser.CLOSING_BRACKET);
          }
          break;
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public limitCommand(): LimitCommandContext {
    let localctx: LimitCommandContext = new LimitCommandContext(this, this._ctx, this.state);
    this.enterRule(localctx, 56, esql_parser.RULE_limitCommand);
    try {
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 389;
        this.match(esql_parser.LIMIT);
        this.state = 390;
        this.match(esql_parser.INTEGER_LITERAL);
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public sortCommand(): SortCommandContext {
    let localctx: SortCommandContext = new SortCommandContext(this, this._ctx, this.state);
    this.enterRule(localctx, 58, esql_parser.RULE_sortCommand);
    try {
      let _alt: number;
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 392;
        this.match(esql_parser.SORT);
        this.state = 393;
        this.orderExpression();
        this.state = 398;
        this._errHandler.sync(this);
        _alt = this._interp.adaptivePredict(this._input, 35, this._ctx);
        while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
          if (_alt === 1) {
            {
              {
                this.state = 394;
                this.match(esql_parser.COMMA);
                this.state = 395;
                this.orderExpression();
              }
            }
          }
          this.state = 400;
          this._errHandler.sync(this);
          _alt = this._interp.adaptivePredict(this._input, 35, this._ctx);
        }
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public orderExpression(): OrderExpressionContext {
    let localctx: OrderExpressionContext = new OrderExpressionContext(this, this._ctx, this.state);
    this.enterRule(localctx, 60, esql_parser.RULE_orderExpression);
    let _la: number;
    try {
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 401;
        this.booleanExpression(0);
        this.state = 403;
        this._errHandler.sync(this);
        switch (this._interp.adaptivePredict(this._input, 36, this._ctx)) {
          case 1:
            {
              this.state = 402;
              localctx._ordering = this._input.LT(1);
              _la = this._input.LA(1);
              if (!(_la === 32 || _la === 36)) {
                localctx._ordering = this._errHandler.recoverInline(this);
              } else {
                this._errHandler.reportMatch(this);
                this.consume();
              }
            }
            break;
        }
        this.state = 407;
        this._errHandler.sync(this);
        switch (this._interp.adaptivePredict(this._input, 37, this._ctx)) {
          case 1:
            {
              this.state = 405;
              this.match(esql_parser.NULLS);
              this.state = 406;
              localctx._nullOrdering = this._input.LT(1);
              _la = this._input.LA(1);
              if (!(_la === 39 || _la === 40)) {
                localctx._nullOrdering = this._errHandler.recoverInline(this);
              } else {
                this._errHandler.reportMatch(this);
                this.consume();
              }
            }
            break;
        }
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public keepCommand(): KeepCommandContext {
    let localctx: KeepCommandContext = new KeepCommandContext(this, this._ctx, this.state);
    this.enterRule(localctx, 62, esql_parser.RULE_keepCommand);
    try {
      let _alt: number;
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 409;
        this.match(esql_parser.KEEP);
        this.state = 410;
        this.qualifiedNamePattern();
        this.state = 415;
        this._errHandler.sync(this);
        _alt = this._interp.adaptivePredict(this._input, 38, this._ctx);
        while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
          if (_alt === 1) {
            {
              {
                this.state = 411;
                this.match(esql_parser.COMMA);
                this.state = 412;
                this.qualifiedNamePattern();
              }
            }
          }
          this.state = 417;
          this._errHandler.sync(this);
          _alt = this._interp.adaptivePredict(this._input, 38, this._ctx);
        }
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public dropCommand(): DropCommandContext {
    let localctx: DropCommandContext = new DropCommandContext(this, this._ctx, this.state);
    this.enterRule(localctx, 64, esql_parser.RULE_dropCommand);
    try {
      let _alt: number;
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 418;
        this.match(esql_parser.DROP);
        this.state = 419;
        this.qualifiedNamePattern();
        this.state = 424;
        this._errHandler.sync(this);
        _alt = this._interp.adaptivePredict(this._input, 39, this._ctx);
        while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
          if (_alt === 1) {
            {
              {
                this.state = 420;
                this.match(esql_parser.COMMA);
                this.state = 421;
                this.qualifiedNamePattern();
              }
            }
          }
          this.state = 426;
          this._errHandler.sync(this);
          _alt = this._interp.adaptivePredict(this._input, 39, this._ctx);
        }
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public renameCommand(): RenameCommandContext {
    let localctx: RenameCommandContext = new RenameCommandContext(this, this._ctx, this.state);
    this.enterRule(localctx, 66, esql_parser.RULE_renameCommand);
    try {
      let _alt: number;
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 427;
        this.match(esql_parser.RENAME);
        this.state = 428;
        this.renameClause();
        this.state = 433;
        this._errHandler.sync(this);
        _alt = this._interp.adaptivePredict(this._input, 40, this._ctx);
        while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
          if (_alt === 1) {
            {
              {
                this.state = 429;
                this.match(esql_parser.COMMA);
                this.state = 430;
                this.renameClause();
              }
            }
          }
          this.state = 435;
          this._errHandler.sync(this);
          _alt = this._interp.adaptivePredict(this._input, 40, this._ctx);
        }
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public renameClause(): RenameClauseContext {
    let localctx: RenameClauseContext = new RenameClauseContext(this, this._ctx, this.state);
    this.enterRule(localctx, 68, esql_parser.RULE_renameClause);
    try {
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 436;
        localctx._oldName = this.qualifiedNamePattern();
        this.state = 437;
        this.match(esql_parser.AS);
        this.state = 438;
        localctx._newName = this.qualifiedNamePattern();
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public dissectCommand(): DissectCommandContext {
    let localctx: DissectCommandContext = new DissectCommandContext(this, this._ctx, this.state);
    this.enterRule(localctx, 70, esql_parser.RULE_dissectCommand);
    try {
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 440;
        this.match(esql_parser.DISSECT);
        this.state = 441;
        this.primaryExpression(0);
        this.state = 442;
        this.string_();
        this.state = 444;
        this._errHandler.sync(this);
        switch (this._interp.adaptivePredict(this._input, 41, this._ctx)) {
          case 1:
            {
              this.state = 443;
              this.commandOptions();
            }
            break;
        }
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public grokCommand(): GrokCommandContext {
    let localctx: GrokCommandContext = new GrokCommandContext(this, this._ctx, this.state);
    this.enterRule(localctx, 72, esql_parser.RULE_grokCommand);
    try {
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 446;
        this.match(esql_parser.GROK);
        this.state = 447;
        this.primaryExpression(0);
        this.state = 448;
        this.string_();
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public mvExpandCommand(): MvExpandCommandContext {
    let localctx: MvExpandCommandContext = new MvExpandCommandContext(this, this._ctx, this.state);
    this.enterRule(localctx, 74, esql_parser.RULE_mvExpandCommand);
    try {
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 450;
        this.match(esql_parser.MV_EXPAND);
        this.state = 451;
        this.qualifiedName();
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public commandOptions(): CommandOptionsContext {
    let localctx: CommandOptionsContext = new CommandOptionsContext(this, this._ctx, this.state);
    this.enterRule(localctx, 76, esql_parser.RULE_commandOptions);
    try {
      let _alt: number;
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 453;
        this.commandOption();
        this.state = 458;
        this._errHandler.sync(this);
        _alt = this._interp.adaptivePredict(this._input, 42, this._ctx);
        while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
          if (_alt === 1) {
            {
              {
                this.state = 454;
                this.match(esql_parser.COMMA);
                this.state = 455;
                this.commandOption();
              }
            }
          }
          this.state = 460;
          this._errHandler.sync(this);
          _alt = this._interp.adaptivePredict(this._input, 42, this._ctx);
        }
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public commandOption(): CommandOptionContext {
    let localctx: CommandOptionContext = new CommandOptionContext(this, this._ctx, this.state);
    this.enterRule(localctx, 78, esql_parser.RULE_commandOption);
    try {
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 461;
        this.identifier();
        this.state = 462;
        this.match(esql_parser.ASSIGN);
        this.state = 463;
        this.constant();
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public booleanValue(): BooleanValueContext {
    let localctx: BooleanValueContext = new BooleanValueContext(this, this._ctx, this.state);
    this.enterRule(localctx, 80, esql_parser.RULE_booleanValue);
    let _la: number;
    try {
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 465;
        _la = this._input.LA(1);
        if (!(_la === 38 || _la === 52)) {
          this._errHandler.recoverInline(this);
        } else {
          this._errHandler.reportMatch(this);
          this.consume();
        }
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public numericValue(): NumericValueContext {
    let localctx: NumericValueContext = new NumericValueContext(this, this._ctx, this.state);
    this.enterRule(localctx, 82, esql_parser.RULE_numericValue);
    try {
      this.state = 469;
      this._errHandler.sync(this);
      switch (this._interp.adaptivePredict(this._input, 43, this._ctx)) {
        case 1:
          this.enterOuterAlt(localctx, 1);
          {
            this.state = 467;
            this.decimalValue();
          }
          break;
        case 2:
          this.enterOuterAlt(localctx, 2);
          {
            this.state = 468;
            this.integerValue();
          }
          break;
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public decimalValue(): DecimalValueContext {
    let localctx: DecimalValueContext = new DecimalValueContext(this, this._ctx, this.state);
    this.enterRule(localctx, 84, esql_parser.RULE_decimalValue);
    let _la: number;
    try {
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 472;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        if (_la === 60 || _la === 61) {
          {
            this.state = 471;
            _la = this._input.LA(1);
            if (!(_la === 60 || _la === 61)) {
              this._errHandler.recoverInline(this);
            } else {
              this._errHandler.reportMatch(this);
              this.consume();
            }
          }
        }

        this.state = 474;
        this.match(esql_parser.DECIMAL_LITERAL);
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public integerValue(): IntegerValueContext {
    let localctx: IntegerValueContext = new IntegerValueContext(this, this._ctx, this.state);
    this.enterRule(localctx, 86, esql_parser.RULE_integerValue);
    let _la: number;
    try {
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 477;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        if (_la === 60 || _la === 61) {
          {
            this.state = 476;
            _la = this._input.LA(1);
            if (!(_la === 60 || _la === 61)) {
              this._errHandler.recoverInline(this);
            } else {
              this._errHandler.reportMatch(this);
              this.consume();
            }
          }
        }

        this.state = 479;
        this.match(esql_parser.INTEGER_LITERAL);
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public string_(): StringContext {
    let localctx: StringContext = new StringContext(this, this._ctx, this.state);
    this.enterRule(localctx, 88, esql_parser.RULE_string);
    try {
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 481;
        this.match(esql_parser.QUOTED_STRING);
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public comparisonOperator(): ComparisonOperatorContext {
    let localctx: ComparisonOperatorContext = new ComparisonOperatorContext(
      this,
      this._ctx,
      this.state
    );
    this.enterRule(localctx, 90, esql_parser.RULE_comparisonOperator);
    let _la: number;
    try {
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 483;
        _la = this._input.LA(1);
        if (!(((_la - 53) & ~0x1f) === 0 && ((1 << (_la - 53)) & 125) !== 0)) {
          this._errHandler.recoverInline(this);
        } else {
          this._errHandler.reportMatch(this);
          this.consume();
        }
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public explainCommand(): ExplainCommandContext {
    let localctx: ExplainCommandContext = new ExplainCommandContext(this, this._ctx, this.state);
    this.enterRule(localctx, 92, esql_parser.RULE_explainCommand);
    try {
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 485;
        this.match(esql_parser.EXPLAIN);
        this.state = 486;
        this.subqueryExpression();
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public subqueryExpression(): SubqueryExpressionContext {
    let localctx: SubqueryExpressionContext = new SubqueryExpressionContext(
      this,
      this._ctx,
      this.state
    );
    this.enterRule(localctx, 94, esql_parser.RULE_subqueryExpression);
    try {
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 488;
        this.match(esql_parser.OPENING_BRACKET);
        this.state = 489;
        this.query(0);
        this.state = 490;
        this.match(esql_parser.CLOSING_BRACKET);
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public showCommand(): ShowCommandContext {
    let localctx: ShowCommandContext = new ShowCommandContext(this, this._ctx, this.state);
    this.enterRule(localctx, 96, esql_parser.RULE_showCommand);
    try {
      localctx = new ShowInfoContext(this, localctx);
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 492;
        this.match(esql_parser.SHOW);
        this.state = 493;
        this.match(esql_parser.INFO);
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public metaCommand(): MetaCommandContext {
    let localctx: MetaCommandContext = new MetaCommandContext(this, this._ctx, this.state);
    this.enterRule(localctx, 98, esql_parser.RULE_metaCommand);
    try {
      localctx = new MetaFunctionsContext(this, localctx);
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 495;
        this.match(esql_parser.META);
        this.state = 496;
        this.match(esql_parser.FUNCTIONS);
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public enrichCommand(): EnrichCommandContext {
    let localctx: EnrichCommandContext = new EnrichCommandContext(this, this._ctx, this.state);
    this.enterRule(localctx, 100, esql_parser.RULE_enrichCommand);
    try {
      let _alt: number;
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 498;
        this.match(esql_parser.ENRICH);
        this.state = 499;
        localctx._policyName = this.match(esql_parser.ENRICH_POLICY_NAME);
        this.state = 502;
        this._errHandler.sync(this);
        switch (this._interp.adaptivePredict(this._input, 46, this._ctx)) {
          case 1:
            {
              this.state = 500;
              this.match(esql_parser.ON);
              this.state = 501;
              localctx._matchField = this.qualifiedNamePattern();
            }
            break;
        }
        this.state = 513;
        this._errHandler.sync(this);
        switch (this._interp.adaptivePredict(this._input, 48, this._ctx)) {
          case 1:
            {
              this.state = 504;
              this.match(esql_parser.WITH);
              this.state = 505;
              this.enrichWithClause();
              this.state = 510;
              this._errHandler.sync(this);
              _alt = this._interp.adaptivePredict(this._input, 47, this._ctx);
              while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
                if (_alt === 1) {
                  {
                    {
                      this.state = 506;
                      this.match(esql_parser.COMMA);
                      this.state = 507;
                      this.enrichWithClause();
                    }
                  }
                }
                this.state = 512;
                this._errHandler.sync(this);
                _alt = this._interp.adaptivePredict(this._input, 47, this._ctx);
              }
            }
            break;
        }
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
  // @RuleVersion(0)
  public enrichWithClause(): EnrichWithClauseContext {
    let localctx: EnrichWithClauseContext = new EnrichWithClauseContext(
      this,
      this._ctx,
      this.state
    );
    this.enterRule(localctx, 102, esql_parser.RULE_enrichWithClause);
    try {
      this.enterOuterAlt(localctx, 1);
      {
        this.state = 518;
        this._errHandler.sync(this);
        switch (this._interp.adaptivePredict(this._input, 49, this._ctx)) {
          case 1:
            {
              this.state = 515;
              localctx._newName = this.qualifiedNamePattern();
              this.state = 516;
              this.match(esql_parser.ASSIGN);
            }
            break;
        }
        this.state = 520;
        localctx._enrichField = this.qualifiedNamePattern();
      }
    } catch (re) {
      if (re instanceof RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }

  public sempred(localctx: RuleContext, ruleIndex: number, predIndex: number): boolean {
    switch (ruleIndex) {
      case 1:
        return this.query_sempred(localctx as QueryContext, predIndex);
      case 5:
        return this.booleanExpression_sempred(localctx as BooleanExpressionContext, predIndex);
      case 8:
        return this.operatorExpression_sempred(localctx as OperatorExpressionContext, predIndex);
      case 9:
        return this.primaryExpression_sempred(localctx as PrimaryExpressionContext, predIndex);
    }
    return true;
  }
  private query_sempred(localctx: QueryContext, predIndex: number): boolean {
    switch (predIndex) {
      case 0:
        return this.precpred(this._ctx, 1);
    }
    return true;
  }
  private booleanExpression_sempred(
    localctx: BooleanExpressionContext,
    predIndex: number
  ): boolean {
    switch (predIndex) {
      case 1:
        return this.precpred(this._ctx, 4);
      case 2:
        return this.precpred(this._ctx, 3);
    }
    return true;
  }
  private operatorExpression_sempred(
    localctx: OperatorExpressionContext,
    predIndex: number
  ): boolean {
    switch (predIndex) {
      case 3:
        return this.precpred(this._ctx, 2);
      case 4:
        return this.precpred(this._ctx, 1);
    }
    return true;
  }
  private primaryExpression_sempred(
    localctx: PrimaryExpressionContext,
    predIndex: number
  ): boolean {
    switch (predIndex) {
      case 5:
        return this.precpred(this._ctx, 1);
    }
    return true;
  }

  public static readonly _serializedATN: number[] = [
    4, 1, 109, 523, 2, 0, 7, 0, 2, 1, 7, 1, 2, 2, 7, 2, 2, 3, 7, 3, 2, 4, 7, 4, 2, 5, 7, 5, 2, 6, 7,
    6, 2, 7, 7, 7, 2, 8, 7, 8, 2, 9, 7, 9, 2, 10, 7, 10, 2, 11, 7, 11, 2, 12, 7, 12, 2, 13, 7, 13,
    2, 14, 7, 14, 2, 15, 7, 15, 2, 16, 7, 16, 2, 17, 7, 17, 2, 18, 7, 18, 2, 19, 7, 19, 2, 20, 7,
    20, 2, 21, 7, 21, 2, 22, 7, 22, 2, 23, 7, 23, 2, 24, 7, 24, 2, 25, 7, 25, 2, 26, 7, 26, 2, 27,
    7, 27, 2, 28, 7, 28, 2, 29, 7, 29, 2, 30, 7, 30, 2, 31, 7, 31, 2, 32, 7, 32, 2, 33, 7, 33, 2,
    34, 7, 34, 2, 35, 7, 35, 2, 36, 7, 36, 2, 37, 7, 37, 2, 38, 7, 38, 2, 39, 7, 39, 2, 40, 7, 40,
    2, 41, 7, 41, 2, 42, 7, 42, 2, 43, 7, 43, 2, 44, 7, 44, 2, 45, 7, 45, 2, 46, 7, 46, 2, 47, 7,
    47, 2, 48, 7, 48, 2, 49, 7, 49, 2, 50, 7, 50, 2, 51, 7, 51, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 5, 1, 114, 8, 1, 10, 1, 12, 1, 117, 9, 1, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 3, 2,
    124, 8, 2, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 3, 3,
    139, 8, 3, 1, 4, 1, 4, 1, 4, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 3, 5, 151, 8, 5, 1, 5, 1,
    5, 1, 5, 1, 5, 1, 5, 5, 5, 158, 8, 5, 10, 5, 12, 5, 161, 9, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 3,
    5, 168, 8, 5, 1, 5, 1, 5, 3, 5, 172, 8, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 5, 5, 180, 8, 5,
    10, 5, 12, 5, 183, 9, 5, 1, 6, 1, 6, 3, 6, 187, 8, 6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6, 3, 6, 194,
    8, 6, 1, 6, 1, 6, 1, 6, 3, 6, 199, 8, 6, 1, 7, 1, 7, 1, 7, 1, 7, 1, 7, 3, 7, 206, 8, 7, 1, 8, 1,
    8, 1, 8, 1, 8, 3, 8, 212, 8, 8, 1, 8, 1, 8, 1, 8, 1, 8, 1, 8, 1, 8, 5, 8, 220, 8, 8, 10, 8, 12,
    8, 223, 9, 8, 1, 9, 1, 9, 1, 9, 1, 9, 1, 9, 1, 9, 1, 9, 1, 9, 3, 9, 233, 8, 9, 1, 9, 1, 9, 1, 9,
    5, 9, 238, 8, 9, 10, 9, 12, 9, 241, 9, 9, 1, 10, 1, 10, 1, 10, 1, 10, 1, 10, 1, 10, 5, 10, 249,
    8, 10, 10, 10, 12, 10, 252, 9, 10, 3, 10, 254, 8, 10, 1, 10, 1, 10, 1, 11, 1, 11, 1, 12, 1, 12,
    1, 12, 1, 13, 1, 13, 1, 13, 5, 13, 266, 8, 13, 10, 13, 12, 13, 269, 9, 13, 1, 14, 1, 14, 1, 14,
    1, 14, 1, 14, 3, 14, 276, 8, 14, 1, 15, 1, 15, 1, 15, 1, 15, 5, 15, 282, 8, 15, 10, 15, 12, 15,
    285, 9, 15, 1, 15, 3, 15, 288, 8, 15, 1, 16, 1, 16, 1, 17, 1, 17, 3, 17, 294, 8, 17, 1, 18, 1,
    18, 1, 18, 1, 18, 5, 18, 300, 8, 18, 10, 18, 12, 18, 303, 9, 18, 1, 19, 1, 19, 1, 19, 1, 19, 1,
    20, 1, 20, 1, 20, 1, 21, 1, 21, 3, 21, 314, 8, 21, 1, 21, 1, 21, 3, 21, 318, 8, 21, 1, 22, 1,
    22, 1, 22, 1, 22, 3, 22, 324, 8, 22, 1, 23, 1, 23, 1, 23, 5, 23, 329, 8, 23, 10, 23, 12, 23,
    332, 9, 23, 1, 24, 1, 24, 1, 24, 5, 24, 337, 8, 24, 10, 24, 12, 24, 340, 9, 24, 1, 25, 1, 25, 1,
    26, 1, 26, 1, 27, 1, 27, 1, 27, 1, 27, 1, 27, 1, 27, 1, 27, 1, 27, 1, 27, 1, 27, 1, 27, 1, 27,
    1, 27, 5, 27, 359, 8, 27, 10, 27, 12, 27, 362, 9, 27, 1, 27, 1, 27, 1, 27, 1, 27, 1, 27, 1, 27,
    5, 27, 370, 8, 27, 10, 27, 12, 27, 373, 9, 27, 1, 27, 1, 27, 1, 27, 1, 27, 1, 27, 1, 27, 5, 27,
    381, 8, 27, 10, 27, 12, 27, 384, 9, 27, 1, 27, 1, 27, 3, 27, 388, 8, 27, 1, 28, 1, 28, 1, 28, 1,
    29, 1, 29, 1, 29, 1, 29, 5, 29, 397, 8, 29, 10, 29, 12, 29, 400, 9, 29, 1, 30, 1, 30, 3, 30,
    404, 8, 30, 1, 30, 1, 30, 3, 30, 408, 8, 30, 1, 31, 1, 31, 1, 31, 1, 31, 5, 31, 414, 8, 31, 10,
    31, 12, 31, 417, 9, 31, 1, 32, 1, 32, 1, 32, 1, 32, 5, 32, 423, 8, 32, 10, 32, 12, 32, 426, 9,
    32, 1, 33, 1, 33, 1, 33, 1, 33, 5, 33, 432, 8, 33, 10, 33, 12, 33, 435, 9, 33, 1, 34, 1, 34, 1,
    34, 1, 34, 1, 35, 1, 35, 1, 35, 1, 35, 3, 35, 445, 8, 35, 1, 36, 1, 36, 1, 36, 1, 36, 1, 37, 1,
    37, 1, 37, 1, 38, 1, 38, 1, 38, 5, 38, 457, 8, 38, 10, 38, 12, 38, 460, 9, 38, 1, 39, 1, 39, 1,
    39, 1, 39, 1, 40, 1, 40, 1, 41, 1, 41, 3, 41, 470, 8, 41, 1, 42, 3, 42, 473, 8, 42, 1, 42, 1,
    42, 1, 43, 3, 43, 478, 8, 43, 1, 43, 1, 43, 1, 44, 1, 44, 1, 45, 1, 45, 1, 46, 1, 46, 1, 46, 1,
    47, 1, 47, 1, 47, 1, 47, 1, 48, 1, 48, 1, 48, 1, 49, 1, 49, 1, 49, 1, 50, 1, 50, 1, 50, 1, 50,
    3, 50, 503, 8, 50, 1, 50, 1, 50, 1, 50, 1, 50, 5, 50, 509, 8, 50, 10, 50, 12, 50, 512, 9, 50, 3,
    50, 514, 8, 50, 1, 51, 1, 51, 1, 51, 3, 51, 519, 8, 51, 1, 51, 1, 51, 1, 51, 0, 4, 2, 10, 16,
    18, 52, 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44,
    46, 48, 50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70, 72, 74, 76, 78, 80, 82, 84, 86, 88, 90, 92,
    94, 96, 98, 100, 102, 0, 7, 1, 0, 60, 61, 1, 0, 62, 64, 1, 0, 67, 68, 2, 0, 32, 32, 36, 36, 1,
    0, 39, 40, 2, 0, 38, 38, 52, 52, 2, 0, 53, 53, 55, 59, 548, 0, 104, 1, 0, 0, 0, 2, 107, 1, 0, 0,
    0, 4, 123, 1, 0, 0, 0, 6, 138, 1, 0, 0, 0, 8, 140, 1, 0, 0, 0, 10, 171, 1, 0, 0, 0, 12, 198, 1,
    0, 0, 0, 14, 205, 1, 0, 0, 0, 16, 211, 1, 0, 0, 0, 18, 232, 1, 0, 0, 0, 20, 242, 1, 0, 0, 0, 22,
    257, 1, 0, 0, 0, 24, 259, 1, 0, 0, 0, 26, 262, 1, 0, 0, 0, 28, 275, 1, 0, 0, 0, 30, 277, 1, 0,
    0, 0, 32, 289, 1, 0, 0, 0, 34, 293, 1, 0, 0, 0, 36, 295, 1, 0, 0, 0, 38, 304, 1, 0, 0, 0, 40,
    308, 1, 0, 0, 0, 42, 311, 1, 0, 0, 0, 44, 319, 1, 0, 0, 0, 46, 325, 1, 0, 0, 0, 48, 333, 1, 0,
    0, 0, 50, 341, 1, 0, 0, 0, 52, 343, 1, 0, 0, 0, 54, 387, 1, 0, 0, 0, 56, 389, 1, 0, 0, 0, 58,
    392, 1, 0, 0, 0, 60, 401, 1, 0, 0, 0, 62, 409, 1, 0, 0, 0, 64, 418, 1, 0, 0, 0, 66, 427, 1, 0,
    0, 0, 68, 436, 1, 0, 0, 0, 70, 440, 1, 0, 0, 0, 72, 446, 1, 0, 0, 0, 74, 450, 1, 0, 0, 0, 76,
    453, 1, 0, 0, 0, 78, 461, 1, 0, 0, 0, 80, 465, 1, 0, 0, 0, 82, 469, 1, 0, 0, 0, 84, 472, 1, 0,
    0, 0, 86, 477, 1, 0, 0, 0, 88, 481, 1, 0, 0, 0, 90, 483, 1, 0, 0, 0, 92, 485, 1, 0, 0, 0, 94,
    488, 1, 0, 0, 0, 96, 492, 1, 0, 0, 0, 98, 495, 1, 0, 0, 0, 100, 498, 1, 0, 0, 0, 102, 518, 1, 0,
    0, 0, 104, 105, 3, 2, 1, 0, 105, 106, 5, 0, 0, 1, 106, 1, 1, 0, 0, 0, 107, 108, 6, 1, -1, 0,
    108, 109, 3, 4, 2, 0, 109, 115, 1, 0, 0, 0, 110, 111, 10, 1, 0, 0, 111, 112, 5, 26, 0, 0, 112,
    114, 3, 6, 3, 0, 113, 110, 1, 0, 0, 0, 114, 117, 1, 0, 0, 0, 115, 113, 1, 0, 0, 0, 115, 116, 1,
    0, 0, 0, 116, 3, 1, 0, 0, 0, 117, 115, 1, 0, 0, 0, 118, 124, 3, 92, 46, 0, 119, 124, 3, 30, 15,
    0, 120, 124, 3, 24, 12, 0, 121, 124, 3, 96, 48, 0, 122, 124, 3, 98, 49, 0, 123, 118, 1, 0, 0, 0,
    123, 119, 1, 0, 0, 0, 123, 120, 1, 0, 0, 0, 123, 121, 1, 0, 0, 0, 123, 122, 1, 0, 0, 0, 124, 5,
    1, 0, 0, 0, 125, 139, 3, 40, 20, 0, 126, 139, 3, 44, 22, 0, 127, 139, 3, 56, 28, 0, 128, 139, 3,
    62, 31, 0, 129, 139, 3, 58, 29, 0, 130, 139, 3, 42, 21, 0, 131, 139, 3, 8, 4, 0, 132, 139, 3,
    64, 32, 0, 133, 139, 3, 66, 33, 0, 134, 139, 3, 70, 35, 0, 135, 139, 3, 72, 36, 0, 136, 139, 3,
    100, 50, 0, 137, 139, 3, 74, 37, 0, 138, 125, 1, 0, 0, 0, 138, 126, 1, 0, 0, 0, 138, 127, 1, 0,
    0, 0, 138, 128, 1, 0, 0, 0, 138, 129, 1, 0, 0, 0, 138, 130, 1, 0, 0, 0, 138, 131, 1, 0, 0, 0,
    138, 132, 1, 0, 0, 0, 138, 133, 1, 0, 0, 0, 138, 134, 1, 0, 0, 0, 138, 135, 1, 0, 0, 0, 138,
    136, 1, 0, 0, 0, 138, 137, 1, 0, 0, 0, 139, 7, 1, 0, 0, 0, 140, 141, 5, 18, 0, 0, 141, 142, 3,
    10, 5, 0, 142, 9, 1, 0, 0, 0, 143, 144, 6, 5, -1, 0, 144, 145, 5, 45, 0, 0, 145, 172, 3, 10, 5,
    7, 146, 172, 3, 14, 7, 0, 147, 172, 3, 12, 6, 0, 148, 150, 3, 14, 7, 0, 149, 151, 5, 45, 0, 0,
    150, 149, 1, 0, 0, 0, 150, 151, 1, 0, 0, 0, 151, 152, 1, 0, 0, 0, 152, 153, 5, 42, 0, 0, 153,
    154, 5, 41, 0, 0, 154, 159, 3, 14, 7, 0, 155, 156, 5, 35, 0, 0, 156, 158, 3, 14, 7, 0, 157, 155,
    1, 0, 0, 0, 158, 161, 1, 0, 0, 0, 159, 157, 1, 0, 0, 0, 159, 160, 1, 0, 0, 0, 160, 162, 1, 0, 0,
    0, 161, 159, 1, 0, 0, 0, 162, 163, 5, 51, 0, 0, 163, 172, 1, 0, 0, 0, 164, 165, 3, 14, 7, 0,
    165, 167, 5, 43, 0, 0, 166, 168, 5, 45, 0, 0, 167, 166, 1, 0, 0, 0, 167, 168, 1, 0, 0, 0, 168,
    169, 1, 0, 0, 0, 169, 170, 5, 46, 0, 0, 170, 172, 1, 0, 0, 0, 171, 143, 1, 0, 0, 0, 171, 146, 1,
    0, 0, 0, 171, 147, 1, 0, 0, 0, 171, 148, 1, 0, 0, 0, 171, 164, 1, 0, 0, 0, 172, 181, 1, 0, 0, 0,
    173, 174, 10, 4, 0, 0, 174, 175, 5, 31, 0, 0, 175, 180, 3, 10, 5, 5, 176, 177, 10, 3, 0, 0, 177,
    178, 5, 48, 0, 0, 178, 180, 3, 10, 5, 4, 179, 173, 1, 0, 0, 0, 179, 176, 1, 0, 0, 0, 180, 183,
    1, 0, 0, 0, 181, 179, 1, 0, 0, 0, 181, 182, 1, 0, 0, 0, 182, 11, 1, 0, 0, 0, 183, 181, 1, 0, 0,
    0, 184, 186, 3, 14, 7, 0, 185, 187, 5, 45, 0, 0, 186, 185, 1, 0, 0, 0, 186, 187, 1, 0, 0, 0,
    187, 188, 1, 0, 0, 0, 188, 189, 5, 44, 0, 0, 189, 190, 3, 88, 44, 0, 190, 199, 1, 0, 0, 0, 191,
    193, 3, 14, 7, 0, 192, 194, 5, 45, 0, 0, 193, 192, 1, 0, 0, 0, 193, 194, 1, 0, 0, 0, 194, 195,
    1, 0, 0, 0, 195, 196, 5, 50, 0, 0, 196, 197, 3, 88, 44, 0, 197, 199, 1, 0, 0, 0, 198, 184, 1, 0,
    0, 0, 198, 191, 1, 0, 0, 0, 199, 13, 1, 0, 0, 0, 200, 206, 3, 16, 8, 0, 201, 202, 3, 16, 8, 0,
    202, 203, 3, 90, 45, 0, 203, 204, 3, 16, 8, 0, 204, 206, 1, 0, 0, 0, 205, 200, 1, 0, 0, 0, 205,
    201, 1, 0, 0, 0, 206, 15, 1, 0, 0, 0, 207, 208, 6, 8, -1, 0, 208, 212, 3, 18, 9, 0, 209, 210, 7,
    0, 0, 0, 210, 212, 3, 16, 8, 3, 211, 207, 1, 0, 0, 0, 211, 209, 1, 0, 0, 0, 212, 221, 1, 0, 0,
    0, 213, 214, 10, 2, 0, 0, 214, 215, 7, 1, 0, 0, 215, 220, 3, 16, 8, 3, 216, 217, 10, 1, 0, 0,
    217, 218, 7, 0, 0, 0, 218, 220, 3, 16, 8, 2, 219, 213, 1, 0, 0, 0, 219, 216, 1, 0, 0, 0, 220,
    223, 1, 0, 0, 0, 221, 219, 1, 0, 0, 0, 221, 222, 1, 0, 0, 0, 222, 17, 1, 0, 0, 0, 223, 221, 1,
    0, 0, 0, 224, 225, 6, 9, -1, 0, 225, 233, 3, 54, 27, 0, 226, 233, 3, 46, 23, 0, 227, 233, 3, 20,
    10, 0, 228, 229, 5, 41, 0, 0, 229, 230, 3, 10, 5, 0, 230, 231, 5, 51, 0, 0, 231, 233, 1, 0, 0,
    0, 232, 224, 1, 0, 0, 0, 232, 226, 1, 0, 0, 0, 232, 227, 1, 0, 0, 0, 232, 228, 1, 0, 0, 0, 233,
    239, 1, 0, 0, 0, 234, 235, 10, 1, 0, 0, 235, 236, 5, 34, 0, 0, 236, 238, 3, 22, 11, 0, 237, 234,
    1, 0, 0, 0, 238, 241, 1, 0, 0, 0, 239, 237, 1, 0, 0, 0, 239, 240, 1, 0, 0, 0, 240, 19, 1, 0, 0,
    0, 241, 239, 1, 0, 0, 0, 242, 243, 3, 50, 25, 0, 243, 253, 5, 41, 0, 0, 244, 254, 5, 62, 0, 0,
    245, 250, 3, 10, 5, 0, 246, 247, 5, 35, 0, 0, 247, 249, 3, 10, 5, 0, 248, 246, 1, 0, 0, 0, 249,
    252, 1, 0, 0, 0, 250, 248, 1, 0, 0, 0, 250, 251, 1, 0, 0, 0, 251, 254, 1, 0, 0, 0, 252, 250, 1,
    0, 0, 0, 253, 244, 1, 0, 0, 0, 253, 245, 1, 0, 0, 0, 253, 254, 1, 0, 0, 0, 254, 255, 1, 0, 0, 0,
    255, 256, 5, 51, 0, 0, 256, 21, 1, 0, 0, 0, 257, 258, 3, 50, 25, 0, 258, 23, 1, 0, 0, 0, 259,
    260, 5, 14, 0, 0, 260, 261, 3, 26, 13, 0, 261, 25, 1, 0, 0, 0, 262, 267, 3, 28, 14, 0, 263, 264,
    5, 35, 0, 0, 264, 266, 3, 28, 14, 0, 265, 263, 1, 0, 0, 0, 266, 269, 1, 0, 0, 0, 267, 265, 1, 0,
    0, 0, 267, 268, 1, 0, 0, 0, 268, 27, 1, 0, 0, 0, 269, 267, 1, 0, 0, 0, 270, 276, 3, 10, 5, 0,
    271, 272, 3, 46, 23, 0, 272, 273, 5, 33, 0, 0, 273, 274, 3, 10, 5, 0, 274, 276, 1, 0, 0, 0, 275,
    270, 1, 0, 0, 0, 275, 271, 1, 0, 0, 0, 276, 29, 1, 0, 0, 0, 277, 278, 5, 6, 0, 0, 278, 283, 3,
    32, 16, 0, 279, 280, 5, 35, 0, 0, 280, 282, 3, 32, 16, 0, 281, 279, 1, 0, 0, 0, 282, 285, 1, 0,
    0, 0, 283, 281, 1, 0, 0, 0, 283, 284, 1, 0, 0, 0, 284, 287, 1, 0, 0, 0, 285, 283, 1, 0, 0, 0,
    286, 288, 3, 34, 17, 0, 287, 286, 1, 0, 0, 0, 287, 288, 1, 0, 0, 0, 288, 31, 1, 0, 0, 0, 289,
    290, 5, 73, 0, 0, 290, 33, 1, 0, 0, 0, 291, 294, 3, 36, 18, 0, 292, 294, 3, 38, 19, 0, 293, 291,
    1, 0, 0, 0, 293, 292, 1, 0, 0, 0, 294, 35, 1, 0, 0, 0, 295, 296, 5, 72, 0, 0, 296, 301, 3, 32,
    16, 0, 297, 298, 5, 35, 0, 0, 298, 300, 3, 32, 16, 0, 299, 297, 1, 0, 0, 0, 300, 303, 1, 0, 0,
    0, 301, 299, 1, 0, 0, 0, 301, 302, 1, 0, 0, 0, 302, 37, 1, 0, 0, 0, 303, 301, 1, 0, 0, 0, 304,
    305, 5, 65, 0, 0, 305, 306, 3, 36, 18, 0, 306, 307, 5, 66, 0, 0, 307, 39, 1, 0, 0, 0, 308, 309,
    5, 4, 0, 0, 309, 310, 3, 26, 13, 0, 310, 41, 1, 0, 0, 0, 311, 313, 5, 17, 0, 0, 312, 314, 3, 26,
    13, 0, 313, 312, 1, 0, 0, 0, 313, 314, 1, 0, 0, 0, 314, 317, 1, 0, 0, 0, 315, 316, 5, 30, 0, 0,
    316, 318, 3, 26, 13, 0, 317, 315, 1, 0, 0, 0, 317, 318, 1, 0, 0, 0, 318, 43, 1, 0, 0, 0, 319,
    320, 5, 8, 0, 0, 320, 323, 3, 26, 13, 0, 321, 322, 5, 30, 0, 0, 322, 324, 3, 26, 13, 0, 323,
    321, 1, 0, 0, 0, 323, 324, 1, 0, 0, 0, 324, 45, 1, 0, 0, 0, 325, 330, 3, 50, 25, 0, 326, 327, 5,
    37, 0, 0, 327, 329, 3, 50, 25, 0, 328, 326, 1, 0, 0, 0, 329, 332, 1, 0, 0, 0, 330, 328, 1, 0, 0,
    0, 330, 331, 1, 0, 0, 0, 331, 47, 1, 0, 0, 0, 332, 330, 1, 0, 0, 0, 333, 338, 3, 52, 26, 0, 334,
    335, 5, 37, 0, 0, 335, 337, 3, 52, 26, 0, 336, 334, 1, 0, 0, 0, 337, 340, 1, 0, 0, 0, 338, 336,
    1, 0, 0, 0, 338, 339, 1, 0, 0, 0, 339, 49, 1, 0, 0, 0, 340, 338, 1, 0, 0, 0, 341, 342, 7, 2, 0,
    0, 342, 51, 1, 0, 0, 0, 343, 344, 5, 77, 0, 0, 344, 53, 1, 0, 0, 0, 345, 388, 5, 46, 0, 0, 346,
    347, 3, 86, 43, 0, 347, 348, 5, 67, 0, 0, 348, 388, 1, 0, 0, 0, 349, 388, 3, 84, 42, 0, 350,
    388, 3, 86, 43, 0, 351, 388, 3, 80, 40, 0, 352, 388, 5, 49, 0, 0, 353, 388, 3, 88, 44, 0, 354,
    355, 5, 65, 0, 0, 355, 360, 3, 82, 41, 0, 356, 357, 5, 35, 0, 0, 357, 359, 3, 82, 41, 0, 358,
    356, 1, 0, 0, 0, 359, 362, 1, 0, 0, 0, 360, 358, 1, 0, 0, 0, 360, 361, 1, 0, 0, 0, 361, 363, 1,
    0, 0, 0, 362, 360, 1, 0, 0, 0, 363, 364, 5, 66, 0, 0, 364, 388, 1, 0, 0, 0, 365, 366, 5, 65, 0,
    0, 366, 371, 3, 80, 40, 0, 367, 368, 5, 35, 0, 0, 368, 370, 3, 80, 40, 0, 369, 367, 1, 0, 0, 0,
    370, 373, 1, 0, 0, 0, 371, 369, 1, 0, 0, 0, 371, 372, 1, 0, 0, 0, 372, 374, 1, 0, 0, 0, 373,
    371, 1, 0, 0, 0, 374, 375, 5, 66, 0, 0, 375, 388, 1, 0, 0, 0, 376, 377, 5, 65, 0, 0, 377, 382,
    3, 88, 44, 0, 378, 379, 5, 35, 0, 0, 379, 381, 3, 88, 44, 0, 380, 378, 1, 0, 0, 0, 381, 384, 1,
    0, 0, 0, 382, 380, 1, 0, 0, 0, 382, 383, 1, 0, 0, 0, 383, 385, 1, 0, 0, 0, 384, 382, 1, 0, 0, 0,
    385, 386, 5, 66, 0, 0, 386, 388, 1, 0, 0, 0, 387, 345, 1, 0, 0, 0, 387, 346, 1, 0, 0, 0, 387,
    349, 1, 0, 0, 0, 387, 350, 1, 0, 0, 0, 387, 351, 1, 0, 0, 0, 387, 352, 1, 0, 0, 0, 387, 353, 1,
    0, 0, 0, 387, 354, 1, 0, 0, 0, 387, 365, 1, 0, 0, 0, 387, 376, 1, 0, 0, 0, 388, 55, 1, 0, 0, 0,
    389, 390, 5, 10, 0, 0, 390, 391, 5, 28, 0, 0, 391, 57, 1, 0, 0, 0, 392, 393, 5, 16, 0, 0, 393,
    398, 3, 60, 30, 0, 394, 395, 5, 35, 0, 0, 395, 397, 3, 60, 30, 0, 396, 394, 1, 0, 0, 0, 397,
    400, 1, 0, 0, 0, 398, 396, 1, 0, 0, 0, 398, 399, 1, 0, 0, 0, 399, 59, 1, 0, 0, 0, 400, 398, 1,
    0, 0, 0, 401, 403, 3, 10, 5, 0, 402, 404, 7, 3, 0, 0, 403, 402, 1, 0, 0, 0, 403, 404, 1, 0, 0,
    0, 404, 407, 1, 0, 0, 0, 405, 406, 5, 47, 0, 0, 406, 408, 7, 4, 0, 0, 407, 405, 1, 0, 0, 0, 407,
    408, 1, 0, 0, 0, 408, 61, 1, 0, 0, 0, 409, 410, 5, 9, 0, 0, 410, 415, 3, 48, 24, 0, 411, 412, 5,
    35, 0, 0, 412, 414, 3, 48, 24, 0, 413, 411, 1, 0, 0, 0, 414, 417, 1, 0, 0, 0, 415, 413, 1, 0, 0,
    0, 415, 416, 1, 0, 0, 0, 416, 63, 1, 0, 0, 0, 417, 415, 1, 0, 0, 0, 418, 419, 5, 2, 0, 0, 419,
    424, 3, 48, 24, 0, 420, 421, 5, 35, 0, 0, 421, 423, 3, 48, 24, 0, 422, 420, 1, 0, 0, 0, 423,
    426, 1, 0, 0, 0, 424, 422, 1, 0, 0, 0, 424, 425, 1, 0, 0, 0, 425, 65, 1, 0, 0, 0, 426, 424, 1,
    0, 0, 0, 427, 428, 5, 13, 0, 0, 428, 433, 3, 68, 34, 0, 429, 430, 5, 35, 0, 0, 430, 432, 3, 68,
    34, 0, 431, 429, 1, 0, 0, 0, 432, 435, 1, 0, 0, 0, 433, 431, 1, 0, 0, 0, 433, 434, 1, 0, 0, 0,
    434, 67, 1, 0, 0, 0, 435, 433, 1, 0, 0, 0, 436, 437, 3, 48, 24, 0, 437, 438, 5, 81, 0, 0, 438,
    439, 3, 48, 24, 0, 439, 69, 1, 0, 0, 0, 440, 441, 5, 1, 0, 0, 441, 442, 3, 18, 9, 0, 442, 444,
    3, 88, 44, 0, 443, 445, 3, 76, 38, 0, 444, 443, 1, 0, 0, 0, 444, 445, 1, 0, 0, 0, 445, 71, 1, 0,
    0, 0, 446, 447, 5, 7, 0, 0, 447, 448, 3, 18, 9, 0, 448, 449, 3, 88, 44, 0, 449, 73, 1, 0, 0, 0,
    450, 451, 5, 12, 0, 0, 451, 452, 3, 46, 23, 0, 452, 75, 1, 0, 0, 0, 453, 458, 3, 78, 39, 0, 454,
    455, 5, 35, 0, 0, 455, 457, 3, 78, 39, 0, 456, 454, 1, 0, 0, 0, 457, 460, 1, 0, 0, 0, 458, 456,
    1, 0, 0, 0, 458, 459, 1, 0, 0, 0, 459, 77, 1, 0, 0, 0, 460, 458, 1, 0, 0, 0, 461, 462, 3, 50,
    25, 0, 462, 463, 5, 33, 0, 0, 463, 464, 3, 54, 27, 0, 464, 79, 1, 0, 0, 0, 465, 466, 7, 5, 0, 0,
    466, 81, 1, 0, 0, 0, 467, 470, 3, 84, 42, 0, 468, 470, 3, 86, 43, 0, 469, 467, 1, 0, 0, 0, 469,
    468, 1, 0, 0, 0, 470, 83, 1, 0, 0, 0, 471, 473, 7, 0, 0, 0, 472, 471, 1, 0, 0, 0, 472, 473, 1,
    0, 0, 0, 473, 474, 1, 0, 0, 0, 474, 475, 5, 29, 0, 0, 475, 85, 1, 0, 0, 0, 476, 478, 7, 0, 0, 0,
    477, 476, 1, 0, 0, 0, 477, 478, 1, 0, 0, 0, 478, 479, 1, 0, 0, 0, 479, 480, 5, 28, 0, 0, 480,
    87, 1, 0, 0, 0, 481, 482, 5, 27, 0, 0, 482, 89, 1, 0, 0, 0, 483, 484, 7, 6, 0, 0, 484, 91, 1, 0,
    0, 0, 485, 486, 5, 5, 0, 0, 486, 487, 3, 94, 47, 0, 487, 93, 1, 0, 0, 0, 488, 489, 5, 65, 0, 0,
    489, 490, 3, 2, 1, 0, 490, 491, 5, 66, 0, 0, 491, 95, 1, 0, 0, 0, 492, 493, 5, 15, 0, 0, 493,
    494, 5, 97, 0, 0, 494, 97, 1, 0, 0, 0, 495, 496, 5, 11, 0, 0, 496, 497, 5, 101, 0, 0, 497, 99,
    1, 0, 0, 0, 498, 499, 5, 3, 0, 0, 499, 502, 5, 87, 0, 0, 500, 501, 5, 85, 0, 0, 501, 503, 3, 48,
    24, 0, 502, 500, 1, 0, 0, 0, 502, 503, 1, 0, 0, 0, 503, 513, 1, 0, 0, 0, 504, 505, 5, 86, 0, 0,
    505, 510, 3, 102, 51, 0, 506, 507, 5, 35, 0, 0, 507, 509, 3, 102, 51, 0, 508, 506, 1, 0, 0, 0,
    509, 512, 1, 0, 0, 0, 510, 508, 1, 0, 0, 0, 510, 511, 1, 0, 0, 0, 511, 514, 1, 0, 0, 0, 512,
    510, 1, 0, 0, 0, 513, 504, 1, 0, 0, 0, 513, 514, 1, 0, 0, 0, 514, 101, 1, 0, 0, 0, 515, 516, 3,
    48, 24, 0, 516, 517, 5, 33, 0, 0, 517, 519, 1, 0, 0, 0, 518, 515, 1, 0, 0, 0, 518, 519, 1, 0, 0,
    0, 519, 520, 1, 0, 0, 0, 520, 521, 3, 48, 24, 0, 521, 103, 1, 0, 0, 0, 50, 115, 123, 138, 150,
    159, 167, 171, 179, 181, 186, 193, 198, 205, 211, 219, 221, 232, 239, 250, 253, 267, 275, 283,
    287, 293, 301, 313, 317, 323, 330, 338, 360, 371, 382, 387, 398, 403, 407, 415, 424, 433, 444,
    458, 469, 472, 477, 502, 510, 513, 518,
  ];

  private static __ATN: ATN;
  public static get _ATN(): ATN {
    if (!esql_parser.__ATN) {
      esql_parser.__ATN = new ATNDeserializer().deserialize(esql_parser._serializedATN);
    }

    return esql_parser.__ATN;
  }

  static DecisionsToDFA = esql_parser._ATN.decisionToState.map(
    (ds: DecisionState, index: number) => new DFA(ds, index)
  );
}

export class SingleStatementContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public query(): QueryContext {
    return this.getTypedRuleContext(QueryContext, 0) as QueryContext;
  }
  public EOF(): TerminalNode {
    return this.getToken(esql_parser.EOF, 0);
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_singleStatement;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterSingleStatement) {
      listener.enterSingleStatement(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitSingleStatement) {
      listener.exitSingleStatement(this);
    }
  }
}

export class QueryContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_query;
  }
  public copyFrom(ctx: QueryContext): void {
    super.copyFrom(ctx);
  }
}
export class CompositeQueryContext extends QueryContext {
  constructor(parser: esql_parser, ctx: QueryContext) {
    super(parser, ctx.parentCtx, ctx.invokingState);
    super.copyFrom(ctx);
  }
  public query(): QueryContext {
    return this.getTypedRuleContext(QueryContext, 0) as QueryContext;
  }
  public PIPE(): TerminalNode {
    return this.getToken(esql_parser.PIPE, 0);
  }
  public processingCommand(): ProcessingCommandContext {
    return this.getTypedRuleContext(ProcessingCommandContext, 0) as ProcessingCommandContext;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterCompositeQuery) {
      listener.enterCompositeQuery(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitCompositeQuery) {
      listener.exitCompositeQuery(this);
    }
  }
}
export class SingleCommandQueryContext extends QueryContext {
  constructor(parser: esql_parser, ctx: QueryContext) {
    super(parser, ctx.parentCtx, ctx.invokingState);
    super.copyFrom(ctx);
  }
  public sourceCommand(): SourceCommandContext {
    return this.getTypedRuleContext(SourceCommandContext, 0) as SourceCommandContext;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterSingleCommandQuery) {
      listener.enterSingleCommandQuery(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitSingleCommandQuery) {
      listener.exitSingleCommandQuery(this);
    }
  }
}

export class SourceCommandContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public explainCommand(): ExplainCommandContext {
    return this.getTypedRuleContext(ExplainCommandContext, 0) as ExplainCommandContext;
  }
  public fromCommand(): FromCommandContext {
    return this.getTypedRuleContext(FromCommandContext, 0) as FromCommandContext;
  }
  public rowCommand(): RowCommandContext {
    return this.getTypedRuleContext(RowCommandContext, 0) as RowCommandContext;
  }
  public showCommand(): ShowCommandContext {
    return this.getTypedRuleContext(ShowCommandContext, 0) as ShowCommandContext;
  }
  public metaCommand(): MetaCommandContext {
    return this.getTypedRuleContext(MetaCommandContext, 0) as MetaCommandContext;
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_sourceCommand;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterSourceCommand) {
      listener.enterSourceCommand(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitSourceCommand) {
      listener.exitSourceCommand(this);
    }
  }
}

export class ProcessingCommandContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public evalCommand(): EvalCommandContext {
    return this.getTypedRuleContext(EvalCommandContext, 0) as EvalCommandContext;
  }
  public inlinestatsCommand(): InlinestatsCommandContext {
    return this.getTypedRuleContext(InlinestatsCommandContext, 0) as InlinestatsCommandContext;
  }
  public limitCommand(): LimitCommandContext {
    return this.getTypedRuleContext(LimitCommandContext, 0) as LimitCommandContext;
  }
  public keepCommand(): KeepCommandContext {
    return this.getTypedRuleContext(KeepCommandContext, 0) as KeepCommandContext;
  }
  public sortCommand(): SortCommandContext {
    return this.getTypedRuleContext(SortCommandContext, 0) as SortCommandContext;
  }
  public statsCommand(): StatsCommandContext {
    return this.getTypedRuleContext(StatsCommandContext, 0) as StatsCommandContext;
  }
  public whereCommand(): WhereCommandContext {
    return this.getTypedRuleContext(WhereCommandContext, 0) as WhereCommandContext;
  }
  public dropCommand(): DropCommandContext {
    return this.getTypedRuleContext(DropCommandContext, 0) as DropCommandContext;
  }
  public renameCommand(): RenameCommandContext {
    return this.getTypedRuleContext(RenameCommandContext, 0) as RenameCommandContext;
  }
  public dissectCommand(): DissectCommandContext {
    return this.getTypedRuleContext(DissectCommandContext, 0) as DissectCommandContext;
  }
  public grokCommand(): GrokCommandContext {
    return this.getTypedRuleContext(GrokCommandContext, 0) as GrokCommandContext;
  }
  public enrichCommand(): EnrichCommandContext {
    return this.getTypedRuleContext(EnrichCommandContext, 0) as EnrichCommandContext;
  }
  public mvExpandCommand(): MvExpandCommandContext {
    return this.getTypedRuleContext(MvExpandCommandContext, 0) as MvExpandCommandContext;
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_processingCommand;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterProcessingCommand) {
      listener.enterProcessingCommand(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitProcessingCommand) {
      listener.exitProcessingCommand(this);
    }
  }
}

export class WhereCommandContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public WHERE(): TerminalNode {
    return this.getToken(esql_parser.WHERE, 0);
  }
  public booleanExpression(): BooleanExpressionContext {
    return this.getTypedRuleContext(BooleanExpressionContext, 0) as BooleanExpressionContext;
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_whereCommand;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterWhereCommand) {
      listener.enterWhereCommand(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitWhereCommand) {
      listener.exitWhereCommand(this);
    }
  }
}

export class BooleanExpressionContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_booleanExpression;
  }
  public copyFrom(ctx: BooleanExpressionContext): void {
    super.copyFrom(ctx);
  }
}
export class LogicalNotContext extends BooleanExpressionContext {
  constructor(parser: esql_parser, ctx: BooleanExpressionContext) {
    super(parser, ctx.parentCtx, ctx.invokingState);
    super.copyFrom(ctx);
  }
  public NOT(): TerminalNode {
    return this.getToken(esql_parser.NOT, 0);
  }
  public booleanExpression(): BooleanExpressionContext {
    return this.getTypedRuleContext(BooleanExpressionContext, 0) as BooleanExpressionContext;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterLogicalNot) {
      listener.enterLogicalNot(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitLogicalNot) {
      listener.exitLogicalNot(this);
    }
  }
}
export class BooleanDefaultContext extends BooleanExpressionContext {
  constructor(parser: esql_parser, ctx: BooleanExpressionContext) {
    super(parser, ctx.parentCtx, ctx.invokingState);
    super.copyFrom(ctx);
  }
  public valueExpression(): ValueExpressionContext {
    return this.getTypedRuleContext(ValueExpressionContext, 0) as ValueExpressionContext;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterBooleanDefault) {
      listener.enterBooleanDefault(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitBooleanDefault) {
      listener.exitBooleanDefault(this);
    }
  }
}
export class IsNullContext extends BooleanExpressionContext {
  constructor(parser: esql_parser, ctx: BooleanExpressionContext) {
    super(parser, ctx.parentCtx, ctx.invokingState);
    super.copyFrom(ctx);
  }
  public valueExpression(): ValueExpressionContext {
    return this.getTypedRuleContext(ValueExpressionContext, 0) as ValueExpressionContext;
  }
  public IS(): TerminalNode {
    return this.getToken(esql_parser.IS, 0);
  }
  public NULL(): TerminalNode {
    return this.getToken(esql_parser.NULL, 0);
  }
  public NOT(): TerminalNode {
    return this.getToken(esql_parser.NOT, 0);
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterIsNull) {
      listener.enterIsNull(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitIsNull) {
      listener.exitIsNull(this);
    }
  }
}
export class RegexExpressionContext extends BooleanExpressionContext {
  constructor(parser: esql_parser, ctx: BooleanExpressionContext) {
    super(parser, ctx.parentCtx, ctx.invokingState);
    super.copyFrom(ctx);
  }
  public regexBooleanExpression(): RegexBooleanExpressionContext {
    return this.getTypedRuleContext(
      RegexBooleanExpressionContext,
      0
    ) as RegexBooleanExpressionContext;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterRegexExpression) {
      listener.enterRegexExpression(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitRegexExpression) {
      listener.exitRegexExpression(this);
    }
  }
}
export class LogicalInContext extends BooleanExpressionContext {
  constructor(parser: esql_parser, ctx: BooleanExpressionContext) {
    super(parser, ctx.parentCtx, ctx.invokingState);
    super.copyFrom(ctx);
  }
  public valueExpression_list(): ValueExpressionContext[] {
    return this.getTypedRuleContexts(ValueExpressionContext) as ValueExpressionContext[];
  }
  public valueExpression(i: number): ValueExpressionContext {
    return this.getTypedRuleContext(ValueExpressionContext, i) as ValueExpressionContext;
  }
  public IN(): TerminalNode {
    return this.getToken(esql_parser.IN, 0);
  }
  public LP(): TerminalNode {
    return this.getToken(esql_parser.LP, 0);
  }
  public RP(): TerminalNode {
    return this.getToken(esql_parser.RP, 0);
  }
  public NOT(): TerminalNode {
    return this.getToken(esql_parser.NOT, 0);
  }
  public COMMA_list(): TerminalNode[] {
    return this.getTokens(esql_parser.COMMA);
  }
  public COMMA(i: number): TerminalNode {
    return this.getToken(esql_parser.COMMA, i);
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterLogicalIn) {
      listener.enterLogicalIn(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitLogicalIn) {
      listener.exitLogicalIn(this);
    }
  }
}
export class LogicalBinaryContext extends BooleanExpressionContext {
  public _left!: BooleanExpressionContext;
  public _operator!: Token;
  public _right!: BooleanExpressionContext;
  constructor(parser: esql_parser, ctx: BooleanExpressionContext) {
    super(parser, ctx.parentCtx, ctx.invokingState);
    super.copyFrom(ctx);
  }
  public booleanExpression_list(): BooleanExpressionContext[] {
    return this.getTypedRuleContexts(BooleanExpressionContext) as BooleanExpressionContext[];
  }
  public booleanExpression(i: number): BooleanExpressionContext {
    return this.getTypedRuleContext(BooleanExpressionContext, i) as BooleanExpressionContext;
  }
  public AND(): TerminalNode {
    return this.getToken(esql_parser.AND, 0);
  }
  public OR(): TerminalNode {
    return this.getToken(esql_parser.OR, 0);
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterLogicalBinary) {
      listener.enterLogicalBinary(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitLogicalBinary) {
      listener.exitLogicalBinary(this);
    }
  }
}

export class RegexBooleanExpressionContext extends ParserRuleContext {
  public _kind!: Token;
  public _pattern!: StringContext;
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public valueExpression(): ValueExpressionContext {
    return this.getTypedRuleContext(ValueExpressionContext, 0) as ValueExpressionContext;
  }
  public LIKE(): TerminalNode {
    return this.getToken(esql_parser.LIKE, 0);
  }
  public string_(): StringContext {
    return this.getTypedRuleContext(StringContext, 0) as StringContext;
  }
  public NOT(): TerminalNode {
    return this.getToken(esql_parser.NOT, 0);
  }
  public RLIKE(): TerminalNode {
    return this.getToken(esql_parser.RLIKE, 0);
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_regexBooleanExpression;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterRegexBooleanExpression) {
      listener.enterRegexBooleanExpression(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitRegexBooleanExpression) {
      listener.exitRegexBooleanExpression(this);
    }
  }
}

export class ValueExpressionContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_valueExpression;
  }
  public copyFrom(ctx: ValueExpressionContext): void {
    super.copyFrom(ctx);
  }
}
export class ValueExpressionDefaultContext extends ValueExpressionContext {
  constructor(parser: esql_parser, ctx: ValueExpressionContext) {
    super(parser, ctx.parentCtx, ctx.invokingState);
    super.copyFrom(ctx);
  }
  public operatorExpression(): OperatorExpressionContext {
    return this.getTypedRuleContext(OperatorExpressionContext, 0) as OperatorExpressionContext;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterValueExpressionDefault) {
      listener.enterValueExpressionDefault(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitValueExpressionDefault) {
      listener.exitValueExpressionDefault(this);
    }
  }
}
export class ComparisonContext extends ValueExpressionContext {
  public _left!: OperatorExpressionContext;
  public _right!: OperatorExpressionContext;
  constructor(parser: esql_parser, ctx: ValueExpressionContext) {
    super(parser, ctx.parentCtx, ctx.invokingState);
    super.copyFrom(ctx);
  }
  public comparisonOperator(): ComparisonOperatorContext {
    return this.getTypedRuleContext(ComparisonOperatorContext, 0) as ComparisonOperatorContext;
  }
  public operatorExpression_list(): OperatorExpressionContext[] {
    return this.getTypedRuleContexts(OperatorExpressionContext) as OperatorExpressionContext[];
  }
  public operatorExpression(i: number): OperatorExpressionContext {
    return this.getTypedRuleContext(OperatorExpressionContext, i) as OperatorExpressionContext;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterComparison) {
      listener.enterComparison(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitComparison) {
      listener.exitComparison(this);
    }
  }
}

export class OperatorExpressionContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_operatorExpression;
  }
  public copyFrom(ctx: OperatorExpressionContext): void {
    super.copyFrom(ctx);
  }
}
export class OperatorExpressionDefaultContext extends OperatorExpressionContext {
  constructor(parser: esql_parser, ctx: OperatorExpressionContext) {
    super(parser, ctx.parentCtx, ctx.invokingState);
    super.copyFrom(ctx);
  }
  public primaryExpression(): PrimaryExpressionContext {
    return this.getTypedRuleContext(PrimaryExpressionContext, 0) as PrimaryExpressionContext;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterOperatorExpressionDefault) {
      listener.enterOperatorExpressionDefault(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitOperatorExpressionDefault) {
      listener.exitOperatorExpressionDefault(this);
    }
  }
}
export class ArithmeticBinaryContext extends OperatorExpressionContext {
  public _left!: OperatorExpressionContext;
  public _operator!: Token;
  public _right!: OperatorExpressionContext;
  constructor(parser: esql_parser, ctx: OperatorExpressionContext) {
    super(parser, ctx.parentCtx, ctx.invokingState);
    super.copyFrom(ctx);
  }
  public operatorExpression_list(): OperatorExpressionContext[] {
    return this.getTypedRuleContexts(OperatorExpressionContext) as OperatorExpressionContext[];
  }
  public operatorExpression(i: number): OperatorExpressionContext {
    return this.getTypedRuleContext(OperatorExpressionContext, i) as OperatorExpressionContext;
  }
  public ASTERISK(): TerminalNode {
    return this.getToken(esql_parser.ASTERISK, 0);
  }
  public SLASH(): TerminalNode {
    return this.getToken(esql_parser.SLASH, 0);
  }
  public PERCENT(): TerminalNode {
    return this.getToken(esql_parser.PERCENT, 0);
  }
  public PLUS(): TerminalNode {
    return this.getToken(esql_parser.PLUS, 0);
  }
  public MINUS(): TerminalNode {
    return this.getToken(esql_parser.MINUS, 0);
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterArithmeticBinary) {
      listener.enterArithmeticBinary(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitArithmeticBinary) {
      listener.exitArithmeticBinary(this);
    }
  }
}
export class ArithmeticUnaryContext extends OperatorExpressionContext {
  public _operator!: Token;
  constructor(parser: esql_parser, ctx: OperatorExpressionContext) {
    super(parser, ctx.parentCtx, ctx.invokingState);
    super.copyFrom(ctx);
  }
  public operatorExpression(): OperatorExpressionContext {
    return this.getTypedRuleContext(OperatorExpressionContext, 0) as OperatorExpressionContext;
  }
  public MINUS(): TerminalNode {
    return this.getToken(esql_parser.MINUS, 0);
  }
  public PLUS(): TerminalNode {
    return this.getToken(esql_parser.PLUS, 0);
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterArithmeticUnary) {
      listener.enterArithmeticUnary(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitArithmeticUnary) {
      listener.exitArithmeticUnary(this);
    }
  }
}

export class PrimaryExpressionContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_primaryExpression;
  }
  public copyFrom(ctx: PrimaryExpressionContext): void {
    super.copyFrom(ctx);
  }
}
export class DereferenceContext extends PrimaryExpressionContext {
  constructor(parser: esql_parser, ctx: PrimaryExpressionContext) {
    super(parser, ctx.parentCtx, ctx.invokingState);
    super.copyFrom(ctx);
  }
  public qualifiedName(): QualifiedNameContext {
    return this.getTypedRuleContext(QualifiedNameContext, 0) as QualifiedNameContext;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterDereference) {
      listener.enterDereference(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitDereference) {
      listener.exitDereference(this);
    }
  }
}
export class InlineCastContext extends PrimaryExpressionContext {
  constructor(parser: esql_parser, ctx: PrimaryExpressionContext) {
    super(parser, ctx.parentCtx, ctx.invokingState);
    super.copyFrom(ctx);
  }
  public primaryExpression(): PrimaryExpressionContext {
    return this.getTypedRuleContext(PrimaryExpressionContext, 0) as PrimaryExpressionContext;
  }
  public CAST_OP(): TerminalNode {
    return this.getToken(esql_parser.CAST_OP, 0);
  }
  public dataType(): DataTypeContext {
    return this.getTypedRuleContext(DataTypeContext, 0) as DataTypeContext;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterInlineCast) {
      listener.enterInlineCast(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitInlineCast) {
      listener.exitInlineCast(this);
    }
  }
}
export class ConstantDefaultContext extends PrimaryExpressionContext {
  constructor(parser: esql_parser, ctx: PrimaryExpressionContext) {
    super(parser, ctx.parentCtx, ctx.invokingState);
    super.copyFrom(ctx);
  }
  public constant(): ConstantContext {
    return this.getTypedRuleContext(ConstantContext, 0) as ConstantContext;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterConstantDefault) {
      listener.enterConstantDefault(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitConstantDefault) {
      listener.exitConstantDefault(this);
    }
  }
}
export class ParenthesizedExpressionContext extends PrimaryExpressionContext {
  constructor(parser: esql_parser, ctx: PrimaryExpressionContext) {
    super(parser, ctx.parentCtx, ctx.invokingState);
    super.copyFrom(ctx);
  }
  public LP(): TerminalNode {
    return this.getToken(esql_parser.LP, 0);
  }
  public booleanExpression(): BooleanExpressionContext {
    return this.getTypedRuleContext(BooleanExpressionContext, 0) as BooleanExpressionContext;
  }
  public RP(): TerminalNode {
    return this.getToken(esql_parser.RP, 0);
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterParenthesizedExpression) {
      listener.enterParenthesizedExpression(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitParenthesizedExpression) {
      listener.exitParenthesizedExpression(this);
    }
  }
}
export class FunctionContext extends PrimaryExpressionContext {
  constructor(parser: esql_parser, ctx: PrimaryExpressionContext) {
    super(parser, ctx.parentCtx, ctx.invokingState);
    super.copyFrom(ctx);
  }
  public functionExpression(): FunctionExpressionContext {
    return this.getTypedRuleContext(FunctionExpressionContext, 0) as FunctionExpressionContext;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterFunction) {
      listener.enterFunction(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitFunction) {
      listener.exitFunction(this);
    }
  }
}

export class FunctionExpressionContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public identifier(): IdentifierContext {
    return this.getTypedRuleContext(IdentifierContext, 0) as IdentifierContext;
  }
  public LP(): TerminalNode {
    return this.getToken(esql_parser.LP, 0);
  }
  public RP(): TerminalNode {
    return this.getToken(esql_parser.RP, 0);
  }
  public ASTERISK(): TerminalNode {
    return this.getToken(esql_parser.ASTERISK, 0);
  }
  public booleanExpression_list(): BooleanExpressionContext[] {
    return this.getTypedRuleContexts(BooleanExpressionContext) as BooleanExpressionContext[];
  }
  public booleanExpression(i: number): BooleanExpressionContext {
    return this.getTypedRuleContext(BooleanExpressionContext, i) as BooleanExpressionContext;
  }
  public COMMA_list(): TerminalNode[] {
    return this.getTokens(esql_parser.COMMA);
  }
  public COMMA(i: number): TerminalNode {
    return this.getToken(esql_parser.COMMA, i);
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_functionExpression;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterFunctionExpression) {
      listener.enterFunctionExpression(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitFunctionExpression) {
      listener.exitFunctionExpression(this);
    }
  }
}

export class DataTypeContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_dataType;
  }
  public copyFrom(ctx: DataTypeContext): void {
    super.copyFrom(ctx);
  }
}
export class ToDataTypeContext extends DataTypeContext {
  constructor(parser: esql_parser, ctx: DataTypeContext) {
    super(parser, ctx.parentCtx, ctx.invokingState);
    super.copyFrom(ctx);
  }
  public identifier(): IdentifierContext {
    return this.getTypedRuleContext(IdentifierContext, 0) as IdentifierContext;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterToDataType) {
      listener.enterToDataType(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitToDataType) {
      listener.exitToDataType(this);
    }
  }
}

export class RowCommandContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public ROW(): TerminalNode {
    return this.getToken(esql_parser.ROW, 0);
  }
  public fields(): FieldsContext {
    return this.getTypedRuleContext(FieldsContext, 0) as FieldsContext;
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_rowCommand;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterRowCommand) {
      listener.enterRowCommand(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitRowCommand) {
      listener.exitRowCommand(this);
    }
  }
}

export class FieldsContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public field_list(): FieldContext[] {
    return this.getTypedRuleContexts(FieldContext) as FieldContext[];
  }
  public field(i: number): FieldContext {
    return this.getTypedRuleContext(FieldContext, i) as FieldContext;
  }
  public COMMA_list(): TerminalNode[] {
    return this.getTokens(esql_parser.COMMA);
  }
  public COMMA(i: number): TerminalNode {
    return this.getToken(esql_parser.COMMA, i);
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_fields;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterFields) {
      listener.enterFields(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitFields) {
      listener.exitFields(this);
    }
  }
}

export class FieldContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public booleanExpression(): BooleanExpressionContext {
    return this.getTypedRuleContext(BooleanExpressionContext, 0) as BooleanExpressionContext;
  }
  public qualifiedName(): QualifiedNameContext {
    return this.getTypedRuleContext(QualifiedNameContext, 0) as QualifiedNameContext;
  }
  public ASSIGN(): TerminalNode {
    return this.getToken(esql_parser.ASSIGN, 0);
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_field;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterField) {
      listener.enterField(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitField) {
      listener.exitField(this);
    }
  }
}

export class FromCommandContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public FROM(): TerminalNode {
    return this.getToken(esql_parser.FROM, 0);
  }
  public fromIdentifier_list(): FromIdentifierContext[] {
    return this.getTypedRuleContexts(FromIdentifierContext) as FromIdentifierContext[];
  }
  public fromIdentifier(i: number): FromIdentifierContext {
    return this.getTypedRuleContext(FromIdentifierContext, i) as FromIdentifierContext;
  }
  public COMMA_list(): TerminalNode[] {
    return this.getTokens(esql_parser.COMMA);
  }
  public COMMA(i: number): TerminalNode {
    return this.getToken(esql_parser.COMMA, i);
  }
  public metadata(): MetadataContext {
    return this.getTypedRuleContext(MetadataContext, 0) as MetadataContext;
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_fromCommand;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterFromCommand) {
      listener.enterFromCommand(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitFromCommand) {
      listener.exitFromCommand(this);
    }
  }
}

export class FromIdentifierContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public FROM_UNQUOTED_IDENTIFIER(): TerminalNode {
    return this.getToken(esql_parser.FROM_UNQUOTED_IDENTIFIER, 0);
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_fromIdentifier;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterFromIdentifier) {
      listener.enterFromIdentifier(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitFromIdentifier) {
      listener.exitFromIdentifier(this);
    }
  }
}

export class MetadataContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public metadataOption(): MetadataOptionContext {
    return this.getTypedRuleContext(MetadataOptionContext, 0) as MetadataOptionContext;
  }
  public deprecated_metadata(): Deprecated_metadataContext {
    return this.getTypedRuleContext(Deprecated_metadataContext, 0) as Deprecated_metadataContext;
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_metadata;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterMetadata) {
      listener.enterMetadata(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitMetadata) {
      listener.exitMetadata(this);
    }
  }
}

export class MetadataOptionContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public METADATA(): TerminalNode {
    return this.getToken(esql_parser.METADATA, 0);
  }
  public fromIdentifier_list(): FromIdentifierContext[] {
    return this.getTypedRuleContexts(FromIdentifierContext) as FromIdentifierContext[];
  }
  public fromIdentifier(i: number): FromIdentifierContext {
    return this.getTypedRuleContext(FromIdentifierContext, i) as FromIdentifierContext;
  }
  public COMMA_list(): TerminalNode[] {
    return this.getTokens(esql_parser.COMMA);
  }
  public COMMA(i: number): TerminalNode {
    return this.getToken(esql_parser.COMMA, i);
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_metadataOption;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterMetadataOption) {
      listener.enterMetadataOption(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitMetadataOption) {
      listener.exitMetadataOption(this);
    }
  }
}

export class Deprecated_metadataContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public OPENING_BRACKET(): TerminalNode {
    return this.getToken(esql_parser.OPENING_BRACKET, 0);
  }
  public metadataOption(): MetadataOptionContext {
    return this.getTypedRuleContext(MetadataOptionContext, 0) as MetadataOptionContext;
  }
  public CLOSING_BRACKET(): TerminalNode {
    return this.getToken(esql_parser.CLOSING_BRACKET, 0);
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_deprecated_metadata;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterDeprecated_metadata) {
      listener.enterDeprecated_metadata(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitDeprecated_metadata) {
      listener.exitDeprecated_metadata(this);
    }
  }
}

export class EvalCommandContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public EVAL(): TerminalNode {
    return this.getToken(esql_parser.EVAL, 0);
  }
  public fields(): FieldsContext {
    return this.getTypedRuleContext(FieldsContext, 0) as FieldsContext;
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_evalCommand;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterEvalCommand) {
      listener.enterEvalCommand(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitEvalCommand) {
      listener.exitEvalCommand(this);
    }
  }
}

export class StatsCommandContext extends ParserRuleContext {
  public _stats!: FieldsContext;
  public _grouping!: FieldsContext;
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public STATS(): TerminalNode {
    return this.getToken(esql_parser.STATS, 0);
  }
  public BY(): TerminalNode {
    return this.getToken(esql_parser.BY, 0);
  }
  public fields_list(): FieldsContext[] {
    return this.getTypedRuleContexts(FieldsContext) as FieldsContext[];
  }
  public fields(i: number): FieldsContext {
    return this.getTypedRuleContext(FieldsContext, i) as FieldsContext;
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_statsCommand;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterStatsCommand) {
      listener.enterStatsCommand(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitStatsCommand) {
      listener.exitStatsCommand(this);
    }
  }
}

export class InlinestatsCommandContext extends ParserRuleContext {
  public _stats!: FieldsContext;
  public _grouping!: FieldsContext;
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public INLINESTATS(): TerminalNode {
    return this.getToken(esql_parser.INLINESTATS, 0);
  }
  public fields_list(): FieldsContext[] {
    return this.getTypedRuleContexts(FieldsContext) as FieldsContext[];
  }
  public fields(i: number): FieldsContext {
    return this.getTypedRuleContext(FieldsContext, i) as FieldsContext;
  }
  public BY(): TerminalNode {
    return this.getToken(esql_parser.BY, 0);
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_inlinestatsCommand;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterInlinestatsCommand) {
      listener.enterInlinestatsCommand(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitInlinestatsCommand) {
      listener.exitInlinestatsCommand(this);
    }
  }
}

export class QualifiedNameContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public identifier_list(): IdentifierContext[] {
    return this.getTypedRuleContexts(IdentifierContext) as IdentifierContext[];
  }
  public identifier(i: number): IdentifierContext {
    return this.getTypedRuleContext(IdentifierContext, i) as IdentifierContext;
  }
  public DOT_list(): TerminalNode[] {
    return this.getTokens(esql_parser.DOT);
  }
  public DOT(i: number): TerminalNode {
    return this.getToken(esql_parser.DOT, i);
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_qualifiedName;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterQualifiedName) {
      listener.enterQualifiedName(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitQualifiedName) {
      listener.exitQualifiedName(this);
    }
  }
}

export class QualifiedNamePatternContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public identifierPattern_list(): IdentifierPatternContext[] {
    return this.getTypedRuleContexts(IdentifierPatternContext) as IdentifierPatternContext[];
  }
  public identifierPattern(i: number): IdentifierPatternContext {
    return this.getTypedRuleContext(IdentifierPatternContext, i) as IdentifierPatternContext;
  }
  public DOT_list(): TerminalNode[] {
    return this.getTokens(esql_parser.DOT);
  }
  public DOT(i: number): TerminalNode {
    return this.getToken(esql_parser.DOT, i);
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_qualifiedNamePattern;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterQualifiedNamePattern) {
      listener.enterQualifiedNamePattern(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitQualifiedNamePattern) {
      listener.exitQualifiedNamePattern(this);
    }
  }
}

export class IdentifierContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public UNQUOTED_IDENTIFIER(): TerminalNode {
    return this.getToken(esql_parser.UNQUOTED_IDENTIFIER, 0);
  }
  public QUOTED_IDENTIFIER(): TerminalNode {
    return this.getToken(esql_parser.QUOTED_IDENTIFIER, 0);
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_identifier;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterIdentifier) {
      listener.enterIdentifier(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitIdentifier) {
      listener.exitIdentifier(this);
    }
  }
}

export class IdentifierPatternContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public ID_PATTERN(): TerminalNode {
    return this.getToken(esql_parser.ID_PATTERN, 0);
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_identifierPattern;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterIdentifierPattern) {
      listener.enterIdentifierPattern(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitIdentifierPattern) {
      listener.exitIdentifierPattern(this);
    }
  }
}

export class ConstantContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_constant;
  }
  public copyFrom(ctx: ConstantContext): void {
    super.copyFrom(ctx);
  }
}
export class BooleanArrayLiteralContext extends ConstantContext {
  constructor(parser: esql_parser, ctx: ConstantContext) {
    super(parser, ctx.parentCtx, ctx.invokingState);
    super.copyFrom(ctx);
  }
  public OPENING_BRACKET(): TerminalNode {
    return this.getToken(esql_parser.OPENING_BRACKET, 0);
  }
  public booleanValue_list(): BooleanValueContext[] {
    return this.getTypedRuleContexts(BooleanValueContext) as BooleanValueContext[];
  }
  public booleanValue(i: number): BooleanValueContext {
    return this.getTypedRuleContext(BooleanValueContext, i) as BooleanValueContext;
  }
  public CLOSING_BRACKET(): TerminalNode {
    return this.getToken(esql_parser.CLOSING_BRACKET, 0);
  }
  public COMMA_list(): TerminalNode[] {
    return this.getTokens(esql_parser.COMMA);
  }
  public COMMA(i: number): TerminalNode {
    return this.getToken(esql_parser.COMMA, i);
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterBooleanArrayLiteral) {
      listener.enterBooleanArrayLiteral(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitBooleanArrayLiteral) {
      listener.exitBooleanArrayLiteral(this);
    }
  }
}
export class DecimalLiteralContext extends ConstantContext {
  constructor(parser: esql_parser, ctx: ConstantContext) {
    super(parser, ctx.parentCtx, ctx.invokingState);
    super.copyFrom(ctx);
  }
  public decimalValue(): DecimalValueContext {
    return this.getTypedRuleContext(DecimalValueContext, 0) as DecimalValueContext;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterDecimalLiteral) {
      listener.enterDecimalLiteral(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitDecimalLiteral) {
      listener.exitDecimalLiteral(this);
    }
  }
}
export class NullLiteralContext extends ConstantContext {
  constructor(parser: esql_parser, ctx: ConstantContext) {
    super(parser, ctx.parentCtx, ctx.invokingState);
    super.copyFrom(ctx);
  }
  public NULL(): TerminalNode {
    return this.getToken(esql_parser.NULL, 0);
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterNullLiteral) {
      listener.enterNullLiteral(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitNullLiteral) {
      listener.exitNullLiteral(this);
    }
  }
}
export class QualifiedIntegerLiteralContext extends ConstantContext {
  constructor(parser: esql_parser, ctx: ConstantContext) {
    super(parser, ctx.parentCtx, ctx.invokingState);
    super.copyFrom(ctx);
  }
  public integerValue(): IntegerValueContext {
    return this.getTypedRuleContext(IntegerValueContext, 0) as IntegerValueContext;
  }
  public UNQUOTED_IDENTIFIER(): TerminalNode {
    return this.getToken(esql_parser.UNQUOTED_IDENTIFIER, 0);
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterQualifiedIntegerLiteral) {
      listener.enterQualifiedIntegerLiteral(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitQualifiedIntegerLiteral) {
      listener.exitQualifiedIntegerLiteral(this);
    }
  }
}
export class StringArrayLiteralContext extends ConstantContext {
  constructor(parser: esql_parser, ctx: ConstantContext) {
    super(parser, ctx.parentCtx, ctx.invokingState);
    super.copyFrom(ctx);
  }
  public OPENING_BRACKET(): TerminalNode {
    return this.getToken(esql_parser.OPENING_BRACKET, 0);
  }
  public string__list(): StringContext[] {
    return this.getTypedRuleContexts(StringContext) as StringContext[];
  }
  public string_(i: number): StringContext {
    return this.getTypedRuleContext(StringContext, i) as StringContext;
  }
  public CLOSING_BRACKET(): TerminalNode {
    return this.getToken(esql_parser.CLOSING_BRACKET, 0);
  }
  public COMMA_list(): TerminalNode[] {
    return this.getTokens(esql_parser.COMMA);
  }
  public COMMA(i: number): TerminalNode {
    return this.getToken(esql_parser.COMMA, i);
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterStringArrayLiteral) {
      listener.enterStringArrayLiteral(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitStringArrayLiteral) {
      listener.exitStringArrayLiteral(this);
    }
  }
}
export class StringLiteralContext extends ConstantContext {
  constructor(parser: esql_parser, ctx: ConstantContext) {
    super(parser, ctx.parentCtx, ctx.invokingState);
    super.copyFrom(ctx);
  }
  public string_(): StringContext {
    return this.getTypedRuleContext(StringContext, 0) as StringContext;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterStringLiteral) {
      listener.enterStringLiteral(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitStringLiteral) {
      listener.exitStringLiteral(this);
    }
  }
}
export class NumericArrayLiteralContext extends ConstantContext {
  constructor(parser: esql_parser, ctx: ConstantContext) {
    super(parser, ctx.parentCtx, ctx.invokingState);
    super.copyFrom(ctx);
  }
  public OPENING_BRACKET(): TerminalNode {
    return this.getToken(esql_parser.OPENING_BRACKET, 0);
  }
  public numericValue_list(): NumericValueContext[] {
    return this.getTypedRuleContexts(NumericValueContext) as NumericValueContext[];
  }
  public numericValue(i: number): NumericValueContext {
    return this.getTypedRuleContext(NumericValueContext, i) as NumericValueContext;
  }
  public CLOSING_BRACKET(): TerminalNode {
    return this.getToken(esql_parser.CLOSING_BRACKET, 0);
  }
  public COMMA_list(): TerminalNode[] {
    return this.getTokens(esql_parser.COMMA);
  }
  public COMMA(i: number): TerminalNode {
    return this.getToken(esql_parser.COMMA, i);
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterNumericArrayLiteral) {
      listener.enterNumericArrayLiteral(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitNumericArrayLiteral) {
      listener.exitNumericArrayLiteral(this);
    }
  }
}
export class InputParamContext extends ConstantContext {
  constructor(parser: esql_parser, ctx: ConstantContext) {
    super(parser, ctx.parentCtx, ctx.invokingState);
    super.copyFrom(ctx);
  }
  public PARAM(): TerminalNode {
    return this.getToken(esql_parser.PARAM, 0);
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterInputParam) {
      listener.enterInputParam(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitInputParam) {
      listener.exitInputParam(this);
    }
  }
}
export class IntegerLiteralContext extends ConstantContext {
  constructor(parser: esql_parser, ctx: ConstantContext) {
    super(parser, ctx.parentCtx, ctx.invokingState);
    super.copyFrom(ctx);
  }
  public integerValue(): IntegerValueContext {
    return this.getTypedRuleContext(IntegerValueContext, 0) as IntegerValueContext;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterIntegerLiteral) {
      listener.enterIntegerLiteral(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitIntegerLiteral) {
      listener.exitIntegerLiteral(this);
    }
  }
}
export class BooleanLiteralContext extends ConstantContext {
  constructor(parser: esql_parser, ctx: ConstantContext) {
    super(parser, ctx.parentCtx, ctx.invokingState);
    super.copyFrom(ctx);
  }
  public booleanValue(): BooleanValueContext {
    return this.getTypedRuleContext(BooleanValueContext, 0) as BooleanValueContext;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterBooleanLiteral) {
      listener.enterBooleanLiteral(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitBooleanLiteral) {
      listener.exitBooleanLiteral(this);
    }
  }
}

export class LimitCommandContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public LIMIT(): TerminalNode {
    return this.getToken(esql_parser.LIMIT, 0);
  }
  public INTEGER_LITERAL(): TerminalNode {
    return this.getToken(esql_parser.INTEGER_LITERAL, 0);
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_limitCommand;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterLimitCommand) {
      listener.enterLimitCommand(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitLimitCommand) {
      listener.exitLimitCommand(this);
    }
  }
}

export class SortCommandContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public SORT(): TerminalNode {
    return this.getToken(esql_parser.SORT, 0);
  }
  public orderExpression_list(): OrderExpressionContext[] {
    return this.getTypedRuleContexts(OrderExpressionContext) as OrderExpressionContext[];
  }
  public orderExpression(i: number): OrderExpressionContext {
    return this.getTypedRuleContext(OrderExpressionContext, i) as OrderExpressionContext;
  }
  public COMMA_list(): TerminalNode[] {
    return this.getTokens(esql_parser.COMMA);
  }
  public COMMA(i: number): TerminalNode {
    return this.getToken(esql_parser.COMMA, i);
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_sortCommand;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterSortCommand) {
      listener.enterSortCommand(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitSortCommand) {
      listener.exitSortCommand(this);
    }
  }
}

export class OrderExpressionContext extends ParserRuleContext {
  public _ordering!: Token;
  public _nullOrdering!: Token;
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public booleanExpression(): BooleanExpressionContext {
    return this.getTypedRuleContext(BooleanExpressionContext, 0) as BooleanExpressionContext;
  }
  public NULLS(): TerminalNode {
    return this.getToken(esql_parser.NULLS, 0);
  }
  public ASC(): TerminalNode {
    return this.getToken(esql_parser.ASC, 0);
  }
  public DESC(): TerminalNode {
    return this.getToken(esql_parser.DESC, 0);
  }
  public FIRST(): TerminalNode {
    return this.getToken(esql_parser.FIRST, 0);
  }
  public LAST(): TerminalNode {
    return this.getToken(esql_parser.LAST, 0);
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_orderExpression;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterOrderExpression) {
      listener.enterOrderExpression(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitOrderExpression) {
      listener.exitOrderExpression(this);
    }
  }
}

export class KeepCommandContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public KEEP(): TerminalNode {
    return this.getToken(esql_parser.KEEP, 0);
  }
  public qualifiedNamePattern_list(): QualifiedNamePatternContext[] {
    return this.getTypedRuleContexts(QualifiedNamePatternContext) as QualifiedNamePatternContext[];
  }
  public qualifiedNamePattern(i: number): QualifiedNamePatternContext {
    return this.getTypedRuleContext(QualifiedNamePatternContext, i) as QualifiedNamePatternContext;
  }
  public COMMA_list(): TerminalNode[] {
    return this.getTokens(esql_parser.COMMA);
  }
  public COMMA(i: number): TerminalNode {
    return this.getToken(esql_parser.COMMA, i);
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_keepCommand;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterKeepCommand) {
      listener.enterKeepCommand(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitKeepCommand) {
      listener.exitKeepCommand(this);
    }
  }
}

export class DropCommandContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public DROP(): TerminalNode {
    return this.getToken(esql_parser.DROP, 0);
  }
  public qualifiedNamePattern_list(): QualifiedNamePatternContext[] {
    return this.getTypedRuleContexts(QualifiedNamePatternContext) as QualifiedNamePatternContext[];
  }
  public qualifiedNamePattern(i: number): QualifiedNamePatternContext {
    return this.getTypedRuleContext(QualifiedNamePatternContext, i) as QualifiedNamePatternContext;
  }
  public COMMA_list(): TerminalNode[] {
    return this.getTokens(esql_parser.COMMA);
  }
  public COMMA(i: number): TerminalNode {
    return this.getToken(esql_parser.COMMA, i);
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_dropCommand;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterDropCommand) {
      listener.enterDropCommand(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitDropCommand) {
      listener.exitDropCommand(this);
    }
  }
}

export class RenameCommandContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public RENAME(): TerminalNode {
    return this.getToken(esql_parser.RENAME, 0);
  }
  public renameClause_list(): RenameClauseContext[] {
    return this.getTypedRuleContexts(RenameClauseContext) as RenameClauseContext[];
  }
  public renameClause(i: number): RenameClauseContext {
    return this.getTypedRuleContext(RenameClauseContext, i) as RenameClauseContext;
  }
  public COMMA_list(): TerminalNode[] {
    return this.getTokens(esql_parser.COMMA);
  }
  public COMMA(i: number): TerminalNode {
    return this.getToken(esql_parser.COMMA, i);
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_renameCommand;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterRenameCommand) {
      listener.enterRenameCommand(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitRenameCommand) {
      listener.exitRenameCommand(this);
    }
  }
}

export class RenameClauseContext extends ParserRuleContext {
  public _oldName!: QualifiedNamePatternContext;
  public _newName!: QualifiedNamePatternContext;
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public AS(): TerminalNode {
    return this.getToken(esql_parser.AS, 0);
  }
  public qualifiedNamePattern_list(): QualifiedNamePatternContext[] {
    return this.getTypedRuleContexts(QualifiedNamePatternContext) as QualifiedNamePatternContext[];
  }
  public qualifiedNamePattern(i: number): QualifiedNamePatternContext {
    return this.getTypedRuleContext(QualifiedNamePatternContext, i) as QualifiedNamePatternContext;
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_renameClause;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterRenameClause) {
      listener.enterRenameClause(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitRenameClause) {
      listener.exitRenameClause(this);
    }
  }
}

export class DissectCommandContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public DISSECT(): TerminalNode {
    return this.getToken(esql_parser.DISSECT, 0);
  }
  public primaryExpression(): PrimaryExpressionContext {
    return this.getTypedRuleContext(PrimaryExpressionContext, 0) as PrimaryExpressionContext;
  }
  public string_(): StringContext {
    return this.getTypedRuleContext(StringContext, 0) as StringContext;
  }
  public commandOptions(): CommandOptionsContext {
    return this.getTypedRuleContext(CommandOptionsContext, 0) as CommandOptionsContext;
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_dissectCommand;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterDissectCommand) {
      listener.enterDissectCommand(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitDissectCommand) {
      listener.exitDissectCommand(this);
    }
  }
}

export class GrokCommandContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public GROK(): TerminalNode {
    return this.getToken(esql_parser.GROK, 0);
  }
  public primaryExpression(): PrimaryExpressionContext {
    return this.getTypedRuleContext(PrimaryExpressionContext, 0) as PrimaryExpressionContext;
  }
  public string_(): StringContext {
    return this.getTypedRuleContext(StringContext, 0) as StringContext;
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_grokCommand;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterGrokCommand) {
      listener.enterGrokCommand(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitGrokCommand) {
      listener.exitGrokCommand(this);
    }
  }
}

export class MvExpandCommandContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public MV_EXPAND(): TerminalNode {
    return this.getToken(esql_parser.MV_EXPAND, 0);
  }
  public qualifiedName(): QualifiedNameContext {
    return this.getTypedRuleContext(QualifiedNameContext, 0) as QualifiedNameContext;
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_mvExpandCommand;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterMvExpandCommand) {
      listener.enterMvExpandCommand(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitMvExpandCommand) {
      listener.exitMvExpandCommand(this);
    }
  }
}

export class CommandOptionsContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public commandOption_list(): CommandOptionContext[] {
    return this.getTypedRuleContexts(CommandOptionContext) as CommandOptionContext[];
  }
  public commandOption(i: number): CommandOptionContext {
    return this.getTypedRuleContext(CommandOptionContext, i) as CommandOptionContext;
  }
  public COMMA_list(): TerminalNode[] {
    return this.getTokens(esql_parser.COMMA);
  }
  public COMMA(i: number): TerminalNode {
    return this.getToken(esql_parser.COMMA, i);
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_commandOptions;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterCommandOptions) {
      listener.enterCommandOptions(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitCommandOptions) {
      listener.exitCommandOptions(this);
    }
  }
}

export class CommandOptionContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public identifier(): IdentifierContext {
    return this.getTypedRuleContext(IdentifierContext, 0) as IdentifierContext;
  }
  public ASSIGN(): TerminalNode {
    return this.getToken(esql_parser.ASSIGN, 0);
  }
  public constant(): ConstantContext {
    return this.getTypedRuleContext(ConstantContext, 0) as ConstantContext;
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_commandOption;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterCommandOption) {
      listener.enterCommandOption(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitCommandOption) {
      listener.exitCommandOption(this);
    }
  }
}

export class BooleanValueContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public TRUE(): TerminalNode {
    return this.getToken(esql_parser.TRUE, 0);
  }
  public FALSE(): TerminalNode {
    return this.getToken(esql_parser.FALSE, 0);
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_booleanValue;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterBooleanValue) {
      listener.enterBooleanValue(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitBooleanValue) {
      listener.exitBooleanValue(this);
    }
  }
}

export class NumericValueContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public decimalValue(): DecimalValueContext {
    return this.getTypedRuleContext(DecimalValueContext, 0) as DecimalValueContext;
  }
  public integerValue(): IntegerValueContext {
    return this.getTypedRuleContext(IntegerValueContext, 0) as IntegerValueContext;
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_numericValue;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterNumericValue) {
      listener.enterNumericValue(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitNumericValue) {
      listener.exitNumericValue(this);
    }
  }
}

export class DecimalValueContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public DECIMAL_LITERAL(): TerminalNode {
    return this.getToken(esql_parser.DECIMAL_LITERAL, 0);
  }
  public PLUS(): TerminalNode {
    return this.getToken(esql_parser.PLUS, 0);
  }
  public MINUS(): TerminalNode {
    return this.getToken(esql_parser.MINUS, 0);
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_decimalValue;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterDecimalValue) {
      listener.enterDecimalValue(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitDecimalValue) {
      listener.exitDecimalValue(this);
    }
  }
}

export class IntegerValueContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public INTEGER_LITERAL(): TerminalNode {
    return this.getToken(esql_parser.INTEGER_LITERAL, 0);
  }
  public PLUS(): TerminalNode {
    return this.getToken(esql_parser.PLUS, 0);
  }
  public MINUS(): TerminalNode {
    return this.getToken(esql_parser.MINUS, 0);
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_integerValue;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterIntegerValue) {
      listener.enterIntegerValue(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitIntegerValue) {
      listener.exitIntegerValue(this);
    }
  }
}

export class StringContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public QUOTED_STRING(): TerminalNode {
    return this.getToken(esql_parser.QUOTED_STRING, 0);
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_string;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterString) {
      listener.enterString(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitString) {
      listener.exitString(this);
    }
  }
}

export class ComparisonOperatorContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public EQ(): TerminalNode {
    return this.getToken(esql_parser.EQ, 0);
  }
  public NEQ(): TerminalNode {
    return this.getToken(esql_parser.NEQ, 0);
  }
  public LT(): TerminalNode {
    return this.getToken(esql_parser.LT, 0);
  }
  public LTE(): TerminalNode {
    return this.getToken(esql_parser.LTE, 0);
  }
  public GT(): TerminalNode {
    return this.getToken(esql_parser.GT, 0);
  }
  public GTE(): TerminalNode {
    return this.getToken(esql_parser.GTE, 0);
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_comparisonOperator;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterComparisonOperator) {
      listener.enterComparisonOperator(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitComparisonOperator) {
      listener.exitComparisonOperator(this);
    }
  }
}

export class ExplainCommandContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public EXPLAIN(): TerminalNode {
    return this.getToken(esql_parser.EXPLAIN, 0);
  }
  public subqueryExpression(): SubqueryExpressionContext {
    return this.getTypedRuleContext(SubqueryExpressionContext, 0) as SubqueryExpressionContext;
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_explainCommand;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterExplainCommand) {
      listener.enterExplainCommand(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitExplainCommand) {
      listener.exitExplainCommand(this);
    }
  }
}

export class SubqueryExpressionContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public OPENING_BRACKET(): TerminalNode {
    return this.getToken(esql_parser.OPENING_BRACKET, 0);
  }
  public query(): QueryContext {
    return this.getTypedRuleContext(QueryContext, 0) as QueryContext;
  }
  public CLOSING_BRACKET(): TerminalNode {
    return this.getToken(esql_parser.CLOSING_BRACKET, 0);
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_subqueryExpression;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterSubqueryExpression) {
      listener.enterSubqueryExpression(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitSubqueryExpression) {
      listener.exitSubqueryExpression(this);
    }
  }
}

export class ShowCommandContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_showCommand;
  }
  public copyFrom(ctx: ShowCommandContext): void {
    super.copyFrom(ctx);
  }
}
export class ShowInfoContext extends ShowCommandContext {
  constructor(parser: esql_parser, ctx: ShowCommandContext) {
    super(parser, ctx.parentCtx, ctx.invokingState);
    super.copyFrom(ctx);
  }
  public SHOW(): TerminalNode {
    return this.getToken(esql_parser.SHOW, 0);
  }
  public INFO(): TerminalNode {
    return this.getToken(esql_parser.INFO, 0);
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterShowInfo) {
      listener.enterShowInfo(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitShowInfo) {
      listener.exitShowInfo(this);
    }
  }
}

export class MetaCommandContext extends ParserRuleContext {
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_metaCommand;
  }
  public copyFrom(ctx: MetaCommandContext): void {
    super.copyFrom(ctx);
  }
}
export class MetaFunctionsContext extends MetaCommandContext {
  constructor(parser: esql_parser, ctx: MetaCommandContext) {
    super(parser, ctx.parentCtx, ctx.invokingState);
    super.copyFrom(ctx);
  }
  public META(): TerminalNode {
    return this.getToken(esql_parser.META, 0);
  }
  public FUNCTIONS(): TerminalNode {
    return this.getToken(esql_parser.FUNCTIONS, 0);
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterMetaFunctions) {
      listener.enterMetaFunctions(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitMetaFunctions) {
      listener.exitMetaFunctions(this);
    }
  }
}

export class EnrichCommandContext extends ParserRuleContext {
  public _policyName!: Token;
  public _matchField!: QualifiedNamePatternContext;
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public ENRICH(): TerminalNode {
    return this.getToken(esql_parser.ENRICH, 0);
  }
  public ENRICH_POLICY_NAME(): TerminalNode {
    return this.getToken(esql_parser.ENRICH_POLICY_NAME, 0);
  }
  public ON(): TerminalNode {
    return this.getToken(esql_parser.ON, 0);
  }
  public WITH(): TerminalNode {
    return this.getToken(esql_parser.WITH, 0);
  }
  public enrichWithClause_list(): EnrichWithClauseContext[] {
    return this.getTypedRuleContexts(EnrichWithClauseContext) as EnrichWithClauseContext[];
  }
  public enrichWithClause(i: number): EnrichWithClauseContext {
    return this.getTypedRuleContext(EnrichWithClauseContext, i) as EnrichWithClauseContext;
  }
  public qualifiedNamePattern(): QualifiedNamePatternContext {
    return this.getTypedRuleContext(QualifiedNamePatternContext, 0) as QualifiedNamePatternContext;
  }
  public COMMA_list(): TerminalNode[] {
    return this.getTokens(esql_parser.COMMA);
  }
  public COMMA(i: number): TerminalNode {
    return this.getToken(esql_parser.COMMA, i);
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_enrichCommand;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterEnrichCommand) {
      listener.enterEnrichCommand(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitEnrichCommand) {
      listener.exitEnrichCommand(this);
    }
  }
}

export class EnrichWithClauseContext extends ParserRuleContext {
  public _newName!: QualifiedNamePatternContext;
  public _enrichField!: QualifiedNamePatternContext;
  constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
    super(parent, invokingState);
    this.parser = parser;
  }
  public qualifiedNamePattern_list(): QualifiedNamePatternContext[] {
    return this.getTypedRuleContexts(QualifiedNamePatternContext) as QualifiedNamePatternContext[];
  }
  public qualifiedNamePattern(i: number): QualifiedNamePatternContext {
    return this.getTypedRuleContext(QualifiedNamePatternContext, i) as QualifiedNamePatternContext;
  }
  public ASSIGN(): TerminalNode {
    return this.getToken(esql_parser.ASSIGN, 0);
  }
  public get ruleIndex(): number {
    return esql_parser.RULE_enrichWithClause;
  }
  public enterRule(listener: esql_parserListener): void {
    if (listener.enterEnrichWithClause) {
      listener.enterEnrichWithClause(this);
    }
  }
  public exitRule(listener: esql_parserListener): void {
    if (listener.exitEnrichWithClause) {
      listener.exitEnrichWithClause(this);
    }
  }
}
