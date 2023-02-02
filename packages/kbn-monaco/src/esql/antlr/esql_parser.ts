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
	public static readonly EVAL = 1;
	public static readonly EXPLAIN = 2;
	public static readonly FROM = 3;
	public static readonly ROW = 4;
	public static readonly STATS = 5;
	public static readonly WHERE = 6;
	public static readonly SORT = 7;
	public static readonly LIMIT = 8;
	public static readonly PROJECT = 9;
	public static readonly LINE_COMMENT = 10;
	public static readonly MULTILINE_COMMENT = 11;
	public static readonly WS = 12;
	public static readonly PIPE = 13;
	public static readonly STRING = 14;
	public static readonly INTEGER_LITERAL = 15;
	public static readonly DECIMAL_LITERAL = 16;
	public static readonly BY = 17;
	public static readonly AND = 18;
	public static readonly ASSIGN = 19;
	public static readonly COMMA = 20;
	public static readonly DOT = 21;
	public static readonly LP = 22;
	public static readonly OPENING_BRACKET = 23;
	public static readonly CLOSING_BRACKET = 24;
	public static readonly NOT = 25;
	public static readonly NULL = 26;
	public static readonly OR = 27;
	public static readonly RP = 28;
	public static readonly BOOLEAN_VALUE = 29;
	public static readonly COMPARISON_OPERATOR = 30;
	public static readonly PLUS = 31;
	public static readonly MINUS = 32;
	public static readonly ASTERISK = 33;
	public static readonly SLASH = 34;
	public static readonly PERCENT = 35;
	public static readonly ORDERING = 36;
	public static readonly NULLS_ORDERING = 37;
	public static readonly NULLS_ORDERING_DIRECTION = 38;
	public static readonly MATH_FUNCTION = 39;
	public static readonly UNARY_FUNCTION = 40;
	public static readonly UNQUOTED_IDENTIFIER = 41;
	public static readonly QUOTED_IDENTIFIER = 42;
	public static readonly EXPR_LINE_COMMENT = 43;
	public static readonly EXPR_MULTILINE_COMMENT = 44;
	public static readonly EXPR_WS = 45;
	public static readonly SRC_UNQUOTED_IDENTIFIER = 46;
	public static readonly SRC_QUOTED_IDENTIFIER = 47;
	public static readonly SRC_LINE_COMMENT = 48;
	public static readonly SRC_MULTILINE_COMMENT = 49;
	public static readonly SRC_WS = 50;
	public static readonly RULE_singleStatement = 0;
	public static readonly RULE_query = 1;
	public static readonly RULE_sourceCommand = 2;
	public static readonly RULE_processingCommand = 3;
	public static readonly RULE_whereCommand = 4;
	public static readonly RULE_booleanExpression = 5;
	public static readonly RULE_valueExpression = 6;
	public static readonly RULE_comparison = 7;
	public static readonly RULE_mathFn = 8;
	public static readonly RULE_mathEvalFn = 9;
	public static readonly RULE_operatorExpression = 10;
	public static readonly RULE_primaryExpression = 11;
	public static readonly RULE_rowCommand = 12;
	public static readonly RULE_fields = 13;
	public static readonly RULE_field = 14;
	public static readonly RULE_userVariable = 15;
	public static readonly RULE_fromCommand = 16;
	public static readonly RULE_evalCommand = 17;
	public static readonly RULE_statsCommand = 18;
	public static readonly RULE_sourceIdentifier = 19;
	public static readonly RULE_functionExpressionArgument = 20;
	public static readonly RULE_mathFunctionExpressionArgument = 21;
	public static readonly RULE_qualifiedName = 22;
	public static readonly RULE_qualifiedNames = 23;
	public static readonly RULE_identifier = 24;
	public static readonly RULE_mathFunctionIdentifier = 25;
	public static readonly RULE_functionIdentifier = 26;
	public static readonly RULE_constant = 27;
	public static readonly RULE_limitCommand = 28;
	public static readonly RULE_sortCommand = 29;
	public static readonly RULE_orderExpression = 30;
	public static readonly RULE_projectCommand = 31;
	public static readonly RULE_projectClause = 32;
	public static readonly RULE_booleanValue = 33;
	public static readonly RULE_number = 34;
	public static readonly RULE_string = 35;
	public static readonly RULE_comparisonOperator = 36;
	public static readonly RULE_explainCommand = 37;
	public static readonly RULE_subqueryExpression = 38;
	// tslint:disable:no-trailing-whitespace
	public static readonly ruleNames: string[] = [
		"singleStatement", "query", "sourceCommand", "processingCommand", "whereCommand", 
		"booleanExpression", "valueExpression", "comparison", "mathFn", "mathEvalFn", 
		"operatorExpression", "primaryExpression", "rowCommand", "fields", "field", 
		"userVariable", "fromCommand", "evalCommand", "statsCommand", "sourceIdentifier", 
		"functionExpressionArgument", "mathFunctionExpressionArgument", "qualifiedName", 
		"qualifiedNames", "identifier", "mathFunctionIdentifier", "functionIdentifier", 
		"constant", "limitCommand", "sortCommand", "orderExpression", "projectCommand", 
		"projectClause", "booleanValue", "number", "string", "comparisonOperator", 
		"explainCommand", "subqueryExpression",
	];

	private static readonly _LITERAL_NAMES: Array<string | undefined> = [
		undefined, "'eval'", "'explain'", "'from'", "'row'", "'stats'", "'where'", 
		"'sort'", "'limit'", "'project'", undefined, undefined, undefined, undefined, 
		undefined, undefined, undefined, "'by'", "'and'", undefined, undefined, 
		"'.'", "'('", "'['", "']'", "'not'", "'null'", "'or'", "')'", undefined, 
		undefined, "'+'", "'-'", "'*'", "'/'", "'%'", undefined, "'nulls'", undefined, 
		"'round'",
	];
	private static readonly _SYMBOLIC_NAMES: Array<string | undefined> = [
		undefined, "EVAL", "EXPLAIN", "FROM", "ROW", "STATS", "WHERE", "SORT", 
		"LIMIT", "PROJECT", "LINE_COMMENT", "MULTILINE_COMMENT", "WS", "PIPE", 
		"STRING", "INTEGER_LITERAL", "DECIMAL_LITERAL", "BY", "AND", "ASSIGN", 
		"COMMA", "DOT", "LP", "OPENING_BRACKET", "CLOSING_BRACKET", "NOT", "NULL", 
		"OR", "RP", "BOOLEAN_VALUE", "COMPARISON_OPERATOR", "PLUS", "MINUS", "ASTERISK", 
		"SLASH", "PERCENT", "ORDERING", "NULLS_ORDERING", "NULLS_ORDERING_DIRECTION", 
		"MATH_FUNCTION", "UNARY_FUNCTION", "UNQUOTED_IDENTIFIER", "QUOTED_IDENTIFIER", 
		"EXPR_LINE_COMMENT", "EXPR_MULTILINE_COMMENT", "EXPR_WS", "SRC_UNQUOTED_IDENTIFIER", 
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
			this.state = 78;
			this.query(0);
			this.state = 79;
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

			this.state = 82;
			this.sourceCommand();
			}
			this._ctx._stop = this._input.tryLT(-1);
			this.state = 89;
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
					this.state = 84;
					if (!(this.precpred(this._ctx, 1))) {
						throw new FailedPredicateException(this, "this.precpred(this._ctx, 1)");
					}
					this.state = 85;
					this.match(esql_parser.PIPE);
					this.state = 86;
					this.processingCommand();
					}
					}
				}
				this.state = 91;
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
			this.state = 95;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case esql_parser.EXPLAIN:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 92;
				this.explainCommand();
				}
				break;
			case esql_parser.FROM:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 93;
				this.fromCommand();
				}
				break;
			case esql_parser.ROW:
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 94;
				this.rowCommand();
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
			this.state = 103;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case esql_parser.EVAL:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 97;
				this.evalCommand();
				}
				break;
			case esql_parser.LIMIT:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 98;
				this.limitCommand();
				}
				break;
			case esql_parser.PROJECT:
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 99;
				this.projectCommand();
				}
				break;
			case esql_parser.SORT:
				this.enterOuterAlt(_localctx, 4);
				{
				this.state = 100;
				this.sortCommand();
				}
				break;
			case esql_parser.STATS:
				this.enterOuterAlt(_localctx, 5);
				{
				this.state = 101;
				this.statsCommand();
				}
				break;
			case esql_parser.WHERE:
				this.enterOuterAlt(_localctx, 6);
				{
				this.state = 102;
				this.whereCommand();
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
			this.state = 105;
			this.match(esql_parser.WHERE);
			this.state = 106;
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
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 112;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case esql_parser.NOT:
				{
				this.state = 109;
				this.match(esql_parser.NOT);
				this.state = 110;
				this.booleanExpression(4);
				}
				break;
			case esql_parser.STRING:
			case esql_parser.INTEGER_LITERAL:
			case esql_parser.DECIMAL_LITERAL:
			case esql_parser.LP:
			case esql_parser.NULL:
			case esql_parser.BOOLEAN_VALUE:
			case esql_parser.PLUS:
			case esql_parser.MINUS:
			case esql_parser.MATH_FUNCTION:
			case esql_parser.UNARY_FUNCTION:
			case esql_parser.UNQUOTED_IDENTIFIER:
			case esql_parser.QUOTED_IDENTIFIER:
				{
				this.state = 111;
				this.valueExpression();
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
			this._ctx._stop = this._input.tryLT(-1);
			this.state = 122;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 5, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					if (this._parseListeners != null) {
						this.triggerExitRuleEvent();
					}
					_prevctx = _localctx;
					{
					this.state = 120;
					this._errHandler.sync(this);
					switch ( this.interpreter.adaptivePredict(this._input, 4, this._ctx) ) {
					case 1:
						{
						_localctx = new BooleanExpressionContext(_parentctx, _parentState);
						_localctx._left = _prevctx;
						this.pushNewRecursionContext(_localctx, _startState, esql_parser.RULE_booleanExpression);
						this.state = 114;
						if (!(this.precpred(this._ctx, 2))) {
							throw new FailedPredicateException(this, "this.precpred(this._ctx, 2)");
						}
						this.state = 115;
						_localctx._operator = this.match(esql_parser.AND);
						this.state = 116;
						_localctx._right = this.booleanExpression(3);
						}
						break;

					case 2:
						{
						_localctx = new BooleanExpressionContext(_parentctx, _parentState);
						_localctx._left = _prevctx;
						this.pushNewRecursionContext(_localctx, _startState, esql_parser.RULE_booleanExpression);
						this.state = 117;
						if (!(this.precpred(this._ctx, 1))) {
							throw new FailedPredicateException(this, "this.precpred(this._ctx, 1)");
						}
						this.state = 118;
						_localctx._operator = this.match(esql_parser.OR);
						this.state = 119;
						_localctx._right = this.booleanExpression(2);
						}
						break;
					}
					}
				}
				this.state = 124;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 5, this._ctx);
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
	public valueExpression(): ValueExpressionContext {
		let _localctx: ValueExpressionContext = new ValueExpressionContext(this._ctx, this.state);
		this.enterRule(_localctx, 12, esql_parser.RULE_valueExpression);
		try {
			this.state = 127;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 6, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 125;
				this.operatorExpression(0);
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 126;
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
		this.enterRule(_localctx, 14, esql_parser.RULE_comparison);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 129;
			_localctx._left = this.operatorExpression(0);
			this.state = 130;
			this.comparisonOperator();
			this.state = 131;
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
		this.enterRule(_localctx, 16, esql_parser.RULE_mathFn);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 133;
			this.functionIdentifier();
			this.state = 134;
			this.match(esql_parser.LP);
			this.state = 143;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (((((_la - 14)) & ~0x1F) === 0 && ((1 << (_la - 14)) & ((1 << (esql_parser.STRING - 14)) | (1 << (esql_parser.UNQUOTED_IDENTIFIER - 14)) | (1 << (esql_parser.QUOTED_IDENTIFIER - 14)))) !== 0)) {
				{
				this.state = 135;
				this.functionExpressionArgument();
				this.state = 140;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la === esql_parser.COMMA) {
					{
					{
					this.state = 136;
					this.match(esql_parser.COMMA);
					this.state = 137;
					this.functionExpressionArgument();
					}
					}
					this.state = 142;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				}
			}

			this.state = 145;
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
		this.enterRule(_localctx, 18, esql_parser.RULE_mathEvalFn);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 147;
			this.mathFunctionIdentifier();
			this.state = 148;
			this.match(esql_parser.LP);
			this.state = 157;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (((((_la - 14)) & ~0x1F) === 0 && ((1 << (_la - 14)) & ((1 << (esql_parser.STRING - 14)) | (1 << (esql_parser.INTEGER_LITERAL - 14)) | (1 << (esql_parser.DECIMAL_LITERAL - 14)) | (1 << (esql_parser.LP - 14)) | (1 << (esql_parser.NULL - 14)) | (1 << (esql_parser.BOOLEAN_VALUE - 14)) | (1 << (esql_parser.PLUS - 14)) | (1 << (esql_parser.MINUS - 14)) | (1 << (esql_parser.MATH_FUNCTION - 14)) | (1 << (esql_parser.UNARY_FUNCTION - 14)) | (1 << (esql_parser.UNQUOTED_IDENTIFIER - 14)) | (1 << (esql_parser.QUOTED_IDENTIFIER - 14)))) !== 0)) {
				{
				this.state = 149;
				this.mathFunctionExpressionArgument();
				this.state = 154;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la === esql_parser.COMMA) {
					{
					{
					this.state = 150;
					this.match(esql_parser.COMMA);
					this.state = 151;
					this.mathFunctionExpressionArgument();
					}
					}
					this.state = 156;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				}
			}

			this.state = 159;
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
		let _startState: number = 20;
		this.enterRecursionRule(_localctx, 20, esql_parser.RULE_operatorExpression, _p);
		let _la: number;
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 167;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case esql_parser.STRING:
			case esql_parser.INTEGER_LITERAL:
			case esql_parser.DECIMAL_LITERAL:
			case esql_parser.LP:
			case esql_parser.NULL:
			case esql_parser.BOOLEAN_VALUE:
			case esql_parser.UNQUOTED_IDENTIFIER:
			case esql_parser.QUOTED_IDENTIFIER:
				{
				this.state = 162;
				this.primaryExpression();
				}
				break;
			case esql_parser.UNARY_FUNCTION:
				{
				this.state = 163;
				this.mathFn();
				}
				break;
			case esql_parser.MATH_FUNCTION:
				{
				this.state = 164;
				this.mathEvalFn();
				}
				break;
			case esql_parser.PLUS:
			case esql_parser.MINUS:
				{
				this.state = 165;
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
				this.state = 166;
				this.operatorExpression(3);
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
			this._ctx._stop = this._input.tryLT(-1);
			this.state = 177;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 13, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					if (this._parseListeners != null) {
						this.triggerExitRuleEvent();
					}
					_prevctx = _localctx;
					{
					this.state = 175;
					this._errHandler.sync(this);
					switch ( this.interpreter.adaptivePredict(this._input, 12, this._ctx) ) {
					case 1:
						{
						_localctx = new OperatorExpressionContext(_parentctx, _parentState);
						_localctx._left = _prevctx;
						this.pushNewRecursionContext(_localctx, _startState, esql_parser.RULE_operatorExpression);
						this.state = 169;
						if (!(this.precpred(this._ctx, 2))) {
							throw new FailedPredicateException(this, "this.precpred(this._ctx, 2)");
						}
						this.state = 170;
						_localctx._operator = this._input.LT(1);
						_la = this._input.LA(1);
						if (!(((((_la - 33)) & ~0x1F) === 0 && ((1 << (_la - 33)) & ((1 << (esql_parser.ASTERISK - 33)) | (1 << (esql_parser.SLASH - 33)) | (1 << (esql_parser.PERCENT - 33)))) !== 0))) {
							_localctx._operator = this._errHandler.recoverInline(this);
						} else {
							if (this._input.LA(1) === Token.EOF) {
								this.matchedEOF = true;
							}

							this._errHandler.reportMatch(this);
							this.consume();
						}
						this.state = 171;
						_localctx._right = this.operatorExpression(3);
						}
						break;

					case 2:
						{
						_localctx = new OperatorExpressionContext(_parentctx, _parentState);
						_localctx._left = _prevctx;
						this.pushNewRecursionContext(_localctx, _startState, esql_parser.RULE_operatorExpression);
						this.state = 172;
						if (!(this.precpred(this._ctx, 1))) {
							throw new FailedPredicateException(this, "this.precpred(this._ctx, 1)");
						}
						this.state = 173;
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
						this.state = 174;
						_localctx._right = this.operatorExpression(2);
						}
						break;
					}
					}
				}
				this.state = 179;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 13, this._ctx);
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
		this.enterRule(_localctx, 22, esql_parser.RULE_primaryExpression);
		let _la: number;
		try {
			this.state = 200;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 16, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 180;
				this.constant();
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 181;
				this.qualifiedName();
				}
				break;

			case 3:
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 182;
				this.match(esql_parser.LP);
				this.state = 183;
				this.booleanExpression(0);
				this.state = 184;
				this.match(esql_parser.RP);
				}
				break;

			case 4:
				this.enterOuterAlt(_localctx, 4);
				{
				this.state = 186;
				this.identifier();
				this.state = 187;
				this.match(esql_parser.LP);
				this.state = 196;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (((((_la - 14)) & ~0x1F) === 0 && ((1 << (_la - 14)) & ((1 << (esql_parser.STRING - 14)) | (1 << (esql_parser.INTEGER_LITERAL - 14)) | (1 << (esql_parser.DECIMAL_LITERAL - 14)) | (1 << (esql_parser.LP - 14)) | (1 << (esql_parser.NOT - 14)) | (1 << (esql_parser.NULL - 14)) | (1 << (esql_parser.BOOLEAN_VALUE - 14)) | (1 << (esql_parser.PLUS - 14)) | (1 << (esql_parser.MINUS - 14)) | (1 << (esql_parser.MATH_FUNCTION - 14)) | (1 << (esql_parser.UNARY_FUNCTION - 14)) | (1 << (esql_parser.UNQUOTED_IDENTIFIER - 14)) | (1 << (esql_parser.QUOTED_IDENTIFIER - 14)))) !== 0)) {
					{
					this.state = 188;
					this.booleanExpression(0);
					this.state = 193;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
					while (_la === esql_parser.COMMA) {
						{
						{
						this.state = 189;
						this.match(esql_parser.COMMA);
						this.state = 190;
						this.booleanExpression(0);
						}
						}
						this.state = 195;
						this._errHandler.sync(this);
						_la = this._input.LA(1);
					}
					}
				}

				this.state = 198;
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
		this.enterRule(_localctx, 24, esql_parser.RULE_rowCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 202;
			this.match(esql_parser.ROW);
			this.state = 203;
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
		this.enterRule(_localctx, 26, esql_parser.RULE_fields);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 205;
			this.field();
			this.state = 210;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 17, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 206;
					this.match(esql_parser.COMMA);
					this.state = 207;
					this.field();
					}
					}
				}
				this.state = 212;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 17, this._ctx);
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
		this.enterRule(_localctx, 28, esql_parser.RULE_field);
		try {
			this.state = 218;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 18, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 213;
				this.booleanExpression(0);
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 214;
				this.userVariable();
				this.state = 215;
				this.match(esql_parser.ASSIGN);
				this.state = 216;
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
		this.enterRule(_localctx, 30, esql_parser.RULE_userVariable);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 220;
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
		this.enterRule(_localctx, 32, esql_parser.RULE_fromCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 222;
			this.match(esql_parser.FROM);
			this.state = 223;
			this.sourceIdentifier();
			this.state = 228;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 19, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 224;
					this.match(esql_parser.COMMA);
					this.state = 225;
					this.sourceIdentifier();
					}
					}
				}
				this.state = 230;
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
	public evalCommand(): EvalCommandContext {
		let _localctx: EvalCommandContext = new EvalCommandContext(this._ctx, this.state);
		this.enterRule(_localctx, 34, esql_parser.RULE_evalCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 231;
			this.match(esql_parser.EVAL);
			this.state = 232;
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
		this.enterRule(_localctx, 36, esql_parser.RULE_statsCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 234;
			this.match(esql_parser.STATS);
			this.state = 235;
			this.fields();
			this.state = 238;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 20, this._ctx) ) {
			case 1:
				{
				this.state = 236;
				this.match(esql_parser.BY);
				this.state = 237;
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
		this.enterRule(_localctx, 38, esql_parser.RULE_sourceIdentifier);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 240;
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
		this.enterRule(_localctx, 40, esql_parser.RULE_functionExpressionArgument);
		try {
			this.state = 244;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case esql_parser.UNQUOTED_IDENTIFIER:
			case esql_parser.QUOTED_IDENTIFIER:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 242;
				this.qualifiedName();
				}
				break;
			case esql_parser.STRING:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 243;
				this.string();
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
		this.enterRule(_localctx, 42, esql_parser.RULE_mathFunctionExpressionArgument);
		try {
			this.state = 250;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 22, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 246;
				this.qualifiedName();
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 247;
				this.string();
				}
				break;

			case 3:
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 248;
				this.number();
				}
				break;

			case 4:
				this.enterOuterAlt(_localctx, 4);
				{
				this.state = 249;
				this.operatorExpression(0);
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
		this.enterRule(_localctx, 44, esql_parser.RULE_qualifiedName);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 252;
			this.identifier();
			this.state = 257;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 23, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 253;
					this.match(esql_parser.DOT);
					this.state = 254;
					this.identifier();
					}
					}
				}
				this.state = 259;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 23, this._ctx);
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
		this.enterRule(_localctx, 46, esql_parser.RULE_qualifiedNames);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 260;
			this.qualifiedName();
			this.state = 265;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 24, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 261;
					this.match(esql_parser.COMMA);
					this.state = 262;
					this.qualifiedName();
					}
					}
				}
				this.state = 267;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 24, this._ctx);
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
		this.enterRule(_localctx, 48, esql_parser.RULE_identifier);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 268;
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
		this.enterRule(_localctx, 50, esql_parser.RULE_mathFunctionIdentifier);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 270;
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
		this.enterRule(_localctx, 52, esql_parser.RULE_functionIdentifier);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 272;
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
		this.enterRule(_localctx, 54, esql_parser.RULE_constant);
		try {
			this.state = 278;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case esql_parser.NULL:
				_localctx = new NullLiteralContext(_localctx);
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 274;
				this.match(esql_parser.NULL);
				}
				break;
			case esql_parser.INTEGER_LITERAL:
			case esql_parser.DECIMAL_LITERAL:
				_localctx = new NumericLiteralContext(_localctx);
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 275;
				this.number();
				}
				break;
			case esql_parser.BOOLEAN_VALUE:
				_localctx = new BooleanLiteralContext(_localctx);
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 276;
				this.booleanValue();
				}
				break;
			case esql_parser.STRING:
				_localctx = new StringLiteralContext(_localctx);
				this.enterOuterAlt(_localctx, 4);
				{
				this.state = 277;
				this.string();
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
		this.enterRule(_localctx, 56, esql_parser.RULE_limitCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 280;
			this.match(esql_parser.LIMIT);
			this.state = 281;
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
		this.enterRule(_localctx, 58, esql_parser.RULE_sortCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 283;
			this.match(esql_parser.SORT);
			this.state = 284;
			this.orderExpression();
			this.state = 289;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 26, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 285;
					this.match(esql_parser.COMMA);
					this.state = 286;
					this.orderExpression();
					}
					}
				}
				this.state = 291;
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
	public orderExpression(): OrderExpressionContext {
		let _localctx: OrderExpressionContext = new OrderExpressionContext(this._ctx, this.state);
		this.enterRule(_localctx, 60, esql_parser.RULE_orderExpression);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 292;
			this.booleanExpression(0);
			this.state = 294;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 27, this._ctx) ) {
			case 1:
				{
				this.state = 293;
				this.match(esql_parser.ORDERING);
				}
				break;
			}
			this.state = 298;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 28, this._ctx) ) {
			case 1:
				{
				this.state = 296;
				this.match(esql_parser.NULLS_ORDERING);
				{
				this.state = 297;
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
		this.enterRule(_localctx, 62, esql_parser.RULE_projectCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 300;
			this.match(esql_parser.PROJECT);
			this.state = 301;
			this.projectClause();
			this.state = 306;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 29, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 302;
					this.match(esql_parser.COMMA);
					this.state = 303;
					this.projectClause();
					}
					}
				}
				this.state = 308;
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
	public projectClause(): ProjectClauseContext {
		let _localctx: ProjectClauseContext = new ProjectClauseContext(this._ctx, this.state);
		this.enterRule(_localctx, 64, esql_parser.RULE_projectClause);
		try {
			this.state = 314;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 30, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 309;
				this.sourceIdentifier();
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 310;
				_localctx._newName = this.sourceIdentifier();
				this.state = 311;
				this.match(esql_parser.ASSIGN);
				this.state = 312;
				_localctx._oldName = this.sourceIdentifier();
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
	public booleanValue(): BooleanValueContext {
		let _localctx: BooleanValueContext = new BooleanValueContext(this._ctx, this.state);
		this.enterRule(_localctx, 66, esql_parser.RULE_booleanValue);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 316;
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
		this.enterRule(_localctx, 68, esql_parser.RULE_number);
		try {
			this.state = 320;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case esql_parser.DECIMAL_LITERAL:
				_localctx = new DecimalLiteralContext(_localctx);
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 318;
				this.match(esql_parser.DECIMAL_LITERAL);
				}
				break;
			case esql_parser.INTEGER_LITERAL:
				_localctx = new IntegerLiteralContext(_localctx);
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 319;
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
	public string(): StringContext {
		let _localctx: StringContext = new StringContext(this._ctx, this.state);
		this.enterRule(_localctx, 70, esql_parser.RULE_string);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 322;
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
		this.enterRule(_localctx, 72, esql_parser.RULE_comparisonOperator);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 324;
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
		this.enterRule(_localctx, 74, esql_parser.RULE_explainCommand);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 326;
			this.match(esql_parser.EXPLAIN);
			this.state = 327;
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
		this.enterRule(_localctx, 76, esql_parser.RULE_subqueryExpression);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 329;
			this.match(esql_parser.OPENING_BRACKET);
			this.state = 330;
			this.query(0);
			this.state = 331;
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

	public sempred(_localctx: RuleContext, ruleIndex: number, predIndex: number): boolean {
		switch (ruleIndex) {
		case 1:
			return this.query_sempred(_localctx as QueryContext, predIndex);

		case 5:
			return this.booleanExpression_sempred(_localctx as BooleanExpressionContext, predIndex);

		case 10:
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
		"\x03\uC91D\uCABA\u058D\uAFBA\u4F53\u0607\uEA8B\uC241\x034\u0150\x04\x02" +
		"\t\x02\x04\x03\t\x03\x04\x04\t\x04\x04\x05\t\x05\x04\x06\t\x06\x04\x07" +
		"\t\x07\x04\b\t\b\x04\t\t\t\x04\n\t\n\x04\v\t\v\x04\f\t\f\x04\r\t\r\x04" +
		"\x0E\t\x0E\x04\x0F\t\x0F\x04\x10\t\x10\x04\x11\t\x11\x04\x12\t\x12\x04" +
		"\x13\t\x13\x04\x14\t\x14\x04\x15\t\x15\x04\x16\t\x16\x04\x17\t\x17\x04" +
		"\x18\t\x18\x04\x19\t\x19\x04\x1A\t\x1A\x04\x1B\t\x1B\x04\x1C\t\x1C\x04" +
		"\x1D\t\x1D\x04\x1E\t\x1E\x04\x1F\t\x1F\x04 \t \x04!\t!\x04\"\t\"\x04#" +
		"\t#\x04$\t$\x04%\t%\x04&\t&\x04\'\t\'\x04(\t(\x03\x02\x03\x02\x03\x02" +
		"\x03\x03\x03\x03\x03\x03\x03\x03\x03\x03\x03\x03\x07\x03Z\n\x03\f\x03" +
		"\x0E\x03]\v\x03\x03\x04\x03\x04\x03\x04\x05\x04b\n\x04\x03\x05\x03\x05" +
		"\x03\x05\x03\x05\x03\x05\x03\x05\x05\x05j\n\x05\x03\x06\x03\x06\x03\x06" +
		"\x03\x07\x03\x07\x03\x07\x03\x07\x05\x07s\n\x07\x03\x07\x03\x07\x03\x07" +
		"\x03\x07\x03\x07\x03\x07\x07\x07{\n\x07\f\x07\x0E\x07~\v\x07\x03\b\x03" +
		"\b\x05\b\x82\n\b\x03\t\x03\t\x03\t\x03\t\x03\n\x03\n\x03\n\x03\n\x03\n" +
		"\x07\n\x8D\n\n\f\n\x0E\n\x90\v\n\x05\n\x92\n\n\x03\n\x03\n\x03\v\x03\v" +
		"\x03\v\x03\v\x03\v\x07\v\x9B\n\v\f\v\x0E\v\x9E\v\v\x05\v\xA0\n\v\x03\v" +
		"\x03\v\x03\f\x03\f\x03\f\x03\f\x03\f\x03\f\x05\f\xAA\n\f\x03\f\x03\f\x03" +
		"\f\x03\f\x03\f\x03\f\x07\f\xB2\n\f\f\f\x0E\f\xB5\v\f\x03\r\x03\r\x03\r" +
		"\x03\r\x03\r\x03\r\x03\r\x03\r\x03\r\x03\r\x03\r\x07\r\xC2\n\r\f\r\x0E" +
		"\r\xC5\v\r\x05\r\xC7\n\r\x03\r\x03\r\x05\r\xCB\n\r\x03\x0E\x03\x0E\x03" +
		"\x0E\x03\x0F\x03\x0F\x03\x0F\x07\x0F\xD3\n\x0F\f\x0F\x0E\x0F\xD6\v\x0F" +
		"\x03\x10\x03\x10\x03\x10\x03\x10\x03\x10\x05\x10\xDD\n\x10\x03\x11\x03" +
		"\x11\x03\x12\x03\x12\x03\x12\x03\x12\x07\x12\xE5\n\x12\f\x12\x0E\x12\xE8" +
		"\v\x12\x03\x13\x03\x13\x03\x13\x03\x14\x03\x14\x03\x14\x03\x14\x05\x14" +
		"\xF1\n\x14\x03\x15\x03\x15\x03\x16\x03\x16\x05\x16\xF7\n\x16\x03\x17\x03" +
		"\x17\x03\x17\x03\x17\x05\x17\xFD\n\x17\x03\x18\x03\x18\x03\x18\x07\x18" +
		"\u0102\n\x18\f\x18\x0E\x18\u0105\v\x18\x03\x19\x03\x19\x03\x19\x07\x19" +
		"\u010A\n\x19\f\x19\x0E\x19\u010D\v\x19\x03\x1A\x03\x1A\x03\x1B\x03\x1B" +
		"\x03\x1C\x03\x1C\x03\x1D\x03\x1D\x03\x1D\x03\x1D\x05\x1D\u0119\n\x1D\x03" +
		"\x1E\x03\x1E\x03\x1E\x03\x1F\x03\x1F\x03\x1F\x03\x1F\x07\x1F\u0122\n\x1F" +
		"\f\x1F\x0E\x1F\u0125\v\x1F\x03 \x03 \x05 \u0129\n \x03 \x03 \x05 \u012D" +
		"\n \x03!\x03!\x03!\x03!\x07!\u0133\n!\f!\x0E!\u0136\v!\x03\"\x03\"\x03" +
		"\"\x03\"\x03\"\x05\"\u013D\n\"\x03#\x03#\x03$\x03$\x05$\u0143\n$\x03%" +
		"\x03%\x03&\x03&\x03\'\x03\'\x03\'\x03(\x03(\x03(\x03(\x03(\x02\x02\x05" +
		"\x04\f\x16)\x02\x02\x04\x02\x06\x02\b\x02\n\x02\f\x02\x0E\x02\x10\x02" +
		"\x12\x02\x14\x02\x16\x02\x18\x02\x1A\x02\x1C\x02\x1E\x02 \x02\"\x02$\x02" +
		"&\x02(\x02*\x02,\x02.\x020\x022\x024\x026\x028\x02:\x02<\x02>\x02@\x02" +
		"B\x02D\x02F\x02H\x02J\x02L\x02N\x02\x02\x06\x03\x02!\"\x03\x02#%\x03\x02" +
		"01\x03\x02+,\x02\u0155\x02P\x03\x02\x02\x02\x04S\x03\x02\x02\x02\x06a" +
		"\x03\x02\x02\x02\bi\x03\x02\x02\x02\nk\x03\x02\x02\x02\fr\x03\x02\x02" +
		"\x02\x0E\x81\x03\x02\x02\x02\x10\x83\x03\x02\x02\x02\x12\x87\x03\x02\x02" +
		"\x02\x14\x95\x03\x02\x02\x02\x16\xA9\x03\x02\x02\x02\x18\xCA\x03\x02\x02" +
		"\x02\x1A\xCC\x03\x02\x02\x02\x1C\xCF\x03\x02\x02\x02\x1E\xDC\x03\x02\x02" +
		"\x02 \xDE\x03\x02\x02\x02\"\xE0\x03\x02\x02\x02$\xE9\x03\x02\x02\x02&" +
		"\xEC\x03\x02\x02\x02(\xF2\x03\x02\x02\x02*\xF6\x03\x02\x02\x02,\xFC\x03" +
		"\x02\x02\x02.\xFE\x03\x02\x02\x020\u0106\x03\x02\x02\x022\u010E\x03\x02" +
		"\x02\x024\u0110\x03\x02\x02\x026\u0112\x03\x02\x02\x028\u0118\x03\x02" +
		"\x02\x02:\u011A\x03\x02\x02\x02<\u011D\x03\x02\x02\x02>\u0126\x03\x02" +
		"\x02\x02@\u012E\x03\x02\x02\x02B\u013C\x03\x02\x02\x02D\u013E\x03\x02" +
		"\x02\x02F\u0142\x03\x02\x02\x02H\u0144\x03\x02\x02\x02J\u0146\x03\x02" +
		"\x02\x02L\u0148\x03\x02\x02\x02N\u014B\x03\x02\x02\x02PQ\x05\x04\x03\x02" +
		"QR\x07\x02\x02\x03R\x03\x03\x02\x02\x02ST\b\x03\x01\x02TU\x05\x06\x04" +
		"\x02U[\x03\x02\x02\x02VW\f\x03\x02\x02WX\x07\x0F\x02\x02XZ\x05\b\x05\x02" +
		"YV\x03\x02\x02\x02Z]\x03\x02\x02\x02[Y\x03\x02\x02\x02[\\\x03\x02\x02" +
		"\x02\\\x05\x03\x02\x02\x02][\x03\x02\x02\x02^b\x05L\'\x02_b\x05\"\x12" +
		"\x02`b\x05\x1A\x0E\x02a^\x03\x02\x02\x02a_\x03\x02\x02\x02a`\x03\x02\x02" +
		"\x02b\x07\x03\x02\x02\x02cj\x05$\x13\x02dj\x05:\x1E\x02ej\x05@!\x02fj" +
		"\x05<\x1F\x02gj\x05&\x14\x02hj\x05\n\x06\x02ic\x03\x02\x02\x02id\x03\x02" +
		"\x02\x02ie\x03\x02\x02\x02if\x03\x02\x02\x02ig\x03\x02\x02\x02ih\x03\x02" +
		"\x02\x02j\t\x03\x02\x02\x02kl\x07\b\x02\x02lm\x05\f\x07\x02m\v\x03\x02" +
		"\x02\x02no\b\x07\x01\x02op\x07\x1B\x02\x02ps\x05\f\x07\x06qs\x05\x0E\b" +
		"\x02rn\x03\x02\x02\x02rq\x03\x02\x02\x02s|\x03\x02\x02\x02tu\f\x04\x02" +
		"\x02uv\x07\x14\x02\x02v{\x05\f\x07\x05wx\f\x03\x02\x02xy\x07\x1D\x02\x02" +
		"y{\x05\f\x07\x04zt\x03\x02\x02\x02zw\x03\x02\x02\x02{~\x03\x02\x02\x02" +
		"|z\x03\x02\x02\x02|}\x03\x02\x02\x02}\r\x03\x02\x02\x02~|\x03\x02\x02" +
		"\x02\x7F\x82\x05\x16\f\x02\x80\x82\x05\x10\t\x02\x81\x7F\x03\x02\x02\x02" +
		"\x81\x80\x03\x02\x02\x02\x82\x0F\x03\x02\x02\x02\x83\x84\x05\x16\f\x02" +
		"\x84\x85\x05J&\x02\x85\x86\x05\x16\f\x02\x86\x11\x03\x02\x02\x02\x87\x88" +
		"\x056\x1C\x02\x88\x91\x07\x18\x02\x02\x89\x8E\x05*\x16\x02\x8A\x8B\x07" +
		"\x16\x02\x02\x8B\x8D\x05*\x16\x02\x8C\x8A\x03\x02\x02\x02\x8D\x90\x03" +
		"\x02\x02\x02\x8E\x8C\x03\x02\x02\x02\x8E\x8F\x03\x02\x02\x02\x8F\x92\x03" +
		"\x02\x02\x02\x90\x8E\x03\x02\x02\x02\x91\x89\x03\x02\x02\x02\x91\x92\x03" +
		"\x02\x02\x02\x92\x93\x03\x02\x02\x02\x93\x94\x07\x1E\x02\x02\x94\x13\x03" +
		"\x02\x02\x02\x95\x96\x054\x1B\x02\x96\x9F\x07\x18\x02\x02\x97\x9C\x05" +
		",\x17\x02\x98\x99\x07\x16\x02\x02\x99\x9B\x05,\x17\x02\x9A\x98\x03\x02" +
		"\x02\x02\x9B\x9E\x03\x02\x02\x02\x9C\x9A\x03\x02\x02\x02\x9C\x9D\x03\x02" +
		"\x02\x02\x9D\xA0\x03\x02\x02\x02\x9E\x9C\x03\x02\x02\x02\x9F\x97\x03\x02" +
		"\x02\x02\x9F\xA0\x03\x02\x02\x02\xA0\xA1\x03\x02\x02\x02\xA1\xA2\x07\x1E" +
		"\x02\x02\xA2\x15\x03\x02\x02\x02\xA3\xA4\b\f\x01\x02\xA4\xAA\x05\x18\r" +
		"\x02\xA5\xAA\x05\x12\n\x02\xA6\xAA\x05\x14\v\x02\xA7\xA8\t\x02\x02\x02" +
		"\xA8\xAA\x05\x16\f\x05\xA9\xA3\x03\x02\x02\x02\xA9\xA5\x03\x02\x02\x02" +
		"\xA9\xA6\x03\x02\x02\x02\xA9\xA7\x03\x02\x02\x02\xAA\xB3\x03\x02\x02\x02" +
		"\xAB\xAC\f\x04\x02\x02\xAC\xAD\t\x03\x02\x02\xAD\xB2\x05\x16\f\x05\xAE" +
		"\xAF\f\x03\x02\x02\xAF\xB0\t\x02\x02\x02\xB0\xB2\x05\x16\f\x04\xB1\xAB" +
		"\x03\x02\x02\x02\xB1\xAE\x03\x02\x02\x02\xB2\xB5\x03\x02\x02\x02\xB3\xB1" +
		"\x03\x02\x02\x02\xB3\xB4\x03\x02\x02\x02\xB4\x17\x03\x02\x02\x02\xB5\xB3" +
		"\x03\x02\x02\x02\xB6\xCB\x058\x1D\x02\xB7\xCB\x05.\x18\x02\xB8\xB9\x07" +
		"\x18\x02\x02\xB9\xBA\x05\f\x07\x02\xBA\xBB\x07\x1E\x02\x02\xBB\xCB\x03" +
		"\x02\x02\x02\xBC\xBD\x052\x1A\x02\xBD\xC6\x07\x18\x02\x02\xBE\xC3\x05" +
		"\f\x07\x02\xBF\xC0\x07\x16\x02\x02\xC0\xC2\x05\f\x07\x02\xC1\xBF\x03\x02" +
		"\x02\x02\xC2\xC5\x03\x02\x02\x02\xC3\xC1\x03\x02\x02\x02\xC3\xC4\x03\x02" +
		"\x02\x02\xC4\xC7\x03\x02\x02\x02\xC5\xC3\x03\x02\x02\x02\xC6\xBE\x03\x02" +
		"\x02\x02\xC6\xC7\x03\x02\x02\x02\xC7\xC8\x03\x02\x02\x02\xC8\xC9\x07\x1E" +
		"\x02\x02\xC9\xCB\x03\x02\x02\x02\xCA\xB6\x03\x02\x02\x02\xCA\xB7\x03\x02" +
		"\x02\x02\xCA\xB8\x03\x02\x02\x02\xCA\xBC\x03\x02\x02\x02\xCB\x19\x03\x02" +
		"\x02\x02\xCC\xCD\x07\x06\x02\x02\xCD\xCE\x05\x1C\x0F\x02\xCE\x1B\x03\x02" +
		"\x02\x02\xCF\xD4\x05\x1E\x10\x02\xD0\xD1\x07\x16\x02\x02\xD1\xD3\x05\x1E" +
		"\x10\x02\xD2\xD0\x03\x02\x02\x02\xD3\xD6\x03\x02\x02\x02\xD4\xD2\x03\x02" +
		"\x02\x02\xD4\xD5\x03\x02\x02\x02\xD5\x1D\x03\x02\x02\x02\xD6\xD4\x03\x02" +
		"\x02\x02\xD7\xDD\x05\f\x07\x02\xD8\xD9\x05 \x11\x02\xD9\xDA\x07\x15\x02" +
		"\x02\xDA\xDB\x05\f\x07\x02\xDB\xDD\x03\x02\x02\x02\xDC\xD7\x03\x02\x02" +
		"\x02\xDC\xD8\x03\x02\x02\x02\xDD\x1F\x03\x02\x02\x02\xDE\xDF\x052\x1A" +
		"\x02\xDF!\x03\x02\x02\x02\xE0\xE1\x07\x05\x02\x02\xE1\xE6\x05(\x15\x02" +
		"\xE2\xE3\x07\x16\x02\x02\xE3\xE5\x05(\x15\x02\xE4\xE2\x03\x02\x02\x02" +
		"\xE5\xE8\x03\x02\x02\x02\xE6\xE4\x03\x02\x02\x02\xE6\xE7\x03\x02\x02\x02" +
		"\xE7#\x03\x02\x02\x02\xE8\xE6\x03\x02\x02\x02\xE9\xEA\x07\x03\x02\x02" +
		"\xEA\xEB\x05\x1C\x0F\x02\xEB%\x03\x02\x02\x02\xEC\xED\x07\x07\x02\x02" +
		"\xED\xF0\x05\x1C\x0F\x02\xEE\xEF\x07\x13\x02\x02\xEF\xF1\x050\x19\x02" +
		"\xF0\xEE\x03\x02\x02\x02\xF0\xF1\x03\x02\x02\x02\xF1\'\x03\x02\x02\x02" +
		"\xF2\xF3\t\x04\x02\x02\xF3)\x03\x02\x02\x02\xF4\xF7\x05.\x18\x02\xF5\xF7" +
		"\x05H%\x02\xF6\xF4\x03\x02\x02\x02\xF6\xF5\x03\x02\x02\x02\xF7+\x03\x02" +
		"\x02\x02\xF8\xFD\x05.\x18\x02\xF9\xFD\x05H%\x02\xFA\xFD\x05F$\x02\xFB" +
		"\xFD\x05\x16\f\x02\xFC\xF8\x03\x02\x02\x02\xFC\xF9\x03\x02\x02\x02\xFC" +
		"\xFA\x03\x02\x02\x02\xFC\xFB\x03\x02\x02\x02\xFD-\x03\x02\x02\x02\xFE" +
		"\u0103\x052\x1A\x02\xFF\u0100\x07\x17\x02\x02\u0100\u0102\x052\x1A\x02" +
		"\u0101\xFF\x03\x02\x02\x02\u0102\u0105\x03\x02\x02\x02\u0103\u0101\x03" +
		"\x02\x02\x02\u0103\u0104\x03\x02\x02\x02\u0104/\x03\x02\x02\x02\u0105" +
		"\u0103\x03\x02\x02\x02\u0106\u010B\x05.\x18\x02\u0107\u0108\x07\x16\x02" +
		"\x02\u0108\u010A\x05.\x18\x02\u0109\u0107\x03\x02\x02\x02\u010A\u010D" +
		"\x03\x02\x02\x02\u010B\u0109\x03\x02\x02\x02\u010B\u010C\x03\x02\x02\x02" +
		"\u010C1\x03\x02\x02\x02\u010D\u010B\x03\x02\x02\x02\u010E\u010F\t\x05" +
		"\x02\x02\u010F3\x03\x02\x02\x02\u0110\u0111\x07)\x02\x02\u01115\x03\x02" +
		"\x02\x02\u0112\u0113\x07*\x02\x02\u01137\x03\x02\x02\x02\u0114\u0119\x07" +
		"\x1C\x02\x02\u0115\u0119\x05F$\x02\u0116\u0119\x05D#\x02\u0117\u0119\x05" +
		"H%\x02\u0118\u0114\x03\x02\x02\x02\u0118\u0115\x03\x02\x02\x02\u0118\u0116" +
		"\x03\x02\x02\x02\u0118\u0117\x03\x02\x02\x02\u01199\x03\x02\x02\x02\u011A" +
		"\u011B\x07\n\x02\x02\u011B\u011C\x07\x11\x02\x02\u011C;\x03\x02\x02\x02" +
		"\u011D\u011E\x07\t\x02\x02\u011E\u0123\x05> \x02\u011F\u0120\x07\x16\x02" +
		"\x02\u0120\u0122\x05> \x02\u0121\u011F\x03\x02\x02\x02\u0122\u0125\x03" +
		"\x02\x02\x02\u0123\u0121\x03\x02\x02\x02\u0123\u0124\x03\x02\x02\x02\u0124" +
		"=\x03\x02\x02\x02\u0125\u0123\x03\x02\x02\x02\u0126\u0128\x05\f\x07\x02" +
		"\u0127\u0129\x07&\x02\x02\u0128\u0127\x03\x02\x02\x02\u0128\u0129\x03" +
		"\x02\x02\x02\u0129\u012C\x03\x02\x02\x02\u012A\u012B\x07\'\x02\x02\u012B" +
		"\u012D\x07(\x02\x02\u012C\u012A\x03\x02\x02\x02\u012C\u012D\x03\x02\x02" +
		"\x02\u012D?\x03\x02\x02\x02\u012E\u012F\x07\v\x02\x02\u012F\u0134\x05" +
		"B\"\x02\u0130\u0131\x07\x16\x02\x02\u0131\u0133\x05B\"\x02\u0132\u0130" +
		"\x03\x02\x02\x02\u0133\u0136\x03\x02\x02\x02\u0134\u0132\x03\x02\x02\x02" +
		"\u0134\u0135\x03\x02\x02\x02\u0135A\x03\x02\x02\x02\u0136\u0134\x03\x02" +
		"\x02\x02\u0137\u013D\x05(\x15\x02\u0138\u0139\x05(\x15\x02\u0139\u013A" +
		"\x07\x15\x02\x02\u013A\u013B\x05(\x15\x02\u013B\u013D\x03\x02\x02\x02" +
		"\u013C\u0137\x03\x02\x02\x02\u013C\u0138\x03\x02\x02\x02\u013DC\x03\x02" +
		"\x02\x02\u013E\u013F\x07\x1F\x02\x02\u013FE\x03\x02\x02\x02\u0140\u0143" +
		"\x07\x12\x02\x02\u0141\u0143\x07\x11\x02\x02\u0142\u0140\x03\x02\x02\x02" +
		"\u0142\u0141\x03\x02\x02\x02\u0143G\x03\x02\x02\x02\u0144\u0145\x07\x10" +
		"\x02\x02\u0145I\x03\x02\x02\x02\u0146\u0147\x07 \x02\x02\u0147K\x03\x02" +
		"\x02\x02\u0148\u0149\x07\x04\x02\x02\u0149\u014A\x05N(\x02\u014AM\x03" +
		"\x02\x02\x02\u014B\u014C\x07\x19\x02\x02\u014C\u014D\x05\x04\x03\x02\u014D" +
		"\u014E\x07\x1A\x02\x02\u014EO\x03\x02\x02\x02\"[airz|\x81\x8E\x91\x9C" +
		"\x9F\xA9\xB1\xB3\xC3\xC6\xCA\xD4\xDC\xE6\xF0\xF6\xFC\u0103\u010B\u0118" +
		"\u0123\u0128\u012C\u0134\u013C\u0142";
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
	public sortCommand(): SortCommandContext | undefined {
		return this.tryGetRuleContext(0, SortCommandContext);
	}
	public statsCommand(): StatsCommandContext | undefined {
		return this.tryGetRuleContext(0, StatsCommandContext);
	}
	public whereCommand(): WhereCommandContext | undefined {
		return this.tryGetRuleContext(0, WhereCommandContext);
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
	public fields(): FieldsContext {
		return this.getRuleContext(0, FieldsContext);
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
export class NumericLiteralContext extends ConstantContext {
	public number(): NumberContext {
		return this.getRuleContext(0, NumberContext);
	}
	constructor(ctx: ConstantContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterNumericLiteral) {
			listener.enterNumericLiteral(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitNumericLiteral) {
			listener.exitNumericLiteral(this);
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
	public projectClause(): ProjectClauseContext[];
	public projectClause(i: number): ProjectClauseContext;
	public projectClause(i?: number): ProjectClauseContext | ProjectClauseContext[] {
		if (i === undefined) {
			return this.getRuleContexts(ProjectClauseContext);
		} else {
			return this.getRuleContext(i, ProjectClauseContext);
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


export class ProjectClauseContext extends ParserRuleContext {
	public _newName: SourceIdentifierContext;
	public _oldName: SourceIdentifierContext;
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
	public get ruleIndex(): number { return esql_parser.RULE_projectClause; }
	// @Override
	public enterRule(listener: esql_parserListener): void {
		if (listener.enterProjectClause) {
			listener.enterProjectClause(this);
		}
	}
	// @Override
	public exitRule(listener: esql_parserListener): void {
		if (listener.exitProjectClause) {
			listener.exitProjectClause(this);
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


