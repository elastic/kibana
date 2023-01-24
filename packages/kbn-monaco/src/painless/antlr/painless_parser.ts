// @ts-nocheck
// Generated from ./src/painless/antlr/painless_parser.g4 by ANTLR 4.7.3-SNAPSHOT


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

import { painless_parserListener } from "./painless_parser_listener";

export class painless_parser extends Parser {
	public static readonly WS = 1;
	public static readonly COMMENT = 2;
	public static readonly LBRACK = 3;
	public static readonly RBRACK = 4;
	public static readonly LBRACE = 5;
	public static readonly RBRACE = 6;
	public static readonly LP = 7;
	public static readonly RP = 8;
	public static readonly DOLLAR = 9;
	public static readonly DOT = 10;
	public static readonly NSDOT = 11;
	public static readonly COMMA = 12;
	public static readonly SEMICOLON = 13;
	public static readonly IF = 14;
	public static readonly IN = 15;
	public static readonly ELSE = 16;
	public static readonly WHILE = 17;
	public static readonly DO = 18;
	public static readonly FOR = 19;
	public static readonly CONTINUE = 20;
	public static readonly BREAK = 21;
	public static readonly RETURN = 22;
	public static readonly NEW = 23;
	public static readonly TRY = 24;
	public static readonly CATCH = 25;
	public static readonly THROW = 26;
	public static readonly THIS = 27;
	public static readonly INSTANCEOF = 28;
	public static readonly BOOLNOT = 29;
	public static readonly BWNOT = 30;
	public static readonly MUL = 31;
	public static readonly DIV = 32;
	public static readonly REM = 33;
	public static readonly ADD = 34;
	public static readonly SUB = 35;
	public static readonly LSH = 36;
	public static readonly RSH = 37;
	public static readonly USH = 38;
	public static readonly LT = 39;
	public static readonly LTE = 40;
	public static readonly GT = 41;
	public static readonly GTE = 42;
	public static readonly EQ = 43;
	public static readonly EQR = 44;
	public static readonly NE = 45;
	public static readonly NER = 46;
	public static readonly BWAND = 47;
	public static readonly XOR = 48;
	public static readonly BWOR = 49;
	public static readonly BOOLAND = 50;
	public static readonly BOOLOR = 51;
	public static readonly COND = 52;
	public static readonly COLON = 53;
	public static readonly ELVIS = 54;
	public static readonly REF = 55;
	public static readonly ARROW = 56;
	public static readonly FIND = 57;
	public static readonly MATCH = 58;
	public static readonly INCR = 59;
	public static readonly DECR = 60;
	public static readonly ASSIGN = 61;
	public static readonly AADD = 62;
	public static readonly ASUB = 63;
	public static readonly AMUL = 64;
	public static readonly ADIV = 65;
	public static readonly AREM = 66;
	public static readonly AAND = 67;
	public static readonly AXOR = 68;
	public static readonly AOR = 69;
	public static readonly ALSH = 70;
	public static readonly ARSH = 71;
	public static readonly AUSH = 72;
	public static readonly OCTAL = 73;
	public static readonly HEX = 74;
	public static readonly INTEGER = 75;
	public static readonly DECIMAL = 76;
	public static readonly STRING = 77;
	public static readonly REGEX = 78;
	public static readonly TRUE = 79;
	public static readonly FALSE = 80;
	public static readonly NULL = 81;
	public static readonly PRIMITIVE = 82;
	public static readonly DEF = 83;
	public static readonly ID = 84;
	public static readonly DOTINTEGER = 85;
	public static readonly DOTID = 86;
	public static readonly RULE_source = 0;
	public static readonly RULE_function = 1;
	public static readonly RULE_parameters = 2;
	public static readonly RULE_statement = 3;
	public static readonly RULE_rstatement = 4;
	public static readonly RULE_dstatement = 5;
	public static readonly RULE_trailer = 6;
	public static readonly RULE_block = 7;
	public static readonly RULE_empty = 8;
	public static readonly RULE_initializer = 9;
	public static readonly RULE_afterthought = 10;
	public static readonly RULE_declaration = 11;
	public static readonly RULE_decltype = 12;
	public static readonly RULE_type = 13;
	public static readonly RULE_declvar = 14;
	public static readonly RULE_trap = 15;
	public static readonly RULE_noncondexpression = 16;
	public static readonly RULE_expression = 17;
	public static readonly RULE_unary = 18;
	public static readonly RULE_unarynotaddsub = 19;
	public static readonly RULE_castexpression = 20;
	public static readonly RULE_primordefcasttype = 21;
	public static readonly RULE_refcasttype = 22;
	public static readonly RULE_chain = 23;
	public static readonly RULE_primary = 24;
	public static readonly RULE_postfix = 25;
	public static readonly RULE_postdot = 26;
	public static readonly RULE_callinvoke = 27;
	public static readonly RULE_fieldaccess = 28;
	public static readonly RULE_braceaccess = 29;
	public static readonly RULE_arrayinitializer = 30;
	public static readonly RULE_listinitializer = 31;
	public static readonly RULE_mapinitializer = 32;
	public static readonly RULE_maptoken = 33;
	public static readonly RULE_arguments = 34;
	public static readonly RULE_argument = 35;
	public static readonly RULE_lambda = 36;
	public static readonly RULE_lamtype = 37;
	public static readonly RULE_funcref = 38;
	// tslint:disable:no-trailing-whitespace
	public static readonly ruleNames: string[] = [
		"source", "function", "parameters", "statement", "rstatement", "dstatement", 
		"trailer", "block", "empty", "initializer", "afterthought", "declaration", 
		"decltype", "type", "declvar", "trap", "noncondexpression", "expression", 
		"unary", "unarynotaddsub", "castexpression", "primordefcasttype", "refcasttype", 
		"chain", "primary", "postfix", "postdot", "callinvoke", "fieldaccess", 
		"braceaccess", "arrayinitializer", "listinitializer", "mapinitializer", 
		"maptoken", "arguments", "argument", "lambda", "lamtype", "funcref",
	];

	private static readonly _LITERAL_NAMES: Array<string | undefined> = [
		undefined, undefined, undefined, "'{'", "'}'", "'['", "']'", "'('", "')'", 
		"'$'", "'.'", "'?.'", "','", "';'", "'if'", "'in'", "'else'", "'while'", 
		"'do'", "'for'", "'continue'", "'break'", "'return'", "'new'", "'try'", 
		"'catch'", "'throw'", "'this'", "'instanceof'", "'!'", "'~'", "'*'", "'/'", 
		"'%'", "'+'", "'-'", "'<<'", "'>>'", "'>>>'", "'<'", "'<='", "'>'", "'>='", 
		"'=='", "'==='", "'!='", "'!=='", "'&'", "'^'", "'|'", "'&&'", "'||'", 
		"'?'", "':'", "'?:'", "'::'", "'->'", "'=~'", "'==~'", "'++'", "'--'", 
		"'='", "'+='", "'-='", "'*='", "'/='", "'%='", "'&='", "'^='", "'|='", 
		"'<<='", "'>>='", "'>>>='", undefined, undefined, undefined, undefined, 
		undefined, undefined, "'true'", "'false'", "'null'", undefined, "'def'",
	];
	private static readonly _SYMBOLIC_NAMES: Array<string | undefined> = [
		undefined, "WS", "COMMENT", "LBRACK", "RBRACK", "LBRACE", "RBRACE", "LP", 
		"RP", "DOLLAR", "DOT", "NSDOT", "COMMA", "SEMICOLON", "IF", "IN", "ELSE", 
		"WHILE", "DO", "FOR", "CONTINUE", "BREAK", "RETURN", "NEW", "TRY", "CATCH", 
		"THROW", "THIS", "INSTANCEOF", "BOOLNOT", "BWNOT", "MUL", "DIV", "REM", 
		"ADD", "SUB", "LSH", "RSH", "USH", "LT", "LTE", "GT", "GTE", "EQ", "EQR", 
		"NE", "NER", "BWAND", "XOR", "BWOR", "BOOLAND", "BOOLOR", "COND", "COLON", 
		"ELVIS", "REF", "ARROW", "FIND", "MATCH", "INCR", "DECR", "ASSIGN", "AADD", 
		"ASUB", "AMUL", "ADIV", "AREM", "AAND", "AXOR", "AOR", "ALSH", "ARSH", 
		"AUSH", "OCTAL", "HEX", "INTEGER", "DECIMAL", "STRING", "REGEX", "TRUE", 
		"FALSE", "NULL", "PRIMITIVE", "DEF", "ID", "DOTINTEGER", "DOTID",
	];
	public static readonly VOCABULARY: Vocabulary = new VocabularyImpl(painless_parser._LITERAL_NAMES, painless_parser._SYMBOLIC_NAMES, []);

	// @Override
	// @NotNull
	public get vocabulary(): Vocabulary {
		return painless_parser.VOCABULARY;
	}
	// tslint:enable:no-trailing-whitespace

	// @Override
	public get grammarFileName(): string { return "painless_parser.g4"; }

	// @Override
	public get ruleNames(): string[] { return painless_parser.ruleNames; }

	// @Override
	public get serializedATN(): string { return painless_parser._serializedATN; }

	constructor(input: TokenStream) {
		super(input);
		this._interp = new ParserATNSimulator(painless_parser._ATN, this);
	}
	// @RuleVersion(0)
	public source(): SourceContext {
		let _localctx: SourceContext = new SourceContext(this._ctx, this.state);
		this.enterRule(_localctx, 0, painless_parser.RULE_source);
		let _la: number;
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 81;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 0, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 78;
					this.function();
					}
					}
				}
				this.state = 83;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 0, this._ctx);
			}
			this.state = 87;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (((((_la - 5)) & ~0x1F) === 0 && ((1 << (_la - 5)) & ((1 << (painless_parser.LBRACE - 5)) | (1 << (painless_parser.LP - 5)) | (1 << (painless_parser.DOLLAR - 5)) | (1 << (painless_parser.IF - 5)) | (1 << (painless_parser.WHILE - 5)) | (1 << (painless_parser.DO - 5)) | (1 << (painless_parser.FOR - 5)) | (1 << (painless_parser.CONTINUE - 5)) | (1 << (painless_parser.BREAK - 5)) | (1 << (painless_parser.RETURN - 5)) | (1 << (painless_parser.NEW - 5)) | (1 << (painless_parser.TRY - 5)) | (1 << (painless_parser.THROW - 5)) | (1 << (painless_parser.BOOLNOT - 5)) | (1 << (painless_parser.BWNOT - 5)) | (1 << (painless_parser.ADD - 5)) | (1 << (painless_parser.SUB - 5)))) !== 0) || ((((_la - 59)) & ~0x1F) === 0 && ((1 << (_la - 59)) & ((1 << (painless_parser.INCR - 59)) | (1 << (painless_parser.DECR - 59)) | (1 << (painless_parser.OCTAL - 59)) | (1 << (painless_parser.HEX - 59)) | (1 << (painless_parser.INTEGER - 59)) | (1 << (painless_parser.DECIMAL - 59)) | (1 << (painless_parser.STRING - 59)) | (1 << (painless_parser.REGEX - 59)) | (1 << (painless_parser.TRUE - 59)) | (1 << (painless_parser.FALSE - 59)) | (1 << (painless_parser.NULL - 59)) | (1 << (painless_parser.PRIMITIVE - 59)) | (1 << (painless_parser.DEF - 59)) | (1 << (painless_parser.ID - 59)))) !== 0)) {
				{
				{
				this.state = 84;
				this.statement();
				}
				}
				this.state = 89;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			this.state = 90;
			this.match(painless_parser.EOF);
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
	public function(): FunctionContext {
		let _localctx: FunctionContext = new FunctionContext(this._ctx, this.state);
		this.enterRule(_localctx, 2, painless_parser.RULE_function);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 92;
			this.decltype();
			this.state = 93;
			this.match(painless_parser.ID);
			this.state = 94;
			this.parameters();
			this.state = 95;
			this.block();
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
	public parameters(): ParametersContext {
		let _localctx: ParametersContext = new ParametersContext(this._ctx, this.state);
		this.enterRule(_localctx, 4, painless_parser.RULE_parameters);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 97;
			this.match(painless_parser.LP);
			this.state = 109;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (((((_la - 82)) & ~0x1F) === 0 && ((1 << (_la - 82)) & ((1 << (painless_parser.PRIMITIVE - 82)) | (1 << (painless_parser.DEF - 82)) | (1 << (painless_parser.ID - 82)))) !== 0)) {
				{
				this.state = 98;
				this.decltype();
				this.state = 99;
				this.match(painless_parser.ID);
				this.state = 106;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la === painless_parser.COMMA) {
					{
					{
					this.state = 100;
					this.match(painless_parser.COMMA);
					this.state = 101;
					this.decltype();
					this.state = 102;
					this.match(painless_parser.ID);
					}
					}
					this.state = 108;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				}
			}

			this.state = 111;
			this.match(painless_parser.RP);
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
	public statement(): StatementContext {
		let _localctx: StatementContext = new StatementContext(this._ctx, this.state);
		this.enterRule(_localctx, 6, painless_parser.RULE_statement);
		let _la: number;
		try {
			this.state = 117;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case painless_parser.IF:
			case painless_parser.WHILE:
			case painless_parser.FOR:
			case painless_parser.TRY:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 113;
				this.rstatement();
				}
				break;
			case painless_parser.LBRACE:
			case painless_parser.LP:
			case painless_parser.DOLLAR:
			case painless_parser.DO:
			case painless_parser.CONTINUE:
			case painless_parser.BREAK:
			case painless_parser.RETURN:
			case painless_parser.NEW:
			case painless_parser.THROW:
			case painless_parser.BOOLNOT:
			case painless_parser.BWNOT:
			case painless_parser.ADD:
			case painless_parser.SUB:
			case painless_parser.INCR:
			case painless_parser.DECR:
			case painless_parser.OCTAL:
			case painless_parser.HEX:
			case painless_parser.INTEGER:
			case painless_parser.DECIMAL:
			case painless_parser.STRING:
			case painless_parser.REGEX:
			case painless_parser.TRUE:
			case painless_parser.FALSE:
			case painless_parser.NULL:
			case painless_parser.PRIMITIVE:
			case painless_parser.DEF:
			case painless_parser.ID:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 114;
				this.dstatement();
				this.state = 115;
				_la = this._input.LA(1);
				if (!(_la === painless_parser.EOF || _la === painless_parser.SEMICOLON)) {
				this._errHandler.recoverInline(this);
				} else {
					if (this._input.LA(1) === Token.EOF) {
						this.matchedEOF = true;
					}

					this._errHandler.reportMatch(this);
					this.consume();
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
	public rstatement(): RstatementContext {
		let _localctx: RstatementContext = new RstatementContext(this._ctx, this.state);
		this.enterRule(_localctx, 8, painless_parser.RULE_rstatement);
		let _la: number;
		try {
			let _alt: number;
			this.state = 179;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 12, this._ctx) ) {
			case 1:
				_localctx = new IfContext(_localctx);
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 119;
				this.match(painless_parser.IF);
				this.state = 120;
				this.match(painless_parser.LP);
				this.state = 121;
				this.expression();
				this.state = 122;
				this.match(painless_parser.RP);
				this.state = 123;
				this.trailer();
				this.state = 127;
				this._errHandler.sync(this);
				switch ( this.interpreter.adaptivePredict(this._input, 5, this._ctx) ) {
				case 1:
					{
					this.state = 124;
					this.match(painless_parser.ELSE);
					this.state = 125;
					this.trailer();
					}
					break;

				case 2:
					{
					this.state = 126;
					if (!( this._input.LA(1) != painless_parser.ELSE )) {
						throw new FailedPredicateException(this, " this._input.LA(1) != painless_parser.ELSE ");
					}
					}
					break;
				}
				}
				break;

			case 2:
				_localctx = new WhileContext(_localctx);
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 129;
				this.match(painless_parser.WHILE);
				this.state = 130;
				this.match(painless_parser.LP);
				this.state = 131;
				this.expression();
				this.state = 132;
				this.match(painless_parser.RP);
				this.state = 135;
				this._errHandler.sync(this);
				switch (this._input.LA(1)) {
				case painless_parser.LBRACK:
				case painless_parser.LBRACE:
				case painless_parser.LP:
				case painless_parser.DOLLAR:
				case painless_parser.IF:
				case painless_parser.WHILE:
				case painless_parser.DO:
				case painless_parser.FOR:
				case painless_parser.CONTINUE:
				case painless_parser.BREAK:
				case painless_parser.RETURN:
				case painless_parser.NEW:
				case painless_parser.TRY:
				case painless_parser.THROW:
				case painless_parser.BOOLNOT:
				case painless_parser.BWNOT:
				case painless_parser.ADD:
				case painless_parser.SUB:
				case painless_parser.INCR:
				case painless_parser.DECR:
				case painless_parser.OCTAL:
				case painless_parser.HEX:
				case painless_parser.INTEGER:
				case painless_parser.DECIMAL:
				case painless_parser.STRING:
				case painless_parser.REGEX:
				case painless_parser.TRUE:
				case painless_parser.FALSE:
				case painless_parser.NULL:
				case painless_parser.PRIMITIVE:
				case painless_parser.DEF:
				case painless_parser.ID:
					{
					this.state = 133;
					this.trailer();
					}
					break;
				case painless_parser.SEMICOLON:
					{
					this.state = 134;
					this.empty();
					}
					break;
				default:
					throw new NoViableAltException(this);
				}
				}
				break;

			case 3:
				_localctx = new ForContext(_localctx);
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 137;
				this.match(painless_parser.FOR);
				this.state = 138;
				this.match(painless_parser.LP);
				this.state = 140;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (((((_la - 5)) & ~0x1F) === 0 && ((1 << (_la - 5)) & ((1 << (painless_parser.LBRACE - 5)) | (1 << (painless_parser.LP - 5)) | (1 << (painless_parser.DOLLAR - 5)) | (1 << (painless_parser.NEW - 5)) | (1 << (painless_parser.BOOLNOT - 5)) | (1 << (painless_parser.BWNOT - 5)) | (1 << (painless_parser.ADD - 5)) | (1 << (painless_parser.SUB - 5)))) !== 0) || ((((_la - 59)) & ~0x1F) === 0 && ((1 << (_la - 59)) & ((1 << (painless_parser.INCR - 59)) | (1 << (painless_parser.DECR - 59)) | (1 << (painless_parser.OCTAL - 59)) | (1 << (painless_parser.HEX - 59)) | (1 << (painless_parser.INTEGER - 59)) | (1 << (painless_parser.DECIMAL - 59)) | (1 << (painless_parser.STRING - 59)) | (1 << (painless_parser.REGEX - 59)) | (1 << (painless_parser.TRUE - 59)) | (1 << (painless_parser.FALSE - 59)) | (1 << (painless_parser.NULL - 59)) | (1 << (painless_parser.PRIMITIVE - 59)) | (1 << (painless_parser.DEF - 59)) | (1 << (painless_parser.ID - 59)))) !== 0)) {
					{
					this.state = 139;
					this.initializer();
					}
				}

				this.state = 142;
				this.match(painless_parser.SEMICOLON);
				this.state = 144;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (((((_la - 5)) & ~0x1F) === 0 && ((1 << (_la - 5)) & ((1 << (painless_parser.LBRACE - 5)) | (1 << (painless_parser.LP - 5)) | (1 << (painless_parser.DOLLAR - 5)) | (1 << (painless_parser.NEW - 5)) | (1 << (painless_parser.BOOLNOT - 5)) | (1 << (painless_parser.BWNOT - 5)) | (1 << (painless_parser.ADD - 5)) | (1 << (painless_parser.SUB - 5)))) !== 0) || ((((_la - 59)) & ~0x1F) === 0 && ((1 << (_la - 59)) & ((1 << (painless_parser.INCR - 59)) | (1 << (painless_parser.DECR - 59)) | (1 << (painless_parser.OCTAL - 59)) | (1 << (painless_parser.HEX - 59)) | (1 << (painless_parser.INTEGER - 59)) | (1 << (painless_parser.DECIMAL - 59)) | (1 << (painless_parser.STRING - 59)) | (1 << (painless_parser.REGEX - 59)) | (1 << (painless_parser.TRUE - 59)) | (1 << (painless_parser.FALSE - 59)) | (1 << (painless_parser.NULL - 59)) | (1 << (painless_parser.ID - 59)))) !== 0)) {
					{
					this.state = 143;
					this.expression();
					}
				}

				this.state = 146;
				this.match(painless_parser.SEMICOLON);
				this.state = 148;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (((((_la - 5)) & ~0x1F) === 0 && ((1 << (_la - 5)) & ((1 << (painless_parser.LBRACE - 5)) | (1 << (painless_parser.LP - 5)) | (1 << (painless_parser.DOLLAR - 5)) | (1 << (painless_parser.NEW - 5)) | (1 << (painless_parser.BOOLNOT - 5)) | (1 << (painless_parser.BWNOT - 5)) | (1 << (painless_parser.ADD - 5)) | (1 << (painless_parser.SUB - 5)))) !== 0) || ((((_la - 59)) & ~0x1F) === 0 && ((1 << (_la - 59)) & ((1 << (painless_parser.INCR - 59)) | (1 << (painless_parser.DECR - 59)) | (1 << (painless_parser.OCTAL - 59)) | (1 << (painless_parser.HEX - 59)) | (1 << (painless_parser.INTEGER - 59)) | (1 << (painless_parser.DECIMAL - 59)) | (1 << (painless_parser.STRING - 59)) | (1 << (painless_parser.REGEX - 59)) | (1 << (painless_parser.TRUE - 59)) | (1 << (painless_parser.FALSE - 59)) | (1 << (painless_parser.NULL - 59)) | (1 << (painless_parser.ID - 59)))) !== 0)) {
					{
					this.state = 147;
					this.afterthought();
					}
				}

				this.state = 150;
				this.match(painless_parser.RP);
				this.state = 153;
				this._errHandler.sync(this);
				switch (this._input.LA(1)) {
				case painless_parser.LBRACK:
				case painless_parser.LBRACE:
				case painless_parser.LP:
				case painless_parser.DOLLAR:
				case painless_parser.IF:
				case painless_parser.WHILE:
				case painless_parser.DO:
				case painless_parser.FOR:
				case painless_parser.CONTINUE:
				case painless_parser.BREAK:
				case painless_parser.RETURN:
				case painless_parser.NEW:
				case painless_parser.TRY:
				case painless_parser.THROW:
				case painless_parser.BOOLNOT:
				case painless_parser.BWNOT:
				case painless_parser.ADD:
				case painless_parser.SUB:
				case painless_parser.INCR:
				case painless_parser.DECR:
				case painless_parser.OCTAL:
				case painless_parser.HEX:
				case painless_parser.INTEGER:
				case painless_parser.DECIMAL:
				case painless_parser.STRING:
				case painless_parser.REGEX:
				case painless_parser.TRUE:
				case painless_parser.FALSE:
				case painless_parser.NULL:
				case painless_parser.PRIMITIVE:
				case painless_parser.DEF:
				case painless_parser.ID:
					{
					this.state = 151;
					this.trailer();
					}
					break;
				case painless_parser.SEMICOLON:
					{
					this.state = 152;
					this.empty();
					}
					break;
				default:
					throw new NoViableAltException(this);
				}
				}
				break;

			case 4:
				_localctx = new EachContext(_localctx);
				this.enterOuterAlt(_localctx, 4);
				{
				this.state = 155;
				this.match(painless_parser.FOR);
				this.state = 156;
				this.match(painless_parser.LP);
				this.state = 157;
				this.decltype();
				this.state = 158;
				this.match(painless_parser.ID);
				this.state = 159;
				this.match(painless_parser.COLON);
				this.state = 160;
				this.expression();
				this.state = 161;
				this.match(painless_parser.RP);
				this.state = 162;
				this.trailer();
				}
				break;

			case 5:
				_localctx = new IneachContext(_localctx);
				this.enterOuterAlt(_localctx, 5);
				{
				this.state = 164;
				this.match(painless_parser.FOR);
				this.state = 165;
				this.match(painless_parser.LP);
				this.state = 166;
				this.match(painless_parser.ID);
				this.state = 167;
				this.match(painless_parser.IN);
				this.state = 168;
				this.expression();
				this.state = 169;
				this.match(painless_parser.RP);
				this.state = 170;
				this.trailer();
				}
				break;

			case 6:
				_localctx = new TryContext(_localctx);
				this.enterOuterAlt(_localctx, 6);
				{
				this.state = 172;
				this.match(painless_parser.TRY);
				this.state = 173;
				this.block();
				this.state = 175;
				this._errHandler.sync(this);
				_alt = 1;
				do {
					switch (_alt) {
					case 1:
						{
						{
						this.state = 174;
						this.trap();
						}
						}
						break;
					default:
						throw new NoViableAltException(this);
					}
					this.state = 177;
					this._errHandler.sync(this);
					_alt = this.interpreter.adaptivePredict(this._input, 11, this._ctx);
				} while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER);
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
	public dstatement(): DstatementContext {
		let _localctx: DstatementContext = new DstatementContext(this._ctx, this.state);
		this.enterRule(_localctx, 10, painless_parser.RULE_dstatement);
		let _la: number;
		try {
			this.state = 198;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 14, this._ctx) ) {
			case 1:
				_localctx = new DoContext(_localctx);
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 181;
				this.match(painless_parser.DO);
				this.state = 182;
				this.block();
				this.state = 183;
				this.match(painless_parser.WHILE);
				this.state = 184;
				this.match(painless_parser.LP);
				this.state = 185;
				this.expression();
				this.state = 186;
				this.match(painless_parser.RP);
				}
				break;

			case 2:
				_localctx = new DeclContext(_localctx);
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 188;
				this.declaration();
				}
				break;

			case 3:
				_localctx = new ContinueContext(_localctx);
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 189;
				this.match(painless_parser.CONTINUE);
				}
				break;

			case 4:
				_localctx = new BreakContext(_localctx);
				this.enterOuterAlt(_localctx, 4);
				{
				this.state = 190;
				this.match(painless_parser.BREAK);
				}
				break;

			case 5:
				_localctx = new ReturnContext(_localctx);
				this.enterOuterAlt(_localctx, 5);
				{
				this.state = 191;
				this.match(painless_parser.RETURN);
				this.state = 193;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (((((_la - 5)) & ~0x1F) === 0 && ((1 << (_la - 5)) & ((1 << (painless_parser.LBRACE - 5)) | (1 << (painless_parser.LP - 5)) | (1 << (painless_parser.DOLLAR - 5)) | (1 << (painless_parser.NEW - 5)) | (1 << (painless_parser.BOOLNOT - 5)) | (1 << (painless_parser.BWNOT - 5)) | (1 << (painless_parser.ADD - 5)) | (1 << (painless_parser.SUB - 5)))) !== 0) || ((((_la - 59)) & ~0x1F) === 0 && ((1 << (_la - 59)) & ((1 << (painless_parser.INCR - 59)) | (1 << (painless_parser.DECR - 59)) | (1 << (painless_parser.OCTAL - 59)) | (1 << (painless_parser.HEX - 59)) | (1 << (painless_parser.INTEGER - 59)) | (1 << (painless_parser.DECIMAL - 59)) | (1 << (painless_parser.STRING - 59)) | (1 << (painless_parser.REGEX - 59)) | (1 << (painless_parser.TRUE - 59)) | (1 << (painless_parser.FALSE - 59)) | (1 << (painless_parser.NULL - 59)) | (1 << (painless_parser.ID - 59)))) !== 0)) {
					{
					this.state = 192;
					this.expression();
					}
				}

				}
				break;

			case 6:
				_localctx = new ThrowContext(_localctx);
				this.enterOuterAlt(_localctx, 6);
				{
				this.state = 195;
				this.match(painless_parser.THROW);
				this.state = 196;
				this.expression();
				}
				break;

			case 7:
				_localctx = new ExprContext(_localctx);
				this.enterOuterAlt(_localctx, 7);
				{
				this.state = 197;
				this.expression();
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
	public trailer(): TrailerContext {
		let _localctx: TrailerContext = new TrailerContext(this._ctx, this.state);
		this.enterRule(_localctx, 12, painless_parser.RULE_trailer);
		try {
			this.state = 202;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case painless_parser.LBRACK:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 200;
				this.block();
				}
				break;
			case painless_parser.LBRACE:
			case painless_parser.LP:
			case painless_parser.DOLLAR:
			case painless_parser.IF:
			case painless_parser.WHILE:
			case painless_parser.DO:
			case painless_parser.FOR:
			case painless_parser.CONTINUE:
			case painless_parser.BREAK:
			case painless_parser.RETURN:
			case painless_parser.NEW:
			case painless_parser.TRY:
			case painless_parser.THROW:
			case painless_parser.BOOLNOT:
			case painless_parser.BWNOT:
			case painless_parser.ADD:
			case painless_parser.SUB:
			case painless_parser.INCR:
			case painless_parser.DECR:
			case painless_parser.OCTAL:
			case painless_parser.HEX:
			case painless_parser.INTEGER:
			case painless_parser.DECIMAL:
			case painless_parser.STRING:
			case painless_parser.REGEX:
			case painless_parser.TRUE:
			case painless_parser.FALSE:
			case painless_parser.NULL:
			case painless_parser.PRIMITIVE:
			case painless_parser.DEF:
			case painless_parser.ID:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 201;
				this.statement();
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
	public block(): BlockContext {
		let _localctx: BlockContext = new BlockContext(this._ctx, this.state);
		this.enterRule(_localctx, 14, painless_parser.RULE_block);
		let _la: number;
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 204;
			this.match(painless_parser.LBRACK);
			this.state = 208;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 16, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 205;
					this.statement();
					}
					}
				}
				this.state = 210;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 16, this._ctx);
			}
			this.state = 212;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (((((_la - 5)) & ~0x1F) === 0 && ((1 << (_la - 5)) & ((1 << (painless_parser.LBRACE - 5)) | (1 << (painless_parser.LP - 5)) | (1 << (painless_parser.DOLLAR - 5)) | (1 << (painless_parser.DO - 5)) | (1 << (painless_parser.CONTINUE - 5)) | (1 << (painless_parser.BREAK - 5)) | (1 << (painless_parser.RETURN - 5)) | (1 << (painless_parser.NEW - 5)) | (1 << (painless_parser.THROW - 5)) | (1 << (painless_parser.BOOLNOT - 5)) | (1 << (painless_parser.BWNOT - 5)) | (1 << (painless_parser.ADD - 5)) | (1 << (painless_parser.SUB - 5)))) !== 0) || ((((_la - 59)) & ~0x1F) === 0 && ((1 << (_la - 59)) & ((1 << (painless_parser.INCR - 59)) | (1 << (painless_parser.DECR - 59)) | (1 << (painless_parser.OCTAL - 59)) | (1 << (painless_parser.HEX - 59)) | (1 << (painless_parser.INTEGER - 59)) | (1 << (painless_parser.DECIMAL - 59)) | (1 << (painless_parser.STRING - 59)) | (1 << (painless_parser.REGEX - 59)) | (1 << (painless_parser.TRUE - 59)) | (1 << (painless_parser.FALSE - 59)) | (1 << (painless_parser.NULL - 59)) | (1 << (painless_parser.PRIMITIVE - 59)) | (1 << (painless_parser.DEF - 59)) | (1 << (painless_parser.ID - 59)))) !== 0)) {
				{
				this.state = 211;
				this.dstatement();
				}
			}

			this.state = 214;
			this.match(painless_parser.RBRACK);
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
	public empty(): EmptyContext {
		let _localctx: EmptyContext = new EmptyContext(this._ctx, this.state);
		this.enterRule(_localctx, 16, painless_parser.RULE_empty);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 216;
			this.match(painless_parser.SEMICOLON);
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
	public initializer(): InitializerContext {
		let _localctx: InitializerContext = new InitializerContext(this._ctx, this.state);
		this.enterRule(_localctx, 18, painless_parser.RULE_initializer);
		try {
			this.state = 220;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 18, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 218;
				this.declaration();
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 219;
				this.expression();
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
	public afterthought(): AfterthoughtContext {
		let _localctx: AfterthoughtContext = new AfterthoughtContext(this._ctx, this.state);
		this.enterRule(_localctx, 20, painless_parser.RULE_afterthought);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 222;
			this.expression();
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
	public declaration(): DeclarationContext {
		let _localctx: DeclarationContext = new DeclarationContext(this._ctx, this.state);
		this.enterRule(_localctx, 22, painless_parser.RULE_declaration);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 224;
			this.decltype();
			this.state = 225;
			this.declvar();
			this.state = 230;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la === painless_parser.COMMA) {
				{
				{
				this.state = 226;
				this.match(painless_parser.COMMA);
				this.state = 227;
				this.declvar();
				}
				}
				this.state = 232;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
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
	public decltype(): DecltypeContext {
		let _localctx: DecltypeContext = new DecltypeContext(this._ctx, this.state);
		this.enterRule(_localctx, 24, painless_parser.RULE_decltype);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 233;
			this.type();
			this.state = 238;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 20, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 234;
					this.match(painless_parser.LBRACE);
					this.state = 235;
					this.match(painless_parser.RBRACE);
					}
					}
				}
				this.state = 240;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 20, this._ctx);
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
	public type(): TypeContext {
		let _localctx: TypeContext = new TypeContext(this._ctx, this.state);
		this.enterRule(_localctx, 26, painless_parser.RULE_type);
		try {
			let _alt: number;
			this.state = 251;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case painless_parser.DEF:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 241;
				this.match(painless_parser.DEF);
				}
				break;
			case painless_parser.PRIMITIVE:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 242;
				this.match(painless_parser.PRIMITIVE);
				}
				break;
			case painless_parser.ID:
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 243;
				this.match(painless_parser.ID);
				this.state = 248;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 21, this._ctx);
				while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
					if (_alt === 1) {
						{
						{
						this.state = 244;
						this.match(painless_parser.DOT);
						this.state = 245;
						this.match(painless_parser.DOTID);
						}
						}
					}
					this.state = 250;
					this._errHandler.sync(this);
					_alt = this.interpreter.adaptivePredict(this._input, 21, this._ctx);
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
	public declvar(): DeclvarContext {
		let _localctx: DeclvarContext = new DeclvarContext(this._ctx, this.state);
		this.enterRule(_localctx, 28, painless_parser.RULE_declvar);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 253;
			this.match(painless_parser.ID);
			this.state = 256;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la === painless_parser.ASSIGN) {
				{
				this.state = 254;
				this.match(painless_parser.ASSIGN);
				this.state = 255;
				this.expression();
				}
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
	public trap(): TrapContext {
		let _localctx: TrapContext = new TrapContext(this._ctx, this.state);
		this.enterRule(_localctx, 30, painless_parser.RULE_trap);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 258;
			this.match(painless_parser.CATCH);
			this.state = 259;
			this.match(painless_parser.LP);
			this.state = 260;
			this.type();
			this.state = 261;
			this.match(painless_parser.ID);
			this.state = 262;
			this.match(painless_parser.RP);
			this.state = 263;
			this.block();
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

	public noncondexpression(): NoncondexpressionContext;
	public noncondexpression(_p: number): NoncondexpressionContext;
	// @RuleVersion(0)
	public noncondexpression(_p?: number): NoncondexpressionContext {
		if (_p === undefined) {
			_p = 0;
		}

		let _parentctx: ParserRuleContext = this._ctx;
		let _parentState: number = this.state;
		let _localctx: NoncondexpressionContext = new NoncondexpressionContext(this._ctx, _parentState);
		let _prevctx: NoncondexpressionContext = _localctx;
		let _startState: number = 32;
		this.enterRecursionRule(_localctx, 32, painless_parser.RULE_noncondexpression, _p);
		let _la: number;
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			{
			_localctx = new SingleContext(_localctx);
			this._ctx = _localctx;
			_prevctx = _localctx;

			this.state = 266;
			this.unary();
			}
			this._ctx._stop = this._input.tryLT(-1);
			this.state = 309;
			this._errHandler.sync(this);
			_alt = this.interpreter.adaptivePredict(this._input, 25, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					if (this._parseListeners != null) {
						this.triggerExitRuleEvent();
					}
					_prevctx = _localctx;
					{
					this.state = 307;
					this._errHandler.sync(this);
					switch ( this.interpreter.adaptivePredict(this._input, 24, this._ctx) ) {
					case 1:
						{
						_localctx = new BinaryContext(new NoncondexpressionContext(_parentctx, _parentState));
						this.pushNewRecursionContext(_localctx, _startState, painless_parser.RULE_noncondexpression);
						this.state = 268;
						if (!(this.precpred(this._ctx, 13))) {
							throw new FailedPredicateException(this, "this.precpred(this._ctx, 13)");
						}
						this.state = 269;
						_la = this._input.LA(1);
						if (!(((((_la - 31)) & ~0x1F) === 0 && ((1 << (_la - 31)) & ((1 << (painless_parser.MUL - 31)) | (1 << (painless_parser.DIV - 31)) | (1 << (painless_parser.REM - 31)))) !== 0))) {
						this._errHandler.recoverInline(this);
						} else {
							if (this._input.LA(1) === Token.EOF) {
								this.matchedEOF = true;
							}

							this._errHandler.reportMatch(this);
							this.consume();
						}
						this.state = 270;
						this.noncondexpression(14);
						}
						break;

					case 2:
						{
						_localctx = new BinaryContext(new NoncondexpressionContext(_parentctx, _parentState));
						this.pushNewRecursionContext(_localctx, _startState, painless_parser.RULE_noncondexpression);
						this.state = 271;
						if (!(this.precpred(this._ctx, 12))) {
							throw new FailedPredicateException(this, "this.precpred(this._ctx, 12)");
						}
						this.state = 272;
						_la = this._input.LA(1);
						if (!(_la === painless_parser.ADD || _la === painless_parser.SUB)) {
						this._errHandler.recoverInline(this);
						} else {
							if (this._input.LA(1) === Token.EOF) {
								this.matchedEOF = true;
							}

							this._errHandler.reportMatch(this);
							this.consume();
						}
						this.state = 273;
						this.noncondexpression(13);
						}
						break;

					case 3:
						{
						_localctx = new BinaryContext(new NoncondexpressionContext(_parentctx, _parentState));
						this.pushNewRecursionContext(_localctx, _startState, painless_parser.RULE_noncondexpression);
						this.state = 274;
						if (!(this.precpred(this._ctx, 11))) {
							throw new FailedPredicateException(this, "this.precpred(this._ctx, 11)");
						}
						this.state = 275;
						_la = this._input.LA(1);
						if (!(_la === painless_parser.FIND || _la === painless_parser.MATCH)) {
						this._errHandler.recoverInline(this);
						} else {
							if (this._input.LA(1) === Token.EOF) {
								this.matchedEOF = true;
							}

							this._errHandler.reportMatch(this);
							this.consume();
						}
						this.state = 276;
						this.noncondexpression(12);
						}
						break;

					case 4:
						{
						_localctx = new BinaryContext(new NoncondexpressionContext(_parentctx, _parentState));
						this.pushNewRecursionContext(_localctx, _startState, painless_parser.RULE_noncondexpression);
						this.state = 277;
						if (!(this.precpred(this._ctx, 10))) {
							throw new FailedPredicateException(this, "this.precpred(this._ctx, 10)");
						}
						this.state = 278;
						_la = this._input.LA(1);
						if (!(((((_la - 36)) & ~0x1F) === 0 && ((1 << (_la - 36)) & ((1 << (painless_parser.LSH - 36)) | (1 << (painless_parser.RSH - 36)) | (1 << (painless_parser.USH - 36)))) !== 0))) {
						this._errHandler.recoverInline(this);
						} else {
							if (this._input.LA(1) === Token.EOF) {
								this.matchedEOF = true;
							}

							this._errHandler.reportMatch(this);
							this.consume();
						}
						this.state = 279;
						this.noncondexpression(11);
						}
						break;

					case 5:
						{
						_localctx = new CompContext(new NoncondexpressionContext(_parentctx, _parentState));
						this.pushNewRecursionContext(_localctx, _startState, painless_parser.RULE_noncondexpression);
						this.state = 280;
						if (!(this.precpred(this._ctx, 9))) {
							throw new FailedPredicateException(this, "this.precpred(this._ctx, 9)");
						}
						this.state = 281;
						_la = this._input.LA(1);
						if (!(((((_la - 39)) & ~0x1F) === 0 && ((1 << (_la - 39)) & ((1 << (painless_parser.LT - 39)) | (1 << (painless_parser.LTE - 39)) | (1 << (painless_parser.GT - 39)) | (1 << (painless_parser.GTE - 39)))) !== 0))) {
						this._errHandler.recoverInline(this);
						} else {
							if (this._input.LA(1) === Token.EOF) {
								this.matchedEOF = true;
							}

							this._errHandler.reportMatch(this);
							this.consume();
						}
						this.state = 282;
						this.noncondexpression(10);
						}
						break;

					case 6:
						{
						_localctx = new CompContext(new NoncondexpressionContext(_parentctx, _parentState));
						this.pushNewRecursionContext(_localctx, _startState, painless_parser.RULE_noncondexpression);
						this.state = 283;
						if (!(this.precpred(this._ctx, 7))) {
							throw new FailedPredicateException(this, "this.precpred(this._ctx, 7)");
						}
						this.state = 284;
						_la = this._input.LA(1);
						if (!(((((_la - 43)) & ~0x1F) === 0 && ((1 << (_la - 43)) & ((1 << (painless_parser.EQ - 43)) | (1 << (painless_parser.EQR - 43)) | (1 << (painless_parser.NE - 43)) | (1 << (painless_parser.NER - 43)))) !== 0))) {
						this._errHandler.recoverInline(this);
						} else {
							if (this._input.LA(1) === Token.EOF) {
								this.matchedEOF = true;
							}

							this._errHandler.reportMatch(this);
							this.consume();
						}
						this.state = 285;
						this.noncondexpression(8);
						}
						break;

					case 7:
						{
						_localctx = new BinaryContext(new NoncondexpressionContext(_parentctx, _parentState));
						this.pushNewRecursionContext(_localctx, _startState, painless_parser.RULE_noncondexpression);
						this.state = 286;
						if (!(this.precpred(this._ctx, 6))) {
							throw new FailedPredicateException(this, "this.precpred(this._ctx, 6)");
						}
						this.state = 287;
						this.match(painless_parser.BWAND);
						this.state = 288;
						this.noncondexpression(7);
						}
						break;

					case 8:
						{
						_localctx = new BinaryContext(new NoncondexpressionContext(_parentctx, _parentState));
						this.pushNewRecursionContext(_localctx, _startState, painless_parser.RULE_noncondexpression);
						this.state = 289;
						if (!(this.precpred(this._ctx, 5))) {
							throw new FailedPredicateException(this, "this.precpred(this._ctx, 5)");
						}
						this.state = 290;
						this.match(painless_parser.XOR);
						this.state = 291;
						this.noncondexpression(6);
						}
						break;

					case 9:
						{
						_localctx = new BinaryContext(new NoncondexpressionContext(_parentctx, _parentState));
						this.pushNewRecursionContext(_localctx, _startState, painless_parser.RULE_noncondexpression);
						this.state = 292;
						if (!(this.precpred(this._ctx, 4))) {
							throw new FailedPredicateException(this, "this.precpred(this._ctx, 4)");
						}
						this.state = 293;
						this.match(painless_parser.BWOR);
						this.state = 294;
						this.noncondexpression(5);
						}
						break;

					case 10:
						{
						_localctx = new BoolContext(new NoncondexpressionContext(_parentctx, _parentState));
						this.pushNewRecursionContext(_localctx, _startState, painless_parser.RULE_noncondexpression);
						this.state = 295;
						if (!(this.precpred(this._ctx, 3))) {
							throw new FailedPredicateException(this, "this.precpred(this._ctx, 3)");
						}
						this.state = 296;
						this.match(painless_parser.BOOLAND);
						this.state = 297;
						this.noncondexpression(4);
						}
						break;

					case 11:
						{
						_localctx = new BoolContext(new NoncondexpressionContext(_parentctx, _parentState));
						this.pushNewRecursionContext(_localctx, _startState, painless_parser.RULE_noncondexpression);
						this.state = 298;
						if (!(this.precpred(this._ctx, 2))) {
							throw new FailedPredicateException(this, "this.precpred(this._ctx, 2)");
						}
						this.state = 299;
						this.match(painless_parser.BOOLOR);
						this.state = 300;
						this.noncondexpression(3);
						}
						break;

					case 12:
						{
						_localctx = new ElvisContext(new NoncondexpressionContext(_parentctx, _parentState));
						this.pushNewRecursionContext(_localctx, _startState, painless_parser.RULE_noncondexpression);
						this.state = 301;
						if (!(this.precpred(this._ctx, 1))) {
							throw new FailedPredicateException(this, "this.precpred(this._ctx, 1)");
						}
						this.state = 302;
						this.match(painless_parser.ELVIS);
						this.state = 303;
						this.noncondexpression(1);
						}
						break;

					case 13:
						{
						_localctx = new InstanceofContext(new NoncondexpressionContext(_parentctx, _parentState));
						this.pushNewRecursionContext(_localctx, _startState, painless_parser.RULE_noncondexpression);
						this.state = 304;
						if (!(this.precpred(this._ctx, 8))) {
							throw new FailedPredicateException(this, "this.precpred(this._ctx, 8)");
						}
						this.state = 305;
						this.match(painless_parser.INSTANCEOF);
						this.state = 306;
						this.decltype();
						}
						break;
					}
					}
				}
				this.state = 311;
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
			this.unrollRecursionContexts(_parentctx);
		}
		return _localctx;
	}
	// @RuleVersion(0)
	public expression(): ExpressionContext {
		let _localctx: ExpressionContext = new ExpressionContext(this._ctx, this.state);
		this.enterRule(_localctx, 34, painless_parser.RULE_expression);
		let _la: number;
		try {
			this.state = 323;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 26, this._ctx) ) {
			case 1:
				_localctx = new NonconditionalContext(_localctx);
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 312;
				this.noncondexpression(0);
				}
				break;

			case 2:
				_localctx = new ConditionalContext(_localctx);
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 313;
				this.noncondexpression(0);
				this.state = 314;
				this.match(painless_parser.COND);
				this.state = 315;
				this.expression();
				this.state = 316;
				this.match(painless_parser.COLON);
				this.state = 317;
				this.expression();
				}
				break;

			case 3:
				_localctx = new AssignmentContext(_localctx);
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 319;
				this.noncondexpression(0);
				this.state = 320;
				_la = this._input.LA(1);
				if (!(((((_la - 61)) & ~0x1F) === 0 && ((1 << (_la - 61)) & ((1 << (painless_parser.ASSIGN - 61)) | (1 << (painless_parser.AADD - 61)) | (1 << (painless_parser.ASUB - 61)) | (1 << (painless_parser.AMUL - 61)) | (1 << (painless_parser.ADIV - 61)) | (1 << (painless_parser.AREM - 61)) | (1 << (painless_parser.AAND - 61)) | (1 << (painless_parser.AXOR - 61)) | (1 << (painless_parser.AOR - 61)) | (1 << (painless_parser.ALSH - 61)) | (1 << (painless_parser.ARSH - 61)) | (1 << (painless_parser.AUSH - 61)))) !== 0))) {
				this._errHandler.recoverInline(this);
				} else {
					if (this._input.LA(1) === Token.EOF) {
						this.matchedEOF = true;
					}

					this._errHandler.reportMatch(this);
					this.consume();
				}
				this.state = 321;
				this.expression();
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
	public unary(): UnaryContext {
		let _localctx: UnaryContext = new UnaryContext(this._ctx, this.state);
		this.enterRule(_localctx, 36, painless_parser.RULE_unary);
		let _la: number;
		try {
			this.state = 330;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case painless_parser.INCR:
			case painless_parser.DECR:
				_localctx = new PreContext(_localctx);
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 325;
				_la = this._input.LA(1);
				if (!(_la === painless_parser.INCR || _la === painless_parser.DECR)) {
				this._errHandler.recoverInline(this);
				} else {
					if (this._input.LA(1) === Token.EOF) {
						this.matchedEOF = true;
					}

					this._errHandler.reportMatch(this);
					this.consume();
				}
				this.state = 326;
				this.chain();
				}
				break;
			case painless_parser.ADD:
			case painless_parser.SUB:
				_localctx = new AddsubContext(_localctx);
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 327;
				_la = this._input.LA(1);
				if (!(_la === painless_parser.ADD || _la === painless_parser.SUB)) {
				this._errHandler.recoverInline(this);
				} else {
					if (this._input.LA(1) === Token.EOF) {
						this.matchedEOF = true;
					}

					this._errHandler.reportMatch(this);
					this.consume();
				}
				this.state = 328;
				this.unary();
				}
				break;
			case painless_parser.LBRACE:
			case painless_parser.LP:
			case painless_parser.DOLLAR:
			case painless_parser.NEW:
			case painless_parser.BOOLNOT:
			case painless_parser.BWNOT:
			case painless_parser.OCTAL:
			case painless_parser.HEX:
			case painless_parser.INTEGER:
			case painless_parser.DECIMAL:
			case painless_parser.STRING:
			case painless_parser.REGEX:
			case painless_parser.TRUE:
			case painless_parser.FALSE:
			case painless_parser.NULL:
			case painless_parser.ID:
				_localctx = new NotaddsubContext(_localctx);
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 329;
				this.unarynotaddsub();
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
	public unarynotaddsub(): UnarynotaddsubContext {
		let _localctx: UnarynotaddsubContext = new UnarynotaddsubContext(this._ctx, this.state);
		this.enterRule(_localctx, 38, painless_parser.RULE_unarynotaddsub);
		let _la: number;
		try {
			this.state = 339;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 28, this._ctx) ) {
			case 1:
				_localctx = new ReadContext(_localctx);
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 332;
				this.chain();
				}
				break;

			case 2:
				_localctx = new PostContext(_localctx);
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 333;
				this.chain();
				this.state = 334;
				_la = this._input.LA(1);
				if (!(_la === painless_parser.INCR || _la === painless_parser.DECR)) {
				this._errHandler.recoverInline(this);
				} else {
					if (this._input.LA(1) === Token.EOF) {
						this.matchedEOF = true;
					}

					this._errHandler.reportMatch(this);
					this.consume();
				}
				}
				break;

			case 3:
				_localctx = new NotContext(_localctx);
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 336;
				_la = this._input.LA(1);
				if (!(_la === painless_parser.BOOLNOT || _la === painless_parser.BWNOT)) {
				this._errHandler.recoverInline(this);
				} else {
					if (this._input.LA(1) === Token.EOF) {
						this.matchedEOF = true;
					}

					this._errHandler.reportMatch(this);
					this.consume();
				}
				this.state = 337;
				this.unary();
				}
				break;

			case 4:
				_localctx = new CastContext(_localctx);
				this.enterOuterAlt(_localctx, 4);
				{
				this.state = 338;
				this.castexpression();
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
	public castexpression(): CastexpressionContext {
		let _localctx: CastexpressionContext = new CastexpressionContext(this._ctx, this.state);
		this.enterRule(_localctx, 40, painless_parser.RULE_castexpression);
		try {
			this.state = 351;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 29, this._ctx) ) {
			case 1:
				_localctx = new PrimordefcastContext(_localctx);
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 341;
				this.match(painless_parser.LP);
				this.state = 342;
				this.primordefcasttype();
				this.state = 343;
				this.match(painless_parser.RP);
				this.state = 344;
				this.unary();
				}
				break;

			case 2:
				_localctx = new RefcastContext(_localctx);
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 346;
				this.match(painless_parser.LP);
				this.state = 347;
				this.refcasttype();
				this.state = 348;
				this.match(painless_parser.RP);
				this.state = 349;
				this.unarynotaddsub();
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
	public primordefcasttype(): PrimordefcasttypeContext {
		let _localctx: PrimordefcasttypeContext = new PrimordefcasttypeContext(this._ctx, this.state);
		this.enterRule(_localctx, 42, painless_parser.RULE_primordefcasttype);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 353;
			_la = this._input.LA(1);
			if (!(_la === painless_parser.PRIMITIVE || _la === painless_parser.DEF)) {
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
	public refcasttype(): RefcasttypeContext {
		let _localctx: RefcasttypeContext = new RefcasttypeContext(this._ctx, this.state);
		this.enterRule(_localctx, 44, painless_parser.RULE_refcasttype);
		let _la: number;
		try {
			this.state = 384;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case painless_parser.DEF:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 355;
				this.match(painless_parser.DEF);
				this.state = 358;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				do {
					{
					{
					this.state = 356;
					this.match(painless_parser.LBRACE);
					this.state = 357;
					this.match(painless_parser.RBRACE);
					}
					}
					this.state = 360;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				} while (_la === painless_parser.LBRACE);
				}
				break;
			case painless_parser.PRIMITIVE:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 362;
				this.match(painless_parser.PRIMITIVE);
				this.state = 365;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				do {
					{
					{
					this.state = 363;
					this.match(painless_parser.LBRACE);
					this.state = 364;
					this.match(painless_parser.RBRACE);
					}
					}
					this.state = 367;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				} while (_la === painless_parser.LBRACE);
				}
				break;
			case painless_parser.ID:
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 369;
				this.match(painless_parser.ID);
				this.state = 374;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la === painless_parser.DOT) {
					{
					{
					this.state = 370;
					this.match(painless_parser.DOT);
					this.state = 371;
					this.match(painless_parser.DOTID);
					}
					}
					this.state = 376;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 381;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la === painless_parser.LBRACE) {
					{
					{
					this.state = 377;
					this.match(painless_parser.LBRACE);
					this.state = 378;
					this.match(painless_parser.RBRACE);
					}
					}
					this.state = 383;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
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
	public chain(): ChainContext {
		let _localctx: ChainContext = new ChainContext(this._ctx, this.state);
		this.enterRule(_localctx, 46, painless_parser.RULE_chain);
		try {
			let _alt: number;
			this.state = 394;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 36, this._ctx) ) {
			case 1:
				_localctx = new DynamicContext(_localctx);
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 386;
				this.primary();
				this.state = 390;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 35, this._ctx);
				while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
					if (_alt === 1) {
						{
						{
						this.state = 387;
						this.postfix();
						}
						}
					}
					this.state = 392;
					this._errHandler.sync(this);
					_alt = this.interpreter.adaptivePredict(this._input, 35, this._ctx);
				}
				}
				break;

			case 2:
				_localctx = new NewarrayContext(_localctx);
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 393;
				this.arrayinitializer();
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
	public primary(): PrimaryContext {
		let _localctx: PrimaryContext = new PrimaryContext(this._ctx, this.state);
		this.enterRule(_localctx, 48, painless_parser.RULE_primary);
		let _la: number;
		try {
			this.state = 415;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 37, this._ctx) ) {
			case 1:
				_localctx = new PrecedenceContext(_localctx);
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 396;
				this.match(painless_parser.LP);
				this.state = 397;
				this.expression();
				this.state = 398;
				this.match(painless_parser.RP);
				}
				break;

			case 2:
				_localctx = new NumericContext(_localctx);
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 400;
				_la = this._input.LA(1);
				if (!(((((_la - 73)) & ~0x1F) === 0 && ((1 << (_la - 73)) & ((1 << (painless_parser.OCTAL - 73)) | (1 << (painless_parser.HEX - 73)) | (1 << (painless_parser.INTEGER - 73)) | (1 << (painless_parser.DECIMAL - 73)))) !== 0))) {
				this._errHandler.recoverInline(this);
				} else {
					if (this._input.LA(1) === Token.EOF) {
						this.matchedEOF = true;
					}

					this._errHandler.reportMatch(this);
					this.consume();
				}
				}
				break;

			case 3:
				_localctx = new TrueContext(_localctx);
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 401;
				this.match(painless_parser.TRUE);
				}
				break;

			case 4:
				_localctx = new FalseContext(_localctx);
				this.enterOuterAlt(_localctx, 4);
				{
				this.state = 402;
				this.match(painless_parser.FALSE);
				}
				break;

			case 5:
				_localctx = new NullContext(_localctx);
				this.enterOuterAlt(_localctx, 5);
				{
				this.state = 403;
				this.match(painless_parser.NULL);
				}
				break;

			case 6:
				_localctx = new StringContext(_localctx);
				this.enterOuterAlt(_localctx, 6);
				{
				this.state = 404;
				this.match(painless_parser.STRING);
				}
				break;

			case 7:
				_localctx = new RegexContext(_localctx);
				this.enterOuterAlt(_localctx, 7);
				{
				this.state = 405;
				this.match(painless_parser.REGEX);
				}
				break;

			case 8:
				_localctx = new ListinitContext(_localctx);
				this.enterOuterAlt(_localctx, 8);
				{
				this.state = 406;
				this.listinitializer();
				}
				break;

			case 9:
				_localctx = new MapinitContext(_localctx);
				this.enterOuterAlt(_localctx, 9);
				{
				this.state = 407;
				this.mapinitializer();
				}
				break;

			case 10:
				_localctx = new VariableContext(_localctx);
				this.enterOuterAlt(_localctx, 10);
				{
				this.state = 408;
				this.match(painless_parser.ID);
				}
				break;

			case 11:
				_localctx = new CalllocalContext(_localctx);
				this.enterOuterAlt(_localctx, 11);
				{
				this.state = 409;
				_la = this._input.LA(1);
				if (!(_la === painless_parser.DOLLAR || _la === painless_parser.ID)) {
				this._errHandler.recoverInline(this);
				} else {
					if (this._input.LA(1) === Token.EOF) {
						this.matchedEOF = true;
					}

					this._errHandler.reportMatch(this);
					this.consume();
				}
				this.state = 410;
				this.arguments();
				}
				break;

			case 12:
				_localctx = new NewobjectContext(_localctx);
				this.enterOuterAlt(_localctx, 12);
				{
				this.state = 411;
				this.match(painless_parser.NEW);
				this.state = 412;
				this.type();
				this.state = 413;
				this.arguments();
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
	public postfix(): PostfixContext {
		let _localctx: PostfixContext = new PostfixContext(this._ctx, this.state);
		this.enterRule(_localctx, 50, painless_parser.RULE_postfix);
		try {
			this.state = 420;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 38, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 417;
				this.callinvoke();
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 418;
				this.fieldaccess();
				}
				break;

			case 3:
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 419;
				this.braceaccess();
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
	public postdot(): PostdotContext {
		let _localctx: PostdotContext = new PostdotContext(this._ctx, this.state);
		this.enterRule(_localctx, 52, painless_parser.RULE_postdot);
		try {
			this.state = 424;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 39, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 422;
				this.callinvoke();
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 423;
				this.fieldaccess();
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
	public callinvoke(): CallinvokeContext {
		let _localctx: CallinvokeContext = new CallinvokeContext(this._ctx, this.state);
		this.enterRule(_localctx, 54, painless_parser.RULE_callinvoke);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 426;
			_la = this._input.LA(1);
			if (!(_la === painless_parser.DOT || _la === painless_parser.NSDOT)) {
			this._errHandler.recoverInline(this);
			} else {
				if (this._input.LA(1) === Token.EOF) {
					this.matchedEOF = true;
				}

				this._errHandler.reportMatch(this);
				this.consume();
			}
			this.state = 427;
			this.match(painless_parser.DOTID);
			this.state = 428;
			this.arguments();
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
	public fieldaccess(): FieldaccessContext {
		let _localctx: FieldaccessContext = new FieldaccessContext(this._ctx, this.state);
		this.enterRule(_localctx, 56, painless_parser.RULE_fieldaccess);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 430;
			_la = this._input.LA(1);
			if (!(_la === painless_parser.DOT || _la === painless_parser.NSDOT)) {
			this._errHandler.recoverInline(this);
			} else {
				if (this._input.LA(1) === Token.EOF) {
					this.matchedEOF = true;
				}

				this._errHandler.reportMatch(this);
				this.consume();
			}
			this.state = 431;
			_la = this._input.LA(1);
			if (!(_la === painless_parser.DOTINTEGER || _la === painless_parser.DOTID)) {
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
	public braceaccess(): BraceaccessContext {
		let _localctx: BraceaccessContext = new BraceaccessContext(this._ctx, this.state);
		this.enterRule(_localctx, 58, painless_parser.RULE_braceaccess);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 433;
			this.match(painless_parser.LBRACE);
			this.state = 434;
			this.expression();
			this.state = 435;
			this.match(painless_parser.RBRACE);
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
	public arrayinitializer(): ArrayinitializerContext {
		let _localctx: ArrayinitializerContext = new ArrayinitializerContext(this._ctx, this.state);
		this.enterRule(_localctx, 60, painless_parser.RULE_arrayinitializer);
		let _la: number;
		try {
			let _alt: number;
			this.state = 478;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 46, this._ctx) ) {
			case 1:
				_localctx = new NewstandardarrayContext(_localctx);
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 437;
				this.match(painless_parser.NEW);
				this.state = 438;
				this.type();
				this.state = 443;
				this._errHandler.sync(this);
				_alt = 1;
				do {
					switch (_alt) {
					case 1:
						{
						{
						this.state = 439;
						this.match(painless_parser.LBRACE);
						this.state = 440;
						this.expression();
						this.state = 441;
						this.match(painless_parser.RBRACE);
						}
						}
						break;
					default:
						throw new NoViableAltException(this);
					}
					this.state = 445;
					this._errHandler.sync(this);
					_alt = this.interpreter.adaptivePredict(this._input, 40, this._ctx);
				} while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER);
				this.state = 454;
				this._errHandler.sync(this);
				switch ( this.interpreter.adaptivePredict(this._input, 42, this._ctx) ) {
				case 1:
					{
					this.state = 447;
					this.postdot();
					this.state = 451;
					this._errHandler.sync(this);
					_alt = this.interpreter.adaptivePredict(this._input, 41, this._ctx);
					while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
						if (_alt === 1) {
							{
							{
							this.state = 448;
							this.postfix();
							}
							}
						}
						this.state = 453;
						this._errHandler.sync(this);
						_alt = this.interpreter.adaptivePredict(this._input, 41, this._ctx);
					}
					}
					break;
				}
				}
				break;

			case 2:
				_localctx = new NewinitializedarrayContext(_localctx);
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 456;
				this.match(painless_parser.NEW);
				this.state = 457;
				this.type();
				this.state = 458;
				this.match(painless_parser.LBRACE);
				this.state = 459;
				this.match(painless_parser.RBRACE);
				this.state = 460;
				this.match(painless_parser.LBRACK);
				this.state = 469;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (((((_la - 5)) & ~0x1F) === 0 && ((1 << (_la - 5)) & ((1 << (painless_parser.LBRACE - 5)) | (1 << (painless_parser.LP - 5)) | (1 << (painless_parser.DOLLAR - 5)) | (1 << (painless_parser.NEW - 5)) | (1 << (painless_parser.BOOLNOT - 5)) | (1 << (painless_parser.BWNOT - 5)) | (1 << (painless_parser.ADD - 5)) | (1 << (painless_parser.SUB - 5)))) !== 0) || ((((_la - 59)) & ~0x1F) === 0 && ((1 << (_la - 59)) & ((1 << (painless_parser.INCR - 59)) | (1 << (painless_parser.DECR - 59)) | (1 << (painless_parser.OCTAL - 59)) | (1 << (painless_parser.HEX - 59)) | (1 << (painless_parser.INTEGER - 59)) | (1 << (painless_parser.DECIMAL - 59)) | (1 << (painless_parser.STRING - 59)) | (1 << (painless_parser.REGEX - 59)) | (1 << (painless_parser.TRUE - 59)) | (1 << (painless_parser.FALSE - 59)) | (1 << (painless_parser.NULL - 59)) | (1 << (painless_parser.ID - 59)))) !== 0)) {
					{
					this.state = 461;
					this.expression();
					this.state = 466;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
					while (_la === painless_parser.COMMA) {
						{
						{
						this.state = 462;
						this.match(painless_parser.COMMA);
						this.state = 463;
						this.expression();
						}
						}
						this.state = 468;
						this._errHandler.sync(this);
						_la = this._input.LA(1);
					}
					}
				}

				this.state = 471;
				this.match(painless_parser.RBRACK);
				this.state = 475;
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input, 45, this._ctx);
				while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
					if (_alt === 1) {
						{
						{
						this.state = 472;
						this.postfix();
						}
						}
					}
					this.state = 477;
					this._errHandler.sync(this);
					_alt = this.interpreter.adaptivePredict(this._input, 45, this._ctx);
				}
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
	public listinitializer(): ListinitializerContext {
		let _localctx: ListinitializerContext = new ListinitializerContext(this._ctx, this.state);
		this.enterRule(_localctx, 62, painless_parser.RULE_listinitializer);
		let _la: number;
		try {
			this.state = 493;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 48, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 480;
				this.match(painless_parser.LBRACE);
				this.state = 481;
				this.expression();
				this.state = 486;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la === painless_parser.COMMA) {
					{
					{
					this.state = 482;
					this.match(painless_parser.COMMA);
					this.state = 483;
					this.expression();
					}
					}
					this.state = 488;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 489;
				this.match(painless_parser.RBRACE);
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 491;
				this.match(painless_parser.LBRACE);
				this.state = 492;
				this.match(painless_parser.RBRACE);
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
	public mapinitializer(): MapinitializerContext {
		let _localctx: MapinitializerContext = new MapinitializerContext(this._ctx, this.state);
		this.enterRule(_localctx, 64, painless_parser.RULE_mapinitializer);
		let _la: number;
		try {
			this.state = 509;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 50, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 495;
				this.match(painless_parser.LBRACE);
				this.state = 496;
				this.maptoken();
				this.state = 501;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la === painless_parser.COMMA) {
					{
					{
					this.state = 497;
					this.match(painless_parser.COMMA);
					this.state = 498;
					this.maptoken();
					}
					}
					this.state = 503;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 504;
				this.match(painless_parser.RBRACE);
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 506;
				this.match(painless_parser.LBRACE);
				this.state = 507;
				this.match(painless_parser.COLON);
				this.state = 508;
				this.match(painless_parser.RBRACE);
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
	public maptoken(): MaptokenContext {
		let _localctx: MaptokenContext = new MaptokenContext(this._ctx, this.state);
		this.enterRule(_localctx, 66, painless_parser.RULE_maptoken);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 511;
			this.expression();
			this.state = 512;
			this.match(painless_parser.COLON);
			this.state = 513;
			this.expression();
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
	public arguments(): ArgumentsContext {
		let _localctx: ArgumentsContext = new ArgumentsContext(this._ctx, this.state);
		this.enterRule(_localctx, 68, painless_parser.RULE_arguments);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			{
			this.state = 515;
			this.match(painless_parser.LP);
			this.state = 524;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (((((_la - 5)) & ~0x1F) === 0 && ((1 << (_la - 5)) & ((1 << (painless_parser.LBRACE - 5)) | (1 << (painless_parser.LP - 5)) | (1 << (painless_parser.DOLLAR - 5)) | (1 << (painless_parser.NEW - 5)) | (1 << (painless_parser.THIS - 5)) | (1 << (painless_parser.BOOLNOT - 5)) | (1 << (painless_parser.BWNOT - 5)) | (1 << (painless_parser.ADD - 5)) | (1 << (painless_parser.SUB - 5)))) !== 0) || ((((_la - 59)) & ~0x1F) === 0 && ((1 << (_la - 59)) & ((1 << (painless_parser.INCR - 59)) | (1 << (painless_parser.DECR - 59)) | (1 << (painless_parser.OCTAL - 59)) | (1 << (painless_parser.HEX - 59)) | (1 << (painless_parser.INTEGER - 59)) | (1 << (painless_parser.DECIMAL - 59)) | (1 << (painless_parser.STRING - 59)) | (1 << (painless_parser.REGEX - 59)) | (1 << (painless_parser.TRUE - 59)) | (1 << (painless_parser.FALSE - 59)) | (1 << (painless_parser.NULL - 59)) | (1 << (painless_parser.PRIMITIVE - 59)) | (1 << (painless_parser.DEF - 59)) | (1 << (painless_parser.ID - 59)))) !== 0)) {
				{
				this.state = 516;
				this.argument();
				this.state = 521;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la === painless_parser.COMMA) {
					{
					{
					this.state = 517;
					this.match(painless_parser.COMMA);
					this.state = 518;
					this.argument();
					}
					}
					this.state = 523;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				}
			}

			this.state = 526;
			this.match(painless_parser.RP);
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
	public argument(): ArgumentContext {
		let _localctx: ArgumentContext = new ArgumentContext(this._ctx, this.state);
		this.enterRule(_localctx, 70, painless_parser.RULE_argument);
		try {
			this.state = 531;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 53, this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 528;
				this.expression();
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 529;
				this.lambda();
				}
				break;

			case 3:
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 530;
				this.funcref();
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
	public lambda(): LambdaContext {
		let _localctx: LambdaContext = new LambdaContext(this._ctx, this.state);
		this.enterRule(_localctx, 72, painless_parser.RULE_lambda);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 546;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case painless_parser.PRIMITIVE:
			case painless_parser.DEF:
			case painless_parser.ID:
				{
				this.state = 533;
				this.lamtype();
				}
				break;
			case painless_parser.LP:
				{
				this.state = 534;
				this.match(painless_parser.LP);
				this.state = 543;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (((((_la - 82)) & ~0x1F) === 0 && ((1 << (_la - 82)) & ((1 << (painless_parser.PRIMITIVE - 82)) | (1 << (painless_parser.DEF - 82)) | (1 << (painless_parser.ID - 82)))) !== 0)) {
					{
					this.state = 535;
					this.lamtype();
					this.state = 540;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
					while (_la === painless_parser.COMMA) {
						{
						{
						this.state = 536;
						this.match(painless_parser.COMMA);
						this.state = 537;
						this.lamtype();
						}
						}
						this.state = 542;
						this._errHandler.sync(this);
						_la = this._input.LA(1);
					}
					}
				}

				this.state = 545;
				this.match(painless_parser.RP);
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
			this.state = 548;
			this.match(painless_parser.ARROW);
			this.state = 551;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case painless_parser.LBRACK:
				{
				this.state = 549;
				this.block();
				}
				break;
			case painless_parser.LBRACE:
			case painless_parser.LP:
			case painless_parser.DOLLAR:
			case painless_parser.NEW:
			case painless_parser.BOOLNOT:
			case painless_parser.BWNOT:
			case painless_parser.ADD:
			case painless_parser.SUB:
			case painless_parser.INCR:
			case painless_parser.DECR:
			case painless_parser.OCTAL:
			case painless_parser.HEX:
			case painless_parser.INTEGER:
			case painless_parser.DECIMAL:
			case painless_parser.STRING:
			case painless_parser.REGEX:
			case painless_parser.TRUE:
			case painless_parser.FALSE:
			case painless_parser.NULL:
			case painless_parser.ID:
				{
				this.state = 550;
				this.expression();
				}
				break;
			default:
				throw new NoViableAltException(this);
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
	public lamtype(): LamtypeContext {
		let _localctx: LamtypeContext = new LamtypeContext(this._ctx, this.state);
		this.enterRule(_localctx, 74, painless_parser.RULE_lamtype);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 554;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 58, this._ctx) ) {
			case 1:
				{
				this.state = 553;
				this.decltype();
				}
				break;
			}
			this.state = 556;
			this.match(painless_parser.ID);
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
	public funcref(): FuncrefContext {
		let _localctx: FuncrefContext = new FuncrefContext(this._ctx, this.state);
		this.enterRule(_localctx, 76, painless_parser.RULE_funcref);
		try {
			this.state = 569;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input, 59, this._ctx) ) {
			case 1:
				_localctx = new ClassfuncrefContext(_localctx);
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 558;
				this.decltype();
				this.state = 559;
				this.match(painless_parser.REF);
				this.state = 560;
				this.match(painless_parser.ID);
				}
				break;

			case 2:
				_localctx = new ConstructorfuncrefContext(_localctx);
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 562;
				this.decltype();
				this.state = 563;
				this.match(painless_parser.REF);
				this.state = 564;
				this.match(painless_parser.NEW);
				}
				break;

			case 3:
				_localctx = new LocalfuncrefContext(_localctx);
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 566;
				this.match(painless_parser.THIS);
				this.state = 567;
				this.match(painless_parser.REF);
				this.state = 568;
				this.match(painless_parser.ID);
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
		case 4:
			return this.rstatement_sempred(_localctx as RstatementContext, predIndex);

		case 16:
			return this.noncondexpression_sempred(_localctx as NoncondexpressionContext, predIndex);
		}
		return true;
	}
	private rstatement_sempred(_localctx: RstatementContext, predIndex: number): boolean {
		switch (predIndex) {
		case 0:
			return  this._input.LA(1) != painless_parser.ELSE ;
		}
		return true;
	}
	private noncondexpression_sempred(_localctx: NoncondexpressionContext, predIndex: number): boolean {
		switch (predIndex) {
		case 1:
			return this.precpred(this._ctx, 13);

		case 2:
			return this.precpred(this._ctx, 12);

		case 3:
			return this.precpred(this._ctx, 11);

		case 4:
			return this.precpred(this._ctx, 10);

		case 5:
			return this.precpred(this._ctx, 9);

		case 6:
			return this.precpred(this._ctx, 7);

		case 7:
			return this.precpred(this._ctx, 6);

		case 8:
			return this.precpred(this._ctx, 5);

		case 9:
			return this.precpred(this._ctx, 4);

		case 10:
			return this.precpred(this._ctx, 3);

		case 11:
			return this.precpred(this._ctx, 2);

		case 12:
			return this.precpred(this._ctx, 1);

		case 13:
			return this.precpred(this._ctx, 8);
		}
		return true;
	}

	private static readonly _serializedATNSegments: number = 2;
	private static readonly _serializedATNSegment0: string =
		"\x03\uC91D\uCABA\u058D\uAFBA\u4F53\u0607\uEA8B\uC241\x03X\u023E\x04\x02" +
		"\t\x02\x04\x03\t\x03\x04\x04\t\x04\x04\x05\t\x05\x04\x06\t\x06\x04\x07" +
		"\t\x07\x04\b\t\b\x04\t\t\t\x04\n\t\n\x04\v\t\v\x04\f\t\f\x04\r\t\r\x04" +
		"\x0E\t\x0E\x04\x0F\t\x0F\x04\x10\t\x10\x04\x11\t\x11\x04\x12\t\x12\x04" +
		"\x13\t\x13\x04\x14\t\x14\x04\x15\t\x15\x04\x16\t\x16\x04\x17\t\x17\x04" +
		"\x18\t\x18\x04\x19\t\x19\x04\x1A\t\x1A\x04\x1B\t\x1B\x04\x1C\t\x1C\x04" +
		"\x1D\t\x1D\x04\x1E\t\x1E\x04\x1F\t\x1F\x04 \t \x04!\t!\x04\"\t\"\x04#" +
		"\t#\x04$\t$\x04%\t%\x04&\t&\x04\'\t\'\x04(\t(\x03\x02\x07\x02R\n\x02\f" +
		"\x02\x0E\x02U\v\x02\x03\x02\x07\x02X\n\x02\f\x02\x0E\x02[\v\x02\x03\x02" +
		"\x03\x02\x03\x03\x03\x03\x03\x03\x03\x03\x03\x03\x03\x04\x03\x04\x03\x04" +
		"\x03\x04\x03\x04\x03\x04\x03\x04\x07\x04k\n\x04\f\x04\x0E\x04n\v\x04\x05" +
		"\x04p\n\x04\x03\x04\x03\x04\x03\x05\x03\x05\x03\x05\x03\x05\x05\x05x\n" +
		"\x05\x03\x06\x03\x06\x03\x06\x03\x06\x03\x06\x03\x06\x03\x06\x03\x06\x05" +
		"\x06\x82\n\x06\x03\x06\x03\x06\x03\x06\x03\x06\x03\x06\x03\x06\x05\x06" +
		"\x8A\n\x06\x03\x06\x03\x06\x03\x06\x05\x06\x8F\n\x06\x03\x06\x03\x06\x05" +
		"\x06\x93\n\x06\x03\x06\x03\x06\x05\x06\x97\n\x06\x03\x06\x03\x06\x03\x06" +
		"\x05\x06\x9C\n\x06\x03\x06\x03\x06\x03\x06\x03\x06\x03\x06\x03\x06\x03" +
		"\x06\x03\x06\x03\x06\x03\x06\x03\x06\x03\x06\x03\x06\x03\x06\x03\x06\x03" +
		"\x06\x03\x06\x03\x06\x03\x06\x03\x06\x06\x06\xB2\n\x06\r\x06\x0E\x06\xB3" +
		"\x05\x06\xB6\n\x06\x03\x07\x03\x07\x03\x07\x03\x07\x03\x07\x03\x07\x03" +
		"\x07\x03\x07\x03\x07\x03\x07\x03\x07\x03\x07\x05\x07\xC4\n\x07\x03\x07" +
		"\x03\x07\x03\x07\x05\x07\xC9\n\x07\x03\b\x03\b\x05\b\xCD\n\b\x03\t\x03" +
		"\t\x07\t\xD1\n\t\f\t\x0E\t\xD4\v\t\x03\t\x05\t\xD7\n\t\x03\t\x03\t\x03" +
		"\n\x03\n\x03\v\x03\v\x05\v\xDF\n\v\x03\f\x03\f\x03\r\x03\r\x03\r\x03\r" +
		"\x07\r\xE7\n\r\f\r\x0E\r\xEA\v\r\x03\x0E\x03\x0E\x03\x0E\x07\x0E\xEF\n" +
		"\x0E\f\x0E\x0E\x0E\xF2\v\x0E\x03\x0F\x03\x0F\x03\x0F\x03\x0F\x03\x0F\x07" +
		"\x0F\xF9\n\x0F\f\x0F\x0E\x0F\xFC\v\x0F\x05\x0F\xFE\n\x0F\x03\x10\x03\x10" +
		"\x03\x10\x05\x10\u0103\n\x10\x03\x11\x03\x11\x03\x11\x03\x11\x03\x11\x03" +
		"\x11\x03\x11\x03\x12\x03\x12\x03\x12\x03\x12\x03\x12\x03\x12\x03\x12\x03" +
		"\x12\x03\x12\x03\x12\x03\x12\x03\x12\x03\x12\x03\x12\x03\x12\x03\x12\x03" +
		"\x12\x03\x12\x03\x12\x03\x12\x03\x12\x03\x12\x03\x12\x03\x12\x03\x12\x03" +
		"\x12\x03\x12\x03\x12\x03\x12\x03\x12\x03\x12\x03\x12\x03\x12\x03\x12\x03" +
		"\x12\x03\x12\x03\x12\x03\x12\x03\x12\x03\x12\x03\x12\x03\x12\x07\x12\u0136" +
		"\n\x12\f\x12\x0E\x12\u0139\v\x12\x03\x13\x03\x13\x03\x13\x03\x13\x03\x13" +
		"\x03\x13\x03\x13\x03\x13\x03\x13\x03\x13\x03\x13\x05\x13\u0146\n\x13\x03" +
		"\x14\x03\x14\x03\x14\x03\x14\x03\x14\x05\x14\u014D\n\x14\x03\x15\x03\x15" +
		"\x03\x15\x03\x15\x03\x15\x03\x15\x03\x15\x05\x15\u0156\n\x15\x03\x16\x03" +
		"\x16\x03\x16\x03\x16\x03\x16\x03\x16\x03\x16\x03\x16\x03\x16\x03\x16\x05" +
		"\x16\u0162\n\x16\x03\x17\x03\x17\x03\x18\x03\x18\x03\x18\x06\x18\u0169" +
		"\n\x18\r\x18\x0E\x18\u016A\x03\x18\x03\x18\x03\x18\x06\x18\u0170\n\x18" +
		"\r\x18\x0E\x18\u0171\x03\x18\x03\x18\x03\x18\x07\x18\u0177\n\x18\f\x18" +
		"\x0E\x18\u017A\v\x18\x03\x18\x03\x18\x07\x18\u017E\n\x18\f\x18\x0E\x18" +
		"\u0181\v\x18\x05\x18\u0183\n\x18\x03\x19\x03\x19\x07\x19\u0187\n\x19\f" +
		"\x19\x0E\x19\u018A\v\x19\x03\x19\x05\x19\u018D\n\x19\x03\x1A\x03\x1A\x03" +
		"\x1A\x03\x1A\x03\x1A\x03\x1A\x03\x1A\x03\x1A\x03\x1A\x03\x1A\x03\x1A\x03" +
		"\x1A\x03\x1A\x03\x1A\x03\x1A\x03\x1A\x03\x1A\x03\x1A\x03\x1A\x05\x1A\u01A2" +
		"\n\x1A\x03\x1B\x03\x1B\x03\x1B\x05\x1B\u01A7\n\x1B\x03\x1C\x03\x1C\x05" +
		"\x1C\u01AB\n\x1C\x03\x1D\x03\x1D\x03\x1D\x03\x1D\x03\x1E\x03\x1E\x03\x1E" +
		"\x03\x1F\x03\x1F\x03\x1F\x03\x1F\x03 \x03 \x03 \x03 \x03 \x03 \x06 \u01BE" +
		"\n \r \x0E \u01BF\x03 \x03 \x07 \u01C4\n \f \x0E \u01C7\v \x05 \u01C9" +
		"\n \x03 \x03 \x03 \x03 \x03 \x03 \x03 \x03 \x07 \u01D3\n \f \x0E \u01D6" +
		"\v \x05 \u01D8\n \x03 \x03 \x07 \u01DC\n \f \x0E \u01DF\v \x05 \u01E1" +
		"\n \x03!\x03!\x03!\x03!\x07!\u01E7\n!\f!\x0E!\u01EA\v!\x03!\x03!\x03!" +
		"\x03!\x05!\u01F0\n!\x03\"\x03\"\x03\"\x03\"\x07\"\u01F6\n\"\f\"\x0E\"" +
		"\u01F9\v\"\x03\"\x03\"\x03\"\x03\"\x03\"\x05\"\u0200\n\"\x03#\x03#\x03" +
		"#\x03#\x03$\x03$\x03$\x03$\x07$\u020A\n$\f$\x0E$\u020D\v$\x05$\u020F\n" +
		"$\x03$\x03$\x03%\x03%\x03%\x05%\u0216\n%\x03&\x03&\x03&\x03&\x03&\x07" +
		"&\u021D\n&\f&\x0E&\u0220\v&\x05&\u0222\n&\x03&\x05&\u0225\n&\x03&\x03" +
		"&\x03&\x05&\u022A\n&\x03\'\x05\'\u022D\n\'\x03\'\x03\'\x03(\x03(\x03(" +
		"\x03(\x03(\x03(\x03(\x03(\x03(\x03(\x03(\x05(\u023C\n(\x03(\x02\x02\x03" +
		"\")\x02\x02\x04\x02\x06\x02\b\x02\n\x02\f\x02\x0E\x02\x10\x02\x12\x02" +
		"\x14\x02\x16\x02\x18\x02\x1A\x02\x1C\x02\x1E\x02 \x02\"\x02$\x02&\x02" +
		"(\x02*\x02,\x02.\x020\x022\x024\x026\x028\x02:\x02<\x02>\x02@\x02B\x02" +
		"D\x02F\x02H\x02J\x02L\x02N\x02\x02\x11\x03\x03\x0F\x0F\x03\x02!#\x03\x02" +
		"$%\x03\x02;<\x03\x02&(\x03\x02),\x03\x02-0\x03\x02?J\x03\x02=>\x03\x02" +
		"\x1F \x03\x02TU\x03\x02KN\x04\x02\v\vVV\x03\x02\f\r\x03\x02WX\x02\u0279" +
		"\x02S\x03\x02\x02\x02\x04^\x03\x02\x02\x02\x06c\x03\x02\x02\x02\bw\x03" +
		"\x02\x02\x02\n\xB5\x03\x02\x02\x02\f\xC8\x03\x02\x02\x02\x0E\xCC\x03\x02" +
		"\x02\x02\x10\xCE\x03\x02\x02\x02\x12\xDA\x03\x02\x02\x02\x14\xDE\x03\x02" +
		"\x02\x02\x16\xE0\x03\x02\x02\x02\x18\xE2\x03\x02\x02\x02\x1A\xEB\x03\x02" +
		"\x02\x02\x1C\xFD\x03\x02\x02\x02\x1E\xFF\x03\x02\x02\x02 \u0104\x03\x02" +
		"\x02\x02\"\u010B\x03\x02\x02\x02$\u0145\x03\x02\x02\x02&\u014C\x03\x02" +
		"\x02\x02(\u0155\x03\x02\x02\x02*\u0161\x03\x02\x02\x02,\u0163\x03\x02" +
		"\x02\x02.\u0182\x03\x02\x02\x020\u018C\x03\x02\x02\x022\u01A1\x03\x02" +
		"\x02\x024\u01A6\x03\x02\x02\x026\u01AA\x03\x02\x02\x028\u01AC\x03\x02" +
		"\x02\x02:\u01B0\x03\x02\x02\x02<\u01B3\x03\x02\x02\x02>\u01E0\x03\x02" +
		"\x02\x02@\u01EF\x03\x02\x02\x02B\u01FF\x03\x02\x02\x02D\u0201\x03\x02" +
		"\x02\x02F\u0205\x03\x02\x02\x02H\u0215\x03\x02\x02\x02J\u0224\x03\x02" +
		"\x02\x02L\u022C\x03\x02\x02\x02N\u023B\x03\x02\x02\x02PR\x05\x04\x03\x02" +
		"QP\x03\x02\x02\x02RU\x03\x02\x02\x02SQ\x03\x02\x02\x02ST\x03\x02\x02\x02" +
		"TY\x03\x02\x02\x02US\x03\x02\x02\x02VX\x05\b\x05\x02WV\x03\x02\x02\x02" +
		"X[\x03\x02\x02\x02YW\x03\x02\x02\x02YZ\x03\x02\x02\x02Z\\\x03\x02\x02" +
		"\x02[Y\x03\x02\x02\x02\\]\x07\x02\x02\x03]\x03\x03\x02\x02\x02^_\x05\x1A" +
		"\x0E\x02_`\x07V\x02\x02`a\x05\x06\x04\x02ab\x05\x10\t\x02b\x05\x03\x02" +
		"\x02\x02co\x07\t\x02\x02de\x05\x1A\x0E\x02el\x07V\x02\x02fg\x07\x0E\x02" +
		"\x02gh\x05\x1A\x0E\x02hi\x07V\x02\x02ik\x03\x02\x02\x02jf\x03\x02\x02" +
		"\x02kn\x03\x02\x02\x02lj\x03\x02\x02\x02lm\x03\x02\x02\x02mp\x03\x02\x02" +
		"\x02nl\x03\x02\x02\x02od\x03\x02\x02\x02op\x03\x02\x02\x02pq\x03\x02\x02" +
		"\x02qr\x07\n\x02\x02r\x07\x03\x02\x02\x02sx\x05\n\x06\x02tu\x05\f\x07" +
		"\x02uv\t\x02\x02\x02vx\x03\x02\x02\x02ws\x03\x02\x02\x02wt\x03\x02\x02" +
		"\x02x\t\x03\x02\x02\x02yz\x07\x10\x02\x02z{\x07\t\x02\x02{|\x05$\x13\x02" +
		"|}\x07\n\x02\x02}\x81\x05\x0E\b\x02~\x7F\x07\x12\x02\x02\x7F\x82\x05\x0E" +
		"\b\x02\x80\x82\x06\x06\x02\x02\x81~\x03\x02\x02\x02\x81\x80\x03\x02\x02" +
		"\x02\x82\xB6\x03\x02\x02\x02\x83\x84\x07\x13\x02\x02\x84\x85\x07\t\x02" +
		"\x02\x85\x86\x05$\x13\x02\x86\x89\x07\n\x02\x02\x87\x8A\x05\x0E\b\x02" +
		"\x88\x8A\x05\x12\n\x02\x89\x87\x03\x02\x02\x02\x89\x88\x03\x02\x02\x02" +
		"\x8A\xB6\x03\x02\x02\x02\x8B\x8C\x07\x15\x02\x02\x8C\x8E\x07\t\x02\x02" +
		"\x8D\x8F\x05\x14\v\x02\x8E\x8D\x03\x02\x02\x02\x8E\x8F\x03\x02\x02\x02" +
		"\x8F\x90\x03\x02\x02\x02\x90\x92\x07\x0F\x02\x02\x91\x93\x05$\x13\x02" +
		"\x92\x91\x03\x02\x02\x02\x92\x93\x03\x02\x02\x02\x93\x94\x03\x02\x02\x02" +
		"\x94\x96\x07\x0F\x02\x02\x95\x97\x05\x16\f\x02\x96\x95\x03\x02\x02\x02" +
		"\x96\x97\x03\x02\x02\x02\x97\x98\x03\x02\x02\x02\x98\x9B\x07\n\x02\x02" +
		"\x99\x9C\x05\x0E\b\x02\x9A\x9C\x05\x12\n\x02\x9B\x99\x03\x02\x02\x02\x9B" +
		"\x9A\x03\x02\x02\x02\x9C\xB6\x03\x02\x02\x02\x9D\x9E\x07\x15\x02\x02\x9E" +
		"\x9F\x07\t\x02\x02\x9F\xA0\x05\x1A\x0E\x02\xA0\xA1\x07V\x02\x02\xA1\xA2" +
		"\x077\x02\x02\xA2\xA3\x05$\x13\x02\xA3\xA4\x07\n\x02\x02\xA4\xA5\x05\x0E" +
		"\b\x02\xA5\xB6\x03\x02\x02\x02\xA6\xA7\x07\x15\x02\x02\xA7\xA8\x07\t\x02" +
		"\x02\xA8\xA9\x07V\x02\x02\xA9\xAA\x07\x11\x02\x02\xAA\xAB\x05$\x13\x02" +
		"\xAB\xAC\x07\n\x02\x02\xAC\xAD\x05\x0E\b\x02\xAD\xB6\x03\x02\x02\x02\xAE" +
		"\xAF\x07\x1A\x02\x02\xAF\xB1\x05\x10\t\x02\xB0\xB2\x05 \x11\x02\xB1\xB0" +
		"\x03\x02\x02\x02\xB2\xB3\x03\x02\x02\x02\xB3\xB1\x03\x02\x02\x02\xB3\xB4" +
		"\x03\x02\x02\x02\xB4\xB6\x03\x02\x02\x02\xB5y\x03\x02\x02\x02\xB5\x83" +
		"\x03\x02\x02\x02\xB5\x8B\x03\x02\x02\x02\xB5\x9D\x03\x02\x02\x02\xB5\xA6" +
		"\x03\x02\x02\x02\xB5\xAE\x03\x02\x02\x02\xB6\v\x03\x02\x02\x02\xB7\xB8" +
		"\x07\x14\x02\x02\xB8\xB9\x05\x10\t\x02\xB9\xBA\x07\x13\x02\x02\xBA\xBB" +
		"\x07\t\x02\x02\xBB\xBC\x05$\x13\x02\xBC\xBD\x07\n\x02\x02\xBD\xC9\x03" +
		"\x02\x02\x02\xBE\xC9\x05\x18\r\x02\xBF\xC9\x07\x16\x02\x02\xC0\xC9\x07" +
		"\x17\x02\x02\xC1\xC3\x07\x18\x02\x02\xC2\xC4\x05$\x13\x02\xC3\xC2\x03" +
		"\x02\x02\x02\xC3\xC4\x03\x02\x02\x02\xC4\xC9\x03\x02\x02\x02\xC5\xC6\x07" +
		"\x1C\x02\x02\xC6\xC9\x05$\x13\x02\xC7\xC9\x05$\x13\x02\xC8\xB7\x03\x02" +
		"\x02\x02\xC8\xBE\x03\x02\x02\x02\xC8\xBF\x03\x02\x02\x02\xC8\xC0\x03\x02" +
		"\x02\x02\xC8\xC1\x03\x02\x02\x02\xC8\xC5\x03\x02\x02\x02\xC8\xC7\x03\x02" +
		"\x02\x02\xC9\r\x03\x02\x02\x02\xCA\xCD\x05\x10\t\x02\xCB\xCD\x05\b\x05" +
		"\x02\xCC\xCA\x03\x02\x02\x02\xCC\xCB\x03\x02\x02\x02\xCD\x0F\x03\x02\x02" +
		"\x02\xCE\xD2\x07\x05\x02\x02\xCF\xD1\x05\b\x05\x02\xD0\xCF\x03\x02\x02" +
		"\x02\xD1\xD4\x03\x02\x02\x02\xD2\xD0\x03\x02\x02\x02\xD2\xD3\x03\x02\x02" +
		"\x02\xD3\xD6\x03\x02\x02\x02\xD4\xD2\x03\x02\x02\x02\xD5\xD7\x05\f\x07" +
		"\x02\xD6\xD5\x03\x02\x02\x02\xD6\xD7\x03\x02\x02\x02\xD7\xD8\x03\x02\x02" +
		"\x02\xD8\xD9\x07\x06\x02\x02\xD9\x11\x03\x02\x02\x02\xDA\xDB\x07\x0F\x02" +
		"\x02\xDB\x13\x03\x02\x02\x02\xDC\xDF\x05\x18\r\x02\xDD\xDF\x05$\x13\x02" +
		"\xDE\xDC\x03\x02\x02\x02\xDE\xDD\x03\x02\x02\x02\xDF\x15\x03\x02\x02\x02" +
		"\xE0\xE1\x05$\x13\x02\xE1\x17\x03\x02\x02\x02\xE2\xE3\x05\x1A\x0E\x02" +
		"\xE3\xE8\x05\x1E\x10\x02\xE4\xE5\x07\x0E\x02\x02\xE5\xE7\x05\x1E\x10\x02" +
		"\xE6\xE4\x03\x02\x02\x02\xE7\xEA\x03\x02\x02\x02\xE8\xE6\x03\x02\x02\x02" +
		"\xE8\xE9\x03\x02\x02\x02\xE9\x19\x03\x02\x02\x02\xEA\xE8\x03\x02\x02\x02" +
		"\xEB\xF0\x05\x1C\x0F\x02\xEC\xED\x07\x07\x02\x02\xED\xEF\x07\b\x02\x02" +
		"\xEE\xEC\x03\x02\x02\x02\xEF\xF2\x03\x02\x02\x02\xF0\xEE\x03\x02\x02\x02" +
		"\xF0\xF1\x03\x02\x02\x02\xF1\x1B\x03\x02\x02\x02\xF2\xF0\x03\x02\x02\x02" +
		"\xF3\xFE\x07U\x02\x02\xF4\xFE\x07T\x02\x02\xF5\xFA\x07V\x02\x02\xF6\xF7" +
		"\x07\f\x02\x02\xF7\xF9\x07X\x02\x02\xF8\xF6\x03\x02\x02\x02\xF9\xFC\x03" +
		"\x02\x02\x02\xFA\xF8\x03\x02\x02\x02\xFA\xFB\x03\x02\x02\x02\xFB\xFE\x03" +
		"\x02\x02\x02\xFC\xFA\x03\x02\x02\x02\xFD\xF3\x03\x02\x02\x02\xFD\xF4\x03" +
		"\x02\x02\x02\xFD\xF5\x03\x02\x02\x02\xFE\x1D\x03\x02\x02\x02\xFF\u0102" +
		"\x07V\x02\x02\u0100\u0101\x07?\x02\x02\u0101\u0103\x05$\x13\x02\u0102" +
		"\u0100\x03\x02\x02\x02\u0102\u0103\x03\x02\x02\x02\u0103\x1F\x03\x02\x02" +
		"\x02\u0104\u0105\x07\x1B\x02\x02\u0105\u0106\x07\t\x02\x02\u0106\u0107" +
		"\x05\x1C\x0F\x02\u0107\u0108\x07V\x02\x02\u0108\u0109\x07\n\x02\x02\u0109" +
		"\u010A\x05\x10\t\x02\u010A!\x03\x02\x02\x02\u010B\u010C\b\x12\x01\x02" +
		"\u010C\u010D\x05&\x14\x02\u010D\u0137\x03\x02\x02\x02\u010E\u010F\f\x0F" +
		"\x02\x02\u010F\u0110\t\x03\x02\x02\u0110\u0136\x05\"\x12\x10\u0111\u0112" +
		"\f\x0E\x02\x02\u0112\u0113\t\x04\x02\x02\u0113\u0136\x05\"\x12\x0F\u0114" +
		"\u0115\f\r\x02\x02\u0115\u0116\t\x05\x02\x02\u0116\u0136\x05\"\x12\x0E" +
		"\u0117\u0118\f\f\x02\x02\u0118\u0119\t\x06\x02\x02\u0119\u0136\x05\"\x12" +
		"\r\u011A\u011B\f\v\x02\x02\u011B\u011C\t\x07\x02\x02\u011C\u0136\x05\"" +
		"\x12\f\u011D\u011E\f\t\x02\x02\u011E\u011F\t\b\x02\x02\u011F\u0136\x05" +
		"\"\x12\n\u0120\u0121\f\b\x02\x02\u0121\u0122\x071\x02\x02\u0122\u0136" +
		"\x05\"\x12\t\u0123\u0124\f\x07\x02\x02\u0124\u0125\x072\x02\x02\u0125" +
		"\u0136\x05\"\x12\b\u0126\u0127\f\x06\x02\x02\u0127\u0128\x073\x02\x02" +
		"\u0128\u0136\x05\"\x12\x07\u0129\u012A\f\x05\x02\x02\u012A\u012B\x074" +
		"\x02\x02\u012B\u0136\x05\"\x12\x06\u012C\u012D\f\x04\x02\x02\u012D\u012E" +
		"\x075\x02\x02\u012E\u0136\x05\"\x12\x05\u012F\u0130\f\x03\x02\x02\u0130" +
		"\u0131\x078\x02\x02\u0131\u0136\x05\"\x12\x03\u0132\u0133\f\n\x02\x02" +
		"\u0133\u0134\x07\x1E\x02\x02\u0134\u0136\x05\x1A\x0E\x02\u0135\u010E\x03" +
		"\x02\x02\x02\u0135\u0111\x03\x02\x02\x02\u0135\u0114\x03\x02\x02\x02\u0135" +
		"\u0117\x03\x02\x02\x02\u0135\u011A\x03\x02\x02\x02\u0135\u011D\x03\x02" +
		"\x02\x02\u0135\u0120\x03\x02\x02\x02\u0135\u0123\x03\x02\x02\x02\u0135" +
		"\u0126\x03\x02\x02\x02\u0135\u0129\x03\x02\x02\x02\u0135\u012C\x03\x02" +
		"\x02\x02\u0135\u012F\x03\x02\x02\x02\u0135\u0132\x03\x02\x02\x02\u0136" +
		"\u0139\x03\x02\x02\x02\u0137\u0135\x03\x02\x02\x02\u0137\u0138\x03\x02" +
		"\x02\x02\u0138#\x03\x02\x02\x02\u0139\u0137\x03\x02\x02\x02\u013A\u0146" +
		"\x05\"\x12\x02\u013B\u013C\x05\"\x12\x02\u013C\u013D\x076\x02\x02\u013D" +
		"\u013E\x05$\x13\x02\u013E\u013F\x077\x02\x02\u013F\u0140\x05$\x13\x02" +
		"\u0140\u0146\x03\x02\x02\x02\u0141\u0142\x05\"\x12\x02\u0142\u0143\t\t" +
		"\x02\x02\u0143\u0144\x05$\x13\x02\u0144\u0146\x03\x02\x02\x02\u0145\u013A" +
		"\x03\x02\x02\x02\u0145\u013B\x03\x02\x02\x02\u0145\u0141\x03\x02\x02\x02" +
		"\u0146%\x03\x02\x02\x02\u0147\u0148\t\n\x02\x02\u0148\u014D\x050\x19\x02" +
		"\u0149\u014A\t\x04\x02\x02\u014A\u014D\x05&\x14\x02\u014B\u014D\x05(\x15" +
		"\x02\u014C\u0147\x03\x02\x02\x02\u014C\u0149\x03\x02\x02\x02\u014C\u014B" +
		"\x03\x02\x02\x02\u014D\'\x03\x02\x02\x02\u014E\u0156\x050\x19\x02\u014F" +
		"\u0150\x050\x19\x02\u0150\u0151\t\n\x02\x02\u0151\u0156\x03\x02\x02\x02" +
		"\u0152\u0153\t\v\x02\x02\u0153\u0156\x05&\x14\x02\u0154\u0156\x05*\x16" +
		"\x02\u0155\u014E\x03\x02\x02\x02\u0155\u014F\x03\x02\x02\x02\u0155\u0152" +
		"\x03\x02\x02\x02\u0155\u0154\x03\x02\x02\x02\u0156)\x03\x02\x02\x02\u0157" +
		"\u0158\x07\t\x02\x02\u0158\u0159\x05,\x17\x02\u0159\u015A\x07\n\x02\x02" +
		"\u015A\u015B\x05&\x14\x02\u015B\u0162\x03\x02\x02\x02\u015C\u015D\x07" +
		"\t\x02\x02\u015D\u015E\x05.\x18\x02\u015E\u015F\x07\n\x02\x02\u015F\u0160" +
		"\x05(\x15\x02\u0160\u0162\x03\x02\x02\x02\u0161\u0157\x03\x02\x02\x02" +
		"\u0161\u015C\x03\x02\x02\x02\u0162+\x03\x02\x02\x02\u0163\u0164\t\f\x02" +
		"\x02\u0164-\x03\x02\x02\x02\u0165\u0168\x07U\x02\x02\u0166\u0167\x07\x07" +
		"\x02\x02\u0167\u0169\x07\b\x02\x02\u0168\u0166\x03\x02\x02\x02\u0169\u016A" +
		"\x03\x02\x02\x02\u016A\u0168\x03\x02\x02\x02\u016A\u016B\x03\x02\x02\x02" +
		"\u016B\u0183\x03\x02\x02\x02\u016C\u016F\x07T\x02\x02\u016D\u016E\x07" +
		"\x07\x02\x02\u016E\u0170\x07\b\x02\x02\u016F\u016D\x03\x02\x02\x02\u0170" +
		"\u0171\x03\x02\x02\x02\u0171\u016F\x03\x02\x02\x02\u0171\u0172\x03\x02" +
		"\x02\x02\u0172\u0183\x03\x02\x02\x02\u0173\u0178\x07V\x02\x02\u0174\u0175" +
		"\x07\f\x02\x02\u0175\u0177\x07X\x02\x02\u0176\u0174\x03\x02\x02\x02\u0177" +
		"\u017A\x03\x02\x02\x02\u0178\u0176\x03\x02\x02\x02\u0178\u0179\x03\x02" +
		"\x02\x02\u0179\u017F\x03\x02\x02\x02\u017A\u0178\x03\x02\x02\x02\u017B" +
		"\u017C\x07\x07\x02\x02\u017C\u017E\x07\b\x02\x02\u017D\u017B\x03\x02\x02" +
		"\x02\u017E\u0181\x03\x02\x02\x02\u017F\u017D\x03\x02\x02\x02\u017F\u0180" +
		"\x03\x02\x02\x02\u0180\u0183\x03\x02\x02\x02\u0181\u017F\x03\x02\x02\x02" +
		"\u0182\u0165\x03\x02\x02\x02\u0182\u016C\x03\x02\x02\x02\u0182\u0173\x03" +
		"\x02\x02\x02\u0183/\x03\x02\x02\x02\u0184\u0188\x052\x1A\x02\u0185\u0187" +
		"\x054\x1B\x02\u0186\u0185\x03\x02\x02\x02\u0187\u018A\x03\x02\x02\x02" +
		"\u0188\u0186\x03\x02\x02\x02\u0188\u0189\x03\x02\x02\x02\u0189\u018D\x03" +
		"\x02\x02\x02\u018A\u0188\x03\x02\x02\x02\u018B\u018D\x05> \x02\u018C\u0184" +
		"\x03\x02\x02\x02\u018C\u018B\x03\x02\x02\x02\u018D1\x03\x02\x02\x02\u018E" +
		"\u018F\x07\t\x02\x02\u018F\u0190\x05$\x13\x02\u0190\u0191\x07\n\x02\x02" +
		"\u0191\u01A2\x03\x02\x02\x02\u0192\u01A2\t\r\x02\x02\u0193\u01A2\x07Q" +
		"\x02\x02\u0194\u01A2\x07R\x02\x02\u0195\u01A2\x07S\x02\x02\u0196\u01A2" +
		"\x07O\x02\x02\u0197\u01A2\x07P\x02\x02\u0198\u01A2\x05@!\x02\u0199\u01A2" +
		"\x05B\"\x02\u019A\u01A2\x07V\x02\x02\u019B\u019C\t\x0E\x02\x02\u019C\u01A2" +
		"\x05F$\x02\u019D\u019E\x07\x19\x02\x02\u019E\u019F\x05\x1C\x0F\x02\u019F" +
		"\u01A0\x05F$\x02\u01A0\u01A2\x03\x02\x02\x02\u01A1\u018E\x03\x02\x02\x02" +
		"\u01A1\u0192\x03\x02\x02\x02\u01A1\u0193\x03\x02\x02\x02\u01A1\u0194\x03" +
		"\x02\x02\x02\u01A1\u0195\x03\x02\x02\x02\u01A1\u0196\x03\x02\x02\x02\u01A1" +
		"\u0197\x03\x02\x02\x02\u01A1\u0198\x03\x02\x02\x02\u01A1\u0199\x03\x02" +
		"\x02\x02\u01A1\u019A\x03\x02\x02\x02\u01A1\u019B\x03\x02\x02\x02\u01A1" +
		"\u019D\x03\x02\x02\x02\u01A23\x03\x02\x02\x02\u01A3\u01A7\x058\x1D\x02" +
		"\u01A4\u01A7\x05:\x1E\x02\u01A5\u01A7\x05<\x1F\x02\u01A6\u01A3\x03\x02" +
		"\x02\x02\u01A6\u01A4\x03\x02\x02\x02\u01A6\u01A5\x03\x02\x02\x02\u01A7" +
		"5\x03\x02\x02\x02\u01A8\u01AB\x058\x1D\x02\u01A9\u01AB\x05:\x1E\x02\u01AA" +
		"\u01A8\x03\x02\x02\x02\u01AA\u01A9\x03\x02\x02\x02\u01AB7\x03\x02\x02" +
		"\x02\u01AC\u01AD\t\x0F\x02\x02\u01AD\u01AE\x07X\x02\x02\u01AE\u01AF\x05" +
		"F$\x02\u01AF9\x03\x02\x02\x02\u01B0\u01B1\t\x0F\x02\x02\u01B1\u01B2\t" +
		"\x10\x02\x02\u01B2;\x03\x02\x02\x02\u01B3\u01B4\x07\x07\x02\x02\u01B4" +
		"\u01B5\x05$\x13\x02\u01B5\u01B6\x07\b\x02\x02\u01B6=\x03\x02\x02\x02\u01B7" +
		"\u01B8\x07\x19\x02\x02\u01B8\u01BD\x05\x1C\x0F\x02\u01B9\u01BA\x07\x07" +
		"\x02\x02\u01BA\u01BB\x05$\x13\x02\u01BB\u01BC\x07\b\x02\x02\u01BC\u01BE" +
		"\x03\x02\x02\x02\u01BD\u01B9\x03\x02\x02\x02\u01BE\u01BF\x03\x02\x02\x02" +
		"\u01BF\u01BD\x03\x02\x02\x02\u01BF\u01C0\x03\x02\x02\x02\u01C0\u01C8\x03" +
		"\x02\x02\x02\u01C1\u01C5\x056\x1C\x02\u01C2\u01C4\x054\x1B\x02\u01C3\u01C2" +
		"\x03\x02\x02\x02\u01C4\u01C7\x03\x02\x02\x02\u01C5\u01C3\x03\x02\x02\x02" +
		"\u01C5\u01C6\x03\x02\x02\x02\u01C6\u01C9\x03\x02\x02\x02\u01C7\u01C5\x03" +
		"\x02\x02\x02\u01C8\u01C1\x03\x02\x02\x02\u01C8\u01C9\x03\x02\x02\x02\u01C9" +
		"\u01E1\x03\x02\x02\x02\u01CA\u01CB\x07\x19\x02\x02\u01CB\u01CC\x05\x1C" +
		"\x0F\x02\u01CC\u01CD\x07\x07\x02\x02\u01CD\u01CE\x07\b\x02\x02\u01CE\u01D7" +
		"\x07\x05\x02\x02\u01CF\u01D4\x05$\x13\x02\u01D0\u01D1\x07\x0E\x02\x02" +
		"\u01D1\u01D3\x05$\x13\x02\u01D2\u01D0\x03\x02\x02\x02\u01D3\u01D6\x03" +
		"\x02\x02\x02\u01D4\u01D2\x03\x02\x02\x02\u01D4\u01D5\x03\x02\x02\x02\u01D5" +
		"\u01D8\x03\x02\x02\x02\u01D6\u01D4\x03\x02\x02\x02\u01D7\u01CF\x03\x02" +
		"\x02\x02\u01D7\u01D8\x03\x02\x02\x02\u01D8\u01D9\x03\x02\x02\x02\u01D9" +
		"\u01DD\x07\x06\x02\x02\u01DA\u01DC\x054\x1B\x02\u01DB\u01DA\x03\x02\x02" +
		"\x02\u01DC\u01DF\x03\x02\x02\x02\u01DD\u01DB\x03\x02\x02\x02\u01DD\u01DE" +
		"\x03\x02\x02\x02\u01DE\u01E1\x03\x02\x02\x02\u01DF\u01DD\x03\x02\x02\x02" +
		"\u01E0\u01B7\x03\x02\x02\x02\u01E0\u01CA\x03\x02\x02\x02\u01E1?\x03\x02" +
		"\x02\x02\u01E2\u01E3\x07\x07\x02\x02\u01E3\u01E8\x05$\x13\x02\u01E4\u01E5" +
		"\x07\x0E\x02\x02\u01E5\u01E7\x05$\x13\x02\u01E6\u01E4\x03\x02\x02\x02" +
		"\u01E7\u01EA\x03\x02\x02\x02\u01E8\u01E6\x03\x02\x02\x02\u01E8\u01E9\x03" +
		"\x02\x02\x02\u01E9\u01EB\x03\x02\x02\x02\u01EA\u01E8\x03\x02\x02\x02\u01EB" +
		"\u01EC\x07\b\x02\x02\u01EC\u01F0\x03\x02\x02\x02\u01ED\u01EE\x07\x07\x02" +
		"\x02\u01EE\u01F0\x07\b\x02\x02\u01EF\u01E2\x03\x02\x02\x02\u01EF\u01ED" +
		"\x03\x02\x02\x02\u01F0A\x03\x02\x02\x02\u01F1\u01F2\x07\x07\x02\x02\u01F2" +
		"\u01F7\x05D#\x02\u01F3\u01F4\x07\x0E\x02\x02\u01F4\u01F6\x05D#\x02\u01F5" +
		"\u01F3\x03\x02\x02\x02\u01F6\u01F9\x03\x02\x02\x02\u01F7\u01F5\x03\x02" +
		"\x02\x02\u01F7\u01F8\x03\x02\x02\x02\u01F8\u01FA\x03\x02\x02\x02\u01F9" +
		"\u01F7\x03\x02\x02\x02\u01FA\u01FB\x07\b\x02\x02\u01FB\u0200\x03\x02\x02" +
		"\x02\u01FC\u01FD\x07\x07\x02\x02\u01FD\u01FE\x077\x02\x02\u01FE\u0200" +
		"\x07\b\x02\x02\u01FF\u01F1\x03\x02\x02\x02\u01FF\u01FC\x03\x02\x02\x02" +
		"\u0200C\x03\x02\x02\x02\u0201\u0202\x05$\x13\x02\u0202\u0203\x077\x02" +
		"\x02\u0203\u0204\x05$\x13\x02\u0204E\x03\x02\x02\x02\u0205\u020E\x07\t" +
		"\x02\x02\u0206\u020B\x05H%\x02\u0207\u0208\x07\x0E\x02\x02\u0208\u020A" +
		"\x05H%\x02\u0209\u0207\x03\x02\x02\x02\u020A\u020D\x03\x02\x02\x02\u020B" +
		"\u0209\x03\x02\x02\x02\u020B\u020C\x03\x02\x02\x02\u020C\u020F\x03\x02" +
		"\x02\x02\u020D\u020B\x03\x02\x02\x02\u020E\u0206\x03\x02\x02\x02\u020E" +
		"\u020F\x03\x02\x02\x02\u020F\u0210\x03\x02\x02\x02\u0210\u0211\x07\n\x02" +
		"\x02\u0211G\x03\x02\x02\x02\u0212\u0216\x05$\x13\x02\u0213\u0216\x05J" +
		"&\x02\u0214\u0216\x05N(\x02\u0215\u0212\x03\x02\x02\x02\u0215\u0213\x03" +
		"\x02\x02\x02\u0215\u0214\x03\x02\x02\x02\u0216I\x03\x02\x02\x02\u0217" +
		"\u0225\x05L\'\x02\u0218\u0221\x07\t\x02\x02\u0219\u021E\x05L\'\x02\u021A" +
		"\u021B\x07\x0E\x02\x02\u021B\u021D\x05L\'\x02\u021C\u021A\x03\x02\x02" +
		"\x02\u021D\u0220\x03\x02\x02\x02\u021E\u021C\x03\x02\x02\x02\u021E\u021F" +
		"\x03\x02\x02\x02\u021F\u0222\x03\x02\x02\x02\u0220\u021E\x03\x02\x02\x02" +
		"\u0221\u0219\x03\x02\x02\x02\u0221\u0222\x03\x02\x02\x02\u0222\u0223\x03" +
		"\x02\x02\x02\u0223\u0225\x07\n\x02\x02\u0224\u0217\x03\x02\x02\x02\u0224" +
		"\u0218";
	private static readonly _serializedATNSegment1: string =
		"\x03\x02\x02\x02\u0225\u0226\x03\x02\x02\x02\u0226\u0229\x07:\x02\x02" +
		"\u0227\u022A\x05\x10\t\x02\u0228\u022A\x05$\x13\x02\u0229\u0227\x03\x02" +
		"\x02\x02\u0229\u0228\x03\x02\x02\x02\u022AK\x03\x02\x02\x02\u022B\u022D" +
		"\x05\x1A\x0E\x02\u022C\u022B\x03\x02\x02\x02\u022C\u022D\x03\x02\x02\x02" +
		"\u022D\u022E\x03\x02\x02\x02\u022E\u022F\x07V\x02\x02\u022FM\x03\x02\x02" +
		"\x02\u0230\u0231\x05\x1A\x0E\x02\u0231\u0232\x079\x02\x02\u0232\u0233" +
		"\x07V\x02\x02\u0233\u023C\x03\x02\x02\x02\u0234\u0235\x05\x1A\x0E\x02" +
		"\u0235\u0236\x079\x02\x02\u0236\u0237\x07\x19\x02\x02\u0237\u023C\x03" +
		"\x02\x02\x02\u0238\u0239\x07\x1D\x02\x02\u0239\u023A\x079\x02\x02\u023A" +
		"\u023C\x07V\x02\x02\u023B\u0230\x03\x02\x02\x02\u023B\u0234\x03\x02\x02" +
		"\x02\u023B\u0238\x03\x02\x02\x02\u023CO\x03\x02\x02\x02>SYlow\x81\x89" +
		"\x8E\x92\x96\x9B\xB3\xB5\xC3\xC8\xCC\xD2\xD6\xDE\xE8\xF0\xFA\xFD\u0102" +
		"\u0135\u0137\u0145\u014C\u0155\u0161\u016A\u0171\u0178\u017F\u0182\u0188" +
		"\u018C\u01A1\u01A6\u01AA\u01BF\u01C5\u01C8\u01D4\u01D7\u01DD\u01E0\u01E8" +
		"\u01EF\u01F7\u01FF\u020B\u020E\u0215\u021E\u0221\u0224\u0229\u022C\u023B";
	public static readonly _serializedATN: string = Utils.join(
		[
			painless_parser._serializedATNSegment0,
			painless_parser._serializedATNSegment1,
		],
		"",
	);
	public static __ATN: ATN;
	public static get _ATN(): ATN {
		if (!painless_parser.__ATN) {
			painless_parser.__ATN = new ATNDeserializer().deserialize(Utils.toCharArray(painless_parser._serializedATN));
		}

		return painless_parser.__ATN;
	}

}

export class SourceContext extends ParserRuleContext {
	public EOF(): TerminalNode { return this.getToken(painless_parser.EOF, 0); }
	public function(): FunctionContext[];
	public function(i: number): FunctionContext;
	public function(i?: number): FunctionContext | FunctionContext[] {
		if (i === undefined) {
			return this.getRuleContexts(FunctionContext);
		} else {
			return this.getRuleContext(i, FunctionContext);
		}
	}
	public statement(): StatementContext[];
	public statement(i: number): StatementContext;
	public statement(i?: number): StatementContext | StatementContext[] {
		if (i === undefined) {
			return this.getRuleContexts(StatementContext);
		} else {
			return this.getRuleContext(i, StatementContext);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_source; }
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterSource) {
			listener.enterSource(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitSource) {
			listener.exitSource(this);
		}
	}
}


export class FunctionContext extends ParserRuleContext {
	public decltype(): DecltypeContext {
		return this.getRuleContext(0, DecltypeContext);
	}
	public ID(): TerminalNode { return this.getToken(painless_parser.ID, 0); }
	public parameters(): ParametersContext {
		return this.getRuleContext(0, ParametersContext);
	}
	public block(): BlockContext {
		return this.getRuleContext(0, BlockContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_function; }
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterFunction) {
			listener.enterFunction(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitFunction) {
			listener.exitFunction(this);
		}
	}
}


export class ParametersContext extends ParserRuleContext {
	public LP(): TerminalNode { return this.getToken(painless_parser.LP, 0); }
	public RP(): TerminalNode { return this.getToken(painless_parser.RP, 0); }
	public decltype(): DecltypeContext[];
	public decltype(i: number): DecltypeContext;
	public decltype(i?: number): DecltypeContext | DecltypeContext[] {
		if (i === undefined) {
			return this.getRuleContexts(DecltypeContext);
		} else {
			return this.getRuleContext(i, DecltypeContext);
		}
	}
	public ID(): TerminalNode[];
	public ID(i: number): TerminalNode;
	public ID(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(painless_parser.ID);
		} else {
			return this.getToken(painless_parser.ID, i);
		}
	}
	public COMMA(): TerminalNode[];
	public COMMA(i: number): TerminalNode;
	public COMMA(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(painless_parser.COMMA);
		} else {
			return this.getToken(painless_parser.COMMA, i);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_parameters; }
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterParameters) {
			listener.enterParameters(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitParameters) {
			listener.exitParameters(this);
		}
	}
}


export class StatementContext extends ParserRuleContext {
	public rstatement(): RstatementContext | undefined {
		return this.tryGetRuleContext(0, RstatementContext);
	}
	public dstatement(): DstatementContext | undefined {
		return this.tryGetRuleContext(0, DstatementContext);
	}
	public SEMICOLON(): TerminalNode | undefined { return this.tryGetToken(painless_parser.SEMICOLON, 0); }
	public EOF(): TerminalNode | undefined { return this.tryGetToken(painless_parser.EOF, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_statement; }
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterStatement) {
			listener.enterStatement(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitStatement) {
			listener.exitStatement(this);
		}
	}
}


export class RstatementContext extends ParserRuleContext {
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_rstatement; }
	public copyFrom(ctx: RstatementContext): void {
		super.copyFrom(ctx);
	}
}
export class IfContext extends RstatementContext {
	public IF(): TerminalNode { return this.getToken(painless_parser.IF, 0); }
	public LP(): TerminalNode { return this.getToken(painless_parser.LP, 0); }
	public expression(): ExpressionContext {
		return this.getRuleContext(0, ExpressionContext);
	}
	public RP(): TerminalNode { return this.getToken(painless_parser.RP, 0); }
	public trailer(): TrailerContext[];
	public trailer(i: number): TrailerContext;
	public trailer(i?: number): TrailerContext | TrailerContext[] {
		if (i === undefined) {
			return this.getRuleContexts(TrailerContext);
		} else {
			return this.getRuleContext(i, TrailerContext);
		}
	}
	public ELSE(): TerminalNode | undefined { return this.tryGetToken(painless_parser.ELSE, 0); }
	constructor(ctx: RstatementContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterIf) {
			listener.enterIf(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitIf) {
			listener.exitIf(this);
		}
	}
}
export class WhileContext extends RstatementContext {
	public WHILE(): TerminalNode { return this.getToken(painless_parser.WHILE, 0); }
	public LP(): TerminalNode { return this.getToken(painless_parser.LP, 0); }
	public expression(): ExpressionContext {
		return this.getRuleContext(0, ExpressionContext);
	}
	public RP(): TerminalNode { return this.getToken(painless_parser.RP, 0); }
	public trailer(): TrailerContext | undefined {
		return this.tryGetRuleContext(0, TrailerContext);
	}
	public empty(): EmptyContext | undefined {
		return this.tryGetRuleContext(0, EmptyContext);
	}
	constructor(ctx: RstatementContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterWhile) {
			listener.enterWhile(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitWhile) {
			listener.exitWhile(this);
		}
	}
}
export class ForContext extends RstatementContext {
	public FOR(): TerminalNode { return this.getToken(painless_parser.FOR, 0); }
	public LP(): TerminalNode { return this.getToken(painless_parser.LP, 0); }
	public SEMICOLON(): TerminalNode[];
	public SEMICOLON(i: number): TerminalNode;
	public SEMICOLON(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(painless_parser.SEMICOLON);
		} else {
			return this.getToken(painless_parser.SEMICOLON, i);
		}
	}
	public RP(): TerminalNode { return this.getToken(painless_parser.RP, 0); }
	public trailer(): TrailerContext | undefined {
		return this.tryGetRuleContext(0, TrailerContext);
	}
	public empty(): EmptyContext | undefined {
		return this.tryGetRuleContext(0, EmptyContext);
	}
	public initializer(): InitializerContext | undefined {
		return this.tryGetRuleContext(0, InitializerContext);
	}
	public expression(): ExpressionContext | undefined {
		return this.tryGetRuleContext(0, ExpressionContext);
	}
	public afterthought(): AfterthoughtContext | undefined {
		return this.tryGetRuleContext(0, AfterthoughtContext);
	}
	constructor(ctx: RstatementContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterFor) {
			listener.enterFor(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitFor) {
			listener.exitFor(this);
		}
	}
}
export class EachContext extends RstatementContext {
	public FOR(): TerminalNode { return this.getToken(painless_parser.FOR, 0); }
	public LP(): TerminalNode { return this.getToken(painless_parser.LP, 0); }
	public decltype(): DecltypeContext {
		return this.getRuleContext(0, DecltypeContext);
	}
	public ID(): TerminalNode { return this.getToken(painless_parser.ID, 0); }
	public COLON(): TerminalNode { return this.getToken(painless_parser.COLON, 0); }
	public expression(): ExpressionContext {
		return this.getRuleContext(0, ExpressionContext);
	}
	public RP(): TerminalNode { return this.getToken(painless_parser.RP, 0); }
	public trailer(): TrailerContext {
		return this.getRuleContext(0, TrailerContext);
	}
	constructor(ctx: RstatementContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterEach) {
			listener.enterEach(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitEach) {
			listener.exitEach(this);
		}
	}
}
export class IneachContext extends RstatementContext {
	public FOR(): TerminalNode { return this.getToken(painless_parser.FOR, 0); }
	public LP(): TerminalNode { return this.getToken(painless_parser.LP, 0); }
	public ID(): TerminalNode { return this.getToken(painless_parser.ID, 0); }
	public IN(): TerminalNode { return this.getToken(painless_parser.IN, 0); }
	public expression(): ExpressionContext {
		return this.getRuleContext(0, ExpressionContext);
	}
	public RP(): TerminalNode { return this.getToken(painless_parser.RP, 0); }
	public trailer(): TrailerContext {
		return this.getRuleContext(0, TrailerContext);
	}
	constructor(ctx: RstatementContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterIneach) {
			listener.enterIneach(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitIneach) {
			listener.exitIneach(this);
		}
	}
}
export class TryContext extends RstatementContext {
	public TRY(): TerminalNode { return this.getToken(painless_parser.TRY, 0); }
	public block(): BlockContext {
		return this.getRuleContext(0, BlockContext);
	}
	public trap(): TrapContext[];
	public trap(i: number): TrapContext;
	public trap(i?: number): TrapContext | TrapContext[] {
		if (i === undefined) {
			return this.getRuleContexts(TrapContext);
		} else {
			return this.getRuleContext(i, TrapContext);
		}
	}
	constructor(ctx: RstatementContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterTry) {
			listener.enterTry(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitTry) {
			listener.exitTry(this);
		}
	}
}


export class DstatementContext extends ParserRuleContext {
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_dstatement; }
	public copyFrom(ctx: DstatementContext): void {
		super.copyFrom(ctx);
	}
}
export class DoContext extends DstatementContext {
	public DO(): TerminalNode { return this.getToken(painless_parser.DO, 0); }
	public block(): BlockContext {
		return this.getRuleContext(0, BlockContext);
	}
	public WHILE(): TerminalNode { return this.getToken(painless_parser.WHILE, 0); }
	public LP(): TerminalNode { return this.getToken(painless_parser.LP, 0); }
	public expression(): ExpressionContext {
		return this.getRuleContext(0, ExpressionContext);
	}
	public RP(): TerminalNode { return this.getToken(painless_parser.RP, 0); }
	constructor(ctx: DstatementContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterDo) {
			listener.enterDo(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitDo) {
			listener.exitDo(this);
		}
	}
}
export class DeclContext extends DstatementContext {
	public declaration(): DeclarationContext {
		return this.getRuleContext(0, DeclarationContext);
	}
	constructor(ctx: DstatementContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterDecl) {
			listener.enterDecl(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitDecl) {
			listener.exitDecl(this);
		}
	}
}
export class ContinueContext extends DstatementContext {
	public CONTINUE(): TerminalNode { return this.getToken(painless_parser.CONTINUE, 0); }
	constructor(ctx: DstatementContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterContinue) {
			listener.enterContinue(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitContinue) {
			listener.exitContinue(this);
		}
	}
}
export class BreakContext extends DstatementContext {
	public BREAK(): TerminalNode { return this.getToken(painless_parser.BREAK, 0); }
	constructor(ctx: DstatementContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterBreak) {
			listener.enterBreak(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitBreak) {
			listener.exitBreak(this);
		}
	}
}
export class ReturnContext extends DstatementContext {
	public RETURN(): TerminalNode { return this.getToken(painless_parser.RETURN, 0); }
	public expression(): ExpressionContext | undefined {
		return this.tryGetRuleContext(0, ExpressionContext);
	}
	constructor(ctx: DstatementContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterReturn) {
			listener.enterReturn(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitReturn) {
			listener.exitReturn(this);
		}
	}
}
export class ThrowContext extends DstatementContext {
	public THROW(): TerminalNode { return this.getToken(painless_parser.THROW, 0); }
	public expression(): ExpressionContext {
		return this.getRuleContext(0, ExpressionContext);
	}
	constructor(ctx: DstatementContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterThrow) {
			listener.enterThrow(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitThrow) {
			listener.exitThrow(this);
		}
	}
}
export class ExprContext extends DstatementContext {
	public expression(): ExpressionContext {
		return this.getRuleContext(0, ExpressionContext);
	}
	constructor(ctx: DstatementContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterExpr) {
			listener.enterExpr(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitExpr) {
			listener.exitExpr(this);
		}
	}
}


export class TrailerContext extends ParserRuleContext {
	public block(): BlockContext | undefined {
		return this.tryGetRuleContext(0, BlockContext);
	}
	public statement(): StatementContext | undefined {
		return this.tryGetRuleContext(0, StatementContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_trailer; }
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterTrailer) {
			listener.enterTrailer(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitTrailer) {
			listener.exitTrailer(this);
		}
	}
}


export class BlockContext extends ParserRuleContext {
	public LBRACK(): TerminalNode { return this.getToken(painless_parser.LBRACK, 0); }
	public RBRACK(): TerminalNode { return this.getToken(painless_parser.RBRACK, 0); }
	public statement(): StatementContext[];
	public statement(i: number): StatementContext;
	public statement(i?: number): StatementContext | StatementContext[] {
		if (i === undefined) {
			return this.getRuleContexts(StatementContext);
		} else {
			return this.getRuleContext(i, StatementContext);
		}
	}
	public dstatement(): DstatementContext | undefined {
		return this.tryGetRuleContext(0, DstatementContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_block; }
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterBlock) {
			listener.enterBlock(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitBlock) {
			listener.exitBlock(this);
		}
	}
}


export class EmptyContext extends ParserRuleContext {
	public SEMICOLON(): TerminalNode { return this.getToken(painless_parser.SEMICOLON, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_empty; }
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterEmpty) {
			listener.enterEmpty(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitEmpty) {
			listener.exitEmpty(this);
		}
	}
}


export class InitializerContext extends ParserRuleContext {
	public declaration(): DeclarationContext | undefined {
		return this.tryGetRuleContext(0, DeclarationContext);
	}
	public expression(): ExpressionContext | undefined {
		return this.tryGetRuleContext(0, ExpressionContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_initializer; }
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterInitializer) {
			listener.enterInitializer(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitInitializer) {
			listener.exitInitializer(this);
		}
	}
}


export class AfterthoughtContext extends ParserRuleContext {
	public expression(): ExpressionContext {
		return this.getRuleContext(0, ExpressionContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_afterthought; }
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterAfterthought) {
			listener.enterAfterthought(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitAfterthought) {
			listener.exitAfterthought(this);
		}
	}
}


export class DeclarationContext extends ParserRuleContext {
	public decltype(): DecltypeContext {
		return this.getRuleContext(0, DecltypeContext);
	}
	public declvar(): DeclvarContext[];
	public declvar(i: number): DeclvarContext;
	public declvar(i?: number): DeclvarContext | DeclvarContext[] {
		if (i === undefined) {
			return this.getRuleContexts(DeclvarContext);
		} else {
			return this.getRuleContext(i, DeclvarContext);
		}
	}
	public COMMA(): TerminalNode[];
	public COMMA(i: number): TerminalNode;
	public COMMA(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(painless_parser.COMMA);
		} else {
			return this.getToken(painless_parser.COMMA, i);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_declaration; }
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterDeclaration) {
			listener.enterDeclaration(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitDeclaration) {
			listener.exitDeclaration(this);
		}
	}
}


export class DecltypeContext extends ParserRuleContext {
	public type(): TypeContext {
		return this.getRuleContext(0, TypeContext);
	}
	public LBRACE(): TerminalNode[];
	public LBRACE(i: number): TerminalNode;
	public LBRACE(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(painless_parser.LBRACE);
		} else {
			return this.getToken(painless_parser.LBRACE, i);
		}
	}
	public RBRACE(): TerminalNode[];
	public RBRACE(i: number): TerminalNode;
	public RBRACE(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(painless_parser.RBRACE);
		} else {
			return this.getToken(painless_parser.RBRACE, i);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_decltype; }
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterDecltype) {
			listener.enterDecltype(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitDecltype) {
			listener.exitDecltype(this);
		}
	}
}


export class TypeContext extends ParserRuleContext {
	public DEF(): TerminalNode | undefined { return this.tryGetToken(painless_parser.DEF, 0); }
	public PRIMITIVE(): TerminalNode | undefined { return this.tryGetToken(painless_parser.PRIMITIVE, 0); }
	public ID(): TerminalNode | undefined { return this.tryGetToken(painless_parser.ID, 0); }
	public DOT(): TerminalNode[];
	public DOT(i: number): TerminalNode;
	public DOT(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(painless_parser.DOT);
		} else {
			return this.getToken(painless_parser.DOT, i);
		}
	}
	public DOTID(): TerminalNode[];
	public DOTID(i: number): TerminalNode;
	public DOTID(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(painless_parser.DOTID);
		} else {
			return this.getToken(painless_parser.DOTID, i);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_type; }
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterType) {
			listener.enterType(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitType) {
			listener.exitType(this);
		}
	}
}


export class DeclvarContext extends ParserRuleContext {
	public ID(): TerminalNode { return this.getToken(painless_parser.ID, 0); }
	public ASSIGN(): TerminalNode | undefined { return this.tryGetToken(painless_parser.ASSIGN, 0); }
	public expression(): ExpressionContext | undefined {
		return this.tryGetRuleContext(0, ExpressionContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_declvar; }
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterDeclvar) {
			listener.enterDeclvar(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitDeclvar) {
			listener.exitDeclvar(this);
		}
	}
}


export class TrapContext extends ParserRuleContext {
	public CATCH(): TerminalNode { return this.getToken(painless_parser.CATCH, 0); }
	public LP(): TerminalNode { return this.getToken(painless_parser.LP, 0); }
	public type(): TypeContext {
		return this.getRuleContext(0, TypeContext);
	}
	public ID(): TerminalNode { return this.getToken(painless_parser.ID, 0); }
	public RP(): TerminalNode { return this.getToken(painless_parser.RP, 0); }
	public block(): BlockContext {
		return this.getRuleContext(0, BlockContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_trap; }
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterTrap) {
			listener.enterTrap(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitTrap) {
			listener.exitTrap(this);
		}
	}
}


export class NoncondexpressionContext extends ParserRuleContext {
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_noncondexpression; }
	public copyFrom(ctx: NoncondexpressionContext): void {
		super.copyFrom(ctx);
	}
}
export class SingleContext extends NoncondexpressionContext {
	public unary(): UnaryContext {
		return this.getRuleContext(0, UnaryContext);
	}
	constructor(ctx: NoncondexpressionContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterSingle) {
			listener.enterSingle(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitSingle) {
			listener.exitSingle(this);
		}
	}
}
export class BinaryContext extends NoncondexpressionContext {
	public noncondexpression(): NoncondexpressionContext[];
	public noncondexpression(i: number): NoncondexpressionContext;
	public noncondexpression(i?: number): NoncondexpressionContext | NoncondexpressionContext[] {
		if (i === undefined) {
			return this.getRuleContexts(NoncondexpressionContext);
		} else {
			return this.getRuleContext(i, NoncondexpressionContext);
		}
	}
	public MUL(): TerminalNode | undefined { return this.tryGetToken(painless_parser.MUL, 0); }
	public DIV(): TerminalNode | undefined { return this.tryGetToken(painless_parser.DIV, 0); }
	public REM(): TerminalNode | undefined { return this.tryGetToken(painless_parser.REM, 0); }
	public ADD(): TerminalNode | undefined { return this.tryGetToken(painless_parser.ADD, 0); }
	public SUB(): TerminalNode | undefined { return this.tryGetToken(painless_parser.SUB, 0); }
	public FIND(): TerminalNode | undefined { return this.tryGetToken(painless_parser.FIND, 0); }
	public MATCH(): TerminalNode | undefined { return this.tryGetToken(painless_parser.MATCH, 0); }
	public LSH(): TerminalNode | undefined { return this.tryGetToken(painless_parser.LSH, 0); }
	public RSH(): TerminalNode | undefined { return this.tryGetToken(painless_parser.RSH, 0); }
	public USH(): TerminalNode | undefined { return this.tryGetToken(painless_parser.USH, 0); }
	public BWAND(): TerminalNode | undefined { return this.tryGetToken(painless_parser.BWAND, 0); }
	public XOR(): TerminalNode | undefined { return this.tryGetToken(painless_parser.XOR, 0); }
	public BWOR(): TerminalNode | undefined { return this.tryGetToken(painless_parser.BWOR, 0); }
	constructor(ctx: NoncondexpressionContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterBinary) {
			listener.enterBinary(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitBinary) {
			listener.exitBinary(this);
		}
	}
}
export class CompContext extends NoncondexpressionContext {
	public noncondexpression(): NoncondexpressionContext[];
	public noncondexpression(i: number): NoncondexpressionContext;
	public noncondexpression(i?: number): NoncondexpressionContext | NoncondexpressionContext[] {
		if (i === undefined) {
			return this.getRuleContexts(NoncondexpressionContext);
		} else {
			return this.getRuleContext(i, NoncondexpressionContext);
		}
	}
	public LT(): TerminalNode | undefined { return this.tryGetToken(painless_parser.LT, 0); }
	public LTE(): TerminalNode | undefined { return this.tryGetToken(painless_parser.LTE, 0); }
	public GT(): TerminalNode | undefined { return this.tryGetToken(painless_parser.GT, 0); }
	public GTE(): TerminalNode | undefined { return this.tryGetToken(painless_parser.GTE, 0); }
	public EQ(): TerminalNode | undefined { return this.tryGetToken(painless_parser.EQ, 0); }
	public EQR(): TerminalNode | undefined { return this.tryGetToken(painless_parser.EQR, 0); }
	public NE(): TerminalNode | undefined { return this.tryGetToken(painless_parser.NE, 0); }
	public NER(): TerminalNode | undefined { return this.tryGetToken(painless_parser.NER, 0); }
	constructor(ctx: NoncondexpressionContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterComp) {
			listener.enterComp(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitComp) {
			listener.exitComp(this);
		}
	}
}
export class InstanceofContext extends NoncondexpressionContext {
	public noncondexpression(): NoncondexpressionContext {
		return this.getRuleContext(0, NoncondexpressionContext);
	}
	public INSTANCEOF(): TerminalNode { return this.getToken(painless_parser.INSTANCEOF, 0); }
	public decltype(): DecltypeContext {
		return this.getRuleContext(0, DecltypeContext);
	}
	constructor(ctx: NoncondexpressionContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterInstanceof) {
			listener.enterInstanceof(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitInstanceof) {
			listener.exitInstanceof(this);
		}
	}
}
export class BoolContext extends NoncondexpressionContext {
	public noncondexpression(): NoncondexpressionContext[];
	public noncondexpression(i: number): NoncondexpressionContext;
	public noncondexpression(i?: number): NoncondexpressionContext | NoncondexpressionContext[] {
		if (i === undefined) {
			return this.getRuleContexts(NoncondexpressionContext);
		} else {
			return this.getRuleContext(i, NoncondexpressionContext);
		}
	}
	public BOOLAND(): TerminalNode | undefined { return this.tryGetToken(painless_parser.BOOLAND, 0); }
	public BOOLOR(): TerminalNode | undefined { return this.tryGetToken(painless_parser.BOOLOR, 0); }
	constructor(ctx: NoncondexpressionContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterBool) {
			listener.enterBool(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitBool) {
			listener.exitBool(this);
		}
	}
}
export class ElvisContext extends NoncondexpressionContext {
	public noncondexpression(): NoncondexpressionContext[];
	public noncondexpression(i: number): NoncondexpressionContext;
	public noncondexpression(i?: number): NoncondexpressionContext | NoncondexpressionContext[] {
		if (i === undefined) {
			return this.getRuleContexts(NoncondexpressionContext);
		} else {
			return this.getRuleContext(i, NoncondexpressionContext);
		}
	}
	public ELVIS(): TerminalNode { return this.getToken(painless_parser.ELVIS, 0); }
	constructor(ctx: NoncondexpressionContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterElvis) {
			listener.enterElvis(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitElvis) {
			listener.exitElvis(this);
		}
	}
}


export class ExpressionContext extends ParserRuleContext {
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_expression; }
	public copyFrom(ctx: ExpressionContext): void {
		super.copyFrom(ctx);
	}
}
export class NonconditionalContext extends ExpressionContext {
	public noncondexpression(): NoncondexpressionContext {
		return this.getRuleContext(0, NoncondexpressionContext);
	}
	constructor(ctx: ExpressionContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterNonconditional) {
			listener.enterNonconditional(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitNonconditional) {
			listener.exitNonconditional(this);
		}
	}
}
export class ConditionalContext extends ExpressionContext {
	public noncondexpression(): NoncondexpressionContext {
		return this.getRuleContext(0, NoncondexpressionContext);
	}
	public COND(): TerminalNode { return this.getToken(painless_parser.COND, 0); }
	public expression(): ExpressionContext[];
	public expression(i: number): ExpressionContext;
	public expression(i?: number): ExpressionContext | ExpressionContext[] {
		if (i === undefined) {
			return this.getRuleContexts(ExpressionContext);
		} else {
			return this.getRuleContext(i, ExpressionContext);
		}
	}
	public COLON(): TerminalNode { return this.getToken(painless_parser.COLON, 0); }
	constructor(ctx: ExpressionContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterConditional) {
			listener.enterConditional(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitConditional) {
			listener.exitConditional(this);
		}
	}
}
export class AssignmentContext extends ExpressionContext {
	public noncondexpression(): NoncondexpressionContext {
		return this.getRuleContext(0, NoncondexpressionContext);
	}
	public expression(): ExpressionContext {
		return this.getRuleContext(0, ExpressionContext);
	}
	public ASSIGN(): TerminalNode | undefined { return this.tryGetToken(painless_parser.ASSIGN, 0); }
	public AADD(): TerminalNode | undefined { return this.tryGetToken(painless_parser.AADD, 0); }
	public ASUB(): TerminalNode | undefined { return this.tryGetToken(painless_parser.ASUB, 0); }
	public AMUL(): TerminalNode | undefined { return this.tryGetToken(painless_parser.AMUL, 0); }
	public ADIV(): TerminalNode | undefined { return this.tryGetToken(painless_parser.ADIV, 0); }
	public AREM(): TerminalNode | undefined { return this.tryGetToken(painless_parser.AREM, 0); }
	public AAND(): TerminalNode | undefined { return this.tryGetToken(painless_parser.AAND, 0); }
	public AXOR(): TerminalNode | undefined { return this.tryGetToken(painless_parser.AXOR, 0); }
	public AOR(): TerminalNode | undefined { return this.tryGetToken(painless_parser.AOR, 0); }
	public ALSH(): TerminalNode | undefined { return this.tryGetToken(painless_parser.ALSH, 0); }
	public ARSH(): TerminalNode | undefined { return this.tryGetToken(painless_parser.ARSH, 0); }
	public AUSH(): TerminalNode | undefined { return this.tryGetToken(painless_parser.AUSH, 0); }
	constructor(ctx: ExpressionContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterAssignment) {
			listener.enterAssignment(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitAssignment) {
			listener.exitAssignment(this);
		}
	}
}


export class UnaryContext extends ParserRuleContext {
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_unary; }
	public copyFrom(ctx: UnaryContext): void {
		super.copyFrom(ctx);
	}
}
export class PreContext extends UnaryContext {
	public chain(): ChainContext {
		return this.getRuleContext(0, ChainContext);
	}
	public INCR(): TerminalNode | undefined { return this.tryGetToken(painless_parser.INCR, 0); }
	public DECR(): TerminalNode | undefined { return this.tryGetToken(painless_parser.DECR, 0); }
	constructor(ctx: UnaryContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterPre) {
			listener.enterPre(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitPre) {
			listener.exitPre(this);
		}
	}
}
export class AddsubContext extends UnaryContext {
	public unary(): UnaryContext {
		return this.getRuleContext(0, UnaryContext);
	}
	public ADD(): TerminalNode | undefined { return this.tryGetToken(painless_parser.ADD, 0); }
	public SUB(): TerminalNode | undefined { return this.tryGetToken(painless_parser.SUB, 0); }
	constructor(ctx: UnaryContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterAddsub) {
			listener.enterAddsub(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitAddsub) {
			listener.exitAddsub(this);
		}
	}
}
export class NotaddsubContext extends UnaryContext {
	public unarynotaddsub(): UnarynotaddsubContext {
		return this.getRuleContext(0, UnarynotaddsubContext);
	}
	constructor(ctx: UnaryContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterNotaddsub) {
			listener.enterNotaddsub(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitNotaddsub) {
			listener.exitNotaddsub(this);
		}
	}
}


export class UnarynotaddsubContext extends ParserRuleContext {
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_unarynotaddsub; }
	public copyFrom(ctx: UnarynotaddsubContext): void {
		super.copyFrom(ctx);
	}
}
export class ReadContext extends UnarynotaddsubContext {
	public chain(): ChainContext {
		return this.getRuleContext(0, ChainContext);
	}
	constructor(ctx: UnarynotaddsubContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterRead) {
			listener.enterRead(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitRead) {
			listener.exitRead(this);
		}
	}
}
export class PostContext extends UnarynotaddsubContext {
	public chain(): ChainContext {
		return this.getRuleContext(0, ChainContext);
	}
	public INCR(): TerminalNode | undefined { return this.tryGetToken(painless_parser.INCR, 0); }
	public DECR(): TerminalNode | undefined { return this.tryGetToken(painless_parser.DECR, 0); }
	constructor(ctx: UnarynotaddsubContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterPost) {
			listener.enterPost(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitPost) {
			listener.exitPost(this);
		}
	}
}
export class NotContext extends UnarynotaddsubContext {
	public unary(): UnaryContext {
		return this.getRuleContext(0, UnaryContext);
	}
	public BOOLNOT(): TerminalNode | undefined { return this.tryGetToken(painless_parser.BOOLNOT, 0); }
	public BWNOT(): TerminalNode | undefined { return this.tryGetToken(painless_parser.BWNOT, 0); }
	constructor(ctx: UnarynotaddsubContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterNot) {
			listener.enterNot(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitNot) {
			listener.exitNot(this);
		}
	}
}
export class CastContext extends UnarynotaddsubContext {
	public castexpression(): CastexpressionContext {
		return this.getRuleContext(0, CastexpressionContext);
	}
	constructor(ctx: UnarynotaddsubContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterCast) {
			listener.enterCast(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitCast) {
			listener.exitCast(this);
		}
	}
}


export class CastexpressionContext extends ParserRuleContext {
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_castexpression; }
	public copyFrom(ctx: CastexpressionContext): void {
		super.copyFrom(ctx);
	}
}
export class PrimordefcastContext extends CastexpressionContext {
	public LP(): TerminalNode { return this.getToken(painless_parser.LP, 0); }
	public primordefcasttype(): PrimordefcasttypeContext {
		return this.getRuleContext(0, PrimordefcasttypeContext);
	}
	public RP(): TerminalNode { return this.getToken(painless_parser.RP, 0); }
	public unary(): UnaryContext {
		return this.getRuleContext(0, UnaryContext);
	}
	constructor(ctx: CastexpressionContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterPrimordefcast) {
			listener.enterPrimordefcast(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitPrimordefcast) {
			listener.exitPrimordefcast(this);
		}
	}
}
export class RefcastContext extends CastexpressionContext {
	public LP(): TerminalNode { return this.getToken(painless_parser.LP, 0); }
	public refcasttype(): RefcasttypeContext {
		return this.getRuleContext(0, RefcasttypeContext);
	}
	public RP(): TerminalNode { return this.getToken(painless_parser.RP, 0); }
	public unarynotaddsub(): UnarynotaddsubContext {
		return this.getRuleContext(0, UnarynotaddsubContext);
	}
	constructor(ctx: CastexpressionContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterRefcast) {
			listener.enterRefcast(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitRefcast) {
			listener.exitRefcast(this);
		}
	}
}


export class PrimordefcasttypeContext extends ParserRuleContext {
	public DEF(): TerminalNode | undefined { return this.tryGetToken(painless_parser.DEF, 0); }
	public PRIMITIVE(): TerminalNode | undefined { return this.tryGetToken(painless_parser.PRIMITIVE, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_primordefcasttype; }
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterPrimordefcasttype) {
			listener.enterPrimordefcasttype(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitPrimordefcasttype) {
			listener.exitPrimordefcasttype(this);
		}
	}
}


export class RefcasttypeContext extends ParserRuleContext {
	public DEF(): TerminalNode | undefined { return this.tryGetToken(painless_parser.DEF, 0); }
	public LBRACE(): TerminalNode[];
	public LBRACE(i: number): TerminalNode;
	public LBRACE(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(painless_parser.LBRACE);
		} else {
			return this.getToken(painless_parser.LBRACE, i);
		}
	}
	public RBRACE(): TerminalNode[];
	public RBRACE(i: number): TerminalNode;
	public RBRACE(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(painless_parser.RBRACE);
		} else {
			return this.getToken(painless_parser.RBRACE, i);
		}
	}
	public PRIMITIVE(): TerminalNode | undefined { return this.tryGetToken(painless_parser.PRIMITIVE, 0); }
	public ID(): TerminalNode | undefined { return this.tryGetToken(painless_parser.ID, 0); }
	public DOT(): TerminalNode[];
	public DOT(i: number): TerminalNode;
	public DOT(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(painless_parser.DOT);
		} else {
			return this.getToken(painless_parser.DOT, i);
		}
	}
	public DOTID(): TerminalNode[];
	public DOTID(i: number): TerminalNode;
	public DOTID(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(painless_parser.DOTID);
		} else {
			return this.getToken(painless_parser.DOTID, i);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_refcasttype; }
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterRefcasttype) {
			listener.enterRefcasttype(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitRefcasttype) {
			listener.exitRefcasttype(this);
		}
	}
}


export class ChainContext extends ParserRuleContext {
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_chain; }
	public copyFrom(ctx: ChainContext): void {
		super.copyFrom(ctx);
	}
}
export class DynamicContext extends ChainContext {
	public primary(): PrimaryContext {
		return this.getRuleContext(0, PrimaryContext);
	}
	public postfix(): PostfixContext[];
	public postfix(i: number): PostfixContext;
	public postfix(i?: number): PostfixContext | PostfixContext[] {
		if (i === undefined) {
			return this.getRuleContexts(PostfixContext);
		} else {
			return this.getRuleContext(i, PostfixContext);
		}
	}
	constructor(ctx: ChainContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterDynamic) {
			listener.enterDynamic(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitDynamic) {
			listener.exitDynamic(this);
		}
	}
}
export class NewarrayContext extends ChainContext {
	public arrayinitializer(): ArrayinitializerContext {
		return this.getRuleContext(0, ArrayinitializerContext);
	}
	constructor(ctx: ChainContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterNewarray) {
			listener.enterNewarray(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitNewarray) {
			listener.exitNewarray(this);
		}
	}
}


export class PrimaryContext extends ParserRuleContext {
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_primary; }
	public copyFrom(ctx: PrimaryContext): void {
		super.copyFrom(ctx);
	}
}
export class PrecedenceContext extends PrimaryContext {
	public LP(): TerminalNode { return this.getToken(painless_parser.LP, 0); }
	public expression(): ExpressionContext {
		return this.getRuleContext(0, ExpressionContext);
	}
	public RP(): TerminalNode { return this.getToken(painless_parser.RP, 0); }
	constructor(ctx: PrimaryContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterPrecedence) {
			listener.enterPrecedence(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitPrecedence) {
			listener.exitPrecedence(this);
		}
	}
}
export class NumericContext extends PrimaryContext {
	public OCTAL(): TerminalNode | undefined { return this.tryGetToken(painless_parser.OCTAL, 0); }
	public HEX(): TerminalNode | undefined { return this.tryGetToken(painless_parser.HEX, 0); }
	public INTEGER(): TerminalNode | undefined { return this.tryGetToken(painless_parser.INTEGER, 0); }
	public DECIMAL(): TerminalNode | undefined { return this.tryGetToken(painless_parser.DECIMAL, 0); }
	constructor(ctx: PrimaryContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterNumeric) {
			listener.enterNumeric(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitNumeric) {
			listener.exitNumeric(this);
		}
	}
}
export class TrueContext extends PrimaryContext {
	public TRUE(): TerminalNode { return this.getToken(painless_parser.TRUE, 0); }
	constructor(ctx: PrimaryContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterTrue) {
			listener.enterTrue(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitTrue) {
			listener.exitTrue(this);
		}
	}
}
export class FalseContext extends PrimaryContext {
	public FALSE(): TerminalNode { return this.getToken(painless_parser.FALSE, 0); }
	constructor(ctx: PrimaryContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterFalse) {
			listener.enterFalse(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitFalse) {
			listener.exitFalse(this);
		}
	}
}
export class NullContext extends PrimaryContext {
	public NULL(): TerminalNode { return this.getToken(painless_parser.NULL, 0); }
	constructor(ctx: PrimaryContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterNull) {
			listener.enterNull(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitNull) {
			listener.exitNull(this);
		}
	}
}
export class StringContext extends PrimaryContext {
	public STRING(): TerminalNode { return this.getToken(painless_parser.STRING, 0); }
	constructor(ctx: PrimaryContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterString) {
			listener.enterString(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitString) {
			listener.exitString(this);
		}
	}
}
export class RegexContext extends PrimaryContext {
	public REGEX(): TerminalNode { return this.getToken(painless_parser.REGEX, 0); }
	constructor(ctx: PrimaryContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterRegex) {
			listener.enterRegex(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitRegex) {
			listener.exitRegex(this);
		}
	}
}
export class ListinitContext extends PrimaryContext {
	public listinitializer(): ListinitializerContext {
		return this.getRuleContext(0, ListinitializerContext);
	}
	constructor(ctx: PrimaryContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterListinit) {
			listener.enterListinit(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitListinit) {
			listener.exitListinit(this);
		}
	}
}
export class MapinitContext extends PrimaryContext {
	public mapinitializer(): MapinitializerContext {
		return this.getRuleContext(0, MapinitializerContext);
	}
	constructor(ctx: PrimaryContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterMapinit) {
			listener.enterMapinit(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitMapinit) {
			listener.exitMapinit(this);
		}
	}
}
export class VariableContext extends PrimaryContext {
	public ID(): TerminalNode { return this.getToken(painless_parser.ID, 0); }
	constructor(ctx: PrimaryContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterVariable) {
			listener.enterVariable(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitVariable) {
			listener.exitVariable(this);
		}
	}
}
export class CalllocalContext extends PrimaryContext {
	public arguments(): ArgumentsContext {
		return this.getRuleContext(0, ArgumentsContext);
	}
	public ID(): TerminalNode | undefined { return this.tryGetToken(painless_parser.ID, 0); }
	public DOLLAR(): TerminalNode | undefined { return this.tryGetToken(painless_parser.DOLLAR, 0); }
	constructor(ctx: PrimaryContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterCalllocal) {
			listener.enterCalllocal(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitCalllocal) {
			listener.exitCalllocal(this);
		}
	}
}
export class NewobjectContext extends PrimaryContext {
	public NEW(): TerminalNode { return this.getToken(painless_parser.NEW, 0); }
	public type(): TypeContext {
		return this.getRuleContext(0, TypeContext);
	}
	public arguments(): ArgumentsContext {
		return this.getRuleContext(0, ArgumentsContext);
	}
	constructor(ctx: PrimaryContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterNewobject) {
			listener.enterNewobject(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitNewobject) {
			listener.exitNewobject(this);
		}
	}
}


export class PostfixContext extends ParserRuleContext {
	public callinvoke(): CallinvokeContext | undefined {
		return this.tryGetRuleContext(0, CallinvokeContext);
	}
	public fieldaccess(): FieldaccessContext | undefined {
		return this.tryGetRuleContext(0, FieldaccessContext);
	}
	public braceaccess(): BraceaccessContext | undefined {
		return this.tryGetRuleContext(0, BraceaccessContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_postfix; }
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterPostfix) {
			listener.enterPostfix(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitPostfix) {
			listener.exitPostfix(this);
		}
	}
}


export class PostdotContext extends ParserRuleContext {
	public callinvoke(): CallinvokeContext | undefined {
		return this.tryGetRuleContext(0, CallinvokeContext);
	}
	public fieldaccess(): FieldaccessContext | undefined {
		return this.tryGetRuleContext(0, FieldaccessContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_postdot; }
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterPostdot) {
			listener.enterPostdot(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitPostdot) {
			listener.exitPostdot(this);
		}
	}
}


export class CallinvokeContext extends ParserRuleContext {
	public DOTID(): TerminalNode { return this.getToken(painless_parser.DOTID, 0); }
	public arguments(): ArgumentsContext {
		return this.getRuleContext(0, ArgumentsContext);
	}
	public DOT(): TerminalNode | undefined { return this.tryGetToken(painless_parser.DOT, 0); }
	public NSDOT(): TerminalNode | undefined { return this.tryGetToken(painless_parser.NSDOT, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_callinvoke; }
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterCallinvoke) {
			listener.enterCallinvoke(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitCallinvoke) {
			listener.exitCallinvoke(this);
		}
	}
}


export class FieldaccessContext extends ParserRuleContext {
	public DOT(): TerminalNode | undefined { return this.tryGetToken(painless_parser.DOT, 0); }
	public NSDOT(): TerminalNode | undefined { return this.tryGetToken(painless_parser.NSDOT, 0); }
	public DOTID(): TerminalNode | undefined { return this.tryGetToken(painless_parser.DOTID, 0); }
	public DOTINTEGER(): TerminalNode | undefined { return this.tryGetToken(painless_parser.DOTINTEGER, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_fieldaccess; }
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterFieldaccess) {
			listener.enterFieldaccess(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitFieldaccess) {
			listener.exitFieldaccess(this);
		}
	}
}


export class BraceaccessContext extends ParserRuleContext {
	public LBRACE(): TerminalNode { return this.getToken(painless_parser.LBRACE, 0); }
	public expression(): ExpressionContext {
		return this.getRuleContext(0, ExpressionContext);
	}
	public RBRACE(): TerminalNode { return this.getToken(painless_parser.RBRACE, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_braceaccess; }
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterBraceaccess) {
			listener.enterBraceaccess(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitBraceaccess) {
			listener.exitBraceaccess(this);
		}
	}
}


export class ArrayinitializerContext extends ParserRuleContext {
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_arrayinitializer; }
	public copyFrom(ctx: ArrayinitializerContext): void {
		super.copyFrom(ctx);
	}
}
export class NewstandardarrayContext extends ArrayinitializerContext {
	public NEW(): TerminalNode { return this.getToken(painless_parser.NEW, 0); }
	public type(): TypeContext {
		return this.getRuleContext(0, TypeContext);
	}
	public LBRACE(): TerminalNode[];
	public LBRACE(i: number): TerminalNode;
	public LBRACE(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(painless_parser.LBRACE);
		} else {
			return this.getToken(painless_parser.LBRACE, i);
		}
	}
	public expression(): ExpressionContext[];
	public expression(i: number): ExpressionContext;
	public expression(i?: number): ExpressionContext | ExpressionContext[] {
		if (i === undefined) {
			return this.getRuleContexts(ExpressionContext);
		} else {
			return this.getRuleContext(i, ExpressionContext);
		}
	}
	public RBRACE(): TerminalNode[];
	public RBRACE(i: number): TerminalNode;
	public RBRACE(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(painless_parser.RBRACE);
		} else {
			return this.getToken(painless_parser.RBRACE, i);
		}
	}
	public postdot(): PostdotContext | undefined {
		return this.tryGetRuleContext(0, PostdotContext);
	}
	public postfix(): PostfixContext[];
	public postfix(i: number): PostfixContext;
	public postfix(i?: number): PostfixContext | PostfixContext[] {
		if (i === undefined) {
			return this.getRuleContexts(PostfixContext);
		} else {
			return this.getRuleContext(i, PostfixContext);
		}
	}
	constructor(ctx: ArrayinitializerContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterNewstandardarray) {
			listener.enterNewstandardarray(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitNewstandardarray) {
			listener.exitNewstandardarray(this);
		}
	}
}
export class NewinitializedarrayContext extends ArrayinitializerContext {
	public NEW(): TerminalNode { return this.getToken(painless_parser.NEW, 0); }
	public type(): TypeContext {
		return this.getRuleContext(0, TypeContext);
	}
	public LBRACE(): TerminalNode { return this.getToken(painless_parser.LBRACE, 0); }
	public RBRACE(): TerminalNode { return this.getToken(painless_parser.RBRACE, 0); }
	public LBRACK(): TerminalNode { return this.getToken(painless_parser.LBRACK, 0); }
	public RBRACK(): TerminalNode { return this.getToken(painless_parser.RBRACK, 0); }
	public expression(): ExpressionContext[];
	public expression(i: number): ExpressionContext;
	public expression(i?: number): ExpressionContext | ExpressionContext[] {
		if (i === undefined) {
			return this.getRuleContexts(ExpressionContext);
		} else {
			return this.getRuleContext(i, ExpressionContext);
		}
	}
	public postfix(): PostfixContext[];
	public postfix(i: number): PostfixContext;
	public postfix(i?: number): PostfixContext | PostfixContext[] {
		if (i === undefined) {
			return this.getRuleContexts(PostfixContext);
		} else {
			return this.getRuleContext(i, PostfixContext);
		}
	}
	public COMMA(): TerminalNode[];
	public COMMA(i: number): TerminalNode;
	public COMMA(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(painless_parser.COMMA);
		} else {
			return this.getToken(painless_parser.COMMA, i);
		}
	}
	constructor(ctx: ArrayinitializerContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterNewinitializedarray) {
			listener.enterNewinitializedarray(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitNewinitializedarray) {
			listener.exitNewinitializedarray(this);
		}
	}
}


export class ListinitializerContext extends ParserRuleContext {
	public LBRACE(): TerminalNode { return this.getToken(painless_parser.LBRACE, 0); }
	public expression(): ExpressionContext[];
	public expression(i: number): ExpressionContext;
	public expression(i?: number): ExpressionContext | ExpressionContext[] {
		if (i === undefined) {
			return this.getRuleContexts(ExpressionContext);
		} else {
			return this.getRuleContext(i, ExpressionContext);
		}
	}
	public RBRACE(): TerminalNode { return this.getToken(painless_parser.RBRACE, 0); }
	public COMMA(): TerminalNode[];
	public COMMA(i: number): TerminalNode;
	public COMMA(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(painless_parser.COMMA);
		} else {
			return this.getToken(painless_parser.COMMA, i);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_listinitializer; }
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterListinitializer) {
			listener.enterListinitializer(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitListinitializer) {
			listener.exitListinitializer(this);
		}
	}
}


export class MapinitializerContext extends ParserRuleContext {
	public LBRACE(): TerminalNode { return this.getToken(painless_parser.LBRACE, 0); }
	public maptoken(): MaptokenContext[];
	public maptoken(i: number): MaptokenContext;
	public maptoken(i?: number): MaptokenContext | MaptokenContext[] {
		if (i === undefined) {
			return this.getRuleContexts(MaptokenContext);
		} else {
			return this.getRuleContext(i, MaptokenContext);
		}
	}
	public RBRACE(): TerminalNode { return this.getToken(painless_parser.RBRACE, 0); }
	public COMMA(): TerminalNode[];
	public COMMA(i: number): TerminalNode;
	public COMMA(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(painless_parser.COMMA);
		} else {
			return this.getToken(painless_parser.COMMA, i);
		}
	}
	public COLON(): TerminalNode | undefined { return this.tryGetToken(painless_parser.COLON, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_mapinitializer; }
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterMapinitializer) {
			listener.enterMapinitializer(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitMapinitializer) {
			listener.exitMapinitializer(this);
		}
	}
}


export class MaptokenContext extends ParserRuleContext {
	public expression(): ExpressionContext[];
	public expression(i: number): ExpressionContext;
	public expression(i?: number): ExpressionContext | ExpressionContext[] {
		if (i === undefined) {
			return this.getRuleContexts(ExpressionContext);
		} else {
			return this.getRuleContext(i, ExpressionContext);
		}
	}
	public COLON(): TerminalNode { return this.getToken(painless_parser.COLON, 0); }
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_maptoken; }
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterMaptoken) {
			listener.enterMaptoken(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitMaptoken) {
			listener.exitMaptoken(this);
		}
	}
}


export class ArgumentsContext extends ParserRuleContext {
	public LP(): TerminalNode | undefined { return this.tryGetToken(painless_parser.LP, 0); }
	public RP(): TerminalNode | undefined { return this.tryGetToken(painless_parser.RP, 0); }
	public argument(): ArgumentContext[];
	public argument(i: number): ArgumentContext;
	public argument(i?: number): ArgumentContext | ArgumentContext[] {
		if (i === undefined) {
			return this.getRuleContexts(ArgumentContext);
		} else {
			return this.getRuleContext(i, ArgumentContext);
		}
	}
	public COMMA(): TerminalNode[];
	public COMMA(i: number): TerminalNode;
	public COMMA(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(painless_parser.COMMA);
		} else {
			return this.getToken(painless_parser.COMMA, i);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_arguments; }
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterArguments) {
			listener.enterArguments(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitArguments) {
			listener.exitArguments(this);
		}
	}
}


export class ArgumentContext extends ParserRuleContext {
	public expression(): ExpressionContext | undefined {
		return this.tryGetRuleContext(0, ExpressionContext);
	}
	public lambda(): LambdaContext | undefined {
		return this.tryGetRuleContext(0, LambdaContext);
	}
	public funcref(): FuncrefContext | undefined {
		return this.tryGetRuleContext(0, FuncrefContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_argument; }
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterArgument) {
			listener.enterArgument(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitArgument) {
			listener.exitArgument(this);
		}
	}
}


export class LambdaContext extends ParserRuleContext {
	public ARROW(): TerminalNode { return this.getToken(painless_parser.ARROW, 0); }
	public lamtype(): LamtypeContext[];
	public lamtype(i: number): LamtypeContext;
	public lamtype(i?: number): LamtypeContext | LamtypeContext[] {
		if (i === undefined) {
			return this.getRuleContexts(LamtypeContext);
		} else {
			return this.getRuleContext(i, LamtypeContext);
		}
	}
	public LP(): TerminalNode | undefined { return this.tryGetToken(painless_parser.LP, 0); }
	public RP(): TerminalNode | undefined { return this.tryGetToken(painless_parser.RP, 0); }
	public block(): BlockContext | undefined {
		return this.tryGetRuleContext(0, BlockContext);
	}
	public expression(): ExpressionContext | undefined {
		return this.tryGetRuleContext(0, ExpressionContext);
	}
	public COMMA(): TerminalNode[];
	public COMMA(i: number): TerminalNode;
	public COMMA(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(painless_parser.COMMA);
		} else {
			return this.getToken(painless_parser.COMMA, i);
		}
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_lambda; }
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterLambda) {
			listener.enterLambda(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitLambda) {
			listener.exitLambda(this);
		}
	}
}


export class LamtypeContext extends ParserRuleContext {
	public ID(): TerminalNode { return this.getToken(painless_parser.ID, 0); }
	public decltype(): DecltypeContext | undefined {
		return this.tryGetRuleContext(0, DecltypeContext);
	}
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_lamtype; }
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterLamtype) {
			listener.enterLamtype(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitLamtype) {
			listener.exitLamtype(this);
		}
	}
}


export class FuncrefContext extends ParserRuleContext {
	constructor(parent: ParserRuleContext | undefined, invokingState: number) {
		super(parent, invokingState);
	}
	// @Override
	public get ruleIndex(): number { return painless_parser.RULE_funcref; }
	public copyFrom(ctx: FuncrefContext): void {
		super.copyFrom(ctx);
	}
}
export class ClassfuncrefContext extends FuncrefContext {
	public decltype(): DecltypeContext {
		return this.getRuleContext(0, DecltypeContext);
	}
	public REF(): TerminalNode { return this.getToken(painless_parser.REF, 0); }
	public ID(): TerminalNode { return this.getToken(painless_parser.ID, 0); }
	constructor(ctx: FuncrefContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterClassfuncref) {
			listener.enterClassfuncref(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitClassfuncref) {
			listener.exitClassfuncref(this);
		}
	}
}
export class ConstructorfuncrefContext extends FuncrefContext {
	public decltype(): DecltypeContext {
		return this.getRuleContext(0, DecltypeContext);
	}
	public REF(): TerminalNode { return this.getToken(painless_parser.REF, 0); }
	public NEW(): TerminalNode { return this.getToken(painless_parser.NEW, 0); }
	constructor(ctx: FuncrefContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterConstructorfuncref) {
			listener.enterConstructorfuncref(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitConstructorfuncref) {
			listener.exitConstructorfuncref(this);
		}
	}
}
export class LocalfuncrefContext extends FuncrefContext {
	public THIS(): TerminalNode { return this.getToken(painless_parser.THIS, 0); }
	public REF(): TerminalNode { return this.getToken(painless_parser.REF, 0); }
	public ID(): TerminalNode { return this.getToken(painless_parser.ID, 0); }
	constructor(ctx: FuncrefContext) {
		super(ctx.parent, ctx.invokingState);
		this.copyFrom(ctx);
	}
	// @Override
	public enterRule(listener: painless_parserListener): void {
		if (listener.enterLocalfuncref) {
			listener.enterLocalfuncref(this);
		}
	}
	// @Override
	public exitRule(listener: painless_parserListener): void {
		if (listener.exitLocalfuncref) {
			listener.exitLocalfuncref(this);
		}
	}
}


