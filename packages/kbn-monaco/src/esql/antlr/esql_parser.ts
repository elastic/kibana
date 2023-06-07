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
	public static readonly GROK = 2;
	public static readonly EVAL = 3;
	public static readonly EXPLAIN = 4;
	public static readonly FROM = 5;
	public static readonly ROW = 6;
	public static readonly STATS = 7;
	public static readonly WHERE = 8;
	public static readonly SORT = 9;
	public static readonly MV_EXPAND = 10;
	public static readonly LIMIT = 11;
	public static readonly PROJECT = 12;
	public static readonly DROP = 13;
	public static readonly RENAME = 14;
	public static readonly SHOW = 15;
	public static readonly LINE_COMMENT = 16;
	public static readonly MULTILINE_COMMENT = 17;
	public static readonly WS = 18;
	public static readonly EXPLAIN_WS = 19;
	public static readonly EXPLAIN_LINE_COMMENT = 20;
	public static readonly EXPLAIN_MULTILINE_COMMENT = 21;
	public static readonly PIPE = 22;
	public static readonly STRING = 23;
	public static readonly INTEGER_LITERAL = 24;
	public static readonly DECIMAL_LITERAL = 25;
	public static readonly BY = 26;
	public static readonly DATE_LITERAL = 27;
	public static readonly AND = 28;
	public static readonly ASSIGN = 29;
	public static readonly COMMA = 30;
	public static readonly DOT = 31;
	public static readonly LP = 32;
	public static readonly OPENING_BRACKET = 33;
	public static readonly CLOSING_BRACKET = 34;
	public static readonly NOT = 35;
	public static readonly LIKE = 36;
	public static readonly RLIKE = 37;
	public static readonly IN = 38;
	public static readonly NULL = 39;
	public static readonly OR = 40;
	public static readonly RP = 41;
	public static readonly UNDERSCORE = 42;
	public static readonly INFO = 43;
	public static readonly FUNCTIONS = 44;
	public static readonly BOOLEAN_VALUE = 45;
	public static readonly COMPARISON_OPERATOR = 46;
	public static readonly PLUS = 47;
	public static readonly MINUS = 48;
	public static readonly ASTERISK = 49;
	public static readonly SLASH = 50;
	public static readonly PERCENT = 51;
	public static readonly ORDERING = 52;
	public static readonly NULLS_ORDERING = 53;
	public static readonly NULLS_ORDERING_DIRECTION = 54;
	public static readonly MATH_FUNCTION = 55;
	public static readonly UNARY_FUNCTION = 56;
	public static readonly WHERE_FUNCTIONS = 57;
	public static readonly UNQUOTED_IDENTIFIER = 58;
	public static readonly QUOTED_IDENTIFIER = 59;
	public static readonly EXPR_LINE_COMMENT = 60;
	public static readonly EXPR_MULTILINE_COMMENT = 61;
	public static readonly EXPR_WS = 62;
	public static readonly SRC_UNQUOTED_IDENTIFIER = 63;
	public static readonly SRC_QUOTED_IDENTIFIER = 64;
	public static readonly SRC_LINE_COMMENT = 65;
	public static readonly SRC_MULTILINE_COMMENT = 66;
	public static readonly SRC_WS = 67;
	public static readonly EXPLAIN_PIPE = 68;
	public static readonly RULE_singleStatement = 0;
	public static readonly RULE_query = 1;
	public static readonly RULE_sourceCommand = 2;
	public static readonly RULE_processingCommand = 3;
	public static readonly RULE_mvExpandCommand = 4;
	public static readonly RULE_whereCommand = 5;
	public static readonly RULE_whereBooleanExpression = 6;
	public static readonly RULE_booleanExpression = 7;
	public static readonly RULE_regexBooleanExpression = 8;
	public static readonly RULE_valueExpression = 9;
	public static readonly RULE_comparison = 10;
	public static readonly RULE_mathFn = 11;
	public static readonly RULE_mathEvalFn = 12;
	public static readonly RULE_operatorExpression = 13;
	public static readonly RULE_primaryExpression = 14;
	public static readonly RULE_rowCommand = 15;
	public static readonly RULE_fields = 16;
	public static readonly RULE_field = 17;
	public static readonly RULE_userVariable = 18;
	public static readonly RULE_fromCommand = 19;
	public static readonly RULE_evalCommand = 20;
	public static readonly RULE_statsCommand = 21;
	public static readonly RULE_sourceIdentifier = 22;
	public static readonly RULE_functionExpressionArgument = 23;
	public static readonly RULE_mathFunctionExpressionArgument = 24;
	public static readonly RULE_qualifiedName = 25;
	public static readonly RULE_qualifiedNames = 26;
	public static readonly RULE_identifier = 27;
	public static readonly RULE_mathFunctionIdentifier = 28;
	public static readonly RULE_functionIdentifier = 29;
	public static readonly RULE_constant = 30;
	public static readonly RULE_numericValue = 31;
	public static readonly RULE_limitCommand = 32;
	public static readonly RULE_sortCommand = 33;
	public static readonly RULE_orderExpression = 34;
	public static readonly RULE_projectCommand = 35;
	public static readonly RULE_dropCommand = 36;
	public static readonly RULE_renameVariable = 37;
	public static readonly RULE_renameCommand = 38;
	public static readonly RULE_renameClause = 39;
	public static readonly RULE_dissectCommand = 40;
	public static readonly RULE_grokCommand = 41;
	public static readonly RULE_commandOptions = 42;
	public static readonly RULE_commandOption = 43;
	public static readonly RULE_booleanValue = 44;
	public static readonly RULE_number = 45;
	public static readonly RULE_decimalValue = 46;
	public static readonly RULE_integerValue = 47;
	public static readonly RULE_string = 48;
	public static readonly RULE_comparisonOperator = 49;
	public static readonly RULE_explainCommand = 50;
	public static readonly RULE_subqueryExpression = 51;
	public static readonly RULE_showCommand = 52;
	// tslint:disable:no-trailing-whitespace
	public static readonly ruleNames: string[] = [
		"singleStatement", "query", "sourceCommand", "processingCommand", "mvExpandCommand", 
		"whereCommand", "whereBooleanExpression", "booleanExpression", "regexBooleanExpression", 
		"valueExpression", "comparison", "mathFn", "mathEvalFn", "operatorExpression", 
		"primaryExpression", "rowCommand", "fields", "field", "userVariable", 
		"fromCommand", "evalCommand", "statsCommand", "sourceIdentifier", "functionExpressionArgument", 
		"mathFunctionExpressionArgument", "qualifiedName", "qualifiedNames", "identifier", 
		"mathFunctionIdentifier", "functionIdentifier", "constant", "numericValue", 
		"limitCommand", "sortCommand", "orderExpression", "projectCommand", "dropCommand", 
		"renameVariable", "renameCommand", "renameClause", "dissectCommand", "grokCommand", 
		"commandOptions", "commandOption", "booleanValue", "number", "decimalValue", 
		"integerValue", "string", "comparisonOperator", "explainCommand", "subqueryExpression", 
		"showCommand",
	];

	private static readonly _LITERAL_NAMES: Array<string | undefined> = [
		undefined, undefined, undefined, undefined, undefined, undefined, undefined, 
		undefined, undefined, undefined, undefined, undefined, undefined, undefined, 
		undefined, undefined, undefined, undefined, undefined, undefined, undefined, 
		undefined, undefined, undefined, undefined, undefined, "'by'", undefined, 
		"'and'", undefined, undefined, "'.'", "'('", undefined, "']'", "'not'", 
		undefined, undefined, undefined, "'null'", "'or'", "')'", "'_'", "'info'", 
		"'functions'", undefined, undefined, "'+'", "'-'", "'*'", "'/'", "'%'", 
		undefined, "'nulls'",
	];
	private static readonly _SYMBOLIC_NAMES: Array<string | undefined> = [
		undefined, "DISSECT", "GROK", "EVAL", "EXPLAIN", "FROM", "ROW", "STATS", 
		"WHERE", "SORT", "MV_EXPAND", "LIMIT", "PROJECT", "DROP", "RENAME", "SHOW", 
		"LINE_COMMENT", "MULTILINE_COMMENT", "WS", "EXPLAIN_WS", "EXPLAIN_LINE_COMMENT", 
		"EXPLAIN_MULTILINE_COMMENT", "PIPE", "STRING", "INTEGER_LITERAL", "DECIMAL_LITERAL", 
		"BY", "DATE_LITERAL", "AND", "ASSIGN", "COMMA", "DOT", "LP", "OPENING_BRACKET", 
		"CLOSING_BRACKET", "NOT", "LIKE", "RLIKE", "IN", "NULL", "OR", "RP", "UNDERSCORE", 
		"INFO", "FUNCTIONS", "BOOLEAN_VALUE", "COMPARISON_OPERATOR", "PLUS", "MINUS", 
		"ASTERISK", "SLASH", "PERCENT", "ORDERING", "NULLS_ORDERING", "NULLS_ORDERING_DIRECTION", 
		"MATH_FUNCTION", "UNARY_FUNCTION", "WHERE_FUNCTIONS", "UNQUOTED_IDENTIFIER", 
		"QUOTED_IDENTIFIER", "EXPR_LINE_COMMENT", "EXPR_MULTILINE_COMMENT", "EXPR_WS", 
		"SRC_UNQUOTED_IDENTIFIER", "SRC_QUOTED_IDENTIFIER", "SRC_LINE_COMMENT", 
		"SRC_MULTILINE_COMMENT", "SRC_WS", "EXPLAIN_PIPE",
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
			this.state = 106;
			this.query(0);
			this.state = 107;
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

			this.state = 110;
			this.sourceCommand();
			}
			this._ctx._stop = this._input.tryLT(-1);
			this.state = 117;
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
					this.state = 112;
					if (!(this.precpred(this._ctx, 1))) {
						throw new FailedPredicateException(this, "this.precpred(this._ctx, 1)");
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
			this.state = 124;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case esql_parser.EXPLAIN:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 120;
				this.explainCommand();
				}
				break;
			case esql_parser.FROM:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 121;
				this.fromCommand();
				}
				break;
			case esql_parser.ROW:
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 122;
				this.rowCommand();
				}
				break;
			case esql_parser.SHOW:
				this.enterOuterAlt(_localctx, 4);
				{
				this.state = 123;
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
			this.state = 137;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case esql_parser.EVAL:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 126;
				this.evalCommand();
				}
				break;
			case esql_parser.LIMIT:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 127;
				this.limitCommand();
				}
				break;
			case esql_parser.PROJECT:
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 128;
				this.projectCommand();
				}
				break;
			case esql_parser.RENAME:
				this.enterOuterAlt(_localctx, 4);
				{
				this.state = 129;
				this.renameCommand();
				}
				break;
			case esql_parser.DROP:
				this.enterOuterAlt(_localctx, 5);
				{
				this.state = 130;
				this.dropCommand();
				}
				break;
			case esql_parser.DISSECT:
				this.enterOuterAlt(_localctx, 6);
				{
				this.state = 131;
				this.dissectCommand();
				}
				break;
			case esql_parser.GROK:
				this.enterOuterAlt(_localctx, 7);
				{
				this.state = 132;
				this.grokCommand();
				}
				break;
			case esql_parser.SORT:
				this.enterOuterAlt(_localctx, 8);
				{
				this.state = 133;
				this.sortCommand();
				}
				break;
			case esql_parser.STATS:
				this.enterOuterAlt(_localctx, 9);
				{
				this.state = 134;
				this.statsCommand();
				}
				break;
			case esql_parser.WHERE:
				this.enterOuterAlt(_localctx, 10);
				{
				this.state = 135;
				this.whereCommand();
				}
				break;
			case esql_parser.MV_EXPAND:
				this.enterOuterAlt(_localctx, 11);
				{
				this.state = 136;
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
	public mvExpandCommand(): MvExpandCommandContext {
		let _localctx: MvExpandCommandContext = new MvExpandCommandContext(this._ctx, this.state);
		this.enterRule(_localctx, 8, esql_parser.RULE_mvExpandCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 139;
			this.match(esql_parser.MV_EXPAND);
			this.state = 140;
			this.qualifiedNames();
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
		this.enterRule(_localctx, 10, esql_parser.RULE_whereCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 142;
			this.match(esql_parser.WHERE);
			this.state = 143;
			this.whereBooleanExpression();
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
	public whereBooleanExpression(): WhereBooleanExpressionContext {
		let _localctx: WhereBooleanExpressionContext = new WhereBooleanExpressionContext(this._ctx, this.state);
		this.enterRule(_localctx, 12, esql_parser.RULE_whereBooleanExpression);
		let _la: number;
		try {
			this.state = 187;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 7, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 145;
				this.match(esql_parser.NOT);
				this.state = 146;
				this.booleanExpression(0);
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 147;
				this.valueExpression();
				}
				break;

			case 3:
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 148;
				this.regexBooleanExpression();
				}
				break;

			case 4:
				this.enterOuterAlt(_localctx, 4);
				{
				this.state = 149;
				_localctx._left = this.booleanExpression(0);
				this.state = 150;
				_localctx._operator = this.match(esql_parser.AND);
				this.state = 151;
				_localctx._right = this.booleanExpression(0);
				}
				break;

			case 5:
				this.enterOuterAlt(_localctx, 5);
				{
				this.state = 153;
				_localctx._left = this.booleanExpression(0);
				this.state = 154;
				_localctx._operator = this.match(esql_parser.OR);
				this.state = 155;
				_localctx._right = this.booleanExpression(0);
				}
				break;

			case 6:
				this.enterOuterAlt(_localctx, 6);
				{
				this.state = 157;
				this.valueExpression();
				this.state = 159;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la === esql_parser.NOT) {
					{
					this.state = 158;
					this.match(esql_parser.NOT);
					}
				}

				this.state = 161;
				this.match(esql_parser.IN);
				this.state = 162;
				this.match(esql_parser.LP);
				this.state = 163;
				this.valueExpression();
				this.state = 168;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la === esql_parser.COMMA) {
					{
					{
					this.state = 164;
					this.match(esql_parser.COMMA);
					this.state = 165;
					this.valueExpression();
					}
					}
					this.state = 170;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 171;
				this.match(esql_parser.RP);
				}
				break;

			case 7:
				this.enterOuterAlt(_localctx, 7);
				{
				this.state = 173;
				this.match(esql_parser.WHERE_FUNCTIONS);
				this.state = 174;
				this.match(esql_parser.LP);
				this.state = 175;
				this.qualifiedName();
				this.state = 183;
				this._errHandler.sync(this);
				switch ( this.interpreter.adaptivePredict(this._input, 6, this._ctx) ) {
				case 1:
					{
					this.state = 180;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
					while (_la === esql_parser.COMMA) {
						{
						{
						this.state = 176;
						this.match(esql_parser.COMMA);
						this.state = 177;
						this.functionExpressionArgument();
						}
						}
						this.state = 182;
						this._errHandler.sync(this);
						_la = this._input.LA(1);
					}
					}
					break;
				}
				this.state = 185;
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
		let _startState: number = 14;
		this.enterRecursionRule(_localctx, 14, esql_parser.RULE_booleanExpression, _p);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 193;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case esql_parser.NOT:
				{
				this.state = 190;
				this.match(esql_parser.NOT);
				this.state = 191;
				this.booleanExpression(4);
				}
				break;
			case esql_parser.STRING:
			case esql_parser.INTEGER_LITERAL:
			case esql_parser.DECIMAL_LITERAL:
			case esql_parser.LP:
			case esql_parser.OPENING_BRACKET:
			case esql_parser.NULL:
			case esql_parser.BOOLEAN_VALUE:
			case esql_parser.PLUS:
			case esql_parser.MINUS:
			case esql_parser.MATH_FUNCTION:
			case esql_parser.UNARY_FUNCTION:
			case esql_parser.UNQUOTED_IDENTIFIER:
			case esql_parser.QUOTED_IDENTIFIER:
				{
				this.state = 192;
				this.valueExpression();
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
			this._ctx._stop = this._input.tryLT(-1);
			this.state = 203;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 10, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					if (this._parseListeners != null) {
						this.triggerExitRuleEvent();
					}
					_prevctx = _localctx;
					{
					this.state = 201;
					this._errHandler.sync(this);
					switch ( this.interpreter.adaptivePredict(this._input, 9, this._ctx) ) {
					case 1:
						{
						_localctx = new BooleanExpressionContext(_parentctx, _parentState);
						_localctx._left = _prevctx;
						this.pushNewRecursionContext(_localctx, _startState, esql_parser.RULE_booleanExpression);
						this.state = 195;
						if (!(this.precpred(this._ctx, 2))) {
							throw new FailedPredicateException(this, "this.precpred(this._ctx, 2)");
						}
						this.state = 196;
						_localctx._operator = this.match(esql_parser.AND);
						this.state = 197;
						_localctx._right = this.booleanExpression(3);
						}
						break;

					case 2:
						{
						_localctx = new BooleanExpressionContext(_parentctx, _parentState);
						_localctx._left = _prevctx;
						this.pushNewRecursionContext(_localctx, _startState, esql_parser.RULE_booleanExpression);
						this.state = 198;
						if (!(this.precpred(this._ctx, 1))) {
							throw new FailedPredicateException(this, "this.precpred(this._ctx, 1)");
						}
						this.state = 199;
						_localctx._operator = this.match(esql_parser.OR);
						this.state = 200;
						_localctx._right = this.booleanExpression(2);
						}
						break;
					}
					}
				}
				this.state = 205;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 10, this._ctx);
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
		this.enterRule(_localctx, 16, esql_parser.RULE_regexBooleanExpression);
		let _la: number;
		try {
			this.state = 220;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 13, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 206;
				this.valueExpression();
				this.state = 208;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la === esql_parser.NOT) {
					{
					this.state = 207;
					this.match(esql_parser.NOT);
					}
				}

				this.state = 210;
				_localctx._kind = this.match(esql_parser.LIKE);
				this.state = 211;
				_localctx._pattern = this.string();
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 213;
				this.valueExpression();
				this.state = 215;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la === esql_parser.NOT) {
					{
					this.state = 214;
					this.match(esql_parser.NOT);
					}
				}

				this.state = 217;
				_localctx._kind = this.match(esql_parser.RLIKE);
				this.state = 218;
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
		this.enterRule(_localctx, 18, esql_parser.RULE_valueExpression);
		try {
			this.state = 224;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 14, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 222;
				this.operatorExpression(0);
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 223;
				this.comparison();
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
	public comparison(): ComparisonContext {
		let _localctx: ComparisonContext = new ComparisonContext(this._ctx, this.state);
		this.enterRule(_localctx, 20, esql_parser.RULE_comparison);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 226;
			_localctx._left = this.operatorExpression(0);
			this.state = 227;
			this.comparisonOperator();
			this.state = 228;
			_localctx._right = this.operatorExpression(0);
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
	public mathFn(): MathFnContext {
		let _localctx: MathFnContext = new MathFnContext(this._ctx, this.state);
		this.enterRule(_localctx, 22, esql_parser.RULE_mathFn);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 230;
			this.functionIdentifier();
			this.state = 231;
			this.match(esql_parser.LP);
			this.state = 240;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if ((((_la) & ~0x1F) === 0 && ((1 << _la) & ((1 << esql_parser.STRING) | (1 << esql_parser.INTEGER_LITERAL) | (1 << esql_parser.DECIMAL_LITERAL))) !== 0) || _la === esql_parser.UNQUOTED_IDENTIFIER || _la === esql_parser.QUOTED_IDENTIFIER) {
				{
				this.state = 232;
				this.functionExpressionArgument();
				this.state = 237;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la === esql_parser.COMMA) {
					{
					{
					this.state = 233;
					this.match(esql_parser.COMMA);
					this.state = 234;
					this.functionExpressionArgument();
					}
					}
					this.state = 239;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				}
			}

			this.state = 242;
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
	public mathEvalFn(): MathEvalFnContext {
		let _localctx: MathEvalFnContext = new MathEvalFnContext(this._ctx, this.state);
		this.enterRule(_localctx, 24, esql_parser.RULE_mathEvalFn);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 244;
			this.mathFunctionIdentifier();
			this.state = 245;
			this.match(esql_parser.LP);
			this.state = 254;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if ((((_la) & ~0x1F) === 0 && ((1 << _la) & ((1 << esql_parser.STRING) | (1 << esql_parser.INTEGER_LITERAL) | (1 << esql_parser.DECIMAL_LITERAL))) !== 0) || ((((_la - 32)) & ~0x1F) === 0 && ((1 << (_la - 32)) & ((1 << (esql_parser.LP - 32)) | (1 << (esql_parser.OPENING_BRACKET - 32)) | (1 << (esql_parser.NULL - 32)) | (1 << (esql_parser.BOOLEAN_VALUE - 32)) | (1 << (esql_parser.PLUS - 32)) | (1 << (esql_parser.MINUS - 32)) | (1 << (esql_parser.MATH_FUNCTION - 32)) | (1 << (esql_parser.UNARY_FUNCTION - 32)) | (1 << (esql_parser.UNQUOTED_IDENTIFIER - 32)) | (1 << (esql_parser.QUOTED_IDENTIFIER - 32)))) !== 0)) {
				{
				this.state = 246;
				this.mathFunctionExpressionArgument();
				this.state = 251;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la === esql_parser.COMMA) {
					{
					{
					this.state = 247;
					this.match(esql_parser.COMMA);
					this.state = 248;
					this.mathFunctionExpressionArgument();
					}
					}
					this.state = 253;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				}
			}

			this.state = 256;
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
		let _startState: number = 26;
		this.enterRecursionRule(_localctx, 26, esql_parser.RULE_operatorExpression, _p);
		let _la: number;
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 264;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case esql_parser.STRING:
			case esql_parser.INTEGER_LITERAL:
			case esql_parser.DECIMAL_LITERAL:
			case esql_parser.LP:
			case esql_parser.OPENING_BRACKET:
			case esql_parser.NULL:
			case esql_parser.BOOLEAN_VALUE:
			case esql_parser.UNQUOTED_IDENTIFIER:
			case esql_parser.QUOTED_IDENTIFIER:
				{
				this.state = 259;
				this.primaryExpression();
				}
				break;
			case esql_parser.UNARY_FUNCTION:
				{
				this.state = 260;
				this.mathFn();
				}
				break;
			case esql_parser.MATH_FUNCTION:
				{
				this.state = 261;
				this.mathEvalFn();
				}
				break;
			case esql_parser.PLUS:
			case esql_parser.MINUS:
				{
				this.state = 262;
				_localctx._operator = this._input.LT(1);
				_la = this._input.LA(1);
				if (!(_la === esql_parser.PLUS || _la === esql_parser.MINUS)) {
					_localctx._operator = this._errHandler.recoverInline(this);
				} else {
					if (this._input.LA(1) === Token.EOF) {
						this.matchedEOF = true;
					}

					this._errHandler.reportMatch(this);
					this.consume();
				}
				this.state = 263;
				this.operatorExpression(3);
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
			this._ctx._stop = this._input.tryLT(-1);
			this.state = 274;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 21, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					if (this._parseListeners != null) {
						this.triggerExitRuleEvent();
					}
					_prevctx = _localctx;
					{
					this.state = 272;
					this._errHandler.sync(this);
					switch ( this.interpreter.adaptivePredict(this._input, 20, this._ctx) ) {
					case 1:
						{
						_localctx = new OperatorExpressionContext(_parentctx, _parentState);
						_localctx._left = _prevctx;
						this.pushNewRecursionContext(_localctx, _startState, esql_parser.RULE_operatorExpression);
						this.state = 266;
						if (!(this.precpred(this._ctx, 2))) {
							throw new FailedPredicateException(this, "this.precpred(this._ctx, 2)");
						}
						this.state = 267;
						_localctx._operator = this._input.LT(1);
						_la = this._input.LA(1);
						if (!(((((_la - 49)) & ~0x1F) === 0 && ((1 << (_la - 49)) & ((1 << (esql_parser.ASTERISK - 49)) | (1 << (esql_parser.SLASH - 49)) | (1 << (esql_parser.PERCENT - 49)))) !== 0))) {
							_localctx._operator = this._errHandler.recoverInline(this);
						} else {
							if (this._input.LA(1) === Token.EOF) {
								this.matchedEOF = true;
							}

							this._errHandler.reportMatch(this);
							this.consume();
						}
						this.state = 268;
						_localctx._right = this.operatorExpression(3);
						}
						break;

					case 2:
						{
						_localctx = new OperatorExpressionContext(_parentctx, _parentState);
						_localctx._left = _prevctx;
						this.pushNewRecursionContext(_localctx, _startState, esql_parser.RULE_operatorExpression);
						this.state = 269;
						if (!(this.precpred(this._ctx, 1))) {
							throw new FailedPredicateException(this, "this.precpred(this._ctx, 1)");
						}
						this.state = 270;
						_localctx._operator = this._input.LT(1);
						_la = this._input.LA(1);
						if (!(_la === esql_parser.PLUS || _la === esql_parser.MINUS)) {
							_localctx._operator = this._errHandler.recoverInline(this);
						} else {
							if (this._input.LA(1) === Token.EOF) {
								this.matchedEOF = true;
							}

							this._errHandler.reportMatch(this);
							this.consume();
						}
						this.state = 271;
						_localctx._right = this.operatorExpression(2);
						}
						break;
					}
					}
				}
				this.state = 276;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 21, this._ctx);
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
		this.enterRule(_localctx, 28, esql_parser.RULE_primaryExpression);
		let _la: number;
		try {
			this.state = 297;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 24, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 277;
				this.constant();
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 278;
				this.qualifiedName();
				}
				break;

			case 3:
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 279;
				this.match(esql_parser.LP);
				this.state = 280;
				this.booleanExpression(0);
				this.state = 281;
				this.match(esql_parser.RP);
				}
				break;

			case 4:
				this.enterOuterAlt(_localctx, 4);
				{
				this.state = 283;
				this.identifier();
				this.state = 284;
				this.match(esql_parser.LP);
				this.state = 293;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if ((((_la) & ~0x1F) === 0 && ((1 << _la) & ((1 << esql_parser.STRING) | (1 << esql_parser.INTEGER_LITERAL) | (1 << esql_parser.DECIMAL_LITERAL))) !== 0) || ((((_la - 32)) & ~0x1F) === 0 && ((1 << (_la - 32)) & ((1 << (esql_parser.LP - 32)) | (1 << (esql_parser.OPENING_BRACKET - 32)) | (1 << (esql_parser.NOT - 32)) | (1 << (esql_parser.NULL - 32)) | (1 << (esql_parser.BOOLEAN_VALUE - 32)) | (1 << (esql_parser.PLUS - 32)) | (1 << (esql_parser.MINUS - 32)) | (1 << (esql_parser.MATH_FUNCTION - 32)) | (1 << (esql_parser.UNARY_FUNCTION - 32)) | (1 << (esql_parser.UNQUOTED_IDENTIFIER - 32)) | (1 << (esql_parser.QUOTED_IDENTIFIER - 32)))) !== 0)) {
					{
					this.state = 285;
					this.booleanExpression(0);
					this.state = 290;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
					while (_la === esql_parser.COMMA) {
						{
						{
						this.state = 286;
						this.match(esql_parser.COMMA);
						this.state = 287;
						this.booleanExpression(0);
						}
						}
						this.state = 292;
						this._errHandler.sync(this);
						_la = this._input.LA(1);
					}
					}
				}

				this.state = 295;
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
		this.enterRule(_localctx, 30, esql_parser.RULE_rowCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 299;
			this.match(esql_parser.ROW);
			this.state = 300;
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
		this.enterRule(_localctx, 32, esql_parser.RULE_fields);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 302;
			this.field();
			this.state = 307;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 25, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 303;
					this.match(esql_parser.COMMA);
					this.state = 304;
					this.field();
					}
					}
				}
				this.state = 309;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 25, this._ctx);
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
		this.enterRule(_localctx, 34, esql_parser.RULE_field);
		try {
			this.state = 315;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 26, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 310;
				this.booleanExpression(0);
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 311;
				this.userVariable();
				this.state = 312;
				this.match(esql_parser.ASSIGN);
				this.state = 313;
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
	public userVariable(): UserVariableContext {
		let _localctx: UserVariableContext = new UserVariableContext(this._ctx, this.state);
		this.enterRule(_localctx, 36, esql_parser.RULE_userVariable);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 317;
			this.identifier();
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
		this.enterRule(_localctx, 38, esql_parser.RULE_fromCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 319;
			this.match(esql_parser.FROM);
			this.state = 320;
			this.sourceIdentifier();
			this.state = 325;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 27, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 321;
					this.match(esql_parser.COMMA);
					this.state = 322;
					this.sourceIdentifier();
					}
					}
				}
				this.state = 327;
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
	public evalCommand(): EvalCommandContext {
		let _localctx: EvalCommandContext = new EvalCommandContext(this._ctx, this.state);
		this.enterRule(_localctx, 40, esql_parser.RULE_evalCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 328;
			this.match(esql_parser.EVAL);
			this.state = 329;
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
		this.enterRule(_localctx, 42, esql_parser.RULE_statsCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 331;
			this.match(esql_parser.STATS);
			this.state = 333;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 28, this._ctx) ) {
			case 1:
				{
				this.state = 332;
				this.fields();
				}
				break;
			}
			this.state = 337;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 29, this._ctx) ) {
			case 1:
				{
				this.state = 335;
				this.match(esql_parser.BY);
				this.state = 336;
				this.qualifiedNames();
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
	public sourceIdentifier(): SourceIdentifierContext {
		let _localctx: SourceIdentifierContext = new SourceIdentifierContext(this._ctx, this.state);
		this.enterRule(_localctx, 44, esql_parser.RULE_sourceIdentifier);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 339;
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
	public functionExpressionArgument(): FunctionExpressionArgumentContext {
		let _localctx: FunctionExpressionArgumentContext = new FunctionExpressionArgumentContext(this._ctx, this.state);
		this.enterRule(_localctx, 46, esql_parser.RULE_functionExpressionArgument);
		try {
			this.state = 344;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case esql_parser.UNQUOTED_IDENTIFIER:
			case esql_parser.QUOTED_IDENTIFIER:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 341;
				this.qualifiedName();
				}
				break;
			case esql_parser.STRING:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 342;
				this.string();
				}
				break;
			case esql_parser.INTEGER_LITERAL:
			case esql_parser.DECIMAL_LITERAL:
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 343;
				this.number();
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
	public mathFunctionExpressionArgument(): MathFunctionExpressionArgumentContext {
		let _localctx: MathFunctionExpressionArgumentContext = new MathFunctionExpressionArgumentContext(this._ctx, this.state);
		this.enterRule(_localctx, 48, esql_parser.RULE_mathFunctionExpressionArgument);
		try {
			this.state = 354;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 31, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 346;
				this.qualifiedName();
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 347;
				this.string();
				}
				break;

			case 3:
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 348;
				this.number();
				}
				break;

			case 4:
				this.enterOuterAlt(_localctx, 4);
				{
				this.state = 349;
				this.operatorExpression(0);
				}
				break;

			case 5:
				this.enterOuterAlt(_localctx, 5);
				{
				this.state = 350;
				this.number();
				{
				this.state = 351;
				this.match(esql_parser.DATE_LITERAL);
				}
				}
				break;

			case 6:
				this.enterOuterAlt(_localctx, 6);
				{
				this.state = 353;
				this.comparison();
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
	public qualifiedName(): QualifiedNameContext {
		let _localctx: QualifiedNameContext = new QualifiedNameContext(this._ctx, this.state);
		this.enterRule(_localctx, 50, esql_parser.RULE_qualifiedName);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 356;
			this.identifier();
			this.state = 361;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 32, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 357;
					this.match(esql_parser.DOT);
					this.state = 358;
					this.identifier();
					}
					}
				}
				this.state = 363;
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
	public qualifiedNames(): QualifiedNamesContext {
		let _localctx: QualifiedNamesContext = new QualifiedNamesContext(this._ctx, this.state);
		this.enterRule(_localctx, 52, esql_parser.RULE_qualifiedNames);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 364;
			this.qualifiedName();
			this.state = 369;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 33, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 365;
					this.match(esql_parser.COMMA);
					this.state = 366;
					this.qualifiedName();
					}
					}
				}
				this.state = 371;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 33, this._ctx);
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
		this.enterRule(_localctx, 54, esql_parser.RULE_identifier);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 372;
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
	public mathFunctionIdentifier(): MathFunctionIdentifierContext {
		let _localctx: MathFunctionIdentifierContext = new MathFunctionIdentifierContext(this._ctx, this.state);
		this.enterRule(_localctx, 56, esql_parser.RULE_mathFunctionIdentifier);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 374;
			this.match(esql_parser.MATH_FUNCTION);
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
	public functionIdentifier(): FunctionIdentifierContext {
		let _localctx: FunctionIdentifierContext = new FunctionIdentifierContext(this._ctx, this.state);
		this.enterRule(_localctx, 58, esql_parser.RULE_functionIdentifier);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 376;
			this.match(esql_parser.UNARY_FUNCTION);
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
		this.enterRule(_localctx, 60, esql_parser.RULE_constant);
		let _la: number;
		try {
			this.state = 415;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 37, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 378;
				this.match(esql_parser.NULL);
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 379;
				this.numericValue();
				}
				break;

			case 3:
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 380;
				this.booleanValue();
				}
				break;

			case 4:
				this.enterOuterAlt(_localctx, 4);
				{
				this.state = 381;
				this.string();
				}
				break;

			case 5:
				this.enterOuterAlt(_localctx, 5);
				{
				this.state = 382;
				this.match(esql_parser.OPENING_BRACKET);
				this.state = 383;
				this.numericValue();
				this.state = 388;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la === esql_parser.COMMA) {
					{
					{
					this.state = 384;
					this.match(esql_parser.COMMA);
					this.state = 385;
					this.numericValue();
					}
					}
					this.state = 390;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 391;
				this.match(esql_parser.CLOSING_BRACKET);
				}
				break;

			case 6:
				this.enterOuterAlt(_localctx, 6);
				{
				this.state = 393;
				this.match(esql_parser.OPENING_BRACKET);
				this.state = 394;
				this.booleanValue();
				this.state = 399;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la === esql_parser.COMMA) {
					{
					{
					this.state = 395;
					this.match(esql_parser.COMMA);
					this.state = 396;
					this.booleanValue();
					}
					}
					this.state = 401;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 402;
				this.match(esql_parser.CLOSING_BRACKET);
				}
				break;

			case 7:
				this.enterOuterAlt(_localctx, 7);
				{
				this.state = 404;
				this.match(esql_parser.OPENING_BRACKET);
				this.state = 405;
				this.string();
				this.state = 410;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la === esql_parser.COMMA) {
					{
					{
					this.state = 406;
					this.match(esql_parser.COMMA);
					this.state = 407;
					this.string();
					}
					}
					this.state = 412;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 413;
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
	public numericValue(): NumericValueContext {
		let _localctx: NumericValueContext = new NumericValueContext(this._ctx, this.state);
		this.enterRule(_localctx, 62, esql_parser.RULE_numericValue);
		try {
			this.state = 419;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case esql_parser.DECIMAL_LITERAL:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 417;
				this.decimalValue();
				}
				break;
			case esql_parser.INTEGER_LITERAL:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 418;
				this.integerValue();
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
	public limitCommand(): LimitCommandContext {
		let _localctx: LimitCommandContext = new LimitCommandContext(this._ctx, this.state);
		this.enterRule(_localctx, 64, esql_parser.RULE_limitCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 421;
			this.match(esql_parser.LIMIT);
			this.state = 422;
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
		this.enterRule(_localctx, 66, esql_parser.RULE_sortCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 424;
			this.match(esql_parser.SORT);
			this.state = 425;
			this.orderExpression();
			this.state = 430;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 39, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 426;
					this.match(esql_parser.COMMA);
					this.state = 427;
					this.orderExpression();
					}
					}
				}
				this.state = 432;
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
	public orderExpression(): OrderExpressionContext {
		let _localctx: OrderExpressionContext = new OrderExpressionContext(this._ctx, this.state);
		this.enterRule(_localctx, 68, esql_parser.RULE_orderExpression);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 433;
			this.booleanExpression(0);
			this.state = 435;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 40, this._ctx) ) {
			case 1:
				{
				this.state = 434;
				this.match(esql_parser.ORDERING);
				}
				break;
			}
			this.state = 439;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 41, this._ctx) ) {
			case 1:
				{
				this.state = 437;
				this.match(esql_parser.NULLS_ORDERING);
				{
				this.state = 438;
				this.match(esql_parser.NULLS_ORDERING_DIRECTION);
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
	public projectCommand(): ProjectCommandContext {
		let _localctx: ProjectCommandContext = new ProjectCommandContext(this._ctx, this.state);
		this.enterRule(_localctx, 70, esql_parser.RULE_projectCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 441;
			this.match(esql_parser.PROJECT);
			this.state = 442;
			this.qualifiedNames();
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
		this.enterRule(_localctx, 72, esql_parser.RULE_dropCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 444;
			this.match(esql_parser.DROP);
			this.state = 445;
			this.qualifiedNames();
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
	public renameVariable(): RenameVariableContext {
		let _localctx: RenameVariableContext = new RenameVariableContext(this._ctx, this.state);
		this.enterRule(_localctx, 74, esql_parser.RULE_renameVariable);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 447;
			this.identifier();
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
		this.enterRule(_localctx, 76, esql_parser.RULE_renameCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 449;
			this.match(esql_parser.RENAME);
			this.state = 450;
			this.renameClause();
			this.state = 455;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 42, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 451;
					this.match(esql_parser.COMMA);
					this.state = 452;
					this.renameClause();
					}
					}
				}
				this.state = 457;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 42, this._ctx);
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
		this.enterRule(_localctx, 78, esql_parser.RULE_renameClause);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 458;
			this.renameVariable();
			this.state = 459;
			this.match(esql_parser.ASSIGN);
			this.state = 460;
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
	public dissectCommand(): DissectCommandContext {
		let _localctx: DissectCommandContext = new DissectCommandContext(this._ctx, this.state);
		this.enterRule(_localctx, 80, esql_parser.RULE_dissectCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 462;
			this.match(esql_parser.DISSECT);
			this.state = 463;
			this.qualifiedNames();
			this.state = 464;
			this.string();
			this.state = 466;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 43, this._ctx) ) {
			case 1:
				{
				this.state = 465;
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
		this.enterRule(_localctx, 82, esql_parser.RULE_grokCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 468;
			this.match(esql_parser.GROK);
			this.state = 469;
			this.qualifiedNames();
			this.state = 470;
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
	public commandOptions(): CommandOptionsContext {
		let _localctx: CommandOptionsContext = new CommandOptionsContext(this._ctx, this.state);
		this.enterRule(_localctx, 84, esql_parser.RULE_commandOptions);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 472;
			this.commandOption();
			this.state = 477;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 44, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 473;
					this.match(esql_parser.COMMA);
					this.state = 474;
					this.commandOption();
					}
					}
				}
				this.state = 479;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 44, this._ctx);
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
		this.enterRule(_localctx, 86, esql_parser.RULE_commandOption);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 480;
			this.identifier();
			this.state = 481;
			this.match(esql_parser.ASSIGN);
			this.state = 482;
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
		this.enterRule(_localctx, 88, esql_parser.RULE_booleanValue);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 484;
			this.match(esql_parser.BOOLEAN_VALUE);
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
	public number(): NumberContext {
		let _localctx: NumberContext = new NumberContext(this._ctx, this.state);
		this.enterRule(_localctx, 90, esql_parser.RULE_number);
		try {
			this.state = 488;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case esql_parser.DECIMAL_LITERAL:
				_localctx = new DecimalLiteralContext(_localctx);
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 486;
				this.match(esql_parser.DECIMAL_LITERAL);
				}
				break;
			case esql_parser.INTEGER_LITERAL:
				_localctx = new IntegerLiteralContext(_localctx);
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 487;
				this.match(esql_parser.INTEGER_LITERAL);
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
	public decimalValue(): DecimalValueContext {
		let _localctx: DecimalValueContext = new DecimalValueContext(this._ctx, this.state);
		this.enterRule(_localctx, 92, esql_parser.RULE_decimalValue);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 490;
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
		this.enterRule(_localctx, 94, esql_parser.RULE_integerValue);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 492;
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
		this.enterRule(_localctx, 96, esql_parser.RULE_string);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 494;
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
		this.enterRule(_localctx, 98, esql_parser.RULE_comparisonOperator);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 496;
			this.match(esql_parser.COMPARISON_OPERATOR);
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
		this.enterRule(_localctx, 100, esql_parser.RULE_explainCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 498;
			this.match(esql_parser.EXPLAIN);
			this.state = 499;
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
		this.enterRule(_localctx, 102, esql_parser.RULE_subqueryExpression);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 501;
			this.match(esql_parser.OPENING_BRACKET);
			this.state = 502;
			this.query(0);
			this.state = 503;
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
		this.enterRule(_localctx, 104, esql_parser.RULE_showCommand);
		try {
			this.state = 509;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 46, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 505;
				this.match(esql_parser.SHOW);
				this.state = 506;
				this.match(esql_parser.INFO);
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 507;
				this.match(esql_parser.SHOW);
				this.state = 508;
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

	public sempred(_localctx: RuleContext, ruleIndex: number, predIndex: number): boolean {
		switch (ruleIndex) {
		case 1:
			return this.query_sempred(_localctx as QueryContext, predIndex);

		case 7:
			return this.booleanExpression_sempred(_localctx as BooleanExpressionContext, predIndex);

		case 13:
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
			return this.precpred(this._ctx, 2);

		case 2:
			return this.precpred(this._ctx, 1);
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
		"\x03\uC91D\uCABA\u058D\uAFBA\u4F53\u0607\uEA8B\uC241\x03F\u0202\x04\x02" +
		"\t\x02\x04\x03\t\x03\x04\x04\t\x04\x04\x05\t\x05\x04\x06\t\x06\x04\x07" +
		"\t\x07\x04\b\t\b\x04\t\t\t\x04\n\t\n\x04\v\t\v\x04\f\t\f\x04\r\t\r\x04" +
		"\x0E\t\x0E\x04\x0F\t\x0F\x04\x10\t\x10\x04\x11\t\x11\x04\x12\t\x12\x04" +
		"\x13\t\x13\x04\x14\t\x14\x04\x15\t\x15\x04\x16\t\x16\x04\x17\t\x17\x04" +
		"\x18\t\x18\x04\x19\t\x19\x04\x1A\t\x1A\x04\x1B\t\x1B\x04\x1C\t\x1C\x04" +
		"\x1D\t\x1D\x04\x1E\t\x1E\x04\x1F\t\x1F\x04 \t \x04!\t!\x04\"\t\"\x04#" +
		"\t#\x04$\t$\x04%\t%\x04&\t&\x04\'\t\'\x04(\t(\x04)\t)\x04*\t*\x04+\t+" +
		"\x04,\t,\x04-\t-\x04.\t.\x04/\t/\x040\t0\x041\t1\x042\t2\x043\t3\x044" +
		"\t4\x045\t5\x046\t6\x03\x02\x03\x02\x03\x02\x03\x03\x03\x03\x03\x03\x03" +
		"\x03\x03\x03\x03\x03\x07\x03v\n\x03\f\x03\x0E\x03y\v\x03\x03\x04\x03\x04" +
		"\x03\x04\x03\x04\x05\x04\x7F\n\x04\x03\x05\x03\x05\x03\x05\x03\x05\x03" +
		"\x05\x03\x05\x03\x05\x03\x05\x03\x05\x03\x05\x03\x05\x05\x05\x8C\n\x05" +
		"\x03\x06\x03\x06\x03\x06\x03\x07\x03\x07\x03\x07\x03\b\x03\b\x03\b\x03" +
		"\b\x03\b\x03\b\x03\b\x03\b\x03\b\x03\b\x03\b\x03\b\x03\b\x03\b\x05\b\xA2" +
		"\n\b\x03\b\x03\b\x03\b\x03\b\x03\b\x07\b\xA9\n\b\f\b\x0E\b\xAC\v\b\x03" +
		"\b\x03\b\x03\b\x03\b\x03\b\x03\b\x03\b\x07\b\xB5\n\b\f\b\x0E\b\xB8\v\b" +
		"\x05\b\xBA\n\b\x03\b\x03\b\x05\b\xBE\n\b\x03\t\x03\t\x03\t\x03\t\x05\t" +
		"\xC4\n\t\x03\t\x03\t\x03\t\x03\t\x03\t\x03\t\x07\t\xCC\n\t\f\t\x0E\t\xCF" +
		"\v\t\x03\n\x03\n\x05\n\xD3\n\n\x03\n\x03\n\x03\n\x03\n\x03\n\x05\n\xDA" +
		"\n\n\x03\n\x03\n\x03\n\x05\n\xDF\n\n\x03\v\x03\v\x05\v\xE3\n\v\x03\f\x03" +
		"\f\x03\f\x03\f\x03\r\x03\r\x03\r\x03\r\x03\r\x07\r\xEE\n\r\f\r\x0E\r\xF1" +
		"\v\r\x05\r\xF3\n\r\x03\r\x03\r\x03\x0E\x03\x0E\x03\x0E\x03\x0E\x03\x0E" +
		"\x07\x0E\xFC\n\x0E\f\x0E\x0E\x0E\xFF\v\x0E\x05\x0E\u0101\n\x0E\x03\x0E" +
		"\x03\x0E\x03\x0F\x03\x0F\x03\x0F\x03\x0F\x03\x0F\x03\x0F\x05\x0F\u010B" +
		"\n\x0F\x03\x0F\x03\x0F\x03\x0F\x03\x0F\x03\x0F\x03\x0F\x07\x0F\u0113\n" +
		"\x0F\f\x0F\x0E\x0F\u0116\v\x0F\x03\x10\x03\x10\x03\x10\x03\x10\x03\x10" +
		"\x03\x10\x03\x10\x03\x10\x03\x10\x03\x10\x03\x10\x07\x10\u0123\n\x10\f" +
		"\x10\x0E\x10\u0126\v\x10\x05\x10\u0128\n\x10\x03\x10\x03\x10\x05\x10\u012C" +
		"\n\x10\x03\x11\x03\x11\x03\x11\x03\x12\x03\x12\x03\x12\x07\x12\u0134\n" +
		"\x12\f\x12\x0E\x12\u0137\v\x12\x03\x13\x03\x13\x03\x13\x03\x13\x03\x13" +
		"\x05\x13\u013E\n\x13\x03\x14\x03\x14\x03\x15\x03\x15\x03\x15\x03\x15\x07" +
		"\x15\u0146\n\x15\f\x15\x0E\x15\u0149\v\x15\x03\x16\x03\x16\x03\x16\x03" +
		"\x17\x03\x17\x05\x17\u0150\n\x17\x03\x17\x03\x17\x05\x17\u0154\n\x17\x03" +
		"\x18\x03\x18\x03\x19\x03\x19\x03\x19\x05\x19\u015B\n\x19\x03\x1A\x03\x1A" +
		"\x03\x1A\x03\x1A\x03\x1A\x03\x1A\x03\x1A\x03\x1A\x05\x1A\u0165\n\x1A\x03" +
		"\x1B\x03\x1B\x03\x1B\x07\x1B\u016A\n\x1B\f\x1B\x0E\x1B\u016D\v\x1B\x03" +
		"\x1C\x03\x1C\x03\x1C\x07\x1C\u0172\n\x1C\f\x1C\x0E\x1C\u0175\v\x1C\x03" +
		"\x1D\x03\x1D\x03\x1E\x03\x1E\x03\x1F\x03\x1F\x03 \x03 \x03 \x03 \x03 " +
		"\x03 \x03 \x03 \x07 \u0185\n \f \x0E \u0188\v \x03 \x03 \x03 \x03 \x03" +
		" \x03 \x07 \u0190\n \f \x0E \u0193\v \x03 \x03 \x03 \x03 \x03 \x03 \x07" +
		" \u019B\n \f \x0E \u019E\v \x03 \x03 \x05 \u01A2\n \x03!\x03!\x05!\u01A6" +
		"\n!\x03\"\x03\"\x03\"\x03#\x03#\x03#\x03#\x07#\u01AF\n#\f#\x0E#\u01B2" +
		"\v#\x03$\x03$\x05$\u01B6\n$\x03$\x03$\x05$\u01BA\n$\x03%\x03%\x03%\x03" +
		"&\x03&\x03&\x03\'\x03\'\x03(\x03(\x03(\x03(\x07(\u01C8\n(\f(\x0E(\u01CB" +
		"\v(\x03)\x03)\x03)\x03)\x03*\x03*\x03*\x03*\x05*\u01D5\n*\x03+\x03+\x03" +
		"+\x03+\x03,\x03,\x03,\x07,\u01DE\n,\f,\x0E,\u01E1\v,\x03-\x03-\x03-\x03" +
		"-\x03.\x03.\x03/\x03/\x05/\u01EB\n/\x030\x030\x031\x031\x032\x032\x03" +
		"3\x033\x034\x034\x034\x035\x035\x035\x035\x036\x036\x036\x036\x056\u0200" +
		"\n6\x036\x02\x02\x05\x04\x10\x1C7\x02\x02\x04\x02\x06\x02\b\x02\n\x02" +
		"\f\x02\x0E\x02\x10\x02\x12\x02\x14\x02\x16\x02\x18\x02\x1A\x02\x1C\x02" +
		"\x1E\x02 \x02\"\x02$\x02&\x02(\x02*\x02,\x02.\x020\x022\x024\x026\x02" +
		"8\x02:\x02<\x02>\x02@\x02B\x02D\x02F\x02H\x02J\x02L\x02N\x02P\x02R\x02" +
		"T\x02V\x02X\x02Z\x02\\\x02^\x02`\x02b\x02d\x02f\x02h\x02j\x02\x02\x06" +
		"\x03\x0212\x03\x0235\x03\x02AB\x03\x02<=\x02\u0219\x02l\x03\x02\x02\x02" +
		"\x04o\x03\x02\x02\x02\x06~\x03\x02\x02\x02\b\x8B\x03\x02\x02\x02\n\x8D" +
		"\x03\x02\x02\x02\f\x90\x03\x02\x02\x02\x0E\xBD\x03\x02\x02\x02\x10\xC3" +
		"\x03\x02\x02\x02\x12\xDE\x03\x02\x02\x02\x14\xE2\x03\x02\x02\x02\x16\xE4" +
		"\x03\x02\x02\x02\x18\xE8\x03\x02\x02\x02\x1A\xF6\x03\x02\x02\x02\x1C\u010A" +
		"\x03\x02\x02\x02\x1E\u012B\x03\x02\x02\x02 \u012D\x03\x02\x02\x02\"\u0130" +
		"\x03\x02\x02\x02$\u013D\x03\x02\x02\x02&\u013F\x03\x02\x02\x02(\u0141" +
		"\x03\x02\x02\x02*\u014A\x03\x02\x02\x02,\u014D\x03\x02\x02\x02.\u0155" +
		"\x03\x02\x02\x020\u015A\x03\x02\x02\x022\u0164\x03\x02\x02\x024\u0166" +
		"\x03\x02\x02\x026\u016E\x03\x02\x02\x028\u0176\x03\x02\x02\x02:\u0178" +
		"\x03\x02\x02\x02<\u017A\x03\x02\x02\x02>\u01A1\x03\x02\x02\x02@\u01A5" +
		"\x03\x02\x02\x02B\u01A7\x03\x02\x02\x02D\u01AA\x03\x02\x02\x02F\u01B3" +
		"\x03\x02\x02\x02H\u01BB\x03\x02\x02\x02J\u01BE\x03\x02\x02\x02L\u01C1" +
		"\x03\x02\x02\x02N\u01C3\x03\x02\x02\x02P\u01CC\x03\x02\x02\x02R\u01D0" +
		"\x03\x02\x02\x02T\u01D6\x03\x02\x02\x02V\u01DA\x03\x02\x02\x02X\u01E2" +
		"\x03\x02\x02\x02Z\u01E6\x03\x02\x02\x02\\\u01EA\x03\x02\x02\x02^\u01EC" +
		"\x03\x02\x02\x02`\u01EE\x03\x02\x02\x02b\u01F0\x03\x02\x02\x02d\u01F2" +
		"\x03\x02\x02\x02f\u01F4\x03\x02\x02\x02h\u01F7\x03\x02\x02\x02j\u01FF" +
		"\x03\x02\x02\x02lm\x05\x04\x03\x02mn\x07\x02\x02\x03n\x03\x03\x02\x02" +
		"\x02op\b\x03\x01\x02pq\x05\x06\x04\x02qw\x03\x02\x02\x02rs\f\x03\x02\x02" +
		"st\x07\x18\x02\x02tv\x05\b\x05\x02ur\x03\x02\x02\x02vy\x03\x02\x02\x02" +
		"wu\x03\x02\x02\x02wx\x03\x02\x02\x02x\x05\x03\x02\x02\x02yw\x03\x02\x02" +
		"\x02z\x7F\x05f4\x02{\x7F\x05(\x15\x02|\x7F\x05 \x11\x02}\x7F\x05j6\x02" +
		"~z\x03\x02\x02\x02~{\x03\x02\x02\x02~|\x03\x02\x02\x02~}\x03\x02\x02\x02" +
		"\x7F\x07\x03\x02\x02\x02\x80\x8C\x05*\x16\x02\x81\x8C\x05B\"\x02\x82\x8C" +
		"\x05H%\x02\x83\x8C\x05N(\x02\x84\x8C\x05J&\x02\x85\x8C\x05R*\x02\x86\x8C" +
		"\x05T+\x02\x87\x8C\x05D#\x02\x88\x8C\x05,\x17\x02\x89\x8C\x05\f\x07\x02" +
		"\x8A\x8C\x05\n\x06\x02\x8B\x80\x03\x02\x02\x02\x8B\x81\x03\x02\x02\x02" +
		"\x8B\x82\x03\x02\x02\x02\x8B\x83\x03\x02\x02\x02\x8B\x84\x03\x02\x02\x02" +
		"\x8B\x85\x03\x02\x02\x02\x8B\x86\x03\x02\x02\x02\x8B\x87\x03\x02\x02\x02" +
		"\x8B\x88\x03\x02\x02\x02\x8B\x89\x03\x02\x02\x02\x8B\x8A\x03\x02\x02\x02" +
		"\x8C\t\x03\x02\x02\x02\x8D\x8E\x07\f\x02\x02\x8E\x8F\x056\x1C\x02\x8F" +
		"\v\x03\x02\x02\x02\x90\x91\x07\n\x02\x02\x91\x92\x05\x0E\b\x02\x92\r\x03" +
		"\x02\x02\x02\x93\x94\x07%\x02\x02\x94\xBE\x05\x10\t\x02\x95\xBE\x05\x14" +
		"\v\x02\x96\xBE\x05\x12\n\x02\x97\x98\x05\x10\t\x02\x98\x99\x07\x1E\x02" +
		"\x02\x99\x9A\x05\x10\t\x02\x9A\xBE\x03\x02\x02\x02\x9B\x9C\x05\x10\t\x02" +
		"\x9C\x9D\x07*\x02\x02\x9D\x9E\x05\x10\t\x02\x9E\xBE\x03\x02\x02\x02\x9F" +
		"\xA1\x05\x14\v\x02\xA0\xA2\x07%\x02\x02\xA1\xA0\x03\x02\x02\x02\xA1\xA2" +
		"\x03\x02\x02\x02\xA2\xA3\x03\x02\x02\x02\xA3\xA4\x07(\x02\x02\xA4\xA5" +
		"\x07\"\x02\x02\xA5\xAA\x05\x14\v\x02\xA6\xA7\x07 \x02\x02\xA7\xA9\x05" +
		"\x14\v\x02\xA8\xA6\x03\x02\x02\x02\xA9\xAC\x03\x02\x02\x02\xAA\xA8\x03" +
		"\x02\x02\x02\xAA\xAB\x03\x02\x02\x02\xAB\xAD\x03\x02\x02\x02\xAC\xAA\x03" +
		"\x02\x02\x02\xAD\xAE\x07+\x02\x02\xAE\xBE\x03\x02\x02\x02\xAF\xB0\x07" +
		";\x02\x02\xB0\xB1\x07\"\x02\x02\xB1\xB9\x054\x1B\x02\xB2\xB3\x07 \x02" +
		"\x02\xB3\xB5\x050\x19\x02\xB4\xB2\x03\x02\x02\x02\xB5\xB8\x03\x02\x02" +
		"\x02\xB6\xB4\x03\x02\x02\x02\xB6\xB7\x03\x02\x02\x02\xB7\xBA\x03\x02\x02" +
		"\x02\xB8\xB6\x03\x02\x02\x02\xB9\xB6\x03\x02\x02\x02\xB9\xBA\x03\x02\x02" +
		"\x02\xBA\xBB\x03\x02\x02\x02\xBB\xBC\x07+\x02\x02\xBC\xBE\x03\x02\x02" +
		"\x02\xBD\x93\x03\x02\x02\x02\xBD\x95\x03\x02\x02\x02\xBD\x96\x03\x02\x02" +
		"\x02\xBD\x97\x03\x02\x02\x02\xBD\x9B\x03\x02\x02\x02\xBD\x9F\x03\x02\x02" +
		"\x02\xBD\xAF\x03\x02\x02\x02\xBE\x0F\x03\x02\x02\x02\xBF\xC0\b\t\x01\x02" +
		"\xC0\xC1\x07%\x02\x02\xC1\xC4\x05\x10\t\x06\xC2\xC4\x05\x14\v\x02\xC3" +
		"\xBF\x03\x02\x02\x02\xC3\xC2\x03\x02\x02\x02\xC4\xCD\x03\x02\x02\x02\xC5" +
		"\xC6\f\x04\x02\x02\xC6\xC7\x07\x1E\x02\x02\xC7\xCC\x05\x10\t\x05\xC8\xC9" +
		"\f\x03\x02\x02\xC9\xCA\x07*\x02\x02\xCA\xCC\x05\x10\t\x04\xCB\xC5\x03" +
		"\x02\x02\x02\xCB\xC8\x03\x02\x02\x02\xCC\xCF\x03\x02\x02\x02\xCD\xCB\x03" +
		"\x02\x02\x02\xCD\xCE\x03\x02\x02\x02\xCE\x11\x03\x02\x02\x02\xCF\xCD\x03" +
		"\x02\x02\x02\xD0\xD2\x05\x14\v\x02\xD1\xD3\x07%\x02\x02\xD2\xD1\x03\x02" +
		"\x02\x02\xD2\xD3\x03\x02\x02\x02\xD3\xD4\x03\x02\x02\x02\xD4\xD5\x07&" +
		"\x02\x02\xD5\xD6\x05b2\x02\xD6\xDF\x03\x02\x02\x02\xD7\xD9\x05\x14\v\x02" +
		"\xD8\xDA\x07%\x02\x02\xD9\xD8\x03\x02\x02\x02\xD9\xDA\x03\x02\x02\x02" +
		"\xDA\xDB\x03\x02\x02\x02\xDB\xDC\x07\'\x02\x02\xDC\xDD\x05b2\x02\xDD\xDF" +
		"\x03\x02\x02\x02\xDE\xD0\x03\x02\x02\x02\xDE\xD7\x03\x02\x02\x02\xDF\x13" +
		"\x03\x02\x02\x02\xE0\xE3\x05\x1C\x0F\x02\xE1\xE3\x05\x16\f\x02\xE2\xE0" +
		"\x03\x02\x02\x02\xE2\xE1\x03\x02\x02\x02\xE3\x15\x03\x02\x02\x02\xE4\xE5" +
		"\x05\x1C\x0F\x02\xE5\xE6\x05d3\x02\xE6\xE7\x05\x1C\x0F\x02\xE7\x17\x03" +
		"\x02\x02\x02\xE8\xE9\x05<\x1F\x02\xE9\xF2\x07\"\x02\x02\xEA\xEF\x050\x19" +
		"\x02\xEB\xEC\x07 \x02\x02\xEC\xEE\x050\x19\x02\xED\xEB\x03\x02\x02\x02" +
		"\xEE\xF1\x03\x02\x02\x02\xEF\xED\x03\x02\x02\x02\xEF\xF0\x03\x02\x02\x02" +
		"\xF0\xF3\x03\x02\x02\x02\xF1\xEF\x03\x02\x02\x02\xF2\xEA\x03\x02\x02\x02" +
		"\xF2\xF3\x03\x02\x02\x02\xF3\xF4\x03\x02\x02\x02\xF4\xF5\x07+\x02\x02" +
		"\xF5\x19\x03\x02\x02\x02\xF6\xF7\x05:\x1E\x02\xF7\u0100\x07\"\x02\x02" +
		"\xF8\xFD\x052\x1A\x02\xF9\xFA\x07 \x02\x02\xFA\xFC\x052\x1A\x02\xFB\xF9" +
		"\x03\x02\x02\x02\xFC\xFF\x03\x02\x02\x02\xFD\xFB\x03\x02\x02\x02\xFD\xFE" +
		"\x03\x02\x02\x02\xFE\u0101\x03\x02\x02\x02\xFF\xFD\x03\x02\x02\x02\u0100" +
		"\xF8\x03\x02\x02\x02\u0100\u0101\x03\x02\x02\x02\u0101\u0102\x03\x02\x02" +
		"\x02\u0102\u0103\x07+\x02\x02\u0103\x1B\x03\x02\x02\x02\u0104\u0105\b" +
		"\x0F\x01\x02\u0105\u010B\x05\x1E\x10\x02\u0106\u010B\x05\x18\r\x02\u0107" +
		"\u010B\x05\x1A\x0E\x02\u0108\u0109\t\x02\x02\x02\u0109\u010B\x05\x1C\x0F" +
		"\x05\u010A\u0104\x03\x02\x02\x02\u010A\u0106\x03\x02\x02\x02\u010A\u0107" +
		"\x03\x02\x02\x02\u010A\u0108\x03\x02\x02\x02\u010B\u0114\x03\x02\x02\x02" +
		"\u010C\u010D\f\x04\x02\x02\u010D\u010E\t\x03\x02\x02\u010E\u0113\x05\x1C" +
		"\x0F\x05\u010F\u0110\f\x03\x02\x02\u0110\u0111\t\x02\x02\x02\u0111\u0113" +
		"\x05\x1C\x0F\x04\u0112\u010C\x03\x02\x02\x02\u0112\u010F\x03\x02\x02\x02" +
		"\u0113\u0116\x03\x02\x02\x02\u0114\u0112\x03\x02\x02\x02\u0114\u0115\x03" +
		"\x02\x02\x02\u0115\x1D\x03\x02\x02\x02\u0116\u0114\x03\x02\x02\x02\u0117" +
		"\u012C\x05> \x02\u0118\u012C\x054\x1B\x02\u0119\u011A\x07\"\x02\x02\u011A" +
		"\u011B\x05\x10\t\x02\u011B\u011C\x07+\x02\x02\u011C\u012C\x03\x02\x02" +
		"\x02\u011D\u011E\x058\x1D\x02\u011E\u0127\x07\"\x02\x02\u011F\u0124\x05" +
		"\x10\t\x02\u0120\u0121\x07 \x02\x02\u0121\u0123\x05\x10\t\x02\u0122\u0120" +
		"\x03\x02\x02\x02\u0123\u0126\x03\x02\x02\x02\u0124\u0122\x03\x02\x02\x02" +
		"\u0124\u0125\x03\x02\x02\x02\u0125\u0128\x03\x02\x02\x02\u0126\u0124\x03" +
		"\x02\x02\x02\u0127\u011F\x03\x02\x02\x02\u0127\u0128\x03\x02\x02\x02\u0128" +
		"\u0129\x03\x02\x02\x02\u0129\u012A\x07+\x02\x02\u012A\u012C\x03\x02\x02" +
		"\x02\u012B\u0117\x03\x02\x02\x02\u012B\u0118\x03\x02\x02\x02\u012B\u0119" +
		"\x03\x02\x02\x02\u012B\u011D\x03\x02\x02\x02\u012C\x1F\x03\x02\x02\x02" +
		"\u012D\u012E\x07\b\x02\x02\u012E\u012F\x05\"\x12\x02\u012F!\x03\x02\x02" +
		"\x02\u0130\u0135\x05$\x13\x02\u0131\u0132\x07 \x02\x02\u0132\u0134\x05" +
		"$\x13\x02\u0133\u0131\x03\x02\x02\x02\u0134\u0137\x03\x02\x02\x02\u0135" +
		"\u0133\x03\x02\x02\x02\u0135\u0136\x03\x02\x02\x02\u0136#\x03\x02\x02" +
		"\x02\u0137\u0135\x03\x02\x02\x02\u0138\u013E\x05\x10\t\x02\u0139\u013A" +
		"\x05&\x14\x02\u013A\u013B\x07\x1F\x02\x02\u013B\u013C\x05\x10\t\x02\u013C" +
		"\u013E\x03\x02\x02\x02\u013D\u0138\x03\x02\x02\x02\u013D\u0139\x03\x02" +
		"\x02\x02\u013E%\x03\x02\x02\x02\u013F\u0140\x058\x1D\x02\u0140\'\x03\x02" +
		"\x02\x02\u0141\u0142\x07\x07\x02\x02\u0142\u0147\x05.\x18\x02\u0143\u0144" +
		"\x07 \x02\x02\u0144\u0146\x05.\x18\x02\u0145\u0143\x03\x02\x02\x02\u0146" +
		"\u0149\x03\x02\x02\x02\u0147\u0145\x03\x02\x02\x02\u0147\u0148\x03\x02" +
		"\x02\x02\u0148)\x03\x02\x02\x02\u0149\u0147\x03\x02\x02\x02\u014A\u014B" +
		"\x07\x05\x02\x02\u014B\u014C\x05\"\x12\x02\u014C+\x03\x02\x02\x02\u014D" +
		"\u014F\x07\t\x02\x02\u014E\u0150\x05\"\x12\x02\u014F\u014E\x03\x02\x02" +
		"\x02\u014F\u0150\x03\x02\x02\x02\u0150\u0153\x03\x02\x02\x02\u0151\u0152" +
		"\x07\x1C\x02\x02\u0152\u0154\x056\x1C\x02\u0153\u0151\x03\x02\x02\x02" +
		"\u0153\u0154\x03\x02\x02\x02\u0154-\x03\x02\x02\x02\u0155\u0156\t\x04" +
		"\x02\x02\u0156/\x03\x02\x02\x02\u0157\u015B\x054\x1B\x02\u0158\u015B\x05" +
		"b2\x02\u0159\u015B\x05\\/\x02\u015A\u0157\x03\x02\x02\x02\u015A\u0158" +
		"\x03\x02\x02\x02\u015A\u0159\x03\x02\x02\x02\u015B1\x03\x02\x02\x02\u015C" +
		"\u0165\x054\x1B\x02\u015D\u0165\x05b2\x02\u015E\u0165\x05\\/\x02\u015F" +
		"\u0165\x05\x1C\x0F\x02\u0160\u0161\x05\\/\x02\u0161\u0162\x07\x1D\x02" +
		"\x02\u0162\u0165\x03\x02\x02\x02\u0163\u0165\x05\x16\f\x02\u0164\u015C" +
		"\x03\x02\x02\x02\u0164\u015D\x03\x02\x02\x02\u0164\u015E\x03\x02\x02\x02" +
		"\u0164\u015F\x03\x02\x02\x02\u0164\u0160\x03\x02\x02\x02\u0164\u0163\x03" +
		"\x02\x02\x02\u01653\x03\x02\x02\x02\u0166\u016B\x058\x1D\x02\u0167\u0168" +
		"\x07!\x02\x02\u0168\u016A\x058\x1D\x02\u0169\u0167\x03\x02\x02\x02\u016A" +
		"\u016D\x03\x02\x02\x02\u016B\u0169\x03\x02\x02\x02\u016B\u016C\x03\x02" +
		"\x02\x02\u016C5\x03\x02\x02\x02\u016D\u016B\x03\x02\x02\x02\u016E\u0173" +
		"\x054\x1B\x02\u016F\u0170\x07 \x02\x02\u0170\u0172\x054\x1B\x02\u0171" +
		"\u016F\x03\x02\x02\x02\u0172\u0175\x03\x02\x02\x02\u0173\u0171\x03\x02" +
		"\x02\x02\u0173\u0174\x03\x02\x02\x02\u01747\x03\x02\x02\x02\u0175\u0173" +
		"\x03\x02\x02\x02\u0176\u0177\t\x05\x02\x02\u01779\x03\x02\x02\x02\u0178" +
		"\u0179\x079\x02\x02\u0179;\x03\x02\x02\x02\u017A\u017B\x07:\x02\x02\u017B" +
		"=\x03\x02\x02\x02\u017C\u01A2\x07)\x02\x02\u017D\u01A2\x05@!\x02\u017E" +
		"\u01A2\x05Z.\x02\u017F\u01A2\x05b2\x02\u0180\u0181\x07#\x02\x02\u0181" +
		"\u0186\x05@!\x02\u0182\u0183\x07 \x02\x02\u0183\u0185\x05@!\x02\u0184" +
		"\u0182\x03\x02\x02\x02\u0185\u0188\x03\x02\x02\x02\u0186\u0184\x03\x02" +
		"\x02\x02\u0186\u0187\x03\x02\x02\x02\u0187\u0189\x03\x02\x02\x02\u0188" +
		"\u0186\x03\x02\x02\x02\u0189\u018A\x07$\x02\x02\u018A\u01A2\x03\x02\x02" +
		"\x02\u018B\u018C\x07#\x02\x02\u018C\u0191\x05Z.\x02\u018D\u018E\x07 \x02" +
		"\x02\u018E\u0190\x05Z.\x02\u018F\u018D\x03\x02\x02\x02\u0190\u0193\x03" +
		"\x02\x02\x02\u0191\u018F\x03\x02\x02\x02\u0191\u0192\x03\x02\x02\x02\u0192" +
		"\u0194\x03\x02\x02\x02\u0193\u0191\x03\x02\x02\x02\u0194\u0195\x07$\x02" +
		"\x02\u0195\u01A2\x03\x02\x02\x02\u0196\u0197\x07#\x02\x02\u0197\u019C" +
		"\x05b2\x02\u0198\u0199\x07 \x02\x02\u0199\u019B\x05b2\x02\u019A\u0198" +
		"\x03\x02\x02\x02\u019B\u019E\x03\x02\x02\x02\u019C\u019A\x03\x02\x02\x02" +
		"\u019C\u019D\x03\x02\x02\x02\u019D\u019F\x03\x02\x02\x02\u019E\u019C\x03" +
		"\x02\x02\x02\u019F\u01A0\x07$\x02\x02\u01A0\u01A2\x03\x02\x02\x02\u01A1" +
		"\u017C\x03\x02\x02\x02\u01A1\u017D\x03\x02\x02\x02\u01A1\u017E\x03\x02" +
		"\x02\x02\u01A1\u017F\x03\x02\x02\x02\u01A1\u0180\x03\x02\x02\x02\u01A1" +
		"\u018B\x03\x02\x02\x02\u01A1\u0196\x03\x02\x02\x02\u01A2?\x03\x02\x02" +
		"\x02\u01A3\u01A6\x05^0\x02\u01A4\u01A6\x05`1\x02\u01A5\u01A3\x03\x02\x02" +
		"\x02\u01A5\u01A4\x03\x02\x02\x02\u01A6A\x03\x02\x02\x02\u01A7\u01A8\x07" +
		"\r\x02\x02\u01A8\u01A9\x07\x1A\x02\x02\u01A9C\x03\x02\x02\x02\u01AA\u01AB" +
		"\x07\v\x02\x02\u01AB\u01B0\x05F$\x02\u01AC\u01AD\x07 \x02\x02\u01AD\u01AF" +
		"\x05F$\x02\u01AE\u01AC\x03\x02\x02\x02\u01AF\u01B2\x03\x02\x02\x02\u01B0" +
		"\u01AE\x03\x02\x02\x02\u01B0\u01B1\x03\x02\x02\x02\u01B1E\x03\x02\x02" +
		"\x02\u01B2\u01B0\x03\x02\x02\x02\u01B3\u01B5\x05\x10\t\x02\u01B4\u01B6" +
		"\x076\x02\x02\u01B5\u01B4\x03\x02\x02\x02\u01B5\u01B6\x03\x02\x02\x02" +
		"\u01B6\u01B9\x03\x02\x02\x02\u01B7\u01B8\x077\x02\x02\u01B8\u01BA\x07" +
		"8\x02\x02\u01B9\u01B7\x03\x02\x02\x02\u01B9\u01BA\x03\x02\x02\x02\u01BA" +
		"G\x03\x02\x02\x02\u01BB\u01BC\x07\x0E\x02\x02\u01BC\u01BD\x056\x1C\x02" +
		"\u01BDI\x03\x02\x02\x02\u01BE\u01BF\x07\x0F\x02\x02\u01BF\u01C0\x056\x1C" +
		"\x02\u01C0K\x03\x02\x02\x02\u01C1\u01C2\x058\x1D\x02\u01C2M\x03\x02\x02" +
		"\x02\u01C3\u01C4\x07\x10\x02\x02\u01C4\u01C9\x05P)\x02\u01C5\u01C6\x07" +
		" \x02\x02\u01C6\u01C8\x05P)\x02\u01C7\u01C5\x03\x02\x02\x02\u01C8\u01CB" +
		"\x03\x02\x02\x02\u01C9\u01C7\x03\x02\x02\x02\u01C9\u01CA\x03\x02\x02\x02" +
		"\u01CAO\x03\x02\x02\x02\u01CB\u01C9\x03\x02\x02\x02\u01CC\u01CD\x05L\'" +
		"\x02\u01CD\u01CE\x07\x1F\x02\x02\u01CE\u01CF\x054\x1B\x02\u01CFQ\x03\x02" +
		"\x02\x02\u01D0\u01D1\x07\x03\x02\x02\u01D1\u01D2\x056\x1C\x02\u01D2\u01D4" +
		"\x05b2\x02\u01D3\u01D5\x05V,\x02\u01D4\u01D3\x03\x02\x02\x02\u01D4\u01D5" +
		"\x03\x02\x02\x02\u01D5S\x03\x02\x02\x02\u01D6\u01D7\x07\x04\x02\x02\u01D7" +
		"\u01D8\x056\x1C\x02\u01D8\u01D9\x05b2\x02\u01D9U\x03\x02\x02\x02\u01DA" +
		"\u01DF\x05X-\x02\u01DB\u01DC\x07 \x02\x02\u01DC\u01DE\x05X-\x02\u01DD" +
		"\u01DB\x03\x02\x02\x02\u01DE\u01E1\x03\x02\x02\x02\u01DF\u01DD\x03\x02" +
		"\x02\x02\u01DF\u01E0\x03\x02\x02\x02\u01E0W\x03\x02\x02\x02\u01E1\u01DF" +
		"\x03\x02\x02\x02\u01E2\u01E3\x058\x1D\x02\u01E3\u01E4\x07\x1F\x02\x02" +
		"\u01E4\u01E5\x05> \x02\u01E5Y\x03\x02\x02\x02\u01E6\u01E7\x07/\x02\x02" +
		"\u01E7[\x03\x02\x02\x02\u01E8\u01EB\x07\x1B\x02\x02\u01E9\u01EB\x07\x1A" +
		"\x02\x02\u01EA\u01E8\x03\x02\x02\x02\u01EA\u01E9\x03\x02\x02\x02\u01EB" +
		"]\x03\x02\x02\x02\u01EC\u01ED\x07\x1B\x02\x02\u01ED_\x03\x02\x02\x02\u01EE" +
		"\u01EF\x07\x1A\x02\x02\u01EFa\x03\x02\x02\x02\u01F0\u01F1\x07\x19\x02" +
		"\x02\u01F1c\x03\x02\x02\x02\u01F2\u01F3\x070\x02\x02\u01F3e\x03\x02\x02" +
		"\x02\u01F4\u01F5\x07\x06\x02\x02\u01F5\u01F6\x05h5\x02\u01F6g\x03\x02" +
		"\x02\x02\u01F7\u01F8\x07#\x02\x02\u01F8\u01F9\x05\x04\x03\x02\u01F9\u01FA" +
		"\x07$\x02\x02\u01FAi\x03\x02\x02\x02\u01FB\u01FC\x07\x11\x02\x02\u01FC" +
		"\u0200\x07-\x02\x02\u01FD\u01FE\x07\x11\x02\x02\u01FE\u0200\x07.\x02\x02" +
		"\u01FF\u01FB\x03\x02\x02\x02\u01FF\u01FD\x03\x02\x02\x02\u0200k\x03\x02" +
		"\x02\x021w~\x8B\xA1\xAA\xB6\xB9\xBD\xC3\xCB\xCD\xD2\xD9\xDE\xE2\xEF\xF2" +
		"\xFD\u0100\u010A\u0112\u0114\u0124\u0127\u012B\u0135\u013D\u0147\u014F" +
		"\u0153\u015A\u0164\u016B\u0173\u0186\u0191\u019C\u01A1\u01A5\u01B0\u01B5" +
		"\u01B9\u01C9\u01D4\u01DF\u01EA\u01FF";
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
	public limitCommand(): LimitCommandContext | undefined {
		return this.tryGetRuleContext(0, LimitCommandContext);
	}
	public projectCommand(): ProjectCommandContext | undefined {
		return this.tryGetRuleContext(0, ProjectCommandContext);
	}
	public renameCommand(): RenameCommandContext | undefined {
		return this.tryGetRuleContext(0, RenameCommandContext);
	}
	public dropCommand(): DropCommandContext | undefined {
		return this.tryGetRuleContext(0, DropCommandContext);
	}
	public dissectCommand(): DissectCommandContext | undefined {
		return this.tryGetRuleContext(0, DissectCommandContext);
	}
	public grokCommand(): GrokCommandContext | undefined {
		return this.tryGetRuleContext(0, GrokCommandContext);
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


export class MvExpandCommandContext extends ParserRuleContext {
	public MV_EXPAND(): TerminalNode { return this.getToken(esql_parser.MV_EXPAND, 0); }
	public qualifiedNames(): QualifiedNamesContext {
		return this.getRuleContext(0, QualifiedNamesContext);
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


export class WhereCommandContext extends ParserRuleContext {
	public WHERE(): TerminalNode { return this.getToken(esql_parser.WHERE, 0); }
	public whereBooleanExpression(): WhereBooleanExpressionContext {
		return this.getRuleContext(0, WhereBooleanExpressionContext);
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


export class WhereBooleanExpressionContext extends ParserRuleContext {
	public _left: BooleanExpressionContext;
	public _operator: Token;
	public _right: BooleanExpressionContext;
	public NOT(): TerminalNode | undefined { return this.tryGetToken(esql_parser.NOT, 0); }
	public booleanExpression(): BooleanExpressionContext[];
	public booleanExpression(i: number): BooleanExpressionContext;
	public booleanExpression(i?: number): BooleanExpressionContext | BooleanExpressionContext[] {
		if (i === undefined) {
			return this.getRuleContexts(BooleanExpressionContext);
		} else {
			return this.getRuleContext(i, BooleanExpressionContext);
		}
	}
	public valueExpression(): ValueExpressionContext[];
	public valueExpression(i: number): ValueExpressionContext;
	public valueExpression(i?: number): ValueExpressionContext | ValueExpressionContext[] {
		if (i === undefined) {
			return this.getRuleContexts(ValueExpressionContext);
		} else {
			return this.getRuleContext(i, ValueExpressionContext);
		}
	}
	public regexBooleanExpression(): RegexBooleanExpressionContext | undefined {
		return this.tryGetRuleContext(0, RegexBooleanExpressionContext);
	}
	public AND(): TerminalNode | undefined { return this.tryGetToken(esql_parser.AND, 0); }
	public OR(): TerminalNode | undefined { return this.tryGetToken(esql_parser.OR, 0); }
	public IN(): TerminalNode | undefined { return this.tryGetToken(esql_parser.IN, 0); }
	public LP(): TerminalNode | undefined { return this.tryGetToken(esql_parser.LP, 0); }
	public RP(): TerminalNode | undefined { return this.tryGetToken(esql_parser.RP, 0); }
	public COMMA(): TerminalNode[];
	public COMMA(i: number): TerminalNode;
	public COMMA(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(esql_parser.COMMA);
		} else {
			return this.getToken(esql_parser.COMMA, i);
		}
	}
	public WHERE_FUNCTIONS(): TerminalNode | undefined { return this.tryGetToken(esql_parser.WHERE_FUNCTIONS, 0); }
	public qualifiedName(): QualifiedNameContext | undefined {
		return this.tryGetRuleContext(0, QualifiedNameContext);
	}
	public functionExpressionArgument(): FunctionExpressionArgumentContext[];
	public functionExpressionArgument(i: number): FunctionExpressionArgumentContext;
	public functionExpressionArgument(i?: number): FunctionExpressionArgumentContext | FunctionExpressionArgumentContext[] {
		if (i === undefined) {
			return this.getRuleContexts(FunctionExpressionArgumentContext);
		} else {
			return this.getRuleContext(i, FunctionExpressionArgumentContext);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_whereBooleanExpression; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterWhereBooleanExpression) {
			listener.enterWhereBooleanExpression(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitWhereBooleanExpression) {
			listener.exitWhereBooleanExpression(this);
		}
	}
}


export class BooleanExpressionContext extends ParserRuleContext {
	public _left: BooleanExpressionContext;
	public _operator: Token;
	public _right: BooleanExpressionContext;
	public NOT(): TerminalNode | undefined { return this.tryGetToken(esql_parser.NOT, 0); }
	public booleanExpression(): BooleanExpressionContext[];
	public booleanExpression(i: number): BooleanExpressionContext;
	public booleanExpression(i?: number): BooleanExpressionContext | BooleanExpressionContext[] {
		if (i === undefined) {
			return this.getRuleContexts(BooleanExpressionContext);
		} else {
			return this.getRuleContext(i, BooleanExpressionContext);
		}
	}
	public valueExpression(): ValueExpressionContext | undefined {
		return this.tryGetRuleContext(0, ValueExpressionContext);
	}
	public AND(): TerminalNode | undefined { return this.tryGetToken(esql_parser.AND, 0); }
	public OR(): TerminalNode | undefined { return this.tryGetToken(esql_parser.OR, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_booleanExpression; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterBooleanExpression) {
			listener.enterBooleanExpression(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitBooleanExpression) {
			listener.exitBooleanExpression(this);
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
	public operatorExpression(): OperatorExpressionContext | undefined {
		return this.tryGetRuleContext(0, OperatorExpressionContext);
	}
	public comparison(): ComparisonContext | undefined {
		return this.tryGetRuleContext(0, ComparisonContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_valueExpression; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterValueExpression) {
			listener.enterValueExpression(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitValueExpression) {
			listener.exitValueExpression(this);
		}
	}
}


export class ComparisonContext extends ParserRuleContext {
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
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_comparison; }
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


export class MathFnContext extends ParserRuleContext {
	public functionIdentifier(): FunctionIdentifierContext {
		return this.getRuleContext(0, FunctionIdentifierContext);
	}
	public LP(): TerminalNode { return this.getToken(esql_parser.LP, 0); }
	public RP(): TerminalNode { return this.getToken(esql_parser.RP, 0); }
	public functionExpressionArgument(): FunctionExpressionArgumentContext[];
	public functionExpressionArgument(i: number): FunctionExpressionArgumentContext;
	public functionExpressionArgument(i?: number): FunctionExpressionArgumentContext | FunctionExpressionArgumentContext[] {
		if (i === undefined) {
			return this.getRuleContexts(FunctionExpressionArgumentContext);
		} else {
			return this.getRuleContext(i, FunctionExpressionArgumentContext);
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
	public get ruleIndex(): number { return esql_parser.RULE_mathFn; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterMathFn) {
			listener.enterMathFn(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitMathFn) {
			listener.exitMathFn(this);
		}
	}
}


export class MathEvalFnContext extends ParserRuleContext {
	public mathFunctionIdentifier(): MathFunctionIdentifierContext {
		return this.getRuleContext(0, MathFunctionIdentifierContext);
	}
	public LP(): TerminalNode { return this.getToken(esql_parser.LP, 0); }
	public RP(): TerminalNode { return this.getToken(esql_parser.RP, 0); }
	public mathFunctionExpressionArgument(): MathFunctionExpressionArgumentContext[];
	public mathFunctionExpressionArgument(i: number): MathFunctionExpressionArgumentContext;
	public mathFunctionExpressionArgument(i?: number): MathFunctionExpressionArgumentContext | MathFunctionExpressionArgumentContext[] {
		if (i === undefined) {
			return this.getRuleContexts(MathFunctionExpressionArgumentContext);
		} else {
			return this.getRuleContext(i, MathFunctionExpressionArgumentContext);
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
	public get ruleIndex(): number { return esql_parser.RULE_mathEvalFn; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterMathEvalFn) {
			listener.enterMathEvalFn(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitMathEvalFn) {
			listener.exitMathEvalFn(this);
		}
	}
}


export class OperatorExpressionContext extends ParserRuleContext {
	public _left: OperatorExpressionContext;
	public _operator: Token;
	public _right: OperatorExpressionContext;
	public primaryExpression(): PrimaryExpressionContext | undefined {
		return this.tryGetRuleContext(0, PrimaryExpressionContext);
	}
	public mathFn(): MathFnContext | undefined {
		return this.tryGetRuleContext(0, MathFnContext);
	}
	public mathEvalFn(): MathEvalFnContext | undefined {
		return this.tryGetRuleContext(0, MathEvalFnContext);
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
	public MINUS(): TerminalNode | undefined { return this.tryGetToken(esql_parser.MINUS, 0); }
	public PLUS(): TerminalNode | undefined { return this.tryGetToken(esql_parser.PLUS, 0); }
	public ASTERISK(): TerminalNode | undefined { return this.tryGetToken(esql_parser.ASTERISK, 0); }
	public SLASH(): TerminalNode | undefined { return this.tryGetToken(esql_parser.SLASH, 0); }
	public PERCENT(): TerminalNode | undefined { return this.tryGetToken(esql_parser.PERCENT, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_operatorExpression; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterOperatorExpression) {
			listener.enterOperatorExpression(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitOperatorExpression) {
			listener.exitOperatorExpression(this);
		}
	}
}


export class PrimaryExpressionContext extends ParserRuleContext {
	public constant(): ConstantContext | undefined {
		return this.tryGetRuleContext(0, ConstantContext);
	}
	public qualifiedName(): QualifiedNameContext | undefined {
		return this.tryGetRuleContext(0, QualifiedNameContext);
	}
	public LP(): TerminalNode | undefined { return this.tryGetToken(esql_parser.LP, 0); }
	public booleanExpression(): BooleanExpressionContext[];
	public booleanExpression(i: number): BooleanExpressionContext;
	public booleanExpression(i?: number): BooleanExpressionContext | BooleanExpressionContext[] {
		if (i === undefined) {
			return this.getRuleContexts(BooleanExpressionContext);
		} else {
			return this.getRuleContext(i, BooleanExpressionContext);
		}
	}
	public RP(): TerminalNode | undefined { return this.tryGetToken(esql_parser.RP, 0); }
	public identifier(): IdentifierContext | undefined {
		return this.tryGetRuleContext(0, IdentifierContext);
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
	public get ruleIndex(): number { return esql_parser.RULE_primaryExpression; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterPrimaryExpression) {
			listener.enterPrimaryExpression(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitPrimaryExpression) {
			listener.exitPrimaryExpression(this);
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
	public userVariable(): UserVariableContext | undefined {
		return this.tryGetRuleContext(0, UserVariableContext);
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


export class UserVariableContext extends ParserRuleContext {
	public identifier(): IdentifierContext {
		return this.getRuleContext(0, IdentifierContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_userVariable; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterUserVariable) {
			listener.enterUserVariable(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitUserVariable) {
			listener.exitUserVariable(this);
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
	public qualifiedNames(): QualifiedNamesContext | undefined {
		return this.tryGetRuleContext(0, QualifiedNamesContext);
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


export class FunctionExpressionArgumentContext extends ParserRuleContext {
	public qualifiedName(): QualifiedNameContext | undefined {
		return this.tryGetRuleContext(0, QualifiedNameContext);
	}
	public string(): StringContext | undefined {
		return this.tryGetRuleContext(0, StringContext);
	}
	public number(): NumberContext | undefined {
		return this.tryGetRuleContext(0, NumberContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_functionExpressionArgument; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterFunctionExpressionArgument) {
			listener.enterFunctionExpressionArgument(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitFunctionExpressionArgument) {
			listener.exitFunctionExpressionArgument(this);
		}
	}
}


export class MathFunctionExpressionArgumentContext extends ParserRuleContext {
	public qualifiedName(): QualifiedNameContext | undefined {
		return this.tryGetRuleContext(0, QualifiedNameContext);
	}
	public string(): StringContext | undefined {
		return this.tryGetRuleContext(0, StringContext);
	}
	public number(): NumberContext | undefined {
		return this.tryGetRuleContext(0, NumberContext);
	}
	public operatorExpression(): OperatorExpressionContext | undefined {
		return this.tryGetRuleContext(0, OperatorExpressionContext);
	}
	public DATE_LITERAL(): TerminalNode | undefined { return this.tryGetToken(esql_parser.DATE_LITERAL, 0); }
	public comparison(): ComparisonContext | undefined {
		return this.tryGetRuleContext(0, ComparisonContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_mathFunctionExpressionArgument; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterMathFunctionExpressionArgument) {
			listener.enterMathFunctionExpressionArgument(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitMathFunctionExpressionArgument) {
			listener.exitMathFunctionExpressionArgument(this);
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


export class QualifiedNamesContext extends ParserRuleContext {
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
	public get ruleIndex(): number { return esql_parser.RULE_qualifiedNames; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterQualifiedNames) {
			listener.enterQualifiedNames(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitQualifiedNames) {
			listener.exitQualifiedNames(this);
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


export class MathFunctionIdentifierContext extends ParserRuleContext {
	public MATH_FUNCTION(): TerminalNode { return this.getToken(esql_parser.MATH_FUNCTION, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_mathFunctionIdentifier; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterMathFunctionIdentifier) {
			listener.enterMathFunctionIdentifier(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitMathFunctionIdentifier) {
			listener.exitMathFunctionIdentifier(this);
		}
	}
}


export class FunctionIdentifierContext extends ParserRuleContext {
	public UNARY_FUNCTION(): TerminalNode { return this.getToken(esql_parser.UNARY_FUNCTION, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_functionIdentifier; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterFunctionIdentifier) {
			listener.enterFunctionIdentifier(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitFunctionIdentifier) {
			listener.exitFunctionIdentifier(this);
		}
	}
}


export class ConstantContext extends ParserRuleContext {
	public NULL(): TerminalNode | undefined { return this.tryGetToken(esql_parser.NULL, 0); }
	public numericValue(): NumericValueContext[];
	public numericValue(i: number): NumericValueContext;
	public numericValue(i?: number): NumericValueContext | NumericValueContext[] {
		if (i === undefined) {
			return this.getRuleContexts(NumericValueContext);
		} else {
			return this.getRuleContext(i, NumericValueContext);
		}
	}
	public booleanValue(): BooleanValueContext[];
	public booleanValue(i: number): BooleanValueContext;
	public booleanValue(i?: number): BooleanValueContext | BooleanValueContext[] {
		if (i === undefined) {
			return this.getRuleContexts(BooleanValueContext);
		} else {
			return this.getRuleContext(i, BooleanValueContext);
		}
	}
	public string(): StringContext[];
	public string(i: number): StringContext;
	public string(i?: number): StringContext | StringContext[] {
		if (i === undefined) {
			return this.getRuleContexts(StringContext);
		} else {
			return this.getRuleContext(i, StringContext);
		}
	}
	public OPENING_BRACKET(): TerminalNode | undefined { return this.tryGetToken(esql_parser.OPENING_BRACKET, 0); }
	public CLOSING_BRACKET(): TerminalNode | undefined { return this.tryGetToken(esql_parser.CLOSING_BRACKET, 0); }
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
	public get ruleIndex(): number { return esql_parser.RULE_constant; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterConstant) {
			listener.enterConstant(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitConstant) {
			listener.exitConstant(this);
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
	public booleanExpression(): BooleanExpressionContext {
		return this.getRuleContext(0, BooleanExpressionContext);
	}
	public ORDERING(): TerminalNode | undefined { return this.tryGetToken(esql_parser.ORDERING, 0); }
	public NULLS_ORDERING(): TerminalNode | undefined { return this.tryGetToken(esql_parser.NULLS_ORDERING, 0); }
	public NULLS_ORDERING_DIRECTION(): TerminalNode | undefined { return this.tryGetToken(esql_parser.NULLS_ORDERING_DIRECTION, 0); }
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


export class ProjectCommandContext extends ParserRuleContext {
	public PROJECT(): TerminalNode { return this.getToken(esql_parser.PROJECT, 0); }
	public qualifiedNames(): QualifiedNamesContext {
		return this.getRuleContext(0, QualifiedNamesContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_projectCommand; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterProjectCommand) {
			listener.enterProjectCommand(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitProjectCommand) {
			listener.exitProjectCommand(this);
		}
	}
}


export class DropCommandContext extends ParserRuleContext {
	public DROP(): TerminalNode { return this.getToken(esql_parser.DROP, 0); }
	public qualifiedNames(): QualifiedNamesContext {
		return this.getRuleContext(0, QualifiedNamesContext);
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


export class RenameVariableContext extends ParserRuleContext {
	public identifier(): IdentifierContext {
		return this.getRuleContext(0, IdentifierContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_renameVariable; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterRenameVariable) {
			listener.enterRenameVariable(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitRenameVariable) {
			listener.exitRenameVariable(this);
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
	public renameVariable(): RenameVariableContext {
		return this.getRuleContext(0, RenameVariableContext);
	}
	public ASSIGN(): TerminalNode { return this.getToken(esql_parser.ASSIGN, 0); }
	public qualifiedName(): QualifiedNameContext {
		return this.getRuleContext(0, QualifiedNameContext);
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
	public qualifiedNames(): QualifiedNamesContext {
		return this.getRuleContext(0, QualifiedNamesContext);
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
	public qualifiedNames(): QualifiedNamesContext {
		return this.getRuleContext(0, QualifiedNamesContext);
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
	public BOOLEAN_VALUE(): TerminalNode { return this.getToken(esql_parser.BOOLEAN_VALUE, 0); }
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


export class NumberContext extends ParserRuleContext {
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_number; }
	public copyFrom(ctx: NumberContext): void {
		super.copyFrom(ctx);
	}
}
export class DecimalLiteralContext extends NumberContext {
	public DECIMAL_LITERAL(): TerminalNode { return this.getToken(esql_parser.DECIMAL_LITERAL, 0); }
	constructor(ctx: NumberContext) {
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
export class IntegerLiteralContext extends NumberContext {
	public INTEGER_LITERAL(): TerminalNode { return this.getToken(esql_parser.INTEGER_LITERAL, 0); }
	constructor(ctx: NumberContext) {
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


export class DecimalValueContext extends ParserRuleContext {
	public DECIMAL_LITERAL(): TerminalNode { return this.getToken(esql_parser.DECIMAL_LITERAL, 0); }
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
	public COMPARISON_OPERATOR(): TerminalNode { return this.getToken(esql_parser.COMPARISON_OPERATOR, 0); }
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
	public SHOW(): TerminalNode { return this.getToken(esql_parser.SHOW, 0); }
	public INFO(): TerminalNode | undefined { return this.tryGetToken(esql_parser.INFO, 0); }
	public FUNCTIONS(): TerminalNode | undefined { return this.tryGetToken(esql_parser.FUNCTIONS, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return esql_parser.RULE_showCommand; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterShowCommand) {
			listener.enterShowCommand(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitShowCommand) {
			listener.exitShowCommand(this);
		}
	}
}


