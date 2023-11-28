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
	public static readonly LINE_COMMENT = 17;
	public static readonly MULTILINE_COMMENT = 18;
	public static readonly WS = 19;
	public static readonly PIPE = 20;
	public static readonly STRING = 21;
	public static readonly INTEGER_LITERAL = 22;
	public static readonly DECIMAL_LITERAL = 23;
	public static readonly BY = 24;
	public static readonly AND = 25;
	public static readonly ASC = 26;
	public static readonly ASSIGN = 27;
	public static readonly COMMA = 28;
	public static readonly DESC = 29;
	public static readonly DOT = 30;
	public static readonly FALSE = 31;
	public static readonly FIRST = 32;
	public static readonly LAST = 33;
	public static readonly LP = 34;
	public static readonly IN = 35;
	public static readonly IS = 36;
	public static readonly LIKE = 37;
	public static readonly NOT = 38;
	public static readonly NULL = 39;
	public static readonly NULLS = 40;
	public static readonly OR = 41;
	public static readonly PARAM = 42;
	public static readonly RLIKE = 43;
	public static readonly RP = 44;
	public static readonly TRUE = 45;
	public static readonly INFO = 46;
	public static readonly FUNCTIONS = 47;
	public static readonly UNDERSCORE = 48;
	public static readonly EQ = 49;
	public static readonly NEQ = 50;
	public static readonly LT = 51;
	public static readonly LTE = 52;
	public static readonly GT = 53;
	public static readonly GTE = 54;
	public static readonly PLUS = 55;
	public static readonly MINUS = 56;
	public static readonly ASTERISK = 57;
	public static readonly SLASH = 58;
	public static readonly PERCENT = 59;
	public static readonly OPENING_BRACKET = 60;
	public static readonly CLOSING_BRACKET = 61;
	public static readonly UNQUOTED_IDENTIFIER = 62;
	public static readonly QUOTED_IDENTIFIER = 63;
	public static readonly EXPR_LINE_COMMENT = 64;
	public static readonly EXPR_MULTILINE_COMMENT = 65;
	public static readonly EXPR_WS = 66;
	public static readonly AS = 67;
	public static readonly METADATA = 68;
	public static readonly ON = 69;
	public static readonly WITH = 70;
	public static readonly SRC_UNQUOTED_IDENTIFIER = 71;
	public static readonly SRC_QUOTED_IDENTIFIER = 72;
	public static readonly SRC_LINE_COMMENT = 73;
	public static readonly SRC_MULTILINE_COMMENT = 74;
	public static readonly SRC_WS = 75;
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
	public static readonly RULE_rowCommand = 10;
	public static readonly RULE_fields = 11;
	public static readonly RULE_field = 12;
	public static readonly RULE_fromCommand = 13;
	public static readonly RULE_metadata = 14;
	public static readonly RULE_evalCommand = 15;
	public static readonly RULE_statsCommand = 16;
	public static readonly RULE_grouping = 17;
	public static readonly RULE_sourceIdentifier = 18;
	public static readonly RULE_qualifiedName = 19;
	public static readonly RULE_identifier = 20;
	public static readonly RULE_constant = 21;
	public static readonly RULE_limitCommand = 22;
	public static readonly RULE_sortCommand = 23;
	public static readonly RULE_orderExpression = 24;
	public static readonly RULE_keepCommand = 25;
	public static readonly RULE_dropCommand = 26;
	public static readonly RULE_renameCommand = 27;
	public static readonly RULE_renameClause = 28;
	public static readonly RULE_dissectCommand = 29;
	public static readonly RULE_grokCommand = 30;
	public static readonly RULE_mvExpandCommand = 31;
	public static readonly RULE_commandOptions = 32;
	public static readonly RULE_commandOption = 33;
	public static readonly RULE_booleanValue = 34;
	public static readonly RULE_numericValue = 35;
	public static readonly RULE_decimalValue = 36;
	public static readonly RULE_integerValue = 37;
	public static readonly RULE_string = 38;
	public static readonly RULE_comparisonOperator = 39;
	public static readonly RULE_showCommand = 40;
	public static readonly RULE_enrichCommand = 41;
	public static readonly RULE_enrichWithClause = 42;
	// tslint:disable:no-trailing-whitespace
	public static readonly ruleNames: string[] = [
		"singleStatement", "query", "sourceCommand", "processingCommand", "whereCommand", 
		"booleanExpression", "regexBooleanExpression", "valueExpression", "operatorExpression", 
		"primaryExpression", "rowCommand", "fields", "field", "fromCommand", "metadata", 
		"evalCommand", "statsCommand", "grouping", "sourceIdentifier", "qualifiedName", 
		"identifier", "constant", "limitCommand", "sortCommand", "orderExpression", 
		"keepCommand", "dropCommand", "renameCommand", "renameClause", "dissectCommand", 
		"grokCommand", "mvExpandCommand", "commandOptions", "commandOption", "booleanValue", 
		"numericValue", "decimalValue", "integerValue", "string", "comparisonOperator", 
		"showCommand", "enrichCommand", "enrichWithClause",
	];

	private static readonly _LITERAL_NAMES: Array<string | undefined> = [
		undefined, undefined, undefined, undefined, undefined, undefined, undefined, 
		undefined, undefined, undefined, undefined, undefined, undefined, undefined, 
		undefined, undefined, undefined, undefined, undefined, undefined, undefined, 
		undefined, undefined, undefined, undefined, undefined, undefined, undefined, 
		undefined, undefined, "'.'", undefined, undefined, undefined, "'('", undefined, 
		undefined, undefined, undefined, undefined, undefined, undefined, "'?'", 
		undefined, "')'", undefined, undefined, undefined, "'_'", "'=='", "'!='", 
		"'<'", "'<='", "'>'", "'>='", "'+'", "'-'", "'*'", "'/'", "'%'", undefined, 
		"']'",
	];
	private static readonly _SYMBOLIC_NAMES: Array<string | undefined> = [
		undefined, "DISSECT", "DROP", "ENRICH", "EVAL", "FROM", "GROK", "KEEP", 
		"LIMIT", "MV_EXPAND", "PROJECT", "RENAME", "ROW", "SHOW", "SORT", "STATS", 
		"WHERE", "LINE_COMMENT", "MULTILINE_COMMENT", "WS", "PIPE", "STRING", 
		"INTEGER_LITERAL", "DECIMAL_LITERAL", "BY", "AND", "ASC", "ASSIGN", "COMMA", 
		"DESC", "DOT", "FALSE", "FIRST", "LAST", "LP", "IN", "IS", "LIKE", "NOT", 
		"NULL", "NULLS", "OR", "PARAM", "RLIKE", "RP", "TRUE", "INFO", "FUNCTIONS", 
		"UNDERSCORE", "EQ", "NEQ", "LT", "LTE", "GT", "GTE", "PLUS", "MINUS", 
		"ASTERISK", "SLASH", "PERCENT", "OPENING_BRACKET", "CLOSING_BRACKET", 
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
			this.state = 86;
			this.query(0);
			this.state = 87;
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

			this.state = 90;
			this.sourceCommand();
			}
			this._ctx._stop = this._input.tryLT(-1);
			this.state = 97;
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
					this.state = 92;
					if (!(this.precpred(this._ctx, 1))) {
						throw new FailedPredicateException(this, "this.precpred(this._ctx, 1)");
					}
					this.state = 93;
					this.match(esql_parser.PIPE);
					this.state = 94;
					this.processingCommand();
					}
					}
				}
				this.state = 99;
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
			this.state = 103;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case esql_parser.FROM:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 100;
				this.fromCommand();
				}
				break;
			case esql_parser.ROW:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 101;
				this.rowCommand();
				}
				break;
			case esql_parser.SHOW:
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 102;
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
			this.state = 117;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case esql_parser.EVAL:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 105;
				this.evalCommand();
				}
				break;
			case esql_parser.LIMIT:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 106;
				this.limitCommand();
				}
				break;
			case esql_parser.KEEP:
			case esql_parser.PROJECT:
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 107;
				this.keepCommand();
				}
				break;
			case esql_parser.SORT:
				this.enterOuterAlt(_localctx, 4);
				{
				this.state = 108;
				this.sortCommand();
				}
				break;
			case esql_parser.STATS:
				this.enterOuterAlt(_localctx, 5);
				{
				this.state = 109;
				this.statsCommand();
				}
				break;
			case esql_parser.WHERE:
				this.enterOuterAlt(_localctx, 6);
				{
				this.state = 110;
				this.whereCommand();
				}
				break;
			case esql_parser.DROP:
				this.enterOuterAlt(_localctx, 7);
				{
				this.state = 111;
				this.dropCommand();
				}
				break;
			case esql_parser.RENAME:
				this.enterOuterAlt(_localctx, 8);
				{
				this.state = 112;
				this.renameCommand();
				}
				break;
			case esql_parser.DISSECT:
				this.enterOuterAlt(_localctx, 9);
				{
				this.state = 113;
				this.dissectCommand();
				}
				break;
			case esql_parser.GROK:
				this.enterOuterAlt(_localctx, 10);
				{
				this.state = 114;
				this.grokCommand();
				}
				break;
			case esql_parser.ENRICH:
				this.enterOuterAlt(_localctx, 11);
				{
				this.state = 115;
				this.enrichCommand();
				}
				break;
			case esql_parser.MV_EXPAND:
				this.enterOuterAlt(_localctx, 12);
				{
				this.state = 116;
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
			this.state = 119;
			this.match(esql_parser.WHERE);
			this.state = 120;
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
			this.state = 150;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 6, this._ctx) ) {
			case 1:
				{
				_localctx = new LogicalNotContext(_localctx);
				this._ctx = _localctx;
				_prevctx = _localctx;

				this.state = 123;
				this.match(esql_parser.NOT);
				this.state = 124;
				this.booleanExpression(7);
				}
				break;

			case 2:
				{
				_localctx = new BooleanDefaultContext(_localctx);
				this._ctx = _localctx;
				_prevctx = _localctx;
				this.state = 125;
				this.valueExpression();
				}
				break;

			case 3:
				{
				_localctx = new RegexExpressionContext(_localctx);
				this._ctx = _localctx;
				_prevctx = _localctx;
				this.state = 126;
				this.regexBooleanExpression();
				}
				break;

			case 4:
				{
				_localctx = new LogicalInContext(_localctx);
				this._ctx = _localctx;
				_prevctx = _localctx;
				this.state = 127;
				this.valueExpression();
				this.state = 129;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la === esql_parser.NOT) {
					{
					this.state = 128;
					this.match(esql_parser.NOT);
					}
				}

				this.state = 131;
				this.match(esql_parser.IN);
				this.state = 132;
				this.match(esql_parser.LP);
				this.state = 133;
				this.valueExpression();
				this.state = 138;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la === esql_parser.COMMA) {
					{
					{
					this.state = 134;
					this.match(esql_parser.COMMA);
					this.state = 135;
					this.valueExpression();
					}
					}
					this.state = 140;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 141;
				this.match(esql_parser.RP);
				}
				break;

			case 5:
				{
				_localctx = new IsNullContext(_localctx);
				this._ctx = _localctx;
				_prevctx = _localctx;
				this.state = 143;
				this.valueExpression();
				this.state = 144;
				this.match(esql_parser.IS);
				this.state = 146;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la === esql_parser.NOT) {
					{
					this.state = 145;
					this.match(esql_parser.NOT);
					}
				}

				this.state = 148;
				this.match(esql_parser.NULL);
				}
				break;
			}
			this._ctx._stop = this._input.tryLT(-1);
			this.state = 160;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 8, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					if (this._parseListeners != null) {
						this.triggerExitRuleEvent();
					}
					_prevctx = _localctx;
					{
					this.state = 158;
					this._errHandler.sync(this);
					switch ( this.interpreter.adaptivePredict(this._input, 7, this._ctx) ) {
					case 1:
						{
						_localctx = new LogicalBinaryContext(new BooleanExpressionContext(_parentctx, _parentState));
						(_localctx as LogicalBinaryContext)._left = _prevctx;
						this.pushNewRecursionContext(_localctx, _startState, esql_parser.RULE_booleanExpression);
						this.state = 152;
						if (!(this.precpred(this._ctx, 4))) {
							throw new FailedPredicateException(this, "this.precpred(this._ctx, 4)");
						}
						this.state = 153;
						(_localctx as LogicalBinaryContext)._operator = this.match(esql_parser.AND);
						this.state = 154;
						(_localctx as LogicalBinaryContext)._right = this.booleanExpression(5);
						}
						break;

					case 2:
						{
						_localctx = new LogicalBinaryContext(new BooleanExpressionContext(_parentctx, _parentState));
						(_localctx as LogicalBinaryContext)._left = _prevctx;
						this.pushNewRecursionContext(_localctx, _startState, esql_parser.RULE_booleanExpression);
						this.state = 155;
						if (!(this.precpred(this._ctx, 3))) {
							throw new FailedPredicateException(this, "this.precpred(this._ctx, 3)");
						}
						this.state = 156;
						(_localctx as LogicalBinaryContext)._operator = this.match(esql_parser.OR);
						this.state = 157;
						(_localctx as LogicalBinaryContext)._right = this.booleanExpression(4);
						}
						break;
					}
					}
				}
				this.state = 162;
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
			this.state = 177;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 11, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 163;
				this.valueExpression();
				this.state = 165;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la === esql_parser.NOT) {
					{
					this.state = 164;
					this.match(esql_parser.NOT);
					}
				}

				this.state = 167;
				_localctx._kind = this.match(esql_parser.LIKE);
				this.state = 168;
				_localctx._pattern = this.string();
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 170;
				this.valueExpression();
				this.state = 172;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la === esql_parser.NOT) {
					{
					this.state = 171;
					this.match(esql_parser.NOT);
					}
				}

				this.state = 174;
				_localctx._kind = this.match(esql_parser.RLIKE);
				this.state = 175;
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
			this.state = 184;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 12, this._ctx) ) {
			case 1:
				_localctx = new ValueExpressionDefaultContext(_localctx);
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 179;
				this.operatorExpression(0);
				}
				break;

			case 2:
				_localctx = new ComparisonContext(_localctx);
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 180;
				(_localctx as ComparisonContext)._left = this.operatorExpression(0);
				this.state = 181;
				this.comparisonOperator();
				this.state = 182;
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
			this.state = 190;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 13, this._ctx) ) {
			case 1:
				{
				_localctx = new OperatorExpressionDefaultContext(_localctx);
				this._ctx = _localctx;
				_prevctx = _localctx;

				this.state = 187;
				this.primaryExpression();
				}
				break;

			case 2:
				{
				_localctx = new ArithmeticUnaryContext(_localctx);
				this._ctx = _localctx;
				_prevctx = _localctx;
				this.state = 188;
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
				this.state = 189;
				this.operatorExpression(3);
				}
				break;
			}
			this._ctx._stop = this._input.tryLT(-1);
			this.state = 200;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 15, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					if (this._parseListeners != null) {
						this.triggerExitRuleEvent();
					}
					_prevctx = _localctx;
					{
					this.state = 198;
					this._errHandler.sync(this);
					switch ( this.interpreter.adaptivePredict(this._input, 14, this._ctx) ) {
					case 1:
						{
						_localctx = new ArithmeticBinaryContext(new OperatorExpressionContext(_parentctx, _parentState));
						(_localctx as ArithmeticBinaryContext)._left = _prevctx;
						this.pushNewRecursionContext(_localctx, _startState, esql_parser.RULE_operatorExpression);
						this.state = 192;
						if (!(this.precpred(this._ctx, 2))) {
							throw new FailedPredicateException(this, "this.precpred(this._ctx, 2)");
						}
						this.state = 193;
						(_localctx as ArithmeticBinaryContext)._operator = this._input.LT(1);
						_la = this._input.LA(1);
						if (!(((((_la - 57)) & ~0x1F) === 0 && ((1 << (_la - 57)) & ((1 << (esql_parser.ASTERISK - 57)) | (1 << (esql_parser.SLASH - 57)) | (1 << (esql_parser.PERCENT - 57)))) !== 0))) {
							(_localctx as ArithmeticBinaryContext)._operator = this._errHandler.recoverInline(this);
						} else {
							if (this._input.LA(1) === Token.EOF) {
								this.matchedEOF = true;
							}

							this._errHandler.reportMatch(this);
							this.consume();
						}
						this.state = 194;
						(_localctx as ArithmeticBinaryContext)._right = this.operatorExpression(3);
						}
						break;

					case 2:
						{
						_localctx = new ArithmeticBinaryContext(new OperatorExpressionContext(_parentctx, _parentState));
						(_localctx as ArithmeticBinaryContext)._left = _prevctx;
						this.pushNewRecursionContext(_localctx, _startState, esql_parser.RULE_operatorExpression);
						this.state = 195;
						if (!(this.precpred(this._ctx, 1))) {
							throw new FailedPredicateException(this, "this.precpred(this._ctx, 1)");
						}
						this.state = 196;
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
						this.state = 197;
						(_localctx as ArithmeticBinaryContext)._right = this.operatorExpression(2);
						}
						break;
					}
					}
				}
				this.state = 202;
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
		let _la: number;
		try {
			this.state = 223;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 18, this._ctx) ) {
			case 1:
				_localctx = new ConstantDefaultContext(_localctx);
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 203;
				this.constant();
				}
				break;

			case 2:
				_localctx = new DereferenceContext(_localctx);
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 204;
				this.qualifiedName();
				}
				break;

			case 3:
				_localctx = new ParenthesizedExpressionContext(_localctx);
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 205;
				this.match(esql_parser.LP);
				this.state = 206;
				this.booleanExpression(0);
				this.state = 207;
				this.match(esql_parser.RP);
				}
				break;

			case 4:
				_localctx = new FunctionExpressionContext(_localctx);
				this.enterOuterAlt(_localctx, 4);
				{
				this.state = 209;
				this.identifier();
				this.state = 210;
				this.match(esql_parser.LP);
				this.state = 219;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if ((((_la) & ~0x1F) === 0 && ((1 << _la) & ((1 << esql_parser.STRING) | (1 << esql_parser.INTEGER_LITERAL) | (1 << esql_parser.DECIMAL_LITERAL) | (1 << esql_parser.FALSE))) !== 0) || ((((_la - 34)) & ~0x1F) === 0 && ((1 << (_la - 34)) & ((1 << (esql_parser.LP - 34)) | (1 << (esql_parser.NOT - 34)) | (1 << (esql_parser.NULL - 34)) | (1 << (esql_parser.PARAM - 34)) | (1 << (esql_parser.TRUE - 34)) | (1 << (esql_parser.PLUS - 34)) | (1 << (esql_parser.MINUS - 34)) | (1 << (esql_parser.OPENING_BRACKET - 34)) | (1 << (esql_parser.UNQUOTED_IDENTIFIER - 34)) | (1 << (esql_parser.QUOTED_IDENTIFIER - 34)))) !== 0)) {
					{
					this.state = 211;
					this.booleanExpression(0);
					this.state = 216;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
					while (_la === esql_parser.COMMA) {
						{
						{
						this.state = 212;
						this.match(esql_parser.COMMA);
						this.state = 213;
						this.booleanExpression(0);
						}
						}
						this.state = 218;
						this._errHandler.sync(this);
						_la = this._input.LA(1);
					}
					}
				}

				this.state = 221;
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
	public rowCommand(): RowCommandContext {
		let _localctx: RowCommandContext = new RowCommandContext(this._ctx, this.state);
		this.enterRule(_localctx, 20, esql_parser.RULE_rowCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 225;
			this.match(esql_parser.ROW);
			this.state = 226;
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
		this.enterRule(_localctx, 22, esql_parser.RULE_fields);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 228;
			this.field();
			this.state = 233;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 19, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 229;
					this.match(esql_parser.COMMA);
					this.state = 230;
					this.field();
					}
					}
				}
				this.state = 235;
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
		this.enterRule(_localctx, 24, esql_parser.RULE_field);
		try {
			this.state = 241;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 20, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 236;
				this.booleanExpression(0);
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 237;
				this.qualifiedName();
				this.state = 238;
				this.match(esql_parser.ASSIGN);
				this.state = 239;
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
		this.enterRule(_localctx, 26, esql_parser.RULE_fromCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 243;
			this.match(esql_parser.FROM);
			this.state = 244;
			this.sourceIdentifier();
			this.state = 249;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 21, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 245;
					this.match(esql_parser.COMMA);
					this.state = 246;
					this.sourceIdentifier();
					}
					}
				}
				this.state = 251;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 21, this._ctx);
			}
			this.state = 253;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 22, this._ctx) ) {
			case 1:
				{
				this.state = 252;
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
		this.enterRule(_localctx, 28, esql_parser.RULE_metadata);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 255;
			this.match(esql_parser.OPENING_BRACKET);
			this.state = 256;
			this.match(esql_parser.METADATA);
			this.state = 257;
			this.sourceIdentifier();
			this.state = 262;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la === esql_parser.COMMA) {
				{
				{
				this.state = 258;
				this.match(esql_parser.COMMA);
				this.state = 259;
				this.sourceIdentifier();
				}
				}
				this.state = 264;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			this.state = 265;
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
		this.enterRule(_localctx, 30, esql_parser.RULE_evalCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 267;
			this.match(esql_parser.EVAL);
			this.state = 268;
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
		this.enterRule(_localctx, 32, esql_parser.RULE_statsCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 270;
			this.match(esql_parser.STATS);
			this.state = 272;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 24, this._ctx) ) {
			case 1:
				{
				this.state = 271;
				this.fields();
				}
				break;
			}
			this.state = 276;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 25, this._ctx) ) {
			case 1:
				{
				this.state = 274;
				this.match(esql_parser.BY);
				this.state = 275;
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
		this.enterRule(_localctx, 34, esql_parser.RULE_grouping);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 278;
			this.qualifiedName();
			this.state = 283;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 26, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 279;
					this.match(esql_parser.COMMA);
					this.state = 280;
					this.qualifiedName();
					}
					}
				}
				this.state = 285;
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
		this.enterRule(_localctx, 36, esql_parser.RULE_sourceIdentifier);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 286;
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
		this.enterRule(_localctx, 38, esql_parser.RULE_qualifiedName);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 288;
			this.identifier();
			this.state = 293;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 27, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 289;
					this.match(esql_parser.DOT);
					this.state = 290;
					this.identifier();
					}
					}
				}
				this.state = 295;
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
		this.enterRule(_localctx, 40, esql_parser.RULE_identifier);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 296;
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
		this.enterRule(_localctx, 42, esql_parser.RULE_constant);
		let _la: number;
		try {
			this.state = 340;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 31, this._ctx) ) {
			case 1:
				_localctx = new NullLiteralContext(_localctx);
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 298;
				this.match(esql_parser.NULL);
				}
				break;

			case 2:
				_localctx = new QualifiedIntegerLiteralContext(_localctx);
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 299;
				this.integerValue();
				this.state = 300;
				this.match(esql_parser.UNQUOTED_IDENTIFIER);
				}
				break;

			case 3:
				_localctx = new DecimalLiteralContext(_localctx);
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 302;
				this.decimalValue();
				}
				break;

			case 4:
				_localctx = new IntegerLiteralContext(_localctx);
				this.enterOuterAlt(_localctx, 4);
				{
				this.state = 303;
				this.integerValue();
				}
				break;

			case 5:
				_localctx = new BooleanLiteralContext(_localctx);
				this.enterOuterAlt(_localctx, 5);
				{
				this.state = 304;
				this.booleanValue();
				}
				break;

			case 6:
				_localctx = new InputParamContext(_localctx);
				this.enterOuterAlt(_localctx, 6);
				{
				this.state = 305;
				this.match(esql_parser.PARAM);
				}
				break;

			case 7:
				_localctx = new StringLiteralContext(_localctx);
				this.enterOuterAlt(_localctx, 7);
				{
				this.state = 306;
				this.string();
				}
				break;

			case 8:
				_localctx = new NumericArrayLiteralContext(_localctx);
				this.enterOuterAlt(_localctx, 8);
				{
				this.state = 307;
				this.match(esql_parser.OPENING_BRACKET);
				this.state = 308;
				this.numericValue();
				this.state = 313;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la === esql_parser.COMMA) {
					{
					{
					this.state = 309;
					this.match(esql_parser.COMMA);
					this.state = 310;
					this.numericValue();
					}
					}
					this.state = 315;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 316;
				this.match(esql_parser.CLOSING_BRACKET);
				}
				break;

			case 9:
				_localctx = new BooleanArrayLiteralContext(_localctx);
				this.enterOuterAlt(_localctx, 9);
				{
				this.state = 318;
				this.match(esql_parser.OPENING_BRACKET);
				this.state = 319;
				this.booleanValue();
				this.state = 324;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la === esql_parser.COMMA) {
					{
					{
					this.state = 320;
					this.match(esql_parser.COMMA);
					this.state = 321;
					this.booleanValue();
					}
					}
					this.state = 326;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 327;
				this.match(esql_parser.CLOSING_BRACKET);
				}
				break;

			case 10:
				_localctx = new StringArrayLiteralContext(_localctx);
				this.enterOuterAlt(_localctx, 10);
				{
				this.state = 329;
				this.match(esql_parser.OPENING_BRACKET);
				this.state = 330;
				this.string();
				this.state = 335;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la === esql_parser.COMMA) {
					{
					{
					this.state = 331;
					this.match(esql_parser.COMMA);
					this.state = 332;
					this.string();
					}
					}
					this.state = 337;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 338;
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
		this.enterRule(_localctx, 44, esql_parser.RULE_limitCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 342;
			this.match(esql_parser.LIMIT);
			this.state = 343;
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
		this.enterRule(_localctx, 46, esql_parser.RULE_sortCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 345;
			this.match(esql_parser.SORT);
			this.state = 346;
			this.orderExpression();
			this.state = 351;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 32, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 347;
					this.match(esql_parser.COMMA);
					this.state = 348;
					this.orderExpression();
					}
					}
				}
				this.state = 353;
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
		this.enterRule(_localctx, 48, esql_parser.RULE_orderExpression);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 354;
			this.booleanExpression(0);
			this.state = 356;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 33, this._ctx) ) {
			case 1:
				{
				this.state = 355;
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
			this.state = 360;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 34, this._ctx) ) {
			case 1:
				{
				this.state = 358;
				this.match(esql_parser.NULLS);
				this.state = 359;
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
		this.enterRule(_localctx, 50, esql_parser.RULE_keepCommand);
		try {
			let _alt: number;
			this.state = 380;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case esql_parser.KEEP:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 362;
				this.match(esql_parser.KEEP);
				this.state = 363;
				this.sourceIdentifier();
				this.state = 368;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 35, this._ctx);
				while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
					if (_alt === 1) {
						{
						{
						this.state = 364;
						this.match(esql_parser.COMMA);
						this.state = 365;
						this.sourceIdentifier();
						}
						}
					}
					this.state = 370;
					this._errHandler.sync(this);
					_alt = this.interpreter.adaptivePredict(this._input, 35, this._ctx);
				}
				}
				break;
			case esql_parser.PROJECT:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 371;
				this.match(esql_parser.PROJECT);
				this.state = 372;
				this.sourceIdentifier();
				this.state = 377;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 36, this._ctx);
				while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
					if (_alt === 1) {
						{
						{
						this.state = 373;
						this.match(esql_parser.COMMA);
						this.state = 374;
						this.sourceIdentifier();
						}
						}
					}
					this.state = 379;
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
		this.enterRule(_localctx, 52, esql_parser.RULE_dropCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 382;
			this.match(esql_parser.DROP);
			this.state = 383;
			this.sourceIdentifier();
			this.state = 388;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 38, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 384;
					this.match(esql_parser.COMMA);
					this.state = 385;
					this.sourceIdentifier();
					}
					}
				}
				this.state = 390;
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
		this.enterRule(_localctx, 54, esql_parser.RULE_renameCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 391;
			this.match(esql_parser.RENAME);
			this.state = 392;
			this.renameClause();
			this.state = 397;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 39, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 393;
					this.match(esql_parser.COMMA);
					this.state = 394;
					this.renameClause();
					}
					}
				}
				this.state = 399;
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
		this.enterRule(_localctx, 56, esql_parser.RULE_renameClause);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 400;
			_localctx._oldName = this.sourceIdentifier();
			this.state = 401;
			this.match(esql_parser.AS);
			this.state = 402;
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
		this.enterRule(_localctx, 58, esql_parser.RULE_dissectCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 404;
			this.match(esql_parser.DISSECT);
			this.state = 405;
			this.primaryExpression();
			this.state = 406;
			this.string();
			this.state = 408;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 40, this._ctx) ) {
			case 1:
				{
				this.state = 407;
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
		this.enterRule(_localctx, 60, esql_parser.RULE_grokCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 410;
			this.match(esql_parser.GROK);
			this.state = 411;
			this.primaryExpression();
			this.state = 412;
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
		this.enterRule(_localctx, 62, esql_parser.RULE_mvExpandCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 414;
			this.match(esql_parser.MV_EXPAND);
			this.state = 415;
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
		this.enterRule(_localctx, 64, esql_parser.RULE_commandOptions);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 417;
			this.commandOption();
			this.state = 422;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 41, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 418;
					this.match(esql_parser.COMMA);
					this.state = 419;
					this.commandOption();
					}
					}
				}
				this.state = 424;
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
		this.enterRule(_localctx, 66, esql_parser.RULE_commandOption);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 425;
			this.identifier();
			this.state = 426;
			this.match(esql_parser.ASSIGN);
			this.state = 427;
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
		this.enterRule(_localctx, 68, esql_parser.RULE_booleanValue);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 429;
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
		this.enterRule(_localctx, 70, esql_parser.RULE_numericValue);
		try {
			this.state = 433;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 42, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 431;
				this.decimalValue();
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 432;
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
		this.enterRule(_localctx, 72, esql_parser.RULE_decimalValue);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 436;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la === esql_parser.PLUS || _la === esql_parser.MINUS) {
				{
				this.state = 435;
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

			this.state = 438;
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
		this.enterRule(_localctx, 74, esql_parser.RULE_integerValue);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 441;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la === esql_parser.PLUS || _la === esql_parser.MINUS) {
				{
				this.state = 440;
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

			this.state = 443;
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
		this.enterRule(_localctx, 76, esql_parser.RULE_string);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 445;
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
		this.enterRule(_localctx, 78, esql_parser.RULE_comparisonOperator);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 447;
			_la = this._input.LA(1);
			if (!(((((_la - 49)) & ~0x1F) === 0 && ((1 << (_la - 49)) & ((1 << (esql_parser.EQ - 49)) | (1 << (esql_parser.NEQ - 49)) | (1 << (esql_parser.LT - 49)) | (1 << (esql_parser.LTE - 49)) | (1 << (esql_parser.GT - 49)) | (1 << (esql_parser.GTE - 49)))) !== 0))) {
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
		this.enterRule(_localctx, 80, esql_parser.RULE_showCommand);
		try {
			this.state = 453;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 45, this._ctx) ) {
			case 1:
				_localctx = new ShowInfoContext(_localctx);
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 449;
				this.match(esql_parser.SHOW);
				this.state = 450;
				this.match(esql_parser.INFO);
				}
				break;

			case 2:
				_localctx = new ShowFunctionsContext(_localctx);
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 451;
				this.match(esql_parser.SHOW);
				this.state = 452;
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
		this.enterRule(_localctx, 82, esql_parser.RULE_enrichCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 455;
			this.match(esql_parser.ENRICH);
			this.state = 456;
			_localctx._policyName = this.sourceIdentifier();
			this.state = 459;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 46, this._ctx) ) {
			case 1:
				{
				this.state = 457;
				this.match(esql_parser.ON);
				this.state = 458;
				_localctx._matchField = this.sourceIdentifier();
				}
				break;
			}
			this.state = 470;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 48, this._ctx) ) {
			case 1:
				{
				this.state = 461;
				this.match(esql_parser.WITH);
				this.state = 462;
				this.enrichWithClause();
				this.state = 467;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 47, this._ctx);
				while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
					if (_alt === 1) {
						{
						{
						this.state = 463;
						this.match(esql_parser.COMMA);
						this.state = 464;
						this.enrichWithClause();
						}
						}
					}
					this.state = 469;
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
		this.enterRule(_localctx, 84, esql_parser.RULE_enrichWithClause);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 475;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 49, this._ctx) ) {
			case 1:
				{
				this.state = 472;
				_localctx._newName = this.sourceIdentifier();
				this.state = 473;
				this.match(esql_parser.ASSIGN);
				}
				break;
			}
			this.state = 477;
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
		"\x03\uC91D\uCABA\u058D\uAFBA\u4F53\u0607\uEA8B\uC241\x03M\u01E2\x04\x02" +
		"\t\x02\x04\x03\t\x03\x04\x04\t\x04\x04\x05\t\x05\x04\x06\t\x06\x04\x07" +
		"\t\x07\x04\b\t\b\x04\t\t\t\x04\n\t\n\x04\v\t\v\x04\f\t\f\x04\r\t\r\x04" +
		"\x0E\t\x0E\x04\x0F\t\x0F\x04\x10\t\x10\x04\x11\t\x11\x04\x12\t\x12\x04" +
		"\x13\t\x13\x04\x14\t\x14\x04\x15\t\x15\x04\x16\t\x16\x04\x17\t\x17\x04" +
		"\x18\t\x18\x04\x19\t\x19\x04\x1A\t\x1A\x04\x1B\t\x1B\x04\x1C\t\x1C\x04" +
		"\x1D\t\x1D\x04\x1E\t\x1E\x04\x1F\t\x1F\x04 \t \x04!\t!\x04\"\t\"\x04#" +
		"\t#\x04$\t$\x04%\t%\x04&\t&\x04\'\t\'\x04(\t(\x04)\t)\x04*\t*\x04+\t+" +
		"\x04,\t,\x03\x02\x03\x02\x03\x02\x03\x03\x03\x03\x03\x03\x03\x03\x03\x03" +
		"\x03\x03\x07\x03b\n\x03\f\x03\x0E\x03e\v\x03\x03\x04\x03\x04\x03\x04\x05" +
		"\x04j\n\x04\x03\x05\x03\x05\x03\x05\x03\x05\x03\x05\x03\x05\x03\x05\x03" +
		"\x05\x03\x05\x03\x05\x03\x05\x03\x05\x05\x05x\n\x05\x03\x06\x03\x06\x03" +
		"\x06\x03\x07\x03\x07\x03\x07\x03\x07\x03\x07\x03\x07\x03\x07\x05\x07\x84" +
		"\n\x07\x03\x07\x03\x07\x03\x07\x03\x07\x03\x07\x07\x07\x8B\n\x07\f\x07" +
		"\x0E\x07\x8E\v\x07\x03\x07\x03\x07\x03\x07\x03\x07\x03\x07\x05\x07\x95" +
		"\n\x07\x03\x07\x03\x07\x05\x07\x99\n\x07\x03\x07\x03\x07\x03\x07\x03\x07" +
		"\x03\x07\x03\x07\x07\x07\xA1\n\x07\f\x07\x0E\x07\xA4\v\x07\x03\b\x03\b" +
		"\x05\b\xA8\n\b\x03\b\x03\b\x03\b\x03\b\x03\b\x05\b\xAF\n\b\x03\b\x03\b" +
		"\x03\b\x05\b\xB4\n\b\x03\t\x03\t\x03\t\x03\t\x03\t\x05\t\xBB\n\t\x03\n" +
		"\x03\n\x03\n\x03\n\x05\n\xC1\n\n\x03\n\x03\n\x03\n\x03\n\x03\n\x03\n\x07" +
		"\n\xC9\n\n\f\n\x0E\n\xCC\v\n\x03\v\x03\v\x03\v\x03\v\x03\v\x03\v\x03\v" +
		"\x03\v\x03\v\x03\v\x03\v\x07\v\xD9\n\v\f\v\x0E\v\xDC\v\v\x05\v\xDE\n\v" +
		"\x03\v\x03\v\x05\v\xE2\n\v\x03\f\x03\f\x03\f\x03\r\x03\r\x03\r\x07\r\xEA" +
		"\n\r\f\r\x0E\r\xED\v\r\x03\x0E\x03\x0E\x03\x0E\x03\x0E\x03\x0E\x05\x0E" +
		"\xF4\n\x0E\x03\x0F\x03\x0F\x03\x0F\x03\x0F\x07\x0F\xFA\n\x0F\f\x0F\x0E" +
		"\x0F\xFD\v\x0F\x03\x0F\x05\x0F\u0100\n\x0F\x03\x10\x03\x10\x03\x10\x03" +
		"\x10\x03\x10\x07\x10\u0107\n\x10\f\x10\x0E\x10\u010A\v\x10\x03\x10\x03" +
		"\x10\x03\x11\x03\x11\x03\x11\x03\x12\x03\x12\x05\x12\u0113\n\x12\x03\x12" +
		"\x03\x12\x05\x12\u0117\n\x12\x03\x13\x03\x13\x03\x13\x07\x13\u011C\n\x13" +
		"\f\x13\x0E\x13\u011F\v\x13\x03\x14\x03\x14\x03\x15\x03\x15\x03\x15\x07" +
		"\x15\u0126\n\x15\f\x15\x0E\x15\u0129\v\x15\x03\x16\x03\x16\x03\x17\x03" +
		"\x17\x03\x17\x03\x17\x03\x17\x03\x17\x03\x17\x03\x17\x03\x17\x03\x17\x03" +
		"\x17\x03\x17\x03\x17\x07\x17\u013A\n\x17\f\x17\x0E\x17\u013D\v\x17\x03" +
		"\x17\x03\x17\x03\x17\x03\x17\x03\x17\x03\x17\x07\x17\u0145\n\x17\f\x17" +
		"\x0E\x17\u0148\v\x17\x03\x17\x03\x17\x03\x17\x03\x17\x03\x17\x03\x17\x07" +
		"\x17\u0150\n\x17\f\x17\x0E\x17\u0153\v\x17\x03\x17\x03\x17\x05\x17\u0157" +
		"\n\x17\x03\x18\x03\x18\x03\x18\x03\x19\x03\x19\x03\x19\x03\x19\x07\x19" +
		"\u0160\n\x19\f\x19\x0E\x19\u0163\v\x19\x03\x1A\x03\x1A\x05\x1A\u0167\n" +
		"\x1A\x03\x1A\x03\x1A\x05\x1A\u016B\n\x1A\x03\x1B\x03\x1B\x03\x1B\x03\x1B" +
		"\x07\x1B\u0171\n\x1B\f\x1B\x0E\x1B\u0174\v\x1B\x03\x1B\x03\x1B\x03\x1B" +
		"\x03\x1B\x07\x1B\u017A\n\x1B\f\x1B\x0E\x1B\u017D\v\x1B\x05\x1B\u017F\n" +
		"\x1B\x03\x1C\x03\x1C\x03\x1C\x03\x1C\x07\x1C\u0185\n\x1C\f\x1C\x0E\x1C" +
		"\u0188\v\x1C\x03\x1D\x03\x1D\x03\x1D\x03\x1D\x07\x1D\u018E\n\x1D\f\x1D" +
		"\x0E\x1D\u0191\v\x1D\x03\x1E\x03\x1E\x03\x1E\x03\x1E\x03\x1F\x03\x1F\x03" +
		"\x1F\x03\x1F\x05\x1F\u019B\n\x1F\x03 \x03 \x03 \x03 \x03!\x03!\x03!\x03" +
		"\"\x03\"\x03\"\x07\"\u01A7\n\"\f\"\x0E\"\u01AA\v\"\x03#\x03#\x03#\x03" +
		"#\x03$\x03$\x03%\x03%\x05%\u01B4\n%\x03&\x05&\u01B7\n&\x03&\x03&\x03\'" +
		"\x05\'\u01BC\n\'\x03\'\x03\'\x03(\x03(\x03)\x03)\x03*\x03*\x03*\x03*\x05" +
		"*\u01C8\n*\x03+\x03+\x03+\x03+\x05+\u01CE\n+\x03+\x03+\x03+\x03+\x07+" +
		"\u01D4\n+\f+\x0E+\u01D7\v+\x05+\u01D9\n+\x03,\x03,\x03,\x05,\u01DE\n," +
		"\x03,\x03,\x03,\x02\x02\x05\x04\f\x12-\x02\x02\x04\x02\x06\x02\b\x02\n" +
		"\x02\f\x02\x0E\x02\x10\x02\x12\x02\x14\x02\x16\x02\x18\x02\x1A\x02\x1C" +
		"\x02\x1E\x02 \x02\"\x02$\x02&\x02(\x02*\x02,\x02.\x020\x022\x024\x026" +
		"\x028\x02:\x02<\x02>\x02@\x02B\x02D\x02F\x02H\x02J\x02L\x02N\x02P\x02" +
		"R\x02T\x02V\x02\x02\n\x03\x029:\x03\x02;=\x03\x02IJ\x03\x02@A\x04\x02" +
		"\x1C\x1C\x1F\x1F\x03\x02\"#\x04\x02!!//\x03\x0238\x02\u0200\x02X\x03\x02" +
		"\x02\x02\x04[\x03\x02\x02\x02\x06i\x03\x02\x02\x02\bw\x03\x02\x02\x02" +
		"\ny\x03\x02\x02\x02\f\x98\x03\x02\x02\x02\x0E\xB3\x03\x02\x02\x02\x10" +
		"\xBA\x03\x02\x02\x02\x12\xC0\x03\x02\x02\x02\x14\xE1\x03\x02\x02\x02\x16" +
		"\xE3\x03\x02\x02\x02\x18\xE6\x03\x02\x02\x02\x1A\xF3\x03\x02\x02\x02\x1C" +
		"\xF5\x03\x02\x02\x02\x1E\u0101\x03\x02\x02\x02 \u010D\x03\x02\x02\x02" +
		"\"\u0110\x03\x02\x02\x02$\u0118\x03\x02\x02\x02&\u0120\x03\x02\x02\x02" +
		"(\u0122\x03\x02\x02\x02*\u012A\x03\x02\x02\x02,\u0156\x03\x02\x02\x02" +
		".\u0158\x03\x02\x02\x020\u015B\x03\x02\x02\x022\u0164\x03\x02\x02\x02" +
		"4\u017E\x03\x02\x02\x026\u0180\x03\x02\x02\x028\u0189\x03\x02\x02\x02" +
		":\u0192\x03\x02\x02\x02<\u0196\x03\x02\x02\x02>\u019C\x03\x02\x02\x02" +
		"@\u01A0\x03\x02\x02\x02B\u01A3\x03\x02\x02\x02D\u01AB\x03\x02\x02\x02" +
		"F\u01AF\x03\x02\x02\x02H\u01B3\x03\x02\x02\x02J\u01B6\x03\x02\x02\x02" +
		"L\u01BB\x03\x02\x02\x02N\u01BF\x03\x02\x02\x02P\u01C1\x03\x02\x02\x02" +
		"R\u01C7\x03\x02\x02\x02T\u01C9\x03\x02\x02\x02V\u01DD\x03\x02\x02\x02" +
		"XY\x05\x04\x03\x02YZ\x07\x02\x02\x03Z\x03\x03\x02\x02\x02[\\\b\x03\x01" +
		"\x02\\]\x05\x06\x04\x02]c\x03\x02\x02\x02^_\f\x03\x02\x02_`\x07\x16\x02" +
		"\x02`b\x05\b\x05\x02a^\x03\x02\x02\x02be\x03\x02\x02\x02ca\x03\x02\x02" +
		"\x02cd\x03\x02\x02\x02d\x05\x03\x02\x02\x02ec\x03\x02\x02\x02fj\x05\x1C" +
		"\x0F\x02gj\x05\x16\f\x02hj\x05R*\x02if\x03\x02\x02\x02ig\x03\x02\x02\x02" +
		"ih\x03\x02\x02\x02j\x07\x03\x02\x02\x02kx\x05 \x11\x02lx\x05.\x18\x02" +
		"mx\x054\x1B\x02nx\x050\x19\x02ox\x05\"\x12\x02px\x05\n\x06\x02qx\x056" +
		"\x1C\x02rx\x058\x1D\x02sx\x05<\x1F\x02tx\x05> \x02ux\x05T+\x02vx\x05@" +
		"!\x02wk\x03\x02\x02\x02wl\x03\x02\x02\x02wm\x03\x02\x02\x02wn\x03\x02" +
		"\x02\x02wo\x03\x02\x02\x02wp\x03\x02\x02\x02wq\x03\x02\x02\x02wr\x03\x02" +
		"\x02\x02ws\x03\x02\x02\x02wt\x03\x02\x02\x02wu\x03\x02\x02\x02wv\x03\x02" +
		"\x02\x02x\t\x03\x02\x02\x02yz\x07\x12\x02\x02z{\x05\f\x07\x02{\v\x03\x02" +
		"\x02\x02|}\b\x07\x01\x02}~\x07(\x02\x02~\x99\x05\f\x07\t\x7F\x99\x05\x10" +
		"\t\x02\x80\x99\x05\x0E\b\x02\x81\x83\x05\x10\t\x02\x82\x84\x07(\x02\x02" +
		"\x83\x82\x03\x02\x02\x02\x83\x84\x03\x02\x02\x02\x84\x85\x03\x02\x02\x02" +
		"\x85\x86\x07%\x02\x02\x86\x87\x07$\x02\x02\x87\x8C\x05\x10\t\x02\x88\x89" +
		"\x07\x1E\x02\x02\x89\x8B\x05\x10\t\x02\x8A\x88\x03\x02\x02\x02\x8B\x8E" +
		"\x03\x02\x02\x02\x8C\x8A\x03\x02\x02\x02\x8C\x8D\x03\x02\x02\x02\x8D\x8F" +
		"\x03\x02\x02\x02\x8E\x8C\x03\x02\x02\x02\x8F\x90\x07.\x02\x02\x90\x99" +
		"\x03\x02\x02\x02\x91\x92\x05\x10\t\x02\x92\x94\x07&\x02\x02\x93\x95\x07" +
		"(\x02\x02\x94\x93\x03\x02\x02\x02\x94\x95\x03\x02\x02\x02\x95\x96\x03" +
		"\x02\x02\x02\x96\x97\x07)\x02\x02\x97\x99\x03\x02\x02\x02\x98|\x03\x02" +
		"\x02\x02\x98\x7F\x03\x02\x02\x02\x98\x80\x03\x02\x02\x02\x98\x81\x03\x02" +
		"\x02\x02\x98\x91\x03\x02\x02\x02\x99\xA2\x03\x02\x02\x02\x9A\x9B\f\x06" +
		"\x02\x02\x9B\x9C\x07\x1B\x02\x02\x9C\xA1\x05\f\x07\x07\x9D\x9E\f\x05\x02" +
		"\x02\x9E\x9F\x07+\x02\x02\x9F\xA1\x05\f\x07\x06\xA0\x9A\x03\x02\x02\x02" +
		"\xA0\x9D\x03\x02\x02\x02\xA1\xA4\x03\x02\x02\x02\xA2\xA0\x03\x02\x02\x02" +
		"\xA2\xA3\x03\x02\x02\x02\xA3\r\x03\x02\x02\x02\xA4\xA2\x03\x02\x02\x02" +
		"\xA5\xA7\x05\x10\t\x02\xA6\xA8\x07(\x02\x02\xA7\xA6\x03\x02\x02\x02\xA7" +
		"\xA8\x03\x02\x02\x02\xA8\xA9\x03\x02\x02\x02\xA9\xAA\x07\'\x02\x02\xAA" +
		"\xAB\x05N(\x02\xAB\xB4\x03\x02\x02\x02\xAC\xAE\x05\x10\t\x02\xAD\xAF\x07" +
		"(\x02\x02\xAE\xAD\x03\x02\x02\x02\xAE\xAF\x03\x02\x02\x02\xAF\xB0\x03" +
		"\x02\x02\x02\xB0\xB1\x07-\x02\x02\xB1\xB2\x05N(\x02\xB2\xB4\x03\x02\x02" +
		"\x02\xB3\xA5\x03\x02\x02\x02\xB3\xAC\x03\x02\x02\x02\xB4\x0F\x03\x02\x02" +
		"\x02\xB5\xBB\x05\x12\n\x02\xB6\xB7\x05\x12\n\x02\xB7\xB8\x05P)\x02\xB8" +
		"\xB9\x05\x12\n\x02\xB9\xBB\x03\x02\x02\x02\xBA\xB5\x03\x02\x02\x02\xBA" +
		"\xB6\x03\x02\x02\x02\xBB\x11\x03\x02\x02\x02\xBC\xBD\b\n\x01\x02\xBD\xC1" +
		"\x05\x14\v\x02\xBE\xBF\t\x02\x02\x02\xBF\xC1\x05\x12\n\x05\xC0\xBC\x03" +
		"\x02\x02\x02\xC0\xBE\x03\x02\x02\x02\xC1\xCA\x03\x02\x02\x02\xC2\xC3\f" +
		"\x04\x02\x02\xC3\xC4\t\x03\x02\x02\xC4\xC9\x05\x12\n\x05\xC5\xC6\f\x03" +
		"\x02\x02\xC6\xC7\t\x02\x02\x02\xC7\xC9\x05\x12\n\x04\xC8\xC2\x03\x02\x02" +
		"\x02\xC8\xC5\x03\x02\x02\x02\xC9\xCC\x03\x02\x02\x02\xCA\xC8\x03\x02\x02" +
		"\x02\xCA\xCB\x03\x02\x02\x02\xCB\x13\x03\x02\x02\x02\xCC\xCA\x03\x02\x02" +
		"\x02\xCD\xE2\x05,\x17\x02\xCE\xE2\x05(\x15\x02\xCF\xD0\x07$\x02\x02\xD0" +
		"\xD1\x05\f\x07\x02\xD1\xD2\x07.\x02\x02\xD2\xE2\x03\x02\x02\x02\xD3\xD4" +
		"\x05*\x16\x02\xD4\xDD\x07$\x02\x02\xD5\xDA\x05\f\x07\x02\xD6\xD7\x07\x1E" +
		"\x02\x02\xD7\xD9\x05\f\x07\x02\xD8\xD6\x03\x02\x02\x02\xD9\xDC\x03\x02" +
		"\x02\x02\xDA\xD8\x03\x02\x02\x02\xDA\xDB\x03\x02\x02\x02\xDB\xDE\x03\x02" +
		"\x02\x02\xDC\xDA\x03\x02\x02\x02\xDD\xD5\x03\x02\x02\x02\xDD\xDE\x03\x02" +
		"\x02\x02\xDE\xDF\x03\x02\x02\x02\xDF\xE0\x07.\x02\x02\xE0\xE2\x03\x02" +
		"\x02\x02\xE1\xCD\x03\x02\x02\x02\xE1\xCE\x03\x02\x02\x02\xE1\xCF\x03\x02" +
		"\x02\x02\xE1\xD3\x03\x02\x02\x02\xE2\x15\x03\x02\x02\x02\xE3\xE4\x07\x0E" +
		"\x02\x02\xE4\xE5\x05\x18\r\x02\xE5\x17\x03\x02\x02\x02\xE6\xEB\x05\x1A" +
		"\x0E\x02\xE7\xE8\x07\x1E\x02\x02\xE8\xEA\x05\x1A\x0E\x02\xE9\xE7\x03\x02" +
		"\x02\x02\xEA\xED\x03\x02\x02\x02\xEB\xE9\x03\x02\x02\x02\xEB\xEC\x03\x02" +
		"\x02\x02\xEC\x19\x03\x02\x02\x02\xED\xEB\x03\x02\x02\x02\xEE\xF4\x05\f" +
		"\x07\x02\xEF\xF0\x05(\x15\x02\xF0\xF1\x07\x1D\x02\x02\xF1\xF2\x05\f\x07" +
		"\x02\xF2\xF4\x03\x02\x02\x02\xF3\xEE\x03\x02\x02\x02\xF3\xEF\x03\x02\x02" +
		"\x02\xF4\x1B\x03\x02\x02\x02\xF5\xF6\x07\x07\x02\x02\xF6\xFB\x05&\x14" +
		"\x02\xF7\xF8\x07\x1E\x02\x02\xF8\xFA\x05&\x14\x02\xF9\xF7\x03\x02\x02" +
		"\x02\xFA\xFD\x03\x02\x02\x02\xFB\xF9\x03\x02\x02\x02\xFB\xFC\x03\x02\x02" +
		"\x02\xFC\xFF\x03\x02\x02\x02\xFD\xFB\x03\x02\x02\x02\xFE\u0100\x05\x1E" +
		"\x10\x02\xFF\xFE\x03\x02\x02\x02\xFF\u0100\x03\x02\x02\x02\u0100\x1D\x03" +
		"\x02\x02\x02\u0101\u0102\x07>\x02\x02\u0102\u0103\x07F\x02\x02\u0103\u0108" +
		"\x05&\x14\x02\u0104\u0105\x07\x1E\x02\x02\u0105\u0107\x05&\x14\x02\u0106" +
		"\u0104\x03\x02\x02\x02\u0107\u010A\x03\x02\x02\x02\u0108\u0106\x03\x02" +
		"\x02\x02\u0108\u0109\x03\x02\x02\x02\u0109\u010B\x03\x02\x02\x02\u010A" +
		"\u0108\x03\x02\x02\x02\u010B\u010C\x07?\x02\x02\u010C\x1F\x03\x02\x02" +
		"\x02\u010D\u010E\x07\x06\x02\x02\u010E\u010F\x05\x18\r\x02\u010F!\x03" +
		"\x02\x02\x02\u0110\u0112\x07\x11\x02\x02\u0111\u0113\x05\x18\r\x02\u0112" +
		"\u0111\x03\x02\x02\x02\u0112\u0113\x03\x02\x02\x02\u0113\u0116\x03\x02" +
		"\x02\x02\u0114\u0115\x07\x1A\x02\x02\u0115\u0117\x05$\x13\x02\u0116\u0114" +
		"\x03\x02\x02\x02\u0116\u0117\x03\x02\x02\x02\u0117#\x03\x02\x02\x02\u0118" +
		"\u011D\x05(\x15\x02\u0119\u011A\x07\x1E\x02\x02\u011A\u011C\x05(\x15\x02" +
		"\u011B\u0119\x03\x02\x02\x02\u011C\u011F\x03\x02\x02\x02\u011D\u011B\x03" +
		"\x02\x02\x02\u011D\u011E\x03\x02\x02\x02\u011E%\x03\x02\x02\x02\u011F" +
		"\u011D\x03\x02\x02\x02\u0120\u0121\t\x04\x02\x02\u0121\'\x03\x02\x02\x02" +
		"\u0122\u0127\x05*\x16\x02\u0123\u0124\x07 \x02\x02\u0124\u0126\x05*\x16" +
		"\x02\u0125\u0123\x03\x02\x02\x02\u0126\u0129\x03\x02\x02\x02\u0127\u0125" +
		"\x03\x02\x02\x02\u0127\u0128\x03\x02\x02\x02\u0128)\x03\x02\x02\x02\u0129" +
		"\u0127\x03\x02\x02\x02\u012A\u012B\t\x05\x02\x02\u012B+\x03\x02\x02\x02" +
		"\u012C\u0157\x07)\x02\x02\u012D\u012E\x05L\'\x02\u012E\u012F\x07@\x02" +
		"\x02\u012F\u0157\x03\x02\x02\x02\u0130\u0157\x05J&\x02\u0131\u0157\x05" +
		"L\'\x02\u0132\u0157\x05F$\x02\u0133\u0157\x07,\x02\x02\u0134\u0157\x05" +
		"N(\x02\u0135\u0136\x07>\x02\x02\u0136\u013B\x05H%\x02\u0137\u0138\x07" +
		"\x1E\x02\x02\u0138\u013A\x05H%\x02\u0139\u0137\x03\x02\x02\x02\u013A\u013D" +
		"\x03\x02\x02\x02\u013B\u0139\x03\x02\x02\x02\u013B\u013C\x03\x02\x02\x02" +
		"\u013C\u013E\x03\x02\x02\x02\u013D\u013B\x03\x02\x02\x02\u013E\u013F\x07" +
		"?\x02\x02\u013F\u0157\x03\x02\x02\x02\u0140\u0141\x07>\x02\x02\u0141\u0146" +
		"\x05F$\x02\u0142\u0143\x07\x1E\x02\x02\u0143\u0145\x05F$\x02\u0144\u0142" +
		"\x03\x02\x02\x02\u0145\u0148\x03\x02\x02\x02\u0146\u0144\x03\x02\x02\x02" +
		"\u0146\u0147\x03\x02\x02\x02\u0147\u0149\x03\x02\x02\x02\u0148\u0146\x03" +
		"\x02\x02\x02\u0149\u014A\x07?\x02\x02\u014A\u0157\x03\x02\x02\x02\u014B" +
		"\u014C\x07>\x02\x02\u014C\u0151\x05N(\x02\u014D\u014E\x07\x1E\x02\x02" +
		"\u014E\u0150\x05N(\x02\u014F\u014D\x03\x02\x02\x02\u0150\u0153\x03\x02" +
		"\x02\x02\u0151\u014F\x03\x02\x02\x02\u0151\u0152\x03\x02\x02\x02\u0152" +
		"\u0154\x03\x02\x02\x02\u0153\u0151\x03\x02\x02\x02\u0154\u0155\x07?\x02" +
		"\x02\u0155\u0157\x03\x02\x02\x02\u0156\u012C\x03\x02\x02\x02\u0156\u012D" +
		"\x03\x02\x02\x02\u0156\u0130\x03\x02\x02\x02\u0156\u0131\x03\x02\x02\x02" +
		"\u0156\u0132\x03\x02\x02\x02\u0156\u0133\x03\x02\x02\x02\u0156\u0134\x03" +
		"\x02\x02\x02\u0156\u0135\x03\x02\x02\x02\u0156\u0140\x03\x02\x02\x02\u0156" +
		"\u014B\x03\x02\x02\x02\u0157-\x03\x02\x02\x02\u0158\u0159\x07\n\x02\x02" +
		"\u0159\u015A\x07\x18\x02\x02\u015A/\x03\x02\x02\x02\u015B\u015C\x07\x10" +
		"\x02\x02\u015C\u0161\x052\x1A\x02\u015D\u015E\x07\x1E\x02\x02\u015E\u0160" +
		"\x052\x1A\x02\u015F\u015D\x03\x02\x02\x02\u0160\u0163\x03\x02\x02\x02" +
		"\u0161\u015F\x03\x02\x02\x02\u0161\u0162\x03\x02\x02\x02\u01621\x03\x02" +
		"\x02\x02\u0163\u0161\x03\x02\x02\x02\u0164\u0166\x05\f\x07\x02\u0165\u0167" +
		"\t\x06\x02\x02\u0166\u0165\x03\x02\x02\x02\u0166\u0167\x03\x02\x02\x02" +
		"\u0167\u016A\x03\x02\x02\x02\u0168\u0169\x07*\x02\x02\u0169\u016B\t\x07" +
		"\x02\x02\u016A\u0168\x03\x02\x02\x02\u016A\u016B\x03\x02\x02\x02\u016B" +
		"3\x03\x02\x02\x02\u016C\u016D\x07\t\x02\x02\u016D\u0172\x05&\x14\x02\u016E" +
		"\u016F\x07\x1E\x02\x02\u016F\u0171\x05&\x14\x02\u0170\u016E\x03\x02\x02" +
		"\x02\u0171\u0174\x03\x02\x02\x02\u0172\u0170\x03\x02\x02\x02\u0172\u0173" +
		"\x03\x02\x02\x02\u0173\u017F\x03\x02\x02\x02\u0174\u0172\x03\x02\x02\x02" +
		"\u0175\u0176\x07\f\x02\x02\u0176\u017B\x05&\x14\x02\u0177\u0178\x07\x1E" +
		"\x02\x02\u0178\u017A\x05&\x14\x02\u0179\u0177\x03\x02\x02\x02\u017A\u017D" +
		"\x03\x02\x02\x02\u017B\u0179\x03\x02\x02\x02\u017B\u017C\x03\x02\x02\x02" +
		"\u017C\u017F\x03\x02\x02\x02\u017D\u017B\x03\x02\x02\x02\u017E\u016C\x03" +
		"\x02\x02\x02\u017E\u0175\x03\x02\x02\x02\u017F5\x03\x02\x02\x02\u0180" +
		"\u0181\x07\x04\x02\x02\u0181\u0186\x05&\x14\x02\u0182\u0183\x07\x1E\x02" +
		"\x02\u0183\u0185\x05&\x14\x02\u0184\u0182\x03\x02\x02\x02\u0185\u0188" +
		"\x03\x02\x02\x02\u0186\u0184\x03\x02\x02\x02\u0186\u0187\x03\x02\x02\x02" +
		"\u01877\x03\x02\x02\x02\u0188\u0186\x03\x02\x02\x02\u0189\u018A\x07\r" +
		"\x02\x02\u018A\u018F\x05:\x1E\x02\u018B\u018C\x07\x1E\x02\x02\u018C\u018E" +
		"\x05:\x1E\x02\u018D\u018B\x03\x02\x02\x02\u018E\u0191\x03\x02\x02\x02" +
		"\u018F\u018D\x03\x02\x02\x02\u018F\u0190\x03\x02\x02\x02\u01909\x03\x02" +
		"\x02\x02\u0191\u018F\x03\x02\x02\x02\u0192\u0193\x05&\x14\x02\u0193\u0194" +
		"\x07E\x02\x02\u0194\u0195\x05&\x14\x02\u0195;\x03\x02\x02\x02\u0196\u0197" +
		"\x07\x03\x02\x02\u0197\u0198\x05\x14\v\x02\u0198\u019A\x05N(\x02\u0199" +
		"\u019B\x05B\"\x02\u019A\u0199\x03\x02\x02\x02\u019A\u019B\x03\x02\x02" +
		"\x02\u019B=\x03\x02\x02\x02\u019C\u019D\x07\b\x02\x02\u019D\u019E\x05" +
		"\x14\v\x02\u019E\u019F\x05N(\x02\u019F?\x03\x02\x02\x02\u01A0\u01A1\x07" +
		"\v\x02\x02\u01A1\u01A2\x05&\x14\x02\u01A2A\x03\x02\x02\x02\u01A3\u01A8" +
		"\x05D#\x02\u01A4\u01A5\x07\x1E\x02\x02\u01A5\u01A7\x05D#\x02\u01A6\u01A4" +
		"\x03\x02\x02\x02\u01A7\u01AA\x03\x02\x02\x02\u01A8\u01A6\x03\x02\x02\x02" +
		"\u01A8\u01A9\x03\x02\x02\x02\u01A9C\x03\x02\x02\x02\u01AA\u01A8\x03\x02" +
		"\x02\x02\u01AB\u01AC\x05*\x16\x02\u01AC\u01AD\x07\x1D\x02\x02\u01AD\u01AE" +
		"\x05,\x17\x02\u01AEE\x03\x02\x02\x02\u01AF\u01B0\t\b\x02\x02\u01B0G\x03" +
		"\x02\x02\x02\u01B1\u01B4\x05J&\x02\u01B2\u01B4\x05L\'\x02\u01B3\u01B1" +
		"\x03\x02\x02\x02\u01B3\u01B2\x03\x02\x02\x02\u01B4I\x03\x02\x02\x02\u01B5" +
		"\u01B7\t\x02\x02\x02\u01B6\u01B5\x03\x02\x02\x02\u01B6\u01B7\x03\x02\x02" +
		"\x02\u01B7\u01B8\x03\x02\x02\x02\u01B8\u01B9\x07\x19\x02\x02\u01B9K\x03" +
		"\x02\x02\x02\u01BA\u01BC\t\x02\x02\x02\u01BB\u01BA\x03\x02\x02\x02\u01BB" +
		"\u01BC\x03\x02\x02\x02\u01BC\u01BD\x03\x02\x02\x02\u01BD\u01BE\x07\x18" +
		"\x02\x02\u01BEM\x03\x02\x02\x02\u01BF\u01C0\x07\x17\x02\x02\u01C0O\x03" +
		"\x02\x02\x02\u01C1\u01C2\t\t\x02\x02\u01C2Q\x03\x02\x02\x02\u01C3\u01C4" +
		"\x07\x0F\x02\x02\u01C4\u01C8\x070\x02\x02\u01C5\u01C6\x07\x0F\x02\x02" +
		"\u01C6\u01C8\x071\x02\x02\u01C7\u01C3\x03\x02\x02\x02\u01C7\u01C5\x03" +
		"\x02\x02\x02\u01C8S\x03\x02\x02\x02\u01C9\u01CA\x07\x05\x02\x02\u01CA" +
		"\u01CD\x05&\x14\x02\u01CB\u01CC\x07G\x02\x02\u01CC\u01CE\x05&\x14\x02" +
		"\u01CD\u01CB\x03\x02\x02\x02\u01CD\u01CE\x03\x02\x02\x02\u01CE\u01D8\x03" +
		"\x02\x02\x02\u01CF\u01D0\x07H\x02\x02\u01D0\u01D5\x05V,\x02\u01D1\u01D2" +
		"\x07\x1E\x02\x02\u01D2\u01D4\x05V,\x02\u01D3\u01D1\x03\x02\x02\x02\u01D4" +
		"\u01D7\x03\x02\x02\x02\u01D5\u01D3\x03\x02\x02\x02\u01D5\u01D6\x03\x02" +
		"\x02\x02\u01D6\u01D9\x03\x02\x02\x02\u01D7\u01D5\x03\x02\x02\x02\u01D8" +
		"\u01CF\x03\x02\x02\x02\u01D8\u01D9\x03\x02\x02\x02\u01D9U\x03\x02\x02" +
		"\x02\u01DA\u01DB\x05&\x14\x02\u01DB\u01DC\x07\x1D\x02\x02\u01DC\u01DE" +
		"\x03\x02\x02\x02\u01DD\u01DA\x03\x02\x02\x02\u01DD\u01DE\x03\x02\x02\x02" +
		"\u01DE\u01DF\x03\x02\x02\x02\u01DF\u01E0\x05&\x14\x02\u01E0W\x03\x02\x02" +
		"\x024ciw\x83\x8C\x94\x98\xA0\xA2\xA7\xAE\xB3\xBA\xC0\xC8\xCA\xDA\xDD\xE1" +
		"\xEB\xF3\xFB\xFF\u0108\u0112\u0116\u011D\u0127\u013B\u0146\u0151\u0156" +
		"\u0161\u0166\u016A\u0172\u017B\u017E\u0186\u018F\u019A\u01A8\u01B3\u01B6" +
		"\u01BB\u01C7\u01CD\u01D5\u01D8\u01DD";
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
export class FunctionExpressionContext extends PrimaryExpressionContext {
	public identifier(): IdentifierContext {
		return this.getRuleContext(0, IdentifierContext);
	}
	public LP(): TerminalNode { return this.getToken(esql_parser.LP, 0); }
	public RP(): TerminalNode { return this.getToken(esql_parser.RP, 0); }
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
	constructor(ctx: PrimaryExpressionContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
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


