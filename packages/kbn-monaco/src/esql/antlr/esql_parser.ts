// @ts-nocheck
// Generated from src/esql/antlr/esql_parser.g4 by ANTLR 4.7.3-SNAPSHOT


import { ATN } from "antlr4ts/atn/ATN";
import { ATNDeserializer } from "antlr4ts/atn/ATNDeserializer";
import { FailedPredicateException } from "antlr4ts/FailedPredicateException";
import { NotNull } from "antlr4ts/Decorators";
import { NoViableAltException } from "antlr4ts/NoViableAltException";
import { Override } from "antlr4ts/Decorators";
import { Parser } from "antlr4ts/Parser";
import { ParserRuleContext } from "antlr4ts/ParserRuleContext";
import { ParserATNSimulator } from "antlr4ts/atn/ParserATNSimulator";
import { ParseTreeListener } from "antlr4ts/tree/ParseTreeListener";
import { ParseTreeVisitor } from "antlr4ts/tree/ParseTreeVisitor";
import { RecognitionException } from "antlr4ts/RecognitionException";
import { RuleContext } from "antlr4ts/RuleContext";
//import { RuleVersion } from "antlr4ts/RuleVersion";
import { TerminalNode } from "antlr4ts/tree/TerminalNode";
import { Token } from "antlr4ts/Token";
import { TokenStream } from "antlr4ts/TokenStream";
import { Vocabulary } from "antlr4ts/Vocabulary";
import { VocabularyImpl } from "antlr4ts/VocabularyImpl";

import * as Utils from "antlr4ts/misc/Utils";

import { esql_parserListener } from "./esql_parserListener";

export class esql_parser extends Parser {
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
	public static readonly MV_EXPAND = 11;
	public static readonly PROJECT = 12;
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
	public static readonly STRING = 27;
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
	public static readonly NEQ = 53;
	public static readonly LT = 54;
	public static readonly LTE = 55;
	public static readonly GT = 56;
	public static readonly GTE = 57;
	public static readonly PLUS = 58;
	public static readonly MINUS = 59;
	public static readonly ASTERISK = 60;
	public static readonly SLASH = 61;
	public static readonly PERCENT = 62;
	public static readonly OPENING_BRACKET = 63;
	public static readonly CLOSING_BRACKET = 64;
	public static readonly UNQUOTED_IDENTIFIER = 65;
	public static readonly QUOTED_IDENTIFIER = 66;
	public static readonly EXPR_LINE_COMMENT = 67;
	public static readonly EXPR_MULTILINE_COMMENT = 68;
	public static readonly EXPR_WS = 69;
	public static readonly METADATA = 70;
	public static readonly FROM_UNQUOTED_IDENTIFIER = 71;
	public static readonly FROM_LINE_COMMENT = 72;
	public static readonly FROM_MULTILINE_COMMENT = 73;
	public static readonly FROM_WS = 74;
	public static readonly PROJECT_UNQUOTED_IDENTIFIER = 75;
	public static readonly PROJECT_LINE_COMMENT = 76;
	public static readonly PROJECT_MULTILINE_COMMENT = 77;
	public static readonly PROJECT_WS = 78;
	public static readonly AS = 79;
	public static readonly RENAME_LINE_COMMENT = 80;
	public static readonly RENAME_MULTILINE_COMMENT = 81;
	public static readonly RENAME_WS = 82;
	public static readonly ON = 83;
	public static readonly WITH = 84;
	public static readonly ENRICH_LINE_COMMENT = 85;
	public static readonly ENRICH_MULTILINE_COMMENT = 86;
	public static readonly ENRICH_WS = 87;
	public static readonly ENRICH_FIELD_LINE_COMMENT = 88;
	public static readonly ENRICH_FIELD_MULTILINE_COMMENT = 89;
	public static readonly ENRICH_FIELD_WS = 90;
	public static readonly MVEXPAND_LINE_COMMENT = 91;
	public static readonly MVEXPAND_MULTILINE_COMMENT = 92;
	public static readonly MVEXPAND_WS = 93;
	public static readonly INFO = 94;
	public static readonly FUNCTIONS = 95;
	public static readonly SHOW_LINE_COMMENT = 96;
	public static readonly SHOW_MULTILINE_COMMENT = 97;
	public static readonly SHOW_WS = 98;
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
	public static readonly RULE_metadata = 15;
	public static readonly RULE_evalCommand = 16;
	public static readonly RULE_statsCommand = 17;
	public static readonly RULE_inlinestatsCommand = 18;
	public static readonly RULE_grouping = 19;
	public static readonly RULE_fromIdentifier = 20;
	public static readonly RULE_qualifiedName = 21;
	public static readonly RULE_qualifiedNamePattern = 22;
	public static readonly RULE_identifier = 23;
	public static readonly RULE_identifierPattern = 24;
	public static readonly RULE_constant = 25;
	public static readonly RULE_limitCommand = 26;
	public static readonly RULE_sortCommand = 27;
	public static readonly RULE_orderExpression = 28;
	public static readonly RULE_keepCommand = 29;
	public static readonly RULE_dropCommand = 30;
	public static readonly RULE_renameCommand = 31;
	public static readonly RULE_renameClause = 32;
	public static readonly RULE_dissectCommand = 33;
	public static readonly RULE_grokCommand = 34;
	public static readonly RULE_mvExpandCommand = 35;
	public static readonly RULE_commandOptions = 36;
	public static readonly RULE_commandOption = 37;
	public static readonly RULE_booleanValue = 38;
	public static readonly RULE_numericValue = 39;
	public static readonly RULE_decimalValue = 40;
	public static readonly RULE_integerValue = 41;
	public static readonly RULE_string = 42;
	public static readonly RULE_comparisonOperator = 43;
	public static readonly RULE_explainCommand = 44;
	public static readonly RULE_subqueryExpression = 45;
	public static readonly RULE_showCommand = 46;
	public static readonly RULE_enrichCommand = 47;
	public static readonly RULE_enrichWithClause = 48;
	// tslint:disable:no-trailing-whitespace
	public static readonly ruleNames: string[] = [
		"singleStatement", "query", "sourceCommand", "processingCommand", "whereCommand", 
		"booleanExpression", "regexBooleanExpression", "valueExpression", "operatorExpression", 
		"primaryExpression", "functionExpression", "rowCommand", "fields", "field", 
		"fromCommand", "metadata", "evalCommand", "statsCommand", "inlinestatsCommand", 
		"grouping", "fromIdentifier", "qualifiedName", "qualifiedNamePattern", 
		"identifier", "identifierPattern", "constant", "limitCommand", "sortCommand", 
		"orderExpression", "keepCommand", "dropCommand", "renameCommand", "renameClause", 
		"dissectCommand", "grokCommand", "mvExpandCommand", "commandOptions", 
		"commandOption", "booleanValue", "numericValue", "decimalValue", "integerValue", 
		"string", "comparisonOperator", "explainCommand", "subqueryExpression", 
		"showCommand", "enrichCommand", "enrichWithClause",
	];

	private static readonly _LITERAL_NAMES: Array<string | undefined> = [
		undefined, undefined, undefined, undefined, undefined, undefined, undefined, 
		undefined, undefined, undefined, undefined, undefined, undefined, undefined, 
		undefined, undefined, undefined, undefined, undefined, undefined, undefined, 
		undefined, undefined, undefined, undefined, undefined, "'|'", undefined, 
		undefined, undefined, undefined, undefined, undefined, "'='", "','", undefined, 
		"'.'", undefined, undefined, undefined, "'('", undefined, undefined, undefined, 
		undefined, undefined, undefined, undefined, "'?'", undefined, "')'", undefined, 
		"'=='", "'!='", "'<'", "'<='", "'>'", "'>='", "'+'", "'-'", "'*'", "'/'", 
		"'%'", undefined, "']'",
	];
	private static readonly _SYMBOLIC_NAMES: Array<string | undefined> = [
		undefined, "DISSECT", "DROP", "ENRICH", "EVAL", "EXPLAIN", "FROM", "GROK", 
		"INLINESTATS", "KEEP", "LIMIT", "MV_EXPAND", "PROJECT", "RENAME", "ROW", 
		"SHOW", "SORT", "STATS", "WHERE", "UNKNOWN_CMD", "LINE_COMMENT", "MULTILINE_COMMENT", 
		"WS", "EXPLAIN_WS", "EXPLAIN_LINE_COMMENT", "EXPLAIN_MULTILINE_COMMENT", 
		"PIPE", "STRING", "INTEGER_LITERAL", "DECIMAL_LITERAL", "BY", "AND", "ASC", 
		"ASSIGN", "COMMA", "DESC", "DOT", "FALSE", "FIRST", "LAST", "LP", "IN", 
		"IS", "LIKE", "NOT", "NULL", "NULLS", "OR", "PARAM", "RLIKE", "RP", "TRUE", 
		"EQ", "NEQ", "LT", "LTE", "GT", "GTE", "PLUS", "MINUS", "ASTERISK", "SLASH", 
		"PERCENT", "OPENING_BRACKET", "CLOSING_BRACKET", "UNQUOTED_IDENTIFIER", 
		"QUOTED_IDENTIFIER", "EXPR_LINE_COMMENT", "EXPR_MULTILINE_COMMENT", "EXPR_WS", 
		"METADATA", "FROM_UNQUOTED_IDENTIFIER", "FROM_LINE_COMMENT", "FROM_MULTILINE_COMMENT", 
		"FROM_WS", "PROJECT_UNQUOTED_IDENTIFIER", "PROJECT_LINE_COMMENT", "PROJECT_MULTILINE_COMMENT", 
		"PROJECT_WS", "AS", "RENAME_LINE_COMMENT", "RENAME_MULTILINE_COMMENT", 
		"RENAME_WS", "ON", "WITH", "ENRICH_LINE_COMMENT", "ENRICH_MULTILINE_COMMENT", 
		"ENRICH_WS", "ENRICH_FIELD_LINE_COMMENT", "ENRICH_FIELD_MULTILINE_COMMENT", 
		"ENRICH_FIELD_WS", "MVEXPAND_LINE_COMMENT", "MVEXPAND_MULTILINE_COMMENT", 
		"MVEXPAND_WS", "INFO", "FUNCTIONS", "SHOW_LINE_COMMENT", "SHOW_MULTILINE_COMMENT", 
		"SHOW_WS",
	];
	public static readonly VOCABULARY: Vocabulary = new VocabularyImpl(esql_parser._LITERAL_NAMES, esql_parser._SYMBOLIC_NAMES, []);

	// @Override
	// @NotNull
	public get vocabulary(): Vocabulary {
		return esql_parser.VOCABULARY;
	}
	// tslint:enable:no-trailing-whitespace

	// @Override
	public get grammarFileName(): string { return "esql_parser.g4"; }

	// @Override
	public get ruleNames(): string[] { return esql_parser.ruleNames; }

	// @Override
	public get serializedATN(): string { return esql_parser._serializedATN; }

	constructor(input: TokenStream) {
		super(input);
		this._interp = new ParserATNSimulator(esql_parser._ATN, this);
	}
	// @RuleVersion(0)
	public singleStatement(): SingleStatementContext {
		let _localctx: SingleStatementContext = new SingleStatementContext(this._ctx, this.state);
		this.enterRule(_localctx, 0, esql_parser.RULE_singleStatement);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 98;
			this.query(0);
			this.state = 99;
			this.match(esql_parser.EOF);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
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
		let _localctx: QueryContext = new QueryContext(this._ctx, _parentState);
		let _prevctx: QueryContext = _localctx;
		let _startState: number = 2;
		this.enterRecursionRule(_localctx, 2, esql_parser.RULE_query, _p);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			{
			_localctx = new SingleCommandQueryContext(_localctx);
			this._ctx = _localctx;
			_prevctx = _localctx;

			this.state = 102;
			this.sourceCommand();
			}
			this._ctx._stop = this._input.tryLT(-1);
			this.state = 109;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 0, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					if (this._parseListeners != null) {
						this.triggerExitRuleEvent();
					}
					_prevctx = _localctx;
					{
					{
					_localctx = new CompositeQueryContext(new QueryContext(_parentctx, _parentState));
					this.pushNewRecursionContext(_localctx, _startState, esql_parser.RULE_query);
					this.state = 104;
					if (!(this.precpred(this._ctx, 1))) {
						throw new FailedPredicateException(this, "this.precpred(this._ctx, 1)");
					}
					this.state = 105;
					this.match(esql_parser.PIPE);
					this.state = 106;
					this.processingCommand();
					}
					}
				}
				this.state = 111;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 0, this._ctx);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.unrollRecursionContexts(_parentctx);
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public sourceCommand(): SourceCommandContext {
		let _localctx: SourceCommandContext = new SourceCommandContext(this._ctx, this.state);
		this.enterRule(_localctx, 4, esql_parser.RULE_sourceCommand);
		try {
			this.state = 116;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case esql_parser.EXPLAIN:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 112;
				this.explainCommand();
				}
				break;
			case esql_parser.FROM:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 113;
				this.fromCommand();
				}
				break;
			case esql_parser.ROW:
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 114;
				this.rowCommand();
				}
				break;
			case esql_parser.SHOW:
				this.enterOuterAlt(_localctx, 4);
				{
				this.state = 115;
				this.showCommand();
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public processingCommand(): ProcessingCommandContext {
		let _localctx: ProcessingCommandContext = new ProcessingCommandContext(this._ctx, this.state);
		this.enterRule(_localctx, 6, esql_parser.RULE_processingCommand);
		try {
			this.state = 131;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case esql_parser.EVAL:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 118;
				this.evalCommand();
				}
				break;
			case esql_parser.INLINESTATS:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 119;
				this.inlinestatsCommand();
				}
				break;
			case esql_parser.LIMIT:
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 120;
				this.limitCommand();
				}
				break;
			case esql_parser.KEEP:
			case esql_parser.PROJECT:
				this.enterOuterAlt(_localctx, 4);
				{
				this.state = 121;
				this.keepCommand();
				}
				break;
			case esql_parser.SORT:
				this.enterOuterAlt(_localctx, 5);
				{
				this.state = 122;
				this.sortCommand();
				}
				break;
			case esql_parser.STATS:
				this.enterOuterAlt(_localctx, 6);
				{
				this.state = 123;
				this.statsCommand();
				}
				break;
			case esql_parser.WHERE:
				this.enterOuterAlt(_localctx, 7);
				{
				this.state = 124;
				this.whereCommand();
				}
				break;
			case esql_parser.DROP:
				this.enterOuterAlt(_localctx, 8);
				{
				this.state = 125;
				this.dropCommand();
				}
				break;
			case esql_parser.RENAME:
				this.enterOuterAlt(_localctx, 9);
				{
				this.state = 126;
				this.renameCommand();
				}
				break;
			case esql_parser.DISSECT:
				this.enterOuterAlt(_localctx, 10);
				{
				this.state = 127;
				this.dissectCommand();
				}
				break;
			case esql_parser.GROK:
				this.enterOuterAlt(_localctx, 11);
				{
				this.state = 128;
				this.grokCommand();
				}
				break;
			case esql_parser.ENRICH:
				this.enterOuterAlt(_localctx, 12);
				{
				this.state = 129;
				this.enrichCommand();
				}
				break;
			case esql_parser.MV_EXPAND:
				this.enterOuterAlt(_localctx, 13);
				{
				this.state = 130;
				this.mvExpandCommand();
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public whereCommand(): WhereCommandContext {
		let _localctx: WhereCommandContext = new WhereCommandContext(this._ctx, this.state);
		this.enterRule(_localctx, 8, esql_parser.RULE_whereCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 133;
			this.match(esql_parser.WHERE);
			this.state = 134;
			this.booleanExpression(0);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
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
		let _localctx: BooleanExpressionContext = new BooleanExpressionContext(this._ctx, _parentState);
		let _prevctx: BooleanExpressionContext = _localctx;
		let _startState: number = 10;
		this.enterRecursionRule(_localctx, 10, esql_parser.RULE_booleanExpression, _p);
		let _la: number;
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 164;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 6, this._ctx) ) {
			case 1:
				{
				_localctx = new LogicalNotContext(_localctx);
				this._ctx = _localctx;
				_prevctx = _localctx;

				this.state = 137;
				this.match(esql_parser.NOT);
				this.state = 138;
				this.booleanExpression(7);
				}
				break;

			case 2:
				{
				_localctx = new BooleanDefaultContext(_localctx);
				this._ctx = _localctx;
				_prevctx = _localctx;
				this.state = 139;
				this.valueExpression();
				}
				break;

			case 3:
				{
				_localctx = new RegexExpressionContext(_localctx);
				this._ctx = _localctx;
				_prevctx = _localctx;
				this.state = 140;
				this.regexBooleanExpression();
				}
				break;

			case 4:
				{
				_localctx = new LogicalInContext(_localctx);
				this._ctx = _localctx;
				_prevctx = _localctx;
				this.state = 141;
				this.valueExpression();
				this.state = 143;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la === esql_parser.NOT) {
					{
					this.state = 142;
					this.match(esql_parser.NOT);
					}
				}

				this.state = 145;
				this.match(esql_parser.IN);
				this.state = 146;
				this.match(esql_parser.LP);
				this.state = 147;
				this.valueExpression();
				this.state = 152;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la === esql_parser.COMMA) {
					{
					{
					this.state = 148;
					this.match(esql_parser.COMMA);
					this.state = 149;
					this.valueExpression();
					}
					}
					this.state = 154;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 155;
				this.match(esql_parser.RP);
				}
				break;

			case 5:
				{
				_localctx = new IsNullContext(_localctx);
				this._ctx = _localctx;
				_prevctx = _localctx;
				this.state = 157;
				this.valueExpression();
				this.state = 158;
				this.match(esql_parser.IS);
				this.state = 160;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la === esql_parser.NOT) {
					{
					this.state = 159;
					this.match(esql_parser.NOT);
					}
				}

				this.state = 162;
				this.match(esql_parser.NULL);
				}
				break;
			}
			this._ctx._stop = this._input.tryLT(-1);
			this.state = 174;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 8, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					if (this._parseListeners != null) {
						this.triggerExitRuleEvent();
					}
					_prevctx = _localctx;
					{
					this.state = 172;
					this._errHandler.sync(this);
					switch ( this.interpreter.adaptivePredict(this._input, 7, this._ctx) ) {
					case 1:
						{
						_localctx = new LogicalBinaryContext(new BooleanExpressionContext(_parentctx, _parentState));
						(_localctx as LogicalBinaryContext)._left = _prevctx;
						this.pushNewRecursionContext(_localctx, _startState, esql_parser.RULE_booleanExpression);
						this.state = 166;
						if (!(this.precpred(this._ctx, 4))) {
							throw new FailedPredicateException(this, "this.precpred(this._ctx, 4)");
						}
						this.state = 167;
						(_localctx as LogicalBinaryContext)._operator = this.match(esql_parser.AND);
						this.state = 168;
						(_localctx as LogicalBinaryContext)._right = this.booleanExpression(5);
						}
						break;

					case 2:
						{
						_localctx = new LogicalBinaryContext(new BooleanExpressionContext(_parentctx, _parentState));
						(_localctx as LogicalBinaryContext)._left = _prevctx;
						this.pushNewRecursionContext(_localctx, _startState, esql_parser.RULE_booleanExpression);
						this.state = 169;
						if (!(this.precpred(this._ctx, 3))) {
							throw new FailedPredicateException(this, "this.precpred(this._ctx, 3)");
						}
						this.state = 170;
						(_localctx as LogicalBinaryContext)._operator = this.match(esql_parser.OR);
						this.state = 171;
						(_localctx as LogicalBinaryContext)._right = this.booleanExpression(4);
						}
						break;
					}
					}
				}
				this.state = 176;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 8, this._ctx);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.unrollRecursionContexts(_parentctx);
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public regexBooleanExpression(): RegexBooleanExpressionContext {
		let _localctx: RegexBooleanExpressionContext = new RegexBooleanExpressionContext(this._ctx, this.state);
		this.enterRule(_localctx, 12, esql_parser.RULE_regexBooleanExpression);
		let _la: number;
		try {
			this.state = 191;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 11, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 177;
				this.valueExpression();
				this.state = 179;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la === esql_parser.NOT) {
					{
					this.state = 178;
					this.match(esql_parser.NOT);
					}
				}

				this.state = 181;
				_localctx._kind = this.match(esql_parser.LIKE);
				this.state = 182;
				_localctx._pattern = this.string();
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 184;
				this.valueExpression();
				this.state = 186;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la === esql_parser.NOT) {
					{
					this.state = 185;
					this.match(esql_parser.NOT);
					}
				}

				this.state = 188;
				_localctx._kind = this.match(esql_parser.RLIKE);
				this.state = 189;
				_localctx._pattern = this.string();
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public valueExpression(): ValueExpressionContext {
		let _localctx: ValueExpressionContext = new ValueExpressionContext(this._ctx, this.state);
		this.enterRule(_localctx, 14, esql_parser.RULE_valueExpression);
		try {
			this.state = 198;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 12, this._ctx) ) {
			case 1:
				_localctx = new ValueExpressionDefaultContext(_localctx);
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 193;
				this.operatorExpression(0);
				}
				break;

			case 2:
				_localctx = new ComparisonContext(_localctx);
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 194;
				(_localctx as ComparisonContext)._left = this.operatorExpression(0);
				this.state = 195;
				this.comparisonOperator();
				this.state = 196;
				(_localctx as ComparisonContext)._right = this.operatorExpression(0);
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
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
		let _localctx: OperatorExpressionContext = new OperatorExpressionContext(this._ctx, _parentState);
		let _prevctx: OperatorExpressionContext = _localctx;
		let _startState: number = 16;
		this.enterRecursionRule(_localctx, 16, esql_parser.RULE_operatorExpression, _p);
		let _la: number;
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 204;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 13, this._ctx) ) {
			case 1:
				{
				_localctx = new OperatorExpressionDefaultContext(_localctx);
				this._ctx = _localctx;
				_prevctx = _localctx;

				this.state = 201;
				this.primaryExpression();
				}
				break;

			case 2:
				{
				_localctx = new ArithmeticUnaryContext(_localctx);
				this._ctx = _localctx;
				_prevctx = _localctx;
				this.state = 202;
				(_localctx as ArithmeticUnaryContext)._operator = this._input.LT(1);
				_la = this._input.LA(1);
				if (!(_la === esql_parser.PLUS || _la === esql_parser.MINUS)) {
					(_localctx as ArithmeticUnaryContext)._operator = this._errHandler.recoverInline(this);
				} else {
					if (this._input.LA(1) === Token.EOF) {
						this.matchedEOF = true;
					}

					this._errHandler.reportMatch(this);
					this.consume();
				}
				this.state = 203;
				this.operatorExpression(3);
				}
				break;
			}
			this._ctx._stop = this._input.tryLT(-1);
			this.state = 214;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 15, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					if (this._parseListeners != null) {
						this.triggerExitRuleEvent();
					}
					_prevctx = _localctx;
					{
					this.state = 212;
					this._errHandler.sync(this);
					switch ( this.interpreter.adaptivePredict(this._input, 14, this._ctx) ) {
					case 1:
						{
						_localctx = new ArithmeticBinaryContext(new OperatorExpressionContext(_parentctx, _parentState));
						(_localctx as ArithmeticBinaryContext)._left = _prevctx;
						this.pushNewRecursionContext(_localctx, _startState, esql_parser.RULE_operatorExpression);
						this.state = 206;
						if (!(this.precpred(this._ctx, 2))) {
							throw new FailedPredicateException(this, "this.precpred(this._ctx, 2)");
						}
						this.state = 207;
						(_localctx as ArithmeticBinaryContext)._operator = this._input.LT(1);
						_la = this._input.LA(1);
						if (!(((((_la - 60)) & ~0x1F) === 0 && ((1 << (_la - 60)) & ((1 << (esql_parser.ASTERISK - 60)) | (1 << (esql_parser.SLASH - 60)) | (1 << (esql_parser.PERCENT - 60)))) !== 0))) {
							(_localctx as ArithmeticBinaryContext)._operator = this._errHandler.recoverInline(this);
						} else {
							if (this._input.LA(1) === Token.EOF) {
								this.matchedEOF = true;
							}

							this._errHandler.reportMatch(this);
							this.consume();
						}
						this.state = 208;
						(_localctx as ArithmeticBinaryContext)._right = this.operatorExpression(3);
						}
						break;

					case 2:
						{
						_localctx = new ArithmeticBinaryContext(new OperatorExpressionContext(_parentctx, _parentState));
						(_localctx as ArithmeticBinaryContext)._left = _prevctx;
						this.pushNewRecursionContext(_localctx, _startState, esql_parser.RULE_operatorExpression);
						this.state = 209;
						if (!(this.precpred(this._ctx, 1))) {
							throw new FailedPredicateException(this, "this.precpred(this._ctx, 1)");
						}
						this.state = 210;
						(_localctx as ArithmeticBinaryContext)._operator = this._input.LT(1);
						_la = this._input.LA(1);
						if (!(_la === esql_parser.PLUS || _la === esql_parser.MINUS)) {
							(_localctx as ArithmeticBinaryContext)._operator = this._errHandler.recoverInline(this);
						} else {
							if (this._input.LA(1) === Token.EOF) {
								this.matchedEOF = true;
							}

							this._errHandler.reportMatch(this);
							this.consume();
						}
						this.state = 211;
						(_localctx as ArithmeticBinaryContext)._right = this.operatorExpression(2);
						}
						break;
					}
					}
				}
				this.state = 216;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 15, this._ctx);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.unrollRecursionContexts(_parentctx);
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public primaryExpression(): PrimaryExpressionContext {
		let _localctx: PrimaryExpressionContext = new PrimaryExpressionContext(this._ctx, this.state);
		this.enterRule(_localctx, 18, esql_parser.RULE_primaryExpression);
		try {
			this.state = 224;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 16, this._ctx) ) {
			case 1:
				_localctx = new ConstantDefaultContext(_localctx);
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 217;
				this.constant();
				}
				break;

			case 2:
				_localctx = new DereferenceContext(_localctx);
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 218;
				this.qualifiedName();
				}
				break;

			case 3:
				_localctx = new FunctionContext(_localctx);
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 219;
				this.functionExpression();
				}
				break;

			case 4:
				_localctx = new ParenthesizedExpressionContext(_localctx);
				this.enterOuterAlt(_localctx, 4);
				{
				this.state = 220;
				this.match(esql_parser.LP);
				this.state = 221;
				this.booleanExpression(0);
				this.state = 222;
				this.match(esql_parser.RP);
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public functionExpression(): FunctionExpressionContext {
		let _localctx: FunctionExpressionContext = new FunctionExpressionContext(this._ctx, this.state);
		this.enterRule(_localctx, 20, esql_parser.RULE_functionExpression);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 226;
			this.identifier();
			this.state = 227;
			this.match(esql_parser.LP);
			this.state = 237;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case esql_parser.ASTERISK:
				{
				this.state = 228;
				this.match(esql_parser.ASTERISK);
				}
				break;
			case esql_parser.STRING:
			case esql_parser.INTEGER_LITERAL:
			case esql_parser.DECIMAL_LITERAL:
			case esql_parser.FALSE:
			case esql_parser.LP:
			case esql_parser.NOT:
			case esql_parser.NULL:
			case esql_parser.PARAM:
			case esql_parser.TRUE:
			case esql_parser.PLUS:
			case esql_parser.MINUS:
			case esql_parser.OPENING_BRACKET:
			case esql_parser.UNQUOTED_IDENTIFIER:
			case esql_parser.QUOTED_IDENTIFIER:
				{
				{
				this.state = 229;
				this.booleanExpression(0);
				this.state = 234;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la === esql_parser.COMMA) {
					{
					{
					this.state = 230;
					this.match(esql_parser.COMMA);
					this.state = 231;
					this.booleanExpression(0);
					}
					}
					this.state = 236;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				}
				}
				break;
			case esql_parser.RP:
				break;
			default:
				break;
			}
			this.state = 239;
			this.match(esql_parser.RP);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public rowCommand(): RowCommandContext {
		let _localctx: RowCommandContext = new RowCommandContext(this._ctx, this.state);
		this.enterRule(_localctx, 22, esql_parser.RULE_rowCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 241;
			this.match(esql_parser.ROW);
			this.state = 242;
			this.fields();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public fields(): FieldsContext {
		let _localctx: FieldsContext = new FieldsContext(this._ctx, this.state);
		this.enterRule(_localctx, 24, esql_parser.RULE_fields);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 244;
			this.field();
			this.state = 249;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 19, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 245;
					this.match(esql_parser.COMMA);
					this.state = 246;
					this.field();
					}
					}
				}
				this.state = 251;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 19, this._ctx);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public field(): FieldContext {
		let _localctx: FieldContext = new FieldContext(this._ctx, this.state);
		this.enterRule(_localctx, 26, esql_parser.RULE_field);
		try {
			this.state = 257;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 20, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 252;
				this.booleanExpression(0);
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 253;
				this.qualifiedName();
				this.state = 254;
				this.match(esql_parser.ASSIGN);
				this.state = 255;
				this.booleanExpression(0);
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public fromCommand(): FromCommandContext {
		let _localctx: FromCommandContext = new FromCommandContext(this._ctx, this.state);
		this.enterRule(_localctx, 28, esql_parser.RULE_fromCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 259;
			this.match(esql_parser.FROM);
			this.state = 260;
			this.fromIdentifier();
			this.state = 265;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 21, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 261;
					this.match(esql_parser.COMMA);
					this.state = 262;
					this.fromIdentifier();
					}
					}
				}
				this.state = 267;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 21, this._ctx);
			}
			this.state = 269;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 22, this._ctx) ) {
			case 1:
				{
				this.state = 268;
				this.metadata();
				}
				break;
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public metadata(): MetadataContext {
		let _localctx: MetadataContext = new MetadataContext(this._ctx, this.state);
		this.enterRule(_localctx, 30, esql_parser.RULE_metadata);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 271;
			this.match(esql_parser.OPENING_BRACKET);
			this.state = 272;
			this.match(esql_parser.METADATA);
			this.state = 273;
			this.fromIdentifier();
			this.state = 278;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la === esql_parser.COMMA) {
				{
				{
				this.state = 274;
				this.match(esql_parser.COMMA);
				this.state = 275;
				this.fromIdentifier();
				}
				}
				this.state = 280;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			this.state = 281;
			this.match(esql_parser.CLOSING_BRACKET);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public evalCommand(): EvalCommandContext {
		let _localctx: EvalCommandContext = new EvalCommandContext(this._ctx, this.state);
		this.enterRule(_localctx, 32, esql_parser.RULE_evalCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 283;
			this.match(esql_parser.EVAL);
			this.state = 284;
			this.fields();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public statsCommand(): StatsCommandContext {
		let _localctx: StatsCommandContext = new StatsCommandContext(this._ctx, this.state);
		this.enterRule(_localctx, 34, esql_parser.RULE_statsCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 286;
			this.match(esql_parser.STATS);
			this.state = 288;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 24, this._ctx) ) {
			case 1:
				{
				this.state = 287;
				this.fields();
				}
				break;
			}
			this.state = 292;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 25, this._ctx) ) {
			case 1:
				{
				this.state = 290;
				this.match(esql_parser.BY);
				this.state = 291;
				this.grouping();
				}
				break;
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public inlinestatsCommand(): InlinestatsCommandContext {
		let _localctx: InlinestatsCommandContext = new InlinestatsCommandContext(this._ctx, this.state);
		this.enterRule(_localctx, 36, esql_parser.RULE_inlinestatsCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 294;
			this.match(esql_parser.INLINESTATS);
			this.state = 295;
			this.fields();
			this.state = 298;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 26, this._ctx) ) {
			case 1:
				{
				this.state = 296;
				this.match(esql_parser.BY);
				this.state = 297;
				this.grouping();
				}
				break;
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public grouping(): GroupingContext {
		let _localctx: GroupingContext = new GroupingContext(this._ctx, this.state);
		this.enterRule(_localctx, 38, esql_parser.RULE_grouping);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 300;
			this.qualifiedName();
			this.state = 305;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 27, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 301;
					this.match(esql_parser.COMMA);
					this.state = 302;
					this.qualifiedName();
					}
					}
				}
				this.state = 307;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 27, this._ctx);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public fromIdentifier(): FromIdentifierContext {
		let _localctx: FromIdentifierContext = new FromIdentifierContext(this._ctx, this.state);
		this.enterRule(_localctx, 40, esql_parser.RULE_fromIdentifier);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 308;
			_la = this._input.LA(1);
			if (!(_la === esql_parser.QUOTED_IDENTIFIER || _la === esql_parser.FROM_UNQUOTED_IDENTIFIER)) {
			this._errHandler.recoverInline(this);
			} else {
				if (this._input.LA(1) === Token.EOF) {
					this.matchedEOF = true;
				}

				this._errHandler.reportMatch(this);
				this.consume();
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public qualifiedName(): QualifiedNameContext {
		let _localctx: QualifiedNameContext = new QualifiedNameContext(this._ctx, this.state);
		this.enterRule(_localctx, 42, esql_parser.RULE_qualifiedName);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 310;
			this.identifier();
			this.state = 315;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 28, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 311;
					this.match(esql_parser.DOT);
					this.state = 312;
					this.identifier();
					}
					}
				}
				this.state = 317;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 28, this._ctx);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public qualifiedNamePattern(): QualifiedNamePatternContext {
		let _localctx: QualifiedNamePatternContext = new QualifiedNamePatternContext(this._ctx, this.state);
		this.enterRule(_localctx, 44, esql_parser.RULE_qualifiedNamePattern);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 318;
			this.identifierPattern();
			this.state = 323;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 29, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 319;
					this.match(esql_parser.DOT);
					this.state = 320;
					this.identifierPattern();
					}
					}
				}
				this.state = 325;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 29, this._ctx);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public identifier(): IdentifierContext {
		let _localctx: IdentifierContext = new IdentifierContext(this._ctx, this.state);
		this.enterRule(_localctx, 46, esql_parser.RULE_identifier);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 326;
			_la = this._input.LA(1);
			if (!(_la === esql_parser.UNQUOTED_IDENTIFIER || _la === esql_parser.QUOTED_IDENTIFIER)) {
			this._errHandler.recoverInline(this);
			} else {
				if (this._input.LA(1) === Token.EOF) {
					this.matchedEOF = true;
				}

				this._errHandler.reportMatch(this);
				this.consume();
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public identifierPattern(): IdentifierPatternContext {
		let _localctx: IdentifierPatternContext = new IdentifierPatternContext(this._ctx, this.state);
		this.enterRule(_localctx, 48, esql_parser.RULE_identifierPattern);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 328;
			_la = this._input.LA(1);
			if (!(_la === esql_parser.QUOTED_IDENTIFIER || _la === esql_parser.PROJECT_UNQUOTED_IDENTIFIER)) {
			this._errHandler.recoverInline(this);
			} else {
				if (this._input.LA(1) === Token.EOF) {
					this.matchedEOF = true;
				}

				this._errHandler.reportMatch(this);
				this.consume();
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public constant(): ConstantContext {
		let _localctx: ConstantContext = new ConstantContext(this._ctx, this.state);
		this.enterRule(_localctx, 50, esql_parser.RULE_constant);
		let _la: number;
		try {
			this.state = 372;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 33, this._ctx) ) {
			case 1:
				_localctx = new NullLiteralContext(_localctx);
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 330;
				this.match(esql_parser.NULL);
				}
				break;

			case 2:
				_localctx = new QualifiedIntegerLiteralContext(_localctx);
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 331;
				this.integerValue();
				this.state = 332;
				this.match(esql_parser.UNQUOTED_IDENTIFIER);
				}
				break;

			case 3:
				_localctx = new DecimalLiteralContext(_localctx);
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 334;
				this.decimalValue();
				}
				break;

			case 4:
				_localctx = new IntegerLiteralContext(_localctx);
				this.enterOuterAlt(_localctx, 4);
				{
				this.state = 335;
				this.integerValue();
				}
				break;

			case 5:
				_localctx = new BooleanLiteralContext(_localctx);
				this.enterOuterAlt(_localctx, 5);
				{
				this.state = 336;
				this.booleanValue();
				}
				break;

			case 6:
				_localctx = new InputParamContext(_localctx);
				this.enterOuterAlt(_localctx, 6);
				{
				this.state = 337;
				this.match(esql_parser.PARAM);
				}
				break;

			case 7:
				_localctx = new StringLiteralContext(_localctx);
				this.enterOuterAlt(_localctx, 7);
				{
				this.state = 338;
				this.string();
				}
				break;

			case 8:
				_localctx = new NumericArrayLiteralContext(_localctx);
				this.enterOuterAlt(_localctx, 8);
				{
				this.state = 339;
				this.match(esql_parser.OPENING_BRACKET);
				this.state = 340;
				this.numericValue();
				this.state = 345;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la === esql_parser.COMMA) {
					{
					{
					this.state = 341;
					this.match(esql_parser.COMMA);
					this.state = 342;
					this.numericValue();
					}
					}
					this.state = 347;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 348;
				this.match(esql_parser.CLOSING_BRACKET);
				}
				break;

			case 9:
				_localctx = new BooleanArrayLiteralContext(_localctx);
				this.enterOuterAlt(_localctx, 9);
				{
				this.state = 350;
				this.match(esql_parser.OPENING_BRACKET);
				this.state = 351;
				this.booleanValue();
				this.state = 356;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la === esql_parser.COMMA) {
					{
					{
					this.state = 352;
					this.match(esql_parser.COMMA);
					this.state = 353;
					this.booleanValue();
					}
					}
					this.state = 358;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 359;
				this.match(esql_parser.CLOSING_BRACKET);
				}
				break;

			case 10:
				_localctx = new StringArrayLiteralContext(_localctx);
				this.enterOuterAlt(_localctx, 10);
				{
				this.state = 361;
				this.match(esql_parser.OPENING_BRACKET);
				this.state = 362;
				this.string();
				this.state = 367;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la === esql_parser.COMMA) {
					{
					{
					this.state = 363;
					this.match(esql_parser.COMMA);
					this.state = 364;
					this.string();
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
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public limitCommand(): LimitCommandContext {
		let _localctx: LimitCommandContext = new LimitCommandContext(this._ctx, this.state);
		this.enterRule(_localctx, 52, esql_parser.RULE_limitCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 374;
			this.match(esql_parser.LIMIT);
			this.state = 375;
			this.match(esql_parser.INTEGER_LITERAL);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public sortCommand(): SortCommandContext {
		let _localctx: SortCommandContext = new SortCommandContext(this._ctx, this.state);
		this.enterRule(_localctx, 54, esql_parser.RULE_sortCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 377;
			this.match(esql_parser.SORT);
			this.state = 378;
			this.orderExpression();
			this.state = 383;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 34, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 379;
					this.match(esql_parser.COMMA);
					this.state = 380;
					this.orderExpression();
					}
					}
				}
				this.state = 385;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 34, this._ctx);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public orderExpression(): OrderExpressionContext {
		let _localctx: OrderExpressionContext = new OrderExpressionContext(this._ctx, this.state);
		this.enterRule(_localctx, 56, esql_parser.RULE_orderExpression);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 386;
			this.booleanExpression(0);
			this.state = 388;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 35, this._ctx) ) {
			case 1:
				{
				this.state = 387;
				_localctx._ordering = this._input.LT(1);
				_la = this._input.LA(1);
				if (!(_la === esql_parser.ASC || _la === esql_parser.DESC)) {
					_localctx._ordering = this._errHandler.recoverInline(this);
				} else {
					if (this._input.LA(1) === Token.EOF) {
						this.matchedEOF = true;
					}

					this._errHandler.reportMatch(this);
					this.consume();
				}
				}
				break;
			}
			this.state = 392;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 36, this._ctx) ) {
			case 1:
				{
				this.state = 390;
				this.match(esql_parser.NULLS);
				this.state = 391;
				_localctx._nullOrdering = this._input.LT(1);
				_la = this._input.LA(1);
				if (!(_la === esql_parser.FIRST || _la === esql_parser.LAST)) {
					_localctx._nullOrdering = this._errHandler.recoverInline(this);
				} else {
					if (this._input.LA(1) === Token.EOF) {
						this.matchedEOF = true;
					}

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
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public keepCommand(): KeepCommandContext {
		let _localctx: KeepCommandContext = new KeepCommandContext(this._ctx, this.state);
		this.enterRule(_localctx, 58, esql_parser.RULE_keepCommand);
		try {
			let _alt: number;
			this.state = 412;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case esql_parser.KEEP:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 394;
				this.match(esql_parser.KEEP);
				this.state = 395;
				this.qualifiedNamePattern();
				this.state = 400;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 37, this._ctx);
				while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
					if (_alt === 1) {
						{
						{
						this.state = 396;
						this.match(esql_parser.COMMA);
						this.state = 397;
						this.qualifiedNamePattern();
						}
						}
					}
					this.state = 402;
					this._errHandler.sync(this);
					_alt = this.interpreter.adaptivePredict(this._input, 37, this._ctx);
				}
				}
				break;
			case esql_parser.PROJECT:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 403;
				this.match(esql_parser.PROJECT);
				this.state = 404;
				this.qualifiedNamePattern();
				this.state = 409;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 38, this._ctx);
				while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
					if (_alt === 1) {
						{
						{
						this.state = 405;
						this.match(esql_parser.COMMA);
						this.state = 406;
						this.qualifiedNamePattern();
						}
						}
					}
					this.state = 411;
					this._errHandler.sync(this);
					_alt = this.interpreter.adaptivePredict(this._input, 38, this._ctx);
				}
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public dropCommand(): DropCommandContext {
		let _localctx: DropCommandContext = new DropCommandContext(this._ctx, this.state);
		this.enterRule(_localctx, 60, esql_parser.RULE_dropCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 414;
			this.match(esql_parser.DROP);
			this.state = 415;
			this.qualifiedNamePattern();
			this.state = 420;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 40, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 416;
					this.match(esql_parser.COMMA);
					this.state = 417;
					this.qualifiedNamePattern();
					}
					}
				}
				this.state = 422;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 40, this._ctx);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public renameCommand(): RenameCommandContext {
		let _localctx: RenameCommandContext = new RenameCommandContext(this._ctx, this.state);
		this.enterRule(_localctx, 62, esql_parser.RULE_renameCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 423;
			this.match(esql_parser.RENAME);
			this.state = 424;
			this.renameClause();
			this.state = 429;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 41, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 425;
					this.match(esql_parser.COMMA);
					this.state = 426;
					this.renameClause();
					}
					}
				}
				this.state = 431;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 41, this._ctx);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public renameClause(): RenameClauseContext {
		let _localctx: RenameClauseContext = new RenameClauseContext(this._ctx, this.state);
		this.enterRule(_localctx, 64, esql_parser.RULE_renameClause);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 432;
			_localctx._oldName = this.qualifiedNamePattern();
			this.state = 433;
			this.match(esql_parser.AS);
			this.state = 434;
			_localctx._newName = this.qualifiedNamePattern();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public dissectCommand(): DissectCommandContext {
		let _localctx: DissectCommandContext = new DissectCommandContext(this._ctx, this.state);
		this.enterRule(_localctx, 66, esql_parser.RULE_dissectCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 436;
			this.match(esql_parser.DISSECT);
			this.state = 437;
			this.primaryExpression();
			this.state = 438;
			this.string();
			this.state = 440;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 42, this._ctx) ) {
			case 1:
				{
				this.state = 439;
				this.commandOptions();
				}
				break;
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public grokCommand(): GrokCommandContext {
		let _localctx: GrokCommandContext = new GrokCommandContext(this._ctx, this.state);
		this.enterRule(_localctx, 68, esql_parser.RULE_grokCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 442;
			this.match(esql_parser.GROK);
			this.state = 443;
			this.primaryExpression();
			this.state = 444;
			this.string();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public mvExpandCommand(): MvExpandCommandContext {
		let _localctx: MvExpandCommandContext = new MvExpandCommandContext(this._ctx, this.state);
		this.enterRule(_localctx, 70, esql_parser.RULE_mvExpandCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 446;
			this.match(esql_parser.MV_EXPAND);
			this.state = 447;
			this.qualifiedName();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public commandOptions(): CommandOptionsContext {
		let _localctx: CommandOptionsContext = new CommandOptionsContext(this._ctx, this.state);
		this.enterRule(_localctx, 72, esql_parser.RULE_commandOptions);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 449;
			this.commandOption();
			this.state = 454;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 43, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 450;
					this.match(esql_parser.COMMA);
					this.state = 451;
					this.commandOption();
					}
					}
				}
				this.state = 456;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 43, this._ctx);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public commandOption(): CommandOptionContext {
		let _localctx: CommandOptionContext = new CommandOptionContext(this._ctx, this.state);
		this.enterRule(_localctx, 74, esql_parser.RULE_commandOption);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 457;
			this.identifier();
			this.state = 458;
			this.match(esql_parser.ASSIGN);
			this.state = 459;
			this.constant();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public booleanValue(): BooleanValueContext {
		let _localctx: BooleanValueContext = new BooleanValueContext(this._ctx, this.state);
		this.enterRule(_localctx, 76, esql_parser.RULE_booleanValue);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 461;
			_la = this._input.LA(1);
			if (!(_la === esql_parser.FALSE || _la === esql_parser.TRUE)) {
			this._errHandler.recoverInline(this);
			} else {
				if (this._input.LA(1) === Token.EOF) {
					this.matchedEOF = true;
				}

				this._errHandler.reportMatch(this);
				this.consume();
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public numericValue(): NumericValueContext {
		let _localctx: NumericValueContext = new NumericValueContext(this._ctx, this.state);
		this.enterRule(_localctx, 78, esql_parser.RULE_numericValue);
		try {
			this.state = 465;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 44, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 463;
				this.decimalValue();
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 464;
				this.integerValue();
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public decimalValue(): DecimalValueContext {
		let _localctx: DecimalValueContext = new DecimalValueContext(this._ctx, this.state);
		this.enterRule(_localctx, 80, esql_parser.RULE_decimalValue);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 468;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la === esql_parser.PLUS || _la === esql_parser.MINUS) {
				{
				this.state = 467;
				_la = this._input.LA(1);
				if (!(_la === esql_parser.PLUS || _la === esql_parser.MINUS)) {
				this._errHandler.recoverInline(this);
				} else {
					if (this._input.LA(1) === Token.EOF) {
						this.matchedEOF = true;
					}

					this._errHandler.reportMatch(this);
					this.consume();
				}
				}
			}

			this.state = 470;
			this.match(esql_parser.DECIMAL_LITERAL);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public integerValue(): IntegerValueContext {
		let _localctx: IntegerValueContext = new IntegerValueContext(this._ctx, this.state);
		this.enterRule(_localctx, 82, esql_parser.RULE_integerValue);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 473;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la === esql_parser.PLUS || _la === esql_parser.MINUS) {
				{
				this.state = 472;
				_la = this._input.LA(1);
				if (!(_la === esql_parser.PLUS || _la === esql_parser.MINUS)) {
				this._errHandler.recoverInline(this);
				} else {
					if (this._input.LA(1) === Token.EOF) {
						this.matchedEOF = true;
					}

					this._errHandler.reportMatch(this);
					this.consume();
				}
				}
			}

			this.state = 475;
			this.match(esql_parser.INTEGER_LITERAL);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public string(): StringContext {
		let _localctx: StringContext = new StringContext(this._ctx, this.state);
		this.enterRule(_localctx, 84, esql_parser.RULE_string);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 477;
			this.match(esql_parser.STRING);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public comparisonOperator(): ComparisonOperatorContext {
		let _localctx: ComparisonOperatorContext = new ComparisonOperatorContext(this._ctx, this.state);
		this.enterRule(_localctx, 86, esql_parser.RULE_comparisonOperator);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 479;
			_la = this._input.LA(1);
			if (!(((((_la - 52)) & ~0x1F) === 0 && ((1 << (_la - 52)) & ((1 << (esql_parser.EQ - 52)) | (1 << (esql_parser.NEQ - 52)) | (1 << (esql_parser.LT - 52)) | (1 << (esql_parser.LTE - 52)) | (1 << (esql_parser.GT - 52)) | (1 << (esql_parser.GTE - 52)))) !== 0))) {
			this._errHandler.recoverInline(this);
			} else {
				if (this._input.LA(1) === Token.EOF) {
					this.matchedEOF = true;
				}

				this._errHandler.reportMatch(this);
				this.consume();
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public explainCommand(): ExplainCommandContext {
		let _localctx: ExplainCommandContext = new ExplainCommandContext(this._ctx, this.state);
		this.enterRule(_localctx, 88, esql_parser.RULE_explainCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 481;
			this.match(esql_parser.EXPLAIN);
			this.state = 482;
			this.subqueryExpression();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public subqueryExpression(): SubqueryExpressionContext {
		let _localctx: SubqueryExpressionContext = new SubqueryExpressionContext(this._ctx, this.state);
		this.enterRule(_localctx, 90, esql_parser.RULE_subqueryExpression);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 484;
			this.match(esql_parser.OPENING_BRACKET);
			this.state = 485;
			this.query(0);
			this.state = 486;
			this.match(esql_parser.CLOSING_BRACKET);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public showCommand(): ShowCommandContext {
		let _localctx: ShowCommandContext = new ShowCommandContext(this._ctx, this.state);
		this.enterRule(_localctx, 92, esql_parser.RULE_showCommand);
		try {
			this.state = 492;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 47, this._ctx) ) {
			case 1:
				_localctx = new ShowInfoContext(_localctx);
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 488;
				this.match(esql_parser.SHOW);
				this.state = 489;
				this.match(esql_parser.INFO);
				}
				break;

			case 2:
				_localctx = new ShowFunctionsContext(_localctx);
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 490;
				this.match(esql_parser.SHOW);
				this.state = 491;
				this.match(esql_parser.FUNCTIONS);
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public enrichCommand(): EnrichCommandContext {
		let _localctx: EnrichCommandContext = new EnrichCommandContext(this._ctx, this.state);
		this.enterRule(_localctx, 94, esql_parser.RULE_enrichCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 494;
			this.match(esql_parser.ENRICH);
			this.state = 495;
			_localctx._policyName = this.fromIdentifier();
			this.state = 498;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 48, this._ctx) ) {
			case 1:
				{
				this.state = 496;
				this.match(esql_parser.ON);
				this.state = 497;
				_localctx._matchField = this.qualifiedNamePattern();
				}
				break;
			}
			this.state = 509;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 50, this._ctx) ) {
			case 1:
				{
				this.state = 500;
				this.match(esql_parser.WITH);
				this.state = 501;
				this.enrichWithClause();
				this.state = 506;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 49, this._ctx);
				while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
					if (_alt === 1) {
						{
						{
						this.state = 502;
						this.match(esql_parser.COMMA);
						this.state = 503;
						this.enrichWithClause();
						}
						}
					}
					this.state = 508;
					this._errHandler.sync(this);
					_alt = this.interpreter.adaptivePredict(this._input, 49, this._ctx);
				}
				}
				break;
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public enrichWithClause(): EnrichWithClauseContext {
		let _localctx: EnrichWithClauseContext = new EnrichWithClauseContext(this._ctx, this.state);
		this.enterRule(_localctx, 96, esql_parser.RULE_enrichWithClause);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 514;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 51, this._ctx) ) {
			case 1:
				{
				this.state = 511;
				_localctx._newName = this.qualifiedNamePattern();
				this.state = 512;
				this.match(esql_parser.ASSIGN);
				}
				break;
			}
			this.state = 516;
			_localctx._enrichField = this.qualifiedNamePattern();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}

	public sempred(_localctx: RuleContext, ruleIndex: number, predIndex: number): boolean {
		switch (ruleIndex) {
		case 1:
			return this.query_sempred(_localctx as QueryContext, predIndex);

		case 5:
			return this.booleanExpression_sempred(_localctx as BooleanExpressionContext, predIndex);

		case 8:
			return this.operatorExpression_sempred(_localctx as OperatorExpressionContext, predIndex);
		}
		return true;
	}
	private query_sempred(_localctx: QueryContext, predIndex: number): boolean {
		switch (predIndex) {
		case 0:
			return this.precpred(this._ctx, 1);
		}
		return true;
	}
	private booleanExpression_sempred(_localctx: BooleanExpressionContext, predIndex: number): boolean {
		switch (predIndex) {
		case 1:
			return this.precpred(this._ctx, 4);

		case 2:
			return this.precpred(this._ctx, 3);
		}
		return true;
	}
	private operatorExpression_sempred(_localctx: OperatorExpressionContext, predIndex: number): boolean {
		switch (predIndex) {
		case 3:
			return this.precpred(this._ctx, 2);

		case 4:
			return this.precpred(this._ctx, 1);
		}
		return true;
	}

	public static readonly _serializedATN: string =
		"\x03\uC91D\uCABA\u058D\uAFBA\u4F53\u0607\uEA8B\uC241\x03d\u0209\x04\x02" +
		"\t\x02\x04\x03\t\x03\x04\x04\t\x04\x04\x05\t\x05\x04\x06\t\x06\x04\x07" +
		"\t\x07\x04\b\t\b\x04\t\t\t\x04\n\t\n\x04\v\t\v\x04\f\t\f\x04\r\t\r\x04" +
		"\x0E\t\x0E\x04\x0F\t\x0F\x04\x10\t\x10\x04\x11\t\x11\x04\x12\t\x12\x04" +
		"\x13\t\x13\x04\x14\t\x14\x04\x15\t\x15\x04\x16\t\x16\x04\x17\t\x17\x04" +
		"\x18\t\x18\x04\x19\t\x19\x04\x1A\t\x1A\x04\x1B\t\x1B\x04\x1C\t\x1C\x04" +
		"\x1D\t\x1D\x04\x1E\t\x1E\x04\x1F\t\x1F\x04 \t \x04!\t!\x04\"\t\"\x04#" +
		"\t#\x04$\t$\x04%\t%\x04&\t&\x04\'\t\'\x04(\t(\x04)\t)\x04*\t*\x04+\t+" +
		"\x04,\t,\x04-\t-\x04.\t.\x04/\t/\x040\t0\x041\t1\x042\t2\x03\x02\x03\x02" +
		"\x03\x02\x03\x03\x03\x03\x03\x03\x03\x03\x03\x03\x03\x03\x07\x03n\n\x03" +
		"\f\x03\x0E\x03q\v\x03\x03\x04\x03\x04\x03\x04\x03\x04\x05\x04w\n\x04\x03" +
		"\x05\x03\x05\x03\x05\x03\x05\x03\x05\x03\x05\x03\x05\x03\x05\x03\x05\x03" +
		"\x05\x03\x05\x03\x05\x03\x05\x05\x05\x86\n\x05\x03\x06\x03\x06\x03\x06" +
		"\x03\x07\x03\x07\x03\x07\x03\x07\x03\x07\x03\x07\x03\x07\x05\x07\x92\n" +
		"\x07\x03\x07\x03\x07\x03\x07\x03\x07\x03\x07\x07\x07\x99\n\x07\f\x07\x0E" +
		"\x07\x9C\v\x07\x03\x07\x03\x07\x03\x07\x03\x07\x03\x07\x05\x07\xA3\n\x07" +
		"\x03\x07\x03\x07\x05\x07\xA7\n\x07\x03\x07\x03\x07\x03\x07\x03\x07\x03" +
		"\x07\x03\x07\x07\x07\xAF\n\x07\f\x07\x0E\x07\xB2\v\x07\x03\b\x03\b\x05" +
		"\b\xB6\n\b\x03\b\x03\b\x03\b\x03\b\x03\b\x05\b\xBD\n\b\x03\b\x03\b\x03" +
		"\b\x05\b\xC2\n\b\x03\t\x03\t\x03\t\x03\t\x03\t\x05\t\xC9\n\t\x03\n\x03" +
		"\n\x03\n\x03\n\x05\n\xCF\n\n\x03\n\x03\n\x03\n\x03\n\x03\n\x03\n\x07\n" +
		"\xD7\n\n\f\n\x0E\n\xDA\v\n\x03\v\x03\v\x03\v\x03\v\x03\v\x03\v\x03\v\x05" +
		"\v\xE3\n\v\x03\f\x03\f\x03\f\x03\f\x03\f\x03\f\x07\f\xEB\n\f\f\f\x0E\f" +
		"\xEE\v\f\x05\f\xF0\n\f\x03\f\x03\f\x03\r\x03\r\x03\r\x03\x0E\x03\x0E\x03" +
		"\x0E\x07\x0E\xFA\n\x0E\f\x0E\x0E\x0E\xFD\v\x0E\x03\x0F\x03\x0F\x03\x0F" +
		"\x03\x0F\x03\x0F\x05\x0F\u0104\n\x0F\x03\x10\x03\x10\x03\x10\x03\x10\x07" +
		"\x10\u010A\n\x10\f\x10\x0E\x10\u010D\v\x10\x03\x10\x05\x10\u0110\n\x10" +
		"\x03\x11\x03\x11\x03\x11\x03\x11\x03\x11\x07\x11\u0117\n\x11\f\x11\x0E" +
		"\x11\u011A\v\x11\x03\x11\x03\x11\x03\x12\x03\x12\x03\x12\x03\x13\x03\x13" +
		"\x05\x13\u0123\n\x13\x03\x13\x03\x13\x05\x13\u0127\n\x13\x03\x14\x03\x14" +
		"\x03\x14\x03\x14\x05\x14\u012D\n\x14\x03\x15\x03\x15\x03\x15\x07\x15\u0132" +
		"\n\x15\f\x15\x0E\x15\u0135\v\x15\x03\x16\x03\x16\x03\x17\x03\x17\x03\x17" +
		"\x07\x17\u013C\n\x17\f\x17\x0E\x17\u013F\v\x17\x03\x18\x03\x18\x03\x18" +
		"\x07\x18\u0144\n\x18\f\x18\x0E\x18\u0147\v\x18\x03\x19\x03\x19\x03\x1A" +
		"\x03\x1A\x03\x1B\x03\x1B\x03\x1B\x03\x1B\x03\x1B\x03\x1B\x03\x1B\x03\x1B" +
		"\x03\x1B\x03\x1B\x03\x1B\x03\x1B\x03\x1B\x07\x1B\u015A\n\x1B\f\x1B\x0E" +
		"\x1B\u015D\v\x1B\x03\x1B\x03\x1B\x03\x1B\x03\x1B\x03\x1B\x03\x1B\x07\x1B" +
		"\u0165\n\x1B\f\x1B\x0E\x1B\u0168\v\x1B\x03\x1B\x03\x1B\x03\x1B\x03\x1B" +
		"\x03\x1B\x03\x1B\x07\x1B\u0170\n\x1B\f\x1B\x0E\x1B\u0173\v\x1B\x03\x1B" +
		"\x03\x1B\x05\x1B\u0177\n\x1B\x03\x1C\x03\x1C\x03\x1C\x03\x1D\x03\x1D\x03" +
		"\x1D\x03\x1D\x07\x1D\u0180\n\x1D\f\x1D\x0E\x1D\u0183\v\x1D\x03\x1E\x03" +
		"\x1E\x05\x1E\u0187\n\x1E\x03\x1E\x03\x1E\x05\x1E\u018B\n\x1E\x03\x1F\x03" +
		"\x1F\x03\x1F\x03\x1F\x07\x1F\u0191\n\x1F\f\x1F\x0E\x1F\u0194\v\x1F\x03" +
		"\x1F\x03\x1F\x03\x1F\x03\x1F\x07\x1F\u019A\n\x1F\f\x1F\x0E\x1F\u019D\v" +
		"\x1F\x05\x1F\u019F\n\x1F\x03 \x03 \x03 \x03 \x07 \u01A5\n \f \x0E \u01A8" +
		"\v \x03!\x03!\x03!\x03!\x07!\u01AE\n!\f!\x0E!\u01B1\v!\x03\"\x03\"\x03" +
		"\"\x03\"\x03#\x03#\x03#\x03#\x05#\u01BB\n#\x03$\x03$\x03$\x03$\x03%\x03" +
		"%\x03%\x03&\x03&\x03&\x07&\u01C7\n&\f&\x0E&\u01CA\v&\x03\'\x03\'\x03\'" +
		"\x03\'\x03(\x03(\x03)\x03)\x05)\u01D4\n)\x03*\x05*\u01D7\n*\x03*\x03*" +
		"\x03+\x05+\u01DC\n+\x03+\x03+\x03,\x03,\x03-\x03-\x03.\x03.\x03.\x03/" +
		"\x03/\x03/\x03/\x030\x030\x030\x030\x050\u01EF\n0\x031\x031\x031\x031" +
		"\x051\u01F5\n1\x031\x031\x031\x031\x071\u01FB\n1\f1\x0E1\u01FE\v1\x05" +
		"1\u0200\n1\x032\x032\x032\x052\u0205\n2\x032\x032\x032\x02\x02\x05\x04" +
		"\f\x123\x02\x02\x04\x02\x06\x02\b\x02\n\x02\f\x02\x0E\x02\x10\x02\x12" +
		"\x02\x14\x02\x16\x02\x18\x02\x1A\x02\x1C\x02\x1E\x02 \x02\"\x02$\x02&" +
		"\x02(\x02*\x02,\x02.\x020\x022\x024\x026\x028\x02:\x02<\x02>\x02@\x02" +
		"B\x02D\x02F\x02H\x02J\x02L\x02N\x02P\x02R\x02T\x02V\x02X\x02Z\x02\\\x02" +
		"^\x02`\x02b\x02\x02\v\x03\x02<=\x03\x02>@\x04\x02DDII\x03\x02CD\x04\x02" +
		"DDMM\x04\x02\"\"%%\x03\x02()\x04\x02\'\'55\x03\x026;\x02\u0226\x02d\x03" +
		"\x02\x02\x02\x04g\x03\x02\x02\x02\x06v\x03\x02\x02\x02\b\x85\x03\x02\x02" +
		"\x02\n\x87\x03\x02\x02\x02\f\xA6\x03\x02\x02\x02\x0E\xC1\x03\x02\x02\x02" +
		"\x10\xC8\x03\x02\x02\x02\x12\xCE\x03\x02\x02\x02\x14\xE2\x03\x02\x02\x02" +
		"\x16\xE4\x03\x02\x02\x02\x18\xF3\x03\x02\x02\x02\x1A\xF6\x03\x02\x02\x02" +
		"\x1C\u0103\x03\x02\x02\x02\x1E\u0105\x03\x02\x02\x02 \u0111\x03\x02\x02" +
		"\x02\"\u011D\x03\x02\x02\x02$\u0120\x03\x02\x02\x02&\u0128\x03\x02\x02" +
		"\x02(\u012E\x03\x02\x02\x02*\u0136\x03\x02\x02\x02,\u0138\x03\x02\x02" +
		"\x02.\u0140\x03\x02\x02\x020\u0148\x03\x02\x02\x022\u014A\x03\x02\x02" +
		"\x024\u0176\x03\x02\x02\x026\u0178\x03\x02\x02\x028\u017B\x03\x02\x02" +
		"\x02:\u0184\x03\x02\x02\x02<\u019E\x03\x02\x02\x02>\u01A0\x03\x02\x02" +
		"\x02@\u01A9\x03\x02\x02\x02B\u01B2\x03\x02\x02\x02D\u01B6\x03\x02\x02" +
		"\x02F\u01BC\x03\x02\x02\x02H\u01C0\x03\x02\x02\x02J\u01C3\x03\x02\x02" +
		"\x02L\u01CB\x03\x02\x02\x02N\u01CF\x03\x02\x02\x02P\u01D3\x03\x02\x02" +
		"\x02R\u01D6\x03\x02\x02\x02T\u01DB\x03\x02\x02\x02V\u01DF\x03\x02\x02" +
		"\x02X\u01E1\x03\x02\x02\x02Z\u01E3\x03\x02\x02\x02\\\u01E6\x03\x02\x02" +
		"\x02^\u01EE\x03\x02\x02\x02`\u01F0\x03\x02\x02\x02b\u0204\x03\x02\x02" +
		"\x02de\x05\x04\x03\x02ef\x07\x02\x02\x03f\x03\x03\x02\x02\x02gh\b\x03" +
		"\x01\x02hi\x05\x06\x04\x02io\x03\x02\x02\x02jk\f\x03\x02\x02kl\x07\x1C" +
		"\x02\x02ln\x05\b\x05\x02mj\x03\x02\x02\x02nq\x03\x02\x02\x02om\x03\x02" +
		"\x02\x02op\x03\x02\x02\x02p\x05\x03\x02\x02\x02qo\x03\x02\x02\x02rw\x05" +
		"Z.\x02sw\x05\x1E\x10\x02tw\x05\x18\r\x02uw\x05^0\x02vr\x03\x02\x02\x02" +
		"vs\x03\x02\x02\x02vt\x03\x02\x02\x02vu\x03\x02\x02\x02w\x07\x03\x02\x02" +
		"\x02x\x86\x05\"\x12\x02y\x86\x05&\x14\x02z\x86\x056\x1C\x02{\x86\x05<" +
		"\x1F\x02|\x86\x058\x1D\x02}\x86\x05$\x13\x02~\x86\x05\n\x06\x02\x7F\x86" +
		"\x05> \x02\x80\x86\x05@!\x02\x81\x86\x05D#\x02\x82\x86\x05F$\x02\x83\x86" +
		"\x05`1\x02\x84\x86\x05H%\x02\x85x\x03\x02\x02\x02\x85y\x03\x02\x02\x02" +
		"\x85z\x03\x02\x02\x02\x85{\x03\x02\x02\x02\x85|\x03\x02\x02\x02\x85}\x03" +
		"\x02\x02\x02\x85~\x03\x02\x02\x02\x85\x7F\x03\x02\x02\x02\x85\x80\x03" +
		"\x02\x02\x02\x85\x81\x03\x02\x02\x02\x85\x82\x03\x02\x02\x02\x85\x83\x03" +
		"\x02\x02\x02\x85\x84\x03\x02\x02\x02\x86\t\x03\x02\x02\x02\x87\x88\x07" +
		"\x14\x02\x02\x88\x89\x05\f\x07\x02\x89\v\x03\x02\x02\x02\x8A\x8B\b\x07" +
		"\x01\x02\x8B\x8C\x07.\x02\x02\x8C\xA7\x05\f\x07\t\x8D\xA7\x05\x10\t\x02" +
		"\x8E\xA7\x05\x0E\b\x02\x8F\x91\x05\x10\t\x02\x90\x92\x07.\x02\x02\x91" +
		"\x90\x03\x02\x02\x02\x91\x92\x03\x02\x02\x02\x92\x93\x03\x02\x02\x02\x93" +
		"\x94\x07+\x02\x02\x94\x95\x07*\x02\x02\x95\x9A\x05\x10\t\x02\x96\x97\x07" +
		"$\x02\x02\x97\x99\x05\x10\t\x02\x98\x96\x03\x02\x02\x02\x99\x9C\x03\x02" +
		"\x02\x02\x9A\x98\x03\x02\x02\x02\x9A\x9B\x03\x02\x02\x02\x9B\x9D\x03\x02" +
		"\x02\x02\x9C\x9A\x03\x02\x02\x02\x9D\x9E\x074\x02\x02\x9E\xA7\x03\x02" +
		"\x02\x02\x9F\xA0\x05\x10\t\x02\xA0\xA2\x07,\x02\x02\xA1\xA3\x07.\x02\x02" +
		"\xA2\xA1\x03\x02\x02\x02\xA2\xA3\x03\x02\x02\x02\xA3\xA4\x03\x02\x02\x02" +
		"\xA4\xA5\x07/\x02\x02\xA5\xA7\x03\x02\x02\x02\xA6\x8A\x03\x02\x02\x02" +
		"\xA6\x8D\x03\x02\x02\x02\xA6\x8E\x03\x02\x02\x02\xA6\x8F\x03\x02\x02\x02" +
		"\xA6\x9F\x03\x02\x02\x02\xA7\xB0\x03\x02\x02\x02\xA8\xA9\f\x06\x02\x02" +
		"\xA9\xAA\x07!\x02\x02\xAA\xAF\x05\f\x07\x07\xAB\xAC\f\x05\x02\x02\xAC" +
		"\xAD\x071\x02\x02\xAD\xAF\x05\f\x07\x06\xAE\xA8\x03\x02\x02\x02\xAE\xAB" +
		"\x03\x02\x02\x02\xAF\xB2\x03\x02\x02\x02\xB0\xAE\x03\x02\x02\x02\xB0\xB1" +
		"\x03\x02\x02\x02\xB1\r\x03\x02\x02\x02\xB2\xB0\x03\x02\x02\x02\xB3\xB5" +
		"\x05\x10\t\x02\xB4\xB6\x07.\x02\x02\xB5\xB4\x03\x02\x02\x02\xB5\xB6\x03" +
		"\x02\x02\x02\xB6\xB7\x03\x02\x02\x02\xB7\xB8\x07-\x02\x02\xB8\xB9\x05" +
		"V,\x02\xB9\xC2\x03\x02\x02\x02\xBA\xBC\x05\x10\t\x02\xBB\xBD\x07.\x02" +
		"\x02\xBC\xBB\x03\x02\x02\x02\xBC\xBD\x03\x02\x02\x02\xBD\xBE\x03\x02\x02" +
		"\x02\xBE\xBF\x073\x02\x02\xBF\xC0\x05V,\x02\xC0\xC2\x03\x02\x02\x02\xC1" +
		"\xB3\x03\x02\x02\x02\xC1\xBA\x03\x02\x02\x02\xC2\x0F\x03\x02\x02\x02\xC3" +
		"\xC9\x05\x12\n\x02\xC4\xC5\x05\x12\n\x02\xC5\xC6\x05X-\x02\xC6\xC7\x05" +
		"\x12\n\x02\xC7\xC9\x03\x02\x02\x02\xC8\xC3\x03\x02\x02\x02\xC8\xC4\x03" +
		"\x02\x02\x02\xC9\x11\x03\x02\x02\x02\xCA\xCB\b\n\x01\x02\xCB\xCF\x05\x14" +
		"\v\x02\xCC\xCD\t\x02\x02\x02\xCD\xCF\x05\x12\n\x05\xCE\xCA\x03\x02\x02" +
		"\x02\xCE\xCC\x03\x02\x02\x02\xCF\xD8\x03\x02\x02\x02\xD0\xD1\f\x04\x02" +
		"\x02\xD1\xD2\t\x03\x02\x02\xD2\xD7\x05\x12\n\x05\xD3\xD4\f\x03\x02\x02" +
		"\xD4\xD5\t\x02\x02\x02\xD5\xD7\x05\x12\n\x04\xD6\xD0\x03\x02\x02\x02\xD6" +
		"\xD3\x03\x02\x02\x02\xD7\xDA\x03\x02\x02\x02\xD8\xD6\x03\x02\x02\x02\xD8" +
		"\xD9\x03\x02\x02\x02\xD9\x13\x03\x02\x02\x02\xDA\xD8\x03\x02\x02\x02\xDB" +
		"\xE3\x054\x1B\x02\xDC\xE3\x05,\x17\x02\xDD\xE3\x05\x16\f\x02\xDE\xDF\x07" +
		"*\x02\x02\xDF\xE0\x05\f\x07\x02\xE0\xE1\x074\x02\x02\xE1\xE3\x03\x02\x02" +
		"\x02\xE2\xDB\x03\x02\x02\x02\xE2\xDC\x03\x02\x02\x02\xE2\xDD\x03\x02\x02" +
		"\x02\xE2\xDE\x03\x02\x02\x02\xE3\x15\x03\x02\x02\x02\xE4\xE5\x050\x19" +
		"\x02\xE5\xEF\x07*\x02\x02\xE6\xF0\x07>\x02\x02\xE7\xEC\x05\f\x07\x02\xE8" +
		"\xE9\x07$\x02\x02\xE9\xEB\x05\f\x07\x02\xEA\xE8\x03\x02\x02\x02\xEB\xEE" +
		"\x03\x02\x02\x02\xEC\xEA\x03\x02\x02\x02\xEC\xED\x03\x02\x02\x02\xED\xF0" +
		"\x03\x02\x02\x02\xEE\xEC\x03\x02\x02\x02\xEF\xE6\x03\x02\x02\x02\xEF\xE7" +
		"\x03\x02\x02\x02\xEF\xF0\x03\x02\x02\x02\xF0\xF1\x03\x02\x02\x02\xF1\xF2" +
		"\x074\x02\x02\xF2\x17\x03\x02\x02\x02\xF3\xF4\x07\x10\x02\x02\xF4\xF5" +
		"\x05\x1A\x0E\x02\xF5\x19\x03\x02\x02\x02\xF6\xFB\x05\x1C\x0F\x02\xF7\xF8" +
		"\x07$\x02\x02\xF8\xFA\x05\x1C\x0F\x02\xF9\xF7\x03\x02\x02\x02\xFA\xFD" +
		"\x03\x02\x02\x02\xFB\xF9\x03\x02\x02\x02\xFB\xFC\x03\x02\x02\x02\xFC\x1B" +
		"\x03\x02\x02\x02\xFD\xFB\x03\x02\x02\x02\xFE\u0104\x05\f\x07\x02\xFF\u0100" +
		"\x05,\x17\x02\u0100\u0101\x07#\x02\x02\u0101\u0102\x05\f\x07\x02\u0102" +
		"\u0104\x03\x02\x02\x02\u0103\xFE\x03\x02\x02\x02\u0103\xFF\x03\x02\x02" +
		"\x02\u0104\x1D\x03\x02\x02\x02\u0105\u0106\x07\b\x02\x02\u0106\u010B\x05" +
		"*\x16\x02\u0107\u0108\x07$\x02\x02\u0108\u010A\x05*\x16\x02\u0109\u0107" +
		"\x03\x02\x02\x02\u010A\u010D\x03\x02\x02\x02\u010B\u0109\x03\x02\x02\x02" +
		"\u010B\u010C\x03\x02\x02\x02\u010C\u010F\x03\x02\x02\x02\u010D\u010B\x03" +
		"\x02\x02\x02\u010E\u0110\x05 \x11\x02\u010F\u010E\x03\x02\x02\x02\u010F" +
		"\u0110\x03\x02\x02\x02\u0110\x1F\x03\x02\x02\x02\u0111\u0112\x07A\x02" +
		"\x02\u0112\u0113\x07H\x02\x02\u0113\u0118\x05*\x16\x02\u0114\u0115\x07" +
		"$\x02\x02\u0115\u0117\x05*\x16\x02\u0116\u0114\x03\x02\x02\x02\u0117\u011A" +
		"\x03\x02\x02\x02\u0118\u0116\x03\x02\x02\x02\u0118\u0119\x03\x02\x02\x02" +
		"\u0119\u011B\x03\x02\x02\x02\u011A\u0118\x03\x02\x02\x02\u011B\u011C\x07" +
		"B\x02\x02\u011C!\x03\x02\x02\x02\u011D\u011E\x07\x06\x02\x02\u011E\u011F" +
		"\x05\x1A\x0E\x02\u011F#\x03\x02\x02\x02\u0120\u0122\x07\x13\x02\x02\u0121" +
		"\u0123\x05\x1A\x0E\x02\u0122\u0121\x03\x02\x02\x02\u0122\u0123\x03\x02" +
		"\x02\x02\u0123\u0126\x03\x02\x02\x02\u0124\u0125\x07 \x02\x02\u0125\u0127" +
		"\x05(\x15\x02\u0126\u0124\x03\x02\x02\x02\u0126\u0127\x03\x02\x02\x02" +
		"\u0127%\x03\x02\x02\x02\u0128\u0129\x07\n\x02\x02\u0129\u012C\x05\x1A" +
		"\x0E\x02\u012A\u012B\x07 \x02\x02\u012B\u012D\x05(\x15\x02\u012C\u012A" +
		"\x03\x02\x02\x02\u012C\u012D\x03\x02\x02\x02\u012D\'\x03\x02\x02\x02\u012E" +
		"\u0133\x05,\x17\x02\u012F\u0130\x07$\x02\x02\u0130\u0132\x05,\x17\x02" +
		"\u0131\u012F\x03\x02\x02\x02\u0132\u0135\x03\x02\x02\x02\u0133\u0131\x03" +
		"\x02\x02\x02\u0133\u0134\x03\x02\x02\x02\u0134)\x03\x02\x02\x02\u0135" +
		"\u0133\x03\x02\x02\x02\u0136\u0137\t\x04\x02\x02\u0137+\x03\x02\x02\x02" +
		"\u0138\u013D\x050\x19\x02\u0139\u013A\x07&\x02\x02\u013A\u013C\x050\x19" +
		"\x02\u013B\u0139\x03\x02\x02\x02\u013C\u013F\x03\x02\x02\x02\u013D\u013B" +
		"\x03\x02\x02\x02\u013D\u013E\x03\x02\x02\x02\u013E-\x03\x02\x02\x02\u013F" +
		"\u013D\x03\x02\x02\x02\u0140\u0145\x052\x1A\x02\u0141\u0142\x07&\x02\x02" +
		"\u0142\u0144\x052\x1A\x02\u0143\u0141\x03\x02\x02\x02\u0144\u0147\x03" +
		"\x02\x02\x02\u0145\u0143\x03\x02\x02\x02\u0145\u0146\x03\x02\x02\x02\u0146" +
		"/\x03\x02\x02\x02\u0147\u0145\x03\x02\x02\x02\u0148\u0149\t\x05\x02\x02" +
		"\u01491\x03\x02\x02\x02\u014A\u014B\t\x06\x02\x02\u014B3\x03\x02\x02\x02" +
		"\u014C\u0177\x07/\x02\x02\u014D\u014E\x05T+\x02\u014E\u014F\x07C\x02\x02" +
		"\u014F\u0177\x03\x02\x02\x02\u0150\u0177\x05R*\x02\u0151\u0177\x05T+\x02" +
		"\u0152\u0177\x05N(\x02\u0153\u0177\x072\x02\x02\u0154\u0177\x05V,\x02" +
		"\u0155\u0156\x07A\x02\x02\u0156\u015B\x05P)\x02\u0157\u0158\x07$\x02\x02" +
		"\u0158\u015A\x05P)\x02\u0159\u0157\x03\x02\x02\x02\u015A\u015D\x03\x02" +
		"\x02\x02\u015B\u0159\x03\x02\x02\x02\u015B\u015C\x03\x02\x02\x02\u015C" +
		"\u015E\x03\x02\x02\x02\u015D\u015B\x03\x02\x02\x02\u015E\u015F\x07B\x02" +
		"\x02\u015F\u0177\x03\x02\x02\x02\u0160\u0161\x07A\x02\x02\u0161\u0166" +
		"\x05N(\x02\u0162\u0163\x07$\x02\x02\u0163\u0165\x05N(\x02\u0164\u0162" +
		"\x03\x02\x02\x02\u0165\u0168\x03\x02\x02\x02\u0166\u0164\x03\x02\x02\x02" +
		"\u0166\u0167\x03\x02\x02\x02\u0167\u0169\x03\x02\x02\x02\u0168\u0166\x03" +
		"\x02\x02\x02\u0169\u016A\x07B\x02\x02\u016A\u0177\x03\x02\x02\x02\u016B" +
		"\u016C\x07A\x02\x02\u016C\u0171\x05V,\x02\u016D\u016E\x07$\x02\x02\u016E" +
		"\u0170\x05V,\x02\u016F\u016D\x03\x02\x02\x02\u0170\u0173\x03\x02\x02\x02" +
		"\u0171\u016F\x03\x02\x02\x02\u0171\u0172\x03\x02\x02\x02\u0172\u0174\x03" +
		"\x02\x02\x02\u0173\u0171\x03\x02\x02\x02\u0174\u0175\x07B\x02\x02\u0175" +
		"\u0177\x03\x02\x02\x02\u0176\u014C\x03\x02\x02\x02\u0176\u014D\x03\x02" +
		"\x02\x02\u0176\u0150\x03\x02\x02\x02\u0176\u0151\x03\x02\x02\x02\u0176" +
		"\u0152\x03\x02\x02\x02\u0176\u0153\x03\x02\x02\x02\u0176\u0154\x03\x02" +
		"\x02\x02\u0176\u0155\x03\x02\x02\x02\u0176\u0160\x03\x02\x02\x02\u0176" +
		"\u016B\x03\x02\x02\x02\u01775\x03\x02\x02\x02\u0178\u0179\x07\f\x02\x02" +
		"\u0179\u017A\x07\x1E\x02\x02\u017A7\x03\x02\x02\x02\u017B\u017C\x07\x12" +
		"\x02\x02\u017C\u0181\x05:\x1E\x02\u017D\u017E\x07$\x02\x02\u017E\u0180" +
		"\x05:\x1E\x02\u017F\u017D\x03\x02\x02\x02\u0180\u0183\x03\x02\x02\x02" +
		"\u0181\u017F\x03\x02\x02\x02\u0181\u0182\x03\x02\x02\x02\u01829\x03\x02" +
		"\x02\x02\u0183\u0181\x03\x02\x02\x02\u0184\u0186\x05\f\x07\x02\u0185\u0187" +
		"\t\x07\x02\x02\u0186\u0185\x03\x02\x02\x02\u0186\u0187\x03\x02\x02\x02" +
		"\u0187\u018A\x03\x02\x02\x02\u0188\u0189\x070\x02\x02\u0189\u018B\t\b" +
		"\x02\x02\u018A\u0188\x03\x02\x02\x02\u018A\u018B\x03\x02\x02\x02\u018B" +
		";\x03\x02\x02\x02\u018C\u018D\x07\v\x02\x02\u018D\u0192\x05.\x18\x02\u018E" +
		"\u018F\x07$\x02\x02\u018F\u0191\x05.\x18\x02\u0190\u018E\x03\x02\x02\x02" +
		"\u0191\u0194\x03\x02\x02\x02\u0192\u0190\x03\x02\x02\x02\u0192\u0193\x03" +
		"\x02\x02\x02\u0193\u019F\x03\x02\x02\x02\u0194\u0192\x03\x02\x02\x02\u0195" +
		"\u0196\x07\x0E\x02\x02\u0196\u019B\x05.\x18\x02\u0197\u0198\x07$\x02\x02" +
		"\u0198\u019A\x05.\x18\x02\u0199\u0197\x03\x02\x02\x02\u019A\u019D\x03" +
		"\x02\x02\x02\u019B\u0199\x03\x02\x02\x02\u019B\u019C\x03\x02\x02\x02\u019C" +
		"\u019F\x03\x02\x02\x02\u019D\u019B\x03\x02\x02\x02\u019E\u018C\x03\x02" +
		"\x02\x02\u019E\u0195\x03\x02\x02\x02\u019F=\x03\x02\x02\x02\u01A0\u01A1" +
		"\x07\x04\x02\x02\u01A1\u01A6\x05.\x18\x02\u01A2\u01A3\x07$\x02\x02\u01A3" +
		"\u01A5\x05.\x18\x02\u01A4\u01A2\x03\x02\x02\x02\u01A5\u01A8\x03\x02\x02" +
		"\x02\u01A6\u01A4\x03\x02\x02\x02\u01A6\u01A7\x03\x02\x02\x02\u01A7?\x03" +
		"\x02\x02\x02\u01A8\u01A6\x03\x02\x02\x02\u01A9\u01AA\x07\x0F\x02\x02\u01AA" +
		"\u01AF\x05B\"\x02\u01AB\u01AC\x07$\x02\x02\u01AC\u01AE\x05B\"\x02\u01AD" +
		"\u01AB\x03\x02\x02\x02\u01AE\u01B1\x03\x02\x02\x02\u01AF\u01AD\x03\x02" +
		"\x02\x02\u01AF\u01B0\x03\x02\x02\x02\u01B0A\x03\x02\x02\x02\u01B1\u01AF" +
		"\x03\x02\x02\x02\u01B2\u01B3\x05.\x18\x02\u01B3\u01B4\x07Q\x02\x02\u01B4" +
		"\u01B5\x05.\x18\x02\u01B5C\x03\x02\x02\x02\u01B6\u01B7\x07\x03\x02\x02" +
		"\u01B7\u01B8\x05\x14\v\x02\u01B8\u01BA\x05V,\x02\u01B9\u01BB\x05J&\x02" +
		"\u01BA\u01B9\x03\x02\x02\x02\u01BA\u01BB\x03\x02\x02\x02\u01BBE\x03\x02" +
		"\x02\x02\u01BC\u01BD\x07\t\x02\x02\u01BD\u01BE\x05\x14\v\x02\u01BE\u01BF" +
		"\x05V,\x02\u01BFG\x03\x02\x02\x02\u01C0\u01C1\x07\r\x02\x02\u01C1\u01C2" +
		"\x05,\x17\x02\u01C2I\x03\x02\x02\x02\u01C3\u01C8\x05L\'\x02\u01C4\u01C5" +
		"\x07$\x02\x02\u01C5\u01C7\x05L\'\x02\u01C6\u01C4\x03\x02\x02\x02\u01C7" +
		"\u01CA\x03\x02\x02\x02\u01C8\u01C6\x03\x02\x02\x02\u01C8\u01C9\x03\x02" +
		"\x02\x02\u01C9K\x03\x02\x02\x02\u01CA\u01C8\x03\x02\x02\x02\u01CB\u01CC" +
		"\x050\x19\x02\u01CC\u01CD\x07#\x02\x02\u01CD\u01CE\x054\x1B\x02\u01CE" +
		"M\x03\x02\x02\x02\u01CF\u01D0\t\t\x02\x02\u01D0O\x03\x02\x02\x02\u01D1" +
		"\u01D4\x05R*\x02\u01D2\u01D4\x05T+\x02\u01D3\u01D1\x03\x02\x02\x02\u01D3" +
		"\u01D2\x03\x02\x02\x02\u01D4Q\x03\x02\x02\x02\u01D5\u01D7\t\x02\x02\x02" +
		"\u01D6\u01D5\x03\x02\x02\x02\u01D6\u01D7\x03\x02\x02\x02\u01D7\u01D8\x03" +
		"\x02\x02\x02\u01D8\u01D9\x07\x1F\x02\x02\u01D9S\x03\x02\x02\x02\u01DA" +
		"\u01DC\t\x02\x02\x02\u01DB\u01DA\x03\x02\x02\x02\u01DB\u01DC\x03\x02\x02" +
		"\x02\u01DC\u01DD\x03\x02\x02\x02\u01DD\u01DE\x07\x1E\x02\x02\u01DEU\x03" +
		"\x02\x02\x02\u01DF\u01E0\x07\x1D\x02\x02\u01E0W\x03\x02\x02\x02\u01E1" +
		"\u01E2\t\n\x02\x02\u01E2Y\x03\x02\x02\x02\u01E3\u01E4\x07\x07\x02\x02" +
		"\u01E4\u01E5\x05\\/\x02\u01E5[\x03\x02\x02\x02\u01E6\u01E7\x07A\x02\x02" +
		"\u01E7\u01E8\x05\x04\x03\x02\u01E8\u01E9\x07B\x02\x02\u01E9]\x03\x02\x02" +
		"\x02\u01EA\u01EB\x07\x11\x02\x02\u01EB\u01EF\x07`\x02\x02\u01EC\u01ED" +
		"\x07\x11\x02\x02\u01ED\u01EF\x07a\x02\x02\u01EE\u01EA\x03\x02\x02\x02" +
		"\u01EE\u01EC\x03\x02\x02\x02\u01EF_\x03\x02\x02\x02\u01F0\u01F1\x07\x05" +
		"\x02\x02\u01F1\u01F4\x05*\x16\x02\u01F2\u01F3\x07U\x02\x02\u01F3\u01F5" +
		"\x05.\x18\x02\u01F4\u01F2\x03\x02\x02\x02\u01F4\u01F5\x03\x02\x02\x02" +
		"\u01F5\u01FF\x03\x02\x02\x02\u01F6\u01F7\x07V\x02\x02\u01F7\u01FC\x05" +
		"b2\x02\u01F8\u01F9\x07$\x02\x02\u01F9\u01FB\x05b2\x02\u01FA\u01F8\x03" +
		"\x02\x02\x02\u01FB\u01FE\x03\x02\x02\x02\u01FC\u01FA\x03\x02\x02\x02\u01FC" +
		"\u01FD\x03\x02\x02\x02\u01FD\u0200\x03\x02\x02\x02\u01FE\u01FC\x03\x02" +
		"\x02\x02\u01FF\u01F6\x03\x02\x02\x02\u01FF\u0200\x03\x02\x02\x02\u0200" +
		"a\x03\x02\x02\x02\u0201\u0202\x05.\x18\x02\u0202\u0203\x07#\x02\x02\u0203" +
		"\u0205\x03\x02\x02\x02\u0204\u0201\x03\x02\x02\x02\u0204\u0205\x03\x02" +
		"\x02\x02\u0205\u0206\x03\x02\x02\x02\u0206\u0207\x05.\x18\x02\u0207c\x03" +
		"\x02\x02\x026ov\x85\x91\x9A\xA2\xA6\xAE\xB0\xB5\xBC\xC1\xC8\xCE\xD6\xD8" +
		"\xE2\xEC\xEF\xFB\u0103\u010B\u010F\u0118\u0122\u0126\u012C\u0133\u013D" +
		"\u0145\u015B\u0166\u0171\u0176\u0181\u0186\u018A\u0192\u019B\u019E\u01A6" +
		"\u01AF\u01BA\u01C8\u01D3\u01D6\u01DB\u01EE\u01F4\u01FC\u01FF\u0204";
	public static __ATN: ATN;
	public static get _ATN(): ATN {
		if (!esql_parser.__ATN) {
			esql_parser.__ATN = new ATNDeserializer().deserialize(Utils.toCharArray(esql_parser._serializedATN));
		}

		return esql_parser.__ATN;
	}

}

export class SingleStatementContext extends ParserRuleContext {
	public query(): QueryContext {
		return this.getRuleContext(0, QueryContext);
	}
	public EOF(): TerminalNode { return this.getToken(esql_parser.EOF, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_singleStatement; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterSingleStatement) {
			listener.enterSingleStatement(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitSingleStatement) {
			listener.exitSingleStatement(this);
		}
	}
}


export class QueryContext extends ParserRuleContext {
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_query; }
	public copyFrom(ctx: QueryContext): void {
		super.copyFrom(ctx);
	}
}
export class SingleCommandQueryContext extends QueryContext {
	public sourceCommand(): SourceCommandContext {
		return this.getRuleContext(0, SourceCommandContext);
	}
	constructor(ctx: QueryContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterSingleCommandQuery) {
			listener.enterSingleCommandQuery(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitSingleCommandQuery) {
			listener.exitSingleCommandQuery(this);
		}
	}
}
export class CompositeQueryContext extends QueryContext {
	public query(): QueryContext {
		return this.getRuleContext(0, QueryContext);
	}
	public PIPE(): TerminalNode { return this.getToken(esql_parser.PIPE, 0); }
	public processingCommand(): ProcessingCommandContext {
		return this.getRuleContext(0, ProcessingCommandContext);
	}
	constructor(ctx: QueryContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterCompositeQuery) {
			listener.enterCompositeQuery(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitCompositeQuery) {
			listener.exitCompositeQuery(this);
		}
	}
}


export class SourceCommandContext extends ParserRuleContext {
	public explainCommand(): ExplainCommandContext | undefined {
		return this.tryGetRuleContext(0, ExplainCommandContext);
	}
	public fromCommand(): FromCommandContext | undefined {
		return this.tryGetRuleContext(0, FromCommandContext);
	}
	public rowCommand(): RowCommandContext | undefined {
		return this.tryGetRuleContext(0, RowCommandContext);
	}
	public showCommand(): ShowCommandContext | undefined {
		return this.tryGetRuleContext(0, ShowCommandContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_sourceCommand; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterSourceCommand) {
			listener.enterSourceCommand(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitSourceCommand) {
			listener.exitSourceCommand(this);
		}
	}
}


export class ProcessingCommandContext extends ParserRuleContext {
	public evalCommand(): EvalCommandContext | undefined {
		return this.tryGetRuleContext(0, EvalCommandContext);
	}
	public inlinestatsCommand(): InlinestatsCommandContext | undefined {
		return this.tryGetRuleContext(0, InlinestatsCommandContext);
	}
	public limitCommand(): LimitCommandContext | undefined {
		return this.tryGetRuleContext(0, LimitCommandContext);
	}
	public keepCommand(): KeepCommandContext | undefined {
		return this.tryGetRuleContext(0, KeepCommandContext);
	}
	public sortCommand(): SortCommandContext | undefined {
		return this.tryGetRuleContext(0, SortCommandContext);
	}
	public statsCommand(): StatsCommandContext | undefined {
		return this.tryGetRuleContext(0, StatsCommandContext);
	}
	public whereCommand(): WhereCommandContext | undefined {
		return this.tryGetRuleContext(0, WhereCommandContext);
	}
	public dropCommand(): DropCommandContext | undefined {
		return this.tryGetRuleContext(0, DropCommandContext);
	}
	public renameCommand(): RenameCommandContext | undefined {
		return this.tryGetRuleContext(0, RenameCommandContext);
	}
	public dissectCommand(): DissectCommandContext | undefined {
		return this.tryGetRuleContext(0, DissectCommandContext);
	}
	public grokCommand(): GrokCommandContext | undefined {
		return this.tryGetRuleContext(0, GrokCommandContext);
	}
	public enrichCommand(): EnrichCommandContext | undefined {
		return this.tryGetRuleContext(0, EnrichCommandContext);
	}
	public mvExpandCommand(): MvExpandCommandContext | undefined {
		return this.tryGetRuleContext(0, MvExpandCommandContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_processingCommand; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterProcessingCommand) {
			listener.enterProcessingCommand(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitProcessingCommand) {
			listener.exitProcessingCommand(this);
		}
	}
}


export class WhereCommandContext extends ParserRuleContext {
	public WHERE(): TerminalNode { return this.getToken(esql_parser.WHERE, 0); }
	public booleanExpression(): BooleanExpressionContext {
		return this.getRuleContext(0, BooleanExpressionContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_whereCommand; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterWhereCommand) {
			listener.enterWhereCommand(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitWhereCommand) {
			listener.exitWhereCommand(this);
		}
	}
}


export class BooleanExpressionContext extends ParserRuleContext {
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_booleanExpression; }
	public copyFrom(ctx: BooleanExpressionContext): void {
		super.copyFrom(ctx);
	}
}
export class LogicalNotContext extends BooleanExpressionContext {
	public NOT(): TerminalNode { return this.getToken(esql_parser.NOT, 0); }
	public booleanExpression(): BooleanExpressionContext {
		return this.getRuleContext(0, BooleanExpressionContext);
	}
	constructor(ctx: BooleanExpressionContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterLogicalNot) {
			listener.enterLogicalNot(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitLogicalNot) {
			listener.exitLogicalNot(this);
		}
	}
}
export class BooleanDefaultContext extends BooleanExpressionContext {
	public valueExpression(): ValueExpressionContext {
		return this.getRuleContext(0, ValueExpressionContext);
	}
	constructor(ctx: BooleanExpressionContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterBooleanDefault) {
			listener.enterBooleanDefault(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitBooleanDefault) {
			listener.exitBooleanDefault(this);
		}
	}
}
export class RegexExpressionContext extends BooleanExpressionContext {
	public regexBooleanExpression(): RegexBooleanExpressionContext {
		return this.getRuleContext(0, RegexBooleanExpressionContext);
	}
	constructor(ctx: BooleanExpressionContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterRegexExpression) {
			listener.enterRegexExpression(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitRegexExpression) {
			listener.exitRegexExpression(this);
		}
	}
}
export class LogicalBinaryContext extends BooleanExpressionContext {
	public _left: BooleanExpressionContext;
	public _operator: Token;
	public _right: BooleanExpressionContext;
	public booleanExpression(): BooleanExpressionContext[];
	public booleanExpression(i: number): BooleanExpressionContext;
	public booleanExpression(i?: number): BooleanExpressionContext | BooleanExpressionContext[] {
		if (i === undefined) {
			return this.getRuleContexts(BooleanExpressionContext);
		} else {
			return this.getRuleContext(i, BooleanExpressionContext);
		}
	}
	public AND(): TerminalNode | undefined { return this.tryGetToken(esql_parser.AND, 0); }
	public OR(): TerminalNode | undefined { return this.tryGetToken(esql_parser.OR, 0); }
	constructor(ctx: BooleanExpressionContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterLogicalBinary) {
			listener.enterLogicalBinary(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitLogicalBinary) {
			listener.exitLogicalBinary(this);
		}
	}
}
export class LogicalInContext extends BooleanExpressionContext {
	public valueExpression(): ValueExpressionContext[];
	public valueExpression(i: number): ValueExpressionContext;
	public valueExpression(i?: number): ValueExpressionContext | ValueExpressionContext[] {
		if (i === undefined) {
			return this.getRuleContexts(ValueExpressionContext);
		} else {
			return this.getRuleContext(i, ValueExpressionContext);
		}
	}
	public IN(): TerminalNode { return this.getToken(esql_parser.IN, 0); }
	public LP(): TerminalNode { return this.getToken(esql_parser.LP, 0); }
	public RP(): TerminalNode { return this.getToken(esql_parser.RP, 0); }
	public NOT(): TerminalNode | undefined { return this.tryGetToken(esql_parser.NOT, 0); }
	public COMMA(): TerminalNode[];
	public COMMA(i: number): TerminalNode;
	public COMMA(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(esql_parser.COMMA);
		} else {
			return this.getToken(esql_parser.COMMA, i);
		}
	}
	constructor(ctx: BooleanExpressionContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterLogicalIn) {
			listener.enterLogicalIn(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitLogicalIn) {
			listener.exitLogicalIn(this);
		}
	}
}
export class IsNullContext extends BooleanExpressionContext {
	public valueExpression(): ValueExpressionContext {
		return this.getRuleContext(0, ValueExpressionContext);
	}
	public IS(): TerminalNode { return this.getToken(esql_parser.IS, 0); }
	public NULL(): TerminalNode { return this.getToken(esql_parser.NULL, 0); }
	public NOT(): TerminalNode | undefined { return this.tryGetToken(esql_parser.NOT, 0); }
	constructor(ctx: BooleanExpressionContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterIsNull) {
			listener.enterIsNull(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitIsNull) {
			listener.exitIsNull(this);
		}
	}
}


export class RegexBooleanExpressionContext extends ParserRuleContext {
	public _kind: Token;
	public _pattern: StringContext;
	public valueExpression(): ValueExpressionContext {
		return this.getRuleContext(0, ValueExpressionContext);
	}
	public LIKE(): TerminalNode | undefined { return this.tryGetToken(esql_parser.LIKE, 0); }
	public string(): StringContext {
		return this.getRuleContext(0, StringContext);
	}
	public NOT(): TerminalNode | undefined { return this.tryGetToken(esql_parser.NOT, 0); }
	public RLIKE(): TerminalNode | undefined { return this.tryGetToken(esql_parser.RLIKE, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_regexBooleanExpression; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterRegexBooleanExpression) {
			listener.enterRegexBooleanExpression(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitRegexBooleanExpression) {
			listener.exitRegexBooleanExpression(this);
		}
	}
}


export class ValueExpressionContext extends ParserRuleContext {
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_valueExpression; }
	public copyFrom(ctx: ValueExpressionContext): void {
		super.copyFrom(ctx);
	}
}
export class ValueExpressionDefaultContext extends ValueExpressionContext {
	public operatorExpression(): OperatorExpressionContext {
		return this.getRuleContext(0, OperatorExpressionContext);
	}
	constructor(ctx: ValueExpressionContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterValueExpressionDefault) {
			listener.enterValueExpressionDefault(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitValueExpressionDefault) {
			listener.exitValueExpressionDefault(this);
		}
	}
}
export class ComparisonContext extends ValueExpressionContext {
	public _left: OperatorExpressionContext;
	public _right: OperatorExpressionContext;
	public comparisonOperator(): ComparisonOperatorContext {
		return this.getRuleContext(0, ComparisonOperatorContext);
	}
	public operatorExpression(): OperatorExpressionContext[];
	public operatorExpression(i: number): OperatorExpressionContext;
	public operatorExpression(i?: number): OperatorExpressionContext | OperatorExpressionContext[] {
		if (i === undefined) {
			return this.getRuleContexts(OperatorExpressionContext);
		} else {
			return this.getRuleContext(i, OperatorExpressionContext);
		}
	}
	constructor(ctx: ValueExpressionContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterComparison) {
			listener.enterComparison(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitComparison) {
			listener.exitComparison(this);
		}
	}
}


export class OperatorExpressionContext extends ParserRuleContext {
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_operatorExpression; }
	public copyFrom(ctx: OperatorExpressionContext): void {
		super.copyFrom(ctx);
	}
}
export class OperatorExpressionDefaultContext extends OperatorExpressionContext {
	public primaryExpression(): PrimaryExpressionContext {
		return this.getRuleContext(0, PrimaryExpressionContext);
	}
	constructor(ctx: OperatorExpressionContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterOperatorExpressionDefault) {
			listener.enterOperatorExpressionDefault(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitOperatorExpressionDefault) {
			listener.exitOperatorExpressionDefault(this);
		}
	}
}
export class ArithmeticUnaryContext extends OperatorExpressionContext {
	public _operator: Token;
	public operatorExpression(): OperatorExpressionContext {
		return this.getRuleContext(0, OperatorExpressionContext);
	}
	public MINUS(): TerminalNode | undefined { return this.tryGetToken(esql_parser.MINUS, 0); }
	public PLUS(): TerminalNode | undefined { return this.tryGetToken(esql_parser.PLUS, 0); }
	constructor(ctx: OperatorExpressionContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterArithmeticUnary) {
			listener.enterArithmeticUnary(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitArithmeticUnary) {
			listener.exitArithmeticUnary(this);
		}
	}
}
export class ArithmeticBinaryContext extends OperatorExpressionContext {
	public _left: OperatorExpressionContext;
	public _operator: Token;
	public _right: OperatorExpressionContext;
	public operatorExpression(): OperatorExpressionContext[];
	public operatorExpression(i: number): OperatorExpressionContext;
	public operatorExpression(i?: number): OperatorExpressionContext | OperatorExpressionContext[] {
		if (i === undefined) {
			return this.getRuleContexts(OperatorExpressionContext);
		} else {
			return this.getRuleContext(i, OperatorExpressionContext);
		}
	}
	public ASTERISK(): TerminalNode | undefined { return this.tryGetToken(esql_parser.ASTERISK, 0); }
	public SLASH(): TerminalNode | undefined { return this.tryGetToken(esql_parser.SLASH, 0); }
	public PERCENT(): TerminalNode | undefined { return this.tryGetToken(esql_parser.PERCENT, 0); }
	public PLUS(): TerminalNode | undefined { return this.tryGetToken(esql_parser.PLUS, 0); }
	public MINUS(): TerminalNode | undefined { return this.tryGetToken(esql_parser.MINUS, 0); }
	constructor(ctx: OperatorExpressionContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterArithmeticBinary) {
			listener.enterArithmeticBinary(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitArithmeticBinary) {
			listener.exitArithmeticBinary(this);
		}
	}
}


export class PrimaryExpressionContext extends ParserRuleContext {
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_primaryExpression; }
	public copyFrom(ctx: PrimaryExpressionContext): void {
		super.copyFrom(ctx);
	}
}
export class ConstantDefaultContext extends PrimaryExpressionContext {
	public constant(): ConstantContext {
		return this.getRuleContext(0, ConstantContext);
	}
	constructor(ctx: PrimaryExpressionContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterConstantDefault) {
			listener.enterConstantDefault(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitConstantDefault) {
			listener.exitConstantDefault(this);
		}
	}
}
export class DereferenceContext extends PrimaryExpressionContext {
	public qualifiedName(): QualifiedNameContext {
		return this.getRuleContext(0, QualifiedNameContext);
	}
	constructor(ctx: PrimaryExpressionContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterDereference) {
			listener.enterDereference(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitDereference) {
			listener.exitDereference(this);
		}
	}
}
export class FunctionContext extends PrimaryExpressionContext {
	public functionExpression(): FunctionExpressionContext {
		return this.getRuleContext(0, FunctionExpressionContext);
	}
	constructor(ctx: PrimaryExpressionContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterFunction) {
			listener.enterFunction(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitFunction) {
			listener.exitFunction(this);
		}
	}
}
export class ParenthesizedExpressionContext extends PrimaryExpressionContext {
	public LP(): TerminalNode { return this.getToken(esql_parser.LP, 0); }
	public booleanExpression(): BooleanExpressionContext {
		return this.getRuleContext(0, BooleanExpressionContext);
	}
	public RP(): TerminalNode { return this.getToken(esql_parser.RP, 0); }
	constructor(ctx: PrimaryExpressionContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterParenthesizedExpression) {
			listener.enterParenthesizedExpression(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitParenthesizedExpression) {
			listener.exitParenthesizedExpression(this);
		}
	}
}


export class FunctionExpressionContext extends ParserRuleContext {
	public identifier(): IdentifierContext {
		return this.getRuleContext(0, IdentifierContext);
	}
	public LP(): TerminalNode { return this.getToken(esql_parser.LP, 0); }
	public RP(): TerminalNode { return this.getToken(esql_parser.RP, 0); }
	public ASTERISK(): TerminalNode | undefined { return this.tryGetToken(esql_parser.ASTERISK, 0); }
	public booleanExpression(): BooleanExpressionContext[];
	public booleanExpression(i: number): BooleanExpressionContext;
	public booleanExpression(i?: number): BooleanExpressionContext | BooleanExpressionContext[] {
		if (i === undefined) {
			return this.getRuleContexts(BooleanExpressionContext);
		} else {
			return this.getRuleContext(i, BooleanExpressionContext);
		}
	}
	public COMMA(): TerminalNode[];
	public COMMA(i: number): TerminalNode;
	public COMMA(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(esql_parser.COMMA);
		} else {
			return this.getToken(esql_parser.COMMA, i);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_functionExpression; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterFunctionExpression) {
			listener.enterFunctionExpression(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitFunctionExpression) {
			listener.exitFunctionExpression(this);
		}
	}
}


export class RowCommandContext extends ParserRuleContext {
	public ROW(): TerminalNode { return this.getToken(esql_parser.ROW, 0); }
	public fields(): FieldsContext {
		return this.getRuleContext(0, FieldsContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_rowCommand; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterRowCommand) {
			listener.enterRowCommand(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitRowCommand) {
			listener.exitRowCommand(this);
		}
	}
}


export class FieldsContext extends ParserRuleContext {
	public field(): FieldContext[];
	public field(i: number): FieldContext;
	public field(i?: number): FieldContext | FieldContext[] {
		if (i === undefined) {
			return this.getRuleContexts(FieldContext);
		} else {
			return this.getRuleContext(i, FieldContext);
		}
	}
	public COMMA(): TerminalNode[];
	public COMMA(i: number): TerminalNode;
	public COMMA(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(esql_parser.COMMA);
		} else {
			return this.getToken(esql_parser.COMMA, i);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_fields; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterFields) {
			listener.enterFields(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitFields) {
			listener.exitFields(this);
		}
	}
}


export class FieldContext extends ParserRuleContext {
	public booleanExpression(): BooleanExpressionContext {
		return this.getRuleContext(0, BooleanExpressionContext);
	}
	public qualifiedName(): QualifiedNameContext | undefined {
		return this.tryGetRuleContext(0, QualifiedNameContext);
	}
	public ASSIGN(): TerminalNode | undefined { return this.tryGetToken(esql_parser.ASSIGN, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_field; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterField) {
			listener.enterField(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitField) {
			listener.exitField(this);
		}
	}
}


export class FromCommandContext extends ParserRuleContext {
	public FROM(): TerminalNode { return this.getToken(esql_parser.FROM, 0); }
	public fromIdentifier(): FromIdentifierContext[];
	public fromIdentifier(i: number): FromIdentifierContext;
	public fromIdentifier(i?: number): FromIdentifierContext | FromIdentifierContext[] {
		if (i === undefined) {
			return this.getRuleContexts(FromIdentifierContext);
		} else {
			return this.getRuleContext(i, FromIdentifierContext);
		}
	}
	public COMMA(): TerminalNode[];
	public COMMA(i: number): TerminalNode;
	public COMMA(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(esql_parser.COMMA);
		} else {
			return this.getToken(esql_parser.COMMA, i);
		}
	}
	public metadata(): MetadataContext | undefined {
		return this.tryGetRuleContext(0, MetadataContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_fromCommand; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterFromCommand) {
			listener.enterFromCommand(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitFromCommand) {
			listener.exitFromCommand(this);
		}
	}
}


export class MetadataContext extends ParserRuleContext {
	public OPENING_BRACKET(): TerminalNode { return this.getToken(esql_parser.OPENING_BRACKET, 0); }
	public METADATA(): TerminalNode { return this.getToken(esql_parser.METADATA, 0); }
	public fromIdentifier(): FromIdentifierContext[];
	public fromIdentifier(i: number): FromIdentifierContext;
	public fromIdentifier(i?: number): FromIdentifierContext | FromIdentifierContext[] {
		if (i === undefined) {
			return this.getRuleContexts(FromIdentifierContext);
		} else {
			return this.getRuleContext(i, FromIdentifierContext);
		}
	}
	public CLOSING_BRACKET(): TerminalNode { return this.getToken(esql_parser.CLOSING_BRACKET, 0); }
	public COMMA(): TerminalNode[];
	public COMMA(i: number): TerminalNode;
	public COMMA(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(esql_parser.COMMA);
		} else {
			return this.getToken(esql_parser.COMMA, i);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_metadata; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterMetadata) {
			listener.enterMetadata(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitMetadata) {
			listener.exitMetadata(this);
		}
	}
}


export class EvalCommandContext extends ParserRuleContext {
	public EVAL(): TerminalNode { return this.getToken(esql_parser.EVAL, 0); }
	public fields(): FieldsContext {
		return this.getRuleContext(0, FieldsContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_evalCommand; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterEvalCommand) {
			listener.enterEvalCommand(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitEvalCommand) {
			listener.exitEvalCommand(this);
		}
	}
}


export class StatsCommandContext extends ParserRuleContext {
	public STATS(): TerminalNode { return this.getToken(esql_parser.STATS, 0); }
	public fields(): FieldsContext | undefined {
		return this.tryGetRuleContext(0, FieldsContext);
	}
	public BY(): TerminalNode | undefined { return this.tryGetToken(esql_parser.BY, 0); }
	public grouping(): GroupingContext | undefined {
		return this.tryGetRuleContext(0, GroupingContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_statsCommand; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterStatsCommand) {
			listener.enterStatsCommand(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitStatsCommand) {
			listener.exitStatsCommand(this);
		}
	}
}


export class InlinestatsCommandContext extends ParserRuleContext {
	public INLINESTATS(): TerminalNode { return this.getToken(esql_parser.INLINESTATS, 0); }
	public fields(): FieldsContext {
		return this.getRuleContext(0, FieldsContext);
	}
	public BY(): TerminalNode | undefined { return this.tryGetToken(esql_parser.BY, 0); }
	public grouping(): GroupingContext | undefined {
		return this.tryGetRuleContext(0, GroupingContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_inlinestatsCommand; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterInlinestatsCommand) {
			listener.enterInlinestatsCommand(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitInlinestatsCommand) {
			listener.exitInlinestatsCommand(this);
		}
	}
}


export class GroupingContext extends ParserRuleContext {
	public qualifiedName(): QualifiedNameContext[];
	public qualifiedName(i: number): QualifiedNameContext;
	public qualifiedName(i?: number): QualifiedNameContext | QualifiedNameContext[] {
		if (i === undefined) {
			return this.getRuleContexts(QualifiedNameContext);
		} else {
			return this.getRuleContext(i, QualifiedNameContext);
		}
	}
	public COMMA(): TerminalNode[];
	public COMMA(i: number): TerminalNode;
	public COMMA(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(esql_parser.COMMA);
		} else {
			return this.getToken(esql_parser.COMMA, i);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_grouping; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterGrouping) {
			listener.enterGrouping(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitGrouping) {
			listener.exitGrouping(this);
		}
	}
}


export class FromIdentifierContext extends ParserRuleContext {
	public FROM_UNQUOTED_IDENTIFIER(): TerminalNode | undefined { return this.tryGetToken(esql_parser.FROM_UNQUOTED_IDENTIFIER, 0); }
	public QUOTED_IDENTIFIER(): TerminalNode | undefined { return this.tryGetToken(esql_parser.QUOTED_IDENTIFIER, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_fromIdentifier; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterFromIdentifier) {
			listener.enterFromIdentifier(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitFromIdentifier) {
			listener.exitFromIdentifier(this);
		}
	}
}


export class QualifiedNameContext extends ParserRuleContext {
	public identifier(): IdentifierContext[];
	public identifier(i: number): IdentifierContext;
	public identifier(i?: number): IdentifierContext | IdentifierContext[] {
		if (i === undefined) {
			return this.getRuleContexts(IdentifierContext);
		} else {
			return this.getRuleContext(i, IdentifierContext);
		}
	}
	public DOT(): TerminalNode[];
	public DOT(i: number): TerminalNode;
	public DOT(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(esql_parser.DOT);
		} else {
			return this.getToken(esql_parser.DOT, i);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_qualifiedName; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterQualifiedName) {
			listener.enterQualifiedName(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitQualifiedName) {
			listener.exitQualifiedName(this);
		}
	}
}


export class QualifiedNamePatternContext extends ParserRuleContext {
	public identifierPattern(): IdentifierPatternContext[];
	public identifierPattern(i: number): IdentifierPatternContext;
	public identifierPattern(i?: number): IdentifierPatternContext | IdentifierPatternContext[] {
		if (i === undefined) {
			return this.getRuleContexts(IdentifierPatternContext);
		} else {
			return this.getRuleContext(i, IdentifierPatternContext);
		}
	}
	public DOT(): TerminalNode[];
	public DOT(i: number): TerminalNode;
	public DOT(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(esql_parser.DOT);
		} else {
			return this.getToken(esql_parser.DOT, i);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_qualifiedNamePattern; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterQualifiedNamePattern) {
			listener.enterQualifiedNamePattern(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitQualifiedNamePattern) {
			listener.exitQualifiedNamePattern(this);
		}
	}
}


export class IdentifierContext extends ParserRuleContext {
	public UNQUOTED_IDENTIFIER(): TerminalNode | undefined { return this.tryGetToken(esql_parser.UNQUOTED_IDENTIFIER, 0); }
	public QUOTED_IDENTIFIER(): TerminalNode | undefined { return this.tryGetToken(esql_parser.QUOTED_IDENTIFIER, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_identifier; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterIdentifier) {
			listener.enterIdentifier(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitIdentifier) {
			listener.exitIdentifier(this);
		}
	}
}


export class IdentifierPatternContext extends ParserRuleContext {
	public PROJECT_UNQUOTED_IDENTIFIER(): TerminalNode | undefined { return this.tryGetToken(esql_parser.PROJECT_UNQUOTED_IDENTIFIER, 0); }
	public QUOTED_IDENTIFIER(): TerminalNode | undefined { return this.tryGetToken(esql_parser.QUOTED_IDENTIFIER, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_identifierPattern; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterIdentifierPattern) {
			listener.enterIdentifierPattern(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitIdentifierPattern) {
			listener.exitIdentifierPattern(this);
		}
	}
}


export class ConstantContext extends ParserRuleContext {
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_constant; }
	public copyFrom(ctx: ConstantContext): void {
		super.copyFrom(ctx);
	}
}
export class NullLiteralContext extends ConstantContext {
	public NULL(): TerminalNode { return this.getToken(esql_parser.NULL, 0); }
	constructor(ctx: ConstantContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterNullLiteral) {
			listener.enterNullLiteral(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitNullLiteral) {
			listener.exitNullLiteral(this);
		}
	}
}
export class QualifiedIntegerLiteralContext extends ConstantContext {
	public integerValue(): IntegerValueContext {
		return this.getRuleContext(0, IntegerValueContext);
	}
	public UNQUOTED_IDENTIFIER(): TerminalNode { return this.getToken(esql_parser.UNQUOTED_IDENTIFIER, 0); }
	constructor(ctx: ConstantContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterQualifiedIntegerLiteral) {
			listener.enterQualifiedIntegerLiteral(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitQualifiedIntegerLiteral) {
			listener.exitQualifiedIntegerLiteral(this);
		}
	}
}
export class DecimalLiteralContext extends ConstantContext {
	public decimalValue(): DecimalValueContext {
		return this.getRuleContext(0, DecimalValueContext);
	}
	constructor(ctx: ConstantContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterDecimalLiteral) {
			listener.enterDecimalLiteral(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitDecimalLiteral) {
			listener.exitDecimalLiteral(this);
		}
	}
}
export class IntegerLiteralContext extends ConstantContext {
	public integerValue(): IntegerValueContext {
		return this.getRuleContext(0, IntegerValueContext);
	}
	constructor(ctx: ConstantContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterIntegerLiteral) {
			listener.enterIntegerLiteral(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitIntegerLiteral) {
			listener.exitIntegerLiteral(this);
		}
	}
}
export class BooleanLiteralContext extends ConstantContext {
	public booleanValue(): BooleanValueContext {
		return this.getRuleContext(0, BooleanValueContext);
	}
	constructor(ctx: ConstantContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterBooleanLiteral) {
			listener.enterBooleanLiteral(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitBooleanLiteral) {
			listener.exitBooleanLiteral(this);
		}
	}
}
export class InputParamContext extends ConstantContext {
	public PARAM(): TerminalNode { return this.getToken(esql_parser.PARAM, 0); }
	constructor(ctx: ConstantContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterInputParam) {
			listener.enterInputParam(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitInputParam) {
			listener.exitInputParam(this);
		}
	}
}
export class StringLiteralContext extends ConstantContext {
	public string(): StringContext {
		return this.getRuleContext(0, StringContext);
	}
	constructor(ctx: ConstantContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterStringLiteral) {
			listener.enterStringLiteral(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitStringLiteral) {
			listener.exitStringLiteral(this);
		}
	}
}
export class NumericArrayLiteralContext extends ConstantContext {
	public OPENING_BRACKET(): TerminalNode { return this.getToken(esql_parser.OPENING_BRACKET, 0); }
	public numericValue(): NumericValueContext[];
	public numericValue(i: number): NumericValueContext;
	public numericValue(i?: number): NumericValueContext | NumericValueContext[] {
		if (i === undefined) {
			return this.getRuleContexts(NumericValueContext);
		} else {
			return this.getRuleContext(i, NumericValueContext);
		}
	}
	public CLOSING_BRACKET(): TerminalNode { return this.getToken(esql_parser.CLOSING_BRACKET, 0); }
	public COMMA(): TerminalNode[];
	public COMMA(i: number): TerminalNode;
	public COMMA(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(esql_parser.COMMA);
		} else {
			return this.getToken(esql_parser.COMMA, i);
		}
	}
	constructor(ctx: ConstantContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterNumericArrayLiteral) {
			listener.enterNumericArrayLiteral(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitNumericArrayLiteral) {
			listener.exitNumericArrayLiteral(this);
		}
	}
}
export class BooleanArrayLiteralContext extends ConstantContext {
	public OPENING_BRACKET(): TerminalNode { return this.getToken(esql_parser.OPENING_BRACKET, 0); }
	public booleanValue(): BooleanValueContext[];
	public booleanValue(i: number): BooleanValueContext;
	public booleanValue(i?: number): BooleanValueContext | BooleanValueContext[] {
		if (i === undefined) {
			return this.getRuleContexts(BooleanValueContext);
		} else {
			return this.getRuleContext(i, BooleanValueContext);
		}
	}
	public CLOSING_BRACKET(): TerminalNode { return this.getToken(esql_parser.CLOSING_BRACKET, 0); }
	public COMMA(): TerminalNode[];
	public COMMA(i: number): TerminalNode;
	public COMMA(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(esql_parser.COMMA);
		} else {
			return this.getToken(esql_parser.COMMA, i);
		}
	}
	constructor(ctx: ConstantContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterBooleanArrayLiteral) {
			listener.enterBooleanArrayLiteral(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitBooleanArrayLiteral) {
			listener.exitBooleanArrayLiteral(this);
		}
	}
}
export class StringArrayLiteralContext extends ConstantContext {
	public OPENING_BRACKET(): TerminalNode { return this.getToken(esql_parser.OPENING_BRACKET, 0); }
	public string(): StringContext[];
	public string(i: number): StringContext;
	public string(i?: number): StringContext | StringContext[] {
		if (i === undefined) {
			return this.getRuleContexts(StringContext);
		} else {
			return this.getRuleContext(i, StringContext);
		}
	}
	public CLOSING_BRACKET(): TerminalNode { return this.getToken(esql_parser.CLOSING_BRACKET, 0); }
	public COMMA(): TerminalNode[];
	public COMMA(i: number): TerminalNode;
	public COMMA(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(esql_parser.COMMA);
		} else {
			return this.getToken(esql_parser.COMMA, i);
		}
	}
	constructor(ctx: ConstantContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterStringArrayLiteral) {
			listener.enterStringArrayLiteral(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitStringArrayLiteral) {
			listener.exitStringArrayLiteral(this);
		}
	}
}


export class LimitCommandContext extends ParserRuleContext {
	public LIMIT(): TerminalNode { return this.getToken(esql_parser.LIMIT, 0); }
	public INTEGER_LITERAL(): TerminalNode { return this.getToken(esql_parser.INTEGER_LITERAL, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_limitCommand; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterLimitCommand) {
			listener.enterLimitCommand(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitLimitCommand) {
			listener.exitLimitCommand(this);
		}
	}
}


export class SortCommandContext extends ParserRuleContext {
	public SORT(): TerminalNode { return this.getToken(esql_parser.SORT, 0); }
	public orderExpression(): OrderExpressionContext[];
	public orderExpression(i: number): OrderExpressionContext;
	public orderExpression(i?: number): OrderExpressionContext | OrderExpressionContext[] {
		if (i === undefined) {
			return this.getRuleContexts(OrderExpressionContext);
		} else {
			return this.getRuleContext(i, OrderExpressionContext);
		}
	}
	public COMMA(): TerminalNode[];
	public COMMA(i: number): TerminalNode;
	public COMMA(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(esql_parser.COMMA);
		} else {
			return this.getToken(esql_parser.COMMA, i);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_sortCommand; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterSortCommand) {
			listener.enterSortCommand(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitSortCommand) {
			listener.exitSortCommand(this);
		}
	}
}


export class OrderExpressionContext extends ParserRuleContext {
	public _ordering: Token;
	public _nullOrdering: Token;
	public booleanExpression(): BooleanExpressionContext {
		return this.getRuleContext(0, BooleanExpressionContext);
	}
	public NULLS(): TerminalNode | undefined { return this.tryGetToken(esql_parser.NULLS, 0); }
	public ASC(): TerminalNode | undefined { return this.tryGetToken(esql_parser.ASC, 0); }
	public DESC(): TerminalNode | undefined { return this.tryGetToken(esql_parser.DESC, 0); }
	public FIRST(): TerminalNode | undefined { return this.tryGetToken(esql_parser.FIRST, 0); }
	public LAST(): TerminalNode | undefined { return this.tryGetToken(esql_parser.LAST, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_orderExpression; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterOrderExpression) {
			listener.enterOrderExpression(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitOrderExpression) {
			listener.exitOrderExpression(this);
		}
	}
}


export class KeepCommandContext extends ParserRuleContext {
	public KEEP(): TerminalNode | undefined { return this.tryGetToken(esql_parser.KEEP, 0); }
	public qualifiedNamePattern(): QualifiedNamePatternContext[];
	public qualifiedNamePattern(i: number): QualifiedNamePatternContext;
	public qualifiedNamePattern(i?: number): QualifiedNamePatternContext | QualifiedNamePatternContext[] {
		if (i === undefined) {
			return this.getRuleContexts(QualifiedNamePatternContext);
		} else {
			return this.getRuleContext(i, QualifiedNamePatternContext);
		}
	}
	public COMMA(): TerminalNode[];
	public COMMA(i: number): TerminalNode;
	public COMMA(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(esql_parser.COMMA);
		} else {
			return this.getToken(esql_parser.COMMA, i);
		}
	}
	public PROJECT(): TerminalNode | undefined { return this.tryGetToken(esql_parser.PROJECT, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_keepCommand; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterKeepCommand) {
			listener.enterKeepCommand(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitKeepCommand) {
			listener.exitKeepCommand(this);
		}
	}
}


export class DropCommandContext extends ParserRuleContext {
	public DROP(): TerminalNode { return this.getToken(esql_parser.DROP, 0); }
	public qualifiedNamePattern(): QualifiedNamePatternContext[];
	public qualifiedNamePattern(i: number): QualifiedNamePatternContext;
	public qualifiedNamePattern(i?: number): QualifiedNamePatternContext | QualifiedNamePatternContext[] {
		if (i === undefined) {
			return this.getRuleContexts(QualifiedNamePatternContext);
		} else {
			return this.getRuleContext(i, QualifiedNamePatternContext);
		}
	}
	public COMMA(): TerminalNode[];
	public COMMA(i: number): TerminalNode;
	public COMMA(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(esql_parser.COMMA);
		} else {
			return this.getToken(esql_parser.COMMA, i);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_dropCommand; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterDropCommand) {
			listener.enterDropCommand(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitDropCommand) {
			listener.exitDropCommand(this);
		}
	}
}


export class RenameCommandContext extends ParserRuleContext {
	public RENAME(): TerminalNode { return this.getToken(esql_parser.RENAME, 0); }
	public renameClause(): RenameClauseContext[];
	public renameClause(i: number): RenameClauseContext;
	public renameClause(i?: number): RenameClauseContext | RenameClauseContext[] {
		if (i === undefined) {
			return this.getRuleContexts(RenameClauseContext);
		} else {
			return this.getRuleContext(i, RenameClauseContext);
		}
	}
	public COMMA(): TerminalNode[];
	public COMMA(i: number): TerminalNode;
	public COMMA(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(esql_parser.COMMA);
		} else {
			return this.getToken(esql_parser.COMMA, i);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_renameCommand; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterRenameCommand) {
			listener.enterRenameCommand(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitRenameCommand) {
			listener.exitRenameCommand(this);
		}
	}
}


export class RenameClauseContext extends ParserRuleContext {
	public _oldName: QualifiedNamePatternContext;
	public _newName: QualifiedNamePatternContext;
	public AS(): TerminalNode { return this.getToken(esql_parser.AS, 0); }
	public qualifiedNamePattern(): QualifiedNamePatternContext[];
	public qualifiedNamePattern(i: number): QualifiedNamePatternContext;
	public qualifiedNamePattern(i?: number): QualifiedNamePatternContext | QualifiedNamePatternContext[] {
		if (i === undefined) {
			return this.getRuleContexts(QualifiedNamePatternContext);
		} else {
			return this.getRuleContext(i, QualifiedNamePatternContext);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_renameClause; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterRenameClause) {
			listener.enterRenameClause(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitRenameClause) {
			listener.exitRenameClause(this);
		}
	}
}


export class DissectCommandContext extends ParserRuleContext {
	public DISSECT(): TerminalNode { return this.getToken(esql_parser.DISSECT, 0); }
	public primaryExpression(): PrimaryExpressionContext {
		return this.getRuleContext(0, PrimaryExpressionContext);
	}
	public string(): StringContext {
		return this.getRuleContext(0, StringContext);
	}
	public commandOptions(): CommandOptionsContext | undefined {
		return this.tryGetRuleContext(0, CommandOptionsContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_dissectCommand; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterDissectCommand) {
			listener.enterDissectCommand(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitDissectCommand) {
			listener.exitDissectCommand(this);
		}
	}
}


export class GrokCommandContext extends ParserRuleContext {
	public GROK(): TerminalNode { return this.getToken(esql_parser.GROK, 0); }
	public primaryExpression(): PrimaryExpressionContext {
		return this.getRuleContext(0, PrimaryExpressionContext);
	}
	public string(): StringContext {
		return this.getRuleContext(0, StringContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_grokCommand; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterGrokCommand) {
			listener.enterGrokCommand(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitGrokCommand) {
			listener.exitGrokCommand(this);
		}
	}
}


export class MvExpandCommandContext extends ParserRuleContext {
	public MV_EXPAND(): TerminalNode { return this.getToken(esql_parser.MV_EXPAND, 0); }
	public qualifiedName(): QualifiedNameContext {
		return this.getRuleContext(0, QualifiedNameContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_mvExpandCommand; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterMvExpandCommand) {
			listener.enterMvExpandCommand(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitMvExpandCommand) {
			listener.exitMvExpandCommand(this);
		}
	}
}


export class CommandOptionsContext extends ParserRuleContext {
	public commandOption(): CommandOptionContext[];
	public commandOption(i: number): CommandOptionContext;
	public commandOption(i?: number): CommandOptionContext | CommandOptionContext[] {
		if (i === undefined) {
			return this.getRuleContexts(CommandOptionContext);
		} else {
			return this.getRuleContext(i, CommandOptionContext);
		}
	}
	public COMMA(): TerminalNode[];
	public COMMA(i: number): TerminalNode;
	public COMMA(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(esql_parser.COMMA);
		} else {
			return this.getToken(esql_parser.COMMA, i);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_commandOptions; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterCommandOptions) {
			listener.enterCommandOptions(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitCommandOptions) {
			listener.exitCommandOptions(this);
		}
	}
}


export class CommandOptionContext extends ParserRuleContext {
	public identifier(): IdentifierContext {
		return this.getRuleContext(0, IdentifierContext);
	}
	public ASSIGN(): TerminalNode { return this.getToken(esql_parser.ASSIGN, 0); }
	public constant(): ConstantContext {
		return this.getRuleContext(0, ConstantContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_commandOption; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterCommandOption) {
			listener.enterCommandOption(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitCommandOption) {
			listener.exitCommandOption(this);
		}
	}
}


export class BooleanValueContext extends ParserRuleContext {
	public TRUE(): TerminalNode | undefined { return this.tryGetToken(esql_parser.TRUE, 0); }
	public FALSE(): TerminalNode | undefined { return this.tryGetToken(esql_parser.FALSE, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_booleanValue; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterBooleanValue) {
			listener.enterBooleanValue(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitBooleanValue) {
			listener.exitBooleanValue(this);
		}
	}
}


export class NumericValueContext extends ParserRuleContext {
	public decimalValue(): DecimalValueContext | undefined {
		return this.tryGetRuleContext(0, DecimalValueContext);
	}
	public integerValue(): IntegerValueContext | undefined {
		return this.tryGetRuleContext(0, IntegerValueContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_numericValue; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterNumericValue) {
			listener.enterNumericValue(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitNumericValue) {
			listener.exitNumericValue(this);
		}
	}
}


export class DecimalValueContext extends ParserRuleContext {
	public DECIMAL_LITERAL(): TerminalNode { return this.getToken(esql_parser.DECIMAL_LITERAL, 0); }
	public PLUS(): TerminalNode | undefined { return this.tryGetToken(esql_parser.PLUS, 0); }
	public MINUS(): TerminalNode | undefined { return this.tryGetToken(esql_parser.MINUS, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_decimalValue; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterDecimalValue) {
			listener.enterDecimalValue(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitDecimalValue) {
			listener.exitDecimalValue(this);
		}
	}
}


export class IntegerValueContext extends ParserRuleContext {
	public INTEGER_LITERAL(): TerminalNode { return this.getToken(esql_parser.INTEGER_LITERAL, 0); }
	public PLUS(): TerminalNode | undefined { return this.tryGetToken(esql_parser.PLUS, 0); }
	public MINUS(): TerminalNode | undefined { return this.tryGetToken(esql_parser.MINUS, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_integerValue; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterIntegerValue) {
			listener.enterIntegerValue(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitIntegerValue) {
			listener.exitIntegerValue(this);
		}
	}
}


export class StringContext extends ParserRuleContext {
	public STRING(): TerminalNode { return this.getToken(esql_parser.STRING, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_string; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterString) {
			listener.enterString(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitString) {
			listener.exitString(this);
		}
	}
}


export class ComparisonOperatorContext extends ParserRuleContext {
	public EQ(): TerminalNode | undefined { return this.tryGetToken(esql_parser.EQ, 0); }
	public NEQ(): TerminalNode | undefined { return this.tryGetToken(esql_parser.NEQ, 0); }
	public LT(): TerminalNode | undefined { return this.tryGetToken(esql_parser.LT, 0); }
	public LTE(): TerminalNode | undefined { return this.tryGetToken(esql_parser.LTE, 0); }
	public GT(): TerminalNode | undefined { return this.tryGetToken(esql_parser.GT, 0); }
	public GTE(): TerminalNode | undefined { return this.tryGetToken(esql_parser.GTE, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_comparisonOperator; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterComparisonOperator) {
			listener.enterComparisonOperator(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitComparisonOperator) {
			listener.exitComparisonOperator(this);
		}
	}
}


export class ExplainCommandContext extends ParserRuleContext {
	public EXPLAIN(): TerminalNode { return this.getToken(esql_parser.EXPLAIN, 0); }
	public subqueryExpression(): SubqueryExpressionContext {
		return this.getRuleContext(0, SubqueryExpressionContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_explainCommand; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterExplainCommand) {
			listener.enterExplainCommand(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitExplainCommand) {
			listener.exitExplainCommand(this);
		}
	}
}


export class SubqueryExpressionContext extends ParserRuleContext {
	public OPENING_BRACKET(): TerminalNode { return this.getToken(esql_parser.OPENING_BRACKET, 0); }
	public query(): QueryContext {
		return this.getRuleContext(0, QueryContext);
	}
	public CLOSING_BRACKET(): TerminalNode { return this.getToken(esql_parser.CLOSING_BRACKET, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_subqueryExpression; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterSubqueryExpression) {
			listener.enterSubqueryExpression(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitSubqueryExpression) {
			listener.exitSubqueryExpression(this);
		}
	}
}


export class ShowCommandContext extends ParserRuleContext {
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_showCommand; }
	public copyFrom(ctx: ShowCommandContext): void {
		super.copyFrom(ctx);
	}
}
export class ShowInfoContext extends ShowCommandContext {
	public SHOW(): TerminalNode { return this.getToken(esql_parser.SHOW, 0); }
	public INFO(): TerminalNode { return this.getToken(esql_parser.INFO, 0); }
	constructor(ctx: ShowCommandContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterShowInfo) {
			listener.enterShowInfo(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitShowInfo) {
			listener.exitShowInfo(this);
		}
	}
}
export class ShowFunctionsContext extends ShowCommandContext {
	public SHOW(): TerminalNode { return this.getToken(esql_parser.SHOW, 0); }
	public FUNCTIONS(): TerminalNode { return this.getToken(esql_parser.FUNCTIONS, 0); }
	constructor(ctx: ShowCommandContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterShowFunctions) {
			listener.enterShowFunctions(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitShowFunctions) {
			listener.exitShowFunctions(this);
		}
	}
}


export class EnrichCommandContext extends ParserRuleContext {
	public _policyName: FromIdentifierContext;
	public _matchField: QualifiedNamePatternContext;
	public ENRICH(): TerminalNode { return this.getToken(esql_parser.ENRICH, 0); }
	public fromIdentifier(): FromIdentifierContext {
		return this.getRuleContext(0, FromIdentifierContext);
	}
	public ON(): TerminalNode | undefined { return this.tryGetToken(esql_parser.ON, 0); }
	public WITH(): TerminalNode | undefined { return this.tryGetToken(esql_parser.WITH, 0); }
	public enrichWithClause(): EnrichWithClauseContext[];
	public enrichWithClause(i: number): EnrichWithClauseContext;
	public enrichWithClause(i?: number): EnrichWithClauseContext | EnrichWithClauseContext[] {
		if (i === undefined) {
			return this.getRuleContexts(EnrichWithClauseContext);
		} else {
			return this.getRuleContext(i, EnrichWithClauseContext);
		}
	}
	public qualifiedNamePattern(): QualifiedNamePatternContext | undefined {
		return this.tryGetRuleContext(0, QualifiedNamePatternContext);
	}
	public COMMA(): TerminalNode[];
	public COMMA(i: number): TerminalNode;
	public COMMA(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(esql_parser.COMMA);
		} else {
			return this.getToken(esql_parser.COMMA, i);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_enrichCommand; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterEnrichCommand) {
			listener.enterEnrichCommand(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitEnrichCommand) {
			listener.exitEnrichCommand(this);
		}
	}
}


export class EnrichWithClauseContext extends ParserRuleContext {
	public _newName: QualifiedNamePatternContext;
	public _enrichField: QualifiedNamePatternContext;
	public qualifiedNamePattern(): QualifiedNamePatternContext[];
	public qualifiedNamePattern(i: number): QualifiedNamePatternContext;
	public qualifiedNamePattern(i?: number): QualifiedNamePatternContext | QualifiedNamePatternContext[] {
		if (i === undefined) {
			return this.getRuleContexts(QualifiedNamePatternContext);
		} else {
			return this.getRuleContext(i, QualifiedNamePatternContext);
		}
	}
	public ASSIGN(): TerminalNode | undefined { return this.tryGetToken(esql_parser.ASSIGN, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_enrichWithClause; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterEnrichWithClause) {
			listener.enterEnrichWithClause(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitEnrichWithClause) {
			listener.exitEnrichWithClause(this);
		}
	}
}


