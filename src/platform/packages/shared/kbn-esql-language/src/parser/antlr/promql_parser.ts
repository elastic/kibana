// @ts-nocheck
// Generated from src/parser/antlr/promql_parser.g4 by ANTLR 4.13.2
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
import promql_parserListener from "./promql_parserListener.js";
// for running tests with parameters, TODO: discuss strategy for typed parameters in CI
// eslint-disable-next-line no-unused-vars
type int = number;


/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import parser_config from './parser_config.js';

export default class promql_parser extends parser_config {
	public static readonly PLUS = 1;
	public static readonly MINUS = 2;
	public static readonly ASTERISK = 3;
	public static readonly SLASH = 4;
	public static readonly PERCENT = 5;
	public static readonly CARET = 6;
	public static readonly EQ = 7;
	public static readonly NEQ = 8;
	public static readonly GT = 9;
	public static readonly GTE = 10;
	public static readonly LT = 11;
	public static readonly LTE = 12;
	public static readonly LABEL_EQ = 13;
	public static readonly LABEL_RGX = 14;
	public static readonly LABEL_RGX_NEQ = 15;
	public static readonly AND = 16;
	public static readonly OR = 17;
	public static readonly UNLESS = 18;
	public static readonly BY = 19;
	public static readonly WITHOUT = 20;
	public static readonly ON = 21;
	public static readonly IGNORING = 22;
	public static readonly GROUP_LEFT = 23;
	public static readonly GROUP_RIGHT = 24;
	public static readonly BOOL = 25;
	public static readonly OFFSET = 26;
	public static readonly AT = 27;
	public static readonly AT_START = 28;
	public static readonly AT_END = 29;
	public static readonly LCB = 30;
	public static readonly RCB = 31;
	public static readonly LSB = 32;
	public static readonly RSB = 33;
	public static readonly LP = 34;
	public static readonly RP = 35;
	public static readonly COLON = 36;
	public static readonly COMMA = 37;
	public static readonly STRING = 38;
	public static readonly INTEGER_VALUE = 39;
	public static readonly DECIMAL_VALUE = 40;
	public static readonly HEXADECIMAL = 41;
	public static readonly TIME_VALUE_WITH_COLON = 42;
	public static readonly TIME_VALUE = 43;
	public static readonly IDENTIFIER = 44;
	public static readonly NAMED_OR_POSITIONAL_PARAM = 45;
	public static readonly COMMENT = 46;
	public static readonly WS = 47;
	public static readonly UNRECOGNIZED = 48;
	public static override readonly EOF = Token.EOF;
	public static readonly RULE_singleStatement = 0;
	public static readonly RULE_expression = 1;
	public static readonly RULE_subqueryResolution = 2;
	public static readonly RULE_value = 3;
	public static readonly RULE_function = 4;
	public static readonly RULE_functionParams = 5;
	public static readonly RULE_grouping = 6;
	public static readonly RULE_selector = 7;
	public static readonly RULE_seriesMatcher = 8;
	public static readonly RULE_modifier = 9;
	public static readonly RULE_labelList = 10;
	public static readonly RULE_labels = 11;
	public static readonly RULE_label = 12;
	public static readonly RULE_labelName = 13;
	public static readonly RULE_identifier = 14;
	public static readonly RULE_evaluation = 15;
	public static readonly RULE_offset = 16;
	public static readonly RULE_duration = 17;
	public static readonly RULE_at = 18;
	public static readonly RULE_constant = 19;
	public static readonly RULE_number = 20;
	public static readonly RULE_string = 21;
	public static readonly RULE_timeValue = 22;
	public static readonly RULE_nonReserved = 23;
	public static readonly literalNames: (string | null)[] = [ null, "'+'", 
                                                            "'-'", "'*'", 
                                                            "'/'", "'%'", 
                                                            "'^'", "'=='", 
                                                            "'!='", "'>'", 
                                                            "'>='", "'<'", 
                                                            "'<='", "'='", 
                                                            "'=~'", "'!~'", 
                                                            "'and'", "'or'", 
                                                            "'unless'", 
                                                            "'by'", "'without'", 
                                                            "'on'", "'ignoring'", 
                                                            "'group_left'", 
                                                            "'group_right'", 
                                                            "'bool'", null, 
                                                            "'@'", "'start()'", 
                                                            "'end()'", "'{'", 
                                                            "'}'", "'['", 
                                                            "']'", "'('", 
                                                            "')'", "':'", 
                                                            "','" ];
	public static readonly symbolicNames: (string | null)[] = [ null, "PLUS", 
                                                             "MINUS", "ASTERISK", 
                                                             "SLASH", "PERCENT", 
                                                             "CARET", "EQ", 
                                                             "NEQ", "GT", 
                                                             "GTE", "LT", 
                                                             "LTE", "LABEL_EQ", 
                                                             "LABEL_RGX", 
                                                             "LABEL_RGX_NEQ", 
                                                             "AND", "OR", 
                                                             "UNLESS", "BY", 
                                                             "WITHOUT", 
                                                             "ON", "IGNORING", 
                                                             "GROUP_LEFT", 
                                                             "GROUP_RIGHT", 
                                                             "BOOL", "OFFSET", 
                                                             "AT", "AT_START", 
                                                             "AT_END", "LCB", 
                                                             "RCB", "LSB", 
                                                             "RSB", "LP", 
                                                             "RP", "COLON", 
                                                             "COMMA", "STRING", 
                                                             "INTEGER_VALUE", 
                                                             "DECIMAL_VALUE", 
                                                             "HEXADECIMAL", 
                                                             "TIME_VALUE_WITH_COLON", 
                                                             "TIME_VALUE", 
                                                             "IDENTIFIER", 
                                                             "NAMED_OR_POSITIONAL_PARAM", 
                                                             "COMMENT", 
                                                             "WS", "UNRECOGNIZED" ];
	// tslint:disable:no-trailing-whitespace
	public static readonly ruleNames: string[] = [
		"singleStatement", "expression", "subqueryResolution", "value", "function", 
		"functionParams", "grouping", "selector", "seriesMatcher", "modifier", 
		"labelList", "labels", "label", "labelName", "identifier", "evaluation", 
		"offset", "duration", "at", "constant", "number", "string", "timeValue", 
		"nonReserved",
	];
	public get grammarFileName(): string { return "promql_parser.g4"; }
	public get literalNames(): (string | null)[] { return promql_parser.literalNames; }
	public get symbolicNames(): (string | null)[] { return promql_parser.symbolicNames; }
	public get ruleNames(): string[] { return promql_parser.ruleNames; }
	public get serializedATN(): number[] { return promql_parser._serializedATN; }

	protected createFailedPredicateException(predicate?: string, message?: string): FailedPredicateException {
		return new FailedPredicateException(this, predicate, message);
	}

	constructor(input: TokenStream) {
		super(input);
		this._interp = new ParserATNSimulator(this, promql_parser._ATN, promql_parser.DecisionsToDFA, new PredictionContextCache());
	}
	// @RuleVersion(0)
	public singleStatement(): SingleStatementContext {
		let localctx: SingleStatementContext = new SingleStatementContext(this, this._ctx, this.state);
		this.enterRule(localctx, 0, promql_parser.RULE_singleStatement);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 48;
			this.expression(0);
			this.state = 49;
			this.match(promql_parser.EOF);
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

	public expression(): ExpressionContext;
	public expression(_p: number): ExpressionContext;
	// @RuleVersion(0)
	public expression(_p?: number): ExpressionContext {
		if (_p === undefined) {
			_p = 0;
		}

		let _parentctx: ParserRuleContext = this._ctx;
		let _parentState: number = this.state;
		let localctx: ExpressionContext = new ExpressionContext(this, this._ctx, _parentState);
		let _prevctx: ExpressionContext = localctx;
		let _startState: number = 2;
		this.enterRecursionRule(localctx, 2, promql_parser.RULE_expression, _p);
		let _la: number;
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 59;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 1:
			case 2:
				{
				localctx = new ArithmeticUnaryContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;

				this.state = 52;
				(localctx as ArithmeticUnaryContext)._operator = this._input.LT(1);
				_la = this._input.LA(1);
				if(!(_la===1 || _la===2)) {
				    (localctx as ArithmeticUnaryContext)._operator = this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				this.state = 53;
				this.expression(9);
				}
				break;
			case 16:
			case 17:
			case 18:
			case 19:
			case 20:
			case 21:
			case 22:
			case 23:
			case 24:
			case 25:
			case 26:
			case 30:
			case 38:
			case 39:
			case 40:
			case 41:
			case 42:
			case 43:
			case 44:
			case 45:
				{
				localctx = new ValueExpressionContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 54;
				this.value();
				}
				break;
			case 34:
				{
				localctx = new ParenthesizedContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 55;
				this.match(promql_parser.LP);
				this.state = 56;
				this.expression(0);
				this.state = 57;
				this.match(promql_parser.RP);
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
			this._ctx.stop = this._input.LT(-1);
			this.state = 110;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 10, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					if (this._parseListeners != null) {
						this.triggerExitRuleEvent();
					}
					_prevctx = localctx;
					{
					this.state = 108;
					this._errHandler.sync(this);
					switch ( this._interp.adaptivePredict(this._input, 9, this._ctx) ) {
					case 1:
						{
						localctx = new ArithmeticBinaryContext(this, new ExpressionContext(this, _parentctx, _parentState));
						(localctx as ArithmeticBinaryContext)._left = _prevctx;
						this.pushNewRecursionContext(localctx, _startState, promql_parser.RULE_expression);
						this.state = 61;
						if (!(this.precpred(this._ctx, 10))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 10)");
						}
						this.state = 62;
						(localctx as ArithmeticBinaryContext)._op = this.match(promql_parser.CARET);
						this.state = 64;
						this._errHandler.sync(this);
						switch ( this._interp.adaptivePredict(this._input, 1, this._ctx) ) {
						case 1:
							{
							this.state = 63;
							this.modifier();
							}
							break;
						}
						this.state = 66;
						(localctx as ArithmeticBinaryContext)._right = this.expression(10);
						}
						break;
					case 2:
						{
						localctx = new ArithmeticBinaryContext(this, new ExpressionContext(this, _parentctx, _parentState));
						(localctx as ArithmeticBinaryContext)._left = _prevctx;
						this.pushNewRecursionContext(localctx, _startState, promql_parser.RULE_expression);
						this.state = 67;
						if (!(this.precpred(this._ctx, 8))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 8)");
						}
						this.state = 68;
						(localctx as ArithmeticBinaryContext)._op = this._input.LT(1);
						_la = this._input.LA(1);
						if(!((((_la) & ~0x1F) === 0 && ((1 << _la) & 56) !== 0))) {
						    (localctx as ArithmeticBinaryContext)._op = this._errHandler.recoverInline(this);
						}
						else {
							this._errHandler.reportMatch(this);
						    this.consume();
						}
						this.state = 70;
						this._errHandler.sync(this);
						switch ( this._interp.adaptivePredict(this._input, 2, this._ctx) ) {
						case 1:
							{
							this.state = 69;
							this.modifier();
							}
							break;
						}
						this.state = 72;
						(localctx as ArithmeticBinaryContext)._right = this.expression(9);
						}
						break;
					case 3:
						{
						localctx = new ArithmeticBinaryContext(this, new ExpressionContext(this, _parentctx, _parentState));
						(localctx as ArithmeticBinaryContext)._left = _prevctx;
						this.pushNewRecursionContext(localctx, _startState, promql_parser.RULE_expression);
						this.state = 73;
						if (!(this.precpred(this._ctx, 7))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 7)");
						}
						this.state = 74;
						(localctx as ArithmeticBinaryContext)._op = this._input.LT(1);
						_la = this._input.LA(1);
						if(!(_la===1 || _la===2)) {
						    (localctx as ArithmeticBinaryContext)._op = this._errHandler.recoverInline(this);
						}
						else {
							this._errHandler.reportMatch(this);
						    this.consume();
						}
						this.state = 76;
						this._errHandler.sync(this);
						switch ( this._interp.adaptivePredict(this._input, 3, this._ctx) ) {
						case 1:
							{
							this.state = 75;
							this.modifier();
							}
							break;
						}
						this.state = 78;
						(localctx as ArithmeticBinaryContext)._right = this.expression(8);
						}
						break;
					case 4:
						{
						localctx = new ArithmeticBinaryContext(this, new ExpressionContext(this, _parentctx, _parentState));
						(localctx as ArithmeticBinaryContext)._left = _prevctx;
						this.pushNewRecursionContext(localctx, _startState, promql_parser.RULE_expression);
						this.state = 79;
						if (!(this.precpred(this._ctx, 6))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 6)");
						}
						this.state = 80;
						(localctx as ArithmeticBinaryContext)._op = this._input.LT(1);
						_la = this._input.LA(1);
						if(!((((_la) & ~0x1F) === 0 && ((1 << _la) & 8064) !== 0))) {
						    (localctx as ArithmeticBinaryContext)._op = this._errHandler.recoverInline(this);
						}
						else {
							this._errHandler.reportMatch(this);
						    this.consume();
						}
						this.state = 82;
						this._errHandler.sync(this);
						switch ( this._interp.adaptivePredict(this._input, 4, this._ctx) ) {
						case 1:
							{
							this.state = 81;
							this.match(promql_parser.BOOL);
							}
							break;
						}
						this.state = 85;
						this._errHandler.sync(this);
						switch ( this._interp.adaptivePredict(this._input, 5, this._ctx) ) {
						case 1:
							{
							this.state = 84;
							this.modifier();
							}
							break;
						}
						this.state = 87;
						(localctx as ArithmeticBinaryContext)._right = this.expression(7);
						}
						break;
					case 5:
						{
						localctx = new ArithmeticBinaryContext(this, new ExpressionContext(this, _parentctx, _parentState));
						(localctx as ArithmeticBinaryContext)._left = _prevctx;
						this.pushNewRecursionContext(localctx, _startState, promql_parser.RULE_expression);
						this.state = 88;
						if (!(this.precpred(this._ctx, 5))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 5)");
						}
						this.state = 89;
						(localctx as ArithmeticBinaryContext)._op = this._input.LT(1);
						_la = this._input.LA(1);
						if(!(_la===16 || _la===18)) {
						    (localctx as ArithmeticBinaryContext)._op = this._errHandler.recoverInline(this);
						}
						else {
							this._errHandler.reportMatch(this);
						    this.consume();
						}
						this.state = 91;
						this._errHandler.sync(this);
						switch ( this._interp.adaptivePredict(this._input, 6, this._ctx) ) {
						case 1:
							{
							this.state = 90;
							this.modifier();
							}
							break;
						}
						this.state = 93;
						(localctx as ArithmeticBinaryContext)._right = this.expression(6);
						}
						break;
					case 6:
						{
						localctx = new ArithmeticBinaryContext(this, new ExpressionContext(this, _parentctx, _parentState));
						(localctx as ArithmeticBinaryContext)._left = _prevctx;
						this.pushNewRecursionContext(localctx, _startState, promql_parser.RULE_expression);
						this.state = 94;
						if (!(this.precpred(this._ctx, 4))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 4)");
						}
						this.state = 95;
						(localctx as ArithmeticBinaryContext)._op = this.match(promql_parser.OR);
						this.state = 97;
						this._errHandler.sync(this);
						switch ( this._interp.adaptivePredict(this._input, 7, this._ctx) ) {
						case 1:
							{
							this.state = 96;
							this.modifier();
							}
							break;
						}
						this.state = 99;
						(localctx as ArithmeticBinaryContext)._right = this.expression(5);
						}
						break;
					case 7:
						{
						localctx = new SubqueryContext(this, new ExpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, promql_parser.RULE_expression);
						this.state = 100;
						if (!(this.precpred(this._ctx, 1))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 1)");
						}
						this.state = 101;
						this.match(promql_parser.LSB);
						this.state = 102;
						(localctx as SubqueryContext)._range = this.duration();
						this.state = 103;
						this.subqueryResolution();
						this.state = 104;
						this.match(promql_parser.RSB);
						this.state = 106;
						this._errHandler.sync(this);
						switch ( this._interp.adaptivePredict(this._input, 8, this._ctx) ) {
						case 1:
							{
							this.state = 105;
							this.evaluation();
							}
							break;
						}
						}
						break;
					}
					}
				}
				this.state = 112;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 10, this._ctx);
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
	public subqueryResolution(): SubqueryResolutionContext {
		let localctx: SubqueryResolutionContext = new SubqueryResolutionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 4, promql_parser.RULE_subqueryResolution);
		let _la: number;
		try {
			this.state = 127;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 12, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 113;
				this.match(promql_parser.COLON);
				this.state = 115;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if ((((_la) & ~0x1F) === 0 && ((1 << _la) & 1207894022) !== 0) || ((((_la - 34)) & ~0x1F) === 0 && ((1 << (_la - 34)) & 4081) !== 0)) {
					{
					this.state = 114;
					localctx._resolution = this.duration();
					}
				}

				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 117;
				this.match(promql_parser.TIME_VALUE_WITH_COLON);
				this.state = 118;
				localctx._op = this.match(promql_parser.CARET);
				this.state = 119;
				this.expression(0);
				}
				break;
			case 3:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 120;
				this.match(promql_parser.TIME_VALUE_WITH_COLON);
				this.state = 121;
				localctx._op = this._input.LT(1);
				_la = this._input.LA(1);
				if(!(_la===3 || _la===4)) {
				    localctx._op = this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				this.state = 122;
				this.expression(0);
				}
				break;
			case 4:
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 123;
				this.match(promql_parser.TIME_VALUE_WITH_COLON);
				this.state = 124;
				localctx._op = this._input.LT(1);
				_la = this._input.LA(1);
				if(!(_la===1 || _la===2)) {
				    localctx._op = this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				this.state = 125;
				this.expression(0);
				}
				break;
			case 5:
				this.enterOuterAlt(localctx, 5);
				{
				this.state = 126;
				this.match(promql_parser.TIME_VALUE_WITH_COLON);
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
	public value(): ValueContext {
		let localctx: ValueContext = new ValueContext(this, this._ctx, this.state);
		this.enterRule(localctx, 6, promql_parser.RULE_value);
		try {
			this.state = 132;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 13, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 129;
				this.function_();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 130;
				this.selector();
				}
				break;
			case 3:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 131;
				this.constant();
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
	public function_(): FunctionContext {
		let localctx: FunctionContext = new FunctionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 8, promql_parser.RULE_function);
		let _la: number;
		try {
			this.state = 152;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 15, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 134;
				this.match(promql_parser.IDENTIFIER);
				this.state = 135;
				this.match(promql_parser.LP);
				this.state = 137;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if ((((_la) & ~0x1F) === 0 && ((1 << _la) & 1207894022) !== 0) || ((((_la - 34)) & ~0x1F) === 0 && ((1 << (_la - 34)) & 4081) !== 0)) {
					{
					this.state = 136;
					this.functionParams();
					}
				}

				this.state = 139;
				this.match(promql_parser.RP);
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 140;
				this.match(promql_parser.IDENTIFIER);
				this.state = 141;
				this.match(promql_parser.LP);
				this.state = 142;
				this.functionParams();
				this.state = 143;
				this.match(promql_parser.RP);
				this.state = 144;
				this.grouping();
				}
				break;
			case 3:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 146;
				this.match(promql_parser.IDENTIFIER);
				this.state = 147;
				this.grouping();
				this.state = 148;
				this.match(promql_parser.LP);
				this.state = 149;
				this.functionParams();
				this.state = 150;
				this.match(promql_parser.RP);
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
	public functionParams(): FunctionParamsContext {
		let localctx: FunctionParamsContext = new FunctionParamsContext(this, this._ctx, this.state);
		this.enterRule(localctx, 10, promql_parser.RULE_functionParams);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 154;
			this.expression(0);
			this.state = 159;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===37) {
				{
				{
				this.state = 155;
				this.match(promql_parser.COMMA);
				this.state = 156;
				this.expression(0);
				}
				}
				this.state = 161;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
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
	public grouping(): GroupingContext {
		let localctx: GroupingContext = new GroupingContext(this, this._ctx, this.state);
		this.enterRule(localctx, 12, promql_parser.RULE_grouping);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 162;
			_la = this._input.LA(1);
			if(!(_la===19 || _la===20)) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
			this.state = 163;
			this.labelList();
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
	public selector(): SelectorContext {
		let localctx: SelectorContext = new SelectorContext(this, this._ctx, this.state);
		this.enterRule(localctx, 14, promql_parser.RULE_selector);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 165;
			this.seriesMatcher();
			this.state = 170;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 17, this._ctx) ) {
			case 1:
				{
				this.state = 166;
				this.match(promql_parser.LSB);
				this.state = 167;
				this.duration();
				this.state = 168;
				this.match(promql_parser.RSB);
				}
				break;
			}
			this.state = 173;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 18, this._ctx) ) {
			case 1:
				{
				this.state = 172;
				this.evaluation();
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
	public seriesMatcher(): SeriesMatcherContext {
		let localctx: SeriesMatcherContext = new SeriesMatcherContext(this, this._ctx, this.state);
		this.enterRule(localctx, 16, promql_parser.RULE_seriesMatcher);
		let _la: number;
		try {
			this.state = 187;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 16:
			case 17:
			case 18:
			case 19:
			case 20:
			case 21:
			case 22:
			case 23:
			case 24:
			case 25:
			case 26:
			case 44:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 175;
				this.identifier();
				this.state = 181;
				this._errHandler.sync(this);
				switch ( this._interp.adaptivePredict(this._input, 20, this._ctx) ) {
				case 1:
					{
					this.state = 176;
					this.match(promql_parser.LCB);
					this.state = 178;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
					if (((((_la - 16)) & ~0x1F) === 0 && ((1 << (_la - 16)) & 331352063) !== 0)) {
						{
						this.state = 177;
						this.labels();
						}
					}

					this.state = 180;
					this.match(promql_parser.RCB);
					}
					break;
				}
				}
				break;
			case 30:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 183;
				this.match(promql_parser.LCB);
				this.state = 184;
				this.labels();
				this.state = 185;
				this.match(promql_parser.RCB);
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
	public modifier(): ModifierContext {
		let localctx: ModifierContext = new ModifierContext(this, this._ctx, this.state);
		this.enterRule(localctx, 18, promql_parser.RULE_modifier);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 189;
			localctx._matching = this._input.LT(1);
			_la = this._input.LA(1);
			if(!(_la===21 || _la===22)) {
			    localctx._matching = this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
			this.state = 190;
			localctx._modifierLabels = this.labelList();
			this.state = 195;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 23, this._ctx) ) {
			case 1:
				{
				this.state = 191;
				localctx._joining = this._input.LT(1);
				_la = this._input.LA(1);
				if(!(_la===23 || _la===24)) {
				    localctx._joining = this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				this.state = 193;
				this._errHandler.sync(this);
				switch ( this._interp.adaptivePredict(this._input, 22, this._ctx) ) {
				case 1:
					{
					this.state = 192;
					localctx._groupLabels = this.labelList();
					}
					break;
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
	public labelList(): LabelListContext {
		let localctx: LabelListContext = new LabelListContext(this, this._ctx, this.state);
		this.enterRule(localctx, 20, promql_parser.RULE_labelList);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 197;
			this.match(promql_parser.LP);
			this.state = 204;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (((((_la - 16)) & ~0x1F) === 0 && ((1 << (_la - 16)) & 331352063) !== 0)) {
				{
				{
				this.state = 198;
				this.labelName();
				this.state = 200;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===37) {
					{
					this.state = 199;
					this.match(promql_parser.COMMA);
					}
				}

				}
				}
				this.state = 206;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			this.state = 207;
			this.match(promql_parser.RP);
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
	public labels(): LabelsContext {
		let localctx: LabelsContext = new LabelsContext(this, this._ctx, this.state);
		this.enterRule(localctx, 22, promql_parser.RULE_labels);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 209;
			this.label();
			this.state = 216;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===37) {
				{
				{
				this.state = 210;
				this.match(promql_parser.COMMA);
				this.state = 212;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (((((_la - 16)) & ~0x1F) === 0 && ((1 << (_la - 16)) & 331352063) !== 0)) {
					{
					this.state = 211;
					this.label();
					}
				}

				}
				}
				this.state = 218;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
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
	public label(): LabelContext {
		let localctx: LabelContext = new LabelContext(this, this._ctx, this.state);
		this.enterRule(localctx, 24, promql_parser.RULE_label);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 219;
			this.labelName();
			this.state = 222;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if ((((_la) & ~0x1F) === 0 && ((1 << _la) & 57600) !== 0)) {
				{
				this.state = 220;
				localctx._kind = this._input.LT(1);
				_la = this._input.LA(1);
				if(!((((_la) & ~0x1F) === 0 && ((1 << _la) & 57600) !== 0))) {
				    localctx._kind = this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				this.state = 221;
				this.match(promql_parser.STRING);
				}
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
	public labelName(): LabelNameContext {
		let localctx: LabelNameContext = new LabelNameContext(this, this._ctx, this.state);
		this.enterRule(localctx, 26, promql_parser.RULE_labelName);
		try {
			this.state = 227;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 16:
			case 17:
			case 18:
			case 19:
			case 20:
			case 21:
			case 22:
			case 23:
			case 24:
			case 25:
			case 26:
			case 44:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 224;
				this.identifier();
				}
				break;
			case 38:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 225;
				this.match(promql_parser.STRING);
				}
				break;
			case 39:
			case 40:
			case 41:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 226;
				this.number_();
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
	public identifier(): IdentifierContext {
		let localctx: IdentifierContext = new IdentifierContext(this, this._ctx, this.state);
		this.enterRule(localctx, 28, promql_parser.RULE_identifier);
		try {
			this.state = 231;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 44:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 229;
				this.match(promql_parser.IDENTIFIER);
				}
				break;
			case 16:
			case 17:
			case 18:
			case 19:
			case 20:
			case 21:
			case 22:
			case 23:
			case 24:
			case 25:
			case 26:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 230;
				this.nonReserved();
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
	public evaluation(): EvaluationContext {
		let localctx: EvaluationContext = new EvaluationContext(this, this._ctx, this.state);
		this.enterRule(localctx, 30, promql_parser.RULE_evaluation);
		try {
			this.state = 241;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 26:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 233;
				this.offset();
				this.state = 235;
				this._errHandler.sync(this);
				switch ( this._interp.adaptivePredict(this._input, 31, this._ctx) ) {
				case 1:
					{
					this.state = 234;
					this.at();
					}
					break;
				}
				}
				break;
			case 27:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 237;
				this.at();
				this.state = 239;
				this._errHandler.sync(this);
				switch ( this._interp.adaptivePredict(this._input, 32, this._ctx) ) {
				case 1:
					{
					this.state = 238;
					this.offset();
					}
					break;
				}
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
	public offset(): OffsetContext {
		let localctx: OffsetContext = new OffsetContext(this, this._ctx, this.state);
		this.enterRule(localctx, 32, promql_parser.RULE_offset);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 243;
			this.match(promql_parser.OFFSET);
			this.state = 245;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 34, this._ctx) ) {
			case 1:
				{
				this.state = 244;
				this.match(promql_parser.MINUS);
				}
				break;
			}
			this.state = 247;
			this.duration();
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
	public duration(): DurationContext {
		let localctx: DurationContext = new DurationContext(this, this._ctx, this.state);
		this.enterRule(localctx, 34, promql_parser.RULE_duration);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 249;
			this.expression(0);
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
	public at(): AtContext {
		let localctx: AtContext = new AtContext(this, this._ctx, this.state);
		this.enterRule(localctx, 36, promql_parser.RULE_at);
		let _la: number;
		try {
			this.state = 258;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 36, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 251;
				this.match(promql_parser.AT);
				this.state = 253;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===2) {
					{
					this.state = 252;
					this.match(promql_parser.MINUS);
					}
				}

				this.state = 255;
				this.timeValue();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 256;
				this.match(promql_parser.AT);
				this.state = 257;
				_la = this._input.LA(1);
				if(!(_la===28 || _la===29)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
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
	public constant(): ConstantContext {
		let localctx: ConstantContext = new ConstantContext(this, this._ctx, this.state);
		this.enterRule(localctx, 38, promql_parser.RULE_constant);
		try {
			this.state = 263;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 37, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 260;
				this.number_();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 261;
				this.string_();
				}
				break;
			case 3:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 262;
				this.timeValue();
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
	public number_(): NumberContext {
		let localctx: NumberContext = new NumberContext(this, this._ctx, this.state);
		this.enterRule(localctx, 40, promql_parser.RULE_number);
		try {
			this.state = 268;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 40:
				localctx = new DecimalLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 265;
				this.match(promql_parser.DECIMAL_VALUE);
				}
				break;
			case 39:
				localctx = new IntegerLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 266;
				this.match(promql_parser.INTEGER_VALUE);
				}
				break;
			case 41:
				localctx = new HexLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 267;
				this.match(promql_parser.HEXADECIMAL);
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
	public string_(): StringContext {
		let localctx: StringContext = new StringContext(this, this._ctx, this.state);
		this.enterRule(localctx, 42, promql_parser.RULE_string);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 270;
			this.match(promql_parser.STRING);
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
	public timeValue(): TimeValueContext {
		let localctx: TimeValueContext = new TimeValueContext(this, this._ctx, this.state);
		this.enterRule(localctx, 44, promql_parser.RULE_timeValue);
		try {
			this.state = 276;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 42:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 272;
				this.match(promql_parser.TIME_VALUE_WITH_COLON);
				}
				break;
			case 43:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 273;
				this.match(promql_parser.TIME_VALUE);
				}
				break;
			case 39:
			case 40:
			case 41:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 274;
				this.number_();
				}
				break;
			case 45:
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 275;
				this.match(promql_parser.NAMED_OR_POSITIONAL_PARAM);
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
	public nonReserved(): NonReservedContext {
		let localctx: NonReservedContext = new NonReservedContext(this, this._ctx, this.state);
		this.enterRule(localctx, 46, promql_parser.RULE_nonReserved);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 278;
			_la = this._input.LA(1);
			if(!((((_la) & ~0x1F) === 0 && ((1 << _la) & 134152192) !== 0))) {
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

	public sempred(localctx: RuleContext, ruleIndex: number, predIndex: number): boolean {
		switch (ruleIndex) {
		case 1:
			return this.expression_sempred(localctx as ExpressionContext, predIndex);
		}
		return true;
	}
	private expression_sempred(localctx: ExpressionContext, predIndex: number): boolean {
		switch (predIndex) {
		case 0:
			return this.precpred(this._ctx, 10);
		case 1:
			return this.precpred(this._ctx, 8);
		case 2:
			return this.precpred(this._ctx, 7);
		case 3:
			return this.precpred(this._ctx, 6);
		case 4:
			return this.precpred(this._ctx, 5);
		case 5:
			return this.precpred(this._ctx, 4);
		case 6:
			return this.precpred(this._ctx, 1);
		}
		return true;
	}

	public static readonly _serializedATN: number[] = [4,1,48,281,2,0,7,0,2,
	1,7,1,2,2,7,2,2,3,7,3,2,4,7,4,2,5,7,5,2,6,7,6,2,7,7,7,2,8,7,8,2,9,7,9,2,
	10,7,10,2,11,7,11,2,12,7,12,2,13,7,13,2,14,7,14,2,15,7,15,2,16,7,16,2,17,
	7,17,2,18,7,18,2,19,7,19,2,20,7,20,2,21,7,21,2,22,7,22,2,23,7,23,1,0,1,
	0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,60,8,1,1,1,1,1,1,1,3,1,65,8,1,
	1,1,1,1,1,1,1,1,3,1,71,8,1,1,1,1,1,1,1,1,1,3,1,77,8,1,1,1,1,1,1,1,1,1,3,
	1,83,8,1,1,1,3,1,86,8,1,1,1,1,1,1,1,1,1,3,1,92,8,1,1,1,1,1,1,1,1,1,3,1,
	98,8,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,107,8,1,5,1,109,8,1,10,1,12,1,112,
	9,1,1,2,1,2,3,2,116,8,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,3,2,128,
	8,2,1,3,1,3,1,3,3,3,133,8,3,1,4,1,4,1,4,3,4,138,8,4,1,4,1,4,1,4,1,4,1,4,
	1,4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,3,4,153,8,4,1,5,1,5,1,5,5,5,158,8,5,10,
	5,12,5,161,9,5,1,6,1,6,1,6,1,7,1,7,1,7,1,7,1,7,3,7,171,8,7,1,7,3,7,174,
	8,7,1,8,1,8,1,8,3,8,179,8,8,1,8,3,8,182,8,8,1,8,1,8,1,8,1,8,3,8,188,8,8,
	1,9,1,9,1,9,1,9,3,9,194,8,9,3,9,196,8,9,1,10,1,10,1,10,3,10,201,8,10,5,
	10,203,8,10,10,10,12,10,206,9,10,1,10,1,10,1,11,1,11,1,11,3,11,213,8,11,
	5,11,215,8,11,10,11,12,11,218,9,11,1,12,1,12,1,12,3,12,223,8,12,1,13,1,
	13,1,13,3,13,228,8,13,1,14,1,14,3,14,232,8,14,1,15,1,15,3,15,236,8,15,1,
	15,1,15,3,15,240,8,15,3,15,242,8,15,1,16,1,16,3,16,246,8,16,1,16,1,16,1,
	17,1,17,1,18,1,18,3,18,254,8,18,1,18,1,18,1,18,3,18,259,8,18,1,19,1,19,
	1,19,3,19,264,8,19,1,20,1,20,1,20,3,20,269,8,20,1,21,1,21,1,22,1,22,1,22,
	1,22,3,22,277,8,22,1,23,1,23,1,23,0,1,2,24,0,2,4,6,8,10,12,14,16,18,20,
	22,24,26,28,30,32,34,36,38,40,42,44,46,0,11,1,0,1,2,1,0,3,5,1,0,7,12,2,
	0,16,16,18,18,1,0,3,4,1,0,19,20,1,0,21,22,1,0,23,24,2,0,8,8,13,15,1,0,28,
	29,1,0,16,26,312,0,48,1,0,0,0,2,59,1,0,0,0,4,127,1,0,0,0,6,132,1,0,0,0,
	8,152,1,0,0,0,10,154,1,0,0,0,12,162,1,0,0,0,14,165,1,0,0,0,16,187,1,0,0,
	0,18,189,1,0,0,0,20,197,1,0,0,0,22,209,1,0,0,0,24,219,1,0,0,0,26,227,1,
	0,0,0,28,231,1,0,0,0,30,241,1,0,0,0,32,243,1,0,0,0,34,249,1,0,0,0,36,258,
	1,0,0,0,38,263,1,0,0,0,40,268,1,0,0,0,42,270,1,0,0,0,44,276,1,0,0,0,46,
	278,1,0,0,0,48,49,3,2,1,0,49,50,5,0,0,1,50,1,1,0,0,0,51,52,6,1,-1,0,52,
	53,7,0,0,0,53,60,3,2,1,9,54,60,3,6,3,0,55,56,5,34,0,0,56,57,3,2,1,0,57,
	58,5,35,0,0,58,60,1,0,0,0,59,51,1,0,0,0,59,54,1,0,0,0,59,55,1,0,0,0,60,
	110,1,0,0,0,61,62,10,10,0,0,62,64,5,6,0,0,63,65,3,18,9,0,64,63,1,0,0,0,
	64,65,1,0,0,0,65,66,1,0,0,0,66,109,3,2,1,10,67,68,10,8,0,0,68,70,7,1,0,
	0,69,71,3,18,9,0,70,69,1,0,0,0,70,71,1,0,0,0,71,72,1,0,0,0,72,109,3,2,1,
	9,73,74,10,7,0,0,74,76,7,0,0,0,75,77,3,18,9,0,76,75,1,0,0,0,76,77,1,0,0,
	0,77,78,1,0,0,0,78,109,3,2,1,8,79,80,10,6,0,0,80,82,7,2,0,0,81,83,5,25,
	0,0,82,81,1,0,0,0,82,83,1,0,0,0,83,85,1,0,0,0,84,86,3,18,9,0,85,84,1,0,
	0,0,85,86,1,0,0,0,86,87,1,0,0,0,87,109,3,2,1,7,88,89,10,5,0,0,89,91,7,3,
	0,0,90,92,3,18,9,0,91,90,1,0,0,0,91,92,1,0,0,0,92,93,1,0,0,0,93,109,3,2,
	1,6,94,95,10,4,0,0,95,97,5,17,0,0,96,98,3,18,9,0,97,96,1,0,0,0,97,98,1,
	0,0,0,98,99,1,0,0,0,99,109,3,2,1,5,100,101,10,1,0,0,101,102,5,32,0,0,102,
	103,3,34,17,0,103,104,3,4,2,0,104,106,5,33,0,0,105,107,3,30,15,0,106,105,
	1,0,0,0,106,107,1,0,0,0,107,109,1,0,0,0,108,61,1,0,0,0,108,67,1,0,0,0,108,
	73,1,0,0,0,108,79,1,0,0,0,108,88,1,0,0,0,108,94,1,0,0,0,108,100,1,0,0,0,
	109,112,1,0,0,0,110,108,1,0,0,0,110,111,1,0,0,0,111,3,1,0,0,0,112,110,1,
	0,0,0,113,115,5,36,0,0,114,116,3,34,17,0,115,114,1,0,0,0,115,116,1,0,0,
	0,116,128,1,0,0,0,117,118,5,42,0,0,118,119,5,6,0,0,119,128,3,2,1,0,120,
	121,5,42,0,0,121,122,7,4,0,0,122,128,3,2,1,0,123,124,5,42,0,0,124,125,7,
	0,0,0,125,128,3,2,1,0,126,128,5,42,0,0,127,113,1,0,0,0,127,117,1,0,0,0,
	127,120,1,0,0,0,127,123,1,0,0,0,127,126,1,0,0,0,128,5,1,0,0,0,129,133,3,
	8,4,0,130,133,3,14,7,0,131,133,3,38,19,0,132,129,1,0,0,0,132,130,1,0,0,
	0,132,131,1,0,0,0,133,7,1,0,0,0,134,135,5,44,0,0,135,137,5,34,0,0,136,138,
	3,10,5,0,137,136,1,0,0,0,137,138,1,0,0,0,138,139,1,0,0,0,139,153,5,35,0,
	0,140,141,5,44,0,0,141,142,5,34,0,0,142,143,3,10,5,0,143,144,5,35,0,0,144,
	145,3,12,6,0,145,153,1,0,0,0,146,147,5,44,0,0,147,148,3,12,6,0,148,149,
	5,34,0,0,149,150,3,10,5,0,150,151,5,35,0,0,151,153,1,0,0,0,152,134,1,0,
	0,0,152,140,1,0,0,0,152,146,1,0,0,0,153,9,1,0,0,0,154,159,3,2,1,0,155,156,
	5,37,0,0,156,158,3,2,1,0,157,155,1,0,0,0,158,161,1,0,0,0,159,157,1,0,0,
	0,159,160,1,0,0,0,160,11,1,0,0,0,161,159,1,0,0,0,162,163,7,5,0,0,163,164,
	3,20,10,0,164,13,1,0,0,0,165,170,3,16,8,0,166,167,5,32,0,0,167,168,3,34,
	17,0,168,169,5,33,0,0,169,171,1,0,0,0,170,166,1,0,0,0,170,171,1,0,0,0,171,
	173,1,0,0,0,172,174,3,30,15,0,173,172,1,0,0,0,173,174,1,0,0,0,174,15,1,
	0,0,0,175,181,3,28,14,0,176,178,5,30,0,0,177,179,3,22,11,0,178,177,1,0,
	0,0,178,179,1,0,0,0,179,180,1,0,0,0,180,182,5,31,0,0,181,176,1,0,0,0,181,
	182,1,0,0,0,182,188,1,0,0,0,183,184,5,30,0,0,184,185,3,22,11,0,185,186,
	5,31,0,0,186,188,1,0,0,0,187,175,1,0,0,0,187,183,1,0,0,0,188,17,1,0,0,0,
	189,190,7,6,0,0,190,195,3,20,10,0,191,193,7,7,0,0,192,194,3,20,10,0,193,
	192,1,0,0,0,193,194,1,0,0,0,194,196,1,0,0,0,195,191,1,0,0,0,195,196,1,0,
	0,0,196,19,1,0,0,0,197,204,5,34,0,0,198,200,3,26,13,0,199,201,5,37,0,0,
	200,199,1,0,0,0,200,201,1,0,0,0,201,203,1,0,0,0,202,198,1,0,0,0,203,206,
	1,0,0,0,204,202,1,0,0,0,204,205,1,0,0,0,205,207,1,0,0,0,206,204,1,0,0,0,
	207,208,5,35,0,0,208,21,1,0,0,0,209,216,3,24,12,0,210,212,5,37,0,0,211,
	213,3,24,12,0,212,211,1,0,0,0,212,213,1,0,0,0,213,215,1,0,0,0,214,210,1,
	0,0,0,215,218,1,0,0,0,216,214,1,0,0,0,216,217,1,0,0,0,217,23,1,0,0,0,218,
	216,1,0,0,0,219,222,3,26,13,0,220,221,7,8,0,0,221,223,5,38,0,0,222,220,
	1,0,0,0,222,223,1,0,0,0,223,25,1,0,0,0,224,228,3,28,14,0,225,228,5,38,0,
	0,226,228,3,40,20,0,227,224,1,0,0,0,227,225,1,0,0,0,227,226,1,0,0,0,228,
	27,1,0,0,0,229,232,5,44,0,0,230,232,3,46,23,0,231,229,1,0,0,0,231,230,1,
	0,0,0,232,29,1,0,0,0,233,235,3,32,16,0,234,236,3,36,18,0,235,234,1,0,0,
	0,235,236,1,0,0,0,236,242,1,0,0,0,237,239,3,36,18,0,238,240,3,32,16,0,239,
	238,1,0,0,0,239,240,1,0,0,0,240,242,1,0,0,0,241,233,1,0,0,0,241,237,1,0,
	0,0,242,31,1,0,0,0,243,245,5,26,0,0,244,246,5,2,0,0,245,244,1,0,0,0,245,
	246,1,0,0,0,246,247,1,0,0,0,247,248,3,34,17,0,248,33,1,0,0,0,249,250,3,
	2,1,0,250,35,1,0,0,0,251,253,5,27,0,0,252,254,5,2,0,0,253,252,1,0,0,0,253,
	254,1,0,0,0,254,255,1,0,0,0,255,259,3,44,22,0,256,257,5,27,0,0,257,259,
	7,9,0,0,258,251,1,0,0,0,258,256,1,0,0,0,259,37,1,0,0,0,260,264,3,40,20,
	0,261,264,3,42,21,0,262,264,3,44,22,0,263,260,1,0,0,0,263,261,1,0,0,0,263,
	262,1,0,0,0,264,39,1,0,0,0,265,269,5,40,0,0,266,269,5,39,0,0,267,269,5,
	41,0,0,268,265,1,0,0,0,268,266,1,0,0,0,268,267,1,0,0,0,269,41,1,0,0,0,270,
	271,5,38,0,0,271,43,1,0,0,0,272,277,5,42,0,0,273,277,5,43,0,0,274,277,3,
	40,20,0,275,277,5,45,0,0,276,272,1,0,0,0,276,273,1,0,0,0,276,274,1,0,0,
	0,276,275,1,0,0,0,277,45,1,0,0,0,278,279,7,10,0,0,279,47,1,0,0,0,40,59,
	64,70,76,82,85,91,97,106,108,110,115,127,132,137,152,159,170,173,178,181,
	187,193,195,200,204,212,216,222,227,231,235,239,241,245,253,258,263,268,
	276];

	private static __ATN: ATN;
	public static get _ATN(): ATN {
		if (!promql_parser.__ATN) {
			promql_parser.__ATN = new ATNDeserializer().deserialize(promql_parser._serializedATN);
		}

		return promql_parser.__ATN;
	}


	static DecisionsToDFA = promql_parser._ATN.decisionToState.map( (ds: DecisionState, index: number) => new DFA(ds, index) );

}

export class SingleStatementContext extends ParserRuleContext {
	constructor(parser?: promql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public EOF(): TerminalNode {
		return this.getToken(promql_parser.EOF, 0);
	}
    public get ruleIndex(): number {
    	return promql_parser.RULE_singleStatement;
	}
	public enterRule(listener: promql_parserListener): void {
	    if(listener.enterSingleStatement) {
	 		listener.enterSingleStatement(this);
		}
	}
	public exitRule(listener: promql_parserListener): void {
	    if(listener.exitSingleStatement) {
	 		listener.exitSingleStatement(this);
		}
	}
}


export class ExpressionContext extends ParserRuleContext {
	constructor(parser?: promql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return promql_parser.RULE_expression;
	}
	public override copyFrom(ctx: ExpressionContext): void {
		super.copyFrom(ctx);
	}
}
export class ValueExpressionContext extends ExpressionContext {
	constructor(parser: promql_parser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public value(): ValueContext {
		return this.getTypedRuleContext(ValueContext, 0) as ValueContext;
	}
	public enterRule(listener: promql_parserListener): void {
	    if(listener.enterValueExpression) {
	 		listener.enterValueExpression(this);
		}
	}
	public exitRule(listener: promql_parserListener): void {
	    if(listener.exitValueExpression) {
	 		listener.exitValueExpression(this);
		}
	}
}
export class SubqueryContext extends ExpressionContext {
	public _range!: DurationContext;
	constructor(parser: promql_parser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public LSB(): TerminalNode {
		return this.getToken(promql_parser.LSB, 0);
	}
	public subqueryResolution(): SubqueryResolutionContext {
		return this.getTypedRuleContext(SubqueryResolutionContext, 0) as SubqueryResolutionContext;
	}
	public RSB(): TerminalNode {
		return this.getToken(promql_parser.RSB, 0);
	}
	public duration(): DurationContext {
		return this.getTypedRuleContext(DurationContext, 0) as DurationContext;
	}
	public evaluation(): EvaluationContext {
		return this.getTypedRuleContext(EvaluationContext, 0) as EvaluationContext;
	}
	public enterRule(listener: promql_parserListener): void {
	    if(listener.enterSubquery) {
	 		listener.enterSubquery(this);
		}
	}
	public exitRule(listener: promql_parserListener): void {
	    if(listener.exitSubquery) {
	 		listener.exitSubquery(this);
		}
	}
}
export class ParenthesizedContext extends ExpressionContext {
	constructor(parser: promql_parser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public LP(): TerminalNode {
		return this.getToken(promql_parser.LP, 0);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public RP(): TerminalNode {
		return this.getToken(promql_parser.RP, 0);
	}
	public enterRule(listener: promql_parserListener): void {
	    if(listener.enterParenthesized) {
	 		listener.enterParenthesized(this);
		}
	}
	public exitRule(listener: promql_parserListener): void {
	    if(listener.exitParenthesized) {
	 		listener.exitParenthesized(this);
		}
	}
}
export class ArithmeticBinaryContext extends ExpressionContext {
	public _left!: ExpressionContext;
	public _op!: Token;
	public _right!: ExpressionContext;
	constructor(parser: promql_parser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public CARET(): TerminalNode {
		return this.getToken(promql_parser.CARET, 0);
	}
	public modifier(): ModifierContext {
		return this.getTypedRuleContext(ModifierContext, 0) as ModifierContext;
	}
	public ASTERISK(): TerminalNode {
		return this.getToken(promql_parser.ASTERISK, 0);
	}
	public PERCENT(): TerminalNode {
		return this.getToken(promql_parser.PERCENT, 0);
	}
	public SLASH(): TerminalNode {
		return this.getToken(promql_parser.SLASH, 0);
	}
	public MINUS(): TerminalNode {
		return this.getToken(promql_parser.MINUS, 0);
	}
	public PLUS(): TerminalNode {
		return this.getToken(promql_parser.PLUS, 0);
	}
	public EQ(): TerminalNode {
		return this.getToken(promql_parser.EQ, 0);
	}
	public NEQ(): TerminalNode {
		return this.getToken(promql_parser.NEQ, 0);
	}
	public GT(): TerminalNode {
		return this.getToken(promql_parser.GT, 0);
	}
	public GTE(): TerminalNode {
		return this.getToken(promql_parser.GTE, 0);
	}
	public LT(): TerminalNode {
		return this.getToken(promql_parser.LT, 0);
	}
	public LTE(): TerminalNode {
		return this.getToken(promql_parser.LTE, 0);
	}
	public BOOL(): TerminalNode {
		return this.getToken(promql_parser.BOOL, 0);
	}
	public AND(): TerminalNode {
		return this.getToken(promql_parser.AND, 0);
	}
	public UNLESS(): TerminalNode {
		return this.getToken(promql_parser.UNLESS, 0);
	}
	public OR(): TerminalNode {
		return this.getToken(promql_parser.OR, 0);
	}
	public enterRule(listener: promql_parserListener): void {
	    if(listener.enterArithmeticBinary) {
	 		listener.enterArithmeticBinary(this);
		}
	}
	public exitRule(listener: promql_parserListener): void {
	    if(listener.exitArithmeticBinary) {
	 		listener.exitArithmeticBinary(this);
		}
	}
}
export class ArithmeticUnaryContext extends ExpressionContext {
	public _operator!: Token;
	constructor(parser: promql_parser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public PLUS(): TerminalNode {
		return this.getToken(promql_parser.PLUS, 0);
	}
	public MINUS(): TerminalNode {
		return this.getToken(promql_parser.MINUS, 0);
	}
	public enterRule(listener: promql_parserListener): void {
	    if(listener.enterArithmeticUnary) {
	 		listener.enterArithmeticUnary(this);
		}
	}
	public exitRule(listener: promql_parserListener): void {
	    if(listener.exitArithmeticUnary) {
	 		listener.exitArithmeticUnary(this);
		}
	}
}


export class SubqueryResolutionContext extends ParserRuleContext {
	public _resolution!: DurationContext;
	public _op!: Token;
	constructor(parser?: promql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public COLON(): TerminalNode {
		return this.getToken(promql_parser.COLON, 0);
	}
	public duration(): DurationContext {
		return this.getTypedRuleContext(DurationContext, 0) as DurationContext;
	}
	public TIME_VALUE_WITH_COLON(): TerminalNode {
		return this.getToken(promql_parser.TIME_VALUE_WITH_COLON, 0);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public CARET(): TerminalNode {
		return this.getToken(promql_parser.CARET, 0);
	}
	public ASTERISK(): TerminalNode {
		return this.getToken(promql_parser.ASTERISK, 0);
	}
	public SLASH(): TerminalNode {
		return this.getToken(promql_parser.SLASH, 0);
	}
	public MINUS(): TerminalNode {
		return this.getToken(promql_parser.MINUS, 0);
	}
	public PLUS(): TerminalNode {
		return this.getToken(promql_parser.PLUS, 0);
	}
    public get ruleIndex(): number {
    	return promql_parser.RULE_subqueryResolution;
	}
	public enterRule(listener: promql_parserListener): void {
	    if(listener.enterSubqueryResolution) {
	 		listener.enterSubqueryResolution(this);
		}
	}
	public exitRule(listener: promql_parserListener): void {
	    if(listener.exitSubqueryResolution) {
	 		listener.exitSubqueryResolution(this);
		}
	}
}


export class ValueContext extends ParserRuleContext {
	constructor(parser?: promql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public function_(): FunctionContext {
		return this.getTypedRuleContext(FunctionContext, 0) as FunctionContext;
	}
	public selector(): SelectorContext {
		return this.getTypedRuleContext(SelectorContext, 0) as SelectorContext;
	}
	public constant(): ConstantContext {
		return this.getTypedRuleContext(ConstantContext, 0) as ConstantContext;
	}
    public get ruleIndex(): number {
    	return promql_parser.RULE_value;
	}
	public enterRule(listener: promql_parserListener): void {
	    if(listener.enterValue) {
	 		listener.enterValue(this);
		}
	}
	public exitRule(listener: promql_parserListener): void {
	    if(listener.exitValue) {
	 		listener.exitValue(this);
		}
	}
}


export class FunctionContext extends ParserRuleContext {
	constructor(parser?: promql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public IDENTIFIER(): TerminalNode {
		return this.getToken(promql_parser.IDENTIFIER, 0);
	}
	public LP(): TerminalNode {
		return this.getToken(promql_parser.LP, 0);
	}
	public RP(): TerminalNode {
		return this.getToken(promql_parser.RP, 0);
	}
	public functionParams(): FunctionParamsContext {
		return this.getTypedRuleContext(FunctionParamsContext, 0) as FunctionParamsContext;
	}
	public grouping(): GroupingContext {
		return this.getTypedRuleContext(GroupingContext, 0) as GroupingContext;
	}
    public get ruleIndex(): number {
    	return promql_parser.RULE_function;
	}
	public enterRule(listener: promql_parserListener): void {
	    if(listener.enterFunction) {
	 		listener.enterFunction(this);
		}
	}
	public exitRule(listener: promql_parserListener): void {
	    if(listener.exitFunction) {
	 		listener.exitFunction(this);
		}
	}
}


export class FunctionParamsContext extends ParserRuleContext {
	constructor(parser?: promql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public COMMA_list(): TerminalNode[] {
	    	return this.getTokens(promql_parser.COMMA);
	}
	public COMMA(i: number): TerminalNode {
		return this.getToken(promql_parser.COMMA, i);
	}
    public get ruleIndex(): number {
    	return promql_parser.RULE_functionParams;
	}
	public enterRule(listener: promql_parserListener): void {
	    if(listener.enterFunctionParams) {
	 		listener.enterFunctionParams(this);
		}
	}
	public exitRule(listener: promql_parserListener): void {
	    if(listener.exitFunctionParams) {
	 		listener.exitFunctionParams(this);
		}
	}
}


export class GroupingContext extends ParserRuleContext {
	constructor(parser?: promql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public labelList(): LabelListContext {
		return this.getTypedRuleContext(LabelListContext, 0) as LabelListContext;
	}
	public BY(): TerminalNode {
		return this.getToken(promql_parser.BY, 0);
	}
	public WITHOUT(): TerminalNode {
		return this.getToken(promql_parser.WITHOUT, 0);
	}
    public get ruleIndex(): number {
    	return promql_parser.RULE_grouping;
	}
	public enterRule(listener: promql_parserListener): void {
	    if(listener.enterGrouping) {
	 		listener.enterGrouping(this);
		}
	}
	public exitRule(listener: promql_parserListener): void {
	    if(listener.exitGrouping) {
	 		listener.exitGrouping(this);
		}
	}
}


export class SelectorContext extends ParserRuleContext {
	constructor(parser?: promql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public seriesMatcher(): SeriesMatcherContext {
		return this.getTypedRuleContext(SeriesMatcherContext, 0) as SeriesMatcherContext;
	}
	public LSB(): TerminalNode {
		return this.getToken(promql_parser.LSB, 0);
	}
	public duration(): DurationContext {
		return this.getTypedRuleContext(DurationContext, 0) as DurationContext;
	}
	public RSB(): TerminalNode {
		return this.getToken(promql_parser.RSB, 0);
	}
	public evaluation(): EvaluationContext {
		return this.getTypedRuleContext(EvaluationContext, 0) as EvaluationContext;
	}
    public get ruleIndex(): number {
    	return promql_parser.RULE_selector;
	}
	public enterRule(listener: promql_parserListener): void {
	    if(listener.enterSelector) {
	 		listener.enterSelector(this);
		}
	}
	public exitRule(listener: promql_parserListener): void {
	    if(listener.exitSelector) {
	 		listener.exitSelector(this);
		}
	}
}


export class SeriesMatcherContext extends ParserRuleContext {
	constructor(parser?: promql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public identifier(): IdentifierContext {
		return this.getTypedRuleContext(IdentifierContext, 0) as IdentifierContext;
	}
	public LCB(): TerminalNode {
		return this.getToken(promql_parser.LCB, 0);
	}
	public RCB(): TerminalNode {
		return this.getToken(promql_parser.RCB, 0);
	}
	public labels(): LabelsContext {
		return this.getTypedRuleContext(LabelsContext, 0) as LabelsContext;
	}
    public get ruleIndex(): number {
    	return promql_parser.RULE_seriesMatcher;
	}
	public enterRule(listener: promql_parserListener): void {
	    if(listener.enterSeriesMatcher) {
	 		listener.enterSeriesMatcher(this);
		}
	}
	public exitRule(listener: promql_parserListener): void {
	    if(listener.exitSeriesMatcher) {
	 		listener.exitSeriesMatcher(this);
		}
	}
}


export class ModifierContext extends ParserRuleContext {
	public _matching!: Token;
	public _modifierLabels!: LabelListContext;
	public _joining!: Token;
	public _groupLabels!: LabelListContext;
	constructor(parser?: promql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public labelList_list(): LabelListContext[] {
		return this.getTypedRuleContexts(LabelListContext) as LabelListContext[];
	}
	public labelList(i: number): LabelListContext {
		return this.getTypedRuleContext(LabelListContext, i) as LabelListContext;
	}
	public IGNORING(): TerminalNode {
		return this.getToken(promql_parser.IGNORING, 0);
	}
	public ON(): TerminalNode {
		return this.getToken(promql_parser.ON, 0);
	}
	public GROUP_LEFT(): TerminalNode {
		return this.getToken(promql_parser.GROUP_LEFT, 0);
	}
	public GROUP_RIGHT(): TerminalNode {
		return this.getToken(promql_parser.GROUP_RIGHT, 0);
	}
    public get ruleIndex(): number {
    	return promql_parser.RULE_modifier;
	}
	public enterRule(listener: promql_parserListener): void {
	    if(listener.enterModifier) {
	 		listener.enterModifier(this);
		}
	}
	public exitRule(listener: promql_parserListener): void {
	    if(listener.exitModifier) {
	 		listener.exitModifier(this);
		}
	}
}


export class LabelListContext extends ParserRuleContext {
	constructor(parser?: promql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public LP(): TerminalNode {
		return this.getToken(promql_parser.LP, 0);
	}
	public RP(): TerminalNode {
		return this.getToken(promql_parser.RP, 0);
	}
	public labelName_list(): LabelNameContext[] {
		return this.getTypedRuleContexts(LabelNameContext) as LabelNameContext[];
	}
	public labelName(i: number): LabelNameContext {
		return this.getTypedRuleContext(LabelNameContext, i) as LabelNameContext;
	}
	public COMMA_list(): TerminalNode[] {
	    	return this.getTokens(promql_parser.COMMA);
	}
	public COMMA(i: number): TerminalNode {
		return this.getToken(promql_parser.COMMA, i);
	}
    public get ruleIndex(): number {
    	return promql_parser.RULE_labelList;
	}
	public enterRule(listener: promql_parserListener): void {
	    if(listener.enterLabelList) {
	 		listener.enterLabelList(this);
		}
	}
	public exitRule(listener: promql_parserListener): void {
	    if(listener.exitLabelList) {
	 		listener.exitLabelList(this);
		}
	}
}


export class LabelsContext extends ParserRuleContext {
	constructor(parser?: promql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public label_list(): LabelContext[] {
		return this.getTypedRuleContexts(LabelContext) as LabelContext[];
	}
	public label(i: number): LabelContext {
		return this.getTypedRuleContext(LabelContext, i) as LabelContext;
	}
	public COMMA_list(): TerminalNode[] {
	    	return this.getTokens(promql_parser.COMMA);
	}
	public COMMA(i: number): TerminalNode {
		return this.getToken(promql_parser.COMMA, i);
	}
    public get ruleIndex(): number {
    	return promql_parser.RULE_labels;
	}
	public enterRule(listener: promql_parserListener): void {
	    if(listener.enterLabels) {
	 		listener.enterLabels(this);
		}
	}
	public exitRule(listener: promql_parserListener): void {
	    if(listener.exitLabels) {
	 		listener.exitLabels(this);
		}
	}
}


export class LabelContext extends ParserRuleContext {
	public _kind!: Token;
	constructor(parser?: promql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public labelName(): LabelNameContext {
		return this.getTypedRuleContext(LabelNameContext, 0) as LabelNameContext;
	}
	public STRING(): TerminalNode {
		return this.getToken(promql_parser.STRING, 0);
	}
	public LABEL_EQ(): TerminalNode {
		return this.getToken(promql_parser.LABEL_EQ, 0);
	}
	public NEQ(): TerminalNode {
		return this.getToken(promql_parser.NEQ, 0);
	}
	public LABEL_RGX(): TerminalNode {
		return this.getToken(promql_parser.LABEL_RGX, 0);
	}
	public LABEL_RGX_NEQ(): TerminalNode {
		return this.getToken(promql_parser.LABEL_RGX_NEQ, 0);
	}
    public get ruleIndex(): number {
    	return promql_parser.RULE_label;
	}
	public enterRule(listener: promql_parserListener): void {
	    if(listener.enterLabel) {
	 		listener.enterLabel(this);
		}
	}
	public exitRule(listener: promql_parserListener): void {
	    if(listener.exitLabel) {
	 		listener.exitLabel(this);
		}
	}
}


export class LabelNameContext extends ParserRuleContext {
	constructor(parser?: promql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public identifier(): IdentifierContext {
		return this.getTypedRuleContext(IdentifierContext, 0) as IdentifierContext;
	}
	public STRING(): TerminalNode {
		return this.getToken(promql_parser.STRING, 0);
	}
	public number_(): NumberContext {
		return this.getTypedRuleContext(NumberContext, 0) as NumberContext;
	}
    public get ruleIndex(): number {
    	return promql_parser.RULE_labelName;
	}
	public enterRule(listener: promql_parserListener): void {
	    if(listener.enterLabelName) {
	 		listener.enterLabelName(this);
		}
	}
	public exitRule(listener: promql_parserListener): void {
	    if(listener.exitLabelName) {
	 		listener.exitLabelName(this);
		}
	}
}


export class IdentifierContext extends ParserRuleContext {
	constructor(parser?: promql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public IDENTIFIER(): TerminalNode {
		return this.getToken(promql_parser.IDENTIFIER, 0);
	}
	public nonReserved(): NonReservedContext {
		return this.getTypedRuleContext(NonReservedContext, 0) as NonReservedContext;
	}
    public get ruleIndex(): number {
    	return promql_parser.RULE_identifier;
	}
	public enterRule(listener: promql_parserListener): void {
	    if(listener.enterIdentifier) {
	 		listener.enterIdentifier(this);
		}
	}
	public exitRule(listener: promql_parserListener): void {
	    if(listener.exitIdentifier) {
	 		listener.exitIdentifier(this);
		}
	}
}


export class EvaluationContext extends ParserRuleContext {
	constructor(parser?: promql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public offset(): OffsetContext {
		return this.getTypedRuleContext(OffsetContext, 0) as OffsetContext;
	}
	public at(): AtContext {
		return this.getTypedRuleContext(AtContext, 0) as AtContext;
	}
    public get ruleIndex(): number {
    	return promql_parser.RULE_evaluation;
	}
	public enterRule(listener: promql_parserListener): void {
	    if(listener.enterEvaluation) {
	 		listener.enterEvaluation(this);
		}
	}
	public exitRule(listener: promql_parserListener): void {
	    if(listener.exitEvaluation) {
	 		listener.exitEvaluation(this);
		}
	}
}


export class OffsetContext extends ParserRuleContext {
	constructor(parser?: promql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public OFFSET(): TerminalNode {
		return this.getToken(promql_parser.OFFSET, 0);
	}
	public duration(): DurationContext {
		return this.getTypedRuleContext(DurationContext, 0) as DurationContext;
	}
	public MINUS(): TerminalNode {
		return this.getToken(promql_parser.MINUS, 0);
	}
    public get ruleIndex(): number {
    	return promql_parser.RULE_offset;
	}
	public enterRule(listener: promql_parserListener): void {
	    if(listener.enterOffset) {
	 		listener.enterOffset(this);
		}
	}
	public exitRule(listener: promql_parserListener): void {
	    if(listener.exitOffset) {
	 		listener.exitOffset(this);
		}
	}
}


export class DurationContext extends ParserRuleContext {
	constructor(parser?: promql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
    public get ruleIndex(): number {
    	return promql_parser.RULE_duration;
	}
	public enterRule(listener: promql_parserListener): void {
	    if(listener.enterDuration) {
	 		listener.enterDuration(this);
		}
	}
	public exitRule(listener: promql_parserListener): void {
	    if(listener.exitDuration) {
	 		listener.exitDuration(this);
		}
	}
}


export class AtContext extends ParserRuleContext {
	constructor(parser?: promql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public AT(): TerminalNode {
		return this.getToken(promql_parser.AT, 0);
	}
	public timeValue(): TimeValueContext {
		return this.getTypedRuleContext(TimeValueContext, 0) as TimeValueContext;
	}
	public MINUS(): TerminalNode {
		return this.getToken(promql_parser.MINUS, 0);
	}
	public AT_START(): TerminalNode {
		return this.getToken(promql_parser.AT_START, 0);
	}
	public AT_END(): TerminalNode {
		return this.getToken(promql_parser.AT_END, 0);
	}
    public get ruleIndex(): number {
    	return promql_parser.RULE_at;
	}
	public enterRule(listener: promql_parserListener): void {
	    if(listener.enterAt) {
	 		listener.enterAt(this);
		}
	}
	public exitRule(listener: promql_parserListener): void {
	    if(listener.exitAt) {
	 		listener.exitAt(this);
		}
	}
}


export class ConstantContext extends ParserRuleContext {
	constructor(parser?: promql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public number_(): NumberContext {
		return this.getTypedRuleContext(NumberContext, 0) as NumberContext;
	}
	public string_(): StringContext {
		return this.getTypedRuleContext(StringContext, 0) as StringContext;
	}
	public timeValue(): TimeValueContext {
		return this.getTypedRuleContext(TimeValueContext, 0) as TimeValueContext;
	}
    public get ruleIndex(): number {
    	return promql_parser.RULE_constant;
	}
	public enterRule(listener: promql_parserListener): void {
	    if(listener.enterConstant) {
	 		listener.enterConstant(this);
		}
	}
	public exitRule(listener: promql_parserListener): void {
	    if(listener.exitConstant) {
	 		listener.exitConstant(this);
		}
	}
}


export class NumberContext extends ParserRuleContext {
	constructor(parser?: promql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return promql_parser.RULE_number;
	}
	public override copyFrom(ctx: NumberContext): void {
		super.copyFrom(ctx);
	}
}
export class DecimalLiteralContext extends NumberContext {
	constructor(parser: promql_parser, ctx: NumberContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public DECIMAL_VALUE(): TerminalNode {
		return this.getToken(promql_parser.DECIMAL_VALUE, 0);
	}
	public enterRule(listener: promql_parserListener): void {
	    if(listener.enterDecimalLiteral) {
	 		listener.enterDecimalLiteral(this);
		}
	}
	public exitRule(listener: promql_parserListener): void {
	    if(listener.exitDecimalLiteral) {
	 		listener.exitDecimalLiteral(this);
		}
	}
}
export class IntegerLiteralContext extends NumberContext {
	constructor(parser: promql_parser, ctx: NumberContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public INTEGER_VALUE(): TerminalNode {
		return this.getToken(promql_parser.INTEGER_VALUE, 0);
	}
	public enterRule(listener: promql_parserListener): void {
	    if(listener.enterIntegerLiteral) {
	 		listener.enterIntegerLiteral(this);
		}
	}
	public exitRule(listener: promql_parserListener): void {
	    if(listener.exitIntegerLiteral) {
	 		listener.exitIntegerLiteral(this);
		}
	}
}
export class HexLiteralContext extends NumberContext {
	constructor(parser: promql_parser, ctx: NumberContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public HEXADECIMAL(): TerminalNode {
		return this.getToken(promql_parser.HEXADECIMAL, 0);
	}
	public enterRule(listener: promql_parserListener): void {
	    if(listener.enterHexLiteral) {
	 		listener.enterHexLiteral(this);
		}
	}
	public exitRule(listener: promql_parserListener): void {
	    if(listener.exitHexLiteral) {
	 		listener.exitHexLiteral(this);
		}
	}
}


export class StringContext extends ParserRuleContext {
	constructor(parser?: promql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public STRING(): TerminalNode {
		return this.getToken(promql_parser.STRING, 0);
	}
    public get ruleIndex(): number {
    	return promql_parser.RULE_string;
	}
	public enterRule(listener: promql_parserListener): void {
	    if(listener.enterString) {
	 		listener.enterString(this);
		}
	}
	public exitRule(listener: promql_parserListener): void {
	    if(listener.exitString) {
	 		listener.exitString(this);
		}
	}
}


export class TimeValueContext extends ParserRuleContext {
	constructor(parser?: promql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public TIME_VALUE_WITH_COLON(): TerminalNode {
		return this.getToken(promql_parser.TIME_VALUE_WITH_COLON, 0);
	}
	public TIME_VALUE(): TerminalNode {
		return this.getToken(promql_parser.TIME_VALUE, 0);
	}
	public number_(): NumberContext {
		return this.getTypedRuleContext(NumberContext, 0) as NumberContext;
	}
	public NAMED_OR_POSITIONAL_PARAM(): TerminalNode {
		return this.getToken(promql_parser.NAMED_OR_POSITIONAL_PARAM, 0);
	}
    public get ruleIndex(): number {
    	return promql_parser.RULE_timeValue;
	}
	public enterRule(listener: promql_parserListener): void {
	    if(listener.enterTimeValue) {
	 		listener.enterTimeValue(this);
		}
	}
	public exitRule(listener: promql_parserListener): void {
	    if(listener.exitTimeValue) {
	 		listener.exitTimeValue(this);
		}
	}
}


export class NonReservedContext extends ParserRuleContext {
	constructor(parser?: promql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public AND(): TerminalNode {
		return this.getToken(promql_parser.AND, 0);
	}
	public BOOL(): TerminalNode {
		return this.getToken(promql_parser.BOOL, 0);
	}
	public BY(): TerminalNode {
		return this.getToken(promql_parser.BY, 0);
	}
	public GROUP_LEFT(): TerminalNode {
		return this.getToken(promql_parser.GROUP_LEFT, 0);
	}
	public GROUP_RIGHT(): TerminalNode {
		return this.getToken(promql_parser.GROUP_RIGHT, 0);
	}
	public IGNORING(): TerminalNode {
		return this.getToken(promql_parser.IGNORING, 0);
	}
	public OFFSET(): TerminalNode {
		return this.getToken(promql_parser.OFFSET, 0);
	}
	public OR(): TerminalNode {
		return this.getToken(promql_parser.OR, 0);
	}
	public ON(): TerminalNode {
		return this.getToken(promql_parser.ON, 0);
	}
	public UNLESS(): TerminalNode {
		return this.getToken(promql_parser.UNLESS, 0);
	}
	public WITHOUT(): TerminalNode {
		return this.getToken(promql_parser.WITHOUT, 0);
	}
    public get ruleIndex(): number {
    	return promql_parser.RULE_nonReserved;
	}
	public enterRule(listener: promql_parserListener): void {
	    if(listener.enterNonReserved) {
	 		listener.enterNonReserved(this);
		}
	}
	public exitRule(listener: promql_parserListener): void {
	    if(listener.exitNonReserved) {
	 		listener.exitNonReserved(this);
		}
	}
}
