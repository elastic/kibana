// @ts-nocheck
// Generated from src/antlr/esql_parser.g4 by ANTLR 4.13.1
// noinspection ES6UnusedImports,JSUnusedGlobalSymbols,JSUnusedLocalSymbols

import {
	ATN,
	ATNDeserializer, DecisionState, DFA, FailedPredicateException,
	RecognitionException, NoViableAltException, BailErrorStrategy,
	Parser, ParserATNSimulator,
	RuleContext, ParserRuleContext, PredictionMode, PredictionContextCache,
	TerminalNode, RuleNode,
	Token, TokenStream,
	Interval, IntervalSet
} from 'antlr4';
import esql_parserListener from "./esql_parserListener.js";
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
	public static readonly COMMA = 34;
	public static readonly DESC = 35;
	public static readonly DOT = 36;
	public static readonly FALSE = 37;
	public static readonly FIRST = 38;
	public static readonly LAST = 39;
	public static readonly LP = 40;
	public static readonly IN = 41;
	public static readonly IS = 42;
	public static readonly LIKE = 43;
	public static readonly NOT = 44;
	public static readonly NULL = 45;
	public static readonly NULLS = 46;
	public static readonly OR = 47;
	public static readonly PARAM = 48;
	public static readonly RLIKE = 49;
	public static readonly RP = 50;
	public static readonly TRUE = 51;
	public static readonly EQ = 52;
	public static readonly CIEQ = 53;
	public static readonly NEQ = 54;
	public static readonly LT = 55;
	public static readonly LTE = 56;
	public static readonly GT = 57;
	public static readonly GTE = 58;
	public static readonly PLUS = 59;
	public static readonly MINUS = 60;
	public static readonly ASTERISK = 61;
	public static readonly SLASH = 62;
	public static readonly PERCENT = 63;
	public static readonly OPENING_BRACKET = 64;
	public static readonly CLOSING_BRACKET = 65;
	public static readonly UNQUOTED_IDENTIFIER = 66;
	public static readonly QUOTED_IDENTIFIER = 67;
	public static readonly EXPR_LINE_COMMENT = 68;
	public static readonly EXPR_MULTILINE_COMMENT = 69;
	public static readonly EXPR_WS = 70;
	public static readonly OPTIONS = 71;
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
	public static readonly RULE_rowCommand = 11;
	public static readonly RULE_fields = 12;
	public static readonly RULE_field = 13;
	public static readonly RULE_fromCommand = 14;
	public static readonly RULE_fromIdentifier = 15;
	public static readonly RULE_fromOptions = 16;
	public static readonly RULE_configOption = 17;
	public static readonly RULE_metadata = 18;
	public static readonly RULE_metadataOption = 19;
	public static readonly RULE_deprecated_metadata = 20;
	public static readonly RULE_evalCommand = 21;
	public static readonly RULE_statsCommand = 22;
	public static readonly RULE_inlinestatsCommand = 23;
	public static readonly RULE_qualifiedName = 24;
	public static readonly RULE_qualifiedNamePattern = 25;
	public static readonly RULE_identifier = 26;
	public static readonly RULE_identifierPattern = 27;
	public static readonly RULE_constant = 28;
	public static readonly RULE_limitCommand = 29;
	public static readonly RULE_sortCommand = 30;
	public static readonly RULE_orderExpression = 31;
	public static readonly RULE_keepCommand = 32;
	public static readonly RULE_dropCommand = 33;
	public static readonly RULE_renameCommand = 34;
	public static readonly RULE_renameClause = 35;
	public static readonly RULE_dissectCommand = 36;
	public static readonly RULE_grokCommand = 37;
	public static readonly RULE_mvExpandCommand = 38;
	public static readonly RULE_commandOptions = 39;
	public static readonly RULE_commandOption = 40;
	public static readonly RULE_booleanValue = 41;
	public static readonly RULE_numericValue = 42;
	public static readonly RULE_decimalValue = 43;
	public static readonly RULE_integerValue = 44;
	public static readonly RULE_string = 45;
	public static readonly RULE_comparisonOperator = 46;
	public static readonly RULE_explainCommand = 47;
	public static readonly RULE_subqueryExpression = 48;
	public static readonly RULE_showCommand = 49;
	public static readonly RULE_metaCommand = 50;
	public static readonly RULE_enrichCommand = 51;
	public static readonly RULE_enrichWithClause = 52;
	public static readonly literalNames: (string | null)[] = [ null, "'dissect'", 
                                                            "'drop'", "'enrich'", 
                                                            "'eval'", "'explain'", 
                                                            "'from'", "'grok'", 
                                                            "'inlinestats'", 
                                                            "'keep'", "'limit'", 
                                                            "'meta'", "'mv_expand'", 
                                                            "'rename'", 
                                                            "'row'", "'show'", 
                                                            "'sort'", "'stats'", 
                                                            "'where'", null, 
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            "'|'", null, 
                                                            null, null, 
                                                            "'by'", "'and'", 
                                                            "'asc'", "'='", 
                                                            "','", "'desc'", 
                                                            "'.'", "'false'", 
                                                            "'first'", "'last'", 
                                                            "'('", "'in'", 
                                                            "'is'", "'like'", 
                                                            "'not'", "'null'", 
                                                            "'nulls'", "'or'", 
                                                            "'?'", "'rlike'", 
                                                            "')'", "'true'", 
                                                            "'=='", "'=~'", 
                                                            "'!='", "'<'", 
                                                            "'<='", "'>'", 
                                                            "'>='", "'+'", 
                                                            "'-'", "'*'", 
                                                            "'/'", "'%'", 
                                                            null, "']'", 
                                                            null, null, 
                                                            null, null, 
                                                            null, "'options'", 
                                                            "'metadata'", 
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            "'as'", null, 
                                                            null, null, 
                                                            "'on'", "'with'", 
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            "'info'", null, 
                                                            null, null, 
                                                            "'functions'", 
                                                            null, null, 
                                                            null, "':'" ];
	public static readonly symbolicNames: (string | null)[] = [ null, "DISSECT", 
                                                             "DROP", "ENRICH", 
                                                             "EVAL", "EXPLAIN", 
                                                             "FROM", "GROK", 
                                                             "INLINESTATS", 
                                                             "KEEP", "LIMIT", 
                                                             "META", "MV_EXPAND", 
                                                             "RENAME", "ROW", 
                                                             "SHOW", "SORT", 
                                                             "STATS", "WHERE", 
                                                             "UNKNOWN_CMD", 
                                                             "LINE_COMMENT", 
                                                             "MULTILINE_COMMENT", 
                                                             "WS", "EXPLAIN_WS", 
                                                             "EXPLAIN_LINE_COMMENT", 
                                                             "EXPLAIN_MULTILINE_COMMENT", 
                                                             "PIPE", "QUOTED_STRING", 
                                                             "INTEGER_LITERAL", 
                                                             "DECIMAL_LITERAL", 
                                                             "BY", "AND", 
                                                             "ASC", "ASSIGN", 
                                                             "COMMA", "DESC", 
                                                             "DOT", "FALSE", 
                                                             "FIRST", "LAST", 
                                                             "LP", "IN", 
                                                             "IS", "LIKE", 
                                                             "NOT", "NULL", 
                                                             "NULLS", "OR", 
                                                             "PARAM", "RLIKE", 
                                                             "RP", "TRUE", 
                                                             "EQ", "CIEQ", 
                                                             "NEQ", "LT", 
                                                             "LTE", "GT", 
                                                             "GTE", "PLUS", 
                                                             "MINUS", "ASTERISK", 
                                                             "SLASH", "PERCENT", 
                                                             "OPENING_BRACKET", 
                                                             "CLOSING_BRACKET", 
                                                             "UNQUOTED_IDENTIFIER", 
                                                             "QUOTED_IDENTIFIER", 
                                                             "EXPR_LINE_COMMENT", 
                                                             "EXPR_MULTILINE_COMMENT", 
                                                             "EXPR_WS", 
                                                             "OPTIONS", 
                                                             "METADATA", 
                                                             "FROM_UNQUOTED_IDENTIFIER", 
                                                             "FROM_LINE_COMMENT", 
                                                             "FROM_MULTILINE_COMMENT", 
                                                             "FROM_WS", 
                                                             "ID_PATTERN", 
                                                             "PROJECT_LINE_COMMENT", 
                                                             "PROJECT_MULTILINE_COMMENT", 
                                                             "PROJECT_WS", 
                                                             "AS", "RENAME_LINE_COMMENT", 
                                                             "RENAME_MULTILINE_COMMENT", 
                                                             "RENAME_WS", 
                                                             "ON", "WITH", 
                                                             "ENRICH_POLICY_NAME", 
                                                             "ENRICH_LINE_COMMENT", 
                                                             "ENRICH_MULTILINE_COMMENT", 
                                                             "ENRICH_WS", 
                                                             "ENRICH_FIELD_LINE_COMMENT", 
                                                             "ENRICH_FIELD_MULTILINE_COMMENT", 
                                                             "ENRICH_FIELD_WS", 
                                                             "MVEXPAND_LINE_COMMENT", 
                                                             "MVEXPAND_MULTILINE_COMMENT", 
                                                             "MVEXPAND_WS", 
                                                             "INFO", "SHOW_LINE_COMMENT", 
                                                             "SHOW_MULTILINE_COMMENT", 
                                                             "SHOW_WS", 
                                                             "FUNCTIONS", 
                                                             "META_LINE_COMMENT", 
                                                             "META_MULTILINE_COMMENT", 
                                                             "META_WS", 
                                                             "COLON", "SETTING", 
                                                             "SETTING_LINE_COMMENT", 
                                                             "SETTTING_MULTILINE_COMMENT", 
                                                             "SETTING_WS" ];
	// tslint:disable:no-trailing-whitespace
	public static readonly ruleNames: string[] = [
		"singleStatement", "query", "sourceCommand", "processingCommand", "whereCommand", 
		"booleanExpression", "regexBooleanExpression", "valueExpression", "operatorExpression", 
		"primaryExpression", "functionExpression", "rowCommand", "fields", "field", 
		"fromCommand", "fromIdentifier", "fromOptions", "configOption", "metadata", 
		"metadataOption", "deprecated_metadata", "evalCommand", "statsCommand", 
		"inlinestatsCommand", "qualifiedName", "qualifiedNamePattern", "identifier", 
		"identifierPattern", "constant", "limitCommand", "sortCommand", "orderExpression", 
		"keepCommand", "dropCommand", "renameCommand", "renameClause", "dissectCommand", 
		"grokCommand", "mvExpandCommand", "commandOptions", "commandOption", "booleanValue", 
		"numericValue", "decimalValue", "integerValue", "string", "comparisonOperator", 
		"explainCommand", "subqueryExpression", "showCommand", "metaCommand", 
		"enrichCommand", "enrichWithClause",
	];
	public get grammarFileName(): string { return "esql_parser.g4"; }
	public get literalNames(): (string | null)[] { return esql_parser.literalNames; }
	public get symbolicNames(): (string | null)[] { return esql_parser.symbolicNames; }
	public get ruleNames(): string[] { return esql_parser.ruleNames; }
	public get serializedATN(): number[] { return esql_parser._serializedATN; }

	protected createFailedPredicateException(predicate?: string, message?: string): FailedPredicateException {
		return new FailedPredicateException(this, predicate, message);
	}

	constructor(input: TokenStream) {
		super(input);
		this._interp = new ParserATNSimulator(this, esql_parser._ATN, esql_parser.DecisionsToDFA, new PredictionContextCache());
	}
	// @RuleVersion(0)
	public singleStatement(): SingleStatementContext {
		let localctx: SingleStatementContext = new SingleStatementContext(this, this._ctx, this.state);
		this.enterRule(localctx, 0, esql_parser.RULE_singleStatement);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 106;
			this.query(0);
			this.state = 107;
			this.match(esql_parser.EOF);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
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

			this.state = 110;
			this.sourceCommand();
			}
			this._ctx.stop = this._input.LT(-1);
			this.state = 117;
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
					localctx = new CompositeQueryContext(this, new QueryContext(this, _parentctx, _parentState));
					this.pushNewRecursionContext(localctx, _startState, esql_parser.RULE_query);
					this.state = 112;
					if (!(this.precpred(this._ctx, 1))) {
						throw this.createFailedPredicateException("this.precpred(this._ctx, 1)");
					}
					this.state = 113;
					this.match(esql_parser.PIPE);
					this.state = 114;
					this.processingCommand();
					}
					}
				}
				this.state = 119;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 0, this._ctx);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.unrollRecursionContexts(_parentctx);
		}
		return localctx;
	}
	// @RuleVersion(0)
	public sourceCommand(): SourceCommandContext {
		let localctx: SourceCommandContext = new SourceCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 4, esql_parser.RULE_sourceCommand);
		try {
			this.state = 125;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 5:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 120;
				this.explainCommand();
				}
				break;
			case 6:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 121;
				this.fromCommand();
				}
				break;
			case 14:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 122;
				this.rowCommand();
				}
				break;
			case 15:
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 123;
				this.showCommand();
				}
				break;
			case 11:
				this.enterOuterAlt(localctx, 5);
				{
				this.state = 124;
				this.metaCommand();
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public processingCommand(): ProcessingCommandContext {
		let localctx: ProcessingCommandContext = new ProcessingCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 6, esql_parser.RULE_processingCommand);
		try {
			this.state = 140;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 4:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 127;
				this.evalCommand();
				}
				break;
			case 8:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 128;
				this.inlinestatsCommand();
				}
				break;
			case 10:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 129;
				this.limitCommand();
				}
				break;
			case 9:
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 130;
				this.keepCommand();
				}
				break;
			case 16:
				this.enterOuterAlt(localctx, 5);
				{
				this.state = 131;
				this.sortCommand();
				}
				break;
			case 17:
				this.enterOuterAlt(localctx, 6);
				{
				this.state = 132;
				this.statsCommand();
				}
				break;
			case 18:
				this.enterOuterAlt(localctx, 7);
				{
				this.state = 133;
				this.whereCommand();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 8);
				{
				this.state = 134;
				this.dropCommand();
				}
				break;
			case 13:
				this.enterOuterAlt(localctx, 9);
				{
				this.state = 135;
				this.renameCommand();
				}
				break;
			case 1:
				this.enterOuterAlt(localctx, 10);
				{
				this.state = 136;
				this.dissectCommand();
				}
				break;
			case 7:
				this.enterOuterAlt(localctx, 11);
				{
				this.state = 137;
				this.grokCommand();
				}
				break;
			case 3:
				this.enterOuterAlt(localctx, 12);
				{
				this.state = 138;
				this.enrichCommand();
				}
				break;
			case 12:
				this.enterOuterAlt(localctx, 13);
				{
				this.state = 139;
				this.mvExpandCommand();
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
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
			this.state = 142;
			this.match(esql_parser.WHERE);
			this.state = 143;
			this.booleanExpression(0);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
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
		let localctx: BooleanExpressionContext = new BooleanExpressionContext(this, this._ctx, _parentState);
		let _prevctx: BooleanExpressionContext = localctx;
		let _startState: number = 10;
		this.enterRecursionRule(localctx, 10, esql_parser.RULE_booleanExpression, _p);
		let _la: number;
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 173;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 6, this._ctx) ) {
			case 1:
				{
				localctx = new LogicalNotContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;

				this.state = 146;
				this.match(esql_parser.NOT);
				this.state = 147;
				this.booleanExpression(7);
				}
				break;
			case 2:
				{
				localctx = new BooleanDefaultContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 148;
				this.valueExpression();
				}
				break;
			case 3:
				{
				localctx = new RegexExpressionContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 149;
				this.regexBooleanExpression();
				}
				break;
			case 4:
				{
				localctx = new LogicalInContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 150;
				this.valueExpression();
				this.state = 152;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===44) {
					{
					this.state = 151;
					this.match(esql_parser.NOT);
					}
				}

				this.state = 154;
				this.match(esql_parser.IN);
				this.state = 155;
				this.match(esql_parser.LP);
				this.state = 156;
				this.valueExpression();
				this.state = 161;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===34) {
					{
					{
					this.state = 157;
					this.match(esql_parser.COMMA);
					this.state = 158;
					this.valueExpression();
					}
					}
					this.state = 163;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 164;
				this.match(esql_parser.RP);
				}
				break;
			case 5:
				{
				localctx = new IsNullContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 166;
				this.valueExpression();
				this.state = 167;
				this.match(esql_parser.IS);
				this.state = 169;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===44) {
					{
					this.state = 168;
					this.match(esql_parser.NOT);
					}
				}

				this.state = 171;
				this.match(esql_parser.NULL);
				}
				break;
			}
			this._ctx.stop = this._input.LT(-1);
			this.state = 183;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 8, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					if (this._parseListeners != null) {
						this.triggerExitRuleEvent();
					}
					_prevctx = localctx;
					{
					this.state = 181;
					this._errHandler.sync(this);
					switch ( this._interp.adaptivePredict(this._input, 7, this._ctx) ) {
					case 1:
						{
						localctx = new LogicalBinaryContext(this, new BooleanExpressionContext(this, _parentctx, _parentState));
						(localctx as LogicalBinaryContext)._left = _prevctx;
						this.pushNewRecursionContext(localctx, _startState, esql_parser.RULE_booleanExpression);
						this.state = 175;
						if (!(this.precpred(this._ctx, 4))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 4)");
						}
						this.state = 176;
						(localctx as LogicalBinaryContext)._operator = this.match(esql_parser.AND);
						this.state = 177;
						(localctx as LogicalBinaryContext)._right = this.booleanExpression(5);
						}
						break;
					case 2:
						{
						localctx = new LogicalBinaryContext(this, new BooleanExpressionContext(this, _parentctx, _parentState));
						(localctx as LogicalBinaryContext)._left = _prevctx;
						this.pushNewRecursionContext(localctx, _startState, esql_parser.RULE_booleanExpression);
						this.state = 178;
						if (!(this.precpred(this._ctx, 3))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 3)");
						}
						this.state = 179;
						(localctx as LogicalBinaryContext)._operator = this.match(esql_parser.OR);
						this.state = 180;
						(localctx as LogicalBinaryContext)._right = this.booleanExpression(4);
						}
						break;
					}
					}
				}
				this.state = 185;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 8, this._ctx);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.unrollRecursionContexts(_parentctx);
		}
		return localctx;
	}
	// @RuleVersion(0)
	public regexBooleanExpression(): RegexBooleanExpressionContext {
		let localctx: RegexBooleanExpressionContext = new RegexBooleanExpressionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 12, esql_parser.RULE_regexBooleanExpression);
		let _la: number;
		try {
			this.state = 200;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 11, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 186;
				this.valueExpression();
				this.state = 188;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===44) {
					{
					this.state = 187;
					this.match(esql_parser.NOT);
					}
				}

				this.state = 190;
				localctx._kind = this.match(esql_parser.LIKE);
				this.state = 191;
				localctx._pattern = this.string_();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 193;
				this.valueExpression();
				this.state = 195;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===44) {
					{
					this.state = 194;
					this.match(esql_parser.NOT);
					}
				}

				this.state = 197;
				localctx._kind = this.match(esql_parser.RLIKE);
				this.state = 198;
				localctx._pattern = this.string_();
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public valueExpression(): ValueExpressionContext {
		let localctx: ValueExpressionContext = new ValueExpressionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 14, esql_parser.RULE_valueExpression);
		try {
			this.state = 207;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 12, this._ctx) ) {
			case 1:
				localctx = new ValueExpressionDefaultContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 202;
				this.operatorExpression(0);
				}
				break;
			case 2:
				localctx = new ComparisonContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 203;
				(localctx as ComparisonContext)._left = this.operatorExpression(0);
				this.state = 204;
				this.comparisonOperator();
				this.state = 205;
				(localctx as ComparisonContext)._right = this.operatorExpression(0);
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
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
		let localctx: OperatorExpressionContext = new OperatorExpressionContext(this, this._ctx, _parentState);
		let _prevctx: OperatorExpressionContext = localctx;
		let _startState: number = 16;
		this.enterRecursionRule(localctx, 16, esql_parser.RULE_operatorExpression, _p);
		let _la: number;
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 213;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 13, this._ctx) ) {
			case 1:
				{
				localctx = new OperatorExpressionDefaultContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;

				this.state = 210;
				this.primaryExpression();
				}
				break;
			case 2:
				{
				localctx = new ArithmeticUnaryContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 211;
				(localctx as ArithmeticUnaryContext)._operator = this._input.LT(1);
				_la = this._input.LA(1);
				if(!(_la===59 || _la===60)) {
				    (localctx as ArithmeticUnaryContext)._operator = this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				this.state = 212;
				this.operatorExpression(3);
				}
				break;
			}
			this._ctx.stop = this._input.LT(-1);
			this.state = 223;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 15, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					if (this._parseListeners != null) {
						this.triggerExitRuleEvent();
					}
					_prevctx = localctx;
					{
					this.state = 221;
					this._errHandler.sync(this);
					switch ( this._interp.adaptivePredict(this._input, 14, this._ctx) ) {
					case 1:
						{
						localctx = new ArithmeticBinaryContext(this, new OperatorExpressionContext(this, _parentctx, _parentState));
						(localctx as ArithmeticBinaryContext)._left = _prevctx;
						this.pushNewRecursionContext(localctx, _startState, esql_parser.RULE_operatorExpression);
						this.state = 215;
						if (!(this.precpred(this._ctx, 2))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 2)");
						}
						this.state = 216;
						(localctx as ArithmeticBinaryContext)._operator = this._input.LT(1);
						_la = this._input.LA(1);
						if(!(((((_la - 61)) & ~0x1F) === 0 && ((1 << (_la - 61)) & 7) !== 0))) {
						    (localctx as ArithmeticBinaryContext)._operator = this._errHandler.recoverInline(this);
						}
						else {
							this._errHandler.reportMatch(this);
						    this.consume();
						}
						this.state = 217;
						(localctx as ArithmeticBinaryContext)._right = this.operatorExpression(3);
						}
						break;
					case 2:
						{
						localctx = new ArithmeticBinaryContext(this, new OperatorExpressionContext(this, _parentctx, _parentState));
						(localctx as ArithmeticBinaryContext)._left = _prevctx;
						this.pushNewRecursionContext(localctx, _startState, esql_parser.RULE_operatorExpression);
						this.state = 218;
						if (!(this.precpred(this._ctx, 1))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 1)");
						}
						this.state = 219;
						(localctx as ArithmeticBinaryContext)._operator = this._input.LT(1);
						_la = this._input.LA(1);
						if(!(_la===59 || _la===60)) {
						    (localctx as ArithmeticBinaryContext)._operator = this._errHandler.recoverInline(this);
						}
						else {
							this._errHandler.reportMatch(this);
						    this.consume();
						}
						this.state = 220;
						(localctx as ArithmeticBinaryContext)._right = this.operatorExpression(2);
						}
						break;
					}
					}
				}
				this.state = 225;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 15, this._ctx);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.unrollRecursionContexts(_parentctx);
		}
		return localctx;
	}
	// @RuleVersion(0)
	public primaryExpression(): PrimaryExpressionContext {
		let localctx: PrimaryExpressionContext = new PrimaryExpressionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 18, esql_parser.RULE_primaryExpression);
		try {
			this.state = 233;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 16, this._ctx) ) {
			case 1:
				localctx = new ConstantDefaultContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 226;
				this.constant();
				}
				break;
			case 2:
				localctx = new DereferenceContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 227;
				this.qualifiedName();
				}
				break;
			case 3:
				localctx = new FunctionContext(this, localctx);
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 228;
				this.functionExpression();
				}
				break;
			case 4:
				localctx = new ParenthesizedExpressionContext(this, localctx);
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 229;
				this.match(esql_parser.LP);
				this.state = 230;
				this.booleanExpression(0);
				this.state = 231;
				this.match(esql_parser.RP);
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public functionExpression(): FunctionExpressionContext {
		let localctx: FunctionExpressionContext = new FunctionExpressionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 20, esql_parser.RULE_functionExpression);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 235;
			this.identifier();
			this.state = 236;
			this.match(esql_parser.LP);
			this.state = 246;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 61:
				{
				this.state = 237;
				this.match(esql_parser.ASTERISK);
				}
				break;
			case 27:
			case 28:
			case 29:
			case 37:
			case 40:
			case 44:
			case 45:
			case 48:
			case 51:
			case 59:
			case 60:
			case 64:
			case 66:
			case 67:
				{
				{
				this.state = 238;
				this.booleanExpression(0);
				this.state = 243;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===34) {
					{
					{
					this.state = 239;
					this.match(esql_parser.COMMA);
					this.state = 240;
					this.booleanExpression(0);
					}
					}
					this.state = 245;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				}
				}
				break;
			case 50:
				break;
			default:
				break;
			}
			this.state = 248;
			this.match(esql_parser.RP);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public rowCommand(): RowCommandContext {
		let localctx: RowCommandContext = new RowCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 22, esql_parser.RULE_rowCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 250;
			this.match(esql_parser.ROW);
			this.state = 251;
			this.fields();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public fields(): FieldsContext {
		let localctx: FieldsContext = new FieldsContext(this, this._ctx, this.state);
		this.enterRule(localctx, 24, esql_parser.RULE_fields);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 253;
			this.field();
			this.state = 258;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 19, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 254;
					this.match(esql_parser.COMMA);
					this.state = 255;
					this.field();
					}
					}
				}
				this.state = 260;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 19, this._ctx);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public field(): FieldContext {
		let localctx: FieldContext = new FieldContext(this, this._ctx, this.state);
		this.enterRule(localctx, 26, esql_parser.RULE_field);
		try {
			this.state = 266;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 20, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 261;
				this.booleanExpression(0);
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 262;
				this.qualifiedName();
				this.state = 263;
				this.match(esql_parser.ASSIGN);
				this.state = 264;
				this.booleanExpression(0);
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public fromCommand(): FromCommandContext {
		let localctx: FromCommandContext = new FromCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 28, esql_parser.RULE_fromCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 268;
			this.match(esql_parser.FROM);
			this.state = 269;
			this.fromIdentifier();
			this.state = 274;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 21, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 270;
					this.match(esql_parser.COMMA);
					this.state = 271;
					this.fromIdentifier();
					}
					}
				}
				this.state = 276;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 21, this._ctx);
			}
			this.state = 278;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 22, this._ctx) ) {
			case 1:
				{
				this.state = 277;
				this.fromOptions();
				}
				break;
			}
			this.state = 281;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 23, this._ctx) ) {
			case 1:
				{
				this.state = 280;
				this.metadata();
				}
				break;
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public fromIdentifier(): FromIdentifierContext {
		let localctx: FromIdentifierContext = new FromIdentifierContext(this, this._ctx, this.state);
		this.enterRule(localctx, 30, esql_parser.RULE_fromIdentifier);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 283;
			_la = this._input.LA(1);
			if(!(_la===67 || _la===73)) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public fromOptions(): FromOptionsContext {
		let localctx: FromOptionsContext = new FromOptionsContext(this, this._ctx, this.state);
		this.enterRule(localctx, 32, esql_parser.RULE_fromOptions);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 285;
			this.match(esql_parser.OPTIONS);
			this.state = 286;
			this.configOption();
			this.state = 291;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 24, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 287;
					this.match(esql_parser.COMMA);
					this.state = 288;
					this.configOption();
					}
					}
				}
				this.state = 293;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 24, this._ctx);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public configOption(): ConfigOptionContext {
		let localctx: ConfigOptionContext = new ConfigOptionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 34, esql_parser.RULE_configOption);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 294;
			this.string_();
			this.state = 295;
			this.match(esql_parser.ASSIGN);
			this.state = 296;
			this.string_();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public metadata(): MetadataContext {
		let localctx: MetadataContext = new MetadataContext(this, this._ctx, this.state);
		this.enterRule(localctx, 36, esql_parser.RULE_metadata);
		try {
			this.state = 300;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 72:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 298;
				this.metadataOption();
				}
				break;
			case 64:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 299;
				this.deprecated_metadata();
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public metadataOption(): MetadataOptionContext {
		let localctx: MetadataOptionContext = new MetadataOptionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 38, esql_parser.RULE_metadataOption);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 302;
			this.match(esql_parser.METADATA);
			this.state = 303;
			this.fromIdentifier();
			this.state = 308;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 26, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 304;
					this.match(esql_parser.COMMA);
					this.state = 305;
					this.fromIdentifier();
					}
					}
				}
				this.state = 310;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 26, this._ctx);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public deprecated_metadata(): Deprecated_metadataContext {
		let localctx: Deprecated_metadataContext = new Deprecated_metadataContext(this, this._ctx, this.state);
		this.enterRule(localctx, 40, esql_parser.RULE_deprecated_metadata);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 311;
			this.match(esql_parser.OPENING_BRACKET);
			this.state = 312;
			this.metadataOption();
			this.state = 313;
			this.match(esql_parser.CLOSING_BRACKET);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public evalCommand(): EvalCommandContext {
		let localctx: EvalCommandContext = new EvalCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 42, esql_parser.RULE_evalCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 315;
			this.match(esql_parser.EVAL);
			this.state = 316;
			this.fields();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public statsCommand(): StatsCommandContext {
		let localctx: StatsCommandContext = new StatsCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 44, esql_parser.RULE_statsCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 318;
			this.match(esql_parser.STATS);
			this.state = 320;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 27, this._ctx) ) {
			case 1:
				{
				this.state = 319;
				localctx._stats = this.fields();
				}
				break;
			}
			this.state = 324;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 28, this._ctx) ) {
			case 1:
				{
				this.state = 322;
				this.match(esql_parser.BY);
				this.state = 323;
				localctx._grouping = this.fields();
				}
				break;
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public inlinestatsCommand(): InlinestatsCommandContext {
		let localctx: InlinestatsCommandContext = new InlinestatsCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 46, esql_parser.RULE_inlinestatsCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 326;
			this.match(esql_parser.INLINESTATS);
			this.state = 327;
			localctx._stats = this.fields();
			this.state = 330;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 29, this._ctx) ) {
			case 1:
				{
				this.state = 328;
				this.match(esql_parser.BY);
				this.state = 329;
				localctx._grouping = this.fields();
				}
				break;
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public qualifiedName(): QualifiedNameContext {
		let localctx: QualifiedNameContext = new QualifiedNameContext(this, this._ctx, this.state);
		this.enterRule(localctx, 48, esql_parser.RULE_qualifiedName);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 332;
			this.identifier();
			this.state = 337;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 30, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 333;
					this.match(esql_parser.DOT);
					this.state = 334;
					this.identifier();
					}
					}
				}
				this.state = 339;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 30, this._ctx);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public qualifiedNamePattern(): QualifiedNamePatternContext {
		let localctx: QualifiedNamePatternContext = new QualifiedNamePatternContext(this, this._ctx, this.state);
		this.enterRule(localctx, 50, esql_parser.RULE_qualifiedNamePattern);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 340;
			this.identifierPattern();
			this.state = 345;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 31, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 341;
					this.match(esql_parser.DOT);
					this.state = 342;
					this.identifierPattern();
					}
					}
				}
				this.state = 347;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 31, this._ctx);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public identifier(): IdentifierContext {
		let localctx: IdentifierContext = new IdentifierContext(this, this._ctx, this.state);
		this.enterRule(localctx, 52, esql_parser.RULE_identifier);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 348;
			_la = this._input.LA(1);
			if(!(_la===66 || _la===67)) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public identifierPattern(): IdentifierPatternContext {
		let localctx: IdentifierPatternContext = new IdentifierPatternContext(this, this._ctx, this.state);
		this.enterRule(localctx, 54, esql_parser.RULE_identifierPattern);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 350;
			this.match(esql_parser.ID_PATTERN);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public constant(): ConstantContext {
		let localctx: ConstantContext = new ConstantContext(this, this._ctx, this.state);
		this.enterRule(localctx, 56, esql_parser.RULE_constant);
		let _la: number;
		try {
			this.state = 394;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 35, this._ctx) ) {
			case 1:
				localctx = new NullLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 352;
				this.match(esql_parser.NULL);
				}
				break;
			case 2:
				localctx = new QualifiedIntegerLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 353;
				this.integerValue();
				this.state = 354;
				this.match(esql_parser.UNQUOTED_IDENTIFIER);
				}
				break;
			case 3:
				localctx = new DecimalLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 356;
				this.decimalValue();
				}
				break;
			case 4:
				localctx = new IntegerLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 357;
				this.integerValue();
				}
				break;
			case 5:
				localctx = new BooleanLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 5);
				{
				this.state = 358;
				this.booleanValue();
				}
				break;
			case 6:
				localctx = new InputParamContext(this, localctx);
				this.enterOuterAlt(localctx, 6);
				{
				this.state = 359;
				this.match(esql_parser.PARAM);
				}
				break;
			case 7:
				localctx = new StringLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 7);
				{
				this.state = 360;
				this.string_();
				}
				break;
			case 8:
				localctx = new NumericArrayLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 8);
				{
				this.state = 361;
				this.match(esql_parser.OPENING_BRACKET);
				this.state = 362;
				this.numericValue();
				this.state = 367;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===34) {
					{
					{
					this.state = 363;
					this.match(esql_parser.COMMA);
					this.state = 364;
					this.numericValue();
					}
					}
					this.state = 369;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 370;
				this.match(esql_parser.CLOSING_BRACKET);
				}
				break;
			case 9:
				localctx = new BooleanArrayLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 9);
				{
				this.state = 372;
				this.match(esql_parser.OPENING_BRACKET);
				this.state = 373;
				this.booleanValue();
				this.state = 378;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===34) {
					{
					{
					this.state = 374;
					this.match(esql_parser.COMMA);
					this.state = 375;
					this.booleanValue();
					}
					}
					this.state = 380;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 381;
				this.match(esql_parser.CLOSING_BRACKET);
				}
				break;
			case 10:
				localctx = new StringArrayLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 10);
				{
				this.state = 383;
				this.match(esql_parser.OPENING_BRACKET);
				this.state = 384;
				this.string_();
				this.state = 389;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===34) {
					{
					{
					this.state = 385;
					this.match(esql_parser.COMMA);
					this.state = 386;
					this.string_();
					}
					}
					this.state = 391;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 392;
				this.match(esql_parser.CLOSING_BRACKET);
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public limitCommand(): LimitCommandContext {
		let localctx: LimitCommandContext = new LimitCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 58, esql_parser.RULE_limitCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 396;
			this.match(esql_parser.LIMIT);
			this.state = 397;
			this.match(esql_parser.INTEGER_LITERAL);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public sortCommand(): SortCommandContext {
		let localctx: SortCommandContext = new SortCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 60, esql_parser.RULE_sortCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 399;
			this.match(esql_parser.SORT);
			this.state = 400;
			this.orderExpression();
			this.state = 405;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 36, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 401;
					this.match(esql_parser.COMMA);
					this.state = 402;
					this.orderExpression();
					}
					}
				}
				this.state = 407;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 36, this._ctx);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public orderExpression(): OrderExpressionContext {
		let localctx: OrderExpressionContext = new OrderExpressionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 62, esql_parser.RULE_orderExpression);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 408;
			this.booleanExpression(0);
			this.state = 410;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 37, this._ctx) ) {
			case 1:
				{
				this.state = 409;
				localctx._ordering = this._input.LT(1);
				_la = this._input.LA(1);
				if(!(_la===32 || _la===35)) {
				    localctx._ordering = this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				}
				break;
			}
			this.state = 414;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 38, this._ctx) ) {
			case 1:
				{
				this.state = 412;
				this.match(esql_parser.NULLS);
				this.state = 413;
				localctx._nullOrdering = this._input.LT(1);
				_la = this._input.LA(1);
				if(!(_la===38 || _la===39)) {
				    localctx._nullOrdering = this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				}
				break;
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public keepCommand(): KeepCommandContext {
		let localctx: KeepCommandContext = new KeepCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 64, esql_parser.RULE_keepCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 416;
			this.match(esql_parser.KEEP);
			this.state = 417;
			this.qualifiedNamePattern();
			this.state = 422;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 39, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 418;
					this.match(esql_parser.COMMA);
					this.state = 419;
					this.qualifiedNamePattern();
					}
					}
				}
				this.state = 424;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 39, this._ctx);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public dropCommand(): DropCommandContext {
		let localctx: DropCommandContext = new DropCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 66, esql_parser.RULE_dropCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 425;
			this.match(esql_parser.DROP);
			this.state = 426;
			this.qualifiedNamePattern();
			this.state = 431;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 40, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 427;
					this.match(esql_parser.COMMA);
					this.state = 428;
					this.qualifiedNamePattern();
					}
					}
				}
				this.state = 433;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 40, this._ctx);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public renameCommand(): RenameCommandContext {
		let localctx: RenameCommandContext = new RenameCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 68, esql_parser.RULE_renameCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 434;
			this.match(esql_parser.RENAME);
			this.state = 435;
			this.renameClause();
			this.state = 440;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 41, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 436;
					this.match(esql_parser.COMMA);
					this.state = 437;
					this.renameClause();
					}
					}
				}
				this.state = 442;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 41, this._ctx);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public renameClause(): RenameClauseContext {
		let localctx: RenameClauseContext = new RenameClauseContext(this, this._ctx, this.state);
		this.enterRule(localctx, 70, esql_parser.RULE_renameClause);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 443;
			localctx._oldName = this.qualifiedNamePattern();
			this.state = 444;
			this.match(esql_parser.AS);
			this.state = 445;
			localctx._newName = this.qualifiedNamePattern();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public dissectCommand(): DissectCommandContext {
		let localctx: DissectCommandContext = new DissectCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 72, esql_parser.RULE_dissectCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 447;
			this.match(esql_parser.DISSECT);
			this.state = 448;
			this.primaryExpression();
			this.state = 449;
			this.string_();
			this.state = 451;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 42, this._ctx) ) {
			case 1:
				{
				this.state = 450;
				this.commandOptions();
				}
				break;
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public grokCommand(): GrokCommandContext {
		let localctx: GrokCommandContext = new GrokCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 74, esql_parser.RULE_grokCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 453;
			this.match(esql_parser.GROK);
			this.state = 454;
			this.primaryExpression();
			this.state = 455;
			this.string_();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public mvExpandCommand(): MvExpandCommandContext {
		let localctx: MvExpandCommandContext = new MvExpandCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 76, esql_parser.RULE_mvExpandCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 457;
			this.match(esql_parser.MV_EXPAND);
			this.state = 458;
			this.qualifiedName();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public commandOptions(): CommandOptionsContext {
		let localctx: CommandOptionsContext = new CommandOptionsContext(this, this._ctx, this.state);
		this.enterRule(localctx, 78, esql_parser.RULE_commandOptions);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 460;
			this.commandOption();
			this.state = 465;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 43, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 461;
					this.match(esql_parser.COMMA);
					this.state = 462;
					this.commandOption();
					}
					}
				}
				this.state = 467;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 43, this._ctx);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public commandOption(): CommandOptionContext {
		let localctx: CommandOptionContext = new CommandOptionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 80, esql_parser.RULE_commandOption);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 468;
			this.identifier();
			this.state = 469;
			this.match(esql_parser.ASSIGN);
			this.state = 470;
			this.constant();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public booleanValue(): BooleanValueContext {
		let localctx: BooleanValueContext = new BooleanValueContext(this, this._ctx, this.state);
		this.enterRule(localctx, 82, esql_parser.RULE_booleanValue);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 472;
			_la = this._input.LA(1);
			if(!(_la===37 || _la===51)) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public numericValue(): NumericValueContext {
		let localctx: NumericValueContext = new NumericValueContext(this, this._ctx, this.state);
		this.enterRule(localctx, 84, esql_parser.RULE_numericValue);
		try {
			this.state = 476;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 44, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 474;
				this.decimalValue();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 475;
				this.integerValue();
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public decimalValue(): DecimalValueContext {
		let localctx: DecimalValueContext = new DecimalValueContext(this, this._ctx, this.state);
		this.enterRule(localctx, 86, esql_parser.RULE_decimalValue);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 479;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===59 || _la===60) {
				{
				this.state = 478;
				_la = this._input.LA(1);
				if(!(_la===59 || _la===60)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				}
			}

			this.state = 481;
			this.match(esql_parser.DECIMAL_LITERAL);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public integerValue(): IntegerValueContext {
		let localctx: IntegerValueContext = new IntegerValueContext(this, this._ctx, this.state);
		this.enterRule(localctx, 88, esql_parser.RULE_integerValue);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 484;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===59 || _la===60) {
				{
				this.state = 483;
				_la = this._input.LA(1);
				if(!(_la===59 || _la===60)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				}
			}

			this.state = 486;
			this.match(esql_parser.INTEGER_LITERAL);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public string_(): StringContext {
		let localctx: StringContext = new StringContext(this, this._ctx, this.state);
		this.enterRule(localctx, 90, esql_parser.RULE_string);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 488;
			this.match(esql_parser.QUOTED_STRING);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public comparisonOperator(): ComparisonOperatorContext {
		let localctx: ComparisonOperatorContext = new ComparisonOperatorContext(this, this._ctx, this.state);
		this.enterRule(localctx, 92, esql_parser.RULE_comparisonOperator);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 490;
			_la = this._input.LA(1);
			if(!(((((_la - 52)) & ~0x1F) === 0 && ((1 << (_la - 52)) & 125) !== 0))) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public explainCommand(): ExplainCommandContext {
		let localctx: ExplainCommandContext = new ExplainCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 94, esql_parser.RULE_explainCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 492;
			this.match(esql_parser.EXPLAIN);
			this.state = 493;
			this.subqueryExpression();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public subqueryExpression(): SubqueryExpressionContext {
		let localctx: SubqueryExpressionContext = new SubqueryExpressionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 96, esql_parser.RULE_subqueryExpression);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 495;
			this.match(esql_parser.OPENING_BRACKET);
			this.state = 496;
			this.query(0);
			this.state = 497;
			this.match(esql_parser.CLOSING_BRACKET);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public showCommand(): ShowCommandContext {
		let localctx: ShowCommandContext = new ShowCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 98, esql_parser.RULE_showCommand);
		try {
			localctx = new ShowInfoContext(this, localctx);
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 499;
			this.match(esql_parser.SHOW);
			this.state = 500;
			this.match(esql_parser.INFO);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public metaCommand(): MetaCommandContext {
		let localctx: MetaCommandContext = new MetaCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 100, esql_parser.RULE_metaCommand);
		try {
			localctx = new MetaFunctionsContext(this, localctx);
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 502;
			this.match(esql_parser.META);
			this.state = 503;
			this.match(esql_parser.FUNCTIONS);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public enrichCommand(): EnrichCommandContext {
		let localctx: EnrichCommandContext = new EnrichCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 102, esql_parser.RULE_enrichCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 505;
			this.match(esql_parser.ENRICH);
			this.state = 506;
			localctx._policyName = this.match(esql_parser.ENRICH_POLICY_NAME);
			this.state = 509;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 47, this._ctx) ) {
			case 1:
				{
				this.state = 507;
				this.match(esql_parser.ON);
				this.state = 508;
				localctx._matchField = this.qualifiedNamePattern();
				}
				break;
			}
			this.state = 520;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 49, this._ctx) ) {
			case 1:
				{
				this.state = 511;
				this.match(esql_parser.WITH);
				this.state = 512;
				this.enrichWithClause();
				this.state = 517;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 48, this._ctx);
				while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
					if (_alt === 1) {
						{
						{
						this.state = 513;
						this.match(esql_parser.COMMA);
						this.state = 514;
						this.enrichWithClause();
						}
						}
					}
					this.state = 519;
					this._errHandler.sync(this);
					_alt = this._interp.adaptivePredict(this._input, 48, this._ctx);
				}
				}
				break;
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public enrichWithClause(): EnrichWithClauseContext {
		let localctx: EnrichWithClauseContext = new EnrichWithClauseContext(this, this._ctx, this.state);
		this.enterRule(localctx, 104, esql_parser.RULE_enrichWithClause);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 525;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 50, this._ctx) ) {
			case 1:
				{
				this.state = 522;
				localctx._newName = this.qualifiedNamePattern();
				this.state = 523;
				this.match(esql_parser.ASSIGN);
				}
				break;
			}
			this.state = 527;
			localctx._enrichField = this.qualifiedNamePattern();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
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
	private booleanExpression_sempred(localctx: BooleanExpressionContext, predIndex: number): boolean {
		switch (predIndex) {
		case 1:
			return this.precpred(this._ctx, 4);
		case 2:
			return this.precpred(this._ctx, 3);
		}
		return true;
	}
	private operatorExpression_sempred(localctx: OperatorExpressionContext, predIndex: number): boolean {
		switch (predIndex) {
		case 3:
			return this.precpred(this._ctx, 2);
		case 4:
			return this.precpred(this._ctx, 1);
		}
		return true;
	}

	public static readonly _serializedATN: number[] = [4,1,109,530,2,0,7,0,
	2,1,7,1,2,2,7,2,2,3,7,3,2,4,7,4,2,5,7,5,2,6,7,6,2,7,7,7,2,8,7,8,2,9,7,9,
	2,10,7,10,2,11,7,11,2,12,7,12,2,13,7,13,2,14,7,14,2,15,7,15,2,16,7,16,2,
	17,7,17,2,18,7,18,2,19,7,19,2,20,7,20,2,21,7,21,2,22,7,22,2,23,7,23,2,24,
	7,24,2,25,7,25,2,26,7,26,2,27,7,27,2,28,7,28,2,29,7,29,2,30,7,30,2,31,7,
	31,2,32,7,32,2,33,7,33,2,34,7,34,2,35,7,35,2,36,7,36,2,37,7,37,2,38,7,38,
	2,39,7,39,2,40,7,40,2,41,7,41,2,42,7,42,2,43,7,43,2,44,7,44,2,45,7,45,2,
	46,7,46,2,47,7,47,2,48,7,48,2,49,7,49,2,50,7,50,2,51,7,51,2,52,7,52,1,0,
	1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,5,1,116,8,1,10,1,12,1,119,9,1,1,2,1,2,1,
	2,1,2,1,2,3,2,126,8,2,1,3,1,3,1,3,1,3,1,3,1,3,1,3,1,3,1,3,1,3,1,3,1,3,1,
	3,3,3,141,8,3,1,4,1,4,1,4,1,5,1,5,1,5,1,5,1,5,1,5,1,5,3,5,153,8,5,1,5,1,
	5,1,5,1,5,1,5,5,5,160,8,5,10,5,12,5,163,9,5,1,5,1,5,1,5,1,5,1,5,3,5,170,
	8,5,1,5,1,5,3,5,174,8,5,1,5,1,5,1,5,1,5,1,5,1,5,5,5,182,8,5,10,5,12,5,185,
	9,5,1,6,1,6,3,6,189,8,6,1,6,1,6,1,6,1,6,1,6,3,6,196,8,6,1,6,1,6,1,6,3,6,
	201,8,6,1,7,1,7,1,7,1,7,1,7,3,7,208,8,7,1,8,1,8,1,8,1,8,3,8,214,8,8,1,8,
	1,8,1,8,1,8,1,8,1,8,5,8,222,8,8,10,8,12,8,225,9,8,1,9,1,9,1,9,1,9,1,9,1,
	9,1,9,3,9,234,8,9,1,10,1,10,1,10,1,10,1,10,1,10,5,10,242,8,10,10,10,12,
	10,245,9,10,3,10,247,8,10,1,10,1,10,1,11,1,11,1,11,1,12,1,12,1,12,5,12,
	257,8,12,10,12,12,12,260,9,12,1,13,1,13,1,13,1,13,1,13,3,13,267,8,13,1,
	14,1,14,1,14,1,14,5,14,273,8,14,10,14,12,14,276,9,14,1,14,3,14,279,8,14,
	1,14,3,14,282,8,14,1,15,1,15,1,16,1,16,1,16,1,16,5,16,290,8,16,10,16,12,
	16,293,9,16,1,17,1,17,1,17,1,17,1,18,1,18,3,18,301,8,18,1,19,1,19,1,19,
	1,19,5,19,307,8,19,10,19,12,19,310,9,19,1,20,1,20,1,20,1,20,1,21,1,21,1,
	21,1,22,1,22,3,22,321,8,22,1,22,1,22,3,22,325,8,22,1,23,1,23,1,23,1,23,
	3,23,331,8,23,1,24,1,24,1,24,5,24,336,8,24,10,24,12,24,339,9,24,1,25,1,
	25,1,25,5,25,344,8,25,10,25,12,25,347,9,25,1,26,1,26,1,27,1,27,1,28,1,28,
	1,28,1,28,1,28,1,28,1,28,1,28,1,28,1,28,1,28,1,28,1,28,5,28,366,8,28,10,
	28,12,28,369,9,28,1,28,1,28,1,28,1,28,1,28,1,28,5,28,377,8,28,10,28,12,
	28,380,9,28,1,28,1,28,1,28,1,28,1,28,1,28,5,28,388,8,28,10,28,12,28,391,
	9,28,1,28,1,28,3,28,395,8,28,1,29,1,29,1,29,1,30,1,30,1,30,1,30,5,30,404,
	8,30,10,30,12,30,407,9,30,1,31,1,31,3,31,411,8,31,1,31,1,31,3,31,415,8,
	31,1,32,1,32,1,32,1,32,5,32,421,8,32,10,32,12,32,424,9,32,1,33,1,33,1,33,
	1,33,5,33,430,8,33,10,33,12,33,433,9,33,1,34,1,34,1,34,1,34,5,34,439,8,
	34,10,34,12,34,442,9,34,1,35,1,35,1,35,1,35,1,36,1,36,1,36,1,36,3,36,452,
	8,36,1,37,1,37,1,37,1,37,1,38,1,38,1,38,1,39,1,39,1,39,5,39,464,8,39,10,
	39,12,39,467,9,39,1,40,1,40,1,40,1,40,1,41,1,41,1,42,1,42,3,42,477,8,42,
	1,43,3,43,480,8,43,1,43,1,43,1,44,3,44,485,8,44,1,44,1,44,1,45,1,45,1,46,
	1,46,1,47,1,47,1,47,1,48,1,48,1,48,1,48,1,49,1,49,1,49,1,50,1,50,1,50,1,
	51,1,51,1,51,1,51,3,51,510,8,51,1,51,1,51,1,51,1,51,5,51,516,8,51,10,51,
	12,51,519,9,51,3,51,521,8,51,1,52,1,52,1,52,3,52,526,8,52,1,52,1,52,1,52,
	0,3,2,10,16,53,0,2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,
	42,44,46,48,50,52,54,56,58,60,62,64,66,68,70,72,74,76,78,80,82,84,86,88,
	90,92,94,96,98,100,102,104,0,8,1,0,59,60,1,0,61,63,2,0,67,67,73,73,1,0,
	66,67,2,0,32,32,35,35,1,0,38,39,2,0,37,37,51,51,2,0,52,52,54,58,555,0,106,
	1,0,0,0,2,109,1,0,0,0,4,125,1,0,0,0,6,140,1,0,0,0,8,142,1,0,0,0,10,173,
	1,0,0,0,12,200,1,0,0,0,14,207,1,0,0,0,16,213,1,0,0,0,18,233,1,0,0,0,20,
	235,1,0,0,0,22,250,1,0,0,0,24,253,1,0,0,0,26,266,1,0,0,0,28,268,1,0,0,0,
	30,283,1,0,0,0,32,285,1,0,0,0,34,294,1,0,0,0,36,300,1,0,0,0,38,302,1,0,
	0,0,40,311,1,0,0,0,42,315,1,0,0,0,44,318,1,0,0,0,46,326,1,0,0,0,48,332,
	1,0,0,0,50,340,1,0,0,0,52,348,1,0,0,0,54,350,1,0,0,0,56,394,1,0,0,0,58,
	396,1,0,0,0,60,399,1,0,0,0,62,408,1,0,0,0,64,416,1,0,0,0,66,425,1,0,0,0,
	68,434,1,0,0,0,70,443,1,0,0,0,72,447,1,0,0,0,74,453,1,0,0,0,76,457,1,0,
	0,0,78,460,1,0,0,0,80,468,1,0,0,0,82,472,1,0,0,0,84,476,1,0,0,0,86,479,
	1,0,0,0,88,484,1,0,0,0,90,488,1,0,0,0,92,490,1,0,0,0,94,492,1,0,0,0,96,
	495,1,0,0,0,98,499,1,0,0,0,100,502,1,0,0,0,102,505,1,0,0,0,104,525,1,0,
	0,0,106,107,3,2,1,0,107,108,5,0,0,1,108,1,1,0,0,0,109,110,6,1,-1,0,110,
	111,3,4,2,0,111,117,1,0,0,0,112,113,10,1,0,0,113,114,5,26,0,0,114,116,3,
	6,3,0,115,112,1,0,0,0,116,119,1,0,0,0,117,115,1,0,0,0,117,118,1,0,0,0,118,
	3,1,0,0,0,119,117,1,0,0,0,120,126,3,94,47,0,121,126,3,28,14,0,122,126,3,
	22,11,0,123,126,3,98,49,0,124,126,3,100,50,0,125,120,1,0,0,0,125,121,1,
	0,0,0,125,122,1,0,0,0,125,123,1,0,0,0,125,124,1,0,0,0,126,5,1,0,0,0,127,
	141,3,42,21,0,128,141,3,46,23,0,129,141,3,58,29,0,130,141,3,64,32,0,131,
	141,3,60,30,0,132,141,3,44,22,0,133,141,3,8,4,0,134,141,3,66,33,0,135,141,
	3,68,34,0,136,141,3,72,36,0,137,141,3,74,37,0,138,141,3,102,51,0,139,141,
	3,76,38,0,140,127,1,0,0,0,140,128,1,0,0,0,140,129,1,0,0,0,140,130,1,0,0,
	0,140,131,1,0,0,0,140,132,1,0,0,0,140,133,1,0,0,0,140,134,1,0,0,0,140,135,
	1,0,0,0,140,136,1,0,0,0,140,137,1,0,0,0,140,138,1,0,0,0,140,139,1,0,0,0,
	141,7,1,0,0,0,142,143,5,18,0,0,143,144,3,10,5,0,144,9,1,0,0,0,145,146,6,
	5,-1,0,146,147,5,44,0,0,147,174,3,10,5,7,148,174,3,14,7,0,149,174,3,12,
	6,0,150,152,3,14,7,0,151,153,5,44,0,0,152,151,1,0,0,0,152,153,1,0,0,0,153,
	154,1,0,0,0,154,155,5,41,0,0,155,156,5,40,0,0,156,161,3,14,7,0,157,158,
	5,34,0,0,158,160,3,14,7,0,159,157,1,0,0,0,160,163,1,0,0,0,161,159,1,0,0,
	0,161,162,1,0,0,0,162,164,1,0,0,0,163,161,1,0,0,0,164,165,5,50,0,0,165,
	174,1,0,0,0,166,167,3,14,7,0,167,169,5,42,0,0,168,170,5,44,0,0,169,168,
	1,0,0,0,169,170,1,0,0,0,170,171,1,0,0,0,171,172,5,45,0,0,172,174,1,0,0,
	0,173,145,1,0,0,0,173,148,1,0,0,0,173,149,1,0,0,0,173,150,1,0,0,0,173,166,
	1,0,0,0,174,183,1,0,0,0,175,176,10,4,0,0,176,177,5,31,0,0,177,182,3,10,
	5,5,178,179,10,3,0,0,179,180,5,47,0,0,180,182,3,10,5,4,181,175,1,0,0,0,
	181,178,1,0,0,0,182,185,1,0,0,0,183,181,1,0,0,0,183,184,1,0,0,0,184,11,
	1,0,0,0,185,183,1,0,0,0,186,188,3,14,7,0,187,189,5,44,0,0,188,187,1,0,0,
	0,188,189,1,0,0,0,189,190,1,0,0,0,190,191,5,43,0,0,191,192,3,90,45,0,192,
	201,1,0,0,0,193,195,3,14,7,0,194,196,5,44,0,0,195,194,1,0,0,0,195,196,1,
	0,0,0,196,197,1,0,0,0,197,198,5,49,0,0,198,199,3,90,45,0,199,201,1,0,0,
	0,200,186,1,0,0,0,200,193,1,0,0,0,201,13,1,0,0,0,202,208,3,16,8,0,203,204,
	3,16,8,0,204,205,3,92,46,0,205,206,3,16,8,0,206,208,1,0,0,0,207,202,1,0,
	0,0,207,203,1,0,0,0,208,15,1,0,0,0,209,210,6,8,-1,0,210,214,3,18,9,0,211,
	212,7,0,0,0,212,214,3,16,8,3,213,209,1,0,0,0,213,211,1,0,0,0,214,223,1,
	0,0,0,215,216,10,2,0,0,216,217,7,1,0,0,217,222,3,16,8,3,218,219,10,1,0,
	0,219,220,7,0,0,0,220,222,3,16,8,2,221,215,1,0,0,0,221,218,1,0,0,0,222,
	225,1,0,0,0,223,221,1,0,0,0,223,224,1,0,0,0,224,17,1,0,0,0,225,223,1,0,
	0,0,226,234,3,56,28,0,227,234,3,48,24,0,228,234,3,20,10,0,229,230,5,40,
	0,0,230,231,3,10,5,0,231,232,5,50,0,0,232,234,1,0,0,0,233,226,1,0,0,0,233,
	227,1,0,0,0,233,228,1,0,0,0,233,229,1,0,0,0,234,19,1,0,0,0,235,236,3,52,
	26,0,236,246,5,40,0,0,237,247,5,61,0,0,238,243,3,10,5,0,239,240,5,34,0,
	0,240,242,3,10,5,0,241,239,1,0,0,0,242,245,1,0,0,0,243,241,1,0,0,0,243,
	244,1,0,0,0,244,247,1,0,0,0,245,243,1,0,0,0,246,237,1,0,0,0,246,238,1,0,
	0,0,246,247,1,0,0,0,247,248,1,0,0,0,248,249,5,50,0,0,249,21,1,0,0,0,250,
	251,5,14,0,0,251,252,3,24,12,0,252,23,1,0,0,0,253,258,3,26,13,0,254,255,
	5,34,0,0,255,257,3,26,13,0,256,254,1,0,0,0,257,260,1,0,0,0,258,256,1,0,
	0,0,258,259,1,0,0,0,259,25,1,0,0,0,260,258,1,0,0,0,261,267,3,10,5,0,262,
	263,3,48,24,0,263,264,5,33,0,0,264,265,3,10,5,0,265,267,1,0,0,0,266,261,
	1,0,0,0,266,262,1,0,0,0,267,27,1,0,0,0,268,269,5,6,0,0,269,274,3,30,15,
	0,270,271,5,34,0,0,271,273,3,30,15,0,272,270,1,0,0,0,273,276,1,0,0,0,274,
	272,1,0,0,0,274,275,1,0,0,0,275,278,1,0,0,0,276,274,1,0,0,0,277,279,3,32,
	16,0,278,277,1,0,0,0,278,279,1,0,0,0,279,281,1,0,0,0,280,282,3,36,18,0,
	281,280,1,0,0,0,281,282,1,0,0,0,282,29,1,0,0,0,283,284,7,2,0,0,284,31,1,
	0,0,0,285,286,5,71,0,0,286,291,3,34,17,0,287,288,5,34,0,0,288,290,3,34,
	17,0,289,287,1,0,0,0,290,293,1,0,0,0,291,289,1,0,0,0,291,292,1,0,0,0,292,
	33,1,0,0,0,293,291,1,0,0,0,294,295,3,90,45,0,295,296,5,33,0,0,296,297,3,
	90,45,0,297,35,1,0,0,0,298,301,3,38,19,0,299,301,3,40,20,0,300,298,1,0,
	0,0,300,299,1,0,0,0,301,37,1,0,0,0,302,303,5,72,0,0,303,308,3,30,15,0,304,
	305,5,34,0,0,305,307,3,30,15,0,306,304,1,0,0,0,307,310,1,0,0,0,308,306,
	1,0,0,0,308,309,1,0,0,0,309,39,1,0,0,0,310,308,1,0,0,0,311,312,5,64,0,0,
	312,313,3,38,19,0,313,314,5,65,0,0,314,41,1,0,0,0,315,316,5,4,0,0,316,317,
	3,24,12,0,317,43,1,0,0,0,318,320,5,17,0,0,319,321,3,24,12,0,320,319,1,0,
	0,0,320,321,1,0,0,0,321,324,1,0,0,0,322,323,5,30,0,0,323,325,3,24,12,0,
	324,322,1,0,0,0,324,325,1,0,0,0,325,45,1,0,0,0,326,327,5,8,0,0,327,330,
	3,24,12,0,328,329,5,30,0,0,329,331,3,24,12,0,330,328,1,0,0,0,330,331,1,
	0,0,0,331,47,1,0,0,0,332,337,3,52,26,0,333,334,5,36,0,0,334,336,3,52,26,
	0,335,333,1,0,0,0,336,339,1,0,0,0,337,335,1,0,0,0,337,338,1,0,0,0,338,49,
	1,0,0,0,339,337,1,0,0,0,340,345,3,54,27,0,341,342,5,36,0,0,342,344,3,54,
	27,0,343,341,1,0,0,0,344,347,1,0,0,0,345,343,1,0,0,0,345,346,1,0,0,0,346,
	51,1,0,0,0,347,345,1,0,0,0,348,349,7,3,0,0,349,53,1,0,0,0,350,351,5,77,
	0,0,351,55,1,0,0,0,352,395,5,45,0,0,353,354,3,88,44,0,354,355,5,66,0,0,
	355,395,1,0,0,0,356,395,3,86,43,0,357,395,3,88,44,0,358,395,3,82,41,0,359,
	395,5,48,0,0,360,395,3,90,45,0,361,362,5,64,0,0,362,367,3,84,42,0,363,364,
	5,34,0,0,364,366,3,84,42,0,365,363,1,0,0,0,366,369,1,0,0,0,367,365,1,0,
	0,0,367,368,1,0,0,0,368,370,1,0,0,0,369,367,1,0,0,0,370,371,5,65,0,0,371,
	395,1,0,0,0,372,373,5,64,0,0,373,378,3,82,41,0,374,375,5,34,0,0,375,377,
	3,82,41,0,376,374,1,0,0,0,377,380,1,0,0,0,378,376,1,0,0,0,378,379,1,0,0,
	0,379,381,1,0,0,0,380,378,1,0,0,0,381,382,5,65,0,0,382,395,1,0,0,0,383,
	384,5,64,0,0,384,389,3,90,45,0,385,386,5,34,0,0,386,388,3,90,45,0,387,385,
	1,0,0,0,388,391,1,0,0,0,389,387,1,0,0,0,389,390,1,0,0,0,390,392,1,0,0,0,
	391,389,1,0,0,0,392,393,5,65,0,0,393,395,1,0,0,0,394,352,1,0,0,0,394,353,
	1,0,0,0,394,356,1,0,0,0,394,357,1,0,0,0,394,358,1,0,0,0,394,359,1,0,0,0,
	394,360,1,0,0,0,394,361,1,0,0,0,394,372,1,0,0,0,394,383,1,0,0,0,395,57,
	1,0,0,0,396,397,5,10,0,0,397,398,5,28,0,0,398,59,1,0,0,0,399,400,5,16,0,
	0,400,405,3,62,31,0,401,402,5,34,0,0,402,404,3,62,31,0,403,401,1,0,0,0,
	404,407,1,0,0,0,405,403,1,0,0,0,405,406,1,0,0,0,406,61,1,0,0,0,407,405,
	1,0,0,0,408,410,3,10,5,0,409,411,7,4,0,0,410,409,1,0,0,0,410,411,1,0,0,
	0,411,414,1,0,0,0,412,413,5,46,0,0,413,415,7,5,0,0,414,412,1,0,0,0,414,
	415,1,0,0,0,415,63,1,0,0,0,416,417,5,9,0,0,417,422,3,50,25,0,418,419,5,
	34,0,0,419,421,3,50,25,0,420,418,1,0,0,0,421,424,1,0,0,0,422,420,1,0,0,
	0,422,423,1,0,0,0,423,65,1,0,0,0,424,422,1,0,0,0,425,426,5,2,0,0,426,431,
	3,50,25,0,427,428,5,34,0,0,428,430,3,50,25,0,429,427,1,0,0,0,430,433,1,
	0,0,0,431,429,1,0,0,0,431,432,1,0,0,0,432,67,1,0,0,0,433,431,1,0,0,0,434,
	435,5,13,0,0,435,440,3,70,35,0,436,437,5,34,0,0,437,439,3,70,35,0,438,436,
	1,0,0,0,439,442,1,0,0,0,440,438,1,0,0,0,440,441,1,0,0,0,441,69,1,0,0,0,
	442,440,1,0,0,0,443,444,3,50,25,0,444,445,5,81,0,0,445,446,3,50,25,0,446,
	71,1,0,0,0,447,448,5,1,0,0,448,449,3,18,9,0,449,451,3,90,45,0,450,452,3,
	78,39,0,451,450,1,0,0,0,451,452,1,0,0,0,452,73,1,0,0,0,453,454,5,7,0,0,
	454,455,3,18,9,0,455,456,3,90,45,0,456,75,1,0,0,0,457,458,5,12,0,0,458,
	459,3,48,24,0,459,77,1,0,0,0,460,465,3,80,40,0,461,462,5,34,0,0,462,464,
	3,80,40,0,463,461,1,0,0,0,464,467,1,0,0,0,465,463,1,0,0,0,465,466,1,0,0,
	0,466,79,1,0,0,0,467,465,1,0,0,0,468,469,3,52,26,0,469,470,5,33,0,0,470,
	471,3,56,28,0,471,81,1,0,0,0,472,473,7,6,0,0,473,83,1,0,0,0,474,477,3,86,
	43,0,475,477,3,88,44,0,476,474,1,0,0,0,476,475,1,0,0,0,477,85,1,0,0,0,478,
	480,7,0,0,0,479,478,1,0,0,0,479,480,1,0,0,0,480,481,1,0,0,0,481,482,5,29,
	0,0,482,87,1,0,0,0,483,485,7,0,0,0,484,483,1,0,0,0,484,485,1,0,0,0,485,
	486,1,0,0,0,486,487,5,28,0,0,487,89,1,0,0,0,488,489,5,27,0,0,489,91,1,0,
	0,0,490,491,7,7,0,0,491,93,1,0,0,0,492,493,5,5,0,0,493,494,3,96,48,0,494,
	95,1,0,0,0,495,496,5,64,0,0,496,497,3,2,1,0,497,498,5,65,0,0,498,97,1,0,
	0,0,499,500,5,15,0,0,500,501,5,97,0,0,501,99,1,0,0,0,502,503,5,11,0,0,503,
	504,5,101,0,0,504,101,1,0,0,0,505,506,5,3,0,0,506,509,5,87,0,0,507,508,
	5,85,0,0,508,510,3,50,25,0,509,507,1,0,0,0,509,510,1,0,0,0,510,520,1,0,
	0,0,511,512,5,86,0,0,512,517,3,104,52,0,513,514,5,34,0,0,514,516,3,104,
	52,0,515,513,1,0,0,0,516,519,1,0,0,0,517,515,1,0,0,0,517,518,1,0,0,0,518,
	521,1,0,0,0,519,517,1,0,0,0,520,511,1,0,0,0,520,521,1,0,0,0,521,103,1,0,
	0,0,522,523,3,50,25,0,523,524,5,33,0,0,524,526,1,0,0,0,525,522,1,0,0,0,
	525,526,1,0,0,0,526,527,1,0,0,0,527,528,3,50,25,0,528,105,1,0,0,0,51,117,
	125,140,152,161,169,173,181,183,188,195,200,207,213,221,223,233,243,246,
	258,266,274,278,281,291,300,308,320,324,330,337,345,367,378,389,394,405,
	410,414,422,431,440,451,465,476,479,484,509,517,520,525];

	private static __ATN: ATN;
	public static get _ATN(): ATN {
		if (!esql_parser.__ATN) {
			esql_parser.__ATN = new ATNDeserializer().deserialize(esql_parser._serializedATN);
		}

		return esql_parser.__ATN;
	}


	static DecisionsToDFA = esql_parser._ATN.decisionToState.map( (ds: DecisionState, index: number) => new DFA(ds, index) );

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
	    if(listener.enterSingleStatement) {
	 		listener.enterSingleStatement(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitSingleStatement) {
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
	    if(listener.enterCompositeQuery) {
	 		listener.enterCompositeQuery(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitCompositeQuery) {
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
	    if(listener.enterSingleCommandQuery) {
	 		listener.enterSingleCommandQuery(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitSingleCommandQuery) {
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
	    if(listener.enterSourceCommand) {
	 		listener.enterSourceCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitSourceCommand) {
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
	    if(listener.enterProcessingCommand) {
	 		listener.enterProcessingCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitProcessingCommand) {
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
	    if(listener.enterWhereCommand) {
	 		listener.enterWhereCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitWhereCommand) {
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
	    if(listener.enterLogicalNot) {
	 		listener.enterLogicalNot(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitLogicalNot) {
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
	    if(listener.enterBooleanDefault) {
	 		listener.enterBooleanDefault(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitBooleanDefault) {
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
	    if(listener.enterIsNull) {
	 		listener.enterIsNull(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitIsNull) {
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
		return this.getTypedRuleContext(RegexBooleanExpressionContext, 0) as RegexBooleanExpressionContext;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterRegexExpression) {
	 		listener.enterRegexExpression(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitRegexExpression) {
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
	    if(listener.enterLogicalIn) {
	 		listener.enterLogicalIn(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitLogicalIn) {
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
	    if(listener.enterLogicalBinary) {
	 		listener.enterLogicalBinary(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitLogicalBinary) {
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
	    if(listener.enterRegexBooleanExpression) {
	 		listener.enterRegexBooleanExpression(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitRegexBooleanExpression) {
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
	    if(listener.enterValueExpressionDefault) {
	 		listener.enterValueExpressionDefault(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitValueExpressionDefault) {
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
	    if(listener.enterComparison) {
	 		listener.enterComparison(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitComparison) {
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
	    if(listener.enterOperatorExpressionDefault) {
	 		listener.enterOperatorExpressionDefault(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitOperatorExpressionDefault) {
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
	    if(listener.enterArithmeticBinary) {
	 		listener.enterArithmeticBinary(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitArithmeticBinary) {
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
	    if(listener.enterArithmeticUnary) {
	 		listener.enterArithmeticUnary(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitArithmeticUnary) {
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
	    if(listener.enterDereference) {
	 		listener.enterDereference(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitDereference) {
	 		listener.exitDereference(this);
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
	    if(listener.enterConstantDefault) {
	 		listener.enterConstantDefault(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitConstantDefault) {
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
	    if(listener.enterParenthesizedExpression) {
	 		listener.enterParenthesizedExpression(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitParenthesizedExpression) {
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
	    if(listener.enterFunction) {
	 		listener.enterFunction(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitFunction) {
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
	    if(listener.enterFunctionExpression) {
	 		listener.enterFunctionExpression(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitFunctionExpression) {
	 		listener.exitFunctionExpression(this);
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
	    if(listener.enterRowCommand) {
	 		listener.enterRowCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitRowCommand) {
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
	    if(listener.enterFields) {
	 		listener.enterFields(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitFields) {
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
	    if(listener.enterField) {
	 		listener.enterField(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitField) {
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
	public fromOptions(): FromOptionsContext {
		return this.getTypedRuleContext(FromOptionsContext, 0) as FromOptionsContext;
	}
	public metadata(): MetadataContext {
		return this.getTypedRuleContext(MetadataContext, 0) as MetadataContext;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_fromCommand;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterFromCommand) {
	 		listener.enterFromCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitFromCommand) {
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
	public QUOTED_IDENTIFIER(): TerminalNode {
		return this.getToken(esql_parser.QUOTED_IDENTIFIER, 0);
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_fromIdentifier;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterFromIdentifier) {
	 		listener.enterFromIdentifier(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitFromIdentifier) {
	 		listener.exitFromIdentifier(this);
		}
	}
}


export class FromOptionsContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public OPTIONS(): TerminalNode {
		return this.getToken(esql_parser.OPTIONS, 0);
	}
	public configOption_list(): ConfigOptionContext[] {
		return this.getTypedRuleContexts(ConfigOptionContext) as ConfigOptionContext[];
	}
	public configOption(i: number): ConfigOptionContext {
		return this.getTypedRuleContext(ConfigOptionContext, i) as ConfigOptionContext;
	}
	public COMMA_list(): TerminalNode[] {
	    	return this.getTokens(esql_parser.COMMA);
	}
	public COMMA(i: number): TerminalNode {
		return this.getToken(esql_parser.COMMA, i);
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_fromOptions;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterFromOptions) {
	 		listener.enterFromOptions(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitFromOptions) {
	 		listener.exitFromOptions(this);
		}
	}
}


export class ConfigOptionContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public string__list(): StringContext[] {
		return this.getTypedRuleContexts(StringContext) as StringContext[];
	}
	public string_(i: number): StringContext {
		return this.getTypedRuleContext(StringContext, i) as StringContext;
	}
	public ASSIGN(): TerminalNode {
		return this.getToken(esql_parser.ASSIGN, 0);
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_configOption;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterConfigOption) {
	 		listener.enterConfigOption(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitConfigOption) {
	 		listener.exitConfigOption(this);
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
	    if(listener.enterMetadata) {
	 		listener.enterMetadata(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitMetadata) {
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
	    if(listener.enterMetadataOption) {
	 		listener.enterMetadataOption(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitMetadataOption) {
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
	    if(listener.enterDeprecated_metadata) {
	 		listener.enterDeprecated_metadata(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitDeprecated_metadata) {
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
	    if(listener.enterEvalCommand) {
	 		listener.enterEvalCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitEvalCommand) {
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
	    if(listener.enterStatsCommand) {
	 		listener.enterStatsCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitStatsCommand) {
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
	    if(listener.enterInlinestatsCommand) {
	 		listener.enterInlinestatsCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitInlinestatsCommand) {
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
	    if(listener.enterQualifiedName) {
	 		listener.enterQualifiedName(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitQualifiedName) {
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
	    if(listener.enterQualifiedNamePattern) {
	 		listener.enterQualifiedNamePattern(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitQualifiedNamePattern) {
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
	    if(listener.enterIdentifier) {
	 		listener.enterIdentifier(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitIdentifier) {
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
	    if(listener.enterIdentifierPattern) {
	 		listener.enterIdentifierPattern(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitIdentifierPattern) {
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
	    if(listener.enterBooleanArrayLiteral) {
	 		listener.enterBooleanArrayLiteral(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitBooleanArrayLiteral) {
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
	    if(listener.enterDecimalLiteral) {
	 		listener.enterDecimalLiteral(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitDecimalLiteral) {
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
	    if(listener.enterNullLiteral) {
	 		listener.enterNullLiteral(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitNullLiteral) {
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
	    if(listener.enterQualifiedIntegerLiteral) {
	 		listener.enterQualifiedIntegerLiteral(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitQualifiedIntegerLiteral) {
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
	    if(listener.enterStringArrayLiteral) {
	 		listener.enterStringArrayLiteral(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitStringArrayLiteral) {
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
	    if(listener.enterStringLiteral) {
	 		listener.enterStringLiteral(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitStringLiteral) {
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
	    if(listener.enterNumericArrayLiteral) {
	 		listener.enterNumericArrayLiteral(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitNumericArrayLiteral) {
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
	    if(listener.enterInputParam) {
	 		listener.enterInputParam(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitInputParam) {
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
	    if(listener.enterIntegerLiteral) {
	 		listener.enterIntegerLiteral(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitIntegerLiteral) {
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
	    if(listener.enterBooleanLiteral) {
	 		listener.enterBooleanLiteral(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitBooleanLiteral) {
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
	    if(listener.enterLimitCommand) {
	 		listener.enterLimitCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitLimitCommand) {
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
	    if(listener.enterSortCommand) {
	 		listener.enterSortCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitSortCommand) {
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
	    if(listener.enterOrderExpression) {
	 		listener.enterOrderExpression(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitOrderExpression) {
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
	    if(listener.enterKeepCommand) {
	 		listener.enterKeepCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitKeepCommand) {
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
	    if(listener.enterDropCommand) {
	 		listener.enterDropCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitDropCommand) {
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
	    if(listener.enterRenameCommand) {
	 		listener.enterRenameCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitRenameCommand) {
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
	    if(listener.enterRenameClause) {
	 		listener.enterRenameClause(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitRenameClause) {
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
	    if(listener.enterDissectCommand) {
	 		listener.enterDissectCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitDissectCommand) {
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
	    if(listener.enterGrokCommand) {
	 		listener.enterGrokCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitGrokCommand) {
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
	    if(listener.enterMvExpandCommand) {
	 		listener.enterMvExpandCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitMvExpandCommand) {
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
	    if(listener.enterCommandOptions) {
	 		listener.enterCommandOptions(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitCommandOptions) {
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
	    if(listener.enterCommandOption) {
	 		listener.enterCommandOption(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitCommandOption) {
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
	    if(listener.enterBooleanValue) {
	 		listener.enterBooleanValue(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitBooleanValue) {
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
	    if(listener.enterNumericValue) {
	 		listener.enterNumericValue(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitNumericValue) {
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
	    if(listener.enterDecimalValue) {
	 		listener.enterDecimalValue(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitDecimalValue) {
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
	    if(listener.enterIntegerValue) {
	 		listener.enterIntegerValue(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitIntegerValue) {
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
	    if(listener.enterString) {
	 		listener.enterString(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitString) {
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
	    if(listener.enterComparisonOperator) {
	 		listener.enterComparisonOperator(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitComparisonOperator) {
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
	    if(listener.enterExplainCommand) {
	 		listener.enterExplainCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitExplainCommand) {
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
	    if(listener.enterSubqueryExpression) {
	 		listener.enterSubqueryExpression(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitSubqueryExpression) {
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
	    if(listener.enterShowInfo) {
	 		listener.enterShowInfo(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitShowInfo) {
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
	    if(listener.enterMetaFunctions) {
	 		listener.enterMetaFunctions(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitMetaFunctions) {
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
	    if(listener.enterEnrichCommand) {
	 		listener.enterEnrichCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitEnrichCommand) {
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
	    if(listener.enterEnrichWithClause) {
	 		listener.enterEnrichWithClause(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitEnrichWithClause) {
	 		listener.exitEnrichWithClause(this);
		}
	}
}
