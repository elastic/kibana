// @ts-nocheck
// Generated from ./src/painless/antlr/painless_parser.g4 by ANTLR 4.13.1
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
import painless_parserListener from "./painless_parserListener.js";
// for running tests with parameters, TODO: discuss strategy for typed parameters in CI
// eslint-disable-next-line no-unused-vars
type int = number;

export default class painless_parser extends Parser {
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
	public static readonly EOF = Token.EOF;
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
	public static readonly literalNames: (string | null)[] = [ null, null, 
                                                            null, "'{'", 
                                                            "'}'", "'['", 
                                                            "']'", "'('", 
                                                            "')'", "'$'", 
                                                            "'.'", "'?.'", 
                                                            "','", "';'", 
                                                            "'if'", "'in'", 
                                                            "'else'", "'while'", 
                                                            "'do'", "'for'", 
                                                            "'continue'", 
                                                            "'break'", "'return'", 
                                                            "'new'", "'try'", 
                                                            "'catch'", "'throw'", 
                                                            "'this'", "'instanceof'", 
                                                            "'!'", "'~'", 
                                                            "'*'", "'/'", 
                                                            "'%'", "'+'", 
                                                            "'-'", "'<<'", 
                                                            "'>>'", "'>>>'", 
                                                            "'<'", "'<='", 
                                                            "'>'", "'>='", 
                                                            "'=='", "'==='", 
                                                            "'!='", "'!=='", 
                                                            "'&'", "'^'", 
                                                            "'|'", "'&&'", 
                                                            "'||'", "'?'", 
                                                            "':'", "'?:'", 
                                                            "'::'", "'->'", 
                                                            "'=~'", "'==~'", 
                                                            "'++'", "'--'", 
                                                            "'='", "'+='", 
                                                            "'-='", "'*='", 
                                                            "'/='", "'%='", 
                                                            "'&='", "'^='", 
                                                            "'|='", "'<<='", 
                                                            "'>>='", "'>>>='", 
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            "'true'", "'false'", 
                                                            "'null'", null, 
                                                            "'def'" ];
	public static readonly symbolicNames: (string | null)[] = [ null, "WS", 
                                                             "COMMENT", 
                                                             "LBRACK", "RBRACK", 
                                                             "LBRACE", "RBRACE", 
                                                             "LP", "RP", 
                                                             "DOLLAR", "DOT", 
                                                             "NSDOT", "COMMA", 
                                                             "SEMICOLON", 
                                                             "IF", "IN", 
                                                             "ELSE", "WHILE", 
                                                             "DO", "FOR", 
                                                             "CONTINUE", 
                                                             "BREAK", "RETURN", 
                                                             "NEW", "TRY", 
                                                             "CATCH", "THROW", 
                                                             "THIS", "INSTANCEOF", 
                                                             "BOOLNOT", 
                                                             "BWNOT", "MUL", 
                                                             "DIV", "REM", 
                                                             "ADD", "SUB", 
                                                             "LSH", "RSH", 
                                                             "USH", "LT", 
                                                             "LTE", "GT", 
                                                             "GTE", "EQ", 
                                                             "EQR", "NE", 
                                                             "NER", "BWAND", 
                                                             "XOR", "BWOR", 
                                                             "BOOLAND", 
                                                             "BOOLOR", "COND", 
                                                             "COLON", "ELVIS", 
                                                             "REF", "ARROW", 
                                                             "FIND", "MATCH", 
                                                             "INCR", "DECR", 
                                                             "ASSIGN", "AADD", 
                                                             "ASUB", "AMUL", 
                                                             "ADIV", "AREM", 
                                                             "AAND", "AXOR", 
                                                             "AOR", "ALSH", 
                                                             "ARSH", "AUSH", 
                                                             "OCTAL", "HEX", 
                                                             "INTEGER", 
                                                             "DECIMAL", 
                                                             "STRING", "REGEX", 
                                                             "TRUE", "FALSE", 
                                                             "NULL", "PRIMITIVE", 
                                                             "DEF", "ID", 
                                                             "DOTINTEGER", 
                                                             "DOTID" ];
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
	public get grammarFileName(): string { return "painless_parser.g4"; }
	public get literalNames(): (string | null)[] { return painless_parser.literalNames; }
	public get symbolicNames(): (string | null)[] { return painless_parser.symbolicNames; }
	public get ruleNames(): string[] { return painless_parser.ruleNames; }
	public get serializedATN(): number[] { return painless_parser._serializedATN; }

	protected createFailedPredicateException(predicate?: string, message?: string): FailedPredicateException {
		return new FailedPredicateException(this, predicate, message);
	}

	constructor(input: TokenStream) {
		super(input);
		this._interp = new ParserATNSimulator(this, painless_parser._ATN, painless_parser.DecisionsToDFA, new PredictionContextCache());
	}
	// @RuleVersion(0)
	public source(): SourceContext {
		let localctx: SourceContext = new SourceContext(this, this._ctx, this.state);
		this.enterRule(localctx, 0, painless_parser.RULE_source);
		let _la: number;
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 81;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 0, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 78;
					this.function_();
					}
					}
				}
				this.state = 83;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 0, this._ctx);
			}
			this.state = 87;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (((((_la - 5)) & ~0x1F) === 0 && ((1 << (_la - 5)) & 1664086549) !== 0) || ((((_la - 59)) & ~0x1F) === 0 && ((1 << (_la - 59)) & 67092483) !== 0)) {
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
		this.enterRule(localctx, 2, painless_parser.RULE_function);
		try {
			this.enterOuterAlt(localctx, 1);
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
	public parameters(): ParametersContext {
		let localctx: ParametersContext = new ParametersContext(this, this._ctx, this.state);
		this.enterRule(localctx, 4, painless_parser.RULE_parameters);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 97;
			this.match(painless_parser.LP);
			this.state = 109;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (((((_la - 82)) & ~0x1F) === 0 && ((1 << (_la - 82)) & 7) !== 0)) {
				{
				this.state = 98;
				this.decltype();
				this.state = 99;
				this.match(painless_parser.ID);
				this.state = 106;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===12) {
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
	public statement(): StatementContext {
		let localctx: StatementContext = new StatementContext(this, this._ctx, this.state);
		this.enterRule(localctx, 6, painless_parser.RULE_statement);
		let _la: number;
		try {
			this.state = 117;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 14:
			case 17:
			case 19:
			case 24:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 113;
				this.rstatement();
				}
				break;
			case 5:
			case 7:
			case 9:
			case 18:
			case 20:
			case 21:
			case 22:
			case 23:
			case 26:
			case 29:
			case 30:
			case 34:
			case 35:
			case 59:
			case 60:
			case 73:
			case 74:
			case 75:
			case 76:
			case 77:
			case 78:
			case 79:
			case 80:
			case 81:
			case 82:
			case 83:
			case 84:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 114;
				this.dstatement();
				this.state = 115;
				_la = this._input.LA(1);
				if(!(_la===-1 || _la===13)) {
				this._errHandler.recoverInline(this);
				}
				else {
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
	public rstatement(): RstatementContext {
		let localctx: RstatementContext = new RstatementContext(this, this._ctx, this.state);
		this.enterRule(localctx, 8, painless_parser.RULE_rstatement);
		let _la: number;
		try {
			let _alt: number;
			this.state = 179;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 12, this._ctx) ) {
			case 1:
				localctx = new IfContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
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
				switch ( this._interp.adaptivePredict(this._input, 5, this._ctx) ) {
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
						throw this.createFailedPredicateException(" this._input.LA(1) != painless_parser.ELSE ");
					}
					}
					break;
				}
				}
				break;
			case 2:
				localctx = new WhileContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
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
				case 3:
				case 5:
				case 7:
				case 9:
				case 14:
				case 17:
				case 18:
				case 19:
				case 20:
				case 21:
				case 22:
				case 23:
				case 24:
				case 26:
				case 29:
				case 30:
				case 34:
				case 35:
				case 59:
				case 60:
				case 73:
				case 74:
				case 75:
				case 76:
				case 77:
				case 78:
				case 79:
				case 80:
				case 81:
				case 82:
				case 83:
				case 84:
					{
					this.state = 133;
					this.trailer();
					}
					break;
				case 13:
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
				localctx = new ForContext(this, localctx);
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 137;
				this.match(painless_parser.FOR);
				this.state = 138;
				this.match(painless_parser.LP);
				this.state = 140;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (((((_la - 5)) & ~0x1F) === 0 && ((1 << (_la - 5)) & 1661206549) !== 0) || ((((_la - 59)) & ~0x1F) === 0 && ((1 << (_la - 59)) & 67092483) !== 0)) {
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
				if (((((_la - 5)) & ~0x1F) === 0 && ((1 << (_la - 5)) & 1661206549) !== 0) || ((((_la - 59)) & ~0x1F) === 0 && ((1 << (_la - 59)) & 41926659) !== 0)) {
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
				if (((((_la - 5)) & ~0x1F) === 0 && ((1 << (_la - 5)) & 1661206549) !== 0) || ((((_la - 59)) & ~0x1F) === 0 && ((1 << (_la - 59)) & 41926659) !== 0)) {
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
				case 3:
				case 5:
				case 7:
				case 9:
				case 14:
				case 17:
				case 18:
				case 19:
				case 20:
				case 21:
				case 22:
				case 23:
				case 24:
				case 26:
				case 29:
				case 30:
				case 34:
				case 35:
				case 59:
				case 60:
				case 73:
				case 74:
				case 75:
				case 76:
				case 77:
				case 78:
				case 79:
				case 80:
				case 81:
				case 82:
				case 83:
				case 84:
					{
					this.state = 151;
					this.trailer();
					}
					break;
				case 13:
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
				localctx = new EachContext(this, localctx);
				this.enterOuterAlt(localctx, 4);
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
				localctx = new IneachContext(this, localctx);
				this.enterOuterAlt(localctx, 5);
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
				localctx = new TryContext(this, localctx);
				this.enterOuterAlt(localctx, 6);
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
					_alt = this._interp.adaptivePredict(this._input, 11, this._ctx);
				} while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER);
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
	public dstatement(): DstatementContext {
		let localctx: DstatementContext = new DstatementContext(this, this._ctx, this.state);
		this.enterRule(localctx, 10, painless_parser.RULE_dstatement);
		let _la: number;
		try {
			this.state = 198;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 14, this._ctx) ) {
			case 1:
				localctx = new DoContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
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
				localctx = new DeclContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 188;
				this.declaration();
				}
				break;
			case 3:
				localctx = new ContinueContext(this, localctx);
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 189;
				this.match(painless_parser.CONTINUE);
				}
				break;
			case 4:
				localctx = new BreakContext(this, localctx);
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 190;
				this.match(painless_parser.BREAK);
				}
				break;
			case 5:
				localctx = new ReturnContext(this, localctx);
				this.enterOuterAlt(localctx, 5);
				{
				this.state = 191;
				this.match(painless_parser.RETURN);
				this.state = 193;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (((((_la - 5)) & ~0x1F) === 0 && ((1 << (_la - 5)) & 1661206549) !== 0) || ((((_la - 59)) & ~0x1F) === 0 && ((1 << (_la - 59)) & 41926659) !== 0)) {
					{
					this.state = 192;
					this.expression();
					}
				}

				}
				break;
			case 6:
				localctx = new ThrowContext(this, localctx);
				this.enterOuterAlt(localctx, 6);
				{
				this.state = 195;
				this.match(painless_parser.THROW);
				this.state = 196;
				this.expression();
				}
				break;
			case 7:
				localctx = new ExprContext(this, localctx);
				this.enterOuterAlt(localctx, 7);
				{
				this.state = 197;
				this.expression();
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
	public trailer(): TrailerContext {
		let localctx: TrailerContext = new TrailerContext(this, this._ctx, this.state);
		this.enterRule(localctx, 12, painless_parser.RULE_trailer);
		try {
			this.state = 202;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 3:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 200;
				this.block();
				}
				break;
			case 5:
			case 7:
			case 9:
			case 14:
			case 17:
			case 18:
			case 19:
			case 20:
			case 21:
			case 22:
			case 23:
			case 24:
			case 26:
			case 29:
			case 30:
			case 34:
			case 35:
			case 59:
			case 60:
			case 73:
			case 74:
			case 75:
			case 76:
			case 77:
			case 78:
			case 79:
			case 80:
			case 81:
			case 82:
			case 83:
			case 84:
				this.enterOuterAlt(localctx, 2);
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
	public block(): BlockContext {
		let localctx: BlockContext = new BlockContext(this, this._ctx, this.state);
		this.enterRule(localctx, 14, painless_parser.RULE_block);
		let _la: number;
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 204;
			this.match(painless_parser.LBRACK);
			this.state = 208;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 16, this._ctx);
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
				_alt = this._interp.adaptivePredict(this._input, 16, this._ctx);
			}
			this.state = 212;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (((((_la - 5)) & ~0x1F) === 0 && ((1 << (_la - 5)) & 1663541269) !== 0) || ((((_la - 59)) & ~0x1F) === 0 && ((1 << (_la - 59)) & 67092483) !== 0)) {
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
	public empty(): EmptyContext {
		let localctx: EmptyContext = new EmptyContext(this, this._ctx, this.state);
		this.enterRule(localctx, 16, painless_parser.RULE_empty);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 216;
			this.match(painless_parser.SEMICOLON);
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
	public initializer(): InitializerContext {
		let localctx: InitializerContext = new InitializerContext(this, this._ctx, this.state);
		this.enterRule(localctx, 18, painless_parser.RULE_initializer);
		try {
			this.state = 220;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 18, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 218;
				this.declaration();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 219;
				this.expression();
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
	public afterthought(): AfterthoughtContext {
		let localctx: AfterthoughtContext = new AfterthoughtContext(this, this._ctx, this.state);
		this.enterRule(localctx, 20, painless_parser.RULE_afterthought);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 222;
			this.expression();
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
	public declaration(): DeclarationContext {
		let localctx: DeclarationContext = new DeclarationContext(this, this._ctx, this.state);
		this.enterRule(localctx, 22, painless_parser.RULE_declaration);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 224;
			this.decltype();
			this.state = 225;
			this.declvar();
			this.state = 230;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===12) {
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
	public decltype(): DecltypeContext {
		let localctx: DecltypeContext = new DecltypeContext(this, this._ctx, this.state);
		this.enterRule(localctx, 24, painless_parser.RULE_decltype);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 233;
			this.type_();
			this.state = 238;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 20, this._ctx);
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
	public type_(): TypeContext {
		let localctx: TypeContext = new TypeContext(this, this._ctx, this.state);
		this.enterRule(localctx, 26, painless_parser.RULE_type);
		try {
			let _alt: number;
			this.state = 251;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 83:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 241;
				this.match(painless_parser.DEF);
				}
				break;
			case 82:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 242;
				this.match(painless_parser.PRIMITIVE);
				}
				break;
			case 84:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 243;
				this.match(painless_parser.ID);
				this.state = 248;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 21, this._ctx);
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
					_alt = this._interp.adaptivePredict(this._input, 21, this._ctx);
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
	public declvar(): DeclvarContext {
		let localctx: DeclvarContext = new DeclvarContext(this, this._ctx, this.state);
		this.enterRule(localctx, 28, painless_parser.RULE_declvar);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 253;
			this.match(painless_parser.ID);
			this.state = 256;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===61) {
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
	public trap(): TrapContext {
		let localctx: TrapContext = new TrapContext(this, this._ctx, this.state);
		this.enterRule(localctx, 30, painless_parser.RULE_trap);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 258;
			this.match(painless_parser.CATCH);
			this.state = 259;
			this.match(painless_parser.LP);
			this.state = 260;
			this.type_();
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

	public noncondexpression(): NoncondexpressionContext;
	public noncondexpression(_p: number): NoncondexpressionContext;
	// @RuleVersion(0)
	public noncondexpression(_p?: number): NoncondexpressionContext {
		if (_p === undefined) {
			_p = 0;
		}

		let _parentctx: ParserRuleContext = this._ctx;
		let _parentState: number = this.state;
		let localctx: NoncondexpressionContext = new NoncondexpressionContext(this, this._ctx, _parentState);
		let _prevctx: NoncondexpressionContext = localctx;
		let _startState: number = 32;
		this.enterRecursionRule(localctx, 32, painless_parser.RULE_noncondexpression, _p);
		let _la: number;
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			{
			localctx = new SingleContext(this, localctx);
			this._ctx = localctx;
			_prevctx = localctx;

			this.state = 266;
			this.unary();
			}
			this._ctx.stop = this._input.LT(-1);
			this.state = 309;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 25, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					if (this._parseListeners != null) {
						this.triggerExitRuleEvent();
					}
					_prevctx = localctx;
					{
					this.state = 307;
					this._errHandler.sync(this);
					switch ( this._interp.adaptivePredict(this._input, 24, this._ctx) ) {
					case 1:
						{
						localctx = new BinaryContext(this, new NoncondexpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, painless_parser.RULE_noncondexpression);
						this.state = 268;
						if (!(this.precpred(this._ctx, 13))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 13)");
						}
						this.state = 269;
						_la = this._input.LA(1);
						if(!(((((_la - 31)) & ~0x1F) === 0 && ((1 << (_la - 31)) & 7) !== 0))) {
						this._errHandler.recoverInline(this);
						}
						else {
							this._errHandler.reportMatch(this);
						    this.consume();
						}
						this.state = 270;
						this.noncondexpression(14);
						}
						break;
					case 2:
						{
						localctx = new BinaryContext(this, new NoncondexpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, painless_parser.RULE_noncondexpression);
						this.state = 271;
						if (!(this.precpred(this._ctx, 12))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 12)");
						}
						this.state = 272;
						_la = this._input.LA(1);
						if(!(_la===34 || _la===35)) {
						this._errHandler.recoverInline(this);
						}
						else {
							this._errHandler.reportMatch(this);
						    this.consume();
						}
						this.state = 273;
						this.noncondexpression(13);
						}
						break;
					case 3:
						{
						localctx = new BinaryContext(this, new NoncondexpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, painless_parser.RULE_noncondexpression);
						this.state = 274;
						if (!(this.precpred(this._ctx, 11))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 11)");
						}
						this.state = 275;
						_la = this._input.LA(1);
						if(!(_la===57 || _la===58)) {
						this._errHandler.recoverInline(this);
						}
						else {
							this._errHandler.reportMatch(this);
						    this.consume();
						}
						this.state = 276;
						this.noncondexpression(12);
						}
						break;
					case 4:
						{
						localctx = new BinaryContext(this, new NoncondexpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, painless_parser.RULE_noncondexpression);
						this.state = 277;
						if (!(this.precpred(this._ctx, 10))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 10)");
						}
						this.state = 278;
						_la = this._input.LA(1);
						if(!(((((_la - 36)) & ~0x1F) === 0 && ((1 << (_la - 36)) & 7) !== 0))) {
						this._errHandler.recoverInline(this);
						}
						else {
							this._errHandler.reportMatch(this);
						    this.consume();
						}
						this.state = 279;
						this.noncondexpression(11);
						}
						break;
					case 5:
						{
						localctx = new CompContext(this, new NoncondexpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, painless_parser.RULE_noncondexpression);
						this.state = 280;
						if (!(this.precpred(this._ctx, 9))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 9)");
						}
						this.state = 281;
						_la = this._input.LA(1);
						if(!(((((_la - 39)) & ~0x1F) === 0 && ((1 << (_la - 39)) & 15) !== 0))) {
						this._errHandler.recoverInline(this);
						}
						else {
							this._errHandler.reportMatch(this);
						    this.consume();
						}
						this.state = 282;
						this.noncondexpression(10);
						}
						break;
					case 6:
						{
						localctx = new CompContext(this, new NoncondexpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, painless_parser.RULE_noncondexpression);
						this.state = 283;
						if (!(this.precpred(this._ctx, 7))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 7)");
						}
						this.state = 284;
						_la = this._input.LA(1);
						if(!(((((_la - 43)) & ~0x1F) === 0 && ((1 << (_la - 43)) & 15) !== 0))) {
						this._errHandler.recoverInline(this);
						}
						else {
							this._errHandler.reportMatch(this);
						    this.consume();
						}
						this.state = 285;
						this.noncondexpression(8);
						}
						break;
					case 7:
						{
						localctx = new BinaryContext(this, new NoncondexpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, painless_parser.RULE_noncondexpression);
						this.state = 286;
						if (!(this.precpred(this._ctx, 6))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 6)");
						}
						this.state = 287;
						this.match(painless_parser.BWAND);
						this.state = 288;
						this.noncondexpression(7);
						}
						break;
					case 8:
						{
						localctx = new BinaryContext(this, new NoncondexpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, painless_parser.RULE_noncondexpression);
						this.state = 289;
						if (!(this.precpred(this._ctx, 5))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 5)");
						}
						this.state = 290;
						this.match(painless_parser.XOR);
						this.state = 291;
						this.noncondexpression(6);
						}
						break;
					case 9:
						{
						localctx = new BinaryContext(this, new NoncondexpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, painless_parser.RULE_noncondexpression);
						this.state = 292;
						if (!(this.precpred(this._ctx, 4))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 4)");
						}
						this.state = 293;
						this.match(painless_parser.BWOR);
						this.state = 294;
						this.noncondexpression(5);
						}
						break;
					case 10:
						{
						localctx = new BoolContext(this, new NoncondexpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, painless_parser.RULE_noncondexpression);
						this.state = 295;
						if (!(this.precpred(this._ctx, 3))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 3)");
						}
						this.state = 296;
						this.match(painless_parser.BOOLAND);
						this.state = 297;
						this.noncondexpression(4);
						}
						break;
					case 11:
						{
						localctx = new BoolContext(this, new NoncondexpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, painless_parser.RULE_noncondexpression);
						this.state = 298;
						if (!(this.precpred(this._ctx, 2))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 2)");
						}
						this.state = 299;
						this.match(painless_parser.BOOLOR);
						this.state = 300;
						this.noncondexpression(3);
						}
						break;
					case 12:
						{
						localctx = new ElvisContext(this, new NoncondexpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, painless_parser.RULE_noncondexpression);
						this.state = 301;
						if (!(this.precpred(this._ctx, 1))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 1)");
						}
						this.state = 302;
						this.match(painless_parser.ELVIS);
						this.state = 303;
						this.noncondexpression(1);
						}
						break;
					case 13:
						{
						localctx = new InstanceofContext(this, new NoncondexpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, painless_parser.RULE_noncondexpression);
						this.state = 304;
						if (!(this.precpred(this._ctx, 8))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 8)");
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
				_alt = this._interp.adaptivePredict(this._input, 25, this._ctx);
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
	public expression(): ExpressionContext {
		let localctx: ExpressionContext = new ExpressionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 34, painless_parser.RULE_expression);
		let _la: number;
		try {
			this.state = 323;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 26, this._ctx) ) {
			case 1:
				localctx = new NonconditionalContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 312;
				this.noncondexpression(0);
				}
				break;
			case 2:
				localctx = new ConditionalContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
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
				localctx = new AssignmentContext(this, localctx);
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 319;
				this.noncondexpression(0);
				this.state = 320;
				_la = this._input.LA(1);
				if(!(((((_la - 61)) & ~0x1F) === 0 && ((1 << (_la - 61)) & 4095) !== 0))) {
				this._errHandler.recoverInline(this);
				}
				else {
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
	public unary(): UnaryContext {
		let localctx: UnaryContext = new UnaryContext(this, this._ctx, this.state);
		this.enterRule(localctx, 36, painless_parser.RULE_unary);
		let _la: number;
		try {
			this.state = 330;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 59:
			case 60:
				localctx = new PreContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 325;
				_la = this._input.LA(1);
				if(!(_la===59 || _la===60)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				this.state = 326;
				this.chain();
				}
				break;
			case 34:
			case 35:
				localctx = new AddsubContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 327;
				_la = this._input.LA(1);
				if(!(_la===34 || _la===35)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				this.state = 328;
				this.unary();
				}
				break;
			case 5:
			case 7:
			case 9:
			case 23:
			case 29:
			case 30:
			case 73:
			case 74:
			case 75:
			case 76:
			case 77:
			case 78:
			case 79:
			case 80:
			case 81:
			case 84:
				localctx = new NotaddsubContext(this, localctx);
				this.enterOuterAlt(localctx, 3);
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
	public unarynotaddsub(): UnarynotaddsubContext {
		let localctx: UnarynotaddsubContext = new UnarynotaddsubContext(this, this._ctx, this.state);
		this.enterRule(localctx, 38, painless_parser.RULE_unarynotaddsub);
		let _la: number;
		try {
			this.state = 339;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 28, this._ctx) ) {
			case 1:
				localctx = new ReadContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 332;
				this.chain();
				}
				break;
			case 2:
				localctx = new PostContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 333;
				this.chain();
				this.state = 334;
				_la = this._input.LA(1);
				if(!(_la===59 || _la===60)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				}
				break;
			case 3:
				localctx = new NotContext(this, localctx);
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 336;
				_la = this._input.LA(1);
				if(!(_la===29 || _la===30)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				this.state = 337;
				this.unary();
				}
				break;
			case 4:
				localctx = new CastContext(this, localctx);
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 338;
				this.castexpression();
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
	public castexpression(): CastexpressionContext {
		let localctx: CastexpressionContext = new CastexpressionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 40, painless_parser.RULE_castexpression);
		try {
			this.state = 351;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 29, this._ctx) ) {
			case 1:
				localctx = new PrimordefcastContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
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
				localctx = new RefcastContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
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
	public primordefcasttype(): PrimordefcasttypeContext {
		let localctx: PrimordefcasttypeContext = new PrimordefcasttypeContext(this, this._ctx, this.state);
		this.enterRule(localctx, 42, painless_parser.RULE_primordefcasttype);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 353;
			_la = this._input.LA(1);
			if(!(_la===82 || _la===83)) {
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
	public refcasttype(): RefcasttypeContext {
		let localctx: RefcasttypeContext = new RefcasttypeContext(this, this._ctx, this.state);
		this.enterRule(localctx, 44, painless_parser.RULE_refcasttype);
		let _la: number;
		try {
			this.state = 384;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 83:
				this.enterOuterAlt(localctx, 1);
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
				} while (_la===5);
				}
				break;
			case 82:
				this.enterOuterAlt(localctx, 2);
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
				} while (_la===5);
				}
				break;
			case 84:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 369;
				this.match(painless_parser.ID);
				this.state = 374;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===10) {
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
				while (_la===5) {
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
	public chain(): ChainContext {
		let localctx: ChainContext = new ChainContext(this, this._ctx, this.state);
		this.enterRule(localctx, 46, painless_parser.RULE_chain);
		try {
			let _alt: number;
			this.state = 394;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 36, this._ctx) ) {
			case 1:
				localctx = new DynamicContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 386;
				this.primary();
				this.state = 390;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 35, this._ctx);
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
					_alt = this._interp.adaptivePredict(this._input, 35, this._ctx);
				}
				}
				break;
			case 2:
				localctx = new NewarrayContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 393;
				this.arrayinitializer();
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
	public primary(): PrimaryContext {
		let localctx: PrimaryContext = new PrimaryContext(this, this._ctx, this.state);
		this.enterRule(localctx, 48, painless_parser.RULE_primary);
		let _la: number;
		try {
			this.state = 415;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 37, this._ctx) ) {
			case 1:
				localctx = new PrecedenceContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
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
				localctx = new NumericContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 400;
				_la = this._input.LA(1);
				if(!(((((_la - 73)) & ~0x1F) === 0 && ((1 << (_la - 73)) & 15) !== 0))) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				}
				break;
			case 3:
				localctx = new TrueContext(this, localctx);
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 401;
				this.match(painless_parser.TRUE);
				}
				break;
			case 4:
				localctx = new FalseContext(this, localctx);
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 402;
				this.match(painless_parser.FALSE);
				}
				break;
			case 5:
				localctx = new NullContext(this, localctx);
				this.enterOuterAlt(localctx, 5);
				{
				this.state = 403;
				this.match(painless_parser.NULL);
				}
				break;
			case 6:
				localctx = new StringContext(this, localctx);
				this.enterOuterAlt(localctx, 6);
				{
				this.state = 404;
				this.match(painless_parser.STRING);
				}
				break;
			case 7:
				localctx = new RegexContext(this, localctx);
				this.enterOuterAlt(localctx, 7);
				{
				this.state = 405;
				this.match(painless_parser.REGEX);
				}
				break;
			case 8:
				localctx = new ListinitContext(this, localctx);
				this.enterOuterAlt(localctx, 8);
				{
				this.state = 406;
				this.listinitializer();
				}
				break;
			case 9:
				localctx = new MapinitContext(this, localctx);
				this.enterOuterAlt(localctx, 9);
				{
				this.state = 407;
				this.mapinitializer();
				}
				break;
			case 10:
				localctx = new VariableContext(this, localctx);
				this.enterOuterAlt(localctx, 10);
				{
				this.state = 408;
				this.match(painless_parser.ID);
				}
				break;
			case 11:
				localctx = new CalllocalContext(this, localctx);
				this.enterOuterAlt(localctx, 11);
				{
				this.state = 409;
				_la = this._input.LA(1);
				if(!(_la===9 || _la===84)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				this.state = 410;
				this.arguments();
				}
				break;
			case 12:
				localctx = new NewobjectContext(this, localctx);
				this.enterOuterAlt(localctx, 12);
				{
				this.state = 411;
				this.match(painless_parser.NEW);
				this.state = 412;
				this.type_();
				this.state = 413;
				this.arguments();
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
	public postfix(): PostfixContext {
		let localctx: PostfixContext = new PostfixContext(this, this._ctx, this.state);
		this.enterRule(localctx, 50, painless_parser.RULE_postfix);
		try {
			this.state = 420;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 38, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 417;
				this.callinvoke();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 418;
				this.fieldaccess();
				}
				break;
			case 3:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 419;
				this.braceaccess();
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
	public postdot(): PostdotContext {
		let localctx: PostdotContext = new PostdotContext(this, this._ctx, this.state);
		this.enterRule(localctx, 52, painless_parser.RULE_postdot);
		try {
			this.state = 424;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 39, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 422;
				this.callinvoke();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 423;
				this.fieldaccess();
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
	public callinvoke(): CallinvokeContext {
		let localctx: CallinvokeContext = new CallinvokeContext(this, this._ctx, this.state);
		this.enterRule(localctx, 54, painless_parser.RULE_callinvoke);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 426;
			_la = this._input.LA(1);
			if(!(_la===10 || _la===11)) {
			this._errHandler.recoverInline(this);
			}
			else {
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
	public fieldaccess(): FieldaccessContext {
		let localctx: FieldaccessContext = new FieldaccessContext(this, this._ctx, this.state);
		this.enterRule(localctx, 56, painless_parser.RULE_fieldaccess);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 430;
			_la = this._input.LA(1);
			if(!(_la===10 || _la===11)) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
			this.state = 431;
			_la = this._input.LA(1);
			if(!(_la===85 || _la===86)) {
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
	public braceaccess(): BraceaccessContext {
		let localctx: BraceaccessContext = new BraceaccessContext(this, this._ctx, this.state);
		this.enterRule(localctx, 58, painless_parser.RULE_braceaccess);
		try {
			this.enterOuterAlt(localctx, 1);
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
	public arrayinitializer(): ArrayinitializerContext {
		let localctx: ArrayinitializerContext = new ArrayinitializerContext(this, this._ctx, this.state);
		this.enterRule(localctx, 60, painless_parser.RULE_arrayinitializer);
		let _la: number;
		try {
			let _alt: number;
			this.state = 478;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 46, this._ctx) ) {
			case 1:
				localctx = new NewstandardarrayContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 437;
				this.match(painless_parser.NEW);
				this.state = 438;
				this.type_();
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
					_alt = this._interp.adaptivePredict(this._input, 40, this._ctx);
				} while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER);
				this.state = 454;
				this._errHandler.sync(this);
				switch ( this._interp.adaptivePredict(this._input, 42, this._ctx) ) {
				case 1:
					{
					this.state = 447;
					this.postdot();
					this.state = 451;
					this._errHandler.sync(this);
					_alt = this._interp.adaptivePredict(this._input, 41, this._ctx);
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
						_alt = this._interp.adaptivePredict(this._input, 41, this._ctx);
					}
					}
					break;
				}
				}
				break;
			case 2:
				localctx = new NewinitializedarrayContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 456;
				this.match(painless_parser.NEW);
				this.state = 457;
				this.type_();
				this.state = 458;
				this.match(painless_parser.LBRACE);
				this.state = 459;
				this.match(painless_parser.RBRACE);
				this.state = 460;
				this.match(painless_parser.LBRACK);
				this.state = 469;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (((((_la - 5)) & ~0x1F) === 0 && ((1 << (_la - 5)) & 1661206549) !== 0) || ((((_la - 59)) & ~0x1F) === 0 && ((1 << (_la - 59)) & 41926659) !== 0)) {
					{
					this.state = 461;
					this.expression();
					this.state = 466;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
					while (_la===12) {
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
				_alt = this._interp.adaptivePredict(this._input, 45, this._ctx);
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
					_alt = this._interp.adaptivePredict(this._input, 45, this._ctx);
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
	public listinitializer(): ListinitializerContext {
		let localctx: ListinitializerContext = new ListinitializerContext(this, this._ctx, this.state);
		this.enterRule(localctx, 62, painless_parser.RULE_listinitializer);
		let _la: number;
		try {
			this.state = 493;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 48, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 480;
				this.match(painless_parser.LBRACE);
				this.state = 481;
				this.expression();
				this.state = 486;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===12) {
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
				this.enterOuterAlt(localctx, 2);
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
	public mapinitializer(): MapinitializerContext {
		let localctx: MapinitializerContext = new MapinitializerContext(this, this._ctx, this.state);
		this.enterRule(localctx, 64, painless_parser.RULE_mapinitializer);
		let _la: number;
		try {
			this.state = 509;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 50, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 495;
				this.match(painless_parser.LBRACE);
				this.state = 496;
				this.maptoken();
				this.state = 501;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===12) {
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
				this.enterOuterAlt(localctx, 2);
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
	public maptoken(): MaptokenContext {
		let localctx: MaptokenContext = new MaptokenContext(this, this._ctx, this.state);
		this.enterRule(localctx, 66, painless_parser.RULE_maptoken);
		try {
			this.enterOuterAlt(localctx, 1);
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
	public arguments(): ArgumentsContext {
		let localctx: ArgumentsContext = new ArgumentsContext(this, this._ctx, this.state);
		this.enterRule(localctx, 68, painless_parser.RULE_arguments);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			{
			this.state = 515;
			this.match(painless_parser.LP);
			this.state = 524;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (((((_la - 5)) & ~0x1F) === 0 && ((1 << (_la - 5)) & 1665400853) !== 0) || ((((_la - 59)) & ~0x1F) === 0 && ((1 << (_la - 59)) & 67092483) !== 0)) {
				{
				this.state = 516;
				this.argument();
				this.state = 521;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===12) {
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
	public argument(): ArgumentContext {
		let localctx: ArgumentContext = new ArgumentContext(this, this._ctx, this.state);
		this.enterRule(localctx, 70, painless_parser.RULE_argument);
		try {
			this.state = 531;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 53, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 528;
				this.expression();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 529;
				this.lambda();
				}
				break;
			case 3:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 530;
				this.funcref();
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
	public lambda(): LambdaContext {
		let localctx: LambdaContext = new LambdaContext(this, this._ctx, this.state);
		this.enterRule(localctx, 72, painless_parser.RULE_lambda);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 546;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 82:
			case 83:
			case 84:
				{
				this.state = 533;
				this.lamtype();
				}
				break;
			case 7:
				{
				this.state = 534;
				this.match(painless_parser.LP);
				this.state = 543;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (((((_la - 82)) & ~0x1F) === 0 && ((1 << (_la - 82)) & 7) !== 0)) {
					{
					this.state = 535;
					this.lamtype();
					this.state = 540;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
					while (_la===12) {
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
			case 3:
				{
				this.state = 549;
				this.block();
				}
				break;
			case 5:
			case 7:
			case 9:
			case 23:
			case 29:
			case 30:
			case 34:
			case 35:
			case 59:
			case 60:
			case 73:
			case 74:
			case 75:
			case 76:
			case 77:
			case 78:
			case 79:
			case 80:
			case 81:
			case 84:
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
	public lamtype(): LamtypeContext {
		let localctx: LamtypeContext = new LamtypeContext(this, this._ctx, this.state);
		this.enterRule(localctx, 74, painless_parser.RULE_lamtype);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 554;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 58, this._ctx) ) {
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
	public funcref(): FuncrefContext {
		let localctx: FuncrefContext = new FuncrefContext(this, this._ctx, this.state);
		this.enterRule(localctx, 76, painless_parser.RULE_funcref);
		try {
			this.state = 569;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 59, this._ctx) ) {
			case 1:
				localctx = new ClassfuncrefContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
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
				localctx = new ConstructorfuncrefContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
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
				localctx = new LocalfuncrefContext(this, localctx);
				this.enterOuterAlt(localctx, 3);
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
		case 4:
			return this.rstatement_sempred(localctx as RstatementContext, predIndex);
		case 16:
			return this.noncondexpression_sempred(localctx as NoncondexpressionContext, predIndex);
		}
		return true;
	}
	private rstatement_sempred(localctx: RstatementContext, predIndex: number): boolean {
		switch (predIndex) {
		case 0:
			return  this._input.LA(1) != painless_parser.ELSE ;
		}
		return true;
	}
	private noncondexpression_sempred(localctx: NoncondexpressionContext, predIndex: number): boolean {
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

	public static readonly _serializedATN: number[] = [4,1,86,572,2,0,7,0,2,
	1,7,1,2,2,7,2,2,3,7,3,2,4,7,4,2,5,7,5,2,6,7,6,2,7,7,7,2,8,7,8,2,9,7,9,2,
	10,7,10,2,11,7,11,2,12,7,12,2,13,7,13,2,14,7,14,2,15,7,15,2,16,7,16,2,17,
	7,17,2,18,7,18,2,19,7,19,2,20,7,20,2,21,7,21,2,22,7,22,2,23,7,23,2,24,7,
	24,2,25,7,25,2,26,7,26,2,27,7,27,2,28,7,28,2,29,7,29,2,30,7,30,2,31,7,31,
	2,32,7,32,2,33,7,33,2,34,7,34,2,35,7,35,2,36,7,36,2,37,7,37,2,38,7,38,1,
	0,5,0,80,8,0,10,0,12,0,83,9,0,1,0,5,0,86,8,0,10,0,12,0,89,9,0,1,0,1,0,1,
	1,1,1,1,1,1,1,1,1,1,2,1,2,1,2,1,2,1,2,1,2,1,2,5,2,105,8,2,10,2,12,2,108,
	9,2,3,2,110,8,2,1,2,1,2,1,3,1,3,1,3,1,3,3,3,118,8,3,1,4,1,4,1,4,1,4,1,4,
	1,4,1,4,1,4,3,4,128,8,4,1,4,1,4,1,4,1,4,1,4,1,4,3,4,136,8,4,1,4,1,4,1,4,
	3,4,141,8,4,1,4,1,4,3,4,145,8,4,1,4,1,4,3,4,149,8,4,1,4,1,4,1,4,3,4,154,
	8,4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,
	1,4,1,4,1,4,4,4,176,8,4,11,4,12,4,177,3,4,180,8,4,1,5,1,5,1,5,1,5,1,5,1,
	5,1,5,1,5,1,5,1,5,1,5,1,5,3,5,194,8,5,1,5,1,5,1,5,3,5,199,8,5,1,6,1,6,3,
	6,203,8,6,1,7,1,7,5,7,207,8,7,10,7,12,7,210,9,7,1,7,3,7,213,8,7,1,7,1,7,
	1,8,1,8,1,9,1,9,3,9,221,8,9,1,10,1,10,1,11,1,11,1,11,1,11,5,11,229,8,11,
	10,11,12,11,232,9,11,1,12,1,12,1,12,5,12,237,8,12,10,12,12,12,240,9,12,
	1,13,1,13,1,13,1,13,1,13,5,13,247,8,13,10,13,12,13,250,9,13,3,13,252,8,
	13,1,14,1,14,1,14,3,14,257,8,14,1,15,1,15,1,15,1,15,1,15,1,15,1,15,1,16,
	1,16,1,16,1,16,1,16,1,16,1,16,1,16,1,16,1,16,1,16,1,16,1,16,1,16,1,16,1,
	16,1,16,1,16,1,16,1,16,1,16,1,16,1,16,1,16,1,16,1,16,1,16,1,16,1,16,1,16,
	1,16,1,16,1,16,1,16,1,16,1,16,1,16,1,16,1,16,1,16,1,16,1,16,5,16,308,8,
	16,10,16,12,16,311,9,16,1,17,1,17,1,17,1,17,1,17,1,17,1,17,1,17,1,17,1,
	17,1,17,3,17,324,8,17,1,18,1,18,1,18,1,18,1,18,3,18,331,8,18,1,19,1,19,
	1,19,1,19,1,19,1,19,1,19,3,19,340,8,19,1,20,1,20,1,20,1,20,1,20,1,20,1,
	20,1,20,1,20,1,20,3,20,352,8,20,1,21,1,21,1,22,1,22,1,22,4,22,359,8,22,
	11,22,12,22,360,1,22,1,22,1,22,4,22,366,8,22,11,22,12,22,367,1,22,1,22,
	1,22,5,22,373,8,22,10,22,12,22,376,9,22,1,22,1,22,5,22,380,8,22,10,22,12,
	22,383,9,22,3,22,385,8,22,1,23,1,23,5,23,389,8,23,10,23,12,23,392,9,23,
	1,23,3,23,395,8,23,1,24,1,24,1,24,1,24,1,24,1,24,1,24,1,24,1,24,1,24,1,
	24,1,24,1,24,1,24,1,24,1,24,1,24,1,24,1,24,3,24,416,8,24,1,25,1,25,1,25,
	3,25,421,8,25,1,26,1,26,3,26,425,8,26,1,27,1,27,1,27,1,27,1,28,1,28,1,28,
	1,29,1,29,1,29,1,29,1,30,1,30,1,30,1,30,1,30,1,30,4,30,444,8,30,11,30,12,
	30,445,1,30,1,30,5,30,450,8,30,10,30,12,30,453,9,30,3,30,455,8,30,1,30,
	1,30,1,30,1,30,1,30,1,30,1,30,1,30,5,30,465,8,30,10,30,12,30,468,9,30,3,
	30,470,8,30,1,30,1,30,5,30,474,8,30,10,30,12,30,477,9,30,3,30,479,8,30,
	1,31,1,31,1,31,1,31,5,31,485,8,31,10,31,12,31,488,9,31,1,31,1,31,1,31,1,
	31,3,31,494,8,31,1,32,1,32,1,32,1,32,5,32,500,8,32,10,32,12,32,503,9,32,
	1,32,1,32,1,32,1,32,1,32,3,32,510,8,32,1,33,1,33,1,33,1,33,1,34,1,34,1,
	34,1,34,5,34,520,8,34,10,34,12,34,523,9,34,3,34,525,8,34,1,34,1,34,1,35,
	1,35,1,35,3,35,532,8,35,1,36,1,36,1,36,1,36,1,36,5,36,539,8,36,10,36,12,
	36,542,9,36,3,36,544,8,36,1,36,3,36,547,8,36,1,36,1,36,1,36,3,36,552,8,
	36,1,37,3,37,555,8,37,1,37,1,37,1,38,1,38,1,38,1,38,1,38,1,38,1,38,1,38,
	1,38,1,38,1,38,3,38,570,8,38,1,38,0,1,32,39,0,2,4,6,8,10,12,14,16,18,20,
	22,24,26,28,30,32,34,36,38,40,42,44,46,48,50,52,54,56,58,60,62,64,66,68,
	70,72,74,76,0,15,1,1,13,13,1,0,31,33,1,0,34,35,1,0,57,58,1,0,36,38,1,0,
	39,42,1,0,43,46,1,0,61,72,1,0,59,60,1,0,29,30,1,0,82,83,1,0,73,76,2,0,9,
	9,84,84,1,0,10,11,1,0,85,86,631,0,81,1,0,0,0,2,92,1,0,0,0,4,97,1,0,0,0,
	6,117,1,0,0,0,8,179,1,0,0,0,10,198,1,0,0,0,12,202,1,0,0,0,14,204,1,0,0,
	0,16,216,1,0,0,0,18,220,1,0,0,0,20,222,1,0,0,0,22,224,1,0,0,0,24,233,1,
	0,0,0,26,251,1,0,0,0,28,253,1,0,0,0,30,258,1,0,0,0,32,265,1,0,0,0,34,323,
	1,0,0,0,36,330,1,0,0,0,38,339,1,0,0,0,40,351,1,0,0,0,42,353,1,0,0,0,44,
	384,1,0,0,0,46,394,1,0,0,0,48,415,1,0,0,0,50,420,1,0,0,0,52,424,1,0,0,0,
	54,426,1,0,0,0,56,430,1,0,0,0,58,433,1,0,0,0,60,478,1,0,0,0,62,493,1,0,
	0,0,64,509,1,0,0,0,66,511,1,0,0,0,68,515,1,0,0,0,70,531,1,0,0,0,72,546,
	1,0,0,0,74,554,1,0,0,0,76,569,1,0,0,0,78,80,3,2,1,0,79,78,1,0,0,0,80,83,
	1,0,0,0,81,79,1,0,0,0,81,82,1,0,0,0,82,87,1,0,0,0,83,81,1,0,0,0,84,86,3,
	6,3,0,85,84,1,0,0,0,86,89,1,0,0,0,87,85,1,0,0,0,87,88,1,0,0,0,88,90,1,0,
	0,0,89,87,1,0,0,0,90,91,5,0,0,1,91,1,1,0,0,0,92,93,3,24,12,0,93,94,5,84,
	0,0,94,95,3,4,2,0,95,96,3,14,7,0,96,3,1,0,0,0,97,109,5,7,0,0,98,99,3,24,
	12,0,99,106,5,84,0,0,100,101,5,12,0,0,101,102,3,24,12,0,102,103,5,84,0,
	0,103,105,1,0,0,0,104,100,1,0,0,0,105,108,1,0,0,0,106,104,1,0,0,0,106,107,
	1,0,0,0,107,110,1,0,0,0,108,106,1,0,0,0,109,98,1,0,0,0,109,110,1,0,0,0,
	110,111,1,0,0,0,111,112,5,8,0,0,112,5,1,0,0,0,113,118,3,8,4,0,114,115,3,
	10,5,0,115,116,7,0,0,0,116,118,1,0,0,0,117,113,1,0,0,0,117,114,1,0,0,0,
	118,7,1,0,0,0,119,120,5,14,0,0,120,121,5,7,0,0,121,122,3,34,17,0,122,123,
	5,8,0,0,123,127,3,12,6,0,124,125,5,16,0,0,125,128,3,12,6,0,126,128,4,4,
	0,0,127,124,1,0,0,0,127,126,1,0,0,0,128,180,1,0,0,0,129,130,5,17,0,0,130,
	131,5,7,0,0,131,132,3,34,17,0,132,135,5,8,0,0,133,136,3,12,6,0,134,136,
	3,16,8,0,135,133,1,0,0,0,135,134,1,0,0,0,136,180,1,0,0,0,137,138,5,19,0,
	0,138,140,5,7,0,0,139,141,3,18,9,0,140,139,1,0,0,0,140,141,1,0,0,0,141,
	142,1,0,0,0,142,144,5,13,0,0,143,145,3,34,17,0,144,143,1,0,0,0,144,145,
	1,0,0,0,145,146,1,0,0,0,146,148,5,13,0,0,147,149,3,20,10,0,148,147,1,0,
	0,0,148,149,1,0,0,0,149,150,1,0,0,0,150,153,5,8,0,0,151,154,3,12,6,0,152,
	154,3,16,8,0,153,151,1,0,0,0,153,152,1,0,0,0,154,180,1,0,0,0,155,156,5,
	19,0,0,156,157,5,7,0,0,157,158,3,24,12,0,158,159,5,84,0,0,159,160,5,53,
	0,0,160,161,3,34,17,0,161,162,5,8,0,0,162,163,3,12,6,0,163,180,1,0,0,0,
	164,165,5,19,0,0,165,166,5,7,0,0,166,167,5,84,0,0,167,168,5,15,0,0,168,
	169,3,34,17,0,169,170,5,8,0,0,170,171,3,12,6,0,171,180,1,0,0,0,172,173,
	5,24,0,0,173,175,3,14,7,0,174,176,3,30,15,0,175,174,1,0,0,0,176,177,1,0,
	0,0,177,175,1,0,0,0,177,178,1,0,0,0,178,180,1,0,0,0,179,119,1,0,0,0,179,
	129,1,0,0,0,179,137,1,0,0,0,179,155,1,0,0,0,179,164,1,0,0,0,179,172,1,0,
	0,0,180,9,1,0,0,0,181,182,5,18,0,0,182,183,3,14,7,0,183,184,5,17,0,0,184,
	185,5,7,0,0,185,186,3,34,17,0,186,187,5,8,0,0,187,199,1,0,0,0,188,199,3,
	22,11,0,189,199,5,20,0,0,190,199,5,21,0,0,191,193,5,22,0,0,192,194,3,34,
	17,0,193,192,1,0,0,0,193,194,1,0,0,0,194,199,1,0,0,0,195,196,5,26,0,0,196,
	199,3,34,17,0,197,199,3,34,17,0,198,181,1,0,0,0,198,188,1,0,0,0,198,189,
	1,0,0,0,198,190,1,0,0,0,198,191,1,0,0,0,198,195,1,0,0,0,198,197,1,0,0,0,
	199,11,1,0,0,0,200,203,3,14,7,0,201,203,3,6,3,0,202,200,1,0,0,0,202,201,
	1,0,0,0,203,13,1,0,0,0,204,208,5,3,0,0,205,207,3,6,3,0,206,205,1,0,0,0,
	207,210,1,0,0,0,208,206,1,0,0,0,208,209,1,0,0,0,209,212,1,0,0,0,210,208,
	1,0,0,0,211,213,3,10,5,0,212,211,1,0,0,0,212,213,1,0,0,0,213,214,1,0,0,
	0,214,215,5,4,0,0,215,15,1,0,0,0,216,217,5,13,0,0,217,17,1,0,0,0,218,221,
	3,22,11,0,219,221,3,34,17,0,220,218,1,0,0,0,220,219,1,0,0,0,221,19,1,0,
	0,0,222,223,3,34,17,0,223,21,1,0,0,0,224,225,3,24,12,0,225,230,3,28,14,
	0,226,227,5,12,0,0,227,229,3,28,14,0,228,226,1,0,0,0,229,232,1,0,0,0,230,
	228,1,0,0,0,230,231,1,0,0,0,231,23,1,0,0,0,232,230,1,0,0,0,233,238,3,26,
	13,0,234,235,5,5,0,0,235,237,5,6,0,0,236,234,1,0,0,0,237,240,1,0,0,0,238,
	236,1,0,0,0,238,239,1,0,0,0,239,25,1,0,0,0,240,238,1,0,0,0,241,252,5,83,
	0,0,242,252,5,82,0,0,243,248,5,84,0,0,244,245,5,10,0,0,245,247,5,86,0,0,
	246,244,1,0,0,0,247,250,1,0,0,0,248,246,1,0,0,0,248,249,1,0,0,0,249,252,
	1,0,0,0,250,248,1,0,0,0,251,241,1,0,0,0,251,242,1,0,0,0,251,243,1,0,0,0,
	252,27,1,0,0,0,253,256,5,84,0,0,254,255,5,61,0,0,255,257,3,34,17,0,256,
	254,1,0,0,0,256,257,1,0,0,0,257,29,1,0,0,0,258,259,5,25,0,0,259,260,5,7,
	0,0,260,261,3,26,13,0,261,262,5,84,0,0,262,263,5,8,0,0,263,264,3,14,7,0,
	264,31,1,0,0,0,265,266,6,16,-1,0,266,267,3,36,18,0,267,309,1,0,0,0,268,
	269,10,13,0,0,269,270,7,1,0,0,270,308,3,32,16,14,271,272,10,12,0,0,272,
	273,7,2,0,0,273,308,3,32,16,13,274,275,10,11,0,0,275,276,7,3,0,0,276,308,
	3,32,16,12,277,278,10,10,0,0,278,279,7,4,0,0,279,308,3,32,16,11,280,281,
	10,9,0,0,281,282,7,5,0,0,282,308,3,32,16,10,283,284,10,7,0,0,284,285,7,
	6,0,0,285,308,3,32,16,8,286,287,10,6,0,0,287,288,5,47,0,0,288,308,3,32,
	16,7,289,290,10,5,0,0,290,291,5,48,0,0,291,308,3,32,16,6,292,293,10,4,0,
	0,293,294,5,49,0,0,294,308,3,32,16,5,295,296,10,3,0,0,296,297,5,50,0,0,
	297,308,3,32,16,4,298,299,10,2,0,0,299,300,5,51,0,0,300,308,3,32,16,3,301,
	302,10,1,0,0,302,303,5,54,0,0,303,308,3,32,16,1,304,305,10,8,0,0,305,306,
	5,28,0,0,306,308,3,24,12,0,307,268,1,0,0,0,307,271,1,0,0,0,307,274,1,0,
	0,0,307,277,1,0,0,0,307,280,1,0,0,0,307,283,1,0,0,0,307,286,1,0,0,0,307,
	289,1,0,0,0,307,292,1,0,0,0,307,295,1,0,0,0,307,298,1,0,0,0,307,301,1,0,
	0,0,307,304,1,0,0,0,308,311,1,0,0,0,309,307,1,0,0,0,309,310,1,0,0,0,310,
	33,1,0,0,0,311,309,1,0,0,0,312,324,3,32,16,0,313,314,3,32,16,0,314,315,
	5,52,0,0,315,316,3,34,17,0,316,317,5,53,0,0,317,318,3,34,17,0,318,324,1,
	0,0,0,319,320,3,32,16,0,320,321,7,7,0,0,321,322,3,34,17,0,322,324,1,0,0,
	0,323,312,1,0,0,0,323,313,1,0,0,0,323,319,1,0,0,0,324,35,1,0,0,0,325,326,
	7,8,0,0,326,331,3,46,23,0,327,328,7,2,0,0,328,331,3,36,18,0,329,331,3,38,
	19,0,330,325,1,0,0,0,330,327,1,0,0,0,330,329,1,0,0,0,331,37,1,0,0,0,332,
	340,3,46,23,0,333,334,3,46,23,0,334,335,7,8,0,0,335,340,1,0,0,0,336,337,
	7,9,0,0,337,340,3,36,18,0,338,340,3,40,20,0,339,332,1,0,0,0,339,333,1,0,
	0,0,339,336,1,0,0,0,339,338,1,0,0,0,340,39,1,0,0,0,341,342,5,7,0,0,342,
	343,3,42,21,0,343,344,5,8,0,0,344,345,3,36,18,0,345,352,1,0,0,0,346,347,
	5,7,0,0,347,348,3,44,22,0,348,349,5,8,0,0,349,350,3,38,19,0,350,352,1,0,
	0,0,351,341,1,0,0,0,351,346,1,0,0,0,352,41,1,0,0,0,353,354,7,10,0,0,354,
	43,1,0,0,0,355,358,5,83,0,0,356,357,5,5,0,0,357,359,5,6,0,0,358,356,1,0,
	0,0,359,360,1,0,0,0,360,358,1,0,0,0,360,361,1,0,0,0,361,385,1,0,0,0,362,
	365,5,82,0,0,363,364,5,5,0,0,364,366,5,6,0,0,365,363,1,0,0,0,366,367,1,
	0,0,0,367,365,1,0,0,0,367,368,1,0,0,0,368,385,1,0,0,0,369,374,5,84,0,0,
	370,371,5,10,0,0,371,373,5,86,0,0,372,370,1,0,0,0,373,376,1,0,0,0,374,372,
	1,0,0,0,374,375,1,0,0,0,375,381,1,0,0,0,376,374,1,0,0,0,377,378,5,5,0,0,
	378,380,5,6,0,0,379,377,1,0,0,0,380,383,1,0,0,0,381,379,1,0,0,0,381,382,
	1,0,0,0,382,385,1,0,0,0,383,381,1,0,0,0,384,355,1,0,0,0,384,362,1,0,0,0,
	384,369,1,0,0,0,385,45,1,0,0,0,386,390,3,48,24,0,387,389,3,50,25,0,388,
	387,1,0,0,0,389,392,1,0,0,0,390,388,1,0,0,0,390,391,1,0,0,0,391,395,1,0,
	0,0,392,390,1,0,0,0,393,395,3,60,30,0,394,386,1,0,0,0,394,393,1,0,0,0,395,
	47,1,0,0,0,396,397,5,7,0,0,397,398,3,34,17,0,398,399,5,8,0,0,399,416,1,
	0,0,0,400,416,7,11,0,0,401,416,5,79,0,0,402,416,5,80,0,0,403,416,5,81,0,
	0,404,416,5,77,0,0,405,416,5,78,0,0,406,416,3,62,31,0,407,416,3,64,32,0,
	408,416,5,84,0,0,409,410,7,12,0,0,410,416,3,68,34,0,411,412,5,23,0,0,412,
	413,3,26,13,0,413,414,3,68,34,0,414,416,1,0,0,0,415,396,1,0,0,0,415,400,
	1,0,0,0,415,401,1,0,0,0,415,402,1,0,0,0,415,403,1,0,0,0,415,404,1,0,0,0,
	415,405,1,0,0,0,415,406,1,0,0,0,415,407,1,0,0,0,415,408,1,0,0,0,415,409,
	1,0,0,0,415,411,1,0,0,0,416,49,1,0,0,0,417,421,3,54,27,0,418,421,3,56,28,
	0,419,421,3,58,29,0,420,417,1,0,0,0,420,418,1,0,0,0,420,419,1,0,0,0,421,
	51,1,0,0,0,422,425,3,54,27,0,423,425,3,56,28,0,424,422,1,0,0,0,424,423,
	1,0,0,0,425,53,1,0,0,0,426,427,7,13,0,0,427,428,5,86,0,0,428,429,3,68,34,
	0,429,55,1,0,0,0,430,431,7,13,0,0,431,432,7,14,0,0,432,57,1,0,0,0,433,434,
	5,5,0,0,434,435,3,34,17,0,435,436,5,6,0,0,436,59,1,0,0,0,437,438,5,23,0,
	0,438,443,3,26,13,0,439,440,5,5,0,0,440,441,3,34,17,0,441,442,5,6,0,0,442,
	444,1,0,0,0,443,439,1,0,0,0,444,445,1,0,0,0,445,443,1,0,0,0,445,446,1,0,
	0,0,446,454,1,0,0,0,447,451,3,52,26,0,448,450,3,50,25,0,449,448,1,0,0,0,
	450,453,1,0,0,0,451,449,1,0,0,0,451,452,1,0,0,0,452,455,1,0,0,0,453,451,
	1,0,0,0,454,447,1,0,0,0,454,455,1,0,0,0,455,479,1,0,0,0,456,457,5,23,0,
	0,457,458,3,26,13,0,458,459,5,5,0,0,459,460,5,6,0,0,460,469,5,3,0,0,461,
	466,3,34,17,0,462,463,5,12,0,0,463,465,3,34,17,0,464,462,1,0,0,0,465,468,
	1,0,0,0,466,464,1,0,0,0,466,467,1,0,0,0,467,470,1,0,0,0,468,466,1,0,0,0,
	469,461,1,0,0,0,469,470,1,0,0,0,470,471,1,0,0,0,471,475,5,4,0,0,472,474,
	3,50,25,0,473,472,1,0,0,0,474,477,1,0,0,0,475,473,1,0,0,0,475,476,1,0,0,
	0,476,479,1,0,0,0,477,475,1,0,0,0,478,437,1,0,0,0,478,456,1,0,0,0,479,61,
	1,0,0,0,480,481,5,5,0,0,481,486,3,34,17,0,482,483,5,12,0,0,483,485,3,34,
	17,0,484,482,1,0,0,0,485,488,1,0,0,0,486,484,1,0,0,0,486,487,1,0,0,0,487,
	489,1,0,0,0,488,486,1,0,0,0,489,490,5,6,0,0,490,494,1,0,0,0,491,492,5,5,
	0,0,492,494,5,6,0,0,493,480,1,0,0,0,493,491,1,0,0,0,494,63,1,0,0,0,495,
	496,5,5,0,0,496,501,3,66,33,0,497,498,5,12,0,0,498,500,3,66,33,0,499,497,
	1,0,0,0,500,503,1,0,0,0,501,499,1,0,0,0,501,502,1,0,0,0,502,504,1,0,0,0,
	503,501,1,0,0,0,504,505,5,6,0,0,505,510,1,0,0,0,506,507,5,5,0,0,507,508,
	5,53,0,0,508,510,5,6,0,0,509,495,1,0,0,0,509,506,1,0,0,0,510,65,1,0,0,0,
	511,512,3,34,17,0,512,513,5,53,0,0,513,514,3,34,17,0,514,67,1,0,0,0,515,
	524,5,7,0,0,516,521,3,70,35,0,517,518,5,12,0,0,518,520,3,70,35,0,519,517,
	1,0,0,0,520,523,1,0,0,0,521,519,1,0,0,0,521,522,1,0,0,0,522,525,1,0,0,0,
	523,521,1,0,0,0,524,516,1,0,0,0,524,525,1,0,0,0,525,526,1,0,0,0,526,527,
	5,8,0,0,527,69,1,0,0,0,528,532,3,34,17,0,529,532,3,72,36,0,530,532,3,76,
	38,0,531,528,1,0,0,0,531,529,1,0,0,0,531,530,1,0,0,0,532,71,1,0,0,0,533,
	547,3,74,37,0,534,543,5,7,0,0,535,540,3,74,37,0,536,537,5,12,0,0,537,539,
	3,74,37,0,538,536,1,0,0,0,539,542,1,0,0,0,540,538,1,0,0,0,540,541,1,0,0,
	0,541,544,1,0,0,0,542,540,1,0,0,0,543,535,1,0,0,0,543,544,1,0,0,0,544,545,
	1,0,0,0,545,547,5,8,0,0,546,533,1,0,0,0,546,534,1,0,0,0,547,548,1,0,0,0,
	548,551,5,56,0,0,549,552,3,14,7,0,550,552,3,34,17,0,551,549,1,0,0,0,551,
	550,1,0,0,0,552,73,1,0,0,0,553,555,3,24,12,0,554,553,1,0,0,0,554,555,1,
	0,0,0,555,556,1,0,0,0,556,557,5,84,0,0,557,75,1,0,0,0,558,559,3,24,12,0,
	559,560,5,55,0,0,560,561,5,84,0,0,561,570,1,0,0,0,562,563,3,24,12,0,563,
	564,5,55,0,0,564,565,5,23,0,0,565,570,1,0,0,0,566,567,5,27,0,0,567,568,
	5,55,0,0,568,570,5,84,0,0,569,558,1,0,0,0,569,562,1,0,0,0,569,566,1,0,0,
	0,570,77,1,0,0,0,60,81,87,106,109,117,127,135,140,144,148,153,177,179,193,
	198,202,208,212,220,230,238,248,251,256,307,309,323,330,339,351,360,367,
	374,381,384,390,394,415,420,424,445,451,454,466,469,475,478,486,493,501,
	509,521,524,531,540,543,546,551,554,569];

	private static __ATN: ATN;
	public static get _ATN(): ATN {
		if (!painless_parser.__ATN) {
			painless_parser.__ATN = new ATNDeserializer().deserialize(painless_parser._serializedATN);
		}

		return painless_parser.__ATN;
	}


	static DecisionsToDFA = painless_parser._ATN.decisionToState.map( (ds: DecisionState, index: number) => new DFA(ds, index) );

}

export class SourceContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public EOF(): TerminalNode {
		return this.getToken(painless_parser.EOF, 0);
	}
	public function__list(): FunctionContext[] {
		return this.getTypedRuleContexts(FunctionContext) as FunctionContext[];
	}
	public function_(i: number): FunctionContext {
		return this.getTypedRuleContext(FunctionContext, i) as FunctionContext;
	}
	public statement_list(): StatementContext[] {
		return this.getTypedRuleContexts(StatementContext) as StatementContext[];
	}
	public statement(i: number): StatementContext {
		return this.getTypedRuleContext(StatementContext, i) as StatementContext;
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_source;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterSource) {
	 		listener.enterSource(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitSource) {
	 		listener.exitSource(this);
		}
	}
}


export class FunctionContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public decltype(): DecltypeContext {
		return this.getTypedRuleContext(DecltypeContext, 0) as DecltypeContext;
	}
	public ID(): TerminalNode {
		return this.getToken(painless_parser.ID, 0);
	}
	public parameters(): ParametersContext {
		return this.getTypedRuleContext(ParametersContext, 0) as ParametersContext;
	}
	public block(): BlockContext {
		return this.getTypedRuleContext(BlockContext, 0) as BlockContext;
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_function;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterFunction) {
	 		listener.enterFunction(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitFunction) {
	 		listener.exitFunction(this);
		}
	}
}


export class ParametersContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public LP(): TerminalNode {
		return this.getToken(painless_parser.LP, 0);
	}
	public RP(): TerminalNode {
		return this.getToken(painless_parser.RP, 0);
	}
	public decltype_list(): DecltypeContext[] {
		return this.getTypedRuleContexts(DecltypeContext) as DecltypeContext[];
	}
	public decltype(i: number): DecltypeContext {
		return this.getTypedRuleContext(DecltypeContext, i) as DecltypeContext;
	}
	public ID_list(): TerminalNode[] {
	    	return this.getTokens(painless_parser.ID);
	}
	public ID(i: number): TerminalNode {
		return this.getToken(painless_parser.ID, i);
	}
	public COMMA_list(): TerminalNode[] {
	    	return this.getTokens(painless_parser.COMMA);
	}
	public COMMA(i: number): TerminalNode {
		return this.getToken(painless_parser.COMMA, i);
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_parameters;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterParameters) {
	 		listener.enterParameters(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitParameters) {
	 		listener.exitParameters(this);
		}
	}
}


export class StatementContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public rstatement(): RstatementContext {
		return this.getTypedRuleContext(RstatementContext, 0) as RstatementContext;
	}
	public dstatement(): DstatementContext {
		return this.getTypedRuleContext(DstatementContext, 0) as DstatementContext;
	}
	public SEMICOLON(): TerminalNode {
		return this.getToken(painless_parser.SEMICOLON, 0);
	}
	public EOF(): TerminalNode {
		return this.getToken(painless_parser.EOF, 0);
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_statement;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterStatement) {
	 		listener.enterStatement(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitStatement) {
	 		listener.exitStatement(this);
		}
	}
}


export class RstatementContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_rstatement;
	}
	public copyFrom(ctx: RstatementContext): void {
		super.copyFrom(ctx);
	}
}
export class ForContext extends RstatementContext {
	constructor(parser: painless_parser, ctx: RstatementContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public FOR(): TerminalNode {
		return this.getToken(painless_parser.FOR, 0);
	}
	public LP(): TerminalNode {
		return this.getToken(painless_parser.LP, 0);
	}
	public SEMICOLON_list(): TerminalNode[] {
	    	return this.getTokens(painless_parser.SEMICOLON);
	}
	public SEMICOLON(i: number): TerminalNode {
		return this.getToken(painless_parser.SEMICOLON, i);
	}
	public RP(): TerminalNode {
		return this.getToken(painless_parser.RP, 0);
	}
	public trailer(): TrailerContext {
		return this.getTypedRuleContext(TrailerContext, 0) as TrailerContext;
	}
	public empty(): EmptyContext {
		return this.getTypedRuleContext(EmptyContext, 0) as EmptyContext;
	}
	public initializer(): InitializerContext {
		return this.getTypedRuleContext(InitializerContext, 0) as InitializerContext;
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public afterthought(): AfterthoughtContext {
		return this.getTypedRuleContext(AfterthoughtContext, 0) as AfterthoughtContext;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterFor) {
	 		listener.enterFor(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitFor) {
	 		listener.exitFor(this);
		}
	}
}
export class TryContext extends RstatementContext {
	constructor(parser: painless_parser, ctx: RstatementContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public TRY(): TerminalNode {
		return this.getToken(painless_parser.TRY, 0);
	}
	public block(): BlockContext {
		return this.getTypedRuleContext(BlockContext, 0) as BlockContext;
	}
	public trap_list(): TrapContext[] {
		return this.getTypedRuleContexts(TrapContext) as TrapContext[];
	}
	public trap(i: number): TrapContext {
		return this.getTypedRuleContext(TrapContext, i) as TrapContext;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterTry) {
	 		listener.enterTry(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitTry) {
	 		listener.exitTry(this);
		}
	}
}
export class WhileContext extends RstatementContext {
	constructor(parser: painless_parser, ctx: RstatementContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public WHILE(): TerminalNode {
		return this.getToken(painless_parser.WHILE, 0);
	}
	public LP(): TerminalNode {
		return this.getToken(painless_parser.LP, 0);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public RP(): TerminalNode {
		return this.getToken(painless_parser.RP, 0);
	}
	public trailer(): TrailerContext {
		return this.getTypedRuleContext(TrailerContext, 0) as TrailerContext;
	}
	public empty(): EmptyContext {
		return this.getTypedRuleContext(EmptyContext, 0) as EmptyContext;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterWhile) {
	 		listener.enterWhile(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitWhile) {
	 		listener.exitWhile(this);
		}
	}
}
export class IneachContext extends RstatementContext {
	constructor(parser: painless_parser, ctx: RstatementContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public FOR(): TerminalNode {
		return this.getToken(painless_parser.FOR, 0);
	}
	public LP(): TerminalNode {
		return this.getToken(painless_parser.LP, 0);
	}
	public ID(): TerminalNode {
		return this.getToken(painless_parser.ID, 0);
	}
	public IN(): TerminalNode {
		return this.getToken(painless_parser.IN, 0);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public RP(): TerminalNode {
		return this.getToken(painless_parser.RP, 0);
	}
	public trailer(): TrailerContext {
		return this.getTypedRuleContext(TrailerContext, 0) as TrailerContext;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterIneach) {
	 		listener.enterIneach(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitIneach) {
	 		listener.exitIneach(this);
		}
	}
}
export class IfContext extends RstatementContext {
	constructor(parser: painless_parser, ctx: RstatementContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public IF(): TerminalNode {
		return this.getToken(painless_parser.IF, 0);
	}
	public LP(): TerminalNode {
		return this.getToken(painless_parser.LP, 0);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public RP(): TerminalNode {
		return this.getToken(painless_parser.RP, 0);
	}
	public trailer_list(): TrailerContext[] {
		return this.getTypedRuleContexts(TrailerContext) as TrailerContext[];
	}
	public trailer(i: number): TrailerContext {
		return this.getTypedRuleContext(TrailerContext, i) as TrailerContext;
	}
	public ELSE(): TerminalNode {
		return this.getToken(painless_parser.ELSE, 0);
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterIf) {
	 		listener.enterIf(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitIf) {
	 		listener.exitIf(this);
		}
	}
}
export class EachContext extends RstatementContext {
	constructor(parser: painless_parser, ctx: RstatementContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public FOR(): TerminalNode {
		return this.getToken(painless_parser.FOR, 0);
	}
	public LP(): TerminalNode {
		return this.getToken(painless_parser.LP, 0);
	}
	public decltype(): DecltypeContext {
		return this.getTypedRuleContext(DecltypeContext, 0) as DecltypeContext;
	}
	public ID(): TerminalNode {
		return this.getToken(painless_parser.ID, 0);
	}
	public COLON(): TerminalNode {
		return this.getToken(painless_parser.COLON, 0);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public RP(): TerminalNode {
		return this.getToken(painless_parser.RP, 0);
	}
	public trailer(): TrailerContext {
		return this.getTypedRuleContext(TrailerContext, 0) as TrailerContext;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterEach) {
	 		listener.enterEach(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitEach) {
	 		listener.exitEach(this);
		}
	}
}


export class DstatementContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_dstatement;
	}
	public copyFrom(ctx: DstatementContext): void {
		super.copyFrom(ctx);
	}
}
export class DeclContext extends DstatementContext {
	constructor(parser: painless_parser, ctx: DstatementContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public declaration(): DeclarationContext {
		return this.getTypedRuleContext(DeclarationContext, 0) as DeclarationContext;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterDecl) {
	 		listener.enterDecl(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitDecl) {
	 		listener.exitDecl(this);
		}
	}
}
export class BreakContext extends DstatementContext {
	constructor(parser: painless_parser, ctx: DstatementContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public BREAK(): TerminalNode {
		return this.getToken(painless_parser.BREAK, 0);
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterBreak) {
	 		listener.enterBreak(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitBreak) {
	 		listener.exitBreak(this);
		}
	}
}
export class ThrowContext extends DstatementContext {
	constructor(parser: painless_parser, ctx: DstatementContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public THROW(): TerminalNode {
		return this.getToken(painless_parser.THROW, 0);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterThrow) {
	 		listener.enterThrow(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitThrow) {
	 		listener.exitThrow(this);
		}
	}
}
export class ContinueContext extends DstatementContext {
	constructor(parser: painless_parser, ctx: DstatementContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public CONTINUE(): TerminalNode {
		return this.getToken(painless_parser.CONTINUE, 0);
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterContinue) {
	 		listener.enterContinue(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitContinue) {
	 		listener.exitContinue(this);
		}
	}
}
export class ExprContext extends DstatementContext {
	constructor(parser: painless_parser, ctx: DstatementContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterExpr) {
	 		listener.enterExpr(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitExpr) {
	 		listener.exitExpr(this);
		}
	}
}
export class DoContext extends DstatementContext {
	constructor(parser: painless_parser, ctx: DstatementContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public DO(): TerminalNode {
		return this.getToken(painless_parser.DO, 0);
	}
	public block(): BlockContext {
		return this.getTypedRuleContext(BlockContext, 0) as BlockContext;
	}
	public WHILE(): TerminalNode {
		return this.getToken(painless_parser.WHILE, 0);
	}
	public LP(): TerminalNode {
		return this.getToken(painless_parser.LP, 0);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public RP(): TerminalNode {
		return this.getToken(painless_parser.RP, 0);
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterDo) {
	 		listener.enterDo(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitDo) {
	 		listener.exitDo(this);
		}
	}
}
export class ReturnContext extends DstatementContext {
	constructor(parser: painless_parser, ctx: DstatementContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public RETURN(): TerminalNode {
		return this.getToken(painless_parser.RETURN, 0);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterReturn) {
	 		listener.enterReturn(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitReturn) {
	 		listener.exitReturn(this);
		}
	}
}


export class TrailerContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public block(): BlockContext {
		return this.getTypedRuleContext(BlockContext, 0) as BlockContext;
	}
	public statement(): StatementContext {
		return this.getTypedRuleContext(StatementContext, 0) as StatementContext;
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_trailer;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterTrailer) {
	 		listener.enterTrailer(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitTrailer) {
	 		listener.exitTrailer(this);
		}
	}
}


export class BlockContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public LBRACK(): TerminalNode {
		return this.getToken(painless_parser.LBRACK, 0);
	}
	public RBRACK(): TerminalNode {
		return this.getToken(painless_parser.RBRACK, 0);
	}
	public statement_list(): StatementContext[] {
		return this.getTypedRuleContexts(StatementContext) as StatementContext[];
	}
	public statement(i: number): StatementContext {
		return this.getTypedRuleContext(StatementContext, i) as StatementContext;
	}
	public dstatement(): DstatementContext {
		return this.getTypedRuleContext(DstatementContext, 0) as DstatementContext;
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_block;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterBlock) {
	 		listener.enterBlock(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitBlock) {
	 		listener.exitBlock(this);
		}
	}
}


export class EmptyContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public SEMICOLON(): TerminalNode {
		return this.getToken(painless_parser.SEMICOLON, 0);
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_empty;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterEmpty) {
	 		listener.enterEmpty(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitEmpty) {
	 		listener.exitEmpty(this);
		}
	}
}


export class InitializerContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public declaration(): DeclarationContext {
		return this.getTypedRuleContext(DeclarationContext, 0) as DeclarationContext;
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_initializer;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterInitializer) {
	 		listener.enterInitializer(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitInitializer) {
	 		listener.exitInitializer(this);
		}
	}
}


export class AfterthoughtContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_afterthought;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterAfterthought) {
	 		listener.enterAfterthought(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitAfterthought) {
	 		listener.exitAfterthought(this);
		}
	}
}


export class DeclarationContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public decltype(): DecltypeContext {
		return this.getTypedRuleContext(DecltypeContext, 0) as DecltypeContext;
	}
	public declvar_list(): DeclvarContext[] {
		return this.getTypedRuleContexts(DeclvarContext) as DeclvarContext[];
	}
	public declvar(i: number): DeclvarContext {
		return this.getTypedRuleContext(DeclvarContext, i) as DeclvarContext;
	}
	public COMMA_list(): TerminalNode[] {
	    	return this.getTokens(painless_parser.COMMA);
	}
	public COMMA(i: number): TerminalNode {
		return this.getToken(painless_parser.COMMA, i);
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_declaration;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterDeclaration) {
	 		listener.enterDeclaration(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitDeclaration) {
	 		listener.exitDeclaration(this);
		}
	}
}


export class DecltypeContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public type_(): TypeContext {
		return this.getTypedRuleContext(TypeContext, 0) as TypeContext;
	}
	public LBRACE_list(): TerminalNode[] {
	    	return this.getTokens(painless_parser.LBRACE);
	}
	public LBRACE(i: number): TerminalNode {
		return this.getToken(painless_parser.LBRACE, i);
	}
	public RBRACE_list(): TerminalNode[] {
	    	return this.getTokens(painless_parser.RBRACE);
	}
	public RBRACE(i: number): TerminalNode {
		return this.getToken(painless_parser.RBRACE, i);
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_decltype;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterDecltype) {
	 		listener.enterDecltype(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitDecltype) {
	 		listener.exitDecltype(this);
		}
	}
}


export class TypeContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public DEF(): TerminalNode {
		return this.getToken(painless_parser.DEF, 0);
	}
	public PRIMITIVE(): TerminalNode {
		return this.getToken(painless_parser.PRIMITIVE, 0);
	}
	public ID(): TerminalNode {
		return this.getToken(painless_parser.ID, 0);
	}
	public DOT_list(): TerminalNode[] {
	    	return this.getTokens(painless_parser.DOT);
	}
	public DOT(i: number): TerminalNode {
		return this.getToken(painless_parser.DOT, i);
	}
	public DOTID_list(): TerminalNode[] {
	    	return this.getTokens(painless_parser.DOTID);
	}
	public DOTID(i: number): TerminalNode {
		return this.getToken(painless_parser.DOTID, i);
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_type;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterType) {
	 		listener.enterType(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitType) {
	 		listener.exitType(this);
		}
	}
}


export class DeclvarContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public ID(): TerminalNode {
		return this.getToken(painless_parser.ID, 0);
	}
	public ASSIGN(): TerminalNode {
		return this.getToken(painless_parser.ASSIGN, 0);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_declvar;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterDeclvar) {
	 		listener.enterDeclvar(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitDeclvar) {
	 		listener.exitDeclvar(this);
		}
	}
}


export class TrapContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public CATCH(): TerminalNode {
		return this.getToken(painless_parser.CATCH, 0);
	}
	public LP(): TerminalNode {
		return this.getToken(painless_parser.LP, 0);
	}
	public type_(): TypeContext {
		return this.getTypedRuleContext(TypeContext, 0) as TypeContext;
	}
	public ID(): TerminalNode {
		return this.getToken(painless_parser.ID, 0);
	}
	public RP(): TerminalNode {
		return this.getToken(painless_parser.RP, 0);
	}
	public block(): BlockContext {
		return this.getTypedRuleContext(BlockContext, 0) as BlockContext;
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_trap;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterTrap) {
	 		listener.enterTrap(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitTrap) {
	 		listener.exitTrap(this);
		}
	}
}


export class NoncondexpressionContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_noncondexpression;
	}
	public copyFrom(ctx: NoncondexpressionContext): void {
		super.copyFrom(ctx);
	}
}
export class SingleContext extends NoncondexpressionContext {
	constructor(parser: painless_parser, ctx: NoncondexpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public unary(): UnaryContext {
		return this.getTypedRuleContext(UnaryContext, 0) as UnaryContext;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterSingle) {
	 		listener.enterSingle(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitSingle) {
	 		listener.exitSingle(this);
		}
	}
}
export class CompContext extends NoncondexpressionContext {
	constructor(parser: painless_parser, ctx: NoncondexpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public noncondexpression_list(): NoncondexpressionContext[] {
		return this.getTypedRuleContexts(NoncondexpressionContext) as NoncondexpressionContext[];
	}
	public noncondexpression(i: number): NoncondexpressionContext {
		return this.getTypedRuleContext(NoncondexpressionContext, i) as NoncondexpressionContext;
	}
	public LT(): TerminalNode {
		return this.getToken(painless_parser.LT, 0);
	}
	public LTE(): TerminalNode {
		return this.getToken(painless_parser.LTE, 0);
	}
	public GT(): TerminalNode {
		return this.getToken(painless_parser.GT, 0);
	}
	public GTE(): TerminalNode {
		return this.getToken(painless_parser.GTE, 0);
	}
	public EQ(): TerminalNode {
		return this.getToken(painless_parser.EQ, 0);
	}
	public EQR(): TerminalNode {
		return this.getToken(painless_parser.EQR, 0);
	}
	public NE(): TerminalNode {
		return this.getToken(painless_parser.NE, 0);
	}
	public NER(): TerminalNode {
		return this.getToken(painless_parser.NER, 0);
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterComp) {
	 		listener.enterComp(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitComp) {
	 		listener.exitComp(this);
		}
	}
}
export class BoolContext extends NoncondexpressionContext {
	constructor(parser: painless_parser, ctx: NoncondexpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public noncondexpression_list(): NoncondexpressionContext[] {
		return this.getTypedRuleContexts(NoncondexpressionContext) as NoncondexpressionContext[];
	}
	public noncondexpression(i: number): NoncondexpressionContext {
		return this.getTypedRuleContext(NoncondexpressionContext, i) as NoncondexpressionContext;
	}
	public BOOLAND(): TerminalNode {
		return this.getToken(painless_parser.BOOLAND, 0);
	}
	public BOOLOR(): TerminalNode {
		return this.getToken(painless_parser.BOOLOR, 0);
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterBool) {
	 		listener.enterBool(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitBool) {
	 		listener.exitBool(this);
		}
	}
}
export class BinaryContext extends NoncondexpressionContext {
	constructor(parser: painless_parser, ctx: NoncondexpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public noncondexpression_list(): NoncondexpressionContext[] {
		return this.getTypedRuleContexts(NoncondexpressionContext) as NoncondexpressionContext[];
	}
	public noncondexpression(i: number): NoncondexpressionContext {
		return this.getTypedRuleContext(NoncondexpressionContext, i) as NoncondexpressionContext;
	}
	public MUL(): TerminalNode {
		return this.getToken(painless_parser.MUL, 0);
	}
	public DIV(): TerminalNode {
		return this.getToken(painless_parser.DIV, 0);
	}
	public REM(): TerminalNode {
		return this.getToken(painless_parser.REM, 0);
	}
	public ADD(): TerminalNode {
		return this.getToken(painless_parser.ADD, 0);
	}
	public SUB(): TerminalNode {
		return this.getToken(painless_parser.SUB, 0);
	}
	public FIND(): TerminalNode {
		return this.getToken(painless_parser.FIND, 0);
	}
	public MATCH(): TerminalNode {
		return this.getToken(painless_parser.MATCH, 0);
	}
	public LSH(): TerminalNode {
		return this.getToken(painless_parser.LSH, 0);
	}
	public RSH(): TerminalNode {
		return this.getToken(painless_parser.RSH, 0);
	}
	public USH(): TerminalNode {
		return this.getToken(painless_parser.USH, 0);
	}
	public BWAND(): TerminalNode {
		return this.getToken(painless_parser.BWAND, 0);
	}
	public XOR(): TerminalNode {
		return this.getToken(painless_parser.XOR, 0);
	}
	public BWOR(): TerminalNode {
		return this.getToken(painless_parser.BWOR, 0);
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterBinary) {
	 		listener.enterBinary(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitBinary) {
	 		listener.exitBinary(this);
		}
	}
}
export class ElvisContext extends NoncondexpressionContext {
	constructor(parser: painless_parser, ctx: NoncondexpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public noncondexpression_list(): NoncondexpressionContext[] {
		return this.getTypedRuleContexts(NoncondexpressionContext) as NoncondexpressionContext[];
	}
	public noncondexpression(i: number): NoncondexpressionContext {
		return this.getTypedRuleContext(NoncondexpressionContext, i) as NoncondexpressionContext;
	}
	public ELVIS(): TerminalNode {
		return this.getToken(painless_parser.ELVIS, 0);
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterElvis) {
	 		listener.enterElvis(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitElvis) {
	 		listener.exitElvis(this);
		}
	}
}
export class InstanceofContext extends NoncondexpressionContext {
	constructor(parser: painless_parser, ctx: NoncondexpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public noncondexpression(): NoncondexpressionContext {
		return this.getTypedRuleContext(NoncondexpressionContext, 0) as NoncondexpressionContext;
	}
	public INSTANCEOF(): TerminalNode {
		return this.getToken(painless_parser.INSTANCEOF, 0);
	}
	public decltype(): DecltypeContext {
		return this.getTypedRuleContext(DecltypeContext, 0) as DecltypeContext;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterInstanceof) {
	 		listener.enterInstanceof(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitInstanceof) {
	 		listener.exitInstanceof(this);
		}
	}
}


export class ExpressionContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_expression;
	}
	public copyFrom(ctx: ExpressionContext): void {
		super.copyFrom(ctx);
	}
}
export class ConditionalContext extends ExpressionContext {
	constructor(parser: painless_parser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public noncondexpression(): NoncondexpressionContext {
		return this.getTypedRuleContext(NoncondexpressionContext, 0) as NoncondexpressionContext;
	}
	public COND(): TerminalNode {
		return this.getToken(painless_parser.COND, 0);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public COLON(): TerminalNode {
		return this.getToken(painless_parser.COLON, 0);
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterConditional) {
	 		listener.enterConditional(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitConditional) {
	 		listener.exitConditional(this);
		}
	}
}
export class AssignmentContext extends ExpressionContext {
	constructor(parser: painless_parser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public noncondexpression(): NoncondexpressionContext {
		return this.getTypedRuleContext(NoncondexpressionContext, 0) as NoncondexpressionContext;
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public ASSIGN(): TerminalNode {
		return this.getToken(painless_parser.ASSIGN, 0);
	}
	public AADD(): TerminalNode {
		return this.getToken(painless_parser.AADD, 0);
	}
	public ASUB(): TerminalNode {
		return this.getToken(painless_parser.ASUB, 0);
	}
	public AMUL(): TerminalNode {
		return this.getToken(painless_parser.AMUL, 0);
	}
	public ADIV(): TerminalNode {
		return this.getToken(painless_parser.ADIV, 0);
	}
	public AREM(): TerminalNode {
		return this.getToken(painless_parser.AREM, 0);
	}
	public AAND(): TerminalNode {
		return this.getToken(painless_parser.AAND, 0);
	}
	public AXOR(): TerminalNode {
		return this.getToken(painless_parser.AXOR, 0);
	}
	public AOR(): TerminalNode {
		return this.getToken(painless_parser.AOR, 0);
	}
	public ALSH(): TerminalNode {
		return this.getToken(painless_parser.ALSH, 0);
	}
	public ARSH(): TerminalNode {
		return this.getToken(painless_parser.ARSH, 0);
	}
	public AUSH(): TerminalNode {
		return this.getToken(painless_parser.AUSH, 0);
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterAssignment) {
	 		listener.enterAssignment(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitAssignment) {
	 		listener.exitAssignment(this);
		}
	}
}
export class NonconditionalContext extends ExpressionContext {
	constructor(parser: painless_parser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public noncondexpression(): NoncondexpressionContext {
		return this.getTypedRuleContext(NoncondexpressionContext, 0) as NoncondexpressionContext;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterNonconditional) {
	 		listener.enterNonconditional(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitNonconditional) {
	 		listener.exitNonconditional(this);
		}
	}
}


export class UnaryContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_unary;
	}
	public copyFrom(ctx: UnaryContext): void {
		super.copyFrom(ctx);
	}
}
export class NotaddsubContext extends UnaryContext {
	constructor(parser: painless_parser, ctx: UnaryContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public unarynotaddsub(): UnarynotaddsubContext {
		return this.getTypedRuleContext(UnarynotaddsubContext, 0) as UnarynotaddsubContext;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterNotaddsub) {
	 		listener.enterNotaddsub(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitNotaddsub) {
	 		listener.exitNotaddsub(this);
		}
	}
}
export class PreContext extends UnaryContext {
	constructor(parser: painless_parser, ctx: UnaryContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public chain(): ChainContext {
		return this.getTypedRuleContext(ChainContext, 0) as ChainContext;
	}
	public INCR(): TerminalNode {
		return this.getToken(painless_parser.INCR, 0);
	}
	public DECR(): TerminalNode {
		return this.getToken(painless_parser.DECR, 0);
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterPre) {
	 		listener.enterPre(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitPre) {
	 		listener.exitPre(this);
		}
	}
}
export class AddsubContext extends UnaryContext {
	constructor(parser: painless_parser, ctx: UnaryContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public unary(): UnaryContext {
		return this.getTypedRuleContext(UnaryContext, 0) as UnaryContext;
	}
	public ADD(): TerminalNode {
		return this.getToken(painless_parser.ADD, 0);
	}
	public SUB(): TerminalNode {
		return this.getToken(painless_parser.SUB, 0);
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterAddsub) {
	 		listener.enterAddsub(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitAddsub) {
	 		listener.exitAddsub(this);
		}
	}
}


export class UnarynotaddsubContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_unarynotaddsub;
	}
	public copyFrom(ctx: UnarynotaddsubContext): void {
		super.copyFrom(ctx);
	}
}
export class CastContext extends UnarynotaddsubContext {
	constructor(parser: painless_parser, ctx: UnarynotaddsubContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public castexpression(): CastexpressionContext {
		return this.getTypedRuleContext(CastexpressionContext, 0) as CastexpressionContext;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterCast) {
	 		listener.enterCast(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitCast) {
	 		listener.exitCast(this);
		}
	}
}
export class NotContext extends UnarynotaddsubContext {
	constructor(parser: painless_parser, ctx: UnarynotaddsubContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public unary(): UnaryContext {
		return this.getTypedRuleContext(UnaryContext, 0) as UnaryContext;
	}
	public BOOLNOT(): TerminalNode {
		return this.getToken(painless_parser.BOOLNOT, 0);
	}
	public BWNOT(): TerminalNode {
		return this.getToken(painless_parser.BWNOT, 0);
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterNot) {
	 		listener.enterNot(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitNot) {
	 		listener.exitNot(this);
		}
	}
}
export class ReadContext extends UnarynotaddsubContext {
	constructor(parser: painless_parser, ctx: UnarynotaddsubContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public chain(): ChainContext {
		return this.getTypedRuleContext(ChainContext, 0) as ChainContext;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterRead) {
	 		listener.enterRead(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitRead) {
	 		listener.exitRead(this);
		}
	}
}
export class PostContext extends UnarynotaddsubContext {
	constructor(parser: painless_parser, ctx: UnarynotaddsubContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public chain(): ChainContext {
		return this.getTypedRuleContext(ChainContext, 0) as ChainContext;
	}
	public INCR(): TerminalNode {
		return this.getToken(painless_parser.INCR, 0);
	}
	public DECR(): TerminalNode {
		return this.getToken(painless_parser.DECR, 0);
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterPost) {
	 		listener.enterPost(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitPost) {
	 		listener.exitPost(this);
		}
	}
}


export class CastexpressionContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_castexpression;
	}
	public copyFrom(ctx: CastexpressionContext): void {
		super.copyFrom(ctx);
	}
}
export class RefcastContext extends CastexpressionContext {
	constructor(parser: painless_parser, ctx: CastexpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public LP(): TerminalNode {
		return this.getToken(painless_parser.LP, 0);
	}
	public refcasttype(): RefcasttypeContext {
		return this.getTypedRuleContext(RefcasttypeContext, 0) as RefcasttypeContext;
	}
	public RP(): TerminalNode {
		return this.getToken(painless_parser.RP, 0);
	}
	public unarynotaddsub(): UnarynotaddsubContext {
		return this.getTypedRuleContext(UnarynotaddsubContext, 0) as UnarynotaddsubContext;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterRefcast) {
	 		listener.enterRefcast(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitRefcast) {
	 		listener.exitRefcast(this);
		}
	}
}
export class PrimordefcastContext extends CastexpressionContext {
	constructor(parser: painless_parser, ctx: CastexpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public LP(): TerminalNode {
		return this.getToken(painless_parser.LP, 0);
	}
	public primordefcasttype(): PrimordefcasttypeContext {
		return this.getTypedRuleContext(PrimordefcasttypeContext, 0) as PrimordefcasttypeContext;
	}
	public RP(): TerminalNode {
		return this.getToken(painless_parser.RP, 0);
	}
	public unary(): UnaryContext {
		return this.getTypedRuleContext(UnaryContext, 0) as UnaryContext;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterPrimordefcast) {
	 		listener.enterPrimordefcast(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitPrimordefcast) {
	 		listener.exitPrimordefcast(this);
		}
	}
}


export class PrimordefcasttypeContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public DEF(): TerminalNode {
		return this.getToken(painless_parser.DEF, 0);
	}
	public PRIMITIVE(): TerminalNode {
		return this.getToken(painless_parser.PRIMITIVE, 0);
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_primordefcasttype;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterPrimordefcasttype) {
	 		listener.enterPrimordefcasttype(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitPrimordefcasttype) {
	 		listener.exitPrimordefcasttype(this);
		}
	}
}


export class RefcasttypeContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public DEF(): TerminalNode {
		return this.getToken(painless_parser.DEF, 0);
	}
	public LBRACE_list(): TerminalNode[] {
	    	return this.getTokens(painless_parser.LBRACE);
	}
	public LBRACE(i: number): TerminalNode {
		return this.getToken(painless_parser.LBRACE, i);
	}
	public RBRACE_list(): TerminalNode[] {
	    	return this.getTokens(painless_parser.RBRACE);
	}
	public RBRACE(i: number): TerminalNode {
		return this.getToken(painless_parser.RBRACE, i);
	}
	public PRIMITIVE(): TerminalNode {
		return this.getToken(painless_parser.PRIMITIVE, 0);
	}
	public ID(): TerminalNode {
		return this.getToken(painless_parser.ID, 0);
	}
	public DOT_list(): TerminalNode[] {
	    	return this.getTokens(painless_parser.DOT);
	}
	public DOT(i: number): TerminalNode {
		return this.getToken(painless_parser.DOT, i);
	}
	public DOTID_list(): TerminalNode[] {
	    	return this.getTokens(painless_parser.DOTID);
	}
	public DOTID(i: number): TerminalNode {
		return this.getToken(painless_parser.DOTID, i);
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_refcasttype;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterRefcasttype) {
	 		listener.enterRefcasttype(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitRefcasttype) {
	 		listener.exitRefcasttype(this);
		}
	}
}


export class ChainContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_chain;
	}
	public copyFrom(ctx: ChainContext): void {
		super.copyFrom(ctx);
	}
}
export class DynamicContext extends ChainContext {
	constructor(parser: painless_parser, ctx: ChainContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public primary(): PrimaryContext {
		return this.getTypedRuleContext(PrimaryContext, 0) as PrimaryContext;
	}
	public postfix_list(): PostfixContext[] {
		return this.getTypedRuleContexts(PostfixContext) as PostfixContext[];
	}
	public postfix(i: number): PostfixContext {
		return this.getTypedRuleContext(PostfixContext, i) as PostfixContext;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterDynamic) {
	 		listener.enterDynamic(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitDynamic) {
	 		listener.exitDynamic(this);
		}
	}
}
export class NewarrayContext extends ChainContext {
	constructor(parser: painless_parser, ctx: ChainContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public arrayinitializer(): ArrayinitializerContext {
		return this.getTypedRuleContext(ArrayinitializerContext, 0) as ArrayinitializerContext;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterNewarray) {
	 		listener.enterNewarray(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitNewarray) {
	 		listener.exitNewarray(this);
		}
	}
}


export class PrimaryContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_primary;
	}
	public copyFrom(ctx: PrimaryContext): void {
		super.copyFrom(ctx);
	}
}
export class ListinitContext extends PrimaryContext {
	constructor(parser: painless_parser, ctx: PrimaryContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public listinitializer(): ListinitializerContext {
		return this.getTypedRuleContext(ListinitializerContext, 0) as ListinitializerContext;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterListinit) {
	 		listener.enterListinit(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitListinit) {
	 		listener.exitListinit(this);
		}
	}
}
export class RegexContext extends PrimaryContext {
	constructor(parser: painless_parser, ctx: PrimaryContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public REGEX(): TerminalNode {
		return this.getToken(painless_parser.REGEX, 0);
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterRegex) {
	 		listener.enterRegex(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitRegex) {
	 		listener.exitRegex(this);
		}
	}
}
export class NullContext extends PrimaryContext {
	constructor(parser: painless_parser, ctx: PrimaryContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public NULL(): TerminalNode {
		return this.getToken(painless_parser.NULL, 0);
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterNull) {
	 		listener.enterNull(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitNull) {
	 		listener.exitNull(this);
		}
	}
}
export class StringContext extends PrimaryContext {
	constructor(parser: painless_parser, ctx: PrimaryContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public STRING(): TerminalNode {
		return this.getToken(painless_parser.STRING, 0);
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterString) {
	 		listener.enterString(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitString) {
	 		listener.exitString(this);
		}
	}
}
export class MapinitContext extends PrimaryContext {
	constructor(parser: painless_parser, ctx: PrimaryContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public mapinitializer(): MapinitializerContext {
		return this.getTypedRuleContext(MapinitializerContext, 0) as MapinitializerContext;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterMapinit) {
	 		listener.enterMapinit(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitMapinit) {
	 		listener.exitMapinit(this);
		}
	}
}
export class CalllocalContext extends PrimaryContext {
	constructor(parser: painless_parser, ctx: PrimaryContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public arguments(): ArgumentsContext {
		return this.getTypedRuleContext(ArgumentsContext, 0) as ArgumentsContext;
	}
	public ID(): TerminalNode {
		return this.getToken(painless_parser.ID, 0);
	}
	public DOLLAR(): TerminalNode {
		return this.getToken(painless_parser.DOLLAR, 0);
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterCalllocal) {
	 		listener.enterCalllocal(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitCalllocal) {
	 		listener.exitCalllocal(this);
		}
	}
}
export class TrueContext extends PrimaryContext {
	constructor(parser: painless_parser, ctx: PrimaryContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public TRUE(): TerminalNode {
		return this.getToken(painless_parser.TRUE, 0);
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterTrue) {
	 		listener.enterTrue(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitTrue) {
	 		listener.exitTrue(this);
		}
	}
}
export class FalseContext extends PrimaryContext {
	constructor(parser: painless_parser, ctx: PrimaryContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public FALSE(): TerminalNode {
		return this.getToken(painless_parser.FALSE, 0);
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterFalse) {
	 		listener.enterFalse(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitFalse) {
	 		listener.exitFalse(this);
		}
	}
}
export class VariableContext extends PrimaryContext {
	constructor(parser: painless_parser, ctx: PrimaryContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public ID(): TerminalNode {
		return this.getToken(painless_parser.ID, 0);
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterVariable) {
	 		listener.enterVariable(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitVariable) {
	 		listener.exitVariable(this);
		}
	}
}
export class NumericContext extends PrimaryContext {
	constructor(parser: painless_parser, ctx: PrimaryContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public OCTAL(): TerminalNode {
		return this.getToken(painless_parser.OCTAL, 0);
	}
	public HEX(): TerminalNode {
		return this.getToken(painless_parser.HEX, 0);
	}
	public INTEGER(): TerminalNode {
		return this.getToken(painless_parser.INTEGER, 0);
	}
	public DECIMAL(): TerminalNode {
		return this.getToken(painless_parser.DECIMAL, 0);
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterNumeric) {
	 		listener.enterNumeric(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitNumeric) {
	 		listener.exitNumeric(this);
		}
	}
}
export class NewobjectContext extends PrimaryContext {
	constructor(parser: painless_parser, ctx: PrimaryContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public NEW(): TerminalNode {
		return this.getToken(painless_parser.NEW, 0);
	}
	public type_(): TypeContext {
		return this.getTypedRuleContext(TypeContext, 0) as TypeContext;
	}
	public arguments(): ArgumentsContext {
		return this.getTypedRuleContext(ArgumentsContext, 0) as ArgumentsContext;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterNewobject) {
	 		listener.enterNewobject(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitNewobject) {
	 		listener.exitNewobject(this);
		}
	}
}
export class PrecedenceContext extends PrimaryContext {
	constructor(parser: painless_parser, ctx: PrimaryContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public LP(): TerminalNode {
		return this.getToken(painless_parser.LP, 0);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public RP(): TerminalNode {
		return this.getToken(painless_parser.RP, 0);
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterPrecedence) {
	 		listener.enterPrecedence(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitPrecedence) {
	 		listener.exitPrecedence(this);
		}
	}
}


export class PostfixContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public callinvoke(): CallinvokeContext {
		return this.getTypedRuleContext(CallinvokeContext, 0) as CallinvokeContext;
	}
	public fieldaccess(): FieldaccessContext {
		return this.getTypedRuleContext(FieldaccessContext, 0) as FieldaccessContext;
	}
	public braceaccess(): BraceaccessContext {
		return this.getTypedRuleContext(BraceaccessContext, 0) as BraceaccessContext;
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_postfix;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterPostfix) {
	 		listener.enterPostfix(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitPostfix) {
	 		listener.exitPostfix(this);
		}
	}
}


export class PostdotContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public callinvoke(): CallinvokeContext {
		return this.getTypedRuleContext(CallinvokeContext, 0) as CallinvokeContext;
	}
	public fieldaccess(): FieldaccessContext {
		return this.getTypedRuleContext(FieldaccessContext, 0) as FieldaccessContext;
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_postdot;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterPostdot) {
	 		listener.enterPostdot(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitPostdot) {
	 		listener.exitPostdot(this);
		}
	}
}


export class CallinvokeContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public DOTID(): TerminalNode {
		return this.getToken(painless_parser.DOTID, 0);
	}
	public arguments(): ArgumentsContext {
		return this.getTypedRuleContext(ArgumentsContext, 0) as ArgumentsContext;
	}
	public DOT(): TerminalNode {
		return this.getToken(painless_parser.DOT, 0);
	}
	public NSDOT(): TerminalNode {
		return this.getToken(painless_parser.NSDOT, 0);
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_callinvoke;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterCallinvoke) {
	 		listener.enterCallinvoke(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitCallinvoke) {
	 		listener.exitCallinvoke(this);
		}
	}
}


export class FieldaccessContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public DOT(): TerminalNode {
		return this.getToken(painless_parser.DOT, 0);
	}
	public NSDOT(): TerminalNode {
		return this.getToken(painless_parser.NSDOT, 0);
	}
	public DOTID(): TerminalNode {
		return this.getToken(painless_parser.DOTID, 0);
	}
	public DOTINTEGER(): TerminalNode {
		return this.getToken(painless_parser.DOTINTEGER, 0);
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_fieldaccess;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterFieldaccess) {
	 		listener.enterFieldaccess(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitFieldaccess) {
	 		listener.exitFieldaccess(this);
		}
	}
}


export class BraceaccessContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public LBRACE(): TerminalNode {
		return this.getToken(painless_parser.LBRACE, 0);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public RBRACE(): TerminalNode {
		return this.getToken(painless_parser.RBRACE, 0);
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_braceaccess;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterBraceaccess) {
	 		listener.enterBraceaccess(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitBraceaccess) {
	 		listener.exitBraceaccess(this);
		}
	}
}


export class ArrayinitializerContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_arrayinitializer;
	}
	public copyFrom(ctx: ArrayinitializerContext): void {
		super.copyFrom(ctx);
	}
}
export class NewstandardarrayContext extends ArrayinitializerContext {
	constructor(parser: painless_parser, ctx: ArrayinitializerContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public NEW(): TerminalNode {
		return this.getToken(painless_parser.NEW, 0);
	}
	public type_(): TypeContext {
		return this.getTypedRuleContext(TypeContext, 0) as TypeContext;
	}
	public LBRACE_list(): TerminalNode[] {
	    	return this.getTokens(painless_parser.LBRACE);
	}
	public LBRACE(i: number): TerminalNode {
		return this.getToken(painless_parser.LBRACE, i);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public RBRACE_list(): TerminalNode[] {
	    	return this.getTokens(painless_parser.RBRACE);
	}
	public RBRACE(i: number): TerminalNode {
		return this.getToken(painless_parser.RBRACE, i);
	}
	public postdot(): PostdotContext {
		return this.getTypedRuleContext(PostdotContext, 0) as PostdotContext;
	}
	public postfix_list(): PostfixContext[] {
		return this.getTypedRuleContexts(PostfixContext) as PostfixContext[];
	}
	public postfix(i: number): PostfixContext {
		return this.getTypedRuleContext(PostfixContext, i) as PostfixContext;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterNewstandardarray) {
	 		listener.enterNewstandardarray(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitNewstandardarray) {
	 		listener.exitNewstandardarray(this);
		}
	}
}
export class NewinitializedarrayContext extends ArrayinitializerContext {
	constructor(parser: painless_parser, ctx: ArrayinitializerContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public NEW(): TerminalNode {
		return this.getToken(painless_parser.NEW, 0);
	}
	public type_(): TypeContext {
		return this.getTypedRuleContext(TypeContext, 0) as TypeContext;
	}
	public LBRACE(): TerminalNode {
		return this.getToken(painless_parser.LBRACE, 0);
	}
	public RBRACE(): TerminalNode {
		return this.getToken(painless_parser.RBRACE, 0);
	}
	public LBRACK(): TerminalNode {
		return this.getToken(painless_parser.LBRACK, 0);
	}
	public RBRACK(): TerminalNode {
		return this.getToken(painless_parser.RBRACK, 0);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public postfix_list(): PostfixContext[] {
		return this.getTypedRuleContexts(PostfixContext) as PostfixContext[];
	}
	public postfix(i: number): PostfixContext {
		return this.getTypedRuleContext(PostfixContext, i) as PostfixContext;
	}
	public COMMA_list(): TerminalNode[] {
	    	return this.getTokens(painless_parser.COMMA);
	}
	public COMMA(i: number): TerminalNode {
		return this.getToken(painless_parser.COMMA, i);
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterNewinitializedarray) {
	 		listener.enterNewinitializedarray(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitNewinitializedarray) {
	 		listener.exitNewinitializedarray(this);
		}
	}
}


export class ListinitializerContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public LBRACE(): TerminalNode {
		return this.getToken(painless_parser.LBRACE, 0);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public RBRACE(): TerminalNode {
		return this.getToken(painless_parser.RBRACE, 0);
	}
	public COMMA_list(): TerminalNode[] {
	    	return this.getTokens(painless_parser.COMMA);
	}
	public COMMA(i: number): TerminalNode {
		return this.getToken(painless_parser.COMMA, i);
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_listinitializer;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterListinitializer) {
	 		listener.enterListinitializer(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitListinitializer) {
	 		listener.exitListinitializer(this);
		}
	}
}


export class MapinitializerContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public LBRACE(): TerminalNode {
		return this.getToken(painless_parser.LBRACE, 0);
	}
	public maptoken_list(): MaptokenContext[] {
		return this.getTypedRuleContexts(MaptokenContext) as MaptokenContext[];
	}
	public maptoken(i: number): MaptokenContext {
		return this.getTypedRuleContext(MaptokenContext, i) as MaptokenContext;
	}
	public RBRACE(): TerminalNode {
		return this.getToken(painless_parser.RBRACE, 0);
	}
	public COMMA_list(): TerminalNode[] {
	    	return this.getTokens(painless_parser.COMMA);
	}
	public COMMA(i: number): TerminalNode {
		return this.getToken(painless_parser.COMMA, i);
	}
	public COLON(): TerminalNode {
		return this.getToken(painless_parser.COLON, 0);
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_mapinitializer;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterMapinitializer) {
	 		listener.enterMapinitializer(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitMapinitializer) {
	 		listener.exitMapinitializer(this);
		}
	}
}


export class MaptokenContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public COLON(): TerminalNode {
		return this.getToken(painless_parser.COLON, 0);
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_maptoken;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterMaptoken) {
	 		listener.enterMaptoken(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitMaptoken) {
	 		listener.exitMaptoken(this);
		}
	}
}


export class ArgumentsContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public LP(): TerminalNode {
		return this.getToken(painless_parser.LP, 0);
	}
	public RP(): TerminalNode {
		return this.getToken(painless_parser.RP, 0);
	}
	public argument_list(): ArgumentContext[] {
		return this.getTypedRuleContexts(ArgumentContext) as ArgumentContext[];
	}
	public argument(i: number): ArgumentContext {
		return this.getTypedRuleContext(ArgumentContext, i) as ArgumentContext;
	}
	public COMMA_list(): TerminalNode[] {
	    	return this.getTokens(painless_parser.COMMA);
	}
	public COMMA(i: number): TerminalNode {
		return this.getToken(painless_parser.COMMA, i);
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_arguments;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterArguments) {
	 		listener.enterArguments(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitArguments) {
	 		listener.exitArguments(this);
		}
	}
}


export class ArgumentContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public lambda(): LambdaContext {
		return this.getTypedRuleContext(LambdaContext, 0) as LambdaContext;
	}
	public funcref(): FuncrefContext {
		return this.getTypedRuleContext(FuncrefContext, 0) as FuncrefContext;
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_argument;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterArgument) {
	 		listener.enterArgument(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitArgument) {
	 		listener.exitArgument(this);
		}
	}
}


export class LambdaContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public ARROW(): TerminalNode {
		return this.getToken(painless_parser.ARROW, 0);
	}
	public lamtype_list(): LamtypeContext[] {
		return this.getTypedRuleContexts(LamtypeContext) as LamtypeContext[];
	}
	public lamtype(i: number): LamtypeContext {
		return this.getTypedRuleContext(LamtypeContext, i) as LamtypeContext;
	}
	public LP(): TerminalNode {
		return this.getToken(painless_parser.LP, 0);
	}
	public RP(): TerminalNode {
		return this.getToken(painless_parser.RP, 0);
	}
	public block(): BlockContext {
		return this.getTypedRuleContext(BlockContext, 0) as BlockContext;
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public COMMA_list(): TerminalNode[] {
	    	return this.getTokens(painless_parser.COMMA);
	}
	public COMMA(i: number): TerminalNode {
		return this.getToken(painless_parser.COMMA, i);
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_lambda;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterLambda) {
	 		listener.enterLambda(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitLambda) {
	 		listener.exitLambda(this);
		}
	}
}


export class LamtypeContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public ID(): TerminalNode {
		return this.getToken(painless_parser.ID, 0);
	}
	public decltype(): DecltypeContext {
		return this.getTypedRuleContext(DecltypeContext, 0) as DecltypeContext;
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_lamtype;
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterLamtype) {
	 		listener.enterLamtype(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitLamtype) {
	 		listener.exitLamtype(this);
		}
	}
}


export class FuncrefContext extends ParserRuleContext {
	constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return painless_parser.RULE_funcref;
	}
	public copyFrom(ctx: FuncrefContext): void {
		super.copyFrom(ctx);
	}
}
export class ClassfuncrefContext extends FuncrefContext {
	constructor(parser: painless_parser, ctx: FuncrefContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public decltype(): DecltypeContext {
		return this.getTypedRuleContext(DecltypeContext, 0) as DecltypeContext;
	}
	public REF(): TerminalNode {
		return this.getToken(painless_parser.REF, 0);
	}
	public ID(): TerminalNode {
		return this.getToken(painless_parser.ID, 0);
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterClassfuncref) {
	 		listener.enterClassfuncref(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitClassfuncref) {
	 		listener.exitClassfuncref(this);
		}
	}
}
export class ConstructorfuncrefContext extends FuncrefContext {
	constructor(parser: painless_parser, ctx: FuncrefContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public decltype(): DecltypeContext {
		return this.getTypedRuleContext(DecltypeContext, 0) as DecltypeContext;
	}
	public REF(): TerminalNode {
		return this.getToken(painless_parser.REF, 0);
	}
	public NEW(): TerminalNode {
		return this.getToken(painless_parser.NEW, 0);
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterConstructorfuncref) {
	 		listener.enterConstructorfuncref(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitConstructorfuncref) {
	 		listener.exitConstructorfuncref(this);
		}
	}
}
export class LocalfuncrefContext extends FuncrefContext {
	constructor(parser: painless_parser, ctx: FuncrefContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public THIS(): TerminalNode {
		return this.getToken(painless_parser.THIS, 0);
	}
	public REF(): TerminalNode {
		return this.getToken(painless_parser.REF, 0);
	}
	public ID(): TerminalNode {
		return this.getToken(painless_parser.ID, 0);
	}
	public enterRule(listener: painless_parserListener): void {
	    if(listener.enterLocalfuncref) {
	 		listener.enterLocalfuncref(this);
		}
	}
	public exitRule(listener: painless_parserListener): void {
	    if(listener.exitLocalfuncref) {
	 		listener.exitLocalfuncref(this);
		}
	}
}
