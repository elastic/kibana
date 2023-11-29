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
	public static readonly FROM = 5;
	public static readonly GROK = 6;
	public static readonly KEEP = 7;
	public static readonly LIMIT = 8;
	public static readonly MV_EXPAND = 9;
	public static readonly PROJECT = 10;
	public static readonly RENAME = 11;
	public static readonly ROW = 12;
	public static readonly SHOW = 13;
	public static readonly SORT = 14;
	public static readonly STATS = 15;
	public static readonly WHERE = 16;
	public static readonly UNKNOWN_CMD = 17;
	public static readonly LINE_COMMENT = 18;
	public static readonly MULTILINE_COMMENT = 19;
	public static readonly WS = 20;
	public static readonly PIPE = 21;
	public static readonly STRING = 22;
	public static readonly INTEGER_LITERAL = 23;
	public static readonly DECIMAL_LITERAL = 24;
	public static readonly BY = 25;
	public static readonly AND = 26;
	public static readonly ASC = 27;
	public static readonly ASSIGN = 28;
	public static readonly COMMA = 29;
	public static readonly DESC = 30;
	public static readonly DOT = 31;
	public static readonly FALSE = 32;
	public static readonly FIRST = 33;
	public static readonly LAST = 34;
	public static readonly LP = 35;
	public static readonly IN = 36;
	public static readonly IS = 37;
	public static readonly LIKE = 38;
	public static readonly NOT = 39;
	public static readonly NULL = 40;
	public static readonly NULLS = 41;
	public static readonly OR = 42;
	public static readonly PARAM = 43;
	public static readonly RLIKE = 44;
	public static readonly RP = 45;
	public static readonly TRUE = 46;
	public static readonly INFO = 47;
	public static readonly FUNCTIONS = 48;
	public static readonly UNDERSCORE = 49;
	public static readonly EQ = 50;
	public static readonly NEQ = 51;
	public static readonly LT = 52;
	public static readonly LTE = 53;
	public static readonly GT = 54;
	public static readonly GTE = 55;
	public static readonly PLUS = 56;
	public static readonly MINUS = 57;
	public static readonly ASTERISK = 58;
	public static readonly SLASH = 59;
	public static readonly PERCENT = 60;
	public static readonly OPENING_BRACKET = 61;
	public static readonly CLOSING_BRACKET = 62;
	public static readonly UNQUOTED_IDENTIFIER = 63;
	public static readonly QUOTED_IDENTIFIER = 64;
	public static readonly EXPR_LINE_COMMENT = 65;
	public static readonly EXPR_MULTILINE_COMMENT = 66;
	public static readonly EXPR_WS = 67;
	public static readonly AS = 68;
	public static readonly METADATA = 69;
	public static readonly ON = 70;
	public static readonly WITH = 71;
	public static readonly SRC_UNQUOTED_IDENTIFIER = 72;
	public static readonly SRC_QUOTED_IDENTIFIER = 73;
	public static readonly SRC_LINE_COMMENT = 74;
	public static readonly SRC_MULTILINE_COMMENT = 75;
	public static readonly SRC_WS = 76;
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
	public static readonly RULE_grouping = 18;
	public static readonly RULE_sourceIdentifier = 19;
	public static readonly RULE_qualifiedName = 20;
	public static readonly RULE_identifier = 21;
	public static readonly RULE_constant = 22;
	public static readonly RULE_limitCommand = 23;
	public static readonly RULE_sortCommand = 24;
	public static readonly RULE_orderExpression = 25;
	public static readonly RULE_keepCommand = 26;
	public static readonly RULE_dropCommand = 27;
	public static readonly RULE_renameCommand = 28;
	public static readonly RULE_renameClause = 29;
	public static readonly RULE_dissectCommand = 30;
	public static readonly RULE_grokCommand = 31;
	public static readonly RULE_mvExpandCommand = 32;
	public static readonly RULE_commandOptions = 33;
	public static readonly RULE_commandOption = 34;
	public static readonly RULE_booleanValue = 35;
	public static readonly RULE_numericValue = 36;
	public static readonly RULE_decimalValue = 37;
	public static readonly RULE_integerValue = 38;
	public static readonly RULE_string = 39;
	public static readonly RULE_comparisonOperator = 40;
	public static readonly RULE_showCommand = 41;
	public static readonly RULE_enrichCommand = 42;
	public static readonly RULE_enrichWithClause = 43;
	// tslint:disable:no-trailing-whitespace
	public static readonly ruleNames: string[] = [
		"singleStatement", "query", "sourceCommand", "processingCommand", "whereCommand", 
		"booleanExpression", "regexBooleanExpression", "valueExpression", "operatorExpression", 
		"primaryExpression", "functionExpression", "rowCommand", "fields", "field", 
		"fromCommand", "metadata", "evalCommand", "statsCommand", "grouping", 
		"sourceIdentifier", "qualifiedName", "identifier", "constant", "limitCommand", 
		"sortCommand", "orderExpression", "keepCommand", "dropCommand", "renameCommand", 
		"renameClause", "dissectCommand", "grokCommand", "mvExpandCommand", "commandOptions", 
		"commandOption", "booleanValue", "numericValue", "decimalValue", "integerValue", 
		"string", "comparisonOperator", "showCommand", "enrichCommand", "enrichWithClause",
	];

	private static readonly _LITERAL_NAMES: Array<string | undefined> = [
		undefined, undefined, undefined, undefined, undefined, undefined, undefined, 
		undefined, undefined, undefined, undefined, undefined, undefined, undefined, 
		undefined, undefined, undefined, undefined, undefined, undefined, undefined, 
		undefined, undefined, undefined, undefined, undefined, undefined, undefined, 
		undefined, undefined, undefined, "'.'", undefined, undefined, undefined, 
		"'('", undefined, undefined, undefined, undefined, undefined, undefined, 
		undefined, "'?'", undefined, "')'", undefined, undefined, undefined, "'_'", 
		"'=='", "'!='", "'<'", "'<='", "'>'", "'>='", "'+'", "'-'", "'*'", "'/'", 
		"'%'", undefined, "']'",
	];
	private static readonly _SYMBOLIC_NAMES: Array<string | undefined> = [
		undefined, "DISSECT", "DROP", "ENRICH", "EVAL", "FROM", "GROK", "KEEP", 
		"LIMIT", "MV_EXPAND", "PROJECT", "RENAME", "ROW", "SHOW", "SORT", "STATS", 
		"WHERE", "UNKNOWN_CMD", "LINE_COMMENT", "MULTILINE_COMMENT", "WS", "PIPE", 
		"STRING", "INTEGER_LITERAL", "DECIMAL_LITERAL", "BY", "AND", "ASC", "ASSIGN", 
		"COMMA", "DESC", "DOT", "FALSE", "FIRST", "LAST", "LP", "IN", "IS", "LIKE", 
		"NOT", "NULL", "NULLS", "OR", "PARAM", "RLIKE", "RP", "TRUE", "INFO", 
		"FUNCTIONS", "UNDERSCORE", "EQ", "NEQ", "LT", "LTE", "GT", "GTE", "PLUS", 
		"MINUS", "ASTERISK", "SLASH", "PERCENT", "OPENING_BRACKET", "CLOSING_BRACKET", 
		"UNQUOTED_IDENTIFIER", "QUOTED_IDENTIFIER", "EXPR_LINE_COMMENT", "EXPR_MULTILINE_COMMENT", 
		"EXPR_WS", "AS", "METADATA", "ON", "WITH", "SRC_UNQUOTED_IDENTIFIER", 
		"SRC_QUOTED_IDENTIFIER", "SRC_LINE_COMMENT", "SRC_MULTILINE_COMMENT", 
		"SRC_WS",
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
			this.state = 88;
			this.query(0);
			this.state = 89;
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

			this.state = 92;
			this.sourceCommand();
			}
			this._ctx._stop = this._input.tryLT(-1);
			this.state = 99;
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
					this.state = 94;
					if (!(this.precpred(this._ctx, 1))) {
						throw new FailedPredicateException(this, "this.precpred(this._ctx, 1)");
					}
					this.state = 95;
					this.match(esql_parser.PIPE);
					this.state = 96;
					this.processingCommand();
					}
					}
				}
				this.state = 101;
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
			this.state = 105;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case esql_parser.FROM:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 102;
				this.fromCommand();
				}
				break;
			case esql_parser.ROW:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 103;
				this.rowCommand();
				}
				break;
			case esql_parser.SHOW:
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 104;
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
			this.state = 119;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case esql_parser.EVAL:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 107;
				this.evalCommand();
				}
				break;
			case esql_parser.LIMIT:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 108;
				this.limitCommand();
				}
				break;
			case esql_parser.KEEP:
			case esql_parser.PROJECT:
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 109;
				this.keepCommand();
				}
				break;
			case esql_parser.SORT:
				this.enterOuterAlt(_localctx, 4);
				{
				this.state = 110;
				this.sortCommand();
				}
				break;
			case esql_parser.STATS:
				this.enterOuterAlt(_localctx, 5);
				{
				this.state = 111;
				this.statsCommand();
				}
				break;
			case esql_parser.WHERE:
				this.enterOuterAlt(_localctx, 6);
				{
				this.state = 112;
				this.whereCommand();
				}
				break;
			case esql_parser.DROP:
				this.enterOuterAlt(_localctx, 7);
				{
				this.state = 113;
				this.dropCommand();
				}
				break;
			case esql_parser.RENAME:
				this.enterOuterAlt(_localctx, 8);
				{
				this.state = 114;
				this.renameCommand();
				}
				break;
			case esql_parser.DISSECT:
				this.enterOuterAlt(_localctx, 9);
				{
				this.state = 115;
				this.dissectCommand();
				}
				break;
			case esql_parser.GROK:
				this.enterOuterAlt(_localctx, 10);
				{
				this.state = 116;
				this.grokCommand();
				}
				break;
			case esql_parser.ENRICH:
				this.enterOuterAlt(_localctx, 11);
				{
				this.state = 117;
				this.enrichCommand();
				}
				break;
			case esql_parser.MV_EXPAND:
				this.enterOuterAlt(_localctx, 12);
				{
				this.state = 118;
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
			this.state = 121;
			this.match(esql_parser.WHERE);
			this.state = 122;
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
			this.state = 152;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 6, this._ctx) ) {
			case 1:
				{
				_localctx = new LogicalNotContext(_localctx);
				this._ctx = _localctx;
				_prevctx = _localctx;

				this.state = 125;
				this.match(esql_parser.NOT);
				this.state = 126;
				this.booleanExpression(7);
				}
				break;

			case 2:
				{
				_localctx = new BooleanDefaultContext(_localctx);
				this._ctx = _localctx;
				_prevctx = _localctx;
				this.state = 127;
				this.valueExpression();
				}
				break;

			case 3:
				{
				_localctx = new RegexExpressionContext(_localctx);
				this._ctx = _localctx;
				_prevctx = _localctx;
				this.state = 128;
				this.regexBooleanExpression();
				}
				break;

			case 4:
				{
				_localctx = new LogicalInContext(_localctx);
				this._ctx = _localctx;
				_prevctx = _localctx;
				this.state = 129;
				this.valueExpression();
				this.state = 131;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la === esql_parser.NOT) {
					{
					this.state = 130;
					this.match(esql_parser.NOT);
					}
				}

				this.state = 133;
				this.match(esql_parser.IN);
				this.state = 134;
				this.match(esql_parser.LP);
				this.state = 135;
				this.valueExpression();
				this.state = 140;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la === esql_parser.COMMA) {
					{
					{
					this.state = 136;
					this.match(esql_parser.COMMA);
					this.state = 137;
					this.valueExpression();
					}
					}
					this.state = 142;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 143;
				this.match(esql_parser.RP);
				}
				break;

			case 5:
				{
				_localctx = new IsNullContext(_localctx);
				this._ctx = _localctx;
				_prevctx = _localctx;
				this.state = 145;
				this.valueExpression();
				this.state = 146;
				this.match(esql_parser.IS);
				this.state = 148;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la === esql_parser.NOT) {
					{
					this.state = 147;
					this.match(esql_parser.NOT);
					}
				}

				this.state = 150;
				this.match(esql_parser.NULL);
				}
				break;
			}
			this._ctx._stop = this._input.tryLT(-1);
			this.state = 162;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 8, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					if (this._parseListeners != null) {
						this.triggerExitRuleEvent();
					}
					_prevctx = _localctx;
					{
					this.state = 160;
					this._errHandler.sync(this);
					switch ( this.interpreter.adaptivePredict(this._input, 7, this._ctx) ) {
					case 1:
						{
						_localctx = new LogicalBinaryContext(new BooleanExpressionContext(_parentctx, _parentState));
						(_localctx as LogicalBinaryContext)._left = _prevctx;
						this.pushNewRecursionContext(_localctx, _startState, esql_parser.RULE_booleanExpression);
						this.state = 154;
						if (!(this.precpred(this._ctx, 4))) {
							throw new FailedPredicateException(this, "this.precpred(this._ctx, 4)");
						}
						this.state = 155;
						(_localctx as LogicalBinaryContext)._operator = this.match(esql_parser.AND);
						this.state = 156;
						(_localctx as LogicalBinaryContext)._right = this.booleanExpression(5);
						}
						break;

					case 2:
						{
						_localctx = new LogicalBinaryContext(new BooleanExpressionContext(_parentctx, _parentState));
						(_localctx as LogicalBinaryContext)._left = _prevctx;
						this.pushNewRecursionContext(_localctx, _startState, esql_parser.RULE_booleanExpression);
						this.state = 157;
						if (!(this.precpred(this._ctx, 3))) {
							throw new FailedPredicateException(this, "this.precpred(this._ctx, 3)");
						}
						this.state = 158;
						(_localctx as LogicalBinaryContext)._operator = this.match(esql_parser.OR);
						this.state = 159;
						(_localctx as LogicalBinaryContext)._right = this.booleanExpression(4);
						}
						break;
					}
					}
				}
				this.state = 164;
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
			this.state = 179;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 11, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 165;
				this.valueExpression();
				this.state = 167;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la === esql_parser.NOT) {
					{
					this.state = 166;
					this.match(esql_parser.NOT);
					}
				}

				this.state = 169;
				_localctx._kind = this.match(esql_parser.LIKE);
				this.state = 170;
				_localctx._pattern = this.string();
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 172;
				this.valueExpression();
				this.state = 174;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la === esql_parser.NOT) {
					{
					this.state = 173;
					this.match(esql_parser.NOT);
					}
				}

				this.state = 176;
				_localctx._kind = this.match(esql_parser.RLIKE);
				this.state = 177;
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
			this.state = 186;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 12, this._ctx) ) {
			case 1:
				_localctx = new ValueExpressionDefaultContext(_localctx);
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 181;
				this.operatorExpression(0);
				}
				break;

			case 2:
				_localctx = new ComparisonContext(_localctx);
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 182;
				(_localctx as ComparisonContext)._left = this.operatorExpression(0);
				this.state = 183;
				this.comparisonOperator();
				this.state = 184;
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
			this.state = 192;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 13, this._ctx) ) {
			case 1:
				{
				_localctx = new OperatorExpressionDefaultContext(_localctx);
				this._ctx = _localctx;
				_prevctx = _localctx;

				this.state = 189;
				this.primaryExpression();
				}
				break;

			case 2:
				{
				_localctx = new ArithmeticUnaryContext(_localctx);
				this._ctx = _localctx;
				_prevctx = _localctx;
				this.state = 190;
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
				this.state = 191;
				this.operatorExpression(3);
				}
				break;
			}
			this._ctx._stop = this._input.tryLT(-1);
			this.state = 202;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 15, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					if (this._parseListeners != null) {
						this.triggerExitRuleEvent();
					}
					_prevctx = _localctx;
					{
					this.state = 200;
					this._errHandler.sync(this);
					switch ( this.interpreter.adaptivePredict(this._input, 14, this._ctx) ) {
					case 1:
						{
						_localctx = new ArithmeticBinaryContext(new OperatorExpressionContext(_parentctx, _parentState));
						(_localctx as ArithmeticBinaryContext)._left = _prevctx;
						this.pushNewRecursionContext(_localctx, _startState, esql_parser.RULE_operatorExpression);
						this.state = 194;
						if (!(this.precpred(this._ctx, 2))) {
							throw new FailedPredicateException(this, "this.precpred(this._ctx, 2)");
						}
						this.state = 195;
						(_localctx as ArithmeticBinaryContext)._operator = this._input.LT(1);
						_la = this._input.LA(1);
						if (!(((((_la - 58)) & ~0x1F) === 0 && ((1 << (_la - 58)) & ((1 << (esql_parser.ASTERISK - 58)) | (1 << (esql_parser.SLASH - 58)) | (1 << (esql_parser.PERCENT - 58)))) !== 0))) {
							(_localctx as ArithmeticBinaryContext)._operator = this._errHandler.recoverInline(this);
						} else {
							if (this._input.LA(1) === Token.EOF) {
								this.matchedEOF = true;
							}

							this._errHandler.reportMatch(this);
							this.consume();
						}
						this.state = 196;
						(_localctx as ArithmeticBinaryContext)._right = this.operatorExpression(3);
						}
						break;

					case 2:
						{
						_localctx = new ArithmeticBinaryContext(new OperatorExpressionContext(_parentctx, _parentState));
						(_localctx as ArithmeticBinaryContext)._left = _prevctx;
						this.pushNewRecursionContext(_localctx, _startState, esql_parser.RULE_operatorExpression);
						this.state = 197;
						if (!(this.precpred(this._ctx, 1))) {
							throw new FailedPredicateException(this, "this.precpred(this._ctx, 1)");
						}
						this.state = 198;
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
						this.state = 199;
						(_localctx as ArithmeticBinaryContext)._right = this.operatorExpression(2);
						}
						break;
					}
					}
				}
				this.state = 204;
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
			this.state = 212;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 16, this._ctx) ) {
			case 1:
				_localctx = new ConstantDefaultContext(_localctx);
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 205;
				this.constant();
				}
				break;

			case 2:
				_localctx = new DereferenceContext(_localctx);
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 206;
				this.qualifiedName();
				}
				break;

			case 3:
				_localctx = new FunctionContext(_localctx);
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 207;
				this.functionExpression();
				}
				break;

			case 4:
				_localctx = new ParenthesizedExpressionContext(_localctx);
				this.enterOuterAlt(_localctx, 4);
				{
				this.state = 208;
				this.match(esql_parser.LP);
				this.state = 209;
				this.booleanExpression(0);
				this.state = 210;
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
			this.state = 214;
			this.identifier();
			this.state = 215;
			this.match(esql_parser.LP);
			this.state = 225;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case esql_parser.ASTERISK:
				{
				this.state = 216;
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
				this.state = 217;
				this.booleanExpression(0);
				this.state = 222;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la === esql_parser.COMMA) {
					{
					{
					this.state = 218;
					this.match(esql_parser.COMMA);
					this.state = 219;
					this.booleanExpression(0);
					}
					}
					this.state = 224;
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
			this.state = 227;
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
			this.state = 229;
			this.match(esql_parser.ROW);
			this.state = 230;
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
			this.state = 232;
			this.field();
			this.state = 237;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 19, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 233;
					this.match(esql_parser.COMMA);
					this.state = 234;
					this.field();
					}
					}
				}
				this.state = 239;
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
			this.state = 245;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 20, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 240;
				this.booleanExpression(0);
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 241;
				this.qualifiedName();
				this.state = 242;
				this.match(esql_parser.ASSIGN);
				this.state = 243;
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
			this.state = 247;
			this.match(esql_parser.FROM);
			this.state = 248;
			this.sourceIdentifier();
			this.state = 253;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 21, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 249;
					this.match(esql_parser.COMMA);
					this.state = 250;
					this.sourceIdentifier();
					}
					}
				}
				this.state = 255;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 21, this._ctx);
			}
			this.state = 257;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 22, this._ctx) ) {
			case 1:
				{
				this.state = 256;
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
			this.state = 259;
			this.match(esql_parser.OPENING_BRACKET);
			this.state = 260;
			this.match(esql_parser.METADATA);
			this.state = 261;
			this.sourceIdentifier();
			this.state = 266;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la === esql_parser.COMMA) {
				{
				{
				this.state = 262;
				this.match(esql_parser.COMMA);
				this.state = 263;
				this.sourceIdentifier();
				}
				}
				this.state = 268;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			this.state = 269;
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
			this.state = 271;
			this.match(esql_parser.EVAL);
			this.state = 272;
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
			this.state = 274;
			this.match(esql_parser.STATS);
			this.state = 276;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 24, this._ctx) ) {
			case 1:
				{
				this.state = 275;
				this.fields();
				}
				break;
			}
			this.state = 280;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 25, this._ctx) ) {
			case 1:
				{
				this.state = 278;
				this.match(esql_parser.BY);
				this.state = 279;
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
		this.enterRule(_localctx, 36, esql_parser.RULE_grouping);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 282;
			this.qualifiedName();
			this.state = 287;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 26, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 283;
					this.match(esql_parser.COMMA);
					this.state = 284;
					this.qualifiedName();
					}
					}
				}
				this.state = 289;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 26, this._ctx);
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
	public sourceIdentifier(): SourceIdentifierContext {
		let _localctx: SourceIdentifierContext = new SourceIdentifierContext(this._ctx, this.state);
		this.enterRule(_localctx, 38, esql_parser.RULE_sourceIdentifier);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 290;
			_la = this._input.LA(1);
			if (!(_la === esql_parser.SRC_UNQUOTED_IDENTIFIER || _la === esql_parser.SRC_QUOTED_IDENTIFIER)) {
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
		this.enterRule(_localctx, 40, esql_parser.RULE_qualifiedName);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 292;
			this.identifier();
			this.state = 297;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 27, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 293;
					this.match(esql_parser.DOT);
					this.state = 294;
					this.identifier();
					}
					}
				}
				this.state = 299;
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
	public identifier(): IdentifierContext {
		let _localctx: IdentifierContext = new IdentifierContext(this._ctx, this.state);
		this.enterRule(_localctx, 42, esql_parser.RULE_identifier);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 300;
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
	public constant(): ConstantContext {
		let _localctx: ConstantContext = new ConstantContext(this._ctx, this.state);
		this.enterRule(_localctx, 44, esql_parser.RULE_constant);
		let _la: number;
		try {
			this.state = 344;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 31, this._ctx) ) {
			case 1:
				_localctx = new NullLiteralContext(_localctx);
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 302;
				this.match(esql_parser.NULL);
				}
				break;

			case 2:
				_localctx = new QualifiedIntegerLiteralContext(_localctx);
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 303;
				this.integerValue();
				this.state = 304;
				this.match(esql_parser.UNQUOTED_IDENTIFIER);
				}
				break;

			case 3:
				_localctx = new DecimalLiteralContext(_localctx);
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 306;
				this.decimalValue();
				}
				break;

			case 4:
				_localctx = new IntegerLiteralContext(_localctx);
				this.enterOuterAlt(_localctx, 4);
				{
				this.state = 307;
				this.integerValue();
				}
				break;

			case 5:
				_localctx = new BooleanLiteralContext(_localctx);
				this.enterOuterAlt(_localctx, 5);
				{
				this.state = 308;
				this.booleanValue();
				}
				break;

			case 6:
				_localctx = new InputParamContext(_localctx);
				this.enterOuterAlt(_localctx, 6);
				{
				this.state = 309;
				this.match(esql_parser.PARAM);
				}
				break;

			case 7:
				_localctx = new StringLiteralContext(_localctx);
				this.enterOuterAlt(_localctx, 7);
				{
				this.state = 310;
				this.string();
				}
				break;

			case 8:
				_localctx = new NumericArrayLiteralContext(_localctx);
				this.enterOuterAlt(_localctx, 8);
				{
				this.state = 311;
				this.match(esql_parser.OPENING_BRACKET);
				this.state = 312;
				this.numericValue();
				this.state = 317;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la === esql_parser.COMMA) {
					{
					{
					this.state = 313;
					this.match(esql_parser.COMMA);
					this.state = 314;
					this.numericValue();
					}
					}
					this.state = 319;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 320;
				this.match(esql_parser.CLOSING_BRACKET);
				}
				break;

			case 9:
				_localctx = new BooleanArrayLiteralContext(_localctx);
				this.enterOuterAlt(_localctx, 9);
				{
				this.state = 322;
				this.match(esql_parser.OPENING_BRACKET);
				this.state = 323;
				this.booleanValue();
				this.state = 328;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la === esql_parser.COMMA) {
					{
					{
					this.state = 324;
					this.match(esql_parser.COMMA);
					this.state = 325;
					this.booleanValue();
					}
					}
					this.state = 330;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 331;
				this.match(esql_parser.CLOSING_BRACKET);
				}
				break;

			case 10:
				_localctx = new StringArrayLiteralContext(_localctx);
				this.enterOuterAlt(_localctx, 10);
				{
				this.state = 333;
				this.match(esql_parser.OPENING_BRACKET);
				this.state = 334;
				this.string();
				this.state = 339;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la === esql_parser.COMMA) {
					{
					{
					this.state = 335;
					this.match(esql_parser.COMMA);
					this.state = 336;
					this.string();
					}
					}
					this.state = 341;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 342;
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
		this.enterRule(_localctx, 46, esql_parser.RULE_limitCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 346;
			this.match(esql_parser.LIMIT);
			this.state = 347;
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
		this.enterRule(_localctx, 48, esql_parser.RULE_sortCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 349;
			this.match(esql_parser.SORT);
			this.state = 350;
			this.orderExpression();
			this.state = 355;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 32, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 351;
					this.match(esql_parser.COMMA);
					this.state = 352;
					this.orderExpression();
					}
					}
				}
				this.state = 357;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 32, this._ctx);
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
		this.enterRule(_localctx, 50, esql_parser.RULE_orderExpression);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 358;
			this.booleanExpression(0);
			this.state = 360;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 33, this._ctx) ) {
			case 1:
				{
				this.state = 359;
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
			this.state = 364;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 34, this._ctx) ) {
			case 1:
				{
				this.state = 362;
				this.match(esql_parser.NULLS);
				this.state = 363;
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
		this.enterRule(_localctx, 52, esql_parser.RULE_keepCommand);
		try {
			let _alt: number;
			this.state = 384;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case esql_parser.KEEP:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 366;
				this.match(esql_parser.KEEP);
				this.state = 367;
				this.sourceIdentifier();
				this.state = 372;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 35, this._ctx);
				while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
					if (_alt === 1) {
						{
						{
						this.state = 368;
						this.match(esql_parser.COMMA);
						this.state = 369;
						this.sourceIdentifier();
						}
						}
					}
					this.state = 374;
					this._errHandler.sync(this);
					_alt = this.interpreter.adaptivePredict(this._input, 35, this._ctx);
				}
				}
				break;
			case esql_parser.PROJECT:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 375;
				this.match(esql_parser.PROJECT);
				this.state = 376;
				this.sourceIdentifier();
				this.state = 381;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 36, this._ctx);
				while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
					if (_alt === 1) {
						{
						{
						this.state = 377;
						this.match(esql_parser.COMMA);
						this.state = 378;
						this.sourceIdentifier();
						}
						}
					}
					this.state = 383;
					this._errHandler.sync(this);
					_alt = this.interpreter.adaptivePredict(this._input, 36, this._ctx);
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
		this.enterRule(_localctx, 54, esql_parser.RULE_dropCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 386;
			this.match(esql_parser.DROP);
			this.state = 387;
			this.sourceIdentifier();
			this.state = 392;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 38, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 388;
					this.match(esql_parser.COMMA);
					this.state = 389;
					this.sourceIdentifier();
					}
					}
				}
				this.state = 394;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 38, this._ctx);
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
		this.enterRule(_localctx, 56, esql_parser.RULE_renameCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 395;
			this.match(esql_parser.RENAME);
			this.state = 396;
			this.renameClause();
			this.state = 401;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 39, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 397;
					this.match(esql_parser.COMMA);
					this.state = 398;
					this.renameClause();
					}
					}
				}
				this.state = 403;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 39, this._ctx);
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
		this.enterRule(_localctx, 58, esql_parser.RULE_renameClause);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 404;
			_localctx._oldName = this.sourceIdentifier();
			this.state = 405;
			this.match(esql_parser.AS);
			this.state = 406;
			_localctx._newName = this.sourceIdentifier();
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
		this.enterRule(_localctx, 60, esql_parser.RULE_dissectCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 408;
			this.match(esql_parser.DISSECT);
			this.state = 409;
			this.primaryExpression();
			this.state = 410;
			this.string();
			this.state = 412;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 40, this._ctx) ) {
			case 1:
				{
				this.state = 411;
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
		this.enterRule(_localctx, 62, esql_parser.RULE_grokCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 414;
			this.match(esql_parser.GROK);
			this.state = 415;
			this.primaryExpression();
			this.state = 416;
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
		this.enterRule(_localctx, 64, esql_parser.RULE_mvExpandCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 418;
			this.match(esql_parser.MV_EXPAND);
			this.state = 419;
			this.sourceIdentifier();
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
		this.enterRule(_localctx, 66, esql_parser.RULE_commandOptions);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 421;
			this.commandOption();
			this.state = 426;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 41, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 422;
					this.match(esql_parser.COMMA);
					this.state = 423;
					this.commandOption();
					}
					}
				}
				this.state = 428;
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
	public commandOption(): CommandOptionContext {
		let _localctx: CommandOptionContext = new CommandOptionContext(this._ctx, this.state);
		this.enterRule(_localctx, 68, esql_parser.RULE_commandOption);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 429;
			this.identifier();
			this.state = 430;
			this.match(esql_parser.ASSIGN);
			this.state = 431;
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
		this.enterRule(_localctx, 70, esql_parser.RULE_booleanValue);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 433;
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
		this.enterRule(_localctx, 72, esql_parser.RULE_numericValue);
		try {
			this.state = 437;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 42, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 435;
				this.decimalValue();
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 436;
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
		this.enterRule(_localctx, 74, esql_parser.RULE_decimalValue);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 440;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la === esql_parser.PLUS || _la === esql_parser.MINUS) {
				{
				this.state = 439;
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

			this.state = 442;
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
		this.enterRule(_localctx, 76, esql_parser.RULE_integerValue);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 445;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la === esql_parser.PLUS || _la === esql_parser.MINUS) {
				{
				this.state = 444;
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

			this.state = 447;
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
		this.enterRule(_localctx, 78, esql_parser.RULE_string);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 449;
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
		this.enterRule(_localctx, 80, esql_parser.RULE_comparisonOperator);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 451;
			_la = this._input.LA(1);
			if (!(((((_la - 50)) & ~0x1F) === 0 && ((1 << (_la - 50)) & ((1 << (esql_parser.EQ - 50)) | (1 << (esql_parser.NEQ - 50)) | (1 << (esql_parser.LT - 50)) | (1 << (esql_parser.LTE - 50)) | (1 << (esql_parser.GT - 50)) | (1 << (esql_parser.GTE - 50)))) !== 0))) {
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
	public showCommand(): ShowCommandContext {
		let _localctx: ShowCommandContext = new ShowCommandContext(this._ctx, this.state);
		this.enterRule(_localctx, 82, esql_parser.RULE_showCommand);
		try {
			this.state = 457;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 45, this._ctx) ) {
			case 1:
				_localctx = new ShowInfoContext(_localctx);
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 453;
				this.match(esql_parser.SHOW);
				this.state = 454;
				this.match(esql_parser.INFO);
				}
				break;

			case 2:
				_localctx = new ShowFunctionsContext(_localctx);
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 455;
				this.match(esql_parser.SHOW);
				this.state = 456;
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
		this.enterRule(_localctx, 84, esql_parser.RULE_enrichCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 459;
			this.match(esql_parser.ENRICH);
			this.state = 460;
			_localctx._policyName = this.sourceIdentifier();
			this.state = 463;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 46, this._ctx) ) {
			case 1:
				{
				this.state = 461;
				this.match(esql_parser.ON);
				this.state = 462;
				_localctx._matchField = this.sourceIdentifier();
				}
				break;
			}
			this.state = 474;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 48, this._ctx) ) {
			case 1:
				{
				this.state = 465;
				this.match(esql_parser.WITH);
				this.state = 466;
				this.enrichWithClause();
				this.state = 471;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 47, this._ctx);
				while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
					if (_alt === 1) {
						{
						{
						this.state = 467;
						this.match(esql_parser.COMMA);
						this.state = 468;
						this.enrichWithClause();
						}
						}
					}
					this.state = 473;
					this._errHandler.sync(this);
					_alt = this.interpreter.adaptivePredict(this._input, 47, this._ctx);
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
		this.enterRule(_localctx, 86, esql_parser.RULE_enrichWithClause);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 479;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 49, this._ctx) ) {
			case 1:
				{
				this.state = 476;
				_localctx._newName = this.sourceIdentifier();
				this.state = 477;
				this.match(esql_parser.ASSIGN);
				}
				break;
			}
			this.state = 481;
			_localctx._enrichField = this.sourceIdentifier();
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
		"\x03\uC91D\uCABA\u058D\uAFBA\u4F53\u0607\uEA8B\uC241\x03N\u01E6\x04\x02" +
		"\t\x02\x04\x03\t\x03\x04\x04\t\x04\x04\x05\t\x05\x04\x06\t\x06\x04\x07" +
		"\t\x07\x04\b\t\b\x04\t\t\t\x04\n\t\n\x04\v\t\v\x04\f\t\f\x04\r\t\r\x04" +
		"\x0E\t\x0E\x04\x0F\t\x0F\x04\x10\t\x10\x04\x11\t\x11\x04\x12\t\x12\x04" +
		"\x13\t\x13\x04\x14\t\x14\x04\x15\t\x15\x04\x16\t\x16\x04\x17\t\x17\x04" +
		"\x18\t\x18\x04\x19\t\x19\x04\x1A\t\x1A\x04\x1B\t\x1B\x04\x1C\t\x1C\x04" +
		"\x1D\t\x1D\x04\x1E\t\x1E\x04\x1F\t\x1F\x04 \t \x04!\t!\x04\"\t\"\x04#" +
		"\t#\x04$\t$\x04%\t%\x04&\t&\x04\'\t\'\x04(\t(\x04)\t)\x04*\t*\x04+\t+" +
		"\x04,\t,\x04-\t-\x03\x02\x03\x02\x03\x02\x03\x03\x03\x03\x03\x03\x03\x03" +
		"\x03\x03\x03\x03\x07\x03d\n\x03\f\x03\x0E\x03g\v\x03\x03\x04\x03\x04\x03" +
		"\x04\x05\x04l\n\x04\x03\x05\x03\x05\x03\x05\x03\x05\x03\x05\x03\x05\x03" +
		"\x05\x03\x05\x03\x05\x03\x05\x03\x05\x03\x05\x05\x05z\n\x05\x03\x06\x03" +
		"\x06\x03\x06\x03\x07\x03\x07\x03\x07\x03\x07\x03\x07\x03\x07\x03\x07\x05" +
		"\x07\x86\n\x07\x03\x07\x03\x07\x03\x07\x03\x07\x03\x07\x07\x07\x8D\n\x07" +
		"\f\x07\x0E\x07\x90\v\x07\x03\x07\x03\x07\x03\x07\x03\x07\x03\x07\x05\x07" +
		"\x97\n\x07\x03\x07\x03\x07\x05\x07\x9B\n\x07\x03\x07\x03\x07\x03\x07\x03" +
		"\x07\x03\x07\x03\x07\x07\x07\xA3\n\x07\f\x07\x0E\x07\xA6\v\x07\x03\b\x03" +
		"\b\x05\b\xAA\n\b\x03\b\x03\b\x03\b\x03\b\x03\b\x05\b\xB1\n\b\x03\b\x03" +
		"\b\x03\b\x05\b\xB6\n\b\x03\t\x03\t\x03\t\x03\t\x03\t\x05\t\xBD\n\t\x03" +
		"\n\x03\n\x03\n\x03\n\x05\n\xC3\n\n\x03\n\x03\n\x03\n\x03\n\x03\n\x03\n" +
		"\x07\n\xCB\n\n\f\n\x0E\n\xCE\v\n\x03\v\x03\v\x03\v\x03\v\x03\v\x03\v\x03" +
		"\v\x05\v\xD7\n\v\x03\f\x03\f\x03\f\x03\f\x03\f\x03\f\x07\f\xDF\n\f\f\f" +
		"\x0E\f\xE2\v\f\x05\f\xE4\n\f\x03\f\x03\f\x03\r\x03\r\x03\r\x03\x0E\x03" +
		"\x0E\x03\x0E\x07\x0E\xEE\n\x0E\f\x0E\x0E\x0E\xF1\v\x0E\x03\x0F\x03\x0F" +
		"\x03\x0F\x03\x0F\x03\x0F\x05\x0F\xF8\n\x0F\x03\x10\x03\x10\x03\x10\x03" +
		"\x10\x07\x10\xFE\n\x10\f\x10\x0E\x10\u0101\v\x10\x03\x10\x05\x10\u0104" +
		"\n\x10\x03\x11\x03\x11\x03\x11\x03\x11\x03\x11\x07\x11\u010B\n\x11\f\x11" +
		"\x0E\x11\u010E\v\x11\x03\x11\x03\x11\x03\x12\x03\x12\x03\x12\x03\x13\x03" +
		"\x13\x05\x13\u0117\n\x13\x03\x13\x03\x13\x05\x13\u011B\n\x13\x03\x14\x03" +
		"\x14\x03\x14\x07\x14\u0120\n\x14\f\x14\x0E\x14\u0123\v\x14\x03\x15\x03" +
		"\x15\x03\x16\x03\x16\x03\x16\x07\x16\u012A\n\x16\f\x16\x0E\x16\u012D\v" +
		"\x16\x03\x17\x03\x17\x03\x18\x03\x18\x03\x18\x03\x18\x03\x18\x03\x18\x03" +
		"\x18\x03\x18\x03\x18\x03\x18\x03\x18\x03\x18\x03\x18\x07\x18\u013E\n\x18" +
		"\f\x18\x0E\x18\u0141\v\x18\x03\x18\x03\x18\x03\x18\x03\x18\x03\x18\x03" +
		"\x18\x07\x18\u0149\n\x18\f\x18\x0E\x18\u014C\v\x18\x03\x18\x03\x18\x03" +
		"\x18\x03\x18\x03\x18\x03\x18\x07\x18\u0154\n\x18\f\x18\x0E\x18\u0157\v" +
		"\x18\x03\x18\x03\x18\x05\x18\u015B\n\x18\x03\x19\x03\x19\x03\x19\x03\x1A" +
		"\x03\x1A\x03\x1A\x03\x1A\x07\x1A\u0164\n\x1A\f\x1A\x0E\x1A\u0167\v\x1A" +
		"\x03\x1B\x03\x1B\x05\x1B\u016B\n\x1B\x03\x1B\x03\x1B\x05\x1B\u016F\n\x1B" +
		"\x03\x1C\x03\x1C\x03\x1C\x03\x1C\x07\x1C\u0175\n\x1C\f\x1C\x0E\x1C\u0178" +
		"\v\x1C\x03\x1C\x03\x1C\x03\x1C\x03\x1C\x07\x1C\u017E\n\x1C\f\x1C\x0E\x1C" +
		"\u0181\v\x1C\x05\x1C\u0183\n\x1C\x03\x1D\x03\x1D\x03\x1D\x03\x1D\x07\x1D" +
		"\u0189\n\x1D\f\x1D\x0E\x1D\u018C\v\x1D\x03\x1E\x03\x1E\x03\x1E\x03\x1E" +
		"\x07\x1E\u0192\n\x1E\f\x1E\x0E\x1E\u0195\v\x1E\x03\x1F\x03\x1F\x03\x1F" +
		"\x03\x1F\x03 \x03 \x03 \x03 \x05 \u019F\n \x03!\x03!\x03!\x03!\x03\"\x03" +
		"\"\x03\"\x03#\x03#\x03#\x07#\u01AB\n#\f#\x0E#\u01AE\v#\x03$\x03$\x03$" +
		"\x03$\x03%\x03%\x03&\x03&\x05&\u01B8\n&\x03\'\x05\'\u01BB\n\'\x03\'\x03" +
		"\'\x03(\x05(\u01C0\n(\x03(\x03(\x03)\x03)\x03*\x03*\x03+\x03+\x03+\x03" +
		"+\x05+\u01CC\n+\x03,\x03,\x03,\x03,\x05,\u01D2\n,\x03,\x03,\x03,\x03," +
		"\x07,\u01D8\n,\f,\x0E,\u01DB\v,\x05,\u01DD\n,\x03-\x03-\x03-\x05-\u01E2" +
		"\n-\x03-\x03-\x03-\x02\x02\x05\x04\f\x12.\x02\x02\x04\x02\x06\x02\b\x02" +
		"\n\x02\f\x02\x0E\x02\x10\x02\x12\x02\x14\x02\x16\x02\x18\x02\x1A\x02\x1C" +
		"\x02\x1E\x02 \x02\"\x02$\x02&\x02(\x02*\x02,\x02.\x020\x022\x024\x026" +
		"\x028\x02:\x02<\x02>\x02@\x02B\x02D\x02F\x02H\x02J\x02L\x02N\x02P\x02" +
		"R\x02T\x02V\x02X\x02\x02\n\x03\x02:;\x03\x02<>\x03\x02JK\x03\x02AB\x04" +
		"\x02\x1D\x1D  \x03\x02#$\x04\x02\"\"00\x03\x0249\x02\u0204\x02Z\x03\x02" +
		"\x02\x02\x04]\x03\x02\x02\x02\x06k\x03\x02\x02\x02\by\x03\x02\x02\x02" +
		"\n{\x03\x02\x02\x02\f\x9A\x03\x02\x02\x02\x0E\xB5\x03\x02\x02\x02\x10" +
		"\xBC\x03\x02\x02\x02\x12\xC2\x03\x02\x02\x02\x14\xD6\x03\x02\x02\x02\x16" +
		"\xD8\x03\x02\x02\x02\x18\xE7\x03\x02\x02\x02\x1A\xEA\x03\x02\x02\x02\x1C" +
		"\xF7\x03\x02\x02\x02\x1E\xF9\x03\x02\x02\x02 \u0105\x03\x02\x02\x02\"" +
		"\u0111\x03\x02\x02\x02$\u0114\x03\x02\x02\x02&\u011C\x03\x02\x02\x02(" +
		"\u0124\x03\x02\x02\x02*\u0126\x03\x02\x02\x02,\u012E\x03\x02\x02\x02." +
		"\u015A\x03\x02\x02\x020\u015C\x03\x02\x02\x022\u015F\x03\x02\x02\x024" +
		"\u0168\x03\x02\x02\x026\u0182\x03\x02\x02\x028\u0184\x03\x02\x02\x02:" +
		"\u018D\x03\x02\x02\x02<\u0196\x03\x02\x02\x02>\u019A\x03\x02\x02\x02@" +
		"\u01A0\x03\x02\x02\x02B\u01A4\x03\x02\x02\x02D\u01A7\x03\x02\x02\x02F" +
		"\u01AF\x03\x02\x02\x02H\u01B3\x03\x02\x02\x02J\u01B7\x03\x02\x02\x02L" +
		"\u01BA\x03\x02\x02\x02N\u01BF\x03\x02\x02\x02P\u01C3\x03\x02\x02\x02R" +
		"\u01C5\x03\x02\x02\x02T\u01CB\x03\x02\x02\x02V\u01CD\x03\x02\x02\x02X" +
		"\u01E1\x03\x02\x02\x02Z[\x05\x04\x03\x02[\\\x07\x02\x02\x03\\\x03\x03" +
		"\x02\x02\x02]^\b\x03\x01\x02^_\x05\x06\x04\x02_e\x03\x02\x02\x02`a\f\x03" +
		"\x02\x02ab\x07\x17\x02\x02bd\x05\b\x05\x02c`\x03\x02\x02\x02dg\x03\x02" +
		"\x02\x02ec\x03\x02\x02\x02ef\x03\x02\x02\x02f\x05\x03\x02\x02\x02ge\x03" +
		"\x02\x02\x02hl\x05\x1E\x10\x02il\x05\x18\r\x02jl\x05T+\x02kh\x03\x02\x02" +
		"\x02ki\x03\x02\x02\x02kj\x03\x02\x02\x02l\x07\x03\x02\x02\x02mz\x05\"" +
		"\x12\x02nz\x050\x19\x02oz\x056\x1C\x02pz\x052\x1A\x02qz\x05$\x13\x02r" +
		"z\x05\n\x06\x02sz\x058\x1D\x02tz\x05:\x1E\x02uz\x05> \x02vz\x05@!\x02" +
		"wz\x05V,\x02xz\x05B\"\x02ym\x03\x02\x02\x02yn\x03\x02\x02\x02yo\x03\x02" +
		"\x02\x02yp\x03\x02\x02\x02yq\x03\x02\x02\x02yr\x03\x02\x02\x02ys\x03\x02" +
		"\x02\x02yt\x03\x02\x02\x02yu\x03\x02\x02\x02yv\x03\x02\x02\x02yw\x03\x02" +
		"\x02\x02yx\x03\x02\x02\x02z\t\x03\x02\x02\x02{|\x07\x12\x02\x02|}\x05" +
		"\f\x07\x02}\v\x03\x02\x02\x02~\x7F\b\x07\x01\x02\x7F\x80\x07)\x02\x02" +
		"\x80\x9B\x05\f\x07\t\x81\x9B\x05\x10\t\x02\x82\x9B\x05\x0E\b\x02\x83\x85" +
		"\x05\x10\t\x02\x84\x86\x07)\x02\x02\x85\x84\x03\x02\x02\x02\x85\x86\x03" +
		"\x02\x02\x02\x86\x87\x03\x02\x02\x02\x87\x88\x07&\x02\x02\x88\x89\x07" +
		"%\x02\x02\x89\x8E\x05\x10\t\x02\x8A\x8B\x07\x1F\x02\x02\x8B\x8D\x05\x10" +
		"\t\x02\x8C\x8A\x03\x02\x02\x02\x8D\x90\x03\x02\x02\x02\x8E\x8C\x03\x02" +
		"\x02\x02\x8E\x8F\x03\x02\x02\x02\x8F\x91\x03\x02\x02\x02\x90\x8E\x03\x02" +
		"\x02\x02\x91\x92\x07/\x02\x02\x92\x9B\x03\x02\x02\x02\x93\x94\x05\x10" +
		"\t\x02\x94\x96\x07\'\x02\x02\x95\x97\x07)\x02\x02\x96\x95\x03\x02\x02" +
		"\x02\x96\x97\x03\x02\x02\x02\x97\x98\x03\x02\x02\x02\x98\x99\x07*\x02" +
		"\x02\x99\x9B\x03\x02\x02\x02\x9A~\x03\x02\x02\x02\x9A\x81\x03\x02\x02" +
		"\x02\x9A\x82\x03\x02\x02\x02\x9A\x83\x03\x02\x02\x02\x9A\x93\x03\x02\x02" +
		"\x02\x9B\xA4\x03\x02\x02\x02\x9C\x9D\f\x06\x02\x02\x9D\x9E\x07\x1C\x02" +
		"\x02\x9E\xA3\x05\f\x07\x07\x9F\xA0\f\x05\x02\x02\xA0\xA1\x07,\x02\x02" +
		"\xA1\xA3\x05\f\x07\x06\xA2\x9C\x03\x02\x02\x02\xA2\x9F\x03\x02\x02\x02" +
		"\xA3\xA6\x03\x02\x02\x02\xA4\xA2\x03\x02\x02\x02\xA4\xA5\x03\x02\x02\x02" +
		"\xA5\r\x03\x02\x02\x02\xA6\xA4\x03\x02\x02\x02\xA7\xA9\x05\x10\t\x02\xA8" +
		"\xAA\x07)\x02\x02\xA9\xA8\x03\x02\x02\x02\xA9\xAA\x03\x02\x02\x02\xAA" +
		"\xAB\x03\x02\x02\x02\xAB\xAC\x07(\x02\x02\xAC\xAD\x05P)\x02\xAD\xB6\x03" +
		"\x02\x02\x02\xAE\xB0\x05\x10\t\x02\xAF\xB1\x07)\x02\x02\xB0\xAF\x03\x02" +
		"\x02\x02\xB0\xB1\x03\x02\x02\x02\xB1\xB2\x03\x02\x02\x02\xB2\xB3\x07." +
		"\x02\x02\xB3\xB4\x05P)\x02\xB4\xB6\x03\x02\x02\x02\xB5\xA7\x03\x02\x02" +
		"\x02\xB5\xAE\x03\x02\x02\x02\xB6\x0F\x03\x02\x02\x02\xB7\xBD\x05\x12\n" +
		"\x02\xB8\xB9\x05\x12\n\x02\xB9\xBA\x05R*\x02\xBA\xBB\x05\x12\n\x02\xBB" +
		"\xBD\x03\x02\x02\x02\xBC\xB7\x03\x02\x02\x02\xBC\xB8\x03\x02\x02\x02\xBD" +
		"\x11\x03\x02\x02\x02\xBE\xBF\b\n\x01\x02\xBF\xC3\x05\x14\v\x02\xC0\xC1" +
		"\t\x02\x02\x02\xC1\xC3\x05\x12\n\x05\xC2\xBE\x03\x02\x02\x02\xC2\xC0\x03" +
		"\x02\x02\x02\xC3\xCC\x03\x02\x02\x02\xC4\xC5\f\x04\x02\x02\xC5\xC6\t\x03" +
		"\x02\x02\xC6\xCB\x05\x12\n\x05\xC7\xC8\f\x03\x02\x02\xC8\xC9\t\x02\x02" +
		"\x02\xC9\xCB\x05\x12\n\x04\xCA\xC4\x03\x02\x02\x02\xCA\xC7\x03\x02\x02" +
		"\x02\xCB\xCE\x03\x02\x02\x02\xCC\xCA\x03\x02\x02\x02\xCC\xCD\x03\x02\x02" +
		"\x02\xCD\x13\x03\x02\x02\x02\xCE\xCC\x03\x02\x02\x02\xCF\xD7\x05.\x18" +
		"\x02\xD0\xD7\x05*\x16\x02\xD1\xD7\x05\x16\f\x02\xD2\xD3\x07%\x02\x02\xD3" +
		"\xD4\x05\f\x07\x02\xD4\xD5\x07/\x02\x02\xD5\xD7\x03\x02\x02\x02\xD6\xCF" +
		"\x03\x02\x02\x02\xD6\xD0\x03\x02\x02\x02\xD6\xD1\x03\x02\x02\x02\xD6\xD2" +
		"\x03\x02\x02\x02\xD7\x15\x03\x02\x02\x02\xD8\xD9\x05,\x17\x02\xD9\xE3" +
		"\x07%\x02\x02\xDA\xE4\x07<\x02\x02\xDB\xE0\x05\f\x07\x02\xDC\xDD\x07\x1F" +
		"\x02\x02\xDD\xDF\x05\f\x07\x02\xDE\xDC\x03\x02\x02\x02\xDF\xE2\x03\x02" +
		"\x02\x02\xE0\xDE\x03\x02\x02\x02\xE0\xE1\x03\x02\x02\x02\xE1\xE4\x03\x02" +
		"\x02\x02\xE2\xE0\x03\x02\x02\x02\xE3\xDA\x03\x02\x02\x02\xE3\xDB\x03\x02" +
		"\x02\x02\xE3\xE4\x03\x02\x02\x02\xE4\xE5\x03\x02\x02\x02\xE5\xE6\x07/" +
		"\x02\x02\xE6\x17\x03\x02\x02\x02\xE7\xE8\x07\x0E\x02\x02\xE8\xE9\x05\x1A" +
		"\x0E\x02\xE9\x19\x03\x02\x02\x02\xEA\xEF\x05\x1C\x0F\x02\xEB\xEC\x07\x1F" +
		"\x02\x02\xEC\xEE\x05\x1C\x0F\x02\xED\xEB\x03\x02\x02\x02\xEE\xF1\x03\x02" +
		"\x02\x02\xEF\xED\x03\x02\x02\x02\xEF\xF0\x03\x02\x02\x02\xF0\x1B\x03\x02" +
		"\x02\x02\xF1\xEF\x03\x02\x02\x02\xF2\xF8\x05\f\x07\x02\xF3\xF4\x05*\x16" +
		"\x02\xF4\xF5\x07\x1E\x02\x02\xF5\xF6\x05\f\x07\x02\xF6\xF8\x03\x02\x02" +
		"\x02\xF7\xF2\x03\x02\x02\x02\xF7\xF3\x03\x02\x02\x02\xF8\x1D\x03\x02\x02" +
		"\x02\xF9\xFA\x07\x07\x02\x02\xFA\xFF\x05(\x15\x02\xFB\xFC\x07\x1F\x02" +
		"\x02\xFC\xFE\x05(\x15\x02\xFD\xFB\x03\x02\x02\x02\xFE\u0101\x03\x02\x02" +
		"\x02\xFF\xFD\x03\x02\x02\x02\xFF\u0100\x03\x02\x02\x02\u0100\u0103\x03" +
		"\x02\x02\x02\u0101\xFF\x03\x02\x02\x02\u0102\u0104\x05 \x11\x02\u0103" +
		"\u0102\x03\x02\x02\x02\u0103\u0104\x03\x02\x02\x02\u0104\x1F\x03\x02\x02" +
		"\x02\u0105\u0106\x07?\x02\x02\u0106\u0107\x07G\x02\x02\u0107\u010C\x05" +
		"(\x15\x02\u0108\u0109\x07\x1F\x02\x02\u0109\u010B\x05(\x15\x02\u010A\u0108" +
		"\x03\x02\x02\x02\u010B\u010E\x03\x02\x02\x02\u010C\u010A\x03\x02\x02\x02" +
		"\u010C\u010D\x03\x02\x02\x02\u010D\u010F\x03\x02\x02\x02\u010E\u010C\x03" +
		"\x02\x02\x02\u010F\u0110\x07@\x02\x02\u0110!\x03\x02\x02\x02\u0111\u0112" +
		"\x07\x06\x02\x02\u0112\u0113\x05\x1A\x0E\x02\u0113#\x03\x02\x02\x02\u0114" +
		"\u0116\x07\x11\x02\x02\u0115\u0117\x05\x1A\x0E\x02\u0116\u0115\x03\x02" +
		"\x02\x02\u0116\u0117\x03\x02\x02\x02\u0117\u011A\x03\x02\x02\x02\u0118" +
		"\u0119\x07\x1B\x02\x02\u0119\u011B\x05&\x14\x02\u011A\u0118\x03\x02\x02" +
		"\x02\u011A\u011B\x03\x02\x02\x02\u011B%\x03\x02\x02\x02\u011C\u0121\x05" +
		"*\x16\x02\u011D\u011E\x07\x1F\x02\x02\u011E\u0120\x05*\x16\x02\u011F\u011D" +
		"\x03\x02\x02\x02\u0120\u0123\x03\x02\x02\x02\u0121\u011F\x03\x02\x02\x02" +
		"\u0121\u0122\x03\x02\x02\x02\u0122\'\x03\x02\x02\x02\u0123\u0121\x03\x02" +
		"\x02\x02\u0124\u0125\t\x04\x02\x02\u0125)\x03\x02\x02\x02\u0126\u012B" +
		"\x05,\x17\x02\u0127\u0128\x07!\x02\x02\u0128\u012A\x05,\x17\x02\u0129" +
		"\u0127\x03\x02\x02\x02\u012A\u012D\x03\x02\x02\x02\u012B\u0129\x03\x02" +
		"\x02\x02\u012B\u012C\x03\x02\x02\x02\u012C+\x03\x02\x02\x02\u012D\u012B" +
		"\x03\x02\x02\x02\u012E\u012F\t\x05\x02\x02\u012F-\x03\x02\x02\x02\u0130" +
		"\u015B\x07*\x02\x02\u0131\u0132\x05N(\x02\u0132\u0133\x07A\x02\x02\u0133" +
		"\u015B\x03\x02\x02\x02\u0134\u015B\x05L\'\x02\u0135\u015B\x05N(\x02\u0136" +
		"\u015B\x05H%\x02\u0137\u015B\x07-\x02\x02\u0138\u015B\x05P)\x02\u0139" +
		"\u013A\x07?\x02\x02\u013A\u013F\x05J&\x02\u013B\u013C\x07\x1F\x02\x02" +
		"\u013C\u013E\x05J&\x02\u013D\u013B\x03\x02\x02\x02\u013E\u0141\x03\x02" +
		"\x02\x02\u013F\u013D\x03\x02\x02\x02\u013F\u0140\x03\x02\x02\x02\u0140" +
		"\u0142\x03\x02\x02\x02\u0141\u013F\x03\x02\x02\x02\u0142\u0143\x07@\x02" +
		"\x02\u0143\u015B\x03\x02\x02\x02\u0144\u0145\x07?\x02\x02\u0145\u014A" +
		"\x05H%\x02\u0146\u0147\x07\x1F\x02\x02\u0147\u0149\x05H%\x02\u0148\u0146" +
		"\x03\x02\x02\x02\u0149\u014C\x03\x02\x02\x02\u014A\u0148\x03\x02\x02\x02" +
		"\u014A\u014B\x03\x02\x02\x02\u014B\u014D\x03\x02\x02\x02\u014C\u014A\x03" +
		"\x02\x02\x02\u014D\u014E\x07@\x02\x02\u014E\u015B\x03\x02\x02\x02\u014F" +
		"\u0150\x07?\x02\x02\u0150\u0155\x05P)\x02\u0151\u0152\x07\x1F\x02\x02" +
		"\u0152\u0154\x05P)\x02\u0153\u0151\x03\x02\x02\x02\u0154\u0157\x03\x02" +
		"\x02\x02\u0155\u0153\x03\x02\x02\x02\u0155\u0156\x03\x02\x02\x02\u0156" +
		"\u0158\x03\x02\x02\x02\u0157\u0155\x03\x02\x02\x02\u0158\u0159\x07@\x02" +
		"\x02\u0159\u015B\x03\x02\x02\x02\u015A\u0130\x03\x02\x02\x02\u015A\u0131" +
		"\x03\x02\x02\x02\u015A\u0134\x03\x02\x02\x02\u015A\u0135\x03\x02\x02\x02" +
		"\u015A\u0136\x03\x02\x02\x02\u015A\u0137\x03\x02\x02\x02\u015A\u0138\x03" +
		"\x02\x02\x02\u015A\u0139\x03\x02\x02\x02\u015A\u0144\x03\x02\x02\x02\u015A" +
		"\u014F\x03\x02\x02\x02\u015B/\x03\x02\x02\x02\u015C\u015D\x07\n\x02\x02" +
		"\u015D\u015E\x07\x19\x02\x02\u015E1\x03\x02\x02\x02\u015F\u0160\x07\x10" +
		"\x02\x02\u0160\u0165\x054\x1B\x02\u0161\u0162\x07\x1F\x02\x02\u0162\u0164" +
		"\x054\x1B\x02\u0163\u0161\x03\x02\x02\x02\u0164\u0167\x03\x02\x02\x02" +
		"\u0165\u0163\x03\x02\x02\x02\u0165\u0166\x03\x02\x02\x02\u01663\x03\x02" +
		"\x02\x02\u0167\u0165\x03\x02\x02\x02\u0168\u016A\x05\f\x07\x02\u0169\u016B" +
		"\t\x06\x02\x02\u016A\u0169\x03\x02\x02\x02\u016A\u016B\x03\x02\x02\x02" +
		"\u016B\u016E\x03\x02\x02\x02\u016C\u016D\x07+\x02\x02\u016D\u016F\t\x07" +
		"\x02\x02\u016E\u016C\x03\x02\x02\x02\u016E\u016F\x03\x02\x02\x02\u016F" +
		"5\x03\x02\x02\x02\u0170\u0171\x07\t\x02\x02\u0171\u0176\x05(\x15\x02\u0172" +
		"\u0173\x07\x1F\x02\x02\u0173\u0175\x05(\x15\x02\u0174\u0172\x03\x02\x02" +
		"\x02\u0175\u0178\x03\x02\x02\x02\u0176\u0174\x03\x02\x02\x02\u0176\u0177" +
		"\x03\x02\x02\x02\u0177\u0183\x03\x02\x02\x02\u0178\u0176\x03\x02\x02\x02" +
		"\u0179\u017A\x07\f\x02\x02\u017A\u017F\x05(\x15\x02\u017B\u017C\x07\x1F" +
		"\x02\x02\u017C\u017E\x05(\x15\x02\u017D\u017B\x03\x02\x02\x02\u017E\u0181" +
		"\x03\x02\x02\x02\u017F\u017D\x03\x02\x02\x02\u017F\u0180\x03\x02\x02\x02" +
		"\u0180\u0183\x03\x02\x02\x02\u0181\u017F\x03\x02\x02\x02\u0182\u0170\x03" +
		"\x02\x02\x02\u0182\u0179\x03\x02\x02\x02\u01837\x03\x02\x02\x02\u0184" +
		"\u0185\x07\x04\x02\x02\u0185\u018A\x05(\x15\x02\u0186\u0187\x07\x1F\x02" +
		"\x02\u0187\u0189\x05(\x15\x02\u0188\u0186\x03\x02\x02\x02\u0189\u018C" +
		"\x03\x02\x02\x02\u018A\u0188\x03\x02\x02\x02\u018A\u018B\x03\x02\x02\x02" +
		"\u018B9\x03\x02\x02\x02\u018C\u018A\x03\x02\x02\x02\u018D\u018E\x07\r" +
		"\x02\x02\u018E\u0193\x05<\x1F\x02\u018F\u0190\x07\x1F\x02\x02\u0190\u0192" +
		"\x05<\x1F\x02\u0191\u018F\x03\x02\x02\x02\u0192\u0195\x03\x02\x02\x02" +
		"\u0193\u0191\x03\x02\x02\x02\u0193\u0194\x03\x02\x02\x02\u0194;\x03\x02" +
		"\x02\x02\u0195\u0193\x03\x02\x02\x02\u0196\u0197\x05(\x15\x02\u0197\u0198" +
		"\x07F\x02\x02\u0198\u0199\x05(\x15\x02\u0199=\x03\x02\x02\x02\u019A\u019B" +
		"\x07\x03\x02\x02\u019B\u019C\x05\x14\v\x02\u019C\u019E\x05P)\x02\u019D" +
		"\u019F\x05D#\x02\u019E\u019D\x03\x02\x02\x02\u019E\u019F\x03\x02\x02\x02" +
		"\u019F?\x03\x02\x02\x02\u01A0\u01A1\x07\b\x02\x02\u01A1\u01A2\x05\x14" +
		"\v\x02\u01A2\u01A3\x05P)\x02\u01A3A\x03\x02\x02\x02\u01A4\u01A5\x07\v" +
		"\x02\x02\u01A5\u01A6\x05(\x15\x02\u01A6C\x03\x02\x02\x02\u01A7\u01AC\x05" +
		"F$\x02\u01A8\u01A9\x07\x1F\x02\x02\u01A9\u01AB\x05F$\x02\u01AA\u01A8\x03" +
		"\x02\x02\x02\u01AB\u01AE\x03\x02\x02\x02\u01AC\u01AA\x03\x02\x02\x02\u01AC" +
		"\u01AD\x03\x02\x02\x02\u01ADE\x03\x02\x02\x02\u01AE\u01AC\x03\x02\x02" +
		"\x02\u01AF\u01B0\x05,\x17\x02\u01B0\u01B1\x07\x1E\x02\x02\u01B1\u01B2" +
		"\x05.\x18\x02\u01B2G\x03\x02\x02\x02\u01B3\u01B4\t\b\x02\x02\u01B4I\x03" +
		"\x02\x02\x02\u01B5\u01B8\x05L\'\x02\u01B6\u01B8\x05N(\x02\u01B7\u01B5" +
		"\x03\x02\x02\x02\u01B7\u01B6\x03\x02\x02\x02\u01B8K\x03\x02\x02\x02\u01B9" +
		"\u01BB\t\x02\x02\x02\u01BA\u01B9\x03\x02\x02\x02\u01BA\u01BB\x03\x02\x02" +
		"\x02\u01BB\u01BC\x03\x02\x02\x02\u01BC\u01BD\x07\x1A\x02\x02\u01BDM\x03" +
		"\x02\x02\x02\u01BE\u01C0\t\x02\x02\x02\u01BF\u01BE\x03\x02\x02\x02\u01BF" +
		"\u01C0\x03\x02\x02\x02\u01C0\u01C1\x03\x02\x02\x02\u01C1\u01C2\x07\x19" +
		"\x02\x02\u01C2O\x03\x02\x02\x02\u01C3\u01C4\x07\x18\x02\x02\u01C4Q\x03" +
		"\x02\x02\x02\u01C5\u01C6\t\t\x02\x02\u01C6S\x03\x02\x02\x02\u01C7\u01C8" +
		"\x07\x0F\x02\x02\u01C8\u01CC\x071\x02\x02\u01C9\u01CA\x07\x0F\x02\x02" +
		"\u01CA\u01CC\x072\x02\x02\u01CB\u01C7\x03\x02\x02\x02\u01CB\u01C9\x03" +
		"\x02\x02\x02\u01CCU\x03\x02\x02\x02\u01CD\u01CE\x07\x05\x02\x02\u01CE" +
		"\u01D1\x05(\x15\x02\u01CF\u01D0\x07H\x02\x02\u01D0\u01D2\x05(\x15\x02" +
		"\u01D1\u01CF\x03\x02\x02\x02\u01D1\u01D2\x03\x02\x02\x02\u01D2\u01DC\x03" +
		"\x02\x02\x02\u01D3\u01D4\x07I\x02\x02\u01D4\u01D9\x05X-\x02\u01D5\u01D6" +
		"\x07\x1F\x02\x02\u01D6\u01D8\x05X-\x02\u01D7\u01D5\x03\x02\x02\x02\u01D8" +
		"\u01DB\x03\x02\x02\x02\u01D9\u01D7\x03\x02\x02\x02\u01D9\u01DA\x03\x02" +
		"\x02\x02\u01DA\u01DD\x03\x02\x02\x02\u01DB\u01D9\x03\x02\x02\x02\u01DC" +
		"\u01D3\x03\x02\x02\x02\u01DC\u01DD\x03\x02\x02\x02\u01DDW\x03\x02\x02" +
		"\x02\u01DE\u01DF\x05(\x15\x02\u01DF\u01E0\x07\x1E\x02\x02\u01E0\u01E2" +
		"\x03\x02\x02\x02\u01E1\u01DE\x03\x02\x02\x02\u01E1\u01E2\x03\x02\x02\x02" +
		"\u01E2\u01E3\x03\x02\x02\x02\u01E3\u01E4\x05(\x15\x02\u01E4Y\x03\x02\x02" +
		"\x024eky\x85\x8E\x96\x9A\xA2\xA4\xA9\xB0\xB5\xBC\xC2\xCA\xCC\xD6\xE0\xE3" +
		"\xEF\xF7\xFF\u0103\u010C\u0116\u011A\u0121\u012B\u013F\u014A\u0155\u015A" +
		"\u0165\u016A\u016E\u0176\u017F\u0182\u018A\u0193\u019E\u01AC\u01B7\u01BA" +
		"\u01BF\u01CB\u01D1\u01D9\u01DC\u01E1";
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
	public sourceIdentifier(): SourceIdentifierContext[];
	public sourceIdentifier(i: number): SourceIdentifierContext;
	public sourceIdentifier(i?: number): SourceIdentifierContext | SourceIdentifierContext[] {
		if (i === undefined) {
			return this.getRuleContexts(SourceIdentifierContext);
		} else {
			return this.getRuleContext(i, SourceIdentifierContext);
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
	public sourceIdentifier(): SourceIdentifierContext[];
	public sourceIdentifier(i: number): SourceIdentifierContext;
	public sourceIdentifier(i?: number): SourceIdentifierContext | SourceIdentifierContext[] {
		if (i === undefined) {
			return this.getRuleContexts(SourceIdentifierContext);
		} else {
			return this.getRuleContext(i, SourceIdentifierContext);
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


export class SourceIdentifierContext extends ParserRuleContext {
	public SRC_UNQUOTED_IDENTIFIER(): TerminalNode | undefined { return this.tryGetToken(esql_parser.SRC_UNQUOTED_IDENTIFIER, 0); }
	public SRC_QUOTED_IDENTIFIER(): TerminalNode | undefined { return this.tryGetToken(esql_parser.SRC_QUOTED_IDENTIFIER, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_sourceIdentifier; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterSourceIdentifier) {
			listener.enterSourceIdentifier(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitSourceIdentifier) {
			listener.exitSourceIdentifier(this);
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
	public sourceIdentifier(): SourceIdentifierContext[];
	public sourceIdentifier(i: number): SourceIdentifierContext;
	public sourceIdentifier(i?: number): SourceIdentifierContext | SourceIdentifierContext[] {
		if (i === undefined) {
			return this.getRuleContexts(SourceIdentifierContext);
		} else {
			return this.getRuleContext(i, SourceIdentifierContext);
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
	public sourceIdentifier(): SourceIdentifierContext[];
	public sourceIdentifier(i: number): SourceIdentifierContext;
	public sourceIdentifier(i?: number): SourceIdentifierContext | SourceIdentifierContext[] {
		if (i === undefined) {
			return this.getRuleContexts(SourceIdentifierContext);
		} else {
			return this.getRuleContext(i, SourceIdentifierContext);
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
	public _oldName: SourceIdentifierContext;
	public _newName: SourceIdentifierContext;
	public AS(): TerminalNode { return this.getToken(esql_parser.AS, 0); }
	public sourceIdentifier(): SourceIdentifierContext[];
	public sourceIdentifier(i: number): SourceIdentifierContext;
	public sourceIdentifier(i?: number): SourceIdentifierContext | SourceIdentifierContext[] {
		if (i === undefined) {
			return this.getRuleContexts(SourceIdentifierContext);
		} else {
			return this.getRuleContext(i, SourceIdentifierContext);
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
	public sourceIdentifier(): SourceIdentifierContext {
		return this.getRuleContext(0, SourceIdentifierContext);
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
	public _policyName: SourceIdentifierContext;
	public _matchField: SourceIdentifierContext;
	public ENRICH(): TerminalNode { return this.getToken(esql_parser.ENRICH, 0); }
	public sourceIdentifier(): SourceIdentifierContext[];
	public sourceIdentifier(i: number): SourceIdentifierContext;
	public sourceIdentifier(i?: number): SourceIdentifierContext | SourceIdentifierContext[] {
		if (i === undefined) {
			return this.getRuleContexts(SourceIdentifierContext);
		} else {
			return this.getRuleContext(i, SourceIdentifierContext);
		}
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
	public _newName: SourceIdentifierContext;
	public _enrichField: SourceIdentifierContext;
	public sourceIdentifier(): SourceIdentifierContext[];
	public sourceIdentifier(i: number): SourceIdentifierContext;
	public sourceIdentifier(i?: number): SourceIdentifierContext | SourceIdentifierContext[] {
		if (i === undefined) {
			return this.getRuleContexts(SourceIdentifierContext);
		} else {
			return this.getRuleContext(i, SourceIdentifierContext);
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


