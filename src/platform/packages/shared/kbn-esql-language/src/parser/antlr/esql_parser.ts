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


/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import parser_config from './parser_config.js';

export default class esql_parser extends parser_config {
	public static readonly LINE_COMMENT = 1;
	public static readonly MULTILINE_COMMENT = 2;
	public static readonly WS = 3;
	public static readonly CHANGE_POINT = 4;
	public static readonly ENRICH = 5;
	public static readonly DEV_EXPLAIN = 6;
	public static readonly COMPLETION = 7;
	public static readonly DISSECT = 8;
	public static readonly EVAL = 9;
	public static readonly GROK = 10;
	public static readonly LIMIT = 11;
	public static readonly RERANK = 12;
	public static readonly ROW = 13;
	public static readonly SAMPLE = 14;
	public static readonly SORT = 15;
	public static readonly STATS = 16;
	public static readonly WHERE = 17;
	public static readonly FROM = 18;
	public static readonly TS = 19;
	public static readonly FORK = 20;
	public static readonly FUSE = 21;
	public static readonly INLINE = 22;
	public static readonly INLINESTATS = 23;
	public static readonly JOIN_LOOKUP = 24;
	public static readonly DEV_JOIN_FULL = 25;
	public static readonly DEV_JOIN_LEFT = 26;
	public static readonly DEV_JOIN_RIGHT = 27;
	public static readonly DEV_LOOKUP = 28;
	public static readonly MV_EXPAND = 29;
	public static readonly DROP = 30;
	public static readonly KEEP = 31;
	public static readonly DEV_INSIST = 32;
	public static readonly DEV_PROMQL = 33;
	public static readonly RENAME = 34;
	public static readonly SET = 35;
	public static readonly SHOW = 36;
	public static readonly UNKNOWN_CMD = 37;
	public static readonly CHANGE_POINT_LINE_COMMENT = 38;
	public static readonly CHANGE_POINT_MULTILINE_COMMENT = 39;
	public static readonly CHANGE_POINT_WS = 40;
	public static readonly ENRICH_POLICY_NAME = 41;
	public static readonly ENRICH_LINE_COMMENT = 42;
	public static readonly ENRICH_MULTILINE_COMMENT = 43;
	public static readonly ENRICH_WS = 44;
	public static readonly ENRICH_FIELD_LINE_COMMENT = 45;
	public static readonly ENRICH_FIELD_MULTILINE_COMMENT = 46;
	public static readonly ENRICH_FIELD_WS = 47;
	public static readonly EXPLAIN_WS = 48;
	public static readonly EXPLAIN_LINE_COMMENT = 49;
	public static readonly EXPLAIN_MULTILINE_COMMENT = 50;
	public static readonly PIPE = 51;
	public static readonly QUOTED_STRING = 52;
	public static readonly INTEGER_LITERAL = 53;
	public static readonly DECIMAL_LITERAL = 54;
	public static readonly AND = 55;
	public static readonly ASC = 56;
	public static readonly ASSIGN = 57;
	public static readonly BY = 58;
	public static readonly CAST_OP = 59;
	public static readonly COLON = 60;
	public static readonly SEMICOLON = 61;
	public static readonly COMMA = 62;
	public static readonly DESC = 63;
	public static readonly DOT = 64;
	public static readonly FALSE = 65;
	public static readonly FIRST = 66;
	public static readonly IN = 67;
	public static readonly IS = 68;
	public static readonly LAST = 69;
	public static readonly LIKE = 70;
	public static readonly NOT = 71;
	public static readonly NULL = 72;
	public static readonly NULLS = 73;
	public static readonly ON = 74;
	public static readonly OR = 75;
	public static readonly PARAM = 76;
	public static readonly RLIKE = 77;
	public static readonly TRUE = 78;
	public static readonly WITH = 79;
	public static readonly EQ = 80;
	public static readonly CIEQ = 81;
	public static readonly NEQ = 82;
	public static readonly LT = 83;
	public static readonly LTE = 84;
	public static readonly GT = 85;
	public static readonly GTE = 86;
	public static readonly PLUS = 87;
	public static readonly MINUS = 88;
	public static readonly ASTERISK = 89;
	public static readonly SLASH = 90;
	public static readonly PERCENT = 91;
	public static readonly LEFT_BRACES = 92;
	public static readonly RIGHT_BRACES = 93;
	public static readonly DOUBLE_PARAMS = 94;
	public static readonly NAMED_OR_POSITIONAL_PARAM = 95;
	public static readonly NAMED_OR_POSITIONAL_DOUBLE_PARAMS = 96;
	public static readonly OPENING_BRACKET = 97;
	public static readonly CLOSING_BRACKET = 98;
	public static readonly LP = 99;
	public static readonly RP = 100;
	public static readonly UNQUOTED_IDENTIFIER = 101;
	public static readonly QUOTED_IDENTIFIER = 102;
	public static readonly EXPR_LINE_COMMENT = 103;
	public static readonly EXPR_MULTILINE_COMMENT = 104;
	public static readonly EXPR_WS = 105;
	public static readonly METADATA = 106;
	public static readonly UNQUOTED_SOURCE = 107;
	public static readonly FROM_LINE_COMMENT = 108;
	public static readonly FROM_MULTILINE_COMMENT = 109;
	public static readonly FROM_WS = 110;
	public static readonly FORK_WS = 111;
	public static readonly FORK_LINE_COMMENT = 112;
	public static readonly FORK_MULTILINE_COMMENT = 113;
	public static readonly GROUP = 114;
	public static readonly SCORE = 115;
	public static readonly KEY = 116;
	public static readonly FUSE_LINE_COMMENT = 117;
	public static readonly FUSE_MULTILINE_COMMENT = 118;
	public static readonly FUSE_WS = 119;
	public static readonly INLINE_STATS = 120;
	public static readonly INLINE_LINE_COMMENT = 121;
	public static readonly INLINE_MULTILINE_COMMENT = 122;
	public static readonly INLINE_WS = 123;
	public static readonly JOIN = 124;
	public static readonly USING = 125;
	public static readonly JOIN_LINE_COMMENT = 126;
	public static readonly JOIN_MULTILINE_COMMENT = 127;
	public static readonly JOIN_WS = 128;
	public static readonly LOOKUP_LINE_COMMENT = 129;
	public static readonly LOOKUP_MULTILINE_COMMENT = 130;
	public static readonly LOOKUP_WS = 131;
	public static readonly LOOKUP_FIELD_LINE_COMMENT = 132;
	public static readonly LOOKUP_FIELD_MULTILINE_COMMENT = 133;
	public static readonly LOOKUP_FIELD_WS = 134;
	public static readonly MVEXPAND_LINE_COMMENT = 135;
	public static readonly MVEXPAND_MULTILINE_COMMENT = 136;
	public static readonly MVEXPAND_WS = 137;
	public static readonly ID_PATTERN = 138;
	public static readonly PROJECT_LINE_COMMENT = 139;
	public static readonly PROJECT_MULTILINE_COMMENT = 140;
	public static readonly PROJECT_WS = 141;
	public static readonly PROMQL_PARAMS_LINE_COMMENT = 142;
	public static readonly PROMQL_PARAMS_MULTILINE_COMMENT = 143;
	public static readonly PROMQL_PARAMS_WS = 144;
	public static readonly PROMQL_QUERY_COMMENT = 145;
	public static readonly PROMQL_SINGLE_QUOTED_STRING = 146;
	public static readonly PROMQL_OTHER_QUERY_CONTENT = 147;
	public static readonly AS = 148;
	public static readonly RENAME_LINE_COMMENT = 149;
	public static readonly RENAME_MULTILINE_COMMENT = 150;
	public static readonly RENAME_WS = 151;
	public static readonly SET_LINE_COMMENT = 152;
	public static readonly SET_MULTILINE_COMMENT = 153;
	public static readonly SET_WS = 154;
	public static readonly INFO = 155;
	public static readonly SHOW_LINE_COMMENT = 156;
	public static readonly SHOW_MULTILINE_COMMENT = 157;
	public static readonly SHOW_WS = 158;
	public static override readonly EOF = Token.EOF;
	public static readonly RULE_statements = 0;
	public static readonly RULE_singleStatement = 1;
	public static readonly RULE_query = 2;
	public static readonly RULE_sourceCommand = 3;
	public static readonly RULE_processingCommand = 4;
	public static readonly RULE_whereCommand = 5;
	public static readonly RULE_dataType = 6;
	public static readonly RULE_rowCommand = 7;
	public static readonly RULE_fields = 8;
	public static readonly RULE_field = 9;
	public static readonly RULE_rerankFields = 10;
	public static readonly RULE_rerankField = 11;
	public static readonly RULE_fromCommand = 12;
	public static readonly RULE_timeSeriesCommand = 13;
	public static readonly RULE_indexPatternAndMetadataFields = 14;
	public static readonly RULE_indexPatternOrSubquery = 15;
	public static readonly RULE_subquery = 16;
	public static readonly RULE_indexPattern = 17;
	public static readonly RULE_clusterString = 18;
	public static readonly RULE_selectorString = 19;
	public static readonly RULE_unquotedIndexString = 20;
	public static readonly RULE_indexString = 21;
	public static readonly RULE_metadata = 22;
	public static readonly RULE_evalCommand = 23;
	public static readonly RULE_statsCommand = 24;
	public static readonly RULE_aggFields = 25;
	public static readonly RULE_aggField = 26;
	public static readonly RULE_qualifiedName = 27;
	public static readonly RULE_fieldName = 28;
	public static readonly RULE_qualifiedNamePattern = 29;
	public static readonly RULE_fieldNamePattern = 30;
	public static readonly RULE_qualifiedNamePatterns = 31;
	public static readonly RULE_identifier = 32;
	public static readonly RULE_identifierPattern = 33;
	public static readonly RULE_parameter = 34;
	public static readonly RULE_doubleParameter = 35;
	public static readonly RULE_identifierOrParameter = 36;
	public static readonly RULE_stringOrParameter = 37;
	public static readonly RULE_limitCommand = 38;
	public static readonly RULE_sortCommand = 39;
	public static readonly RULE_orderExpression = 40;
	public static readonly RULE_keepCommand = 41;
	public static readonly RULE_dropCommand = 42;
	public static readonly RULE_renameCommand = 43;
	public static readonly RULE_renameClause = 44;
	public static readonly RULE_dissectCommand = 45;
	public static readonly RULE_dissectCommandOptions = 46;
	public static readonly RULE_dissectCommandOption = 47;
	public static readonly RULE_commandNamedParameters = 48;
	public static readonly RULE_grokCommand = 49;
	public static readonly RULE_mvExpandCommand = 50;
	public static readonly RULE_explainCommand = 51;
	public static readonly RULE_subqueryExpression = 52;
	public static readonly RULE_showCommand = 53;
	public static readonly RULE_enrichCommand = 54;
	public static readonly RULE_enrichPolicyName = 55;
	public static readonly RULE_enrichWithClause = 56;
	public static readonly RULE_sampleCommand = 57;
	public static readonly RULE_changePointCommand = 58;
	public static readonly RULE_forkCommand = 59;
	public static readonly RULE_forkSubQueries = 60;
	public static readonly RULE_forkSubQuery = 61;
	public static readonly RULE_forkSubQueryCommand = 62;
	public static readonly RULE_forkSubQueryProcessingCommand = 63;
	public static readonly RULE_rerankCommand = 64;
	public static readonly RULE_completionCommand = 65;
	public static readonly RULE_inlineStatsCommand = 66;
	public static readonly RULE_fuseCommand = 67;
	public static readonly RULE_fuseConfiguration = 68;
	public static readonly RULE_lookupCommand = 69;
	public static readonly RULE_insistCommand = 70;
	public static readonly RULE_setCommand = 71;
	public static readonly RULE_setField = 72;
	public static readonly RULE_booleanExpression = 73;
	public static readonly RULE_regexBooleanExpression = 74;
	public static readonly RULE_matchBooleanExpression = 75;
	public static readonly RULE_valueExpression = 76;
	public static readonly RULE_operatorExpression = 77;
	public static readonly RULE_primaryExpression = 78;
	public static readonly RULE_functionExpression = 79;
	public static readonly RULE_functionName = 80;
	public static readonly RULE_mapExpression = 81;
	public static readonly RULE_entryExpression = 82;
	public static readonly RULE_mapValue = 83;
	public static readonly RULE_constant = 84;
	public static readonly RULE_booleanValue = 85;
	public static readonly RULE_numericValue = 86;
	public static readonly RULE_decimalValue = 87;
	public static readonly RULE_integerValue = 88;
	public static readonly RULE_string = 89;
	public static readonly RULE_comparisonOperator = 90;
	public static readonly RULE_joinCommand = 91;
	public static readonly RULE_joinTarget = 92;
	public static readonly RULE_joinCondition = 93;
	public static readonly RULE_promqlCommand = 94;
	public static readonly RULE_valueName = 95;
	public static readonly RULE_promqlParam = 96;
	public static readonly RULE_promqlParamName = 97;
	public static readonly RULE_promqlParamValue = 98;
	public static readonly RULE_promqlQueryContent = 99;
	public static readonly RULE_promqlQueryPart = 100;
	public static readonly RULE_promqlIndexPattern = 101;
	public static readonly RULE_promqlClusterString = 102;
	public static readonly RULE_promqlSelectorString = 103;
	public static readonly RULE_promqlUnquotedIndexString = 104;
	public static readonly RULE_promqlIndexString = 105;
	public static readonly literalNames: (string | null)[] = [ null, null, 
                                                            null, null, 
                                                            "'change_point'", 
                                                            "'enrich'", 
                                                            null, "'completion'", 
                                                            "'dissect'", 
                                                            "'eval'", "'grok'", 
                                                            "'limit'", "'rerank'", 
                                                            "'row'", "'sample'", 
                                                            "'sort'", null, 
                                                            "'where'", "'from'", 
                                                            "'ts'", "'fork'", 
                                                            "'fuse'", "'inline'", 
                                                            "'inlinestats'", 
                                                            "'lookup'", 
                                                            null, null, 
                                                            null, null, 
                                                            "'mv_expand'", 
                                                            "'drop'", "'keep'", 
                                                            null, null, 
                                                            "'rename'", 
                                                            "'set'", "'show'", 
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            "'|'", null, 
                                                            null, null, 
                                                            "'and'", "'asc'", 
                                                            "'='", "'by'", 
                                                            "'::'", "':'", 
                                                            "';'", "','", 
                                                            "'desc'", "'.'", 
                                                            "'false'", "'first'", 
                                                            "'in'", "'is'", 
                                                            "'last'", "'like'", 
                                                            "'not'", "'null'", 
                                                            "'nulls'", "'on'", 
                                                            "'or'", "'?'", 
                                                            "'rlike'", "'true'", 
                                                            "'with'", "'=='", 
                                                            "'=~'", "'!='", 
                                                            "'<'", "'<='", 
                                                            "'>'", "'>='", 
                                                            "'+'", "'-'", 
                                                            "'*'", "'/'", 
                                                            "'%'", "'{'", 
                                                            "'}'", "'??'", 
                                                            null, null, 
                                                            null, "']'", 
                                                            null, "')'", 
                                                            null, null, 
                                                            null, null, 
                                                            null, "'metadata'", 
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            null, "'group'", 
                                                            "'score'", "'key'", 
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            null, "'join'", 
                                                            "'USING'", null, 
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            null, "'as'", 
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            "'info'" ];
	public static readonly symbolicNames: (string | null)[] = [ null, "LINE_COMMENT", 
                                                             "MULTILINE_COMMENT", 
                                                             "WS", "CHANGE_POINT", 
                                                             "ENRICH", "DEV_EXPLAIN", 
                                                             "COMPLETION", 
                                                             "DISSECT", 
                                                             "EVAL", "GROK", 
                                                             "LIMIT", "RERANK", 
                                                             "ROW", "SAMPLE", 
                                                             "SORT", "STATS", 
                                                             "WHERE", "FROM", 
                                                             "TS", "FORK", 
                                                             "FUSE", "INLINE", 
                                                             "INLINESTATS", 
                                                             "JOIN_LOOKUP", 
                                                             "DEV_JOIN_FULL", 
                                                             "DEV_JOIN_LEFT", 
                                                             "DEV_JOIN_RIGHT", 
                                                             "DEV_LOOKUP", 
                                                             "MV_EXPAND", 
                                                             "DROP", "KEEP", 
                                                             "DEV_INSIST", 
                                                             "DEV_PROMQL", 
                                                             "RENAME", "SET", 
                                                             "SHOW", "UNKNOWN_CMD", 
                                                             "CHANGE_POINT_LINE_COMMENT", 
                                                             "CHANGE_POINT_MULTILINE_COMMENT", 
                                                             "CHANGE_POINT_WS", 
                                                             "ENRICH_POLICY_NAME", 
                                                             "ENRICH_LINE_COMMENT", 
                                                             "ENRICH_MULTILINE_COMMENT", 
                                                             "ENRICH_WS", 
                                                             "ENRICH_FIELD_LINE_COMMENT", 
                                                             "ENRICH_FIELD_MULTILINE_COMMENT", 
                                                             "ENRICH_FIELD_WS", 
                                                             "EXPLAIN_WS", 
                                                             "EXPLAIN_LINE_COMMENT", 
                                                             "EXPLAIN_MULTILINE_COMMENT", 
                                                             "PIPE", "QUOTED_STRING", 
                                                             "INTEGER_LITERAL", 
                                                             "DECIMAL_LITERAL", 
                                                             "AND", "ASC", 
                                                             "ASSIGN", "BY", 
                                                             "CAST_OP", 
                                                             "COLON", "SEMICOLON", 
                                                             "COMMA", "DESC", 
                                                             "DOT", "FALSE", 
                                                             "FIRST", "IN", 
                                                             "IS", "LAST", 
                                                             "LIKE", "NOT", 
                                                             "NULL", "NULLS", 
                                                             "ON", "OR", 
                                                             "PARAM", "RLIKE", 
                                                             "TRUE", "WITH", 
                                                             "EQ", "CIEQ", 
                                                             "NEQ", "LT", 
                                                             "LTE", "GT", 
                                                             "GTE", "PLUS", 
                                                             "MINUS", "ASTERISK", 
                                                             "SLASH", "PERCENT", 
                                                             "LEFT_BRACES", 
                                                             "RIGHT_BRACES", 
                                                             "DOUBLE_PARAMS", 
                                                             "NAMED_OR_POSITIONAL_PARAM", 
                                                             "NAMED_OR_POSITIONAL_DOUBLE_PARAMS", 
                                                             "OPENING_BRACKET", 
                                                             "CLOSING_BRACKET", 
                                                             "LP", "RP", 
                                                             "UNQUOTED_IDENTIFIER", 
                                                             "QUOTED_IDENTIFIER", 
                                                             "EXPR_LINE_COMMENT", 
                                                             "EXPR_MULTILINE_COMMENT", 
                                                             "EXPR_WS", 
                                                             "METADATA", 
                                                             "UNQUOTED_SOURCE", 
                                                             "FROM_LINE_COMMENT", 
                                                             "FROM_MULTILINE_COMMENT", 
                                                             "FROM_WS", 
                                                             "FORK_WS", 
                                                             "FORK_LINE_COMMENT", 
                                                             "FORK_MULTILINE_COMMENT", 
                                                             "GROUP", "SCORE", 
                                                             "KEY", "FUSE_LINE_COMMENT", 
                                                             "FUSE_MULTILINE_COMMENT", 
                                                             "FUSE_WS", 
                                                             "INLINE_STATS", 
                                                             "INLINE_LINE_COMMENT", 
                                                             "INLINE_MULTILINE_COMMENT", 
                                                             "INLINE_WS", 
                                                             "JOIN", "USING", 
                                                             "JOIN_LINE_COMMENT", 
                                                             "JOIN_MULTILINE_COMMENT", 
                                                             "JOIN_WS", 
                                                             "LOOKUP_LINE_COMMENT", 
                                                             "LOOKUP_MULTILINE_COMMENT", 
                                                             "LOOKUP_WS", 
                                                             "LOOKUP_FIELD_LINE_COMMENT", 
                                                             "LOOKUP_FIELD_MULTILINE_COMMENT", 
                                                             "LOOKUP_FIELD_WS", 
                                                             "MVEXPAND_LINE_COMMENT", 
                                                             "MVEXPAND_MULTILINE_COMMENT", 
                                                             "MVEXPAND_WS", 
                                                             "ID_PATTERN", 
                                                             "PROJECT_LINE_COMMENT", 
                                                             "PROJECT_MULTILINE_COMMENT", 
                                                             "PROJECT_WS", 
                                                             "PROMQL_PARAMS_LINE_COMMENT", 
                                                             "PROMQL_PARAMS_MULTILINE_COMMENT", 
                                                             "PROMQL_PARAMS_WS", 
                                                             "PROMQL_QUERY_COMMENT", 
                                                             "PROMQL_SINGLE_QUOTED_STRING", 
                                                             "PROMQL_OTHER_QUERY_CONTENT", 
                                                             "AS", "RENAME_LINE_COMMENT", 
                                                             "RENAME_MULTILINE_COMMENT", 
                                                             "RENAME_WS", 
                                                             "SET_LINE_COMMENT", 
                                                             "SET_MULTILINE_COMMENT", 
                                                             "SET_WS", "INFO", 
                                                             "SHOW_LINE_COMMENT", 
                                                             "SHOW_MULTILINE_COMMENT", 
                                                             "SHOW_WS" ];
	// tslint:disable:no-trailing-whitespace
	public static readonly ruleNames: string[] = [
		"statements", "singleStatement", "query", "sourceCommand", "processingCommand", 
		"whereCommand", "dataType", "rowCommand", "fields", "field", "rerankFields", 
		"rerankField", "fromCommand", "timeSeriesCommand", "indexPatternAndMetadataFields", 
		"indexPatternOrSubquery", "subquery", "indexPattern", "clusterString", 
		"selectorString", "unquotedIndexString", "indexString", "metadata", "evalCommand", 
		"statsCommand", "aggFields", "aggField", "qualifiedName", "fieldName", 
		"qualifiedNamePattern", "fieldNamePattern", "qualifiedNamePatterns", "identifier", 
		"identifierPattern", "parameter", "doubleParameter", "identifierOrParameter", 
		"stringOrParameter", "limitCommand", "sortCommand", "orderExpression", 
		"keepCommand", "dropCommand", "renameCommand", "renameClause", "dissectCommand", 
		"dissectCommandOptions", "dissectCommandOption", "commandNamedParameters", 
		"grokCommand", "mvExpandCommand", "explainCommand", "subqueryExpression", 
		"showCommand", "enrichCommand", "enrichPolicyName", "enrichWithClause", 
		"sampleCommand", "changePointCommand", "forkCommand", "forkSubQueries", 
		"forkSubQuery", "forkSubQueryCommand", "forkSubQueryProcessingCommand", 
		"rerankCommand", "completionCommand", "inlineStatsCommand", "fuseCommand", 
		"fuseConfiguration", "lookupCommand", "insistCommand", "setCommand", "setField", 
		"booleanExpression", "regexBooleanExpression", "matchBooleanExpression", 
		"valueExpression", "operatorExpression", "primaryExpression", "functionExpression", 
		"functionName", "mapExpression", "entryExpression", "mapValue", "constant", 
		"booleanValue", "numericValue", "decimalValue", "integerValue", "string", 
		"comparisonOperator", "joinCommand", "joinTarget", "joinCondition", "promqlCommand", 
		"valueName", "promqlParam", "promqlParamName", "promqlParamValue", "promqlQueryContent", 
		"promqlQueryPart", "promqlIndexPattern", "promqlClusterString", "promqlSelectorString", 
		"promqlUnquotedIndexString", "promqlIndexString",
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
	public statements(): StatementsContext {
		let localctx: StatementsContext = new StatementsContext(this, this._ctx, this.state);
		this.enterRule(localctx, 0, esql_parser.RULE_statements);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 215;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 0, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 212;
					this.setCommand();
					}
					}
				}
				this.state = 217;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 0, this._ctx);
			}
			this.state = 218;
			this.singleStatement();
			this.state = 219;
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
	// @RuleVersion(0)
	public singleStatement(): SingleStatementContext {
		let localctx: SingleStatementContext = new SingleStatementContext(this, this._ctx, this.state);
		this.enterRule(localctx, 2, esql_parser.RULE_singleStatement);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 221;
			this.query(0);
			this.state = 222;
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
		let _startState: number = 4;
		this.enterRecursionRule(localctx, 4, esql_parser.RULE_query, _p);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			{
			localctx = new SingleCommandQueryContext(this, localctx);
			this._ctx = localctx;
			_prevctx = localctx;

			this.state = 225;
			this.sourceCommand();
			}
			this._ctx.stop = this._input.LT(-1);
			this.state = 232;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 1, this._ctx);
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
					this.state = 227;
					if (!(this.precpred(this._ctx, 1))) {
						throw this.createFailedPredicateException("this.precpred(this._ctx, 1)");
					}
					this.state = 228;
					this.match(esql_parser.PIPE);
					this.state = 229;
					this.processingCommand();
					}
					}
				}
				this.state = 234;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 1, this._ctx);
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
		this.enterRule(localctx, 6, esql_parser.RULE_sourceCommand);
		try {
			this.state = 243;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 2, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 235;
				this.fromCommand();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 236;
				this.rowCommand();
				}
				break;
			case 3:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 237;
				this.showCommand();
				}
				break;
			case 4:
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 238;
				this.timeSeriesCommand();
				}
				break;
			case 5:
				this.enterOuterAlt(localctx, 5);
				{
				this.state = 239;
				if (!(this.isDevVersion())) {
					throw this.createFailedPredicateException("this.isDevVersion()");
				}
				this.state = 240;
				this.explainCommand();
				}
				break;
			case 6:
				this.enterOuterAlt(localctx, 6);
				{
				this.state = 241;
				if (!(this.isDevVersion())) {
					throw this.createFailedPredicateException("this.isDevVersion()");
				}
				this.state = 242;
				this.promqlCommand();
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
	public processingCommand(): ProcessingCommandContext {
		let localctx: ProcessingCommandContext = new ProcessingCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 8, esql_parser.RULE_processingCommand);
		try {
			this.state = 269;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 3, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 245;
				this.evalCommand();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 246;
				this.whereCommand();
				}
				break;
			case 3:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 247;
				this.keepCommand();
				}
				break;
			case 4:
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 248;
				this.limitCommand();
				}
				break;
			case 5:
				this.enterOuterAlt(localctx, 5);
				{
				this.state = 249;
				this.statsCommand();
				}
				break;
			case 6:
				this.enterOuterAlt(localctx, 6);
				{
				this.state = 250;
				this.sortCommand();
				}
				break;
			case 7:
				this.enterOuterAlt(localctx, 7);
				{
				this.state = 251;
				this.dropCommand();
				}
				break;
			case 8:
				this.enterOuterAlt(localctx, 8);
				{
				this.state = 252;
				this.renameCommand();
				}
				break;
			case 9:
				this.enterOuterAlt(localctx, 9);
				{
				this.state = 253;
				this.dissectCommand();
				}
				break;
			case 10:
				this.enterOuterAlt(localctx, 10);
				{
				this.state = 254;
				this.grokCommand();
				}
				break;
			case 11:
				this.enterOuterAlt(localctx, 11);
				{
				this.state = 255;
				this.enrichCommand();
				}
				break;
			case 12:
				this.enterOuterAlt(localctx, 12);
				{
				this.state = 256;
				this.mvExpandCommand();
				}
				break;
			case 13:
				this.enterOuterAlt(localctx, 13);
				{
				this.state = 257;
				this.joinCommand();
				}
				break;
			case 14:
				this.enterOuterAlt(localctx, 14);
				{
				this.state = 258;
				this.changePointCommand();
				}
				break;
			case 15:
				this.enterOuterAlt(localctx, 15);
				{
				this.state = 259;
				this.completionCommand();
				}
				break;
			case 16:
				this.enterOuterAlt(localctx, 16);
				{
				this.state = 260;
				this.sampleCommand();
				}
				break;
			case 17:
				this.enterOuterAlt(localctx, 17);
				{
				this.state = 261;
				this.forkCommand();
				}
				break;
			case 18:
				this.enterOuterAlt(localctx, 18);
				{
				this.state = 262;
				this.rerankCommand();
				}
				break;
			case 19:
				this.enterOuterAlt(localctx, 19);
				{
				this.state = 263;
				this.inlineStatsCommand();
				}
				break;
			case 20:
				this.enterOuterAlt(localctx, 20);
				{
				this.state = 264;
				this.fuseCommand();
				}
				break;
			case 21:
				this.enterOuterAlt(localctx, 21);
				{
				this.state = 265;
				if (!(this.isDevVersion())) {
					throw this.createFailedPredicateException("this.isDevVersion()");
				}
				this.state = 266;
				this.lookupCommand();
				}
				break;
			case 22:
				this.enterOuterAlt(localctx, 22);
				{
				this.state = 267;
				if (!(this.isDevVersion())) {
					throw this.createFailedPredicateException("this.isDevVersion()");
				}
				this.state = 268;
				this.insistCommand();
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
	public whereCommand(): WhereCommandContext {
		let localctx: WhereCommandContext = new WhereCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 10, esql_parser.RULE_whereCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 271;
			this.match(esql_parser.WHERE);
			this.state = 272;
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
	// @RuleVersion(0)
	public dataType(): DataTypeContext {
		let localctx: DataTypeContext = new DataTypeContext(this, this._ctx, this.state);
		this.enterRule(localctx, 12, esql_parser.RULE_dataType);
		try {
			localctx = new ToDataTypeContext(this, localctx);
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 274;
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
		this.enterRule(localctx, 14, esql_parser.RULE_rowCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 276;
			this.match(esql_parser.ROW);
			this.state = 277;
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
		this.enterRule(localctx, 16, esql_parser.RULE_fields);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 279;
			this.field();
			this.state = 284;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 4, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 280;
					this.match(esql_parser.COMMA);
					this.state = 281;
					this.field();
					}
					}
				}
				this.state = 286;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 4, this._ctx);
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
		this.enterRule(localctx, 18, esql_parser.RULE_field);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 290;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 5, this._ctx) ) {
			case 1:
				{
				this.state = 287;
				this.qualifiedName();
				this.state = 288;
				this.match(esql_parser.ASSIGN);
				}
				break;
			}
			this.state = 292;
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
	// @RuleVersion(0)
	public rerankFields(): RerankFieldsContext {
		let localctx: RerankFieldsContext = new RerankFieldsContext(this, this._ctx, this.state);
		this.enterRule(localctx, 20, esql_parser.RULE_rerankFields);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 294;
			this.rerankField();
			this.state = 299;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 6, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 295;
					this.match(esql_parser.COMMA);
					this.state = 296;
					this.rerankField();
					}
					}
				}
				this.state = 301;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 6, this._ctx);
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
	public rerankField(): RerankFieldContext {
		let localctx: RerankFieldContext = new RerankFieldContext(this, this._ctx, this.state);
		this.enterRule(localctx, 22, esql_parser.RULE_rerankField);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 302;
			this.qualifiedName();
			this.state = 305;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 7, this._ctx) ) {
			case 1:
				{
				this.state = 303;
				this.match(esql_parser.ASSIGN);
				this.state = 304;
				this.booleanExpression(0);
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
	public fromCommand(): FromCommandContext {
		let localctx: FromCommandContext = new FromCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 24, esql_parser.RULE_fromCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 307;
			this.match(esql_parser.FROM);
			this.state = 308;
			this.indexPatternAndMetadataFields();
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
	public timeSeriesCommand(): TimeSeriesCommandContext {
		let localctx: TimeSeriesCommandContext = new TimeSeriesCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 26, esql_parser.RULE_timeSeriesCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 310;
			this.match(esql_parser.TS);
			this.state = 311;
			this.indexPatternAndMetadataFields();
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
	public indexPatternAndMetadataFields(): IndexPatternAndMetadataFieldsContext {
		let localctx: IndexPatternAndMetadataFieldsContext = new IndexPatternAndMetadataFieldsContext(this, this._ctx, this.state);
		this.enterRule(localctx, 28, esql_parser.RULE_indexPatternAndMetadataFields);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 313;
			this.indexPatternOrSubquery();
			this.state = 318;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 8, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 314;
					this.match(esql_parser.COMMA);
					this.state = 315;
					this.indexPatternOrSubquery();
					}
					}
				}
				this.state = 320;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 8, this._ctx);
			}
			this.state = 322;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 9, this._ctx) ) {
			case 1:
				{
				this.state = 321;
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
	public indexPatternOrSubquery(): IndexPatternOrSubqueryContext {
		let localctx: IndexPatternOrSubqueryContext = new IndexPatternOrSubqueryContext(this, this._ctx, this.state);
		this.enterRule(localctx, 30, esql_parser.RULE_indexPatternOrSubquery);
		try {
			this.state = 327;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 10, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 324;
				this.indexPattern();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 325;
				if (!(this.isDevVersion())) {
					throw this.createFailedPredicateException("this.isDevVersion()");
				}
				this.state = 326;
				this.subquery();
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
	public subquery(): SubqueryContext {
		let localctx: SubqueryContext = new SubqueryContext(this, this._ctx, this.state);
		this.enterRule(localctx, 32, esql_parser.RULE_subquery);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 329;
			this.match(esql_parser.LP);
			this.state = 330;
			this.fromCommand();
			this.state = 335;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===51) {
				{
				{
				this.state = 331;
				this.match(esql_parser.PIPE);
				this.state = 332;
				this.processingCommand();
				}
				}
				this.state = 337;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			this.state = 338;
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
	public indexPattern(): IndexPatternContext {
		let localctx: IndexPatternContext = new IndexPatternContext(this, this._ctx, this.state);
		this.enterRule(localctx, 34, esql_parser.RULE_indexPattern);
		try {
			this.state = 349;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 12, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 340;
				this.clusterString();
				this.state = 341;
				this.match(esql_parser.COLON);
				this.state = 342;
				this.unquotedIndexString();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 344;
				this.unquotedIndexString();
				this.state = 345;
				this.match(esql_parser.CAST_OP);
				this.state = 346;
				this.selectorString();
				}
				break;
			case 3:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 348;
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
			this.state = 351;
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
	public selectorString(): SelectorStringContext {
		let localctx: SelectorStringContext = new SelectorStringContext(this, this._ctx, this.state);
		this.enterRule(localctx, 38, esql_parser.RULE_selectorString);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 353;
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
	public unquotedIndexString(): UnquotedIndexStringContext {
		let localctx: UnquotedIndexStringContext = new UnquotedIndexStringContext(this, this._ctx, this.state);
		this.enterRule(localctx, 40, esql_parser.RULE_unquotedIndexString);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 355;
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
		this.enterRule(localctx, 42, esql_parser.RULE_indexString);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 357;
			_la = this._input.LA(1);
			if(!(_la===52 || _la===107)) {
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
		this.enterRule(localctx, 44, esql_parser.RULE_metadata);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 359;
			this.match(esql_parser.METADATA);
			this.state = 360;
			this.match(esql_parser.UNQUOTED_SOURCE);
			this.state = 365;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 13, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 361;
					this.match(esql_parser.COMMA);
					this.state = 362;
					this.match(esql_parser.UNQUOTED_SOURCE);
					}
					}
				}
				this.state = 367;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 13, this._ctx);
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
		this.enterRule(localctx, 46, esql_parser.RULE_evalCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 368;
			this.match(esql_parser.EVAL);
			this.state = 369;
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
		this.enterRule(localctx, 48, esql_parser.RULE_statsCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 371;
			this.match(esql_parser.STATS);
			this.state = 373;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 14, this._ctx) ) {
			case 1:
				{
				this.state = 372;
				localctx._stats = this.aggFields();
				}
				break;
			}
			this.state = 377;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 15, this._ctx) ) {
			case 1:
				{
				this.state = 375;
				this.match(esql_parser.BY);
				this.state = 376;
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
	public aggFields(): AggFieldsContext {
		let localctx: AggFieldsContext = new AggFieldsContext(this, this._ctx, this.state);
		this.enterRule(localctx, 50, esql_parser.RULE_aggFields);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 379;
			this.aggField();
			this.state = 384;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 16, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 380;
					this.match(esql_parser.COMMA);
					this.state = 381;
					this.aggField();
					}
					}
				}
				this.state = 386;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 16, this._ctx);
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
	public aggField(): AggFieldContext {
		let localctx: AggFieldContext = new AggFieldContext(this, this._ctx, this.state);
		this.enterRule(localctx, 52, esql_parser.RULE_aggField);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 387;
			this.field();
			this.state = 390;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 17, this._ctx) ) {
			case 1:
				{
				this.state = 388;
				this.match(esql_parser.WHERE);
				this.state = 389;
				this.booleanExpression(0);
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
		let _la: number;
		try {
			this.state = 404;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 19, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 392;
				if (!(this.isDevVersion())) {
					throw this.createFailedPredicateException("this.isDevVersion()");
				}
				this.state = 393;
				this.match(esql_parser.OPENING_BRACKET);
				this.state = 395;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===101) {
					{
					this.state = 394;
					localctx._qualifier = this.match(esql_parser.UNQUOTED_IDENTIFIER);
					}
				}

				this.state = 397;
				this.match(esql_parser.CLOSING_BRACKET);
				this.state = 398;
				this.match(esql_parser.DOT);
				this.state = 399;
				this.match(esql_parser.OPENING_BRACKET);
				this.state = 400;
				localctx._name = this.fieldName();
				this.state = 401;
				this.match(esql_parser.CLOSING_BRACKET);
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 403;
				localctx._name = this.fieldName();
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
	public fieldName(): FieldNameContext {
		let localctx: FieldNameContext = new FieldNameContext(this, this._ctx, this.state);
		this.enterRule(localctx, 56, esql_parser.RULE_fieldName);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 406;
			this.identifierOrParameter();
			this.state = 411;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 20, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 407;
					this.match(esql_parser.DOT);
					this.state = 408;
					this.identifierOrParameter();
					}
					}
				}
				this.state = 413;
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
	public qualifiedNamePattern(): QualifiedNamePatternContext {
		let localctx: QualifiedNamePatternContext = new QualifiedNamePatternContext(this, this._ctx, this.state);
		this.enterRule(localctx, 58, esql_parser.RULE_qualifiedNamePattern);
		let _la: number;
		try {
			this.state = 426;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 22, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 414;
				if (!(this.isDevVersion())) {
					throw this.createFailedPredicateException("this.isDevVersion()");
				}
				this.state = 415;
				this.match(esql_parser.OPENING_BRACKET);
				this.state = 417;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===138) {
					{
					this.state = 416;
					localctx._qualifier = this.match(esql_parser.ID_PATTERN);
					}
				}

				this.state = 419;
				this.match(esql_parser.CLOSING_BRACKET);
				this.state = 420;
				this.match(esql_parser.DOT);
				this.state = 421;
				this.match(esql_parser.OPENING_BRACKET);
				this.state = 422;
				localctx._name = this.fieldNamePattern();
				this.state = 423;
				this.match(esql_parser.CLOSING_BRACKET);
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 425;
				localctx._name = this.fieldNamePattern();
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
	public fieldNamePattern(): FieldNamePatternContext {
		let localctx: FieldNamePatternContext = new FieldNamePatternContext(this, this._ctx, this.state);
		this.enterRule(localctx, 60, esql_parser.RULE_fieldNamePattern);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			{
			this.state = 428;
			this.identifierPattern();
			this.state = 433;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 23, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 429;
					this.match(esql_parser.DOT);
					this.state = 430;
					this.identifierPattern();
					}
					}
				}
				this.state = 435;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 23, this._ctx);
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
	public qualifiedNamePatterns(): QualifiedNamePatternsContext {
		let localctx: QualifiedNamePatternsContext = new QualifiedNamePatternsContext(this, this._ctx, this.state);
		this.enterRule(localctx, 62, esql_parser.RULE_qualifiedNamePatterns);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 436;
			this.qualifiedNamePattern();
			this.state = 441;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 24, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 437;
					this.match(esql_parser.COMMA);
					this.state = 438;
					this.qualifiedNamePattern();
					}
					}
				}
				this.state = 443;
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
	public identifier(): IdentifierContext {
		let localctx: IdentifierContext = new IdentifierContext(this, this._ctx, this.state);
		this.enterRule(localctx, 64, esql_parser.RULE_identifier);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 444;
			_la = this._input.LA(1);
			if(!(_la===101 || _la===102)) {
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
		this.enterRule(localctx, 66, esql_parser.RULE_identifierPattern);
		try {
			this.state = 449;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 138:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 446;
				this.match(esql_parser.ID_PATTERN);
				}
				break;
			case 76:
			case 95:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 447;
				this.parameter();
				}
				break;
			case 94:
			case 96:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 448;
				this.doubleParameter();
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
	public parameter(): ParameterContext {
		let localctx: ParameterContext = new ParameterContext(this, this._ctx, this.state);
		this.enterRule(localctx, 68, esql_parser.RULE_parameter);
		try {
			this.state = 453;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 76:
				localctx = new InputParamContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 451;
				this.match(esql_parser.PARAM);
				}
				break;
			case 95:
				localctx = new InputNamedOrPositionalParamContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 452;
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
	public doubleParameter(): DoubleParameterContext {
		let localctx: DoubleParameterContext = new DoubleParameterContext(this, this._ctx, this.state);
		this.enterRule(localctx, 70, esql_parser.RULE_doubleParameter);
		try {
			this.state = 457;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 94:
				localctx = new InputDoubleParamsContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 455;
				this.match(esql_parser.DOUBLE_PARAMS);
				}
				break;
			case 96:
				localctx = new InputNamedOrPositionalDoubleParamsContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 456;
				this.match(esql_parser.NAMED_OR_POSITIONAL_DOUBLE_PARAMS);
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
	public identifierOrParameter(): IdentifierOrParameterContext {
		let localctx: IdentifierOrParameterContext = new IdentifierOrParameterContext(this, this._ctx, this.state);
		this.enterRule(localctx, 72, esql_parser.RULE_identifierOrParameter);
		try {
			this.state = 462;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 101:
			case 102:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 459;
				this.identifier();
				}
				break;
			case 76:
			case 95:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 460;
				this.parameter();
				}
				break;
			case 94:
			case 96:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 461;
				this.doubleParameter();
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
	public stringOrParameter(): StringOrParameterContext {
		let localctx: StringOrParameterContext = new StringOrParameterContext(this, this._ctx, this.state);
		this.enterRule(localctx, 74, esql_parser.RULE_stringOrParameter);
		try {
			this.state = 466;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 52:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 464;
				this.string_();
				}
				break;
			case 76:
			case 95:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 465;
				this.parameter();
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
		this.enterRule(localctx, 76, esql_parser.RULE_limitCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 468;
			this.match(esql_parser.LIMIT);
			this.state = 469;
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
	public sortCommand(): SortCommandContext {
		let localctx: SortCommandContext = new SortCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 78, esql_parser.RULE_sortCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 471;
			this.match(esql_parser.SORT);
			this.state = 472;
			this.orderExpression();
			this.state = 477;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 30, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 473;
					this.match(esql_parser.COMMA);
					this.state = 474;
					this.orderExpression();
					}
					}
				}
				this.state = 479;
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
	public orderExpression(): OrderExpressionContext {
		let localctx: OrderExpressionContext = new OrderExpressionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 80, esql_parser.RULE_orderExpression);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 480;
			this.booleanExpression(0);
			this.state = 482;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 31, this._ctx) ) {
			case 1:
				{
				this.state = 481;
				localctx._ordering = this._input.LT(1);
				_la = this._input.LA(1);
				if(!(_la===56 || _la===63)) {
				    localctx._ordering = this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				}
				break;
			}
			this.state = 486;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 32, this._ctx) ) {
			case 1:
				{
				this.state = 484;
				this.match(esql_parser.NULLS);
				this.state = 485;
				localctx._nullOrdering = this._input.LT(1);
				_la = this._input.LA(1);
				if(!(_la===66 || _la===69)) {
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
		this.enterRule(localctx, 82, esql_parser.RULE_keepCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 488;
			this.match(esql_parser.KEEP);
			this.state = 489;
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
		this.enterRule(localctx, 84, esql_parser.RULE_dropCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 491;
			this.match(esql_parser.DROP);
			this.state = 492;
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
		this.enterRule(localctx, 86, esql_parser.RULE_renameCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 494;
			this.match(esql_parser.RENAME);
			this.state = 495;
			this.renameClause();
			this.state = 500;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 33, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 496;
					this.match(esql_parser.COMMA);
					this.state = 497;
					this.renameClause();
					}
					}
				}
				this.state = 502;
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
	public renameClause(): RenameClauseContext {
		let localctx: RenameClauseContext = new RenameClauseContext(this, this._ctx, this.state);
		this.enterRule(localctx, 88, esql_parser.RULE_renameClause);
		try {
			this.state = 511;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 34, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 503;
				localctx._oldName = this.qualifiedNamePattern();
				this.state = 504;
				this.match(esql_parser.AS);
				this.state = 505;
				localctx._newName = this.qualifiedNamePattern();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 507;
				localctx._newName = this.qualifiedNamePattern();
				this.state = 508;
				this.match(esql_parser.ASSIGN);
				this.state = 509;
				localctx._oldName = this.qualifiedNamePattern();
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
	public dissectCommand(): DissectCommandContext {
		let localctx: DissectCommandContext = new DissectCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 90, esql_parser.RULE_dissectCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 513;
			this.match(esql_parser.DISSECT);
			this.state = 514;
			this.primaryExpression(0);
			this.state = 515;
			this.string_();
			this.state = 517;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 35, this._ctx) ) {
			case 1:
				{
				this.state = 516;
				this.dissectCommandOptions();
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
	public dissectCommandOptions(): DissectCommandOptionsContext {
		let localctx: DissectCommandOptionsContext = new DissectCommandOptionsContext(this, this._ctx, this.state);
		this.enterRule(localctx, 92, esql_parser.RULE_dissectCommandOptions);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 519;
			this.dissectCommandOption();
			this.state = 524;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 36, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 520;
					this.match(esql_parser.COMMA);
					this.state = 521;
					this.dissectCommandOption();
					}
					}
				}
				this.state = 526;
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
	public dissectCommandOption(): DissectCommandOptionContext {
		let localctx: DissectCommandOptionContext = new DissectCommandOptionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 94, esql_parser.RULE_dissectCommandOption);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 527;
			this.identifier();
			this.state = 528;
			this.match(esql_parser.ASSIGN);
			this.state = 529;
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
	public commandNamedParameters(): CommandNamedParametersContext {
		let localctx: CommandNamedParametersContext = new CommandNamedParametersContext(this, this._ctx, this.state);
		this.enterRule(localctx, 96, esql_parser.RULE_commandNamedParameters);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 533;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 37, this._ctx) ) {
			case 1:
				{
				this.state = 531;
				this.match(esql_parser.WITH);
				this.state = 532;
				this.mapExpression();
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
		this.enterRule(localctx, 98, esql_parser.RULE_grokCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 535;
			this.match(esql_parser.GROK);
			this.state = 536;
			this.primaryExpression(0);
			this.state = 537;
			this.string_();
			this.state = 542;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 38, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 538;
					this.match(esql_parser.COMMA);
					this.state = 539;
					this.string_();
					}
					}
				}
				this.state = 544;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 38, this._ctx);
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
	public mvExpandCommand(): MvExpandCommandContext {
		let localctx: MvExpandCommandContext = new MvExpandCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 100, esql_parser.RULE_mvExpandCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 545;
			this.match(esql_parser.MV_EXPAND);
			this.state = 546;
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
	public explainCommand(): ExplainCommandContext {
		let localctx: ExplainCommandContext = new ExplainCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 102, esql_parser.RULE_explainCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 548;
			this.match(esql_parser.DEV_EXPLAIN);
			this.state = 549;
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
		this.enterRule(localctx, 104, esql_parser.RULE_subqueryExpression);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 551;
			this.match(esql_parser.LP);
			this.state = 552;
			this.query(0);
			this.state = 553;
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
	public showCommand(): ShowCommandContext {
		let localctx: ShowCommandContext = new ShowCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 106, esql_parser.RULE_showCommand);
		try {
			localctx = new ShowInfoContext(this, localctx);
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 555;
			this.match(esql_parser.SHOW);
			this.state = 556;
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
	public enrichCommand(): EnrichCommandContext {
		let localctx: EnrichCommandContext = new EnrichCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 108, esql_parser.RULE_enrichCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 558;
			this.match(esql_parser.ENRICH);
			this.state = 559;
			localctx._policyName = this.enrichPolicyName();
			this.state = 562;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 39, this._ctx) ) {
			case 1:
				{
				this.state = 560;
				this.match(esql_parser.ON);
				this.state = 561;
				localctx._matchField = this.qualifiedNamePattern();
				}
				break;
			}
			this.state = 573;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 41, this._ctx) ) {
			case 1:
				{
				this.state = 564;
				this.match(esql_parser.WITH);
				this.state = 565;
				this.enrichWithClause();
				this.state = 570;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 40, this._ctx);
				while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
					if (_alt === 1) {
						{
						{
						this.state = 566;
						this.match(esql_parser.COMMA);
						this.state = 567;
						this.enrichWithClause();
						}
						}
					}
					this.state = 572;
					this._errHandler.sync(this);
					_alt = this._interp.adaptivePredict(this._input, 40, this._ctx);
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
	public enrichPolicyName(): EnrichPolicyNameContext {
		let localctx: EnrichPolicyNameContext = new EnrichPolicyNameContext(this, this._ctx, this.state);
		this.enterRule(localctx, 110, esql_parser.RULE_enrichPolicyName);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 575;
			_la = this._input.LA(1);
			if(!(_la===41 || _la===52)) {
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
	public enrichWithClause(): EnrichWithClauseContext {
		let localctx: EnrichWithClauseContext = new EnrichWithClauseContext(this, this._ctx, this.state);
		this.enterRule(localctx, 112, esql_parser.RULE_enrichWithClause);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 580;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 42, this._ctx) ) {
			case 1:
				{
				this.state = 577;
				localctx._newName = this.qualifiedNamePattern();
				this.state = 578;
				this.match(esql_parser.ASSIGN);
				}
				break;
			}
			this.state = 582;
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
	public sampleCommand(): SampleCommandContext {
		let localctx: SampleCommandContext = new SampleCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 114, esql_parser.RULE_sampleCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 584;
			this.match(esql_parser.SAMPLE);
			this.state = 585;
			localctx._probability = this.constant();
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
	public changePointCommand(): ChangePointCommandContext {
		let localctx: ChangePointCommandContext = new ChangePointCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 116, esql_parser.RULE_changePointCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 587;
			this.match(esql_parser.CHANGE_POINT);
			this.state = 588;
			localctx._value = this.qualifiedName();
			this.state = 591;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 43, this._ctx) ) {
			case 1:
				{
				this.state = 589;
				this.match(esql_parser.ON);
				this.state = 590;
				localctx._key = this.qualifiedName();
				}
				break;
			}
			this.state = 598;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 44, this._ctx) ) {
			case 1:
				{
				this.state = 593;
				this.match(esql_parser.AS);
				this.state = 594;
				localctx._targetType = this.qualifiedName();
				this.state = 595;
				this.match(esql_parser.COMMA);
				this.state = 596;
				localctx._targetPvalue = this.qualifiedName();
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
	public forkCommand(): ForkCommandContext {
		let localctx: ForkCommandContext = new ForkCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 118, esql_parser.RULE_forkCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 600;
			this.match(esql_parser.FORK);
			this.state = 601;
			this.forkSubQueries();
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
	public forkSubQueries(): ForkSubQueriesContext {
		let localctx: ForkSubQueriesContext = new ForkSubQueriesContext(this, this._ctx, this.state);
		this.enterRule(localctx, 120, esql_parser.RULE_forkSubQueries);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 604;
			this._errHandler.sync(this);
			_alt = 1;
			do {
				switch (_alt) {
				case 1:
					{
					{
					this.state = 603;
					this.forkSubQuery();
					}
					}
					break;
				default:
					throw new NoViableAltException(this);
				}
				this.state = 606;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 45, this._ctx);
			} while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER);
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
	public forkSubQuery(): ForkSubQueryContext {
		let localctx: ForkSubQueryContext = new ForkSubQueryContext(this, this._ctx, this.state);
		this.enterRule(localctx, 122, esql_parser.RULE_forkSubQuery);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 608;
			this.match(esql_parser.LP);
			this.state = 609;
			this.forkSubQueryCommand(0);
			this.state = 610;
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

	public forkSubQueryCommand(): ForkSubQueryCommandContext;
	public forkSubQueryCommand(_p: number): ForkSubQueryCommandContext;
	// @RuleVersion(0)
	public forkSubQueryCommand(_p?: number): ForkSubQueryCommandContext {
		if (_p === undefined) {
			_p = 0;
		}

		let _parentctx: ParserRuleContext = this._ctx;
		let _parentState: number = this.state;
		let localctx: ForkSubQueryCommandContext = new ForkSubQueryCommandContext(this, this._ctx, _parentState);
		let _prevctx: ForkSubQueryCommandContext = localctx;
		let _startState: number = 124;
		this.enterRecursionRule(localctx, 124, esql_parser.RULE_forkSubQueryCommand, _p);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			{
			localctx = new SingleForkSubQueryCommandContext(this, localctx);
			this._ctx = localctx;
			_prevctx = localctx;

			this.state = 613;
			this.forkSubQueryProcessingCommand();
			}
			this._ctx.stop = this._input.LT(-1);
			this.state = 620;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 46, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					if (this._parseListeners != null) {
						this.triggerExitRuleEvent();
					}
					_prevctx = localctx;
					{
					{
					localctx = new CompositeForkSubQueryContext(this, new ForkSubQueryCommandContext(this, _parentctx, _parentState));
					this.pushNewRecursionContext(localctx, _startState, esql_parser.RULE_forkSubQueryCommand);
					this.state = 615;
					if (!(this.precpred(this._ctx, 1))) {
						throw this.createFailedPredicateException("this.precpred(this._ctx, 1)");
					}
					this.state = 616;
					this.match(esql_parser.PIPE);
					this.state = 617;
					this.forkSubQueryProcessingCommand();
					}
					}
				}
				this.state = 622;
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
			this.unrollRecursionContexts(_parentctx);
		}
		return localctx;
	}
	// @RuleVersion(0)
	public forkSubQueryProcessingCommand(): ForkSubQueryProcessingCommandContext {
		let localctx: ForkSubQueryProcessingCommandContext = new ForkSubQueryProcessingCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 126, esql_parser.RULE_forkSubQueryProcessingCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 623;
			this.processingCommand();
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
	public rerankCommand(): RerankCommandContext {
		let localctx: RerankCommandContext = new RerankCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 128, esql_parser.RULE_rerankCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 625;
			this.match(esql_parser.RERANK);
			this.state = 629;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 47, this._ctx) ) {
			case 1:
				{
				this.state = 626;
				localctx._targetField = this.qualifiedName();
				this.state = 627;
				this.match(esql_parser.ASSIGN);
				}
				break;
			}
			this.state = 631;
			localctx._queryText = this.constant();
			this.state = 632;
			this.match(esql_parser.ON);
			this.state = 633;
			this.rerankFields();
			this.state = 634;
			this.commandNamedParameters();
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
	public completionCommand(): CompletionCommandContext {
		let localctx: CompletionCommandContext = new CompletionCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 130, esql_parser.RULE_completionCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 636;
			this.match(esql_parser.COMPLETION);
			this.state = 640;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 48, this._ctx) ) {
			case 1:
				{
				this.state = 637;
				localctx._targetField = this.qualifiedName();
				this.state = 638;
				this.match(esql_parser.ASSIGN);
				}
				break;
			}
			this.state = 642;
			localctx._prompt = this.primaryExpression(0);
			this.state = 643;
			this.commandNamedParameters();
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
	public inlineStatsCommand(): InlineStatsCommandContext {
		let localctx: InlineStatsCommandContext = new InlineStatsCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 132, esql_parser.RULE_inlineStatsCommand);
		try {
			this.state = 658;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 22:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 645;
				this.match(esql_parser.INLINE);
				this.state = 646;
				this.match(esql_parser.INLINE_STATS);
				this.state = 647;
				localctx._stats = this.aggFields();
				this.state = 650;
				this._errHandler.sync(this);
				switch ( this._interp.adaptivePredict(this._input, 49, this._ctx) ) {
				case 1:
					{
					this.state = 648;
					this.match(esql_parser.BY);
					this.state = 649;
					localctx._grouping = this.fields();
					}
					break;
				}
				}
				break;
			case 23:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 652;
				this.match(esql_parser.INLINESTATS);
				this.state = 653;
				localctx._stats = this.aggFields();
				this.state = 656;
				this._errHandler.sync(this);
				switch ( this._interp.adaptivePredict(this._input, 50, this._ctx) ) {
				case 1:
					{
					this.state = 654;
					this.match(esql_parser.BY);
					this.state = 655;
					localctx._grouping = this.fields();
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
	public fuseCommand(): FuseCommandContext {
		let localctx: FuseCommandContext = new FuseCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 134, esql_parser.RULE_fuseCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 660;
			this.match(esql_parser.FUSE);
			this.state = 662;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 52, this._ctx) ) {
			case 1:
				{
				this.state = 661;
				localctx._fuseType = this.identifier();
				}
				break;
			}
			this.state = 667;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 53, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 664;
					this.fuseConfiguration();
					}
					}
				}
				this.state = 669;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 53, this._ctx);
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
	public fuseConfiguration(): FuseConfigurationContext {
		let localctx: FuseConfigurationContext = new FuseConfigurationContext(this, this._ctx, this.state);
		this.enterRule(localctx, 136, esql_parser.RULE_fuseConfiguration);
		try {
			this.state = 681;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 115:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 670;
				this.match(esql_parser.SCORE);
				this.state = 671;
				this.match(esql_parser.BY);
				this.state = 672;
				localctx._score = this.qualifiedName();
				}
				break;
			case 116:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 673;
				this.match(esql_parser.KEY);
				this.state = 674;
				this.match(esql_parser.BY);
				this.state = 675;
				localctx._key = this.fields();
				}
				break;
			case 114:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 676;
				this.match(esql_parser.GROUP);
				this.state = 677;
				this.match(esql_parser.BY);
				this.state = 678;
				localctx._group = this.qualifiedName();
				}
				break;
			case 79:
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 679;
				this.match(esql_parser.WITH);
				this.state = 680;
				localctx._options = this.mapExpression();
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
	public lookupCommand(): LookupCommandContext {
		let localctx: LookupCommandContext = new LookupCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 138, esql_parser.RULE_lookupCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 683;
			this.match(esql_parser.DEV_LOOKUP);
			this.state = 684;
			localctx._tableName = this.indexPattern();
			this.state = 685;
			this.match(esql_parser.ON);
			this.state = 686;
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
	public insistCommand(): InsistCommandContext {
		let localctx: InsistCommandContext = new InsistCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 140, esql_parser.RULE_insistCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 688;
			this.match(esql_parser.DEV_INSIST);
			this.state = 689;
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
	public setCommand(): SetCommandContext {
		let localctx: SetCommandContext = new SetCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 142, esql_parser.RULE_setCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 691;
			this.match(esql_parser.SET);
			this.state = 692;
			this.setField();
			this.state = 693;
			this.match(esql_parser.SEMICOLON);
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
	public setField(): SetFieldContext {
		let localctx: SetFieldContext = new SetFieldContext(this, this._ctx, this.state);
		this.enterRule(localctx, 144, esql_parser.RULE_setField);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 695;
			this.identifier();
			this.state = 696;
			this.match(esql_parser.ASSIGN);
			this.state = 697;
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
		let _startState: number = 146;
		this.enterRecursionRule(localctx, 146, esql_parser.RULE_booleanExpression, _p);
		let _la: number;
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 728;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 58, this._ctx) ) {
			case 1:
				{
				localctx = new LogicalNotContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;

				this.state = 700;
				this.match(esql_parser.NOT);
				this.state = 701;
				this.booleanExpression(8);
				}
				break;
			case 2:
				{
				localctx = new BooleanDefaultContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 702;
				this.valueExpression();
				}
				break;
			case 3:
				{
				localctx = new RegexExpressionContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 703;
				this.regexBooleanExpression();
				}
				break;
			case 4:
				{
				localctx = new LogicalInContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 704;
				this.valueExpression();
				this.state = 706;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===71) {
					{
					this.state = 705;
					this.match(esql_parser.NOT);
					}
				}

				this.state = 708;
				this.match(esql_parser.IN);
				this.state = 709;
				this.match(esql_parser.LP);
				this.state = 710;
				this.valueExpression();
				this.state = 715;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===62) {
					{
					{
					this.state = 711;
					this.match(esql_parser.COMMA);
					this.state = 712;
					this.valueExpression();
					}
					}
					this.state = 717;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 718;
				this.match(esql_parser.RP);
				}
				break;
			case 5:
				{
				localctx = new IsNullContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 720;
				this.valueExpression();
				this.state = 721;
				this.match(esql_parser.IS);
				this.state = 723;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===71) {
					{
					this.state = 722;
					this.match(esql_parser.NOT);
					}
				}

				this.state = 725;
				this.match(esql_parser.NULL);
				}
				break;
			case 6:
				{
				localctx = new MatchExpressionContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 727;
				this.matchBooleanExpression();
				}
				break;
			}
			this._ctx.stop = this._input.LT(-1);
			this.state = 738;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 60, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					if (this._parseListeners != null) {
						this.triggerExitRuleEvent();
					}
					_prevctx = localctx;
					{
					this.state = 736;
					this._errHandler.sync(this);
					switch ( this._interp.adaptivePredict(this._input, 59, this._ctx) ) {
					case 1:
						{
						localctx = new LogicalBinaryContext(this, new BooleanExpressionContext(this, _parentctx, _parentState));
						(localctx as LogicalBinaryContext)._left = _prevctx;
						this.pushNewRecursionContext(localctx, _startState, esql_parser.RULE_booleanExpression);
						this.state = 730;
						if (!(this.precpred(this._ctx, 5))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 5)");
						}
						this.state = 731;
						(localctx as LogicalBinaryContext)._operator = this.match(esql_parser.AND);
						this.state = 732;
						(localctx as LogicalBinaryContext)._right = this.booleanExpression(6);
						}
						break;
					case 2:
						{
						localctx = new LogicalBinaryContext(this, new BooleanExpressionContext(this, _parentctx, _parentState));
						(localctx as LogicalBinaryContext)._left = _prevctx;
						this.pushNewRecursionContext(localctx, _startState, esql_parser.RULE_booleanExpression);
						this.state = 733;
						if (!(this.precpred(this._ctx, 4))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 4)");
						}
						this.state = 734;
						(localctx as LogicalBinaryContext)._operator = this.match(esql_parser.OR);
						this.state = 735;
						(localctx as LogicalBinaryContext)._right = this.booleanExpression(5);
						}
						break;
					}
					}
				}
				this.state = 740;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 60, this._ctx);
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
		this.enterRule(localctx, 148, esql_parser.RULE_regexBooleanExpression);
		let _la: number;
		try {
			this.state = 787;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 67, this._ctx) ) {
			case 1:
				localctx = new LikeExpressionContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 741;
				this.valueExpression();
				this.state = 743;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===71) {
					{
					this.state = 742;
					this.match(esql_parser.NOT);
					}
				}

				this.state = 745;
				this.match(esql_parser.LIKE);
				this.state = 746;
				this.stringOrParameter();
				}
				break;
			case 2:
				localctx = new RlikeExpressionContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 748;
				this.valueExpression();
				this.state = 750;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===71) {
					{
					this.state = 749;
					this.match(esql_parser.NOT);
					}
				}

				this.state = 752;
				this.match(esql_parser.RLIKE);
				this.state = 753;
				this.stringOrParameter();
				}
				break;
			case 3:
				localctx = new LikeListExpressionContext(this, localctx);
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 755;
				this.valueExpression();
				this.state = 757;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===71) {
					{
					this.state = 756;
					this.match(esql_parser.NOT);
					}
				}

				this.state = 759;
				this.match(esql_parser.LIKE);
				this.state = 760;
				this.match(esql_parser.LP);
				this.state = 761;
				this.stringOrParameter();
				this.state = 766;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===62) {
					{
					{
					this.state = 762;
					this.match(esql_parser.COMMA);
					this.state = 763;
					this.stringOrParameter();
					}
					}
					this.state = 768;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 769;
				this.match(esql_parser.RP);
				}
				break;
			case 4:
				localctx = new RlikeListExpressionContext(this, localctx);
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 771;
				this.valueExpression();
				this.state = 773;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===71) {
					{
					this.state = 772;
					this.match(esql_parser.NOT);
					}
				}

				this.state = 775;
				this.match(esql_parser.RLIKE);
				this.state = 776;
				this.match(esql_parser.LP);
				this.state = 777;
				this.stringOrParameter();
				this.state = 782;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===62) {
					{
					{
					this.state = 778;
					this.match(esql_parser.COMMA);
					this.state = 779;
					this.stringOrParameter();
					}
					}
					this.state = 784;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 785;
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
	public matchBooleanExpression(): MatchBooleanExpressionContext {
		let localctx: MatchBooleanExpressionContext = new MatchBooleanExpressionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 150, esql_parser.RULE_matchBooleanExpression);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 789;
			localctx._fieldExp = this.qualifiedName();
			this.state = 792;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===59) {
				{
				this.state = 790;
				this.match(esql_parser.CAST_OP);
				this.state = 791;
				localctx._fieldType = this.dataType();
				}
			}

			this.state = 794;
			this.match(esql_parser.COLON);
			this.state = 795;
			localctx._matchQuery = this.constant();
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
		this.enterRule(localctx, 152, esql_parser.RULE_valueExpression);
		try {
			this.state = 802;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 69, this._ctx) ) {
			case 1:
				localctx = new ValueExpressionDefaultContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 797;
				this.operatorExpression(0);
				}
				break;
			case 2:
				localctx = new ComparisonContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 798;
				(localctx as ComparisonContext)._left = this.operatorExpression(0);
				this.state = 799;
				this.comparisonOperator();
				this.state = 800;
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
		let _startState: number = 154;
		this.enterRecursionRule(localctx, 154, esql_parser.RULE_operatorExpression, _p);
		let _la: number;
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 808;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 70, this._ctx) ) {
			case 1:
				{
				localctx = new OperatorExpressionDefaultContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;

				this.state = 805;
				this.primaryExpression(0);
				}
				break;
			case 2:
				{
				localctx = new ArithmeticUnaryContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 806;
				(localctx as ArithmeticUnaryContext)._operator = this._input.LT(1);
				_la = this._input.LA(1);
				if(!(_la===87 || _la===88)) {
				    (localctx as ArithmeticUnaryContext)._operator = this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				this.state = 807;
				this.operatorExpression(3);
				}
				break;
			}
			this._ctx.stop = this._input.LT(-1);
			this.state = 818;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 72, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					if (this._parseListeners != null) {
						this.triggerExitRuleEvent();
					}
					_prevctx = localctx;
					{
					this.state = 816;
					this._errHandler.sync(this);
					switch ( this._interp.adaptivePredict(this._input, 71, this._ctx) ) {
					case 1:
						{
						localctx = new ArithmeticBinaryContext(this, new OperatorExpressionContext(this, _parentctx, _parentState));
						(localctx as ArithmeticBinaryContext)._left = _prevctx;
						this.pushNewRecursionContext(localctx, _startState, esql_parser.RULE_operatorExpression);
						this.state = 810;
						if (!(this.precpred(this._ctx, 2))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 2)");
						}
						this.state = 811;
						(localctx as ArithmeticBinaryContext)._operator = this._input.LT(1);
						_la = this._input.LA(1);
						if(!(((((_la - 89)) & ~0x1F) === 0 && ((1 << (_la - 89)) & 7) !== 0))) {
						    (localctx as ArithmeticBinaryContext)._operator = this._errHandler.recoverInline(this);
						}
						else {
							this._errHandler.reportMatch(this);
						    this.consume();
						}
						this.state = 812;
						(localctx as ArithmeticBinaryContext)._right = this.operatorExpression(3);
						}
						break;
					case 2:
						{
						localctx = new ArithmeticBinaryContext(this, new OperatorExpressionContext(this, _parentctx, _parentState));
						(localctx as ArithmeticBinaryContext)._left = _prevctx;
						this.pushNewRecursionContext(localctx, _startState, esql_parser.RULE_operatorExpression);
						this.state = 813;
						if (!(this.precpred(this._ctx, 1))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 1)");
						}
						this.state = 814;
						(localctx as ArithmeticBinaryContext)._operator = this._input.LT(1);
						_la = this._input.LA(1);
						if(!(_la===87 || _la===88)) {
						    (localctx as ArithmeticBinaryContext)._operator = this._errHandler.recoverInline(this);
						}
						else {
							this._errHandler.reportMatch(this);
						    this.consume();
						}
						this.state = 815;
						(localctx as ArithmeticBinaryContext)._right = this.operatorExpression(2);
						}
						break;
					}
					}
				}
				this.state = 820;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 72, this._ctx);
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
		let _startState: number = 156;
		this.enterRecursionRule(localctx, 156, esql_parser.RULE_primaryExpression, _p);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 829;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 73, this._ctx) ) {
			case 1:
				{
				localctx = new ConstantDefaultContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;

				this.state = 822;
				this.constant();
				}
				break;
			case 2:
				{
				localctx = new DereferenceContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 823;
				this.qualifiedName();
				}
				break;
			case 3:
				{
				localctx = new FunctionContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 824;
				this.functionExpression();
				}
				break;
			case 4:
				{
				localctx = new ParenthesizedExpressionContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 825;
				this.match(esql_parser.LP);
				this.state = 826;
				this.booleanExpression(0);
				this.state = 827;
				this.match(esql_parser.RP);
				}
				break;
			}
			this._ctx.stop = this._input.LT(-1);
			this.state = 836;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 74, this._ctx);
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
					this.state = 831;
					if (!(this.precpred(this._ctx, 1))) {
						throw this.createFailedPredicateException("this.precpred(this._ctx, 1)");
					}
					this.state = 832;
					this.match(esql_parser.CAST_OP);
					this.state = 833;
					this.dataType();
					}
					}
				}
				this.state = 838;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 74, this._ctx);
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
		this.enterRule(localctx, 158, esql_parser.RULE_functionExpression);
		let _la: number;
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 839;
			this.functionName();
			this.state = 840;
			this.match(esql_parser.LP);
			this.state = 854;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 77, this._ctx) ) {
			case 1:
				{
				this.state = 841;
				this.match(esql_parser.ASTERISK);
				}
				break;
			case 2:
				{
				{
				this.state = 842;
				this.booleanExpression(0);
				this.state = 847;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 75, this._ctx);
				while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
					if (_alt === 1) {
						{
						{
						this.state = 843;
						this.match(esql_parser.COMMA);
						this.state = 844;
						this.booleanExpression(0);
						}
						}
					}
					this.state = 849;
					this._errHandler.sync(this);
					_alt = this._interp.adaptivePredict(this._input, 75, this._ctx);
				}
				this.state = 852;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===62) {
					{
					this.state = 850;
					this.match(esql_parser.COMMA);
					this.state = 851;
					this.mapExpression();
					}
				}

				}
				}
				break;
			}
			this.state = 856;
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
	public functionName(): FunctionNameContext {
		let localctx: FunctionNameContext = new FunctionNameContext(this, this._ctx, this.state);
		this.enterRule(localctx, 160, esql_parser.RULE_functionName);
		try {
			this.state = 861;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 76:
			case 94:
			case 95:
			case 96:
			case 101:
			case 102:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 858;
				this.identifierOrParameter();
				}
				break;
			case 66:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 859;
				this.match(esql_parser.FIRST);
				}
				break;
			case 69:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 860;
				this.match(esql_parser.LAST);
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
	public mapExpression(): MapExpressionContext {
		let localctx: MapExpressionContext = new MapExpressionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 162, esql_parser.RULE_mapExpression);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 863;
			this.match(esql_parser.LEFT_BRACES);
			this.state = 872;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===52) {
				{
				this.state = 864;
				this.entryExpression();
				this.state = 869;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===62) {
					{
					{
					this.state = 865;
					this.match(esql_parser.COMMA);
					this.state = 866;
					this.entryExpression();
					}
					}
					this.state = 871;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				}
			}

			this.state = 874;
			this.match(esql_parser.RIGHT_BRACES);
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
	public entryExpression(): EntryExpressionContext {
		let localctx: EntryExpressionContext = new EntryExpressionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 164, esql_parser.RULE_entryExpression);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 876;
			localctx._key = this.string_();
			this.state = 877;
			this.match(esql_parser.COLON);
			this.state = 878;
			localctx._value = this.mapValue();
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
	public mapValue(): MapValueContext {
		let localctx: MapValueContext = new MapValueContext(this, this._ctx, this.state);
		this.enterRule(localctx, 166, esql_parser.RULE_mapValue);
		try {
			this.state = 882;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 52:
			case 53:
			case 54:
			case 65:
			case 72:
			case 76:
			case 78:
			case 87:
			case 88:
			case 95:
			case 97:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 880;
				this.constant();
				}
				break;
			case 92:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 881;
				this.mapExpression();
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
	public constant(): ConstantContext {
		let localctx: ConstantContext = new ConstantContext(this, this._ctx, this.state);
		this.enterRule(localctx, 168, esql_parser.RULE_constant);
		let _la: number;
		try {
			this.state = 926;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 85, this._ctx) ) {
			case 1:
				localctx = new NullLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 884;
				this.match(esql_parser.NULL);
				}
				break;
			case 2:
				localctx = new QualifiedIntegerLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 885;
				this.integerValue();
				this.state = 886;
				this.match(esql_parser.UNQUOTED_IDENTIFIER);
				}
				break;
			case 3:
				localctx = new DecimalLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 888;
				this.decimalValue();
				}
				break;
			case 4:
				localctx = new IntegerLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 889;
				this.integerValue();
				}
				break;
			case 5:
				localctx = new BooleanLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 5);
				{
				this.state = 890;
				this.booleanValue();
				}
				break;
			case 6:
				localctx = new InputParameterContext(this, localctx);
				this.enterOuterAlt(localctx, 6);
				{
				this.state = 891;
				this.parameter();
				}
				break;
			case 7:
				localctx = new StringLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 7);
				{
				this.state = 892;
				this.string_();
				}
				break;
			case 8:
				localctx = new NumericArrayLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 8);
				{
				this.state = 893;
				this.match(esql_parser.OPENING_BRACKET);
				this.state = 894;
				this.numericValue();
				this.state = 899;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===62) {
					{
					{
					this.state = 895;
					this.match(esql_parser.COMMA);
					this.state = 896;
					this.numericValue();
					}
					}
					this.state = 901;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 902;
				this.match(esql_parser.CLOSING_BRACKET);
				}
				break;
			case 9:
				localctx = new BooleanArrayLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 9);
				{
				this.state = 904;
				this.match(esql_parser.OPENING_BRACKET);
				this.state = 905;
				this.booleanValue();
				this.state = 910;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===62) {
					{
					{
					this.state = 906;
					this.match(esql_parser.COMMA);
					this.state = 907;
					this.booleanValue();
					}
					}
					this.state = 912;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 913;
				this.match(esql_parser.CLOSING_BRACKET);
				}
				break;
			case 10:
				localctx = new StringArrayLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 10);
				{
				this.state = 915;
				this.match(esql_parser.OPENING_BRACKET);
				this.state = 916;
				this.string_();
				this.state = 921;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===62) {
					{
					{
					this.state = 917;
					this.match(esql_parser.COMMA);
					this.state = 918;
					this.string_();
					}
					}
					this.state = 923;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 924;
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
	public booleanValue(): BooleanValueContext {
		let localctx: BooleanValueContext = new BooleanValueContext(this, this._ctx, this.state);
		this.enterRule(localctx, 170, esql_parser.RULE_booleanValue);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 928;
			_la = this._input.LA(1);
			if(!(_la===65 || _la===78)) {
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
		this.enterRule(localctx, 172, esql_parser.RULE_numericValue);
		try {
			this.state = 932;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 86, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 930;
				this.decimalValue();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 931;
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
		this.enterRule(localctx, 174, esql_parser.RULE_decimalValue);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 935;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===87 || _la===88) {
				{
				this.state = 934;
				_la = this._input.LA(1);
				if(!(_la===87 || _la===88)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				}
			}

			this.state = 937;
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
		this.enterRule(localctx, 176, esql_parser.RULE_integerValue);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 940;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===87 || _la===88) {
				{
				this.state = 939;
				_la = this._input.LA(1);
				if(!(_la===87 || _la===88)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				}
			}

			this.state = 942;
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
		this.enterRule(localctx, 178, esql_parser.RULE_string);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 944;
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
		this.enterRule(localctx, 180, esql_parser.RULE_comparisonOperator);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 946;
			_la = this._input.LA(1);
			if(!(((((_la - 80)) & ~0x1F) === 0 && ((1 << (_la - 80)) & 125) !== 0))) {
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
	public joinCommand(): JoinCommandContext {
		let localctx: JoinCommandContext = new JoinCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 182, esql_parser.RULE_joinCommand);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 948;
			localctx._type_ = this._input.LT(1);
			_la = this._input.LA(1);
			if(!((((_la) & ~0x1F) === 0 && ((1 << _la) & 218103808) !== 0))) {
			    localctx._type_ = this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
			this.state = 949;
			this.match(esql_parser.JOIN);
			this.state = 950;
			this.joinTarget();
			this.state = 951;
			this.joinCondition();
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
	public joinTarget(): JoinTargetContext {
		let localctx: JoinTargetContext = new JoinTargetContext(this, this._ctx, this.state);
		this.enterRule(localctx, 184, esql_parser.RULE_joinTarget);
		let _la: number;
		try {
			this.state = 961;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 90, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 953;
				if (!(this.isDevVersion())) {
					throw this.createFailedPredicateException("this.isDevVersion()");
				}
				this.state = 954;
				localctx._index = this.indexPattern();
				this.state = 956;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===148) {
					{
					this.state = 955;
					this.match(esql_parser.AS);
					}
				}

				this.state = 958;
				localctx._qualifier = this.match(esql_parser.UNQUOTED_SOURCE);
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 960;
				localctx._index = this.indexPattern();
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
	public joinCondition(): JoinConditionContext {
		let localctx: JoinConditionContext = new JoinConditionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 186, esql_parser.RULE_joinCondition);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 963;
			this.match(esql_parser.ON);
			this.state = 964;
			this.booleanExpression(0);
			this.state = 969;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 91, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 965;
					this.match(esql_parser.COMMA);
					this.state = 966;
					this.booleanExpression(0);
					}
					}
				}
				this.state = 971;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 91, this._ctx);
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
	public promqlCommand(): PromqlCommandContext {
		let localctx: PromqlCommandContext = new PromqlCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 188, esql_parser.RULE_promqlCommand);
		let _la: number;
		try {
			let _alt: number;
			this.state = 1004;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 97, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 972;
				this.match(esql_parser.DEV_PROMQL);
				this.state = 976;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 92, this._ctx);
				while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
					if (_alt === 1) {
						{
						{
						this.state = 973;
						this.promqlParam();
						}
						}
					}
					this.state = 978;
					this._errHandler.sync(this);
					_alt = this._interp.adaptivePredict(this._input, 92, this._ctx);
				}
				this.state = 982;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===101 || _la===102) {
					{
					this.state = 979;
					this.valueName();
					this.state = 980;
					this.match(esql_parser.ASSIGN);
					}
				}

				this.state = 984;
				this.match(esql_parser.LP);
				this.state = 986;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				do {
					{
					{
					this.state = 985;
					this.promqlQueryPart();
					}
					}
					this.state = 988;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				} while (((((_la - 52)) & ~0x1F) === 0 && ((1 << (_la - 52)) & 1441) !== 0) || ((((_la - 95)) & ~0x1F) === 0 && ((1 << (_la - 95)) & 4305) !== 0) || ((((_la - 145)) & ~0x1F) === 0 && ((1 << (_la - 145)) & 7) !== 0));
				this.state = 990;
				this.match(esql_parser.RP);
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 992;
				this.match(esql_parser.DEV_PROMQL);
				this.state = 996;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 95, this._ctx);
				while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
					if (_alt === 1) {
						{
						{
						this.state = 993;
						this.promqlParam();
						}
						}
					}
					this.state = 998;
					this._errHandler.sync(this);
					_alt = this._interp.adaptivePredict(this._input, 95, this._ctx);
				}
				this.state = 1000;
				this._errHandler.sync(this);
				_alt = 1;
				do {
					switch (_alt) {
					case 1:
						{
						{
						this.state = 999;
						this.promqlQueryPart();
						}
						}
						break;
					default:
						throw new NoViableAltException(this);
					}
					this.state = 1002;
					this._errHandler.sync(this);
					_alt = this._interp.adaptivePredict(this._input, 96, this._ctx);
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
	public valueName(): ValueNameContext {
		let localctx: ValueNameContext = new ValueNameContext(this, this._ctx, this.state);
		this.enterRule(localctx, 190, esql_parser.RULE_valueName);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1006;
			_la = this._input.LA(1);
			if(!(_la===101 || _la===102)) {
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
	public promqlParam(): PromqlParamContext {
		let localctx: PromqlParamContext = new PromqlParamContext(this, this._ctx, this.state);
		this.enterRule(localctx, 192, esql_parser.RULE_promqlParam);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1008;
			localctx._name = this.promqlParamName();
			this.state = 1009;
			this.match(esql_parser.ASSIGN);
			this.state = 1010;
			localctx._value = this.promqlParamValue();
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
	public promqlParamName(): PromqlParamNameContext {
		let localctx: PromqlParamNameContext = new PromqlParamNameContext(this, this._ctx, this.state);
		this.enterRule(localctx, 194, esql_parser.RULE_promqlParamName);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1012;
			_la = this._input.LA(1);
			if(!(_la===52 || ((((_la - 95)) & ~0x1F) === 0 && ((1 << (_la - 95)) & 193) !== 0))) {
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
	public promqlParamValue(): PromqlParamValueContext {
		let localctx: PromqlParamValueContext = new PromqlParamValueContext(this, this._ctx, this.state);
		this.enterRule(localctx, 196, esql_parser.RULE_promqlParamValue);
		try {
			let _alt: number;
			this.state = 1024;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 52:
			case 101:
			case 107:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 1014;
				this.promqlIndexPattern();
				this.state = 1019;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 98, this._ctx);
				while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
					if (_alt === 1) {
						{
						{
						this.state = 1015;
						this.match(esql_parser.COMMA);
						this.state = 1016;
						this.promqlIndexPattern();
						}
						}
					}
					this.state = 1021;
					this._errHandler.sync(this);
					_alt = this._interp.adaptivePredict(this._input, 98, this._ctx);
				}
				}
				break;
			case 102:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 1022;
				this.match(esql_parser.QUOTED_IDENTIFIER);
				}
				break;
			case 95:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 1023;
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
	public promqlQueryContent(): PromqlQueryContentContext {
		let localctx: PromqlQueryContentContext = new PromqlQueryContentContext(this, this._ctx, this.state);
		this.enterRule(localctx, 198, esql_parser.RULE_promqlQueryContent);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1026;
			_la = this._input.LA(1);
			if(!(((((_la - 52)) & ~0x1F) === 0 && ((1 << (_la - 52)) & 1441) !== 0) || ((((_la - 95)) & ~0x1F) === 0 && ((1 << (_la - 95)) & 4289) !== 0) || ((((_la - 145)) & ~0x1F) === 0 && ((1 << (_la - 145)) & 7) !== 0))) {
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
	public promqlQueryPart(): PromqlQueryPartContext {
		let localctx: PromqlQueryPartContext = new PromqlQueryPartContext(this, this._ctx, this.state);
		this.enterRule(localctx, 200, esql_parser.RULE_promqlQueryPart);
		let _la: number;
		try {
			let _alt: number;
			this.state = 1041;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 52:
			case 57:
			case 59:
			case 60:
			case 62:
			case 95:
			case 101:
			case 102:
			case 107:
			case 145:
			case 146:
			case 147:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 1029;
				this._errHandler.sync(this);
				_alt = 1;
				do {
					switch (_alt) {
					case 1:
						{
						{
						this.state = 1028;
						this.promqlQueryContent();
						}
						}
						break;
					default:
						throw new NoViableAltException(this);
					}
					this.state = 1031;
					this._errHandler.sync(this);
					_alt = this._interp.adaptivePredict(this._input, 100, this._ctx);
				} while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER);
				}
				break;
			case 99:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 1033;
				this.match(esql_parser.LP);
				this.state = 1037;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (((((_la - 52)) & ~0x1F) === 0 && ((1 << (_la - 52)) & 1441) !== 0) || ((((_la - 95)) & ~0x1F) === 0 && ((1 << (_la - 95)) & 4305) !== 0) || ((((_la - 145)) & ~0x1F) === 0 && ((1 << (_la - 145)) & 7) !== 0)) {
					{
					{
					this.state = 1034;
					this.promqlQueryPart();
					}
					}
					this.state = 1039;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 1040;
				this.match(esql_parser.RP);
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
	public promqlIndexPattern(): PromqlIndexPatternContext {
		let localctx: PromqlIndexPatternContext = new PromqlIndexPatternContext(this, this._ctx, this.state);
		this.enterRule(localctx, 202, esql_parser.RULE_promqlIndexPattern);
		try {
			this.state = 1052;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 103, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 1043;
				this.promqlClusterString();
				this.state = 1044;
				this.match(esql_parser.COLON);
				this.state = 1045;
				this.promqlUnquotedIndexString();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 1047;
				this.promqlUnquotedIndexString();
				this.state = 1048;
				this.match(esql_parser.CAST_OP);
				this.state = 1049;
				this.promqlSelectorString();
				}
				break;
			case 3:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 1051;
				this.promqlIndexString();
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
	public promqlClusterString(): PromqlClusterStringContext {
		let localctx: PromqlClusterStringContext = new PromqlClusterStringContext(this, this._ctx, this.state);
		this.enterRule(localctx, 204, esql_parser.RULE_promqlClusterString);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1054;
			_la = this._input.LA(1);
			if(!(_la===101 || _la===107)) {
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
	public promqlSelectorString(): PromqlSelectorStringContext {
		let localctx: PromqlSelectorStringContext = new PromqlSelectorStringContext(this, this._ctx, this.state);
		this.enterRule(localctx, 206, esql_parser.RULE_promqlSelectorString);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1056;
			_la = this._input.LA(1);
			if(!(_la===101 || _la===107)) {
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
	public promqlUnquotedIndexString(): PromqlUnquotedIndexStringContext {
		let localctx: PromqlUnquotedIndexStringContext = new PromqlUnquotedIndexStringContext(this, this._ctx, this.state);
		this.enterRule(localctx, 208, esql_parser.RULE_promqlUnquotedIndexString);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1058;
			_la = this._input.LA(1);
			if(!(_la===101 || _la===107)) {
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
	public promqlIndexString(): PromqlIndexStringContext {
		let localctx: PromqlIndexStringContext = new PromqlIndexStringContext(this, this._ctx, this.state);
		this.enterRule(localctx, 210, esql_parser.RULE_promqlIndexString);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1060;
			_la = this._input.LA(1);
			if(!(_la===52 || _la===101 || _la===107)) {
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
		case 2:
			return this.query_sempred(localctx as QueryContext, predIndex);
		case 3:
			return this.sourceCommand_sempred(localctx as SourceCommandContext, predIndex);
		case 4:
			return this.processingCommand_sempred(localctx as ProcessingCommandContext, predIndex);
		case 15:
			return this.indexPatternOrSubquery_sempred(localctx as IndexPatternOrSubqueryContext, predIndex);
		case 27:
			return this.qualifiedName_sempred(localctx as QualifiedNameContext, predIndex);
		case 29:
			return this.qualifiedNamePattern_sempred(localctx as QualifiedNamePatternContext, predIndex);
		case 62:
			return this.forkSubQueryCommand_sempred(localctx as ForkSubQueryCommandContext, predIndex);
		case 73:
			return this.booleanExpression_sempred(localctx as BooleanExpressionContext, predIndex);
		case 77:
			return this.operatorExpression_sempred(localctx as OperatorExpressionContext, predIndex);
		case 78:
			return this.primaryExpression_sempred(localctx as PrimaryExpressionContext, predIndex);
		case 92:
			return this.joinTarget_sempred(localctx as JoinTargetContext, predIndex);
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
	private sourceCommand_sempred(localctx: SourceCommandContext, predIndex: number): boolean {
		switch (predIndex) {
		case 1:
			return this.isDevVersion();
		case 2:
			return this.isDevVersion();
		}
		return true;
	}
	private processingCommand_sempred(localctx: ProcessingCommandContext, predIndex: number): boolean {
		switch (predIndex) {
		case 3:
			return this.isDevVersion();
		case 4:
			return this.isDevVersion();
		}
		return true;
	}
	private indexPatternOrSubquery_sempred(localctx: IndexPatternOrSubqueryContext, predIndex: number): boolean {
		switch (predIndex) {
		case 5:
			return this.isDevVersion();
		}
		return true;
	}
	private qualifiedName_sempred(localctx: QualifiedNameContext, predIndex: number): boolean {
		switch (predIndex) {
		case 6:
			return this.isDevVersion();
		}
		return true;
	}
	private qualifiedNamePattern_sempred(localctx: QualifiedNamePatternContext, predIndex: number): boolean {
		switch (predIndex) {
		case 7:
			return this.isDevVersion();
		}
		return true;
	}
	private forkSubQueryCommand_sempred(localctx: ForkSubQueryCommandContext, predIndex: number): boolean {
		switch (predIndex) {
		case 8:
			return this.precpred(this._ctx, 1);
		}
		return true;
	}
	private booleanExpression_sempred(localctx: BooleanExpressionContext, predIndex: number): boolean {
		switch (predIndex) {
		case 9:
			return this.precpred(this._ctx, 5);
		case 10:
			return this.precpred(this._ctx, 4);
		}
		return true;
	}
	private operatorExpression_sempred(localctx: OperatorExpressionContext, predIndex: number): boolean {
		switch (predIndex) {
		case 11:
			return this.precpred(this._ctx, 2);
		case 12:
			return this.precpred(this._ctx, 1);
		}
		return true;
	}
	private primaryExpression_sempred(localctx: PrimaryExpressionContext, predIndex: number): boolean {
		switch (predIndex) {
		case 13:
			return this.precpred(this._ctx, 1);
		}
		return true;
	}
	private joinTarget_sempred(localctx: JoinTargetContext, predIndex: number): boolean {
		switch (predIndex) {
		case 14:
			return this.isDevVersion();
		}
		return true;
	}

	public static readonly _serializedATN: number[] = [4,1,158,1063,2,0,7,0,
	2,1,7,1,2,2,7,2,2,3,7,3,2,4,7,4,2,5,7,5,2,6,7,6,2,7,7,7,2,8,7,8,2,9,7,9,
	2,10,7,10,2,11,7,11,2,12,7,12,2,13,7,13,2,14,7,14,2,15,7,15,2,16,7,16,2,
	17,7,17,2,18,7,18,2,19,7,19,2,20,7,20,2,21,7,21,2,22,7,22,2,23,7,23,2,24,
	7,24,2,25,7,25,2,26,7,26,2,27,7,27,2,28,7,28,2,29,7,29,2,30,7,30,2,31,7,
	31,2,32,7,32,2,33,7,33,2,34,7,34,2,35,7,35,2,36,7,36,2,37,7,37,2,38,7,38,
	2,39,7,39,2,40,7,40,2,41,7,41,2,42,7,42,2,43,7,43,2,44,7,44,2,45,7,45,2,
	46,7,46,2,47,7,47,2,48,7,48,2,49,7,49,2,50,7,50,2,51,7,51,2,52,7,52,2,53,
	7,53,2,54,7,54,2,55,7,55,2,56,7,56,2,57,7,57,2,58,7,58,2,59,7,59,2,60,7,
	60,2,61,7,61,2,62,7,62,2,63,7,63,2,64,7,64,2,65,7,65,2,66,7,66,2,67,7,67,
	2,68,7,68,2,69,7,69,2,70,7,70,2,71,7,71,2,72,7,72,2,73,7,73,2,74,7,74,2,
	75,7,75,2,76,7,76,2,77,7,77,2,78,7,78,2,79,7,79,2,80,7,80,2,81,7,81,2,82,
	7,82,2,83,7,83,2,84,7,84,2,85,7,85,2,86,7,86,2,87,7,87,2,88,7,88,2,89,7,
	89,2,90,7,90,2,91,7,91,2,92,7,92,2,93,7,93,2,94,7,94,2,95,7,95,2,96,7,96,
	2,97,7,97,2,98,7,98,2,99,7,99,2,100,7,100,2,101,7,101,2,102,7,102,2,103,
	7,103,2,104,7,104,2,105,7,105,1,0,5,0,214,8,0,10,0,12,0,217,9,0,1,0,1,0,
	1,0,1,1,1,1,1,1,1,2,1,2,1,2,1,2,1,2,1,2,5,2,231,8,2,10,2,12,2,234,9,2,1,
	3,1,3,1,3,1,3,1,3,1,3,1,3,1,3,3,3,244,8,3,1,4,1,4,1,4,1,4,1,4,1,4,1,4,1,
	4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,3,4,270,
	8,4,1,5,1,5,1,5,1,6,1,6,1,7,1,7,1,7,1,8,1,8,1,8,5,8,283,8,8,10,8,12,8,286,
	9,8,1,9,1,9,1,9,3,9,291,8,9,1,9,1,9,1,10,1,10,1,10,5,10,298,8,10,10,10,
	12,10,301,9,10,1,11,1,11,1,11,3,11,306,8,11,1,12,1,12,1,12,1,13,1,13,1,
	13,1,14,1,14,1,14,5,14,317,8,14,10,14,12,14,320,9,14,1,14,3,14,323,8,14,
	1,15,1,15,1,15,3,15,328,8,15,1,16,1,16,1,16,1,16,5,16,334,8,16,10,16,12,
	16,337,9,16,1,16,1,16,1,17,1,17,1,17,1,17,1,17,1,17,1,17,1,17,1,17,3,17,
	350,8,17,1,18,1,18,1,19,1,19,1,20,1,20,1,21,1,21,1,22,1,22,1,22,1,22,5,
	22,364,8,22,10,22,12,22,367,9,22,1,23,1,23,1,23,1,24,1,24,3,24,374,8,24,
	1,24,1,24,3,24,378,8,24,1,25,1,25,1,25,5,25,383,8,25,10,25,12,25,386,9,
	25,1,26,1,26,1,26,3,26,391,8,26,1,27,1,27,1,27,3,27,396,8,27,1,27,1,27,
	1,27,1,27,1,27,1,27,1,27,3,27,405,8,27,1,28,1,28,1,28,5,28,410,8,28,10,
	28,12,28,413,9,28,1,29,1,29,1,29,3,29,418,8,29,1,29,1,29,1,29,1,29,1,29,
	1,29,1,29,3,29,427,8,29,1,30,1,30,1,30,5,30,432,8,30,10,30,12,30,435,9,
	30,1,31,1,31,1,31,5,31,440,8,31,10,31,12,31,443,9,31,1,32,1,32,1,33,1,33,
	1,33,3,33,450,8,33,1,34,1,34,3,34,454,8,34,1,35,1,35,3,35,458,8,35,1,36,
	1,36,1,36,3,36,463,8,36,1,37,1,37,3,37,467,8,37,1,38,1,38,1,38,1,39,1,39,
	1,39,1,39,5,39,476,8,39,10,39,12,39,479,9,39,1,40,1,40,3,40,483,8,40,1,
	40,1,40,3,40,487,8,40,1,41,1,41,1,41,1,42,1,42,1,42,1,43,1,43,1,43,1,43,
	5,43,499,8,43,10,43,12,43,502,9,43,1,44,1,44,1,44,1,44,1,44,1,44,1,44,1,
	44,3,44,512,8,44,1,45,1,45,1,45,1,45,3,45,518,8,45,1,46,1,46,1,46,5,46,
	523,8,46,10,46,12,46,526,9,46,1,47,1,47,1,47,1,47,1,48,1,48,3,48,534,8,
	48,1,49,1,49,1,49,1,49,1,49,5,49,541,8,49,10,49,12,49,544,9,49,1,50,1,50,
	1,50,1,51,1,51,1,51,1,52,1,52,1,52,1,52,1,53,1,53,1,53,1,54,1,54,1,54,1,
	54,3,54,563,8,54,1,54,1,54,1,54,1,54,5,54,569,8,54,10,54,12,54,572,9,54,
	3,54,574,8,54,1,55,1,55,1,56,1,56,1,56,3,56,581,8,56,1,56,1,56,1,57,1,57,
	1,57,1,58,1,58,1,58,1,58,3,58,592,8,58,1,58,1,58,1,58,1,58,1,58,3,58,599,
	8,58,1,59,1,59,1,59,1,60,4,60,605,8,60,11,60,12,60,606,1,61,1,61,1,61,1,
	61,1,62,1,62,1,62,1,62,1,62,1,62,5,62,619,8,62,10,62,12,62,622,9,62,1,63,
	1,63,1,64,1,64,1,64,1,64,3,64,630,8,64,1,64,1,64,1,64,1,64,1,64,1,65,1,
	65,1,65,1,65,3,65,641,8,65,1,65,1,65,1,65,1,66,1,66,1,66,1,66,1,66,3,66,
	651,8,66,1,66,1,66,1,66,1,66,3,66,657,8,66,3,66,659,8,66,1,67,1,67,3,67,
	663,8,67,1,67,5,67,666,8,67,10,67,12,67,669,9,67,1,68,1,68,1,68,1,68,1,
	68,1,68,1,68,1,68,1,68,1,68,1,68,3,68,682,8,68,1,69,1,69,1,69,1,69,1,69,
	1,70,1,70,1,70,1,71,1,71,1,71,1,71,1,72,1,72,1,72,1,72,1,73,1,73,1,73,1,
	73,1,73,1,73,1,73,3,73,707,8,73,1,73,1,73,1,73,1,73,1,73,5,73,714,8,73,
	10,73,12,73,717,9,73,1,73,1,73,1,73,1,73,1,73,3,73,724,8,73,1,73,1,73,1,
	73,3,73,729,8,73,1,73,1,73,1,73,1,73,1,73,1,73,5,73,737,8,73,10,73,12,73,
	740,9,73,1,74,1,74,3,74,744,8,74,1,74,1,74,1,74,1,74,1,74,3,74,751,8,74,
	1,74,1,74,1,74,1,74,1,74,3,74,758,8,74,1,74,1,74,1,74,1,74,1,74,5,74,765,
	8,74,10,74,12,74,768,9,74,1,74,1,74,1,74,1,74,3,74,774,8,74,1,74,1,74,1,
	74,1,74,1,74,5,74,781,8,74,10,74,12,74,784,9,74,1,74,1,74,3,74,788,8,74,
	1,75,1,75,1,75,3,75,793,8,75,1,75,1,75,1,75,1,76,1,76,1,76,1,76,1,76,3,
	76,803,8,76,1,77,1,77,1,77,1,77,3,77,809,8,77,1,77,1,77,1,77,1,77,1,77,
	1,77,5,77,817,8,77,10,77,12,77,820,9,77,1,78,1,78,1,78,1,78,1,78,1,78,1,
	78,1,78,3,78,830,8,78,1,78,1,78,1,78,5,78,835,8,78,10,78,12,78,838,9,78,
	1,79,1,79,1,79,1,79,1,79,1,79,5,79,846,8,79,10,79,12,79,849,9,79,1,79,1,
	79,3,79,853,8,79,3,79,855,8,79,1,79,1,79,1,80,1,80,1,80,3,80,862,8,80,1,
	81,1,81,1,81,1,81,5,81,868,8,81,10,81,12,81,871,9,81,3,81,873,8,81,1,81,
	1,81,1,82,1,82,1,82,1,82,1,83,1,83,3,83,883,8,83,1,84,1,84,1,84,1,84,1,
	84,1,84,1,84,1,84,1,84,1,84,1,84,1,84,1,84,5,84,898,8,84,10,84,12,84,901,
	9,84,1,84,1,84,1,84,1,84,1,84,1,84,5,84,909,8,84,10,84,12,84,912,9,84,1,
	84,1,84,1,84,1,84,1,84,1,84,5,84,920,8,84,10,84,12,84,923,9,84,1,84,1,84,
	3,84,927,8,84,1,85,1,85,1,86,1,86,3,86,933,8,86,1,87,3,87,936,8,87,1,87,
	1,87,1,88,3,88,941,8,88,1,88,1,88,1,89,1,89,1,90,1,90,1,91,1,91,1,91,1,
	91,1,91,1,92,1,92,1,92,3,92,957,8,92,1,92,1,92,1,92,3,92,962,8,92,1,93,
	1,93,1,93,1,93,5,93,968,8,93,10,93,12,93,971,9,93,1,94,1,94,5,94,975,8,
	94,10,94,12,94,978,9,94,1,94,1,94,1,94,3,94,983,8,94,1,94,1,94,4,94,987,
	8,94,11,94,12,94,988,1,94,1,94,1,94,1,94,5,94,995,8,94,10,94,12,94,998,
	9,94,1,94,4,94,1001,8,94,11,94,12,94,1002,3,94,1005,8,94,1,95,1,95,1,96,
	1,96,1,96,1,96,1,97,1,97,1,98,1,98,1,98,5,98,1018,8,98,10,98,12,98,1021,
	9,98,1,98,1,98,3,98,1025,8,98,1,99,1,99,1,100,4,100,1030,8,100,11,100,12,
	100,1031,1,100,1,100,5,100,1036,8,100,10,100,12,100,1039,9,100,1,100,3,
	100,1042,8,100,1,101,1,101,1,101,1,101,1,101,1,101,1,101,1,101,1,101,3,
	101,1053,8,101,1,102,1,102,1,103,1,103,1,104,1,104,1,105,1,105,1,105,0,
	5,4,124,146,154,156,106,0,2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,
	36,38,40,42,44,46,48,50,52,54,56,58,60,62,64,66,68,70,72,74,76,78,80,82,
	84,86,88,90,92,94,96,98,100,102,104,106,108,110,112,114,116,118,120,122,
	124,126,128,130,132,134,136,138,140,142,144,146,148,150,152,154,156,158,
	160,162,164,166,168,170,172,174,176,178,180,182,184,186,188,190,192,194,
	196,198,200,202,204,206,208,210,0,14,2,0,52,52,107,107,1,0,101,102,2,0,
	56,56,63,63,2,0,66,66,69,69,2,0,41,41,52,52,1,0,87,88,1,0,89,91,2,0,65,
	65,78,78,2,0,80,80,82,86,2,0,24,24,26,27,3,0,52,52,95,95,101,102,8,0,52,
	52,57,57,59,60,62,62,95,95,101,102,107,107,145,147,2,0,101,101,107,107,
	3,0,52,52,101,101,107,107,1109,0,215,1,0,0,0,2,221,1,0,0,0,4,224,1,0,0,
	0,6,243,1,0,0,0,8,269,1,0,0,0,10,271,1,0,0,0,12,274,1,0,0,0,14,276,1,0,
	0,0,16,279,1,0,0,0,18,290,1,0,0,0,20,294,1,0,0,0,22,302,1,0,0,0,24,307,
	1,0,0,0,26,310,1,0,0,0,28,313,1,0,0,0,30,327,1,0,0,0,32,329,1,0,0,0,34,
	349,1,0,0,0,36,351,1,0,0,0,38,353,1,0,0,0,40,355,1,0,0,0,42,357,1,0,0,0,
	44,359,1,0,0,0,46,368,1,0,0,0,48,371,1,0,0,0,50,379,1,0,0,0,52,387,1,0,
	0,0,54,404,1,0,0,0,56,406,1,0,0,0,58,426,1,0,0,0,60,428,1,0,0,0,62,436,
	1,0,0,0,64,444,1,0,0,0,66,449,1,0,0,0,68,453,1,0,0,0,70,457,1,0,0,0,72,
	462,1,0,0,0,74,466,1,0,0,0,76,468,1,0,0,0,78,471,1,0,0,0,80,480,1,0,0,0,
	82,488,1,0,0,0,84,491,1,0,0,0,86,494,1,0,0,0,88,511,1,0,0,0,90,513,1,0,
	0,0,92,519,1,0,0,0,94,527,1,0,0,0,96,533,1,0,0,0,98,535,1,0,0,0,100,545,
	1,0,0,0,102,548,1,0,0,0,104,551,1,0,0,0,106,555,1,0,0,0,108,558,1,0,0,0,
	110,575,1,0,0,0,112,580,1,0,0,0,114,584,1,0,0,0,116,587,1,0,0,0,118,600,
	1,0,0,0,120,604,1,0,0,0,122,608,1,0,0,0,124,612,1,0,0,0,126,623,1,0,0,0,
	128,625,1,0,0,0,130,636,1,0,0,0,132,658,1,0,0,0,134,660,1,0,0,0,136,681,
	1,0,0,0,138,683,1,0,0,0,140,688,1,0,0,0,142,691,1,0,0,0,144,695,1,0,0,0,
	146,728,1,0,0,0,148,787,1,0,0,0,150,789,1,0,0,0,152,802,1,0,0,0,154,808,
	1,0,0,0,156,829,1,0,0,0,158,839,1,0,0,0,160,861,1,0,0,0,162,863,1,0,0,0,
	164,876,1,0,0,0,166,882,1,0,0,0,168,926,1,0,0,0,170,928,1,0,0,0,172,932,
	1,0,0,0,174,935,1,0,0,0,176,940,1,0,0,0,178,944,1,0,0,0,180,946,1,0,0,0,
	182,948,1,0,0,0,184,961,1,0,0,0,186,963,1,0,0,0,188,1004,1,0,0,0,190,1006,
	1,0,0,0,192,1008,1,0,0,0,194,1012,1,0,0,0,196,1024,1,0,0,0,198,1026,1,0,
	0,0,200,1041,1,0,0,0,202,1052,1,0,0,0,204,1054,1,0,0,0,206,1056,1,0,0,0,
	208,1058,1,0,0,0,210,1060,1,0,0,0,212,214,3,142,71,0,213,212,1,0,0,0,214,
	217,1,0,0,0,215,213,1,0,0,0,215,216,1,0,0,0,216,218,1,0,0,0,217,215,1,0,
	0,0,218,219,3,2,1,0,219,220,5,0,0,1,220,1,1,0,0,0,221,222,3,4,2,0,222,223,
	5,0,0,1,223,3,1,0,0,0,224,225,6,2,-1,0,225,226,3,6,3,0,226,232,1,0,0,0,
	227,228,10,1,0,0,228,229,5,51,0,0,229,231,3,8,4,0,230,227,1,0,0,0,231,234,
	1,0,0,0,232,230,1,0,0,0,232,233,1,0,0,0,233,5,1,0,0,0,234,232,1,0,0,0,235,
	244,3,24,12,0,236,244,3,14,7,0,237,244,3,106,53,0,238,244,3,26,13,0,239,
	240,4,3,1,0,240,244,3,102,51,0,241,242,4,3,2,0,242,244,3,188,94,0,243,235,
	1,0,0,0,243,236,1,0,0,0,243,237,1,0,0,0,243,238,1,0,0,0,243,239,1,0,0,0,
	243,241,1,0,0,0,244,7,1,0,0,0,245,270,3,46,23,0,246,270,3,10,5,0,247,270,
	3,82,41,0,248,270,3,76,38,0,249,270,3,48,24,0,250,270,3,78,39,0,251,270,
	3,84,42,0,252,270,3,86,43,0,253,270,3,90,45,0,254,270,3,98,49,0,255,270,
	3,108,54,0,256,270,3,100,50,0,257,270,3,182,91,0,258,270,3,116,58,0,259,
	270,3,130,65,0,260,270,3,114,57,0,261,270,3,118,59,0,262,270,3,128,64,0,
	263,270,3,132,66,0,264,270,3,134,67,0,265,266,4,4,3,0,266,270,3,138,69,
	0,267,268,4,4,4,0,268,270,3,140,70,0,269,245,1,0,0,0,269,246,1,0,0,0,269,
	247,1,0,0,0,269,248,1,0,0,0,269,249,1,0,0,0,269,250,1,0,0,0,269,251,1,0,
	0,0,269,252,1,0,0,0,269,253,1,0,0,0,269,254,1,0,0,0,269,255,1,0,0,0,269,
	256,1,0,0,0,269,257,1,0,0,0,269,258,1,0,0,0,269,259,1,0,0,0,269,260,1,0,
	0,0,269,261,1,0,0,0,269,262,1,0,0,0,269,263,1,0,0,0,269,264,1,0,0,0,269,
	265,1,0,0,0,269,267,1,0,0,0,270,9,1,0,0,0,271,272,5,17,0,0,272,273,3,146,
	73,0,273,11,1,0,0,0,274,275,3,64,32,0,275,13,1,0,0,0,276,277,5,13,0,0,277,
	278,3,16,8,0,278,15,1,0,0,0,279,284,3,18,9,0,280,281,5,62,0,0,281,283,3,
	18,9,0,282,280,1,0,0,0,283,286,1,0,0,0,284,282,1,0,0,0,284,285,1,0,0,0,
	285,17,1,0,0,0,286,284,1,0,0,0,287,288,3,54,27,0,288,289,5,57,0,0,289,291,
	1,0,0,0,290,287,1,0,0,0,290,291,1,0,0,0,291,292,1,0,0,0,292,293,3,146,73,
	0,293,19,1,0,0,0,294,299,3,22,11,0,295,296,5,62,0,0,296,298,3,22,11,0,297,
	295,1,0,0,0,298,301,1,0,0,0,299,297,1,0,0,0,299,300,1,0,0,0,300,21,1,0,
	0,0,301,299,1,0,0,0,302,305,3,54,27,0,303,304,5,57,0,0,304,306,3,146,73,
	0,305,303,1,0,0,0,305,306,1,0,0,0,306,23,1,0,0,0,307,308,5,18,0,0,308,309,
	3,28,14,0,309,25,1,0,0,0,310,311,5,19,0,0,311,312,3,28,14,0,312,27,1,0,
	0,0,313,318,3,30,15,0,314,315,5,62,0,0,315,317,3,30,15,0,316,314,1,0,0,
	0,317,320,1,0,0,0,318,316,1,0,0,0,318,319,1,0,0,0,319,322,1,0,0,0,320,318,
	1,0,0,0,321,323,3,44,22,0,322,321,1,0,0,0,322,323,1,0,0,0,323,29,1,0,0,
	0,324,328,3,34,17,0,325,326,4,15,5,0,326,328,3,32,16,0,327,324,1,0,0,0,
	327,325,1,0,0,0,328,31,1,0,0,0,329,330,5,99,0,0,330,335,3,24,12,0,331,332,
	5,51,0,0,332,334,3,8,4,0,333,331,1,0,0,0,334,337,1,0,0,0,335,333,1,0,0,
	0,335,336,1,0,0,0,336,338,1,0,0,0,337,335,1,0,0,0,338,339,5,100,0,0,339,
	33,1,0,0,0,340,341,3,36,18,0,341,342,5,60,0,0,342,343,3,40,20,0,343,350,
	1,0,0,0,344,345,3,40,20,0,345,346,5,59,0,0,346,347,3,38,19,0,347,350,1,
	0,0,0,348,350,3,42,21,0,349,340,1,0,0,0,349,344,1,0,0,0,349,348,1,0,0,0,
	350,35,1,0,0,0,351,352,5,107,0,0,352,37,1,0,0,0,353,354,5,107,0,0,354,39,
	1,0,0,0,355,356,5,107,0,0,356,41,1,0,0,0,357,358,7,0,0,0,358,43,1,0,0,0,
	359,360,5,106,0,0,360,365,5,107,0,0,361,362,5,62,0,0,362,364,5,107,0,0,
	363,361,1,0,0,0,364,367,1,0,0,0,365,363,1,0,0,0,365,366,1,0,0,0,366,45,
	1,0,0,0,367,365,1,0,0,0,368,369,5,9,0,0,369,370,3,16,8,0,370,47,1,0,0,0,
	371,373,5,16,0,0,372,374,3,50,25,0,373,372,1,0,0,0,373,374,1,0,0,0,374,
	377,1,0,0,0,375,376,5,58,0,0,376,378,3,16,8,0,377,375,1,0,0,0,377,378,1,
	0,0,0,378,49,1,0,0,0,379,384,3,52,26,0,380,381,5,62,0,0,381,383,3,52,26,
	0,382,380,1,0,0,0,383,386,1,0,0,0,384,382,1,0,0,0,384,385,1,0,0,0,385,51,
	1,0,0,0,386,384,1,0,0,0,387,390,3,18,9,0,388,389,5,17,0,0,389,391,3,146,
	73,0,390,388,1,0,0,0,390,391,1,0,0,0,391,53,1,0,0,0,392,393,4,27,6,0,393,
	395,5,97,0,0,394,396,5,101,0,0,395,394,1,0,0,0,395,396,1,0,0,0,396,397,
	1,0,0,0,397,398,5,98,0,0,398,399,5,64,0,0,399,400,5,97,0,0,400,401,3,56,
	28,0,401,402,5,98,0,0,402,405,1,0,0,0,403,405,3,56,28,0,404,392,1,0,0,0,
	404,403,1,0,0,0,405,55,1,0,0,0,406,411,3,72,36,0,407,408,5,64,0,0,408,410,
	3,72,36,0,409,407,1,0,0,0,410,413,1,0,0,0,411,409,1,0,0,0,411,412,1,0,0,
	0,412,57,1,0,0,0,413,411,1,0,0,0,414,415,4,29,7,0,415,417,5,97,0,0,416,
	418,5,138,0,0,417,416,1,0,0,0,417,418,1,0,0,0,418,419,1,0,0,0,419,420,5,
	98,0,0,420,421,5,64,0,0,421,422,5,97,0,0,422,423,3,60,30,0,423,424,5,98,
	0,0,424,427,1,0,0,0,425,427,3,60,30,0,426,414,1,0,0,0,426,425,1,0,0,0,427,
	59,1,0,0,0,428,433,3,66,33,0,429,430,5,64,0,0,430,432,3,66,33,0,431,429,
	1,0,0,0,432,435,1,0,0,0,433,431,1,0,0,0,433,434,1,0,0,0,434,61,1,0,0,0,
	435,433,1,0,0,0,436,441,3,58,29,0,437,438,5,62,0,0,438,440,3,58,29,0,439,
	437,1,0,0,0,440,443,1,0,0,0,441,439,1,0,0,0,441,442,1,0,0,0,442,63,1,0,
	0,0,443,441,1,0,0,0,444,445,7,1,0,0,445,65,1,0,0,0,446,450,5,138,0,0,447,
	450,3,68,34,0,448,450,3,70,35,0,449,446,1,0,0,0,449,447,1,0,0,0,449,448,
	1,0,0,0,450,67,1,0,0,0,451,454,5,76,0,0,452,454,5,95,0,0,453,451,1,0,0,
	0,453,452,1,0,0,0,454,69,1,0,0,0,455,458,5,94,0,0,456,458,5,96,0,0,457,
	455,1,0,0,0,457,456,1,0,0,0,458,71,1,0,0,0,459,463,3,64,32,0,460,463,3,
	68,34,0,461,463,3,70,35,0,462,459,1,0,0,0,462,460,1,0,0,0,462,461,1,0,0,
	0,463,73,1,0,0,0,464,467,3,178,89,0,465,467,3,68,34,0,466,464,1,0,0,0,466,
	465,1,0,0,0,467,75,1,0,0,0,468,469,5,11,0,0,469,470,3,168,84,0,470,77,1,
	0,0,0,471,472,5,15,0,0,472,477,3,80,40,0,473,474,5,62,0,0,474,476,3,80,
	40,0,475,473,1,0,0,0,476,479,1,0,0,0,477,475,1,0,0,0,477,478,1,0,0,0,478,
	79,1,0,0,0,479,477,1,0,0,0,480,482,3,146,73,0,481,483,7,2,0,0,482,481,1,
	0,0,0,482,483,1,0,0,0,483,486,1,0,0,0,484,485,5,73,0,0,485,487,7,3,0,0,
	486,484,1,0,0,0,486,487,1,0,0,0,487,81,1,0,0,0,488,489,5,31,0,0,489,490,
	3,62,31,0,490,83,1,0,0,0,491,492,5,30,0,0,492,493,3,62,31,0,493,85,1,0,
	0,0,494,495,5,34,0,0,495,500,3,88,44,0,496,497,5,62,0,0,497,499,3,88,44,
	0,498,496,1,0,0,0,499,502,1,0,0,0,500,498,1,0,0,0,500,501,1,0,0,0,501,87,
	1,0,0,0,502,500,1,0,0,0,503,504,3,58,29,0,504,505,5,148,0,0,505,506,3,58,
	29,0,506,512,1,0,0,0,507,508,3,58,29,0,508,509,5,57,0,0,509,510,3,58,29,
	0,510,512,1,0,0,0,511,503,1,0,0,0,511,507,1,0,0,0,512,89,1,0,0,0,513,514,
	5,8,0,0,514,515,3,156,78,0,515,517,3,178,89,0,516,518,3,92,46,0,517,516,
	1,0,0,0,517,518,1,0,0,0,518,91,1,0,0,0,519,524,3,94,47,0,520,521,5,62,0,
	0,521,523,3,94,47,0,522,520,1,0,0,0,523,526,1,0,0,0,524,522,1,0,0,0,524,
	525,1,0,0,0,525,93,1,0,0,0,526,524,1,0,0,0,527,528,3,64,32,0,528,529,5,
	57,0,0,529,530,3,168,84,0,530,95,1,0,0,0,531,532,5,79,0,0,532,534,3,162,
	81,0,533,531,1,0,0,0,533,534,1,0,0,0,534,97,1,0,0,0,535,536,5,10,0,0,536,
	537,3,156,78,0,537,542,3,178,89,0,538,539,5,62,0,0,539,541,3,178,89,0,540,
	538,1,0,0,0,541,544,1,0,0,0,542,540,1,0,0,0,542,543,1,0,0,0,543,99,1,0,
	0,0,544,542,1,0,0,0,545,546,5,29,0,0,546,547,3,54,27,0,547,101,1,0,0,0,
	548,549,5,6,0,0,549,550,3,104,52,0,550,103,1,0,0,0,551,552,5,99,0,0,552,
	553,3,4,2,0,553,554,5,100,0,0,554,105,1,0,0,0,555,556,5,36,0,0,556,557,
	5,155,0,0,557,107,1,0,0,0,558,559,5,5,0,0,559,562,3,110,55,0,560,561,5,
	74,0,0,561,563,3,58,29,0,562,560,1,0,0,0,562,563,1,0,0,0,563,573,1,0,0,
	0,564,565,5,79,0,0,565,570,3,112,56,0,566,567,5,62,0,0,567,569,3,112,56,
	0,568,566,1,0,0,0,569,572,1,0,0,0,570,568,1,0,0,0,570,571,1,0,0,0,571,574,
	1,0,0,0,572,570,1,0,0,0,573,564,1,0,0,0,573,574,1,0,0,0,574,109,1,0,0,0,
	575,576,7,4,0,0,576,111,1,0,0,0,577,578,3,58,29,0,578,579,5,57,0,0,579,
	581,1,0,0,0,580,577,1,0,0,0,580,581,1,0,0,0,581,582,1,0,0,0,582,583,3,58,
	29,0,583,113,1,0,0,0,584,585,5,14,0,0,585,586,3,168,84,0,586,115,1,0,0,
	0,587,588,5,4,0,0,588,591,3,54,27,0,589,590,5,74,0,0,590,592,3,54,27,0,
	591,589,1,0,0,0,591,592,1,0,0,0,592,598,1,0,0,0,593,594,5,148,0,0,594,595,
	3,54,27,0,595,596,5,62,0,0,596,597,3,54,27,0,597,599,1,0,0,0,598,593,1,
	0,0,0,598,599,1,0,0,0,599,117,1,0,0,0,600,601,5,20,0,0,601,602,3,120,60,
	0,602,119,1,0,0,0,603,605,3,122,61,0,604,603,1,0,0,0,605,606,1,0,0,0,606,
	604,1,0,0,0,606,607,1,0,0,0,607,121,1,0,0,0,608,609,5,99,0,0,609,610,3,
	124,62,0,610,611,5,100,0,0,611,123,1,0,0,0,612,613,6,62,-1,0,613,614,3,
	126,63,0,614,620,1,0,0,0,615,616,10,1,0,0,616,617,5,51,0,0,617,619,3,126,
	63,0,618,615,1,0,0,0,619,622,1,0,0,0,620,618,1,0,0,0,620,621,1,0,0,0,621,
	125,1,0,0,0,622,620,1,0,0,0,623,624,3,8,4,0,624,127,1,0,0,0,625,629,5,12,
	0,0,626,627,3,54,27,0,627,628,5,57,0,0,628,630,1,0,0,0,629,626,1,0,0,0,
	629,630,1,0,0,0,630,631,1,0,0,0,631,632,3,168,84,0,632,633,5,74,0,0,633,
	634,3,20,10,0,634,635,3,96,48,0,635,129,1,0,0,0,636,640,5,7,0,0,637,638,
	3,54,27,0,638,639,5,57,0,0,639,641,1,0,0,0,640,637,1,0,0,0,640,641,1,0,
	0,0,641,642,1,0,0,0,642,643,3,156,78,0,643,644,3,96,48,0,644,131,1,0,0,
	0,645,646,5,22,0,0,646,647,5,120,0,0,647,650,3,50,25,0,648,649,5,58,0,0,
	649,651,3,16,8,0,650,648,1,0,0,0,650,651,1,0,0,0,651,659,1,0,0,0,652,653,
	5,23,0,0,653,656,3,50,25,0,654,655,5,58,0,0,655,657,3,16,8,0,656,654,1,
	0,0,0,656,657,1,0,0,0,657,659,1,0,0,0,658,645,1,0,0,0,658,652,1,0,0,0,659,
	133,1,0,0,0,660,662,5,21,0,0,661,663,3,64,32,0,662,661,1,0,0,0,662,663,
	1,0,0,0,663,667,1,0,0,0,664,666,3,136,68,0,665,664,1,0,0,0,666,669,1,0,
	0,0,667,665,1,0,0,0,667,668,1,0,0,0,668,135,1,0,0,0,669,667,1,0,0,0,670,
	671,5,115,0,0,671,672,5,58,0,0,672,682,3,54,27,0,673,674,5,116,0,0,674,
	675,5,58,0,0,675,682,3,16,8,0,676,677,5,114,0,0,677,678,5,58,0,0,678,682,
	3,54,27,0,679,680,5,79,0,0,680,682,3,162,81,0,681,670,1,0,0,0,681,673,1,
	0,0,0,681,676,1,0,0,0,681,679,1,0,0,0,682,137,1,0,0,0,683,684,5,28,0,0,
	684,685,3,34,17,0,685,686,5,74,0,0,686,687,3,62,31,0,687,139,1,0,0,0,688,
	689,5,32,0,0,689,690,3,62,31,0,690,141,1,0,0,0,691,692,5,35,0,0,692,693,
	3,144,72,0,693,694,5,61,0,0,694,143,1,0,0,0,695,696,3,64,32,0,696,697,5,
	57,0,0,697,698,3,168,84,0,698,145,1,0,0,0,699,700,6,73,-1,0,700,701,5,71,
	0,0,701,729,3,146,73,8,702,729,3,152,76,0,703,729,3,148,74,0,704,706,3,
	152,76,0,705,707,5,71,0,0,706,705,1,0,0,0,706,707,1,0,0,0,707,708,1,0,0,
	0,708,709,5,67,0,0,709,710,5,99,0,0,710,715,3,152,76,0,711,712,5,62,0,0,
	712,714,3,152,76,0,713,711,1,0,0,0,714,717,1,0,0,0,715,713,1,0,0,0,715,
	716,1,0,0,0,716,718,1,0,0,0,717,715,1,0,0,0,718,719,5,100,0,0,719,729,1,
	0,0,0,720,721,3,152,76,0,721,723,5,68,0,0,722,724,5,71,0,0,723,722,1,0,
	0,0,723,724,1,0,0,0,724,725,1,0,0,0,725,726,5,72,0,0,726,729,1,0,0,0,727,
	729,3,150,75,0,728,699,1,0,0,0,728,702,1,0,0,0,728,703,1,0,0,0,728,704,
	1,0,0,0,728,720,1,0,0,0,728,727,1,0,0,0,729,738,1,0,0,0,730,731,10,5,0,
	0,731,732,5,55,0,0,732,737,3,146,73,6,733,734,10,4,0,0,734,735,5,75,0,0,
	735,737,3,146,73,5,736,730,1,0,0,0,736,733,1,0,0,0,737,740,1,0,0,0,738,
	736,1,0,0,0,738,739,1,0,0,0,739,147,1,0,0,0,740,738,1,0,0,0,741,743,3,152,
	76,0,742,744,5,71,0,0,743,742,1,0,0,0,743,744,1,0,0,0,744,745,1,0,0,0,745,
	746,5,70,0,0,746,747,3,74,37,0,747,788,1,0,0,0,748,750,3,152,76,0,749,751,
	5,71,0,0,750,749,1,0,0,0,750,751,1,0,0,0,751,752,1,0,0,0,752,753,5,77,0,
	0,753,754,3,74,37,0,754,788,1,0,0,0,755,757,3,152,76,0,756,758,5,71,0,0,
	757,756,1,0,0,0,757,758,1,0,0,0,758,759,1,0,0,0,759,760,5,70,0,0,760,761,
	5,99,0,0,761,766,3,74,37,0,762,763,5,62,0,0,763,765,3,74,37,0,764,762,1,
	0,0,0,765,768,1,0,0,0,766,764,1,0,0,0,766,767,1,0,0,0,767,769,1,0,0,0,768,
	766,1,0,0,0,769,770,5,100,0,0,770,788,1,0,0,0,771,773,3,152,76,0,772,774,
	5,71,0,0,773,772,1,0,0,0,773,774,1,0,0,0,774,775,1,0,0,0,775,776,5,77,0,
	0,776,777,5,99,0,0,777,782,3,74,37,0,778,779,5,62,0,0,779,781,3,74,37,0,
	780,778,1,0,0,0,781,784,1,0,0,0,782,780,1,0,0,0,782,783,1,0,0,0,783,785,
	1,0,0,0,784,782,1,0,0,0,785,786,5,100,0,0,786,788,1,0,0,0,787,741,1,0,0,
	0,787,748,1,0,0,0,787,755,1,0,0,0,787,771,1,0,0,0,788,149,1,0,0,0,789,792,
	3,54,27,0,790,791,5,59,0,0,791,793,3,12,6,0,792,790,1,0,0,0,792,793,1,0,
	0,0,793,794,1,0,0,0,794,795,5,60,0,0,795,796,3,168,84,0,796,151,1,0,0,0,
	797,803,3,154,77,0,798,799,3,154,77,0,799,800,3,180,90,0,800,801,3,154,
	77,0,801,803,1,0,0,0,802,797,1,0,0,0,802,798,1,0,0,0,803,153,1,0,0,0,804,
	805,6,77,-1,0,805,809,3,156,78,0,806,807,7,5,0,0,807,809,3,154,77,3,808,
	804,1,0,0,0,808,806,1,0,0,0,809,818,1,0,0,0,810,811,10,2,0,0,811,812,7,
	6,0,0,812,817,3,154,77,3,813,814,10,1,0,0,814,815,7,5,0,0,815,817,3,154,
	77,2,816,810,1,0,0,0,816,813,1,0,0,0,817,820,1,0,0,0,818,816,1,0,0,0,818,
	819,1,0,0,0,819,155,1,0,0,0,820,818,1,0,0,0,821,822,6,78,-1,0,822,830,3,
	168,84,0,823,830,3,54,27,0,824,830,3,158,79,0,825,826,5,99,0,0,826,827,
	3,146,73,0,827,828,5,100,0,0,828,830,1,0,0,0,829,821,1,0,0,0,829,823,1,
	0,0,0,829,824,1,0,0,0,829,825,1,0,0,0,830,836,1,0,0,0,831,832,10,1,0,0,
	832,833,5,59,0,0,833,835,3,12,6,0,834,831,1,0,0,0,835,838,1,0,0,0,836,834,
	1,0,0,0,836,837,1,0,0,0,837,157,1,0,0,0,838,836,1,0,0,0,839,840,3,160,80,
	0,840,854,5,99,0,0,841,855,5,89,0,0,842,847,3,146,73,0,843,844,5,62,0,0,
	844,846,3,146,73,0,845,843,1,0,0,0,846,849,1,0,0,0,847,845,1,0,0,0,847,
	848,1,0,0,0,848,852,1,0,0,0,849,847,1,0,0,0,850,851,5,62,0,0,851,853,3,
	162,81,0,852,850,1,0,0,0,852,853,1,0,0,0,853,855,1,0,0,0,854,841,1,0,0,
	0,854,842,1,0,0,0,854,855,1,0,0,0,855,856,1,0,0,0,856,857,5,100,0,0,857,
	159,1,0,0,0,858,862,3,72,36,0,859,862,5,66,0,0,860,862,5,69,0,0,861,858,
	1,0,0,0,861,859,1,0,0,0,861,860,1,0,0,0,862,161,1,0,0,0,863,872,5,92,0,
	0,864,869,3,164,82,0,865,866,5,62,0,0,866,868,3,164,82,0,867,865,1,0,0,
	0,868,871,1,0,0,0,869,867,1,0,0,0,869,870,1,0,0,0,870,873,1,0,0,0,871,869,
	1,0,0,0,872,864,1,0,0,0,872,873,1,0,0,0,873,874,1,0,0,0,874,875,5,93,0,
	0,875,163,1,0,0,0,876,877,3,178,89,0,877,878,5,60,0,0,878,879,3,166,83,
	0,879,165,1,0,0,0,880,883,3,168,84,0,881,883,3,162,81,0,882,880,1,0,0,0,
	882,881,1,0,0,0,883,167,1,0,0,0,884,927,5,72,0,0,885,886,3,176,88,0,886,
	887,5,101,0,0,887,927,1,0,0,0,888,927,3,174,87,0,889,927,3,176,88,0,890,
	927,3,170,85,0,891,927,3,68,34,0,892,927,3,178,89,0,893,894,5,97,0,0,894,
	899,3,172,86,0,895,896,5,62,0,0,896,898,3,172,86,0,897,895,1,0,0,0,898,
	901,1,0,0,0,899,897,1,0,0,0,899,900,1,0,0,0,900,902,1,0,0,0,901,899,1,0,
	0,0,902,903,5,98,0,0,903,927,1,0,0,0,904,905,5,97,0,0,905,910,3,170,85,
	0,906,907,5,62,0,0,907,909,3,170,85,0,908,906,1,0,0,0,909,912,1,0,0,0,910,
	908,1,0,0,0,910,911,1,0,0,0,911,913,1,0,0,0,912,910,1,0,0,0,913,914,5,98,
	0,0,914,927,1,0,0,0,915,916,5,97,0,0,916,921,3,178,89,0,917,918,5,62,0,
	0,918,920,3,178,89,0,919,917,1,0,0,0,920,923,1,0,0,0,921,919,1,0,0,0,921,
	922,1,0,0,0,922,924,1,0,0,0,923,921,1,0,0,0,924,925,5,98,0,0,925,927,1,
	0,0,0,926,884,1,0,0,0,926,885,1,0,0,0,926,888,1,0,0,0,926,889,1,0,0,0,926,
	890,1,0,0,0,926,891,1,0,0,0,926,892,1,0,0,0,926,893,1,0,0,0,926,904,1,0,
	0,0,926,915,1,0,0,0,927,169,1,0,0,0,928,929,7,7,0,0,929,171,1,0,0,0,930,
	933,3,174,87,0,931,933,3,176,88,0,932,930,1,0,0,0,932,931,1,0,0,0,933,173,
	1,0,0,0,934,936,7,5,0,0,935,934,1,0,0,0,935,936,1,0,0,0,936,937,1,0,0,0,
	937,938,5,54,0,0,938,175,1,0,0,0,939,941,7,5,0,0,940,939,1,0,0,0,940,941,
	1,0,0,0,941,942,1,0,0,0,942,943,5,53,0,0,943,177,1,0,0,0,944,945,5,52,0,
	0,945,179,1,0,0,0,946,947,7,8,0,0,947,181,1,0,0,0,948,949,7,9,0,0,949,950,
	5,124,0,0,950,951,3,184,92,0,951,952,3,186,93,0,952,183,1,0,0,0,953,954,
	4,92,14,0,954,956,3,34,17,0,955,957,5,148,0,0,956,955,1,0,0,0,956,957,1,
	0,0,0,957,958,1,0,0,0,958,959,5,107,0,0,959,962,1,0,0,0,960,962,3,34,17,
	0,961,953,1,0,0,0,961,960,1,0,0,0,962,185,1,0,0,0,963,964,5,74,0,0,964,
	969,3,146,73,0,965,966,5,62,0,0,966,968,3,146,73,0,967,965,1,0,0,0,968,
	971,1,0,0,0,969,967,1,0,0,0,969,970,1,0,0,0,970,187,1,0,0,0,971,969,1,0,
	0,0,972,976,5,33,0,0,973,975,3,192,96,0,974,973,1,0,0,0,975,978,1,0,0,0,
	976,974,1,0,0,0,976,977,1,0,0,0,977,982,1,0,0,0,978,976,1,0,0,0,979,980,
	3,190,95,0,980,981,5,57,0,0,981,983,1,0,0,0,982,979,1,0,0,0,982,983,1,0,
	0,0,983,984,1,0,0,0,984,986,5,99,0,0,985,987,3,200,100,0,986,985,1,0,0,
	0,987,988,1,0,0,0,988,986,1,0,0,0,988,989,1,0,0,0,989,990,1,0,0,0,990,991,
	5,100,0,0,991,1005,1,0,0,0,992,996,5,33,0,0,993,995,3,192,96,0,994,993,
	1,0,0,0,995,998,1,0,0,0,996,994,1,0,0,0,996,997,1,0,0,0,997,1000,1,0,0,
	0,998,996,1,0,0,0,999,1001,3,200,100,0,1000,999,1,0,0,0,1001,1002,1,0,0,
	0,1002,1000,1,0,0,0,1002,1003,1,0,0,0,1003,1005,1,0,0,0,1004,972,1,0,0,
	0,1004,992,1,0,0,0,1005,189,1,0,0,0,1006,1007,7,1,0,0,1007,191,1,0,0,0,
	1008,1009,3,194,97,0,1009,1010,5,57,0,0,1010,1011,3,196,98,0,1011,193,1,
	0,0,0,1012,1013,7,10,0,0,1013,195,1,0,0,0,1014,1019,3,202,101,0,1015,1016,
	5,62,0,0,1016,1018,3,202,101,0,1017,1015,1,0,0,0,1018,1021,1,0,0,0,1019,
	1017,1,0,0,0,1019,1020,1,0,0,0,1020,1025,1,0,0,0,1021,1019,1,0,0,0,1022,
	1025,5,102,0,0,1023,1025,5,95,0,0,1024,1014,1,0,0,0,1024,1022,1,0,0,0,1024,
	1023,1,0,0,0,1025,197,1,0,0,0,1026,1027,7,11,0,0,1027,199,1,0,0,0,1028,
	1030,3,198,99,0,1029,1028,1,0,0,0,1030,1031,1,0,0,0,1031,1029,1,0,0,0,1031,
	1032,1,0,0,0,1032,1042,1,0,0,0,1033,1037,5,99,0,0,1034,1036,3,200,100,0,
	1035,1034,1,0,0,0,1036,1039,1,0,0,0,1037,1035,1,0,0,0,1037,1038,1,0,0,0,
	1038,1040,1,0,0,0,1039,1037,1,0,0,0,1040,1042,5,100,0,0,1041,1029,1,0,0,
	0,1041,1033,1,0,0,0,1042,201,1,0,0,0,1043,1044,3,204,102,0,1044,1045,5,
	60,0,0,1045,1046,3,208,104,0,1046,1053,1,0,0,0,1047,1048,3,208,104,0,1048,
	1049,5,59,0,0,1049,1050,3,206,103,0,1050,1053,1,0,0,0,1051,1053,3,210,105,
	0,1052,1043,1,0,0,0,1052,1047,1,0,0,0,1052,1051,1,0,0,0,1053,203,1,0,0,
	0,1054,1055,7,12,0,0,1055,205,1,0,0,0,1056,1057,7,12,0,0,1057,207,1,0,0,
	0,1058,1059,7,12,0,0,1059,209,1,0,0,0,1060,1061,7,13,0,0,1061,211,1,0,0,
	0,104,215,232,243,269,284,290,299,305,318,322,327,335,349,365,373,377,384,
	390,395,404,411,417,426,433,441,449,453,457,462,466,477,482,486,500,511,
	517,524,533,542,562,570,573,580,591,598,606,620,629,640,650,656,658,662,
	667,681,706,715,723,728,736,738,743,750,757,766,773,782,787,792,802,808,
	816,818,829,836,847,852,854,861,869,872,882,899,910,921,926,932,935,940,
	956,961,969,976,982,988,996,1002,1004,1019,1024,1031,1037,1041,1052];

	private static __ATN: ATN;
	public static get _ATN(): ATN {
		if (!esql_parser.__ATN) {
			esql_parser.__ATN = new ATNDeserializer().deserialize(esql_parser._serializedATN);
		}

		return esql_parser.__ATN;
	}


	static DecisionsToDFA = esql_parser._ATN.decisionToState.map( (ds: DecisionState, index: number) => new DFA(ds, index) );

}

export class StatementsContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public singleStatement(): SingleStatementContext {
		return this.getTypedRuleContext(SingleStatementContext, 0) as SingleStatementContext;
	}
	public EOF(): TerminalNode {
		return this.getToken(esql_parser.EOF, 0);
	}
	public setCommand_list(): SetCommandContext[] {
		return this.getTypedRuleContexts(SetCommandContext) as SetCommandContext[];
	}
	public setCommand(i: number): SetCommandContext {
		return this.getTypedRuleContext(SetCommandContext, i) as SetCommandContext;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_statements;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterStatements) {
	 		listener.enterStatements(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitStatements) {
	 		listener.exitStatements(this);
		}
	}
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
	public fromCommand(): FromCommandContext {
		return this.getTypedRuleContext(FromCommandContext, 0) as FromCommandContext;
	}
	public rowCommand(): RowCommandContext {
		return this.getTypedRuleContext(RowCommandContext, 0) as RowCommandContext;
	}
	public showCommand(): ShowCommandContext {
		return this.getTypedRuleContext(ShowCommandContext, 0) as ShowCommandContext;
	}
	public timeSeriesCommand(): TimeSeriesCommandContext {
		return this.getTypedRuleContext(TimeSeriesCommandContext, 0) as TimeSeriesCommandContext;
	}
	public explainCommand(): ExplainCommandContext {
		return this.getTypedRuleContext(ExplainCommandContext, 0) as ExplainCommandContext;
	}
	public promqlCommand(): PromqlCommandContext {
		return this.getTypedRuleContext(PromqlCommandContext, 0) as PromqlCommandContext;
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
	public whereCommand(): WhereCommandContext {
		return this.getTypedRuleContext(WhereCommandContext, 0) as WhereCommandContext;
	}
	public keepCommand(): KeepCommandContext {
		return this.getTypedRuleContext(KeepCommandContext, 0) as KeepCommandContext;
	}
	public limitCommand(): LimitCommandContext {
		return this.getTypedRuleContext(LimitCommandContext, 0) as LimitCommandContext;
	}
	public statsCommand(): StatsCommandContext {
		return this.getTypedRuleContext(StatsCommandContext, 0) as StatsCommandContext;
	}
	public sortCommand(): SortCommandContext {
		return this.getTypedRuleContext(SortCommandContext, 0) as SortCommandContext;
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
	public joinCommand(): JoinCommandContext {
		return this.getTypedRuleContext(JoinCommandContext, 0) as JoinCommandContext;
	}
	public changePointCommand(): ChangePointCommandContext {
		return this.getTypedRuleContext(ChangePointCommandContext, 0) as ChangePointCommandContext;
	}
	public completionCommand(): CompletionCommandContext {
		return this.getTypedRuleContext(CompletionCommandContext, 0) as CompletionCommandContext;
	}
	public sampleCommand(): SampleCommandContext {
		return this.getTypedRuleContext(SampleCommandContext, 0) as SampleCommandContext;
	}
	public forkCommand(): ForkCommandContext {
		return this.getTypedRuleContext(ForkCommandContext, 0) as ForkCommandContext;
	}
	public rerankCommand(): RerankCommandContext {
		return this.getTypedRuleContext(RerankCommandContext, 0) as RerankCommandContext;
	}
	public inlineStatsCommand(): InlineStatsCommandContext {
		return this.getTypedRuleContext(InlineStatsCommandContext, 0) as InlineStatsCommandContext;
	}
	public fuseCommand(): FuseCommandContext {
		return this.getTypedRuleContext(FuseCommandContext, 0) as FuseCommandContext;
	}
	public lookupCommand(): LookupCommandContext {
		return this.getTypedRuleContext(LookupCommandContext, 0) as LookupCommandContext;
	}
	public insistCommand(): InsistCommandContext {
		return this.getTypedRuleContext(InsistCommandContext, 0) as InsistCommandContext;
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


export class RerankFieldsContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public rerankField_list(): RerankFieldContext[] {
		return this.getTypedRuleContexts(RerankFieldContext) as RerankFieldContext[];
	}
	public rerankField(i: number): RerankFieldContext {
		return this.getTypedRuleContext(RerankFieldContext, i) as RerankFieldContext;
	}
	public COMMA_list(): TerminalNode[] {
	    	return this.getTokens(esql_parser.COMMA);
	}
	public COMMA(i: number): TerminalNode {
		return this.getToken(esql_parser.COMMA, i);
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_rerankFields;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterRerankFields) {
	 		listener.enterRerankFields(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitRerankFields) {
	 		listener.exitRerankFields(this);
		}
	}
}


export class RerankFieldContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public qualifiedName(): QualifiedNameContext {
		return this.getTypedRuleContext(QualifiedNameContext, 0) as QualifiedNameContext;
	}
	public ASSIGN(): TerminalNode {
		return this.getToken(esql_parser.ASSIGN, 0);
	}
	public booleanExpression(): BooleanExpressionContext {
		return this.getTypedRuleContext(BooleanExpressionContext, 0) as BooleanExpressionContext;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_rerankField;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterRerankField) {
	 		listener.enterRerankField(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitRerankField) {
	 		listener.exitRerankField(this);
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
	public indexPatternAndMetadataFields(): IndexPatternAndMetadataFieldsContext {
		return this.getTypedRuleContext(IndexPatternAndMetadataFieldsContext, 0) as IndexPatternAndMetadataFieldsContext;
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


export class TimeSeriesCommandContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public TS(): TerminalNode {
		return this.getToken(esql_parser.TS, 0);
	}
	public indexPatternAndMetadataFields(): IndexPatternAndMetadataFieldsContext {
		return this.getTypedRuleContext(IndexPatternAndMetadataFieldsContext, 0) as IndexPatternAndMetadataFieldsContext;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_timeSeriesCommand;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterTimeSeriesCommand) {
	 		listener.enterTimeSeriesCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitTimeSeriesCommand) {
	 		listener.exitTimeSeriesCommand(this);
		}
	}
}


export class IndexPatternAndMetadataFieldsContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public indexPatternOrSubquery_list(): IndexPatternOrSubqueryContext[] {
		return this.getTypedRuleContexts(IndexPatternOrSubqueryContext) as IndexPatternOrSubqueryContext[];
	}
	public indexPatternOrSubquery(i: number): IndexPatternOrSubqueryContext {
		return this.getTypedRuleContext(IndexPatternOrSubqueryContext, i) as IndexPatternOrSubqueryContext;
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
    	return esql_parser.RULE_indexPatternAndMetadataFields;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterIndexPatternAndMetadataFields) {
	 		listener.enterIndexPatternAndMetadataFields(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitIndexPatternAndMetadataFields) {
	 		listener.exitIndexPatternAndMetadataFields(this);
		}
	}
}


export class IndexPatternOrSubqueryContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public indexPattern(): IndexPatternContext {
		return this.getTypedRuleContext(IndexPatternContext, 0) as IndexPatternContext;
	}
	public subquery(): SubqueryContext {
		return this.getTypedRuleContext(SubqueryContext, 0) as SubqueryContext;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_indexPatternOrSubquery;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterIndexPatternOrSubquery) {
	 		listener.enterIndexPatternOrSubquery(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitIndexPatternOrSubquery) {
	 		listener.exitIndexPatternOrSubquery(this);
		}
	}
}


export class SubqueryContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public LP(): TerminalNode {
		return this.getToken(esql_parser.LP, 0);
	}
	public fromCommand(): FromCommandContext {
		return this.getTypedRuleContext(FromCommandContext, 0) as FromCommandContext;
	}
	public RP(): TerminalNode {
		return this.getToken(esql_parser.RP, 0);
	}
	public PIPE_list(): TerminalNode[] {
	    	return this.getTokens(esql_parser.PIPE);
	}
	public PIPE(i: number): TerminalNode {
		return this.getToken(esql_parser.PIPE, i);
	}
	public processingCommand_list(): ProcessingCommandContext[] {
		return this.getTypedRuleContexts(ProcessingCommandContext) as ProcessingCommandContext[];
	}
	public processingCommand(i: number): ProcessingCommandContext {
		return this.getTypedRuleContext(ProcessingCommandContext, i) as ProcessingCommandContext;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_subquery;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterSubquery) {
	 		listener.enterSubquery(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitSubquery) {
	 		listener.exitSubquery(this);
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
	public unquotedIndexString(): UnquotedIndexStringContext {
		return this.getTypedRuleContext(UnquotedIndexStringContext, 0) as UnquotedIndexStringContext;
	}
	public CAST_OP(): TerminalNode {
		return this.getToken(esql_parser.CAST_OP, 0);
	}
	public selectorString(): SelectorStringContext {
		return this.getTypedRuleContext(SelectorStringContext, 0) as SelectorStringContext;
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


export class SelectorStringContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public UNQUOTED_SOURCE(): TerminalNode {
		return this.getToken(esql_parser.UNQUOTED_SOURCE, 0);
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_selectorString;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterSelectorString) {
	 		listener.enterSelectorString(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitSelectorString) {
	 		listener.exitSelectorString(this);
		}
	}
}


export class UnquotedIndexStringContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public UNQUOTED_SOURCE(): TerminalNode {
		return this.getToken(esql_parser.UNQUOTED_SOURCE, 0);
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_unquotedIndexString;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterUnquotedIndexString) {
	 		listener.enterUnquotedIndexString(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitUnquotedIndexString) {
	 		listener.exitUnquotedIndexString(this);
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
	public _stats!: AggFieldsContext;
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
	public aggFields(): AggFieldsContext {
		return this.getTypedRuleContext(AggFieldsContext, 0) as AggFieldsContext;
	}
	public fields(): FieldsContext {
		return this.getTypedRuleContext(FieldsContext, 0) as FieldsContext;
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


export class AggFieldsContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public aggField_list(): AggFieldContext[] {
		return this.getTypedRuleContexts(AggFieldContext) as AggFieldContext[];
	}
	public aggField(i: number): AggFieldContext {
		return this.getTypedRuleContext(AggFieldContext, i) as AggFieldContext;
	}
	public COMMA_list(): TerminalNode[] {
	    	return this.getTokens(esql_parser.COMMA);
	}
	public COMMA(i: number): TerminalNode {
		return this.getToken(esql_parser.COMMA, i);
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_aggFields;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterAggFields) {
	 		listener.enterAggFields(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitAggFields) {
	 		listener.exitAggFields(this);
		}
	}
}


export class AggFieldContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public field(): FieldContext {
		return this.getTypedRuleContext(FieldContext, 0) as FieldContext;
	}
	public WHERE(): TerminalNode {
		return this.getToken(esql_parser.WHERE, 0);
	}
	public booleanExpression(): BooleanExpressionContext {
		return this.getTypedRuleContext(BooleanExpressionContext, 0) as BooleanExpressionContext;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_aggField;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterAggField) {
	 		listener.enterAggField(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitAggField) {
	 		listener.exitAggField(this);
		}
	}
}


export class QualifiedNameContext extends ParserRuleContext {
	public _qualifier!: Token;
	public _name!: FieldNameContext;
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public OPENING_BRACKET_list(): TerminalNode[] {
	    	return this.getTokens(esql_parser.OPENING_BRACKET);
	}
	public OPENING_BRACKET(i: number): TerminalNode {
		return this.getToken(esql_parser.OPENING_BRACKET, i);
	}
	public CLOSING_BRACKET_list(): TerminalNode[] {
	    	return this.getTokens(esql_parser.CLOSING_BRACKET);
	}
	public CLOSING_BRACKET(i: number): TerminalNode {
		return this.getToken(esql_parser.CLOSING_BRACKET, i);
	}
	public DOT(): TerminalNode {
		return this.getToken(esql_parser.DOT, 0);
	}
	public fieldName(): FieldNameContext {
		return this.getTypedRuleContext(FieldNameContext, 0) as FieldNameContext;
	}
	public UNQUOTED_IDENTIFIER(): TerminalNode {
		return this.getToken(esql_parser.UNQUOTED_IDENTIFIER, 0);
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


export class FieldNameContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public identifierOrParameter_list(): IdentifierOrParameterContext[] {
		return this.getTypedRuleContexts(IdentifierOrParameterContext) as IdentifierOrParameterContext[];
	}
	public identifierOrParameter(i: number): IdentifierOrParameterContext {
		return this.getTypedRuleContext(IdentifierOrParameterContext, i) as IdentifierOrParameterContext;
	}
	public DOT_list(): TerminalNode[] {
	    	return this.getTokens(esql_parser.DOT);
	}
	public DOT(i: number): TerminalNode {
		return this.getToken(esql_parser.DOT, i);
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_fieldName;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterFieldName) {
	 		listener.enterFieldName(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitFieldName) {
	 		listener.exitFieldName(this);
		}
	}
}


export class QualifiedNamePatternContext extends ParserRuleContext {
	public _qualifier!: Token;
	public _name!: FieldNamePatternContext;
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public OPENING_BRACKET_list(): TerminalNode[] {
	    	return this.getTokens(esql_parser.OPENING_BRACKET);
	}
	public OPENING_BRACKET(i: number): TerminalNode {
		return this.getToken(esql_parser.OPENING_BRACKET, i);
	}
	public CLOSING_BRACKET_list(): TerminalNode[] {
	    	return this.getTokens(esql_parser.CLOSING_BRACKET);
	}
	public CLOSING_BRACKET(i: number): TerminalNode {
		return this.getToken(esql_parser.CLOSING_BRACKET, i);
	}
	public DOT(): TerminalNode {
		return this.getToken(esql_parser.DOT, 0);
	}
	public fieldNamePattern(): FieldNamePatternContext {
		return this.getTypedRuleContext(FieldNamePatternContext, 0) as FieldNamePatternContext;
	}
	public ID_PATTERN(): TerminalNode {
		return this.getToken(esql_parser.ID_PATTERN, 0);
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


export class FieldNamePatternContext extends ParserRuleContext {
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
    	return esql_parser.RULE_fieldNamePattern;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterFieldNamePattern) {
	 		listener.enterFieldNamePattern(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitFieldNamePattern) {
	 		listener.exitFieldNamePattern(this);
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
	public parameter(): ParameterContext {
		return this.getTypedRuleContext(ParameterContext, 0) as ParameterContext;
	}
	public doubleParameter(): DoubleParameterContext {
		return this.getTypedRuleContext(DoubleParameterContext, 0) as DoubleParameterContext;
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


export class ParameterContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_parameter;
	}
	public override copyFrom(ctx: ParameterContext): void {
		super.copyFrom(ctx);
	}
}
export class InputNamedOrPositionalParamContext extends ParameterContext {
	constructor(parser: esql_parser, ctx: ParameterContext) {
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
export class InputParamContext extends ParameterContext {
	constructor(parser: esql_parser, ctx: ParameterContext) {
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


export class DoubleParameterContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_doubleParameter;
	}
	public override copyFrom(ctx: DoubleParameterContext): void {
		super.copyFrom(ctx);
	}
}
export class InputDoubleParamsContext extends DoubleParameterContext {
	constructor(parser: esql_parser, ctx: DoubleParameterContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public DOUBLE_PARAMS(): TerminalNode {
		return this.getToken(esql_parser.DOUBLE_PARAMS, 0);
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterInputDoubleParams) {
	 		listener.enterInputDoubleParams(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitInputDoubleParams) {
	 		listener.exitInputDoubleParams(this);
		}
	}
}
export class InputNamedOrPositionalDoubleParamsContext extends DoubleParameterContext {
	constructor(parser: esql_parser, ctx: DoubleParameterContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public NAMED_OR_POSITIONAL_DOUBLE_PARAMS(): TerminalNode {
		return this.getToken(esql_parser.NAMED_OR_POSITIONAL_DOUBLE_PARAMS, 0);
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterInputNamedOrPositionalDoubleParams) {
	 		listener.enterInputNamedOrPositionalDoubleParams(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitInputNamedOrPositionalDoubleParams) {
	 		listener.exitInputNamedOrPositionalDoubleParams(this);
		}
	}
}


export class IdentifierOrParameterContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public identifier(): IdentifierContext {
		return this.getTypedRuleContext(IdentifierContext, 0) as IdentifierContext;
	}
	public parameter(): ParameterContext {
		return this.getTypedRuleContext(ParameterContext, 0) as ParameterContext;
	}
	public doubleParameter(): DoubleParameterContext {
		return this.getTypedRuleContext(DoubleParameterContext, 0) as DoubleParameterContext;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_identifierOrParameter;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterIdentifierOrParameter) {
	 		listener.enterIdentifierOrParameter(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitIdentifierOrParameter) {
	 		listener.exitIdentifierOrParameter(this);
		}
	}
}


export class StringOrParameterContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public string_(): StringContext {
		return this.getTypedRuleContext(StringContext, 0) as StringContext;
	}
	public parameter(): ParameterContext {
		return this.getTypedRuleContext(ParameterContext, 0) as ParameterContext;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_stringOrParameter;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterStringOrParameter) {
	 		listener.enterStringOrParameter(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitStringOrParameter) {
	 		listener.exitStringOrParameter(this);
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
	public constant(): ConstantContext {
		return this.getTypedRuleContext(ConstantContext, 0) as ConstantContext;
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
	public ASSIGN(): TerminalNode {
		return this.getToken(esql_parser.ASSIGN, 0);
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
	public dissectCommandOptions(): DissectCommandOptionsContext {
		return this.getTypedRuleContext(DissectCommandOptionsContext, 0) as DissectCommandOptionsContext;
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


export class DissectCommandOptionsContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public dissectCommandOption_list(): DissectCommandOptionContext[] {
		return this.getTypedRuleContexts(DissectCommandOptionContext) as DissectCommandOptionContext[];
	}
	public dissectCommandOption(i: number): DissectCommandOptionContext {
		return this.getTypedRuleContext(DissectCommandOptionContext, i) as DissectCommandOptionContext;
	}
	public COMMA_list(): TerminalNode[] {
	    	return this.getTokens(esql_parser.COMMA);
	}
	public COMMA(i: number): TerminalNode {
		return this.getToken(esql_parser.COMMA, i);
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_dissectCommandOptions;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterDissectCommandOptions) {
	 		listener.enterDissectCommandOptions(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitDissectCommandOptions) {
	 		listener.exitDissectCommandOptions(this);
		}
	}
}


export class DissectCommandOptionContext extends ParserRuleContext {
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
    	return esql_parser.RULE_dissectCommandOption;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterDissectCommandOption) {
	 		listener.enterDissectCommandOption(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitDissectCommandOption) {
	 		listener.exitDissectCommandOption(this);
		}
	}
}


export class CommandNamedParametersContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public WITH(): TerminalNode {
		return this.getToken(esql_parser.WITH, 0);
	}
	public mapExpression(): MapExpressionContext {
		return this.getTypedRuleContext(MapExpressionContext, 0) as MapExpressionContext;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_commandNamedParameters;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterCommandNamedParameters) {
	 		listener.enterCommandNamedParameters(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitCommandNamedParameters) {
	 		listener.exitCommandNamedParameters(this);
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
	public string__list(): StringContext[] {
		return this.getTypedRuleContexts(StringContext) as StringContext[];
	}
	public string_(i: number): StringContext {
		return this.getTypedRuleContext(StringContext, i) as StringContext;
	}
	public COMMA_list(): TerminalNode[] {
	    	return this.getTokens(esql_parser.COMMA);
	}
	public COMMA(i: number): TerminalNode {
		return this.getToken(esql_parser.COMMA, i);
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


export class ExplainCommandContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public DEV_EXPLAIN(): TerminalNode {
		return this.getToken(esql_parser.DEV_EXPLAIN, 0);
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
	public LP(): TerminalNode {
		return this.getToken(esql_parser.LP, 0);
	}
	public query(): QueryContext {
		return this.getTypedRuleContext(QueryContext, 0) as QueryContext;
	}
	public RP(): TerminalNode {
		return this.getToken(esql_parser.RP, 0);
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


export class EnrichCommandContext extends ParserRuleContext {
	public _policyName!: EnrichPolicyNameContext;
	public _matchField!: QualifiedNamePatternContext;
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public ENRICH(): TerminalNode {
		return this.getToken(esql_parser.ENRICH, 0);
	}
	public enrichPolicyName(): EnrichPolicyNameContext {
		return this.getTypedRuleContext(EnrichPolicyNameContext, 0) as EnrichPolicyNameContext;
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


export class EnrichPolicyNameContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public ENRICH_POLICY_NAME(): TerminalNode {
		return this.getToken(esql_parser.ENRICH_POLICY_NAME, 0);
	}
	public QUOTED_STRING(): TerminalNode {
		return this.getToken(esql_parser.QUOTED_STRING, 0);
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_enrichPolicyName;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterEnrichPolicyName) {
	 		listener.enterEnrichPolicyName(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitEnrichPolicyName) {
	 		listener.exitEnrichPolicyName(this);
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


export class SampleCommandContext extends ParserRuleContext {
	public _probability!: ConstantContext;
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public SAMPLE(): TerminalNode {
		return this.getToken(esql_parser.SAMPLE, 0);
	}
	public constant(): ConstantContext {
		return this.getTypedRuleContext(ConstantContext, 0) as ConstantContext;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_sampleCommand;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterSampleCommand) {
	 		listener.enterSampleCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitSampleCommand) {
	 		listener.exitSampleCommand(this);
		}
	}
}


export class ChangePointCommandContext extends ParserRuleContext {
	public _value!: QualifiedNameContext;
	public _key!: QualifiedNameContext;
	public _targetType!: QualifiedNameContext;
	public _targetPvalue!: QualifiedNameContext;
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public CHANGE_POINT(): TerminalNode {
		return this.getToken(esql_parser.CHANGE_POINT, 0);
	}
	public qualifiedName_list(): QualifiedNameContext[] {
		return this.getTypedRuleContexts(QualifiedNameContext) as QualifiedNameContext[];
	}
	public qualifiedName(i: number): QualifiedNameContext {
		return this.getTypedRuleContext(QualifiedNameContext, i) as QualifiedNameContext;
	}
	public ON(): TerminalNode {
		return this.getToken(esql_parser.ON, 0);
	}
	public AS(): TerminalNode {
		return this.getToken(esql_parser.AS, 0);
	}
	public COMMA(): TerminalNode {
		return this.getToken(esql_parser.COMMA, 0);
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_changePointCommand;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterChangePointCommand) {
	 		listener.enterChangePointCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitChangePointCommand) {
	 		listener.exitChangePointCommand(this);
		}
	}
}


export class ForkCommandContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public FORK(): TerminalNode {
		return this.getToken(esql_parser.FORK, 0);
	}
	public forkSubQueries(): ForkSubQueriesContext {
		return this.getTypedRuleContext(ForkSubQueriesContext, 0) as ForkSubQueriesContext;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_forkCommand;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterForkCommand) {
	 		listener.enterForkCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitForkCommand) {
	 		listener.exitForkCommand(this);
		}
	}
}


export class ForkSubQueriesContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public forkSubQuery_list(): ForkSubQueryContext[] {
		return this.getTypedRuleContexts(ForkSubQueryContext) as ForkSubQueryContext[];
	}
	public forkSubQuery(i: number): ForkSubQueryContext {
		return this.getTypedRuleContext(ForkSubQueryContext, i) as ForkSubQueryContext;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_forkSubQueries;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterForkSubQueries) {
	 		listener.enterForkSubQueries(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitForkSubQueries) {
	 		listener.exitForkSubQueries(this);
		}
	}
}


export class ForkSubQueryContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public LP(): TerminalNode {
		return this.getToken(esql_parser.LP, 0);
	}
	public forkSubQueryCommand(): ForkSubQueryCommandContext {
		return this.getTypedRuleContext(ForkSubQueryCommandContext, 0) as ForkSubQueryCommandContext;
	}
	public RP(): TerminalNode {
		return this.getToken(esql_parser.RP, 0);
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_forkSubQuery;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterForkSubQuery) {
	 		listener.enterForkSubQuery(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitForkSubQuery) {
	 		listener.exitForkSubQuery(this);
		}
	}
}


export class ForkSubQueryCommandContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_forkSubQueryCommand;
	}
	public override copyFrom(ctx: ForkSubQueryCommandContext): void {
		super.copyFrom(ctx);
	}
}
export class SingleForkSubQueryCommandContext extends ForkSubQueryCommandContext {
	constructor(parser: esql_parser, ctx: ForkSubQueryCommandContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public forkSubQueryProcessingCommand(): ForkSubQueryProcessingCommandContext {
		return this.getTypedRuleContext(ForkSubQueryProcessingCommandContext, 0) as ForkSubQueryProcessingCommandContext;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterSingleForkSubQueryCommand) {
	 		listener.enterSingleForkSubQueryCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitSingleForkSubQueryCommand) {
	 		listener.exitSingleForkSubQueryCommand(this);
		}
	}
}
export class CompositeForkSubQueryContext extends ForkSubQueryCommandContext {
	constructor(parser: esql_parser, ctx: ForkSubQueryCommandContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public forkSubQueryCommand(): ForkSubQueryCommandContext {
		return this.getTypedRuleContext(ForkSubQueryCommandContext, 0) as ForkSubQueryCommandContext;
	}
	public PIPE(): TerminalNode {
		return this.getToken(esql_parser.PIPE, 0);
	}
	public forkSubQueryProcessingCommand(): ForkSubQueryProcessingCommandContext {
		return this.getTypedRuleContext(ForkSubQueryProcessingCommandContext, 0) as ForkSubQueryProcessingCommandContext;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterCompositeForkSubQuery) {
	 		listener.enterCompositeForkSubQuery(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitCompositeForkSubQuery) {
	 		listener.exitCompositeForkSubQuery(this);
		}
	}
}


export class ForkSubQueryProcessingCommandContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public processingCommand(): ProcessingCommandContext {
		return this.getTypedRuleContext(ProcessingCommandContext, 0) as ProcessingCommandContext;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_forkSubQueryProcessingCommand;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterForkSubQueryProcessingCommand) {
	 		listener.enterForkSubQueryProcessingCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitForkSubQueryProcessingCommand) {
	 		listener.exitForkSubQueryProcessingCommand(this);
		}
	}
}


export class RerankCommandContext extends ParserRuleContext {
	public _targetField!: QualifiedNameContext;
	public _queryText!: ConstantContext;
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public RERANK(): TerminalNode {
		return this.getToken(esql_parser.RERANK, 0);
	}
	public ON(): TerminalNode {
		return this.getToken(esql_parser.ON, 0);
	}
	public rerankFields(): RerankFieldsContext {
		return this.getTypedRuleContext(RerankFieldsContext, 0) as RerankFieldsContext;
	}
	public commandNamedParameters(): CommandNamedParametersContext {
		return this.getTypedRuleContext(CommandNamedParametersContext, 0) as CommandNamedParametersContext;
	}
	public constant(): ConstantContext {
		return this.getTypedRuleContext(ConstantContext, 0) as ConstantContext;
	}
	public ASSIGN(): TerminalNode {
		return this.getToken(esql_parser.ASSIGN, 0);
	}
	public qualifiedName(): QualifiedNameContext {
		return this.getTypedRuleContext(QualifiedNameContext, 0) as QualifiedNameContext;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_rerankCommand;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterRerankCommand) {
	 		listener.enterRerankCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitRerankCommand) {
	 		listener.exitRerankCommand(this);
		}
	}
}


export class CompletionCommandContext extends ParserRuleContext {
	public _targetField!: QualifiedNameContext;
	public _prompt!: PrimaryExpressionContext;
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public COMPLETION(): TerminalNode {
		return this.getToken(esql_parser.COMPLETION, 0);
	}
	public commandNamedParameters(): CommandNamedParametersContext {
		return this.getTypedRuleContext(CommandNamedParametersContext, 0) as CommandNamedParametersContext;
	}
	public primaryExpression(): PrimaryExpressionContext {
		return this.getTypedRuleContext(PrimaryExpressionContext, 0) as PrimaryExpressionContext;
	}
	public ASSIGN(): TerminalNode {
		return this.getToken(esql_parser.ASSIGN, 0);
	}
	public qualifiedName(): QualifiedNameContext {
		return this.getTypedRuleContext(QualifiedNameContext, 0) as QualifiedNameContext;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_completionCommand;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterCompletionCommand) {
	 		listener.enterCompletionCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitCompletionCommand) {
	 		listener.exitCompletionCommand(this);
		}
	}
}


export class InlineStatsCommandContext extends ParserRuleContext {
	public _stats!: AggFieldsContext;
	public _grouping!: FieldsContext;
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public INLINE(): TerminalNode {
		return this.getToken(esql_parser.INLINE, 0);
	}
	public INLINE_STATS(): TerminalNode {
		return this.getToken(esql_parser.INLINE_STATS, 0);
	}
	public aggFields(): AggFieldsContext {
		return this.getTypedRuleContext(AggFieldsContext, 0) as AggFieldsContext;
	}
	public BY(): TerminalNode {
		return this.getToken(esql_parser.BY, 0);
	}
	public fields(): FieldsContext {
		return this.getTypedRuleContext(FieldsContext, 0) as FieldsContext;
	}
	public INLINESTATS(): TerminalNode {
		return this.getToken(esql_parser.INLINESTATS, 0);
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_inlineStatsCommand;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterInlineStatsCommand) {
	 		listener.enterInlineStatsCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitInlineStatsCommand) {
	 		listener.exitInlineStatsCommand(this);
		}
	}
}


export class FuseCommandContext extends ParserRuleContext {
	public _fuseType!: IdentifierContext;
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public FUSE(): TerminalNode {
		return this.getToken(esql_parser.FUSE, 0);
	}
	public fuseConfiguration_list(): FuseConfigurationContext[] {
		return this.getTypedRuleContexts(FuseConfigurationContext) as FuseConfigurationContext[];
	}
	public fuseConfiguration(i: number): FuseConfigurationContext {
		return this.getTypedRuleContext(FuseConfigurationContext, i) as FuseConfigurationContext;
	}
	public identifier(): IdentifierContext {
		return this.getTypedRuleContext(IdentifierContext, 0) as IdentifierContext;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_fuseCommand;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterFuseCommand) {
	 		listener.enterFuseCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitFuseCommand) {
	 		listener.exitFuseCommand(this);
		}
	}
}


export class FuseConfigurationContext extends ParserRuleContext {
	public _score!: QualifiedNameContext;
	public _key!: FieldsContext;
	public _group!: QualifiedNameContext;
	public _options!: MapExpressionContext;
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public SCORE(): TerminalNode {
		return this.getToken(esql_parser.SCORE, 0);
	}
	public BY(): TerminalNode {
		return this.getToken(esql_parser.BY, 0);
	}
	public qualifiedName(): QualifiedNameContext {
		return this.getTypedRuleContext(QualifiedNameContext, 0) as QualifiedNameContext;
	}
	public KEY(): TerminalNode {
		return this.getToken(esql_parser.KEY, 0);
	}
	public fields(): FieldsContext {
		return this.getTypedRuleContext(FieldsContext, 0) as FieldsContext;
	}
	public GROUP(): TerminalNode {
		return this.getToken(esql_parser.GROUP, 0);
	}
	public WITH(): TerminalNode {
		return this.getToken(esql_parser.WITH, 0);
	}
	public mapExpression(): MapExpressionContext {
		return this.getTypedRuleContext(MapExpressionContext, 0) as MapExpressionContext;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_fuseConfiguration;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterFuseConfiguration) {
	 		listener.enterFuseConfiguration(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitFuseConfiguration) {
	 		listener.exitFuseConfiguration(this);
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
	public DEV_LOOKUP(): TerminalNode {
		return this.getToken(esql_parser.DEV_LOOKUP, 0);
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


export class InsistCommandContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public DEV_INSIST(): TerminalNode {
		return this.getToken(esql_parser.DEV_INSIST, 0);
	}
	public qualifiedNamePatterns(): QualifiedNamePatternsContext {
		return this.getTypedRuleContext(QualifiedNamePatternsContext, 0) as QualifiedNamePatternsContext;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_insistCommand;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterInsistCommand) {
	 		listener.enterInsistCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitInsistCommand) {
	 		listener.exitInsistCommand(this);
		}
	}
}


export class SetCommandContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public SET(): TerminalNode {
		return this.getToken(esql_parser.SET, 0);
	}
	public setField(): SetFieldContext {
		return this.getTypedRuleContext(SetFieldContext, 0) as SetFieldContext;
	}
	public SEMICOLON(): TerminalNode {
		return this.getToken(esql_parser.SEMICOLON, 0);
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_setCommand;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterSetCommand) {
	 		listener.enterSetCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitSetCommand) {
	 		listener.exitSetCommand(this);
		}
	}
}


export class SetFieldContext extends ParserRuleContext {
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
    	return esql_parser.RULE_setField;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterSetField) {
	 		listener.enterSetField(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitSetField) {
	 		listener.exitSetField(this);
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
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_regexBooleanExpression;
	}
	public override copyFrom(ctx: RegexBooleanExpressionContext): void {
		super.copyFrom(ctx);
	}
}
export class LikeExpressionContext extends RegexBooleanExpressionContext {
	constructor(parser: esql_parser, ctx: RegexBooleanExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public valueExpression(): ValueExpressionContext {
		return this.getTypedRuleContext(ValueExpressionContext, 0) as ValueExpressionContext;
	}
	public LIKE(): TerminalNode {
		return this.getToken(esql_parser.LIKE, 0);
	}
	public stringOrParameter(): StringOrParameterContext {
		return this.getTypedRuleContext(StringOrParameterContext, 0) as StringOrParameterContext;
	}
	public NOT(): TerminalNode {
		return this.getToken(esql_parser.NOT, 0);
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterLikeExpression) {
	 		listener.enterLikeExpression(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitLikeExpression) {
	 		listener.exitLikeExpression(this);
		}
	}
}
export class LikeListExpressionContext extends RegexBooleanExpressionContext {
	constructor(parser: esql_parser, ctx: RegexBooleanExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public valueExpression(): ValueExpressionContext {
		return this.getTypedRuleContext(ValueExpressionContext, 0) as ValueExpressionContext;
	}
	public LIKE(): TerminalNode {
		return this.getToken(esql_parser.LIKE, 0);
	}
	public LP(): TerminalNode {
		return this.getToken(esql_parser.LP, 0);
	}
	public stringOrParameter_list(): StringOrParameterContext[] {
		return this.getTypedRuleContexts(StringOrParameterContext) as StringOrParameterContext[];
	}
	public stringOrParameter(i: number): StringOrParameterContext {
		return this.getTypedRuleContext(StringOrParameterContext, i) as StringOrParameterContext;
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
	    if(listener.enterLikeListExpression) {
	 		listener.enterLikeListExpression(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitLikeListExpression) {
	 		listener.exitLikeListExpression(this);
		}
	}
}
export class RlikeExpressionContext extends RegexBooleanExpressionContext {
	constructor(parser: esql_parser, ctx: RegexBooleanExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public valueExpression(): ValueExpressionContext {
		return this.getTypedRuleContext(ValueExpressionContext, 0) as ValueExpressionContext;
	}
	public RLIKE(): TerminalNode {
		return this.getToken(esql_parser.RLIKE, 0);
	}
	public stringOrParameter(): StringOrParameterContext {
		return this.getTypedRuleContext(StringOrParameterContext, 0) as StringOrParameterContext;
	}
	public NOT(): TerminalNode {
		return this.getToken(esql_parser.NOT, 0);
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterRlikeExpression) {
	 		listener.enterRlikeExpression(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitRlikeExpression) {
	 		listener.exitRlikeExpression(this);
		}
	}
}
export class RlikeListExpressionContext extends RegexBooleanExpressionContext {
	constructor(parser: esql_parser, ctx: RegexBooleanExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public valueExpression(): ValueExpressionContext {
		return this.getTypedRuleContext(ValueExpressionContext, 0) as ValueExpressionContext;
	}
	public RLIKE(): TerminalNode {
		return this.getToken(esql_parser.RLIKE, 0);
	}
	public LP(): TerminalNode {
		return this.getToken(esql_parser.LP, 0);
	}
	public stringOrParameter_list(): StringOrParameterContext[] {
		return this.getTypedRuleContexts(StringOrParameterContext) as StringOrParameterContext[];
	}
	public stringOrParameter(i: number): StringOrParameterContext {
		return this.getTypedRuleContext(StringOrParameterContext, i) as StringOrParameterContext;
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
	    if(listener.enterRlikeListExpression) {
	 		listener.enterRlikeListExpression(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitRlikeListExpression) {
	 		listener.exitRlikeListExpression(this);
		}
	}
}


export class MatchBooleanExpressionContext extends ParserRuleContext {
	public _fieldExp!: QualifiedNameContext;
	public _fieldType!: DataTypeContext;
	public _matchQuery!: ConstantContext;
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public COLON(): TerminalNode {
		return this.getToken(esql_parser.COLON, 0);
	}
	public qualifiedName(): QualifiedNameContext {
		return this.getTypedRuleContext(QualifiedNameContext, 0) as QualifiedNameContext;
	}
	public constant(): ConstantContext {
		return this.getTypedRuleContext(ConstantContext, 0) as ConstantContext;
	}
	public CAST_OP(): TerminalNode {
		return this.getToken(esql_parser.CAST_OP, 0);
	}
	public dataType(): DataTypeContext {
		return this.getTypedRuleContext(DataTypeContext, 0) as DataTypeContext;
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
	public functionName(): FunctionNameContext {
		return this.getTypedRuleContext(FunctionNameContext, 0) as FunctionNameContext;
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
	public mapExpression(): MapExpressionContext {
		return this.getTypedRuleContext(MapExpressionContext, 0) as MapExpressionContext;
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


export class FunctionNameContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public identifierOrParameter(): IdentifierOrParameterContext {
		return this.getTypedRuleContext(IdentifierOrParameterContext, 0) as IdentifierOrParameterContext;
	}
	public FIRST(): TerminalNode {
		return this.getToken(esql_parser.FIRST, 0);
	}
	public LAST(): TerminalNode {
		return this.getToken(esql_parser.LAST, 0);
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_functionName;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterFunctionName) {
	 		listener.enterFunctionName(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitFunctionName) {
	 		listener.exitFunctionName(this);
		}
	}
}


export class MapExpressionContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public LEFT_BRACES(): TerminalNode {
		return this.getToken(esql_parser.LEFT_BRACES, 0);
	}
	public RIGHT_BRACES(): TerminalNode {
		return this.getToken(esql_parser.RIGHT_BRACES, 0);
	}
	public entryExpression_list(): EntryExpressionContext[] {
		return this.getTypedRuleContexts(EntryExpressionContext) as EntryExpressionContext[];
	}
	public entryExpression(i: number): EntryExpressionContext {
		return this.getTypedRuleContext(EntryExpressionContext, i) as EntryExpressionContext;
	}
	public COMMA_list(): TerminalNode[] {
	    	return this.getTokens(esql_parser.COMMA);
	}
	public COMMA(i: number): TerminalNode {
		return this.getToken(esql_parser.COMMA, i);
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_mapExpression;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterMapExpression) {
	 		listener.enterMapExpression(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitMapExpression) {
	 		listener.exitMapExpression(this);
		}
	}
}


export class EntryExpressionContext extends ParserRuleContext {
	public _key!: StringContext;
	public _value!: MapValueContext;
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public COLON(): TerminalNode {
		return this.getToken(esql_parser.COLON, 0);
	}
	public string_(): StringContext {
		return this.getTypedRuleContext(StringContext, 0) as StringContext;
	}
	public mapValue(): MapValueContext {
		return this.getTypedRuleContext(MapValueContext, 0) as MapValueContext;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_entryExpression;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterEntryExpression) {
	 		listener.enterEntryExpression(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitEntryExpression) {
	 		listener.exitEntryExpression(this);
		}
	}
}


export class MapValueContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public constant(): ConstantContext {
		return this.getTypedRuleContext(ConstantContext, 0) as ConstantContext;
	}
	public mapExpression(): MapExpressionContext {
		return this.getTypedRuleContext(MapExpressionContext, 0) as MapExpressionContext;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_mapValue;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterMapValue) {
	 		listener.enterMapValue(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitMapValue) {
	 		listener.exitMapValue(this);
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
export class InputParameterContext extends ConstantContext {
	constructor(parser: esql_parser, ctx: ConstantContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public parameter(): ParameterContext {
		return this.getTypedRuleContext(ParameterContext, 0) as ParameterContext;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterInputParameter) {
	 		listener.enterInputParameter(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitInputParameter) {
	 		listener.exitInputParameter(this);
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


export class JoinCommandContext extends ParserRuleContext {
	public _type_!: Token;
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public JOIN(): TerminalNode {
		return this.getToken(esql_parser.JOIN, 0);
	}
	public joinTarget(): JoinTargetContext {
		return this.getTypedRuleContext(JoinTargetContext, 0) as JoinTargetContext;
	}
	public joinCondition(): JoinConditionContext {
		return this.getTypedRuleContext(JoinConditionContext, 0) as JoinConditionContext;
	}
	public JOIN_LOOKUP(): TerminalNode {
		return this.getToken(esql_parser.JOIN_LOOKUP, 0);
	}
	public DEV_JOIN_LEFT(): TerminalNode {
		return this.getToken(esql_parser.DEV_JOIN_LEFT, 0);
	}
	public DEV_JOIN_RIGHT(): TerminalNode {
		return this.getToken(esql_parser.DEV_JOIN_RIGHT, 0);
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_joinCommand;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterJoinCommand) {
	 		listener.enterJoinCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitJoinCommand) {
	 		listener.exitJoinCommand(this);
		}
	}
}


export class JoinTargetContext extends ParserRuleContext {
	public _index!: IndexPatternContext;
	public _qualifier!: Token;
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public indexPattern(): IndexPatternContext {
		return this.getTypedRuleContext(IndexPatternContext, 0) as IndexPatternContext;
	}
	public UNQUOTED_SOURCE(): TerminalNode {
		return this.getToken(esql_parser.UNQUOTED_SOURCE, 0);
	}
	public AS(): TerminalNode {
		return this.getToken(esql_parser.AS, 0);
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_joinTarget;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterJoinTarget) {
	 		listener.enterJoinTarget(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitJoinTarget) {
	 		listener.exitJoinTarget(this);
		}
	}
}


export class JoinConditionContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public ON(): TerminalNode {
		return this.getToken(esql_parser.ON, 0);
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
    	return esql_parser.RULE_joinCondition;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterJoinCondition) {
	 		listener.enterJoinCondition(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitJoinCondition) {
	 		listener.exitJoinCondition(this);
		}
	}
}


export class PromqlCommandContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public DEV_PROMQL(): TerminalNode {
		return this.getToken(esql_parser.DEV_PROMQL, 0);
	}
	public LP(): TerminalNode {
		return this.getToken(esql_parser.LP, 0);
	}
	public RP(): TerminalNode {
		return this.getToken(esql_parser.RP, 0);
	}
	public promqlParam_list(): PromqlParamContext[] {
		return this.getTypedRuleContexts(PromqlParamContext) as PromqlParamContext[];
	}
	public promqlParam(i: number): PromqlParamContext {
		return this.getTypedRuleContext(PromqlParamContext, i) as PromqlParamContext;
	}
	public valueName(): ValueNameContext {
		return this.getTypedRuleContext(ValueNameContext, 0) as ValueNameContext;
	}
	public ASSIGN(): TerminalNode {
		return this.getToken(esql_parser.ASSIGN, 0);
	}
	public promqlQueryPart_list(): PromqlQueryPartContext[] {
		return this.getTypedRuleContexts(PromqlQueryPartContext) as PromqlQueryPartContext[];
	}
	public promqlQueryPart(i: number): PromqlQueryPartContext {
		return this.getTypedRuleContext(PromqlQueryPartContext, i) as PromqlQueryPartContext;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_promqlCommand;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterPromqlCommand) {
	 		listener.enterPromqlCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitPromqlCommand) {
	 		listener.exitPromqlCommand(this);
		}
	}
}


export class ValueNameContext extends ParserRuleContext {
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
    	return esql_parser.RULE_valueName;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterValueName) {
	 		listener.enterValueName(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitValueName) {
	 		listener.exitValueName(this);
		}
	}
}


export class PromqlParamContext extends ParserRuleContext {
	public _name!: PromqlParamNameContext;
	public _value!: PromqlParamValueContext;
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public ASSIGN(): TerminalNode {
		return this.getToken(esql_parser.ASSIGN, 0);
	}
	public promqlParamName(): PromqlParamNameContext {
		return this.getTypedRuleContext(PromqlParamNameContext, 0) as PromqlParamNameContext;
	}
	public promqlParamValue(): PromqlParamValueContext {
		return this.getTypedRuleContext(PromqlParamValueContext, 0) as PromqlParamValueContext;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_promqlParam;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterPromqlParam) {
	 		listener.enterPromqlParam(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitPromqlParam) {
	 		listener.exitPromqlParam(this);
		}
	}
}


export class PromqlParamNameContext extends ParserRuleContext {
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
	public QUOTED_STRING(): TerminalNode {
		return this.getToken(esql_parser.QUOTED_STRING, 0);
	}
	public NAMED_OR_POSITIONAL_PARAM(): TerminalNode {
		return this.getToken(esql_parser.NAMED_OR_POSITIONAL_PARAM, 0);
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_promqlParamName;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterPromqlParamName) {
	 		listener.enterPromqlParamName(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitPromqlParamName) {
	 		listener.exitPromqlParamName(this);
		}
	}
}


export class PromqlParamValueContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public promqlIndexPattern_list(): PromqlIndexPatternContext[] {
		return this.getTypedRuleContexts(PromqlIndexPatternContext) as PromqlIndexPatternContext[];
	}
	public promqlIndexPattern(i: number): PromqlIndexPatternContext {
		return this.getTypedRuleContext(PromqlIndexPatternContext, i) as PromqlIndexPatternContext;
	}
	public COMMA_list(): TerminalNode[] {
	    	return this.getTokens(esql_parser.COMMA);
	}
	public COMMA(i: number): TerminalNode {
		return this.getToken(esql_parser.COMMA, i);
	}
	public QUOTED_IDENTIFIER(): TerminalNode {
		return this.getToken(esql_parser.QUOTED_IDENTIFIER, 0);
	}
	public NAMED_OR_POSITIONAL_PARAM(): TerminalNode {
		return this.getToken(esql_parser.NAMED_OR_POSITIONAL_PARAM, 0);
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_promqlParamValue;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterPromqlParamValue) {
	 		listener.enterPromqlParamValue(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitPromqlParamValue) {
	 		listener.exitPromqlParamValue(this);
		}
	}
}


export class PromqlQueryContentContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public UNQUOTED_SOURCE(): TerminalNode {
		return this.getToken(esql_parser.UNQUOTED_SOURCE, 0);
	}
	public UNQUOTED_IDENTIFIER(): TerminalNode {
		return this.getToken(esql_parser.UNQUOTED_IDENTIFIER, 0);
	}
	public QUOTED_STRING(): TerminalNode {
		return this.getToken(esql_parser.QUOTED_STRING, 0);
	}
	public QUOTED_IDENTIFIER(): TerminalNode {
		return this.getToken(esql_parser.QUOTED_IDENTIFIER, 0);
	}
	public NAMED_OR_POSITIONAL_PARAM(): TerminalNode {
		return this.getToken(esql_parser.NAMED_OR_POSITIONAL_PARAM, 0);
	}
	public PROMQL_QUERY_COMMENT(): TerminalNode {
		return this.getToken(esql_parser.PROMQL_QUERY_COMMENT, 0);
	}
	public PROMQL_SINGLE_QUOTED_STRING(): TerminalNode {
		return this.getToken(esql_parser.PROMQL_SINGLE_QUOTED_STRING, 0);
	}
	public ASSIGN(): TerminalNode {
		return this.getToken(esql_parser.ASSIGN, 0);
	}
	public COMMA(): TerminalNode {
		return this.getToken(esql_parser.COMMA, 0);
	}
	public COLON(): TerminalNode {
		return this.getToken(esql_parser.COLON, 0);
	}
	public CAST_OP(): TerminalNode {
		return this.getToken(esql_parser.CAST_OP, 0);
	}
	public PROMQL_OTHER_QUERY_CONTENT(): TerminalNode {
		return this.getToken(esql_parser.PROMQL_OTHER_QUERY_CONTENT, 0);
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_promqlQueryContent;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterPromqlQueryContent) {
	 		listener.enterPromqlQueryContent(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitPromqlQueryContent) {
	 		listener.exitPromqlQueryContent(this);
		}
	}
}


export class PromqlQueryPartContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public promqlQueryContent_list(): PromqlQueryContentContext[] {
		return this.getTypedRuleContexts(PromqlQueryContentContext) as PromqlQueryContentContext[];
	}
	public promqlQueryContent(i: number): PromqlQueryContentContext {
		return this.getTypedRuleContext(PromqlQueryContentContext, i) as PromqlQueryContentContext;
	}
	public LP(): TerminalNode {
		return this.getToken(esql_parser.LP, 0);
	}
	public RP(): TerminalNode {
		return this.getToken(esql_parser.RP, 0);
	}
	public promqlQueryPart_list(): PromqlQueryPartContext[] {
		return this.getTypedRuleContexts(PromqlQueryPartContext) as PromqlQueryPartContext[];
	}
	public promqlQueryPart(i: number): PromqlQueryPartContext {
		return this.getTypedRuleContext(PromqlQueryPartContext, i) as PromqlQueryPartContext;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_promqlQueryPart;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterPromqlQueryPart) {
	 		listener.enterPromqlQueryPart(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitPromqlQueryPart) {
	 		listener.exitPromqlQueryPart(this);
		}
	}
}


export class PromqlIndexPatternContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public promqlClusterString(): PromqlClusterStringContext {
		return this.getTypedRuleContext(PromqlClusterStringContext, 0) as PromqlClusterStringContext;
	}
	public COLON(): TerminalNode {
		return this.getToken(esql_parser.COLON, 0);
	}
	public promqlUnquotedIndexString(): PromqlUnquotedIndexStringContext {
		return this.getTypedRuleContext(PromqlUnquotedIndexStringContext, 0) as PromqlUnquotedIndexStringContext;
	}
	public CAST_OP(): TerminalNode {
		return this.getToken(esql_parser.CAST_OP, 0);
	}
	public promqlSelectorString(): PromqlSelectorStringContext {
		return this.getTypedRuleContext(PromqlSelectorStringContext, 0) as PromqlSelectorStringContext;
	}
	public promqlIndexString(): PromqlIndexStringContext {
		return this.getTypedRuleContext(PromqlIndexStringContext, 0) as PromqlIndexStringContext;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_promqlIndexPattern;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterPromqlIndexPattern) {
	 		listener.enterPromqlIndexPattern(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitPromqlIndexPattern) {
	 		listener.exitPromqlIndexPattern(this);
		}
	}
}


export class PromqlClusterStringContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public UNQUOTED_IDENTIFIER(): TerminalNode {
		return this.getToken(esql_parser.UNQUOTED_IDENTIFIER, 0);
	}
	public UNQUOTED_SOURCE(): TerminalNode {
		return this.getToken(esql_parser.UNQUOTED_SOURCE, 0);
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_promqlClusterString;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterPromqlClusterString) {
	 		listener.enterPromqlClusterString(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitPromqlClusterString) {
	 		listener.exitPromqlClusterString(this);
		}
	}
}


export class PromqlSelectorStringContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public UNQUOTED_IDENTIFIER(): TerminalNode {
		return this.getToken(esql_parser.UNQUOTED_IDENTIFIER, 0);
	}
	public UNQUOTED_SOURCE(): TerminalNode {
		return this.getToken(esql_parser.UNQUOTED_SOURCE, 0);
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_promqlSelectorString;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterPromqlSelectorString) {
	 		listener.enterPromqlSelectorString(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitPromqlSelectorString) {
	 		listener.exitPromqlSelectorString(this);
		}
	}
}


export class PromqlUnquotedIndexStringContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public UNQUOTED_IDENTIFIER(): TerminalNode {
		return this.getToken(esql_parser.UNQUOTED_IDENTIFIER, 0);
	}
	public UNQUOTED_SOURCE(): TerminalNode {
		return this.getToken(esql_parser.UNQUOTED_SOURCE, 0);
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_promqlUnquotedIndexString;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterPromqlUnquotedIndexString) {
	 		listener.enterPromqlUnquotedIndexString(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitPromqlUnquotedIndexString) {
	 		listener.exitPromqlUnquotedIndexString(this);
		}
	}
}


export class PromqlIndexStringContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public UNQUOTED_IDENTIFIER(): TerminalNode {
		return this.getToken(esql_parser.UNQUOTED_IDENTIFIER, 0);
	}
	public UNQUOTED_SOURCE(): TerminalNode {
		return this.getToken(esql_parser.UNQUOTED_SOURCE, 0);
	}
	public QUOTED_STRING(): TerminalNode {
		return this.getToken(esql_parser.QUOTED_STRING, 0);
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_promqlIndexString;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterPromqlIndexString) {
	 		listener.enterPromqlIndexString(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitPromqlIndexString) {
	 		listener.exitPromqlIndexString(this);
		}
	}
}
