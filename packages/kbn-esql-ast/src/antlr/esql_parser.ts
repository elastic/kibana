// @ts-nocheck
// Generated from src/antlr/esql_parser.g4 by ANTLR 4.13.2
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
	public static readonly LOOKUP = 11;
	public static readonly META = 12;
	public static readonly METRICS = 13;
	public static readonly MV_EXPAND = 14;
	public static readonly RENAME = 15;
	public static readonly ROW = 16;
	public static readonly SHOW = 17;
	public static readonly SORT = 18;
	public static readonly STATS = 19;
	public static readonly WHERE = 20;
	public static readonly MATCH = 21;
	public static readonly UNKNOWN_CMD = 22;
	public static readonly LINE_COMMENT = 23;
	public static readonly MULTILINE_COMMENT = 24;
	public static readonly WS = 25;
	public static readonly UNQUOTED_SOURCE = 26;
	public static readonly EXPLAIN_WS = 27;
	public static readonly EXPLAIN_LINE_COMMENT = 28;
	public static readonly EXPLAIN_MULTILINE_COMMENT = 29;
	public static readonly PIPE = 30;
	public static readonly QUOTED_STRING = 31;
	public static readonly INTEGER_LITERAL = 32;
	public static readonly DECIMAL_LITERAL = 33;
	public static readonly BY = 34;
	public static readonly AND = 35;
	public static readonly ASC = 36;
	public static readonly ASSIGN = 37;
	public static readonly CAST_OP = 38;
	public static readonly COMMA = 39;
	public static readonly DESC = 40;
	public static readonly DOT = 41;
	public static readonly FALSE = 42;
	public static readonly FIRST = 43;
	public static readonly IN = 44;
	public static readonly IS = 45;
	public static readonly LAST = 46;
	public static readonly LIKE = 47;
	public static readonly LP = 48;
	public static readonly MATCH_OPERATOR = 49;
	public static readonly NOT = 50;
	public static readonly NULL = 51;
	public static readonly NULLS = 52;
	public static readonly OR = 53;
	public static readonly PARAM = 54;
	public static readonly RLIKE = 55;
	public static readonly RP = 56;
	public static readonly TRUE = 57;
	public static readonly EQ = 58;
	public static readonly CIEQ = 59;
	public static readonly NEQ = 60;
	public static readonly LT = 61;
	public static readonly LTE = 62;
	public static readonly GT = 63;
	public static readonly GTE = 64;
	public static readonly PLUS = 65;
	public static readonly MINUS = 66;
	public static readonly ASTERISK = 67;
	public static readonly SLASH = 68;
	public static readonly PERCENT = 69;
	public static readonly NAMED_OR_POSITIONAL_PARAM = 70;
	public static readonly OPENING_BRACKET = 71;
	public static readonly CLOSING_BRACKET = 72;
	public static readonly UNQUOTED_IDENTIFIER = 73;
	public static readonly QUOTED_IDENTIFIER = 74;
	public static readonly EXPR_LINE_COMMENT = 75;
	public static readonly EXPR_MULTILINE_COMMENT = 76;
	public static readonly EXPR_WS = 77;
	public static readonly METADATA = 78;
	public static readonly FROM_LINE_COMMENT = 79;
	public static readonly FROM_MULTILINE_COMMENT = 80;
	public static readonly FROM_WS = 81;
	public static readonly ID_PATTERN = 82;
	public static readonly PROJECT_LINE_COMMENT = 83;
	public static readonly PROJECT_MULTILINE_COMMENT = 84;
	public static readonly PROJECT_WS = 85;
	public static readonly AS = 86;
	public static readonly RENAME_LINE_COMMENT = 87;
	public static readonly RENAME_MULTILINE_COMMENT = 88;
	public static readonly RENAME_WS = 89;
	public static readonly ON = 90;
	public static readonly WITH = 91;
	public static readonly ENRICH_POLICY_NAME = 92;
	public static readonly ENRICH_LINE_COMMENT = 93;
	public static readonly ENRICH_MULTILINE_COMMENT = 94;
	public static readonly ENRICH_WS = 95;
	public static readonly ENRICH_FIELD_LINE_COMMENT = 96;
	public static readonly ENRICH_FIELD_MULTILINE_COMMENT = 97;
	public static readonly ENRICH_FIELD_WS = 98;
	public static readonly LOOKUP_LINE_COMMENT = 99;
	public static readonly LOOKUP_MULTILINE_COMMENT = 100;
	public static readonly LOOKUP_WS = 101;
	public static readonly LOOKUP_FIELD_LINE_COMMENT = 102;
	public static readonly LOOKUP_FIELD_MULTILINE_COMMENT = 103;
	public static readonly LOOKUP_FIELD_WS = 104;
	public static readonly MVEXPAND_LINE_COMMENT = 105;
	public static readonly MVEXPAND_MULTILINE_COMMENT = 106;
	public static readonly MVEXPAND_WS = 107;
	public static readonly INFO = 108;
	public static readonly SHOW_LINE_COMMENT = 109;
	public static readonly SHOW_MULTILINE_COMMENT = 110;
	public static readonly SHOW_WS = 111;
	public static readonly FUNCTIONS = 112;
	public static readonly META_LINE_COMMENT = 113;
	public static readonly META_MULTILINE_COMMENT = 114;
	public static readonly META_WS = 115;
	public static readonly COLON = 116;
	public static readonly SETTING = 117;
	public static readonly SETTING_LINE_COMMENT = 118;
	public static readonly SETTTING_MULTILINE_COMMENT = 119;
	public static readonly SETTING_WS = 120;
	public static readonly METRICS_LINE_COMMENT = 121;
	public static readonly METRICS_MULTILINE_COMMENT = 122;
	public static readonly METRICS_WS = 123;
	public static readonly CLOSING_METRICS_LINE_COMMENT = 124;
	public static readonly CLOSING_METRICS_MULTILINE_COMMENT = 125;
	public static readonly CLOSING_METRICS_WS = 126;
	public static override readonly EOF = Token.EOF;
	public static readonly RULE_singleStatement = 0;
	public static readonly RULE_query = 1;
	public static readonly RULE_sourceCommand = 2;
	public static readonly RULE_processingCommand = 3;
	public static readonly RULE_whereCommand = 4;
	public static readonly RULE_booleanExpression = 5;
	public static readonly RULE_regexBooleanExpression = 6;
	public static readonly RULE_matchBooleanExpression = 7;
	public static readonly RULE_valueExpression = 8;
	public static readonly RULE_operatorExpression = 9;
	public static readonly RULE_primaryExpression = 10;
	public static readonly RULE_functionExpression = 11;
	public static readonly RULE_dataType = 12;
	public static readonly RULE_rowCommand = 13;
	public static readonly RULE_fields = 14;
	public static readonly RULE_field = 15;
	public static readonly RULE_fromCommand = 16;
	public static readonly RULE_indexPattern = 17;
	public static readonly RULE_clusterString = 18;
	public static readonly RULE_indexString = 19;
	public static readonly RULE_metadata = 20;
	public static readonly RULE_metadataOption = 21;
	public static readonly RULE_deprecated_metadata = 22;
	public static readonly RULE_metricsCommand = 23;
	public static readonly RULE_evalCommand = 24;
	public static readonly RULE_statsCommand = 25;
	public static readonly RULE_inlinestatsCommand = 26;
	public static readonly RULE_qualifiedName = 27;
	public static readonly RULE_qualifiedNamePattern = 28;
	public static readonly RULE_qualifiedNamePatterns = 29;
	public static readonly RULE_identifier = 30;
	public static readonly RULE_identifierPattern = 31;
	public static readonly RULE_constant = 32;
	public static readonly RULE_params = 33;
	public static readonly RULE_limitCommand = 34;
	public static readonly RULE_sortCommand = 35;
	public static readonly RULE_orderExpression = 36;
	public static readonly RULE_keepCommand = 37;
	public static readonly RULE_dropCommand = 38;
	public static readonly RULE_renameCommand = 39;
	public static readonly RULE_renameClause = 40;
	public static readonly RULE_dissectCommand = 41;
	public static readonly RULE_grokCommand = 42;
	public static readonly RULE_mvExpandCommand = 43;
	public static readonly RULE_commandOptions = 44;
	public static readonly RULE_commandOption = 45;
	public static readonly RULE_booleanValue = 46;
	public static readonly RULE_numericValue = 47;
	public static readonly RULE_decimalValue = 48;
	public static readonly RULE_integerValue = 49;
	public static readonly RULE_string = 50;
	public static readonly RULE_comparisonOperator = 51;
	public static readonly RULE_explainCommand = 52;
	public static readonly RULE_subqueryExpression = 53;
	public static readonly RULE_showCommand = 54;
	public static readonly RULE_metaCommand = 55;
	public static readonly RULE_enrichCommand = 56;
	public static readonly RULE_enrichWithClause = 57;
	public static readonly RULE_lookupCommand = 58;
	public static readonly RULE_matchCommand = 59;
	public static readonly RULE_matchQuery = 60;
	public static readonly literalNames: (string | null)[] = [ null, "'dissect'", 
                                                            "'drop'", "'enrich'", 
                                                            "'eval'", "'explain'", 
                                                            "'from'", "'grok'", 
                                                            "'inlinestats'", 
                                                            "'keep'", "'limit'", 
                                                            "'lookup'", 
                                                            "'meta'", "'metrics'", 
                                                            "'mv_expand'", 
                                                            "'rename'", 
                                                            "'row'", "'show'", 
                                                            "'sort'", "'stats'", 
                                                            "'where'", null, 
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            "'|'", null, 
                                                            null, null, 
                                                            "'by'", "'and'", 
                                                            "'asc'", "'='", 
                                                            "'::'", "','", 
                                                            "'desc'", "'.'", 
                                                            "'false'", "'first'", 
                                                            "'in'", "'is'", 
                                                            "'last'", "'like'", 
                                                            "'('", null, 
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
                                                            null, null, 
                                                            "']'", null, 
                                                            null, null, 
                                                            null, null, 
                                                            "'metadata'", 
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            null, "'as'", 
                                                            null, null, 
                                                            null, "'on'", 
                                                            "'with'", null, 
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            null, "'info'", 
                                                            null, null, 
                                                            null, "'functions'", 
                                                            null, null, 
                                                            null, "':'" ];
	public static readonly symbolicNames: (string | null)[] = [ null, "DISSECT", 
                                                             "DROP", "ENRICH", 
                                                             "EVAL", "EXPLAIN", 
                                                             "FROM", "GROK", 
                                                             "INLINESTATS", 
                                                             "KEEP", "LIMIT", 
                                                             "LOOKUP", "META", 
                                                             "METRICS", 
                                                             "MV_EXPAND", 
                                                             "RENAME", "ROW", 
                                                             "SHOW", "SORT", 
                                                             "STATS", "WHERE", 
                                                             "MATCH", "UNKNOWN_CMD", 
                                                             "LINE_COMMENT", 
                                                             "MULTILINE_COMMENT", 
                                                             "WS", "UNQUOTED_SOURCE", 
                                                             "EXPLAIN_WS", 
                                                             "EXPLAIN_LINE_COMMENT", 
                                                             "EXPLAIN_MULTILINE_COMMENT", 
                                                             "PIPE", "QUOTED_STRING", 
                                                             "INTEGER_LITERAL", 
                                                             "DECIMAL_LITERAL", 
                                                             "BY", "AND", 
                                                             "ASC", "ASSIGN", 
                                                             "CAST_OP", 
                                                             "COMMA", "DESC", 
                                                             "DOT", "FALSE", 
                                                             "FIRST", "IN", 
                                                             "IS", "LAST", 
                                                             "LIKE", "LP", 
                                                             "MATCH_OPERATOR", 
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
                                                             "NAMED_OR_POSITIONAL_PARAM", 
                                                             "OPENING_BRACKET", 
                                                             "CLOSING_BRACKET", 
                                                             "UNQUOTED_IDENTIFIER", 
                                                             "QUOTED_IDENTIFIER", 
                                                             "EXPR_LINE_COMMENT", 
                                                             "EXPR_MULTILINE_COMMENT", 
                                                             "EXPR_WS", 
                                                             "METADATA", 
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
                                                             "LOOKUP_LINE_COMMENT", 
                                                             "LOOKUP_MULTILINE_COMMENT", 
                                                             "LOOKUP_WS", 
                                                             "LOOKUP_FIELD_LINE_COMMENT", 
                                                             "LOOKUP_FIELD_MULTILINE_COMMENT", 
                                                             "LOOKUP_FIELD_WS", 
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
                                                             "SETTING_WS", 
                                                             "METRICS_LINE_COMMENT", 
                                                             "METRICS_MULTILINE_COMMENT", 
                                                             "METRICS_WS", 
                                                             "CLOSING_METRICS_LINE_COMMENT", 
                                                             "CLOSING_METRICS_MULTILINE_COMMENT", 
                                                             "CLOSING_METRICS_WS" ];
	// tslint:disable:no-trailing-whitespace
	public static readonly ruleNames: string[] = [
		"singleStatement", "query", "sourceCommand", "processingCommand", "whereCommand", 
		"booleanExpression", "regexBooleanExpression", "matchBooleanExpression", 
		"valueExpression", "operatorExpression", "primaryExpression", "functionExpression", 
		"dataType", "rowCommand", "fields", "field", "fromCommand", "indexPattern", 
		"clusterString", "indexString", "metadata", "metadataOption", "deprecated_metadata", 
		"metricsCommand", "evalCommand", "statsCommand", "inlinestatsCommand", 
		"qualifiedName", "qualifiedNamePattern", "qualifiedNamePatterns", "identifier", 
		"identifierPattern", "constant", "params", "limitCommand", "sortCommand", 
		"orderExpression", "keepCommand", "dropCommand", "renameCommand", "renameClause", 
		"dissectCommand", "grokCommand", "mvExpandCommand", "commandOptions", 
		"commandOption", "booleanValue", "numericValue", "decimalValue", "integerValue", 
		"string", "comparisonOperator", "explainCommand", "subqueryExpression", 
		"showCommand", "metaCommand", "enrichCommand", "enrichWithClause", "lookupCommand", 
		"matchCommand", "matchQuery",
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
			this.state = 122;
			this.query(0);
			this.state = 123;
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

			this.state = 126;
			this.sourceCommand();
			}
			this._ctx.stop = this._input.LT(-1);
			this.state = 133;
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
					this.state = 128;
					if (!(this.precpred(this._ctx, 1))) {
						throw this.createFailedPredicateException("this.precpred(this._ctx, 1)");
					}
					this.state = 129;
					this.match(esql_parser.PIPE);
					this.state = 130;
					this.processingCommand();
					}
					}
				}
				this.state = 135;
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
			this.state = 142;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 5:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 136;
				this.explainCommand();
				}
				break;
			case 6:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 137;
				this.fromCommand();
				}
				break;
			case 16:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 138;
				this.rowCommand();
				}
				break;
			case 13:
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 139;
				this.metricsCommand();
				}
				break;
			case 17:
				this.enterOuterAlt(localctx, 5);
				{
				this.state = 140;
				this.showCommand();
				}
				break;
			case 12:
				this.enterOuterAlt(localctx, 6);
				{
				this.state = 141;
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
			this.state = 159;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 4:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 144;
				this.evalCommand();
				}
				break;
			case 8:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 145;
				this.inlinestatsCommand();
				}
				break;
			case 10:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 146;
				this.limitCommand();
				}
				break;
			case 11:
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 147;
				this.lookupCommand();
				}
				break;
			case 9:
				this.enterOuterAlt(localctx, 5);
				{
				this.state = 148;
				this.keepCommand();
				}
				break;
			case 18:
				this.enterOuterAlt(localctx, 6);
				{
				this.state = 149;
				this.sortCommand();
				}
				break;
			case 19:
				this.enterOuterAlt(localctx, 7);
				{
				this.state = 150;
				this.statsCommand();
				}
				break;
			case 20:
				this.enterOuterAlt(localctx, 8);
				{
				this.state = 151;
				this.whereCommand();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 9);
				{
				this.state = 152;
				this.dropCommand();
				}
				break;
			case 15:
				this.enterOuterAlt(localctx, 10);
				{
				this.state = 153;
				this.renameCommand();
				}
				break;
			case 1:
				this.enterOuterAlt(localctx, 11);
				{
				this.state = 154;
				this.dissectCommand();
				}
				break;
			case 7:
				this.enterOuterAlt(localctx, 12);
				{
				this.state = 155;
				this.grokCommand();
				}
				break;
			case 3:
				this.enterOuterAlt(localctx, 13);
				{
				this.state = 156;
				this.enrichCommand();
				}
				break;
			case 14:
				this.enterOuterAlt(localctx, 14);
				{
				this.state = 157;
				this.mvExpandCommand();
				}
				break;
			case 21:
				this.enterOuterAlt(localctx, 15);
				{
				this.state = 158;
				this.matchCommand();
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
			this.state = 161;
			this.match(esql_parser.WHERE);
			this.state = 162;
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
			this.state = 193;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 6, this._ctx) ) {
			case 1:
				{
				localctx = new LogicalNotContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;

				this.state = 165;
				this.match(esql_parser.NOT);
				this.state = 166;
				this.booleanExpression(8);
				}
				break;
			case 2:
				{
				localctx = new BooleanDefaultContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 167;
				this.valueExpression();
				}
				break;
			case 3:
				{
				localctx = new RegexExpressionContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 168;
				this.regexBooleanExpression();
				}
				break;
			case 4:
				{
				localctx = new MatchExpressionContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 169;
				this.matchBooleanExpression();
				}
				break;
			case 5:
				{
				localctx = new LogicalInContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 170;
				this.valueExpression();
				this.state = 172;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===50) {
					{
					this.state = 171;
					this.match(esql_parser.NOT);
					}
				}

				this.state = 174;
				this.match(esql_parser.IN);
				this.state = 175;
				this.match(esql_parser.LP);
				this.state = 176;
				this.valueExpression();
				this.state = 181;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===39) {
					{
					{
					this.state = 177;
					this.match(esql_parser.COMMA);
					this.state = 178;
					this.valueExpression();
					}
					}
					this.state = 183;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 184;
				this.match(esql_parser.RP);
				}
				break;
			case 6:
				{
				localctx = new IsNullContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 186;
				this.valueExpression();
				this.state = 187;
				this.match(esql_parser.IS);
				this.state = 189;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===50) {
					{
					this.state = 188;
					this.match(esql_parser.NOT);
					}
				}

				this.state = 191;
				this.match(esql_parser.NULL);
				}
				break;
			}
			this._ctx.stop = this._input.LT(-1);
			this.state = 203;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 8, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					if (this._parseListeners != null) {
						this.triggerExitRuleEvent();
					}
					_prevctx = localctx;
					{
					this.state = 201;
					this._errHandler.sync(this);
					switch ( this._interp.adaptivePredict(this._input, 7, this._ctx) ) {
					case 1:
						{
						localctx = new LogicalBinaryContext(this, new BooleanExpressionContext(this, _parentctx, _parentState));
						(localctx as LogicalBinaryContext)._left = _prevctx;
						this.pushNewRecursionContext(localctx, _startState, esql_parser.RULE_booleanExpression);
						this.state = 195;
						if (!(this.precpred(this._ctx, 4))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 4)");
						}
						this.state = 196;
						(localctx as LogicalBinaryContext)._operator = this.match(esql_parser.AND);
						this.state = 197;
						(localctx as LogicalBinaryContext)._right = this.booleanExpression(5);
						}
						break;
					case 2:
						{
						localctx = new LogicalBinaryContext(this, new BooleanExpressionContext(this, _parentctx, _parentState));
						(localctx as LogicalBinaryContext)._left = _prevctx;
						this.pushNewRecursionContext(localctx, _startState, esql_parser.RULE_booleanExpression);
						this.state = 198;
						if (!(this.precpred(this._ctx, 3))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 3)");
						}
						this.state = 199;
						(localctx as LogicalBinaryContext)._operator = this.match(esql_parser.OR);
						this.state = 200;
						(localctx as LogicalBinaryContext)._right = this.booleanExpression(4);
						}
						break;
					}
					}
				}
				this.state = 205;
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
			this.state = 220;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 11, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 206;
				this.valueExpression();
				this.state = 208;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===50) {
					{
					this.state = 207;
					this.match(esql_parser.NOT);
					}
				}

				this.state = 210;
				localctx._kind = this.match(esql_parser.LIKE);
				this.state = 211;
				localctx._pattern = this.string_();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 213;
				this.valueExpression();
				this.state = 215;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===50) {
					{
					this.state = 214;
					this.match(esql_parser.NOT);
					}
				}

				this.state = 217;
				localctx._kind = this.match(esql_parser.RLIKE);
				this.state = 218;
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
	public matchBooleanExpression(): MatchBooleanExpressionContext {
		let localctx: MatchBooleanExpressionContext = new MatchBooleanExpressionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 14, esql_parser.RULE_matchBooleanExpression);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 222;
			this.qualifiedName();
			this.state = 223;
			this.match(esql_parser.MATCH_OPERATOR);
			this.state = 224;
			localctx._queryString = this.string_();
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
		this.enterRule(localctx, 16, esql_parser.RULE_valueExpression);
		try {
			this.state = 231;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 12, this._ctx) ) {
			case 1:
				localctx = new ValueExpressionDefaultContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 226;
				this.operatorExpression(0);
				}
				break;
			case 2:
				localctx = new ComparisonContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 227;
				(localctx as ComparisonContext)._left = this.operatorExpression(0);
				this.state = 228;
				this.comparisonOperator();
				this.state = 229;
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
		let _startState: number = 18;
		this.enterRecursionRule(localctx, 18, esql_parser.RULE_operatorExpression, _p);
		let _la: number;
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 237;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 13, this._ctx) ) {
			case 1:
				{
				localctx = new OperatorExpressionDefaultContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;

				this.state = 234;
				this.primaryExpression(0);
				}
				break;
			case 2:
				{
				localctx = new ArithmeticUnaryContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 235;
				(localctx as ArithmeticUnaryContext)._operator = this._input.LT(1);
				_la = this._input.LA(1);
				if(!(_la===65 || _la===66)) {
				    (localctx as ArithmeticUnaryContext)._operator = this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				this.state = 236;
				this.operatorExpression(3);
				}
				break;
			}
			this._ctx.stop = this._input.LT(-1);
			this.state = 247;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 15, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					if (this._parseListeners != null) {
						this.triggerExitRuleEvent();
					}
					_prevctx = localctx;
					{
					this.state = 245;
					this._errHandler.sync(this);
					switch ( this._interp.adaptivePredict(this._input, 14, this._ctx) ) {
					case 1:
						{
						localctx = new ArithmeticBinaryContext(this, new OperatorExpressionContext(this, _parentctx, _parentState));
						(localctx as ArithmeticBinaryContext)._left = _prevctx;
						this.pushNewRecursionContext(localctx, _startState, esql_parser.RULE_operatorExpression);
						this.state = 239;
						if (!(this.precpred(this._ctx, 2))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 2)");
						}
						this.state = 240;
						(localctx as ArithmeticBinaryContext)._operator = this._input.LT(1);
						_la = this._input.LA(1);
						if(!(((((_la - 67)) & ~0x1F) === 0 && ((1 << (_la - 67)) & 7) !== 0))) {
						    (localctx as ArithmeticBinaryContext)._operator = this._errHandler.recoverInline(this);
						}
						else {
							this._errHandler.reportMatch(this);
						    this.consume();
						}
						this.state = 241;
						(localctx as ArithmeticBinaryContext)._right = this.operatorExpression(3);
						}
						break;
					case 2:
						{
						localctx = new ArithmeticBinaryContext(this, new OperatorExpressionContext(this, _parentctx, _parentState));
						(localctx as ArithmeticBinaryContext)._left = _prevctx;
						this.pushNewRecursionContext(localctx, _startState, esql_parser.RULE_operatorExpression);
						this.state = 242;
						if (!(this.precpred(this._ctx, 1))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 1)");
						}
						this.state = 243;
						(localctx as ArithmeticBinaryContext)._operator = this._input.LT(1);
						_la = this._input.LA(1);
						if(!(_la===65 || _la===66)) {
						    (localctx as ArithmeticBinaryContext)._operator = this._errHandler.recoverInline(this);
						}
						else {
							this._errHandler.reportMatch(this);
						    this.consume();
						}
						this.state = 244;
						(localctx as ArithmeticBinaryContext)._right = this.operatorExpression(2);
						}
						break;
					}
					}
				}
				this.state = 249;
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

	public primaryExpression(): PrimaryExpressionContext;
	public primaryExpression(_p: number): PrimaryExpressionContext;
	// @RuleVersion(0)
	public primaryExpression(_p?: number): PrimaryExpressionContext {
		if (_p === undefined) {
			_p = 0;
		}

		let _parentctx: ParserRuleContext = this._ctx;
		let _parentState: number = this.state;
		let localctx: PrimaryExpressionContext = new PrimaryExpressionContext(this, this._ctx, _parentState);
		let _prevctx: PrimaryExpressionContext = localctx;
		let _startState: number = 20;
		this.enterRecursionRule(localctx, 20, esql_parser.RULE_primaryExpression, _p);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 258;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 16, this._ctx) ) {
			case 1:
				{
				localctx = new ConstantDefaultContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;

				this.state = 251;
				this.constant();
				}
				break;
			case 2:
				{
				localctx = new DereferenceContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 252;
				this.qualifiedName();
				}
				break;
			case 3:
				{
				localctx = new FunctionContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 253;
				this.functionExpression();
				}
				break;
			case 4:
				{
				localctx = new ParenthesizedExpressionContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 254;
				this.match(esql_parser.LP);
				this.state = 255;
				this.booleanExpression(0);
				this.state = 256;
				this.match(esql_parser.RP);
				}
				break;
			}
			this._ctx.stop = this._input.LT(-1);
			this.state = 265;
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
					localctx = new InlineCastContext(this, new PrimaryExpressionContext(this, _parentctx, _parentState));
					this.pushNewRecursionContext(localctx, _startState, esql_parser.RULE_primaryExpression);
					this.state = 260;
					if (!(this.precpred(this._ctx, 1))) {
						throw this.createFailedPredicateException("this.precpred(this._ctx, 1)");
					}
					this.state = 261;
					this.match(esql_parser.CAST_OP);
					this.state = 262;
					this.dataType();
					}
					}
				}
				this.state = 267;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 17, this._ctx);
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
	public functionExpression(): FunctionExpressionContext {
		let localctx: FunctionExpressionContext = new FunctionExpressionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 22, esql_parser.RULE_functionExpression);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 268;
			this.identifier();
			this.state = 269;
			this.match(esql_parser.LP);
			this.state = 279;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 67:
				{
				this.state = 270;
				this.match(esql_parser.ASTERISK);
				}
				break;
			case 31:
			case 32:
			case 33:
			case 42:
			case 48:
			case 50:
			case 51:
			case 54:
			case 57:
			case 65:
			case 66:
			case 70:
			case 71:
			case 73:
			case 74:
				{
				{
				this.state = 271;
				this.booleanExpression(0);
				this.state = 276;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===39) {
					{
					{
					this.state = 272;
					this.match(esql_parser.COMMA);
					this.state = 273;
					this.booleanExpression(0);
					}
					}
					this.state = 278;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				}
				}
				break;
			case 56:
				break;
			default:
				break;
			}
			this.state = 281;
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
	public dataType(): DataTypeContext {
		let localctx: DataTypeContext = new DataTypeContext(this, this._ctx, this.state);
		this.enterRule(localctx, 24, esql_parser.RULE_dataType);
		try {
			localctx = new ToDataTypeContext(this, localctx);
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 283;
			this.identifier();
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
		this.enterRule(localctx, 26, esql_parser.RULE_rowCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 285;
			this.match(esql_parser.ROW);
			this.state = 286;
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
		this.enterRule(localctx, 28, esql_parser.RULE_fields);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 288;
			this.field();
			this.state = 293;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 20, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 289;
					this.match(esql_parser.COMMA);
					this.state = 290;
					this.field();
					}
					}
				}
				this.state = 295;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 20, this._ctx);
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
		this.enterRule(localctx, 30, esql_parser.RULE_field);
		try {
			this.state = 301;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 21, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 296;
				this.booleanExpression(0);
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 297;
				this.qualifiedName();
				this.state = 298;
				this.match(esql_parser.ASSIGN);
				this.state = 299;
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
		this.enterRule(localctx, 32, esql_parser.RULE_fromCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 303;
			this.match(esql_parser.FROM);
			this.state = 304;
			this.indexPattern();
			this.state = 309;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 22, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 305;
					this.match(esql_parser.COMMA);
					this.state = 306;
					this.indexPattern();
					}
					}
				}
				this.state = 311;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 22, this._ctx);
			}
			this.state = 313;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 23, this._ctx) ) {
			case 1:
				{
				this.state = 312;
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
	public indexPattern(): IndexPatternContext {
		let localctx: IndexPatternContext = new IndexPatternContext(this, this._ctx, this.state);
		this.enterRule(localctx, 34, esql_parser.RULE_indexPattern);
		try {
			this.state = 320;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 24, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 315;
				this.clusterString();
				this.state = 316;
				this.match(esql_parser.COLON);
				this.state = 317;
				this.indexString();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 319;
				this.indexString();
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
	public clusterString(): ClusterStringContext {
		let localctx: ClusterStringContext = new ClusterStringContext(this, this._ctx, this.state);
		this.enterRule(localctx, 36, esql_parser.RULE_clusterString);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 322;
			this.match(esql_parser.UNQUOTED_SOURCE);
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
	public indexString(): IndexStringContext {
		let localctx: IndexStringContext = new IndexStringContext(this, this._ctx, this.state);
		this.enterRule(localctx, 38, esql_parser.RULE_indexString);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 324;
			_la = this._input.LA(1);
			if(!(_la===26 || _la===31)) {
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
	public metadata(): MetadataContext {
		let localctx: MetadataContext = new MetadataContext(this, this._ctx, this.state);
		this.enterRule(localctx, 40, esql_parser.RULE_metadata);
		try {
			this.state = 328;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 78:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 326;
				this.metadataOption();
				}
				break;
			case 71:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 327;
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
		this.enterRule(localctx, 42, esql_parser.RULE_metadataOption);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 330;
			this.match(esql_parser.METADATA);
			this.state = 331;
			this.match(esql_parser.UNQUOTED_SOURCE);
			this.state = 336;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 26, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 332;
					this.match(esql_parser.COMMA);
					this.state = 333;
					this.match(esql_parser.UNQUOTED_SOURCE);
					}
					}
				}
				this.state = 338;
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
		this.enterRule(localctx, 44, esql_parser.RULE_deprecated_metadata);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 339;
			this.match(esql_parser.OPENING_BRACKET);
			this.state = 340;
			this.metadataOption();
			this.state = 341;
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
	public metricsCommand(): MetricsCommandContext {
		let localctx: MetricsCommandContext = new MetricsCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 46, esql_parser.RULE_metricsCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 343;
			this.match(esql_parser.METRICS);
			this.state = 344;
			this.indexPattern();
			this.state = 349;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 27, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 345;
					this.match(esql_parser.COMMA);
					this.state = 346;
					this.indexPattern();
					}
					}
				}
				this.state = 351;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 27, this._ctx);
			}
			this.state = 353;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 28, this._ctx) ) {
			case 1:
				{
				this.state = 352;
				localctx._aggregates = this.fields();
				}
				break;
			}
			this.state = 357;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 29, this._ctx) ) {
			case 1:
				{
				this.state = 355;
				this.match(esql_parser.BY);
				this.state = 356;
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
	public evalCommand(): EvalCommandContext {
		let localctx: EvalCommandContext = new EvalCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 48, esql_parser.RULE_evalCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 359;
			this.match(esql_parser.EVAL);
			this.state = 360;
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
		this.enterRule(localctx, 50, esql_parser.RULE_statsCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 362;
			this.match(esql_parser.STATS);
			this.state = 364;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 30, this._ctx) ) {
			case 1:
				{
				this.state = 363;
				localctx._stats = this.fields();
				}
				break;
			}
			this.state = 368;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 31, this._ctx) ) {
			case 1:
				{
				this.state = 366;
				this.match(esql_parser.BY);
				this.state = 367;
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
		this.enterRule(localctx, 52, esql_parser.RULE_inlinestatsCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 370;
			this.match(esql_parser.INLINESTATS);
			this.state = 371;
			localctx._stats = this.fields();
			this.state = 374;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 32, this._ctx) ) {
			case 1:
				{
				this.state = 372;
				this.match(esql_parser.BY);
				this.state = 373;
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
		this.enterRule(localctx, 54, esql_parser.RULE_qualifiedName);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 376;
			this.identifier();
			this.state = 381;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 33, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 377;
					this.match(esql_parser.DOT);
					this.state = 378;
					this.identifier();
					}
					}
				}
				this.state = 383;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 33, this._ctx);
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
		this.enterRule(localctx, 56, esql_parser.RULE_qualifiedNamePattern);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 384;
			this.identifierPattern();
			this.state = 389;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 34, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 385;
					this.match(esql_parser.DOT);
					this.state = 386;
					this.identifierPattern();
					}
					}
				}
				this.state = 391;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 34, this._ctx);
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
	public qualifiedNamePatterns(): QualifiedNamePatternsContext {
		let localctx: QualifiedNamePatternsContext = new QualifiedNamePatternsContext(this, this._ctx, this.state);
		this.enterRule(localctx, 58, esql_parser.RULE_qualifiedNamePatterns);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 392;
			this.qualifiedNamePattern();
			this.state = 397;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 35, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 393;
					this.match(esql_parser.COMMA);
					this.state = 394;
					this.qualifiedNamePattern();
					}
					}
				}
				this.state = 399;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 35, this._ctx);
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
		this.enterRule(localctx, 60, esql_parser.RULE_identifier);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 400;
			_la = this._input.LA(1);
			if(!(_la===73 || _la===74)) {
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
		this.enterRule(localctx, 62, esql_parser.RULE_identifierPattern);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 402;
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
		this.enterRule(localctx, 64, esql_parser.RULE_constant);
		let _la: number;
		try {
			this.state = 446;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 39, this._ctx) ) {
			case 1:
				localctx = new NullLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 404;
				this.match(esql_parser.NULL);
				}
				break;
			case 2:
				localctx = new QualifiedIntegerLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 405;
				this.integerValue();
				this.state = 406;
				this.match(esql_parser.UNQUOTED_IDENTIFIER);
				}
				break;
			case 3:
				localctx = new DecimalLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 408;
				this.decimalValue();
				}
				break;
			case 4:
				localctx = new IntegerLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 409;
				this.integerValue();
				}
				break;
			case 5:
				localctx = new BooleanLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 5);
				{
				this.state = 410;
				this.booleanValue();
				}
				break;
			case 6:
				localctx = new InputParamsContext(this, localctx);
				this.enterOuterAlt(localctx, 6);
				{
				this.state = 411;
				this.params();
				}
				break;
			case 7:
				localctx = new StringLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 7);
				{
				this.state = 412;
				this.string_();
				}
				break;
			case 8:
				localctx = new NumericArrayLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 8);
				{
				this.state = 413;
				this.match(esql_parser.OPENING_BRACKET);
				this.state = 414;
				this.numericValue();
				this.state = 419;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===39) {
					{
					{
					this.state = 415;
					this.match(esql_parser.COMMA);
					this.state = 416;
					this.numericValue();
					}
					}
					this.state = 421;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 422;
				this.match(esql_parser.CLOSING_BRACKET);
				}
				break;
			case 9:
				localctx = new BooleanArrayLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 9);
				{
				this.state = 424;
				this.match(esql_parser.OPENING_BRACKET);
				this.state = 425;
				this.booleanValue();
				this.state = 430;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===39) {
					{
					{
					this.state = 426;
					this.match(esql_parser.COMMA);
					this.state = 427;
					this.booleanValue();
					}
					}
					this.state = 432;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 433;
				this.match(esql_parser.CLOSING_BRACKET);
				}
				break;
			case 10:
				localctx = new StringArrayLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 10);
				{
				this.state = 435;
				this.match(esql_parser.OPENING_BRACKET);
				this.state = 436;
				this.string_();
				this.state = 441;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===39) {
					{
					{
					this.state = 437;
					this.match(esql_parser.COMMA);
					this.state = 438;
					this.string_();
					}
					}
					this.state = 443;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 444;
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
	public params(): ParamsContext {
		let localctx: ParamsContext = new ParamsContext(this, this._ctx, this.state);
		this.enterRule(localctx, 66, esql_parser.RULE_params);
		try {
			this.state = 450;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 54:
				localctx = new InputParamContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 448;
				this.match(esql_parser.PARAM);
				}
				break;
			case 70:
				localctx = new InputNamedOrPositionalParamContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 449;
				this.match(esql_parser.NAMED_OR_POSITIONAL_PARAM);
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
	public limitCommand(): LimitCommandContext {
		let localctx: LimitCommandContext = new LimitCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 68, esql_parser.RULE_limitCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 452;
			this.match(esql_parser.LIMIT);
			this.state = 453;
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
		this.enterRule(localctx, 70, esql_parser.RULE_sortCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 455;
			this.match(esql_parser.SORT);
			this.state = 456;
			this.orderExpression();
			this.state = 461;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 41, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 457;
					this.match(esql_parser.COMMA);
					this.state = 458;
					this.orderExpression();
					}
					}
				}
				this.state = 463;
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
	public orderExpression(): OrderExpressionContext {
		let localctx: OrderExpressionContext = new OrderExpressionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 72, esql_parser.RULE_orderExpression);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 464;
			this.booleanExpression(0);
			this.state = 466;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 42, this._ctx) ) {
			case 1:
				{
				this.state = 465;
				localctx._ordering = this._input.LT(1);
				_la = this._input.LA(1);
				if(!(_la===36 || _la===40)) {
				    localctx._ordering = this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				}
				break;
			}
			this.state = 470;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 43, this._ctx) ) {
			case 1:
				{
				this.state = 468;
				this.match(esql_parser.NULLS);
				this.state = 469;
				localctx._nullOrdering = this._input.LT(1);
				_la = this._input.LA(1);
				if(!(_la===43 || _la===46)) {
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
		this.enterRule(localctx, 74, esql_parser.RULE_keepCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 472;
			this.match(esql_parser.KEEP);
			this.state = 473;
			this.qualifiedNamePatterns();
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
		this.enterRule(localctx, 76, esql_parser.RULE_dropCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 475;
			this.match(esql_parser.DROP);
			this.state = 476;
			this.qualifiedNamePatterns();
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
		this.enterRule(localctx, 78, esql_parser.RULE_renameCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 478;
			this.match(esql_parser.RENAME);
			this.state = 479;
			this.renameClause();
			this.state = 484;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 44, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 480;
					this.match(esql_parser.COMMA);
					this.state = 481;
					this.renameClause();
					}
					}
				}
				this.state = 486;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 44, this._ctx);
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
		this.enterRule(localctx, 80, esql_parser.RULE_renameClause);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 487;
			localctx._oldName = this.qualifiedNamePattern();
			this.state = 488;
			this.match(esql_parser.AS);
			this.state = 489;
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
		this.enterRule(localctx, 82, esql_parser.RULE_dissectCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 491;
			this.match(esql_parser.DISSECT);
			this.state = 492;
			this.primaryExpression(0);
			this.state = 493;
			this.string_();
			this.state = 495;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 45, this._ctx) ) {
			case 1:
				{
				this.state = 494;
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
		this.enterRule(localctx, 84, esql_parser.RULE_grokCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 497;
			this.match(esql_parser.GROK);
			this.state = 498;
			this.primaryExpression(0);
			this.state = 499;
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
		this.enterRule(localctx, 86, esql_parser.RULE_mvExpandCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 501;
			this.match(esql_parser.MV_EXPAND);
			this.state = 502;
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
		this.enterRule(localctx, 88, esql_parser.RULE_commandOptions);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 504;
			this.commandOption();
			this.state = 509;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 46, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 505;
					this.match(esql_parser.COMMA);
					this.state = 506;
					this.commandOption();
					}
					}
				}
				this.state = 511;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 46, this._ctx);
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
		this.enterRule(localctx, 90, esql_parser.RULE_commandOption);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 512;
			this.identifier();
			this.state = 513;
			this.match(esql_parser.ASSIGN);
			this.state = 514;
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
		this.enterRule(localctx, 92, esql_parser.RULE_booleanValue);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 516;
			_la = this._input.LA(1);
			if(!(_la===42 || _la===57)) {
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
		this.enterRule(localctx, 94, esql_parser.RULE_numericValue);
		try {
			this.state = 520;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 47, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 518;
				this.decimalValue();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 519;
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
		this.enterRule(localctx, 96, esql_parser.RULE_decimalValue);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 523;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===65 || _la===66) {
				{
				this.state = 522;
				_la = this._input.LA(1);
				if(!(_la===65 || _la===66)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				}
			}

			this.state = 525;
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
		this.enterRule(localctx, 98, esql_parser.RULE_integerValue);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 528;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===65 || _la===66) {
				{
				this.state = 527;
				_la = this._input.LA(1);
				if(!(_la===65 || _la===66)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				}
			}

			this.state = 530;
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
		this.enterRule(localctx, 100, esql_parser.RULE_string);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 532;
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
		this.enterRule(localctx, 102, esql_parser.RULE_comparisonOperator);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 534;
			_la = this._input.LA(1);
			if(!(((((_la - 58)) & ~0x1F) === 0 && ((1 << (_la - 58)) & 125) !== 0))) {
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
		this.enterRule(localctx, 104, esql_parser.RULE_explainCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 536;
			this.match(esql_parser.EXPLAIN);
			this.state = 537;
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
		this.enterRule(localctx, 106, esql_parser.RULE_subqueryExpression);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 539;
			this.match(esql_parser.OPENING_BRACKET);
			this.state = 540;
			this.query(0);
			this.state = 541;
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
		this.enterRule(localctx, 108, esql_parser.RULE_showCommand);
		try {
			localctx = new ShowInfoContext(this, localctx);
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 543;
			this.match(esql_parser.SHOW);
			this.state = 544;
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
		this.enterRule(localctx, 110, esql_parser.RULE_metaCommand);
		try {
			localctx = new MetaFunctionsContext(this, localctx);
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 546;
			this.match(esql_parser.META);
			this.state = 547;
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
		this.enterRule(localctx, 112, esql_parser.RULE_enrichCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 549;
			this.match(esql_parser.ENRICH);
			this.state = 550;
			localctx._policyName = this.match(esql_parser.ENRICH_POLICY_NAME);
			this.state = 553;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 50, this._ctx) ) {
			case 1:
				{
				this.state = 551;
				this.match(esql_parser.ON);
				this.state = 552;
				localctx._matchField = this.qualifiedNamePattern();
				}
				break;
			}
			this.state = 564;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 52, this._ctx) ) {
			case 1:
				{
				this.state = 555;
				this.match(esql_parser.WITH);
				this.state = 556;
				this.enrichWithClause();
				this.state = 561;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 51, this._ctx);
				while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
					if (_alt === 1) {
						{
						{
						this.state = 557;
						this.match(esql_parser.COMMA);
						this.state = 558;
						this.enrichWithClause();
						}
						}
					}
					this.state = 563;
					this._errHandler.sync(this);
					_alt = this._interp.adaptivePredict(this._input, 51, this._ctx);
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
		this.enterRule(localctx, 114, esql_parser.RULE_enrichWithClause);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 569;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 53, this._ctx) ) {
			case 1:
				{
				this.state = 566;
				localctx._newName = this.qualifiedNamePattern();
				this.state = 567;
				this.match(esql_parser.ASSIGN);
				}
				break;
			}
			this.state = 571;
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
	// @RuleVersion(0)
	public lookupCommand(): LookupCommandContext {
		let localctx: LookupCommandContext = new LookupCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 116, esql_parser.RULE_lookupCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 573;
			this.match(esql_parser.LOOKUP);
			this.state = 574;
			localctx._tableName = this.indexPattern();
			this.state = 575;
			this.match(esql_parser.ON);
			this.state = 576;
			localctx._matchFields = this.qualifiedNamePatterns();
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
	public matchCommand(): MatchCommandContext {
		let localctx: MatchCommandContext = new MatchCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 118, esql_parser.RULE_matchCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 578;
			this.match(esql_parser.MATCH);
			this.state = 579;
			this.matchQuery();
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
	public matchQuery(): MatchQueryContext {
		let localctx: MatchQueryContext = new MatchQueryContext(this, this._ctx, this.state);
		this.enterRule(localctx, 120, esql_parser.RULE_matchQuery);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 581;
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

	public sempred(localctx: RuleContext, ruleIndex: number, predIndex: number): boolean {
		switch (ruleIndex) {
		case 1:
			return this.query_sempred(localctx as QueryContext, predIndex);
		case 5:
			return this.booleanExpression_sempred(localctx as BooleanExpressionContext, predIndex);
		case 9:
			return this.operatorExpression_sempred(localctx as OperatorExpressionContext, predIndex);
		case 10:
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
	private primaryExpression_sempred(localctx: PrimaryExpressionContext, predIndex: number): boolean {
		switch (predIndex) {
		case 5:
			return this.precpred(this._ctx, 1);
		}
		return true;
	}

	public static readonly _serializedATN: number[] = [4,1,126,584,2,0,7,0,
	2,1,7,1,2,2,7,2,2,3,7,3,2,4,7,4,2,5,7,5,2,6,7,6,2,7,7,7,2,8,7,8,2,9,7,9,
	2,10,7,10,2,11,7,11,2,12,7,12,2,13,7,13,2,14,7,14,2,15,7,15,2,16,7,16,2,
	17,7,17,2,18,7,18,2,19,7,19,2,20,7,20,2,21,7,21,2,22,7,22,2,23,7,23,2,24,
	7,24,2,25,7,25,2,26,7,26,2,27,7,27,2,28,7,28,2,29,7,29,2,30,7,30,2,31,7,
	31,2,32,7,32,2,33,7,33,2,34,7,34,2,35,7,35,2,36,7,36,2,37,7,37,2,38,7,38,
	2,39,7,39,2,40,7,40,2,41,7,41,2,42,7,42,2,43,7,43,2,44,7,44,2,45,7,45,2,
	46,7,46,2,47,7,47,2,48,7,48,2,49,7,49,2,50,7,50,2,51,7,51,2,52,7,52,2,53,
	7,53,2,54,7,54,2,55,7,55,2,56,7,56,2,57,7,57,2,58,7,58,2,59,7,59,2,60,7,
	60,1,0,1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,5,1,132,8,1,10,1,12,1,135,9,1,1,
	2,1,2,1,2,1,2,1,2,1,2,3,2,143,8,2,1,3,1,3,1,3,1,3,1,3,1,3,1,3,1,3,1,3,1,
	3,1,3,1,3,1,3,1,3,1,3,3,3,160,8,3,1,4,1,4,1,4,1,5,1,5,1,5,1,5,1,5,1,5,1,
	5,1,5,3,5,173,8,5,1,5,1,5,1,5,1,5,1,5,5,5,180,8,5,10,5,12,5,183,9,5,1,5,
	1,5,1,5,1,5,1,5,3,5,190,8,5,1,5,1,5,3,5,194,8,5,1,5,1,5,1,5,1,5,1,5,1,5,
	5,5,202,8,5,10,5,12,5,205,9,5,1,6,1,6,3,6,209,8,6,1,6,1,6,1,6,1,6,1,6,3,
	6,216,8,6,1,6,1,6,1,6,3,6,221,8,6,1,7,1,7,1,7,1,7,1,8,1,8,1,8,1,8,1,8,3,
	8,232,8,8,1,9,1,9,1,9,1,9,3,9,238,8,9,1,9,1,9,1,9,1,9,1,9,1,9,5,9,246,8,
	9,10,9,12,9,249,9,9,1,10,1,10,1,10,1,10,1,10,1,10,1,10,1,10,3,10,259,8,
	10,1,10,1,10,1,10,5,10,264,8,10,10,10,12,10,267,9,10,1,11,1,11,1,11,1,11,
	1,11,1,11,5,11,275,8,11,10,11,12,11,278,9,11,3,11,280,8,11,1,11,1,11,1,
	12,1,12,1,13,1,13,1,13,1,14,1,14,1,14,5,14,292,8,14,10,14,12,14,295,9,14,
	1,15,1,15,1,15,1,15,1,15,3,15,302,8,15,1,16,1,16,1,16,1,16,5,16,308,8,16,
	10,16,12,16,311,9,16,1,16,3,16,314,8,16,1,17,1,17,1,17,1,17,1,17,3,17,321,
	8,17,1,18,1,18,1,19,1,19,1,20,1,20,3,20,329,8,20,1,21,1,21,1,21,1,21,5,
	21,335,8,21,10,21,12,21,338,9,21,1,22,1,22,1,22,1,22,1,23,1,23,1,23,1,23,
	5,23,348,8,23,10,23,12,23,351,9,23,1,23,3,23,354,8,23,1,23,1,23,3,23,358,
	8,23,1,24,1,24,1,24,1,25,1,25,3,25,365,8,25,1,25,1,25,3,25,369,8,25,1,26,
	1,26,1,26,1,26,3,26,375,8,26,1,27,1,27,1,27,5,27,380,8,27,10,27,12,27,383,
	9,27,1,28,1,28,1,28,5,28,388,8,28,10,28,12,28,391,9,28,1,29,1,29,1,29,5,
	29,396,8,29,10,29,12,29,399,9,29,1,30,1,30,1,31,1,31,1,32,1,32,1,32,1,32,
	1,32,1,32,1,32,1,32,1,32,1,32,1,32,1,32,1,32,5,32,418,8,32,10,32,12,32,
	421,9,32,1,32,1,32,1,32,1,32,1,32,1,32,5,32,429,8,32,10,32,12,32,432,9,
	32,1,32,1,32,1,32,1,32,1,32,1,32,5,32,440,8,32,10,32,12,32,443,9,32,1,32,
	1,32,3,32,447,8,32,1,33,1,33,3,33,451,8,33,1,34,1,34,1,34,1,35,1,35,1,35,
	1,35,5,35,460,8,35,10,35,12,35,463,9,35,1,36,1,36,3,36,467,8,36,1,36,1,
	36,3,36,471,8,36,1,37,1,37,1,37,1,38,1,38,1,38,1,39,1,39,1,39,1,39,5,39,
	483,8,39,10,39,12,39,486,9,39,1,40,1,40,1,40,1,40,1,41,1,41,1,41,1,41,3,
	41,496,8,41,1,42,1,42,1,42,1,42,1,43,1,43,1,43,1,44,1,44,1,44,5,44,508,
	8,44,10,44,12,44,511,9,44,1,45,1,45,1,45,1,45,1,46,1,46,1,47,1,47,3,47,
	521,8,47,1,48,3,48,524,8,48,1,48,1,48,1,49,3,49,529,8,49,1,49,1,49,1,50,
	1,50,1,51,1,51,1,52,1,52,1,52,1,53,1,53,1,53,1,53,1,54,1,54,1,54,1,55,1,
	55,1,55,1,56,1,56,1,56,1,56,3,56,554,8,56,1,56,1,56,1,56,1,56,5,56,560,
	8,56,10,56,12,56,563,9,56,3,56,565,8,56,1,57,1,57,1,57,3,57,570,8,57,1,
	57,1,57,1,58,1,58,1,58,1,58,1,58,1,59,1,59,1,59,1,60,1,60,1,60,0,4,2,10,
	18,20,61,0,2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,
	46,48,50,52,54,56,58,60,62,64,66,68,70,72,74,76,78,80,82,84,86,88,90,92,
	94,96,98,100,102,104,106,108,110,112,114,116,118,120,0,8,1,0,65,66,1,0,
	67,69,2,0,26,26,31,31,1,0,73,74,2,0,36,36,40,40,2,0,43,43,46,46,2,0,42,
	42,57,57,2,0,58,58,60,64,608,0,122,1,0,0,0,2,125,1,0,0,0,4,142,1,0,0,0,
	6,159,1,0,0,0,8,161,1,0,0,0,10,193,1,0,0,0,12,220,1,0,0,0,14,222,1,0,0,
	0,16,231,1,0,0,0,18,237,1,0,0,0,20,258,1,0,0,0,22,268,1,0,0,0,24,283,1,
	0,0,0,26,285,1,0,0,0,28,288,1,0,0,0,30,301,1,0,0,0,32,303,1,0,0,0,34,320,
	1,0,0,0,36,322,1,0,0,0,38,324,1,0,0,0,40,328,1,0,0,0,42,330,1,0,0,0,44,
	339,1,0,0,0,46,343,1,0,0,0,48,359,1,0,0,0,50,362,1,0,0,0,52,370,1,0,0,0,
	54,376,1,0,0,0,56,384,1,0,0,0,58,392,1,0,0,0,60,400,1,0,0,0,62,402,1,0,
	0,0,64,446,1,0,0,0,66,450,1,0,0,0,68,452,1,0,0,0,70,455,1,0,0,0,72,464,
	1,0,0,0,74,472,1,0,0,0,76,475,1,0,0,0,78,478,1,0,0,0,80,487,1,0,0,0,82,
	491,1,0,0,0,84,497,1,0,0,0,86,501,1,0,0,0,88,504,1,0,0,0,90,512,1,0,0,0,
	92,516,1,0,0,0,94,520,1,0,0,0,96,523,1,0,0,0,98,528,1,0,0,0,100,532,1,0,
	0,0,102,534,1,0,0,0,104,536,1,0,0,0,106,539,1,0,0,0,108,543,1,0,0,0,110,
	546,1,0,0,0,112,549,1,0,0,0,114,569,1,0,0,0,116,573,1,0,0,0,118,578,1,0,
	0,0,120,581,1,0,0,0,122,123,3,2,1,0,123,124,5,0,0,1,124,1,1,0,0,0,125,126,
	6,1,-1,0,126,127,3,4,2,0,127,133,1,0,0,0,128,129,10,1,0,0,129,130,5,30,
	0,0,130,132,3,6,3,0,131,128,1,0,0,0,132,135,1,0,0,0,133,131,1,0,0,0,133,
	134,1,0,0,0,134,3,1,0,0,0,135,133,1,0,0,0,136,143,3,104,52,0,137,143,3,
	32,16,0,138,143,3,26,13,0,139,143,3,46,23,0,140,143,3,108,54,0,141,143,
	3,110,55,0,142,136,1,0,0,0,142,137,1,0,0,0,142,138,1,0,0,0,142,139,1,0,
	0,0,142,140,1,0,0,0,142,141,1,0,0,0,143,5,1,0,0,0,144,160,3,48,24,0,145,
	160,3,52,26,0,146,160,3,68,34,0,147,160,3,116,58,0,148,160,3,74,37,0,149,
	160,3,70,35,0,150,160,3,50,25,0,151,160,3,8,4,0,152,160,3,76,38,0,153,160,
	3,78,39,0,154,160,3,82,41,0,155,160,3,84,42,0,156,160,3,112,56,0,157,160,
	3,86,43,0,158,160,3,118,59,0,159,144,1,0,0,0,159,145,1,0,0,0,159,146,1,
	0,0,0,159,147,1,0,0,0,159,148,1,0,0,0,159,149,1,0,0,0,159,150,1,0,0,0,159,
	151,1,0,0,0,159,152,1,0,0,0,159,153,1,0,0,0,159,154,1,0,0,0,159,155,1,0,
	0,0,159,156,1,0,0,0,159,157,1,0,0,0,159,158,1,0,0,0,160,7,1,0,0,0,161,162,
	5,20,0,0,162,163,3,10,5,0,163,9,1,0,0,0,164,165,6,5,-1,0,165,166,5,50,0,
	0,166,194,3,10,5,8,167,194,3,16,8,0,168,194,3,12,6,0,169,194,3,14,7,0,170,
	172,3,16,8,0,171,173,5,50,0,0,172,171,1,0,0,0,172,173,1,0,0,0,173,174,1,
	0,0,0,174,175,5,44,0,0,175,176,5,48,0,0,176,181,3,16,8,0,177,178,5,39,0,
	0,178,180,3,16,8,0,179,177,1,0,0,0,180,183,1,0,0,0,181,179,1,0,0,0,181,
	182,1,0,0,0,182,184,1,0,0,0,183,181,1,0,0,0,184,185,5,56,0,0,185,194,1,
	0,0,0,186,187,3,16,8,0,187,189,5,45,0,0,188,190,5,50,0,0,189,188,1,0,0,
	0,189,190,1,0,0,0,190,191,1,0,0,0,191,192,5,51,0,0,192,194,1,0,0,0,193,
	164,1,0,0,0,193,167,1,0,0,0,193,168,1,0,0,0,193,169,1,0,0,0,193,170,1,0,
	0,0,193,186,1,0,0,0,194,203,1,0,0,0,195,196,10,4,0,0,196,197,5,35,0,0,197,
	202,3,10,5,5,198,199,10,3,0,0,199,200,5,53,0,0,200,202,3,10,5,4,201,195,
	1,0,0,0,201,198,1,0,0,0,202,205,1,0,0,0,203,201,1,0,0,0,203,204,1,0,0,0,
	204,11,1,0,0,0,205,203,1,0,0,0,206,208,3,16,8,0,207,209,5,50,0,0,208,207,
	1,0,0,0,208,209,1,0,0,0,209,210,1,0,0,0,210,211,5,47,0,0,211,212,3,100,
	50,0,212,221,1,0,0,0,213,215,3,16,8,0,214,216,5,50,0,0,215,214,1,0,0,0,
	215,216,1,0,0,0,216,217,1,0,0,0,217,218,5,55,0,0,218,219,3,100,50,0,219,
	221,1,0,0,0,220,206,1,0,0,0,220,213,1,0,0,0,221,13,1,0,0,0,222,223,3,54,
	27,0,223,224,5,49,0,0,224,225,3,100,50,0,225,15,1,0,0,0,226,232,3,18,9,
	0,227,228,3,18,9,0,228,229,3,102,51,0,229,230,3,18,9,0,230,232,1,0,0,0,
	231,226,1,0,0,0,231,227,1,0,0,0,232,17,1,0,0,0,233,234,6,9,-1,0,234,238,
	3,20,10,0,235,236,7,0,0,0,236,238,3,18,9,3,237,233,1,0,0,0,237,235,1,0,
	0,0,238,247,1,0,0,0,239,240,10,2,0,0,240,241,7,1,0,0,241,246,3,18,9,3,242,
	243,10,1,0,0,243,244,7,0,0,0,244,246,3,18,9,2,245,239,1,0,0,0,245,242,1,
	0,0,0,246,249,1,0,0,0,247,245,1,0,0,0,247,248,1,0,0,0,248,19,1,0,0,0,249,
	247,1,0,0,0,250,251,6,10,-1,0,251,259,3,64,32,0,252,259,3,54,27,0,253,259,
	3,22,11,0,254,255,5,48,0,0,255,256,3,10,5,0,256,257,5,56,0,0,257,259,1,
	0,0,0,258,250,1,0,0,0,258,252,1,0,0,0,258,253,1,0,0,0,258,254,1,0,0,0,259,
	265,1,0,0,0,260,261,10,1,0,0,261,262,5,38,0,0,262,264,3,24,12,0,263,260,
	1,0,0,0,264,267,1,0,0,0,265,263,1,0,0,0,265,266,1,0,0,0,266,21,1,0,0,0,
	267,265,1,0,0,0,268,269,3,60,30,0,269,279,5,48,0,0,270,280,5,67,0,0,271,
	276,3,10,5,0,272,273,5,39,0,0,273,275,3,10,5,0,274,272,1,0,0,0,275,278,
	1,0,0,0,276,274,1,0,0,0,276,277,1,0,0,0,277,280,1,0,0,0,278,276,1,0,0,0,
	279,270,1,0,0,0,279,271,1,0,0,0,279,280,1,0,0,0,280,281,1,0,0,0,281,282,
	5,56,0,0,282,23,1,0,0,0,283,284,3,60,30,0,284,25,1,0,0,0,285,286,5,16,0,
	0,286,287,3,28,14,0,287,27,1,0,0,0,288,293,3,30,15,0,289,290,5,39,0,0,290,
	292,3,30,15,0,291,289,1,0,0,0,292,295,1,0,0,0,293,291,1,0,0,0,293,294,1,
	0,0,0,294,29,1,0,0,0,295,293,1,0,0,0,296,302,3,10,5,0,297,298,3,54,27,0,
	298,299,5,37,0,0,299,300,3,10,5,0,300,302,1,0,0,0,301,296,1,0,0,0,301,297,
	1,0,0,0,302,31,1,0,0,0,303,304,5,6,0,0,304,309,3,34,17,0,305,306,5,39,0,
	0,306,308,3,34,17,0,307,305,1,0,0,0,308,311,1,0,0,0,309,307,1,0,0,0,309,
	310,1,0,0,0,310,313,1,0,0,0,311,309,1,0,0,0,312,314,3,40,20,0,313,312,1,
	0,0,0,313,314,1,0,0,0,314,33,1,0,0,0,315,316,3,36,18,0,316,317,5,116,0,
	0,317,318,3,38,19,0,318,321,1,0,0,0,319,321,3,38,19,0,320,315,1,0,0,0,320,
	319,1,0,0,0,321,35,1,0,0,0,322,323,5,26,0,0,323,37,1,0,0,0,324,325,7,2,
	0,0,325,39,1,0,0,0,326,329,3,42,21,0,327,329,3,44,22,0,328,326,1,0,0,0,
	328,327,1,0,0,0,329,41,1,0,0,0,330,331,5,78,0,0,331,336,5,26,0,0,332,333,
	5,39,0,0,333,335,5,26,0,0,334,332,1,0,0,0,335,338,1,0,0,0,336,334,1,0,0,
	0,336,337,1,0,0,0,337,43,1,0,0,0,338,336,1,0,0,0,339,340,5,71,0,0,340,341,
	3,42,21,0,341,342,5,72,0,0,342,45,1,0,0,0,343,344,5,13,0,0,344,349,3,34,
	17,0,345,346,5,39,0,0,346,348,3,34,17,0,347,345,1,0,0,0,348,351,1,0,0,0,
	349,347,1,0,0,0,349,350,1,0,0,0,350,353,1,0,0,0,351,349,1,0,0,0,352,354,
	3,28,14,0,353,352,1,0,0,0,353,354,1,0,0,0,354,357,1,0,0,0,355,356,5,34,
	0,0,356,358,3,28,14,0,357,355,1,0,0,0,357,358,1,0,0,0,358,47,1,0,0,0,359,
	360,5,4,0,0,360,361,3,28,14,0,361,49,1,0,0,0,362,364,5,19,0,0,363,365,3,
	28,14,0,364,363,1,0,0,0,364,365,1,0,0,0,365,368,1,0,0,0,366,367,5,34,0,
	0,367,369,3,28,14,0,368,366,1,0,0,0,368,369,1,0,0,0,369,51,1,0,0,0,370,
	371,5,8,0,0,371,374,3,28,14,0,372,373,5,34,0,0,373,375,3,28,14,0,374,372,
	1,0,0,0,374,375,1,0,0,0,375,53,1,0,0,0,376,381,3,60,30,0,377,378,5,41,0,
	0,378,380,3,60,30,0,379,377,1,0,0,0,380,383,1,0,0,0,381,379,1,0,0,0,381,
	382,1,0,0,0,382,55,1,0,0,0,383,381,1,0,0,0,384,389,3,62,31,0,385,386,5,
	41,0,0,386,388,3,62,31,0,387,385,1,0,0,0,388,391,1,0,0,0,389,387,1,0,0,
	0,389,390,1,0,0,0,390,57,1,0,0,0,391,389,1,0,0,0,392,397,3,56,28,0,393,
	394,5,39,0,0,394,396,3,56,28,0,395,393,1,0,0,0,396,399,1,0,0,0,397,395,
	1,0,0,0,397,398,1,0,0,0,398,59,1,0,0,0,399,397,1,0,0,0,400,401,7,3,0,0,
	401,61,1,0,0,0,402,403,5,82,0,0,403,63,1,0,0,0,404,447,5,51,0,0,405,406,
	3,98,49,0,406,407,5,73,0,0,407,447,1,0,0,0,408,447,3,96,48,0,409,447,3,
	98,49,0,410,447,3,92,46,0,411,447,3,66,33,0,412,447,3,100,50,0,413,414,
	5,71,0,0,414,419,3,94,47,0,415,416,5,39,0,0,416,418,3,94,47,0,417,415,1,
	0,0,0,418,421,1,0,0,0,419,417,1,0,0,0,419,420,1,0,0,0,420,422,1,0,0,0,421,
	419,1,0,0,0,422,423,5,72,0,0,423,447,1,0,0,0,424,425,5,71,0,0,425,430,3,
	92,46,0,426,427,5,39,0,0,427,429,3,92,46,0,428,426,1,0,0,0,429,432,1,0,
	0,0,430,428,1,0,0,0,430,431,1,0,0,0,431,433,1,0,0,0,432,430,1,0,0,0,433,
	434,5,72,0,0,434,447,1,0,0,0,435,436,5,71,0,0,436,441,3,100,50,0,437,438,
	5,39,0,0,438,440,3,100,50,0,439,437,1,0,0,0,440,443,1,0,0,0,441,439,1,0,
	0,0,441,442,1,0,0,0,442,444,1,0,0,0,443,441,1,0,0,0,444,445,5,72,0,0,445,
	447,1,0,0,0,446,404,1,0,0,0,446,405,1,0,0,0,446,408,1,0,0,0,446,409,1,0,
	0,0,446,410,1,0,0,0,446,411,1,0,0,0,446,412,1,0,0,0,446,413,1,0,0,0,446,
	424,1,0,0,0,446,435,1,0,0,0,447,65,1,0,0,0,448,451,5,54,0,0,449,451,5,70,
	0,0,450,448,1,0,0,0,450,449,1,0,0,0,451,67,1,0,0,0,452,453,5,10,0,0,453,
	454,5,32,0,0,454,69,1,0,0,0,455,456,5,18,0,0,456,461,3,72,36,0,457,458,
	5,39,0,0,458,460,3,72,36,0,459,457,1,0,0,0,460,463,1,0,0,0,461,459,1,0,
	0,0,461,462,1,0,0,0,462,71,1,0,0,0,463,461,1,0,0,0,464,466,3,10,5,0,465,
	467,7,4,0,0,466,465,1,0,0,0,466,467,1,0,0,0,467,470,1,0,0,0,468,469,5,52,
	0,0,469,471,7,5,0,0,470,468,1,0,0,0,470,471,1,0,0,0,471,73,1,0,0,0,472,
	473,5,9,0,0,473,474,3,58,29,0,474,75,1,0,0,0,475,476,5,2,0,0,476,477,3,
	58,29,0,477,77,1,0,0,0,478,479,5,15,0,0,479,484,3,80,40,0,480,481,5,39,
	0,0,481,483,3,80,40,0,482,480,1,0,0,0,483,486,1,0,0,0,484,482,1,0,0,0,484,
	485,1,0,0,0,485,79,1,0,0,0,486,484,1,0,0,0,487,488,3,56,28,0,488,489,5,
	86,0,0,489,490,3,56,28,0,490,81,1,0,0,0,491,492,5,1,0,0,492,493,3,20,10,
	0,493,495,3,100,50,0,494,496,3,88,44,0,495,494,1,0,0,0,495,496,1,0,0,0,
	496,83,1,0,0,0,497,498,5,7,0,0,498,499,3,20,10,0,499,500,3,100,50,0,500,
	85,1,0,0,0,501,502,5,14,0,0,502,503,3,54,27,0,503,87,1,0,0,0,504,509,3,
	90,45,0,505,506,5,39,0,0,506,508,3,90,45,0,507,505,1,0,0,0,508,511,1,0,
	0,0,509,507,1,0,0,0,509,510,1,0,0,0,510,89,1,0,0,0,511,509,1,0,0,0,512,
	513,3,60,30,0,513,514,5,37,0,0,514,515,3,64,32,0,515,91,1,0,0,0,516,517,
	7,6,0,0,517,93,1,0,0,0,518,521,3,96,48,0,519,521,3,98,49,0,520,518,1,0,
	0,0,520,519,1,0,0,0,521,95,1,0,0,0,522,524,7,0,0,0,523,522,1,0,0,0,523,
	524,1,0,0,0,524,525,1,0,0,0,525,526,5,33,0,0,526,97,1,0,0,0,527,529,7,0,
	0,0,528,527,1,0,0,0,528,529,1,0,0,0,529,530,1,0,0,0,530,531,5,32,0,0,531,
	99,1,0,0,0,532,533,5,31,0,0,533,101,1,0,0,0,534,535,7,7,0,0,535,103,1,0,
	0,0,536,537,5,5,0,0,537,538,3,106,53,0,538,105,1,0,0,0,539,540,5,71,0,0,
	540,541,3,2,1,0,541,542,5,72,0,0,542,107,1,0,0,0,543,544,5,17,0,0,544,545,
	5,108,0,0,545,109,1,0,0,0,546,547,5,12,0,0,547,548,5,112,0,0,548,111,1,
	0,0,0,549,550,5,3,0,0,550,553,5,92,0,0,551,552,5,90,0,0,552,554,3,56,28,
	0,553,551,1,0,0,0,553,554,1,0,0,0,554,564,1,0,0,0,555,556,5,91,0,0,556,
	561,3,114,57,0,557,558,5,39,0,0,558,560,3,114,57,0,559,557,1,0,0,0,560,
	563,1,0,0,0,561,559,1,0,0,0,561,562,1,0,0,0,562,565,1,0,0,0,563,561,1,0,
	0,0,564,555,1,0,0,0,564,565,1,0,0,0,565,113,1,0,0,0,566,567,3,56,28,0,567,
	568,5,37,0,0,568,570,1,0,0,0,569,566,1,0,0,0,569,570,1,0,0,0,570,571,1,
	0,0,0,571,572,3,56,28,0,572,115,1,0,0,0,573,574,5,11,0,0,574,575,3,34,17,
	0,575,576,5,90,0,0,576,577,3,58,29,0,577,117,1,0,0,0,578,579,5,21,0,0,579,
	580,3,120,60,0,580,119,1,0,0,0,581,582,5,31,0,0,582,121,1,0,0,0,54,133,
	142,159,172,181,189,193,201,203,208,215,220,231,237,245,247,258,265,276,
	279,293,301,309,313,320,328,336,349,353,357,364,368,374,381,389,397,419,
	430,441,446,450,461,466,470,484,495,509,520,523,528,553,561,564,569];

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
	public override copyFrom(ctx: QueryContext): void {
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
	public metricsCommand(): MetricsCommandContext {
		return this.getTypedRuleContext(MetricsCommandContext, 0) as MetricsCommandContext;
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
	public lookupCommand(): LookupCommandContext {
		return this.getTypedRuleContext(LookupCommandContext, 0) as LookupCommandContext;
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
	public matchCommand(): MatchCommandContext {
		return this.getTypedRuleContext(MatchCommandContext, 0) as MatchCommandContext;
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
	public override copyFrom(ctx: BooleanExpressionContext): void {
		super.copyFrom(ctx);
	}
}
export class MatchExpressionContext extends BooleanExpressionContext {
	constructor(parser: esql_parser, ctx: BooleanExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public matchBooleanExpression(): MatchBooleanExpressionContext {
		return this.getTypedRuleContext(MatchBooleanExpressionContext, 0) as MatchBooleanExpressionContext;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterMatchExpression) {
	 		listener.enterMatchExpression(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitMatchExpression) {
	 		listener.exitMatchExpression(this);
		}
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


export class MatchBooleanExpressionContext extends ParserRuleContext {
	public _queryString!: StringContext;
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public qualifiedName(): QualifiedNameContext {
		return this.getTypedRuleContext(QualifiedNameContext, 0) as QualifiedNameContext;
	}
	public MATCH_OPERATOR(): TerminalNode {
		return this.getToken(esql_parser.MATCH_OPERATOR, 0);
	}
	public string_(): StringContext {
		return this.getTypedRuleContext(StringContext, 0) as StringContext;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_matchBooleanExpression;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterMatchBooleanExpression) {
	 		listener.enterMatchBooleanExpression(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitMatchBooleanExpression) {
	 		listener.exitMatchBooleanExpression(this);
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
	public override copyFrom(ctx: ValueExpressionContext): void {
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
	public override copyFrom(ctx: OperatorExpressionContext): void {
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
	public override copyFrom(ctx: PrimaryExpressionContext): void {
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
	    if(listener.enterInlineCast) {
	 		listener.enterInlineCast(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitInlineCast) {
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


export class DataTypeContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_dataType;
	}
	public override copyFrom(ctx: DataTypeContext): void {
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
	    if(listener.enterToDataType) {
	 		listener.enterToDataType(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitToDataType) {
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
	public indexPattern_list(): IndexPatternContext[] {
		return this.getTypedRuleContexts(IndexPatternContext) as IndexPatternContext[];
	}
	public indexPattern(i: number): IndexPatternContext {
		return this.getTypedRuleContext(IndexPatternContext, i) as IndexPatternContext;
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


export class IndexPatternContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public clusterString(): ClusterStringContext {
		return this.getTypedRuleContext(ClusterStringContext, 0) as ClusterStringContext;
	}
	public COLON(): TerminalNode {
		return this.getToken(esql_parser.COLON, 0);
	}
	public indexString(): IndexStringContext {
		return this.getTypedRuleContext(IndexStringContext, 0) as IndexStringContext;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_indexPattern;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterIndexPattern) {
	 		listener.enterIndexPattern(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitIndexPattern) {
	 		listener.exitIndexPattern(this);
		}
	}
}


export class ClusterStringContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public UNQUOTED_SOURCE(): TerminalNode {
		return this.getToken(esql_parser.UNQUOTED_SOURCE, 0);
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_clusterString;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterClusterString) {
	 		listener.enterClusterString(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitClusterString) {
	 		listener.exitClusterString(this);
		}
	}
}


export class IndexStringContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public UNQUOTED_SOURCE(): TerminalNode {
		return this.getToken(esql_parser.UNQUOTED_SOURCE, 0);
	}
	public QUOTED_STRING(): TerminalNode {
		return this.getToken(esql_parser.QUOTED_STRING, 0);
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_indexString;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterIndexString) {
	 		listener.enterIndexString(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitIndexString) {
	 		listener.exitIndexString(this);
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
	public UNQUOTED_SOURCE_list(): TerminalNode[] {
	    	return this.getTokens(esql_parser.UNQUOTED_SOURCE);
	}
	public UNQUOTED_SOURCE(i: number): TerminalNode {
		return this.getToken(esql_parser.UNQUOTED_SOURCE, i);
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


export class MetricsCommandContext extends ParserRuleContext {
	public _aggregates!: FieldsContext;
	public _grouping!: FieldsContext;
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public METRICS(): TerminalNode {
		return this.getToken(esql_parser.METRICS, 0);
	}
	public indexPattern_list(): IndexPatternContext[] {
		return this.getTypedRuleContexts(IndexPatternContext) as IndexPatternContext[];
	}
	public indexPattern(i: number): IndexPatternContext {
		return this.getTypedRuleContext(IndexPatternContext, i) as IndexPatternContext;
	}
	public COMMA_list(): TerminalNode[] {
	    	return this.getTokens(esql_parser.COMMA);
	}
	public COMMA(i: number): TerminalNode {
		return this.getToken(esql_parser.COMMA, i);
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
    	return esql_parser.RULE_metricsCommand;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterMetricsCommand) {
	 		listener.enterMetricsCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitMetricsCommand) {
	 		listener.exitMetricsCommand(this);
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


export class QualifiedNamePatternsContext extends ParserRuleContext {
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
	public COMMA_list(): TerminalNode[] {
	    	return this.getTokens(esql_parser.COMMA);
	}
	public COMMA(i: number): TerminalNode {
		return this.getToken(esql_parser.COMMA, i);
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_qualifiedNamePatterns;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterQualifiedNamePatterns) {
	 		listener.enterQualifiedNamePatterns(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitQualifiedNamePatterns) {
	 		listener.exitQualifiedNamePatterns(this);
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
	public override copyFrom(ctx: ConstantContext): void {
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
export class InputParamsContext extends ConstantContext {
	constructor(parser: esql_parser, ctx: ConstantContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public params(): ParamsContext {
		return this.getTypedRuleContext(ParamsContext, 0) as ParamsContext;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterInputParams) {
	 		listener.enterInputParams(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitInputParams) {
	 		listener.exitInputParams(this);
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


export class ParamsContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_params;
	}
	public override copyFrom(ctx: ParamsContext): void {
		super.copyFrom(ctx);
	}
}
export class InputNamedOrPositionalParamContext extends ParamsContext {
	constructor(parser: esql_parser, ctx: ParamsContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public NAMED_OR_POSITIONAL_PARAM(): TerminalNode {
		return this.getToken(esql_parser.NAMED_OR_POSITIONAL_PARAM, 0);
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterInputNamedOrPositionalParam) {
	 		listener.enterInputNamedOrPositionalParam(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitInputNamedOrPositionalParam) {
	 		listener.exitInputNamedOrPositionalParam(this);
		}
	}
}
export class InputParamContext extends ParamsContext {
	constructor(parser: esql_parser, ctx: ParamsContext) {
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
	public qualifiedNamePatterns(): QualifiedNamePatternsContext {
		return this.getTypedRuleContext(QualifiedNamePatternsContext, 0) as QualifiedNamePatternsContext;
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
	public qualifiedNamePatterns(): QualifiedNamePatternsContext {
		return this.getTypedRuleContext(QualifiedNamePatternsContext, 0) as QualifiedNamePatternsContext;
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
	public override copyFrom(ctx: ShowCommandContext): void {
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
	public override copyFrom(ctx: MetaCommandContext): void {
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


export class LookupCommandContext extends ParserRuleContext {
	public _tableName!: IndexPatternContext;
	public _matchFields!: QualifiedNamePatternsContext;
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public LOOKUP(): TerminalNode {
		return this.getToken(esql_parser.LOOKUP, 0);
	}
	public ON(): TerminalNode {
		return this.getToken(esql_parser.ON, 0);
	}
	public indexPattern(): IndexPatternContext {
		return this.getTypedRuleContext(IndexPatternContext, 0) as IndexPatternContext;
	}
	public qualifiedNamePatterns(): QualifiedNamePatternsContext {
		return this.getTypedRuleContext(QualifiedNamePatternsContext, 0) as QualifiedNamePatternsContext;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_lookupCommand;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterLookupCommand) {
	 		listener.enterLookupCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitLookupCommand) {
	 		listener.exitLookupCommand(this);
		}
	}
}


export class MatchCommandContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public MATCH(): TerminalNode {
		return this.getToken(esql_parser.MATCH, 0);
	}
	public matchQuery(): MatchQueryContext {
		return this.getTypedRuleContext(MatchQueryContext, 0) as MatchQueryContext;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_matchCommand;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterMatchCommand) {
	 		listener.enterMatchCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitMatchCommand) {
	 		listener.exitMatchCommand(this);
		}
	}
}


export class MatchQueryContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public QUOTED_STRING(): TerminalNode {
		return this.getToken(esql_parser.QUOTED_STRING, 0);
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_matchQuery;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterMatchQuery) {
	 		listener.enterMatchQuery(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitMatchQuery) {
	 		listener.exitMatchQuery(this);
		}
	}
}
