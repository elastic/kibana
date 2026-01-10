// @ts-nocheck
// Generated from src/parser/antlr/esql_parser.g4 by ANTLR 4.13.2
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
	public static readonly WORKFLOW = 8;
	public static readonly DISSECT = 9;
	public static readonly EVAL = 10;
	public static readonly GROK = 11;
	public static readonly LIMIT = 12;
	public static readonly RERANK = 13;
	public static readonly ROW = 14;
	public static readonly SAMPLE = 15;
	public static readonly SORT = 16;
	public static readonly STATS = 17;
	public static readonly WHERE = 18;
	public static readonly FROM = 19;
	public static readonly TS = 20;
	public static readonly FORK = 21;
	public static readonly FUSE = 22;
	public static readonly INLINE = 23;
	public static readonly INLINESTATS = 24;
	public static readonly JOIN_LOOKUP = 25;
	public static readonly DEV_JOIN_FULL = 26;
	public static readonly DEV_JOIN_LEFT = 27;
	public static readonly DEV_JOIN_RIGHT = 28;
	public static readonly DEV_LOOKUP = 29;
	public static readonly MV_EXPAND = 30;
	public static readonly DROP = 31;
	public static readonly KEEP = 32;
	public static readonly DEV_INSIST = 33;
	public static readonly DEV_PROMQL = 34;
	public static readonly RENAME = 35;
	public static readonly SET = 36;
	public static readonly SHOW = 37;
	public static readonly UNKNOWN_CMD = 38;
	public static readonly CHANGE_POINT_LINE_COMMENT = 39;
	public static readonly CHANGE_POINT_MULTILINE_COMMENT = 40;
	public static readonly CHANGE_POINT_WS = 41;
	public static readonly ENRICH_POLICY_NAME = 42;
	public static readonly ENRICH_LINE_COMMENT = 43;
	public static readonly ENRICH_MULTILINE_COMMENT = 44;
	public static readonly ENRICH_WS = 45;
	public static readonly ENRICH_FIELD_LINE_COMMENT = 46;
	public static readonly ENRICH_FIELD_MULTILINE_COMMENT = 47;
	public static readonly ENRICH_FIELD_WS = 48;
	public static readonly EXPLAIN_WS = 49;
	public static readonly EXPLAIN_LINE_COMMENT = 50;
	public static readonly EXPLAIN_MULTILINE_COMMENT = 51;
	public static readonly PIPE = 52;
	public static readonly QUOTED_STRING = 53;
	public static readonly INTEGER_LITERAL = 54;
	public static readonly DECIMAL_LITERAL = 55;
	public static readonly AND = 56;
	public static readonly AS = 57;
	public static readonly ASC = 58;
	public static readonly ASSIGN = 59;
	public static readonly BY = 60;
	public static readonly CAST_OP = 61;
	public static readonly COLON = 62;
	public static readonly SEMICOLON = 63;
	public static readonly COMMA = 64;
	public static readonly DESC = 65;
	public static readonly DOT = 66;
	public static readonly FALSE = 67;
	public static readonly FIRST = 68;
	public static readonly IN = 69;
	public static readonly IS = 70;
	public static readonly LAST = 71;
	public static readonly LIKE = 72;
	public static readonly NOT = 73;
	public static readonly NULL = 74;
	public static readonly NULLS = 75;
	public static readonly ON = 76;
	public static readonly OR = 77;
	public static readonly PARAM = 78;
	public static readonly RLIKE = 79;
	public static readonly TRUE = 80;
	public static readonly WITH = 81;
	public static readonly EQ = 82;
	public static readonly CIEQ = 83;
	public static readonly NEQ = 84;
	public static readonly LT = 85;
	public static readonly LTE = 86;
	public static readonly GT = 87;
	public static readonly GTE = 88;
	public static readonly PLUS = 89;
	public static readonly MINUS = 90;
	public static readonly ASTERISK = 91;
	public static readonly SLASH = 92;
	public static readonly PERCENT = 93;
	public static readonly LEFT_BRACES = 94;
	public static readonly RIGHT_BRACES = 95;
	public static readonly DOUBLE_PARAMS = 96;
	public static readonly NAMED_OR_POSITIONAL_PARAM = 97;
	public static readonly NAMED_OR_POSITIONAL_DOUBLE_PARAMS = 98;
	public static readonly OPENING_BRACKET = 99;
	public static readonly CLOSING_BRACKET = 100;
	public static readonly LP = 101;
	public static readonly RP = 102;
	public static readonly UNQUOTED_IDENTIFIER = 103;
	public static readonly QUOTED_IDENTIFIER = 104;
	public static readonly EXPR_LINE_COMMENT = 105;
	public static readonly EXPR_MULTILINE_COMMENT = 106;
	public static readonly EXPR_WS = 107;
	public static readonly METADATA = 108;
	public static readonly UNQUOTED_SOURCE = 109;
	public static readonly FROM_LINE_COMMENT = 110;
	public static readonly FROM_MULTILINE_COMMENT = 111;
	public static readonly FROM_WS = 112;
	public static readonly FORK_WS = 113;
	public static readonly FORK_LINE_COMMENT = 114;
	public static readonly FORK_MULTILINE_COMMENT = 115;
	public static readonly GROUP = 116;
	public static readonly SCORE = 117;
	public static readonly KEY = 118;
	public static readonly FUSE_LINE_COMMENT = 119;
	public static readonly FUSE_MULTILINE_COMMENT = 120;
	public static readonly FUSE_WS = 121;
	public static readonly INLINE_STATS = 122;
	public static readonly INLINE_LINE_COMMENT = 123;
	public static readonly INLINE_MULTILINE_COMMENT = 124;
	public static readonly INLINE_WS = 125;
	public static readonly JOIN = 126;
	public static readonly USING = 127;
	public static readonly JOIN_LINE_COMMENT = 128;
	public static readonly JOIN_MULTILINE_COMMENT = 129;
	public static readonly JOIN_WS = 130;
	public static readonly LOOKUP_LINE_COMMENT = 131;
	public static readonly LOOKUP_MULTILINE_COMMENT = 132;
	public static readonly LOOKUP_WS = 133;
	public static readonly LOOKUP_FIELD_LINE_COMMENT = 134;
	public static readonly LOOKUP_FIELD_MULTILINE_COMMENT = 135;
	public static readonly LOOKUP_FIELD_WS = 136;
	public static readonly MVEXPAND_LINE_COMMENT = 137;
	public static readonly MVEXPAND_MULTILINE_COMMENT = 138;
	public static readonly MVEXPAND_WS = 139;
	public static readonly ID_PATTERN = 140;
	public static readonly PROJECT_LINE_COMMENT = 141;
	public static readonly PROJECT_MULTILINE_COMMENT = 142;
	public static readonly PROJECT_WS = 143;
	public static readonly PROMQL_PARAMS_LINE_COMMENT = 144;
	public static readonly PROMQL_PARAMS_MULTILINE_COMMENT = 145;
	public static readonly PROMQL_PARAMS_WS = 146;
	public static readonly PROMQL_QUERY_COMMENT = 147;
	public static readonly PROMQL_SINGLE_QUOTED_STRING = 148;
	public static readonly PROMQL_OTHER_QUERY_CONTENT = 149;
	public static readonly RENAME_LINE_COMMENT = 150;
	public static readonly RENAME_MULTILINE_COMMENT = 151;
	public static readonly RENAME_WS = 152;
	public static readonly SET_LINE_COMMENT = 153;
	public static readonly SET_MULTILINE_COMMENT = 154;
	public static readonly SET_WS = 155;
	public static readonly INFO = 156;
	public static readonly SHOW_LINE_COMMENT = 157;
	public static readonly SHOW_MULTILINE_COMMENT = 158;
	public static readonly SHOW_WS = 159;
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
	public static readonly RULE_workflowCommand = 66;
	public static readonly RULE_workflowInputs = 67;
	public static readonly RULE_workflowInput = 68;
	public static readonly RULE_inlineStatsCommand = 69;
	public static readonly RULE_fuseCommand = 70;
	public static readonly RULE_fuseConfiguration = 71;
	public static readonly RULE_fuseKeyByFields = 72;
	public static readonly RULE_lookupCommand = 73;
	public static readonly RULE_insistCommand = 74;
	public static readonly RULE_setCommand = 75;
	public static readonly RULE_setField = 76;
	public static readonly RULE_booleanExpression = 77;
	public static readonly RULE_regexBooleanExpression = 78;
	public static readonly RULE_matchBooleanExpression = 79;
	public static readonly RULE_valueExpression = 80;
	public static readonly RULE_operatorExpression = 81;
	public static readonly RULE_primaryExpression = 82;
	public static readonly RULE_functionExpression = 83;
	public static readonly RULE_functionName = 84;
	public static readonly RULE_mapExpression = 85;
	public static readonly RULE_entryExpression = 86;
	public static readonly RULE_mapValue = 87;
	public static readonly RULE_constant = 88;
	public static readonly RULE_booleanValue = 89;
	public static readonly RULE_numericValue = 90;
	public static readonly RULE_decimalValue = 91;
	public static readonly RULE_integerValue = 92;
	public static readonly RULE_string = 93;
	public static readonly RULE_comparisonOperator = 94;
	public static readonly RULE_joinCommand = 95;
	public static readonly RULE_joinTarget = 96;
	public static readonly RULE_joinCondition = 97;
	public static readonly RULE_promqlCommand = 98;
	public static readonly RULE_valueName = 99;
	public static readonly RULE_promqlParam = 100;
	public static readonly RULE_promqlParamName = 101;
	public static readonly RULE_promqlParamValue = 102;
	public static readonly RULE_promqlQueryContent = 103;
	public static readonly RULE_promqlQueryPart = 104;
	public static readonly RULE_promqlIndexPattern = 105;
	public static readonly RULE_promqlClusterString = 106;
	public static readonly RULE_promqlSelectorString = 107;
	public static readonly RULE_promqlUnquotedIndexString = 108;
	public static readonly RULE_promqlIndexString = 109;
	public static readonly literalNames: (string | null)[] = [ null, null, 
                                                            null, null, 
                                                            "'change_point'", 
                                                            "'enrich'", 
                                                            null, "'completion'", 
                                                            "'workflow'", 
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
                                                            "'and'", "'as'", 
                                                            "'asc'", "'='", 
                                                            "'by'", "'::'", 
                                                            "':'", "';'", 
                                                            "','", "'desc'", 
                                                            "'.'", "'false'", 
                                                            "'first'", "'in'", 
                                                            "'is'", "'last'", 
                                                            "'like'", "'not'", 
                                                            "'null'", "'nulls'", 
                                                            "'on'", "'or'", 
                                                            "'?'", "'rlike'", 
                                                            "'true'", "'with'", 
                                                            "'=='", "'=~'", 
                                                            "'!='", "'<'", 
                                                            "'<='", "'>'", 
                                                            "'>='", "'+'", 
                                                            "'-'", "'*'", 
                                                            "'/'", "'%'", 
                                                            "'{'", "'}'", 
                                                            "'??'", null, 
                                                            null, null, 
                                                            "']'", null, 
                                                            "')'", null, 
                                                            null, null, 
                                                            null, null, 
                                                            "'metadata'", 
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
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            null, "'info'" ];
	public static readonly symbolicNames: (string | null)[] = [ null, "LINE_COMMENT", 
                                                             "MULTILINE_COMMENT", 
                                                             "WS", "CHANGE_POINT", 
                                                             "ENRICH", "DEV_EXPLAIN", 
                                                             "COMPLETION", 
                                                             "WORKFLOW", 
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
                                                             "AND", "AS", 
                                                             "ASC", "ASSIGN", 
                                                             "BY", "CAST_OP", 
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
                                                             "RENAME_LINE_COMMENT", 
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
		"rerankCommand", "completionCommand", "workflowCommand", "workflowInputs", 
		"workflowInput", "inlineStatsCommand", "fuseCommand", "fuseConfiguration", 
		"fuseKeyByFields", "lookupCommand", "insistCommand", "setCommand", "setField", 
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
			this.state = 223;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 0, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 220;
					this.setCommand();
					}
					}
				}
				this.state = 225;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 0, this._ctx);
			}
			this.state = 226;
			this.singleStatement();
			this.state = 227;
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
			this.state = 229;
			this.query(0);
			this.state = 230;
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

			this.state = 233;
			this.sourceCommand();
			}
			this._ctx.stop = this._input.LT(-1);
			this.state = 240;
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
					this.state = 235;
					if (!(this.precpred(this._ctx, 1))) {
						throw this.createFailedPredicateException("this.precpred(this._ctx, 1)");
					}
					this.state = 236;
					this.match(esql_parser.PIPE);
					this.state = 237;
					this.processingCommand();
					}
					}
				}
				this.state = 242;
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
			this.state = 251;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 2, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 243;
				this.fromCommand();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 244;
				this.rowCommand();
				}
				break;
			case 3:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 245;
				this.showCommand();
				}
				break;
			case 4:
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 246;
				this.timeSeriesCommand();
				}
				break;
			case 5:
				this.enterOuterAlt(localctx, 5);
				{
				this.state = 247;
				if (!(this.isDevVersion())) {
					throw this.createFailedPredicateException("this.isDevVersion()");
				}
				this.state = 248;
				this.explainCommand();
				}
				break;
			case 6:
				this.enterOuterAlt(localctx, 6);
				{
				this.state = 249;
				if (!(this.isDevVersion())) {
					throw this.createFailedPredicateException("this.isDevVersion()");
				}
				this.state = 250;
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
			this.state = 278;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 3, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 253;
				this.evalCommand();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 254;
				this.whereCommand();
				}
				break;
			case 3:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 255;
				this.keepCommand();
				}
				break;
			case 4:
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 256;
				this.limitCommand();
				}
				break;
			case 5:
				this.enterOuterAlt(localctx, 5);
				{
				this.state = 257;
				this.statsCommand();
				}
				break;
			case 6:
				this.enterOuterAlt(localctx, 6);
				{
				this.state = 258;
				this.sortCommand();
				}
				break;
			case 7:
				this.enterOuterAlt(localctx, 7);
				{
				this.state = 259;
				this.dropCommand();
				}
				break;
			case 8:
				this.enterOuterAlt(localctx, 8);
				{
				this.state = 260;
				this.renameCommand();
				}
				break;
			case 9:
				this.enterOuterAlt(localctx, 9);
				{
				this.state = 261;
				this.dissectCommand();
				}
				break;
			case 10:
				this.enterOuterAlt(localctx, 10);
				{
				this.state = 262;
				this.grokCommand();
				}
				break;
			case 11:
				this.enterOuterAlt(localctx, 11);
				{
				this.state = 263;
				this.enrichCommand();
				}
				break;
			case 12:
				this.enterOuterAlt(localctx, 12);
				{
				this.state = 264;
				this.mvExpandCommand();
				}
				break;
			case 13:
				this.enterOuterAlt(localctx, 13);
				{
				this.state = 265;
				this.joinCommand();
				}
				break;
			case 14:
				this.enterOuterAlt(localctx, 14);
				{
				this.state = 266;
				this.changePointCommand();
				}
				break;
			case 15:
				this.enterOuterAlt(localctx, 15);
				{
				this.state = 267;
				this.completionCommand();
				}
				break;
			case 16:
				this.enterOuterAlt(localctx, 16);
				{
				this.state = 268;
				this.workflowCommand();
				}
				break;
			case 17:
				this.enterOuterAlt(localctx, 17);
				{
				this.state = 269;
				this.sampleCommand();
				}
				break;
			case 18:
				this.enterOuterAlt(localctx, 18);
				{
				this.state = 270;
				this.forkCommand();
				}
				break;
			case 19:
				this.enterOuterAlt(localctx, 19);
				{
				this.state = 271;
				this.rerankCommand();
				}
				break;
			case 20:
				this.enterOuterAlt(localctx, 20);
				{
				this.state = 272;
				this.inlineStatsCommand();
				}
				break;
			case 21:
				this.enterOuterAlt(localctx, 21);
				{
				this.state = 273;
				this.fuseCommand();
				}
				break;
			case 22:
				this.enterOuterAlt(localctx, 22);
				{
				this.state = 274;
				if (!(this.isDevVersion())) {
					throw this.createFailedPredicateException("this.isDevVersion()");
				}
				this.state = 275;
				this.lookupCommand();
				}
				break;
			case 23:
				this.enterOuterAlt(localctx, 23);
				{
				this.state = 276;
				if (!(this.isDevVersion())) {
					throw this.createFailedPredicateException("this.isDevVersion()");
				}
				this.state = 277;
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
			this.state = 280;
			this.match(esql_parser.WHERE);
			this.state = 281;
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
		this.enterRule(localctx, 14, esql_parser.RULE_rowCommand);
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
		this.enterRule(localctx, 16, esql_parser.RULE_fields);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 288;
			this.field();
			this.state = 293;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 4, this._ctx);
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
			this.state = 299;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 5, this._ctx) ) {
			case 1:
				{
				this.state = 296;
				this.qualifiedName();
				this.state = 297;
				this.match(esql_parser.ASSIGN);
				}
				break;
			}
			this.state = 301;
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
			this.state = 303;
			this.rerankField();
			this.state = 308;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 6, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 304;
					this.match(esql_parser.COMMA);
					this.state = 305;
					this.rerankField();
					}
					}
				}
				this.state = 310;
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
			this.state = 311;
			this.qualifiedName();
			this.state = 314;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 7, this._ctx) ) {
			case 1:
				{
				this.state = 312;
				this.match(esql_parser.ASSIGN);
				this.state = 313;
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
			this.state = 316;
			this.match(esql_parser.FROM);
			this.state = 317;
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
			this.state = 319;
			this.match(esql_parser.TS);
			this.state = 320;
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
			this.state = 322;
			this.indexPatternOrSubquery();
			this.state = 327;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 8, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 323;
					this.match(esql_parser.COMMA);
					this.state = 324;
					this.indexPatternOrSubquery();
					}
					}
				}
				this.state = 329;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 8, this._ctx);
			}
			this.state = 331;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 9, this._ctx) ) {
			case 1:
				{
				this.state = 330;
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
			this.state = 336;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 10, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 333;
				this.indexPattern();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 334;
				if (!(this.isDevVersion())) {
					throw this.createFailedPredicateException("this.isDevVersion()");
				}
				this.state = 335;
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
			this.state = 338;
			this.match(esql_parser.LP);
			this.state = 339;
			this.fromCommand();
			this.state = 344;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===52) {
				{
				{
				this.state = 340;
				this.match(esql_parser.PIPE);
				this.state = 341;
				this.processingCommand();
				}
				}
				this.state = 346;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			this.state = 347;
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
			this.state = 358;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 12, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 349;
				this.clusterString();
				this.state = 350;
				this.match(esql_parser.COLON);
				this.state = 351;
				this.unquotedIndexString();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 353;
				this.unquotedIndexString();
				this.state = 354;
				this.match(esql_parser.CAST_OP);
				this.state = 355;
				this.selectorString();
				}
				break;
			case 3:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 357;
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
			this.state = 360;
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
			this.state = 362;
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
			this.state = 364;
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
			this.state = 366;
			_la = this._input.LA(1);
			if(!(_la===53 || _la===109)) {
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
			this.state = 368;
			this.match(esql_parser.METADATA);
			this.state = 369;
			this.match(esql_parser.UNQUOTED_SOURCE);
			this.state = 374;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 13, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 370;
					this.match(esql_parser.COMMA);
					this.state = 371;
					this.match(esql_parser.UNQUOTED_SOURCE);
					}
					}
				}
				this.state = 376;
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
			this.state = 377;
			this.match(esql_parser.EVAL);
			this.state = 378;
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
			this.state = 380;
			this.match(esql_parser.STATS);
			this.state = 382;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 14, this._ctx) ) {
			case 1:
				{
				this.state = 381;
				localctx._stats = this.aggFields();
				}
				break;
			}
			this.state = 386;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 15, this._ctx) ) {
			case 1:
				{
				this.state = 384;
				this.match(esql_parser.BY);
				this.state = 385;
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
			this.state = 388;
			this.aggField();
			this.state = 393;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 16, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 389;
					this.match(esql_parser.COMMA);
					this.state = 390;
					this.aggField();
					}
					}
				}
				this.state = 395;
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
			this.state = 396;
			this.field();
			this.state = 399;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 17, this._ctx) ) {
			case 1:
				{
				this.state = 397;
				this.match(esql_parser.WHERE);
				this.state = 398;
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
			this.state = 413;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 19, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 401;
				if (!(this.isDevVersion())) {
					throw this.createFailedPredicateException("this.isDevVersion()");
				}
				this.state = 402;
				this.match(esql_parser.OPENING_BRACKET);
				this.state = 404;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===103) {
					{
					this.state = 403;
					localctx._qualifier = this.match(esql_parser.UNQUOTED_IDENTIFIER);
					}
				}

				this.state = 406;
				this.match(esql_parser.CLOSING_BRACKET);
				this.state = 407;
				this.match(esql_parser.DOT);
				this.state = 408;
				this.match(esql_parser.OPENING_BRACKET);
				this.state = 409;
				localctx._name = this.fieldName();
				this.state = 410;
				this.match(esql_parser.CLOSING_BRACKET);
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 412;
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
			this.state = 415;
			this.identifierOrParameter();
			this.state = 420;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 20, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 416;
					this.match(esql_parser.DOT);
					this.state = 417;
					this.identifierOrParameter();
					}
					}
				}
				this.state = 422;
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
			this.state = 435;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 22, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 423;
				if (!(this.isDevVersion())) {
					throw this.createFailedPredicateException("this.isDevVersion()");
				}
				this.state = 424;
				this.match(esql_parser.OPENING_BRACKET);
				this.state = 426;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===140) {
					{
					this.state = 425;
					localctx._qualifier = this.match(esql_parser.ID_PATTERN);
					}
				}

				this.state = 428;
				this.match(esql_parser.CLOSING_BRACKET);
				this.state = 429;
				this.match(esql_parser.DOT);
				this.state = 430;
				this.match(esql_parser.OPENING_BRACKET);
				this.state = 431;
				localctx._name = this.fieldNamePattern();
				this.state = 432;
				this.match(esql_parser.CLOSING_BRACKET);
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 434;
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
			this.state = 437;
			this.identifierPattern();
			this.state = 442;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 23, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 438;
					this.match(esql_parser.DOT);
					this.state = 439;
					this.identifierPattern();
					}
					}
				}
				this.state = 444;
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
			this.state = 445;
			this.qualifiedNamePattern();
			this.state = 450;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 24, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 446;
					this.match(esql_parser.COMMA);
					this.state = 447;
					this.qualifiedNamePattern();
					}
					}
				}
				this.state = 452;
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
			this.state = 453;
			_la = this._input.LA(1);
			if(!(_la===103 || _la===104)) {
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
			this.state = 458;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 140:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 455;
				this.match(esql_parser.ID_PATTERN);
				}
				break;
			case 78:
			case 97:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 456;
				this.parameter();
				}
				break;
			case 96:
			case 98:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 457;
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
			this.state = 462;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 78:
				localctx = new InputParamContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 460;
				this.match(esql_parser.PARAM);
				}
				break;
			case 97:
				localctx = new InputNamedOrPositionalParamContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 461;
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
			this.state = 466;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 96:
				localctx = new InputDoubleParamsContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 464;
				this.match(esql_parser.DOUBLE_PARAMS);
				}
				break;
			case 98:
				localctx = new InputNamedOrPositionalDoubleParamsContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 465;
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
			this.state = 471;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 103:
			case 104:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 468;
				this.identifier();
				}
				break;
			case 78:
			case 97:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 469;
				this.parameter();
				}
				break;
			case 96:
			case 98:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 470;
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
			this.state = 475;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 53:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 473;
				this.string_();
				}
				break;
			case 78:
			case 97:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 474;
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
			this.state = 477;
			this.match(esql_parser.LIMIT);
			this.state = 478;
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
			this.state = 480;
			this.match(esql_parser.SORT);
			this.state = 481;
			this.orderExpression();
			this.state = 486;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 30, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 482;
					this.match(esql_parser.COMMA);
					this.state = 483;
					this.orderExpression();
					}
					}
				}
				this.state = 488;
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
			this.state = 489;
			this.booleanExpression(0);
			this.state = 491;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 31, this._ctx) ) {
			case 1:
				{
				this.state = 490;
				localctx._ordering = this._input.LT(1);
				_la = this._input.LA(1);
				if(!(_la===58 || _la===65)) {
				    localctx._ordering = this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				}
				break;
			}
			this.state = 495;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 32, this._ctx) ) {
			case 1:
				{
				this.state = 493;
				this.match(esql_parser.NULLS);
				this.state = 494;
				localctx._nullOrdering = this._input.LT(1);
				_la = this._input.LA(1);
				if(!(_la===68 || _la===71)) {
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
			this.state = 497;
			this.match(esql_parser.KEEP);
			this.state = 498;
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
			this.state = 500;
			this.match(esql_parser.DROP);
			this.state = 501;
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
			this.state = 503;
			this.match(esql_parser.RENAME);
			this.state = 504;
			this.renameClause();
			this.state = 509;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 33, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 505;
					this.match(esql_parser.COMMA);
					this.state = 506;
					this.renameClause();
					}
					}
				}
				this.state = 511;
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
			this.state = 520;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 34, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 512;
				localctx._oldName = this.qualifiedNamePattern();
				this.state = 513;
				this.match(esql_parser.AS);
				this.state = 514;
				localctx._newName = this.qualifiedNamePattern();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 516;
				localctx._newName = this.qualifiedNamePattern();
				this.state = 517;
				this.match(esql_parser.ASSIGN);
				this.state = 518;
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
			this.state = 522;
			this.match(esql_parser.DISSECT);
			this.state = 523;
			this.primaryExpression(0);
			this.state = 524;
			this.string_();
			this.state = 526;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 35, this._ctx) ) {
			case 1:
				{
				this.state = 525;
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
			this.state = 528;
			this.dissectCommandOption();
			this.state = 533;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 36, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 529;
					this.match(esql_parser.COMMA);
					this.state = 530;
					this.dissectCommandOption();
					}
					}
				}
				this.state = 535;
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
			this.state = 536;
			this.identifier();
			this.state = 537;
			this.match(esql_parser.ASSIGN);
			this.state = 538;
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
			this.state = 542;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 37, this._ctx) ) {
			case 1:
				{
				this.state = 540;
				this.match(esql_parser.WITH);
				this.state = 541;
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
			this.state = 544;
			this.match(esql_parser.GROK);
			this.state = 545;
			this.primaryExpression(0);
			this.state = 546;
			this.string_();
			this.state = 551;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 38, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 547;
					this.match(esql_parser.COMMA);
					this.state = 548;
					this.string_();
					}
					}
				}
				this.state = 553;
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
			this.state = 554;
			this.match(esql_parser.MV_EXPAND);
			this.state = 555;
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
			this.state = 557;
			this.match(esql_parser.DEV_EXPLAIN);
			this.state = 558;
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
			this.state = 560;
			this.match(esql_parser.LP);
			this.state = 561;
			this.query(0);
			this.state = 562;
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
			this.state = 564;
			this.match(esql_parser.SHOW);
			this.state = 565;
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
			this.state = 567;
			this.match(esql_parser.ENRICH);
			this.state = 568;
			localctx._policyName = this.enrichPolicyName();
			this.state = 571;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 39, this._ctx) ) {
			case 1:
				{
				this.state = 569;
				this.match(esql_parser.ON);
				this.state = 570;
				localctx._matchField = this.qualifiedNamePattern();
				}
				break;
			}
			this.state = 582;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 41, this._ctx) ) {
			case 1:
				{
				this.state = 573;
				this.match(esql_parser.WITH);
				this.state = 574;
				this.enrichWithClause();
				this.state = 579;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 40, this._ctx);
				while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
					if (_alt === 1) {
						{
						{
						this.state = 575;
						this.match(esql_parser.COMMA);
						this.state = 576;
						this.enrichWithClause();
						}
						}
					}
					this.state = 581;
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
			this.state = 584;
			_la = this._input.LA(1);
			if(!(_la===42 || _la===53)) {
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
			this.state = 589;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 42, this._ctx) ) {
			case 1:
				{
				this.state = 586;
				localctx._newName = this.qualifiedNamePattern();
				this.state = 587;
				this.match(esql_parser.ASSIGN);
				}
				break;
			}
			this.state = 591;
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
			this.state = 593;
			this.match(esql_parser.SAMPLE);
			this.state = 594;
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
			this.state = 596;
			this.match(esql_parser.CHANGE_POINT);
			this.state = 597;
			localctx._value = this.qualifiedName();
			this.state = 600;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 43, this._ctx) ) {
			case 1:
				{
				this.state = 598;
				this.match(esql_parser.ON);
				this.state = 599;
				localctx._key = this.qualifiedName();
				}
				break;
			}
			this.state = 607;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 44, this._ctx) ) {
			case 1:
				{
				this.state = 602;
				this.match(esql_parser.AS);
				this.state = 603;
				localctx._targetType = this.qualifiedName();
				this.state = 604;
				this.match(esql_parser.COMMA);
				this.state = 605;
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
			this.state = 609;
			this.match(esql_parser.FORK);
			this.state = 610;
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
			this.state = 613;
			this._errHandler.sync(this);
			_alt = 1;
			do {
				switch (_alt) {
				case 1:
					{
					{
					this.state = 612;
					this.forkSubQuery();
					}
					}
					break;
				default:
					throw new NoViableAltException(this);
				}
				this.state = 615;
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
			this.state = 617;
			this.match(esql_parser.LP);
			this.state = 618;
			this.forkSubQueryCommand(0);
			this.state = 619;
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

			this.state = 622;
			this.forkSubQueryProcessingCommand();
			}
			this._ctx.stop = this._input.LT(-1);
			this.state = 629;
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
					this.state = 624;
					if (!(this.precpred(this._ctx, 1))) {
						throw this.createFailedPredicateException("this.precpred(this._ctx, 1)");
					}
					this.state = 625;
					this.match(esql_parser.PIPE);
					this.state = 626;
					this.forkSubQueryProcessingCommand();
					}
					}
				}
				this.state = 631;
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
			this.state = 632;
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
			this.state = 634;
			this.match(esql_parser.RERANK);
			this.state = 638;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 47, this._ctx) ) {
			case 1:
				{
				this.state = 635;
				localctx._targetField = this.qualifiedName();
				this.state = 636;
				this.match(esql_parser.ASSIGN);
				}
				break;
			}
			this.state = 640;
			localctx._queryText = this.constant();
			this.state = 641;
			this.match(esql_parser.ON);
			this.state = 642;
			this.rerankFields();
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
	public completionCommand(): CompletionCommandContext {
		let localctx: CompletionCommandContext = new CompletionCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 130, esql_parser.RULE_completionCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 645;
			this.match(esql_parser.COMPLETION);
			this.state = 649;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 48, this._ctx) ) {
			case 1:
				{
				this.state = 646;
				localctx._targetField = this.qualifiedName();
				this.state = 647;
				this.match(esql_parser.ASSIGN);
				}
				break;
			}
			this.state = 651;
			localctx._prompt = this.primaryExpression(0);
			this.state = 652;
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
	public workflowCommand(): WorkflowCommandContext {
		let localctx: WorkflowCommandContext = new WorkflowCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 132, esql_parser.RULE_workflowCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 654;
			this.match(esql_parser.WORKFLOW);
			this.state = 655;
			localctx._workflowId = this.string_();
			this.state = 656;
			this.match(esql_parser.WITH);
			this.state = 657;
			this.match(esql_parser.LP);
			this.state = 658;
			this.workflowInputs();
			this.state = 659;
			this.match(esql_parser.RP);
			this.state = 662;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 49, this._ctx) ) {
			case 1:
				{
				this.state = 660;
				this.match(esql_parser.AS);
				this.state = 661;
				localctx._targetField = this.qualifiedName();
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
	public workflowInputs(): WorkflowInputsContext {
		let localctx: WorkflowInputsContext = new WorkflowInputsContext(this, this._ctx, this.state);
		this.enterRule(localctx, 134, esql_parser.RULE_workflowInputs);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 664;
			this.workflowInput();
			this.state = 669;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===64) {
				{
				{
				this.state = 665;
				this.match(esql_parser.COMMA);
				this.state = 666;
				this.workflowInput();
				}
				}
				this.state = 671;
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
	public workflowInput(): WorkflowInputContext {
		let localctx: WorkflowInputContext = new WorkflowInputContext(this, this._ctx, this.state);
		this.enterRule(localctx, 136, esql_parser.RULE_workflowInput);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 672;
			localctx._name = this.identifier();
			this.state = 673;
			this.match(esql_parser.ASSIGN);
			this.state = 674;
			localctx._value = this.primaryExpression(0);
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
		this.enterRule(localctx, 138, esql_parser.RULE_inlineStatsCommand);
		try {
			this.state = 689;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 23:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 676;
				this.match(esql_parser.INLINE);
				this.state = 677;
				this.match(esql_parser.INLINE_STATS);
				this.state = 678;
				localctx._stats = this.aggFields();
				this.state = 681;
				this._errHandler.sync(this);
				switch ( this._interp.adaptivePredict(this._input, 51, this._ctx) ) {
				case 1:
					{
					this.state = 679;
					this.match(esql_parser.BY);
					this.state = 680;
					localctx._grouping = this.fields();
					}
					break;
				}
				}
				break;
			case 24:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 683;
				this.match(esql_parser.INLINESTATS);
				this.state = 684;
				localctx._stats = this.aggFields();
				this.state = 687;
				this._errHandler.sync(this);
				switch ( this._interp.adaptivePredict(this._input, 52, this._ctx) ) {
				case 1:
					{
					this.state = 685;
					this.match(esql_parser.BY);
					this.state = 686;
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
		this.enterRule(localctx, 140, esql_parser.RULE_fuseCommand);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 691;
			this.match(esql_parser.FUSE);
			this.state = 693;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 54, this._ctx) ) {
			case 1:
				{
				this.state = 692;
				localctx._fuseType = this.identifier();
				}
				break;
			}
			this.state = 698;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 55, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 695;
					this.fuseConfiguration();
					}
					}
				}
				this.state = 700;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 55, this._ctx);
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
		this.enterRule(localctx, 142, esql_parser.RULE_fuseConfiguration);
		try {
			this.state = 712;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 117:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 701;
				this.match(esql_parser.SCORE);
				this.state = 702;
				this.match(esql_parser.BY);
				this.state = 703;
				localctx._score = this.qualifiedName();
				}
				break;
			case 118:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 704;
				this.match(esql_parser.KEY);
				this.state = 705;
				this.match(esql_parser.BY);
				this.state = 706;
				localctx._key = this.fuseKeyByFields();
				}
				break;
			case 116:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 707;
				this.match(esql_parser.GROUP);
				this.state = 708;
				this.match(esql_parser.BY);
				this.state = 709;
				localctx._group = this.qualifiedName();
				}
				break;
			case 81:
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 710;
				this.match(esql_parser.WITH);
				this.state = 711;
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
	public fuseKeyByFields(): FuseKeyByFieldsContext {
		let localctx: FuseKeyByFieldsContext = new FuseKeyByFieldsContext(this, this._ctx, this.state);
		this.enterRule(localctx, 144, esql_parser.RULE_fuseKeyByFields);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 714;
			this.qualifiedName();
			this.state = 719;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 57, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 715;
					this.match(esql_parser.COMMA);
					this.state = 716;
					this.qualifiedName();
					}
					}
				}
				this.state = 721;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 57, this._ctx);
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
	public lookupCommand(): LookupCommandContext {
		let localctx: LookupCommandContext = new LookupCommandContext(this, this._ctx, this.state);
		this.enterRule(localctx, 146, esql_parser.RULE_lookupCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 722;
			this.match(esql_parser.DEV_LOOKUP);
			this.state = 723;
			localctx._tableName = this.indexPattern();
			this.state = 724;
			this.match(esql_parser.ON);
			this.state = 725;
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
		this.enterRule(localctx, 148, esql_parser.RULE_insistCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 727;
			this.match(esql_parser.DEV_INSIST);
			this.state = 728;
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
		this.enterRule(localctx, 150, esql_parser.RULE_setCommand);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 730;
			this.match(esql_parser.SET);
			this.state = 731;
			this.setField();
			this.state = 732;
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
		this.enterRule(localctx, 152, esql_parser.RULE_setField);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 734;
			this.identifier();
			this.state = 735;
			this.match(esql_parser.ASSIGN);
			this.state = 736;
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
		let _startState: number = 154;
		this.enterRecursionRule(localctx, 154, esql_parser.RULE_booleanExpression, _p);
		let _la: number;
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 767;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 61, this._ctx) ) {
			case 1:
				{
				localctx = new LogicalNotContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;

				this.state = 739;
				this.match(esql_parser.NOT);
				this.state = 740;
				this.booleanExpression(8);
				}
				break;
			case 2:
				{
				localctx = new BooleanDefaultContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 741;
				this.valueExpression();
				}
				break;
			case 3:
				{
				localctx = new RegexExpressionContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 742;
				this.regexBooleanExpression();
				}
				break;
			case 4:
				{
				localctx = new LogicalInContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 743;
				this.valueExpression();
				this.state = 745;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===73) {
					{
					this.state = 744;
					this.match(esql_parser.NOT);
					}
				}

				this.state = 747;
				this.match(esql_parser.IN);
				this.state = 748;
				this.match(esql_parser.LP);
				this.state = 749;
				this.valueExpression();
				this.state = 754;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===64) {
					{
					{
					this.state = 750;
					this.match(esql_parser.COMMA);
					this.state = 751;
					this.valueExpression();
					}
					}
					this.state = 756;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 757;
				this.match(esql_parser.RP);
				}
				break;
			case 5:
				{
				localctx = new IsNullContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 759;
				this.valueExpression();
				this.state = 760;
				this.match(esql_parser.IS);
				this.state = 762;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===73) {
					{
					this.state = 761;
					this.match(esql_parser.NOT);
					}
				}

				this.state = 764;
				this.match(esql_parser.NULL);
				}
				break;
			case 6:
				{
				localctx = new MatchExpressionContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 766;
				this.matchBooleanExpression();
				}
				break;
			}
			this._ctx.stop = this._input.LT(-1);
			this.state = 777;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 63, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					if (this._parseListeners != null) {
						this.triggerExitRuleEvent();
					}
					_prevctx = localctx;
					{
					this.state = 775;
					this._errHandler.sync(this);
					switch ( this._interp.adaptivePredict(this._input, 62, this._ctx) ) {
					case 1:
						{
						localctx = new LogicalBinaryContext(this, new BooleanExpressionContext(this, _parentctx, _parentState));
						(localctx as LogicalBinaryContext)._left = _prevctx;
						this.pushNewRecursionContext(localctx, _startState, esql_parser.RULE_booleanExpression);
						this.state = 769;
						if (!(this.precpred(this._ctx, 5))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 5)");
						}
						this.state = 770;
						(localctx as LogicalBinaryContext)._operator = this.match(esql_parser.AND);
						this.state = 771;
						(localctx as LogicalBinaryContext)._right = this.booleanExpression(6);
						}
						break;
					case 2:
						{
						localctx = new LogicalBinaryContext(this, new BooleanExpressionContext(this, _parentctx, _parentState));
						(localctx as LogicalBinaryContext)._left = _prevctx;
						this.pushNewRecursionContext(localctx, _startState, esql_parser.RULE_booleanExpression);
						this.state = 772;
						if (!(this.precpred(this._ctx, 4))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 4)");
						}
						this.state = 773;
						(localctx as LogicalBinaryContext)._operator = this.match(esql_parser.OR);
						this.state = 774;
						(localctx as LogicalBinaryContext)._right = this.booleanExpression(5);
						}
						break;
					}
					}
				}
				this.state = 779;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 63, this._ctx);
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
		this.enterRule(localctx, 156, esql_parser.RULE_regexBooleanExpression);
		let _la: number;
		try {
			this.state = 826;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 70, this._ctx) ) {
			case 1:
				localctx = new LikeExpressionContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 780;
				this.valueExpression();
				this.state = 782;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===73) {
					{
					this.state = 781;
					this.match(esql_parser.NOT);
					}
				}

				this.state = 784;
				this.match(esql_parser.LIKE);
				this.state = 785;
				this.stringOrParameter();
				}
				break;
			case 2:
				localctx = new RlikeExpressionContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 787;
				this.valueExpression();
				this.state = 789;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===73) {
					{
					this.state = 788;
					this.match(esql_parser.NOT);
					}
				}

				this.state = 791;
				this.match(esql_parser.RLIKE);
				this.state = 792;
				this.stringOrParameter();
				}
				break;
			case 3:
				localctx = new LikeListExpressionContext(this, localctx);
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 794;
				this.valueExpression();
				this.state = 796;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===73) {
					{
					this.state = 795;
					this.match(esql_parser.NOT);
					}
				}

				this.state = 798;
				this.match(esql_parser.LIKE);
				this.state = 799;
				this.match(esql_parser.LP);
				this.state = 800;
				this.stringOrParameter();
				this.state = 805;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===64) {
					{
					{
					this.state = 801;
					this.match(esql_parser.COMMA);
					this.state = 802;
					this.stringOrParameter();
					}
					}
					this.state = 807;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 808;
				this.match(esql_parser.RP);
				}
				break;
			case 4:
				localctx = new RlikeListExpressionContext(this, localctx);
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 810;
				this.valueExpression();
				this.state = 812;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===73) {
					{
					this.state = 811;
					this.match(esql_parser.NOT);
					}
				}

				this.state = 814;
				this.match(esql_parser.RLIKE);
				this.state = 815;
				this.match(esql_parser.LP);
				this.state = 816;
				this.stringOrParameter();
				this.state = 821;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===64) {
					{
					{
					this.state = 817;
					this.match(esql_parser.COMMA);
					this.state = 818;
					this.stringOrParameter();
					}
					}
					this.state = 823;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 824;
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
		this.enterRule(localctx, 158, esql_parser.RULE_matchBooleanExpression);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 828;
			localctx._fieldExp = this.qualifiedName();
			this.state = 831;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===61) {
				{
				this.state = 829;
				this.match(esql_parser.CAST_OP);
				this.state = 830;
				localctx._fieldType = this.dataType();
				}
			}

			this.state = 833;
			this.match(esql_parser.COLON);
			this.state = 834;
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
		this.enterRule(localctx, 160, esql_parser.RULE_valueExpression);
		try {
			this.state = 841;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 72, this._ctx) ) {
			case 1:
				localctx = new ValueExpressionDefaultContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 836;
				this.operatorExpression(0);
				}
				break;
			case 2:
				localctx = new ComparisonContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 837;
				(localctx as ComparisonContext)._left = this.operatorExpression(0);
				this.state = 838;
				this.comparisonOperator();
				this.state = 839;
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
		let _startState: number = 162;
		this.enterRecursionRule(localctx, 162, esql_parser.RULE_operatorExpression, _p);
		let _la: number;
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 847;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 73, this._ctx) ) {
			case 1:
				{
				localctx = new OperatorExpressionDefaultContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;

				this.state = 844;
				this.primaryExpression(0);
				}
				break;
			case 2:
				{
				localctx = new ArithmeticUnaryContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 845;
				(localctx as ArithmeticUnaryContext)._operator = this._input.LT(1);
				_la = this._input.LA(1);
				if(!(_la===89 || _la===90)) {
				    (localctx as ArithmeticUnaryContext)._operator = this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				this.state = 846;
				this.operatorExpression(3);
				}
				break;
			}
			this._ctx.stop = this._input.LT(-1);
			this.state = 857;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 75, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					if (this._parseListeners != null) {
						this.triggerExitRuleEvent();
					}
					_prevctx = localctx;
					{
					this.state = 855;
					this._errHandler.sync(this);
					switch ( this._interp.adaptivePredict(this._input, 74, this._ctx) ) {
					case 1:
						{
						localctx = new ArithmeticBinaryContext(this, new OperatorExpressionContext(this, _parentctx, _parentState));
						(localctx as ArithmeticBinaryContext)._left = _prevctx;
						this.pushNewRecursionContext(localctx, _startState, esql_parser.RULE_operatorExpression);
						this.state = 849;
						if (!(this.precpred(this._ctx, 2))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 2)");
						}
						this.state = 850;
						(localctx as ArithmeticBinaryContext)._operator = this._input.LT(1);
						_la = this._input.LA(1);
						if(!(((((_la - 91)) & ~0x1F) === 0 && ((1 << (_la - 91)) & 7) !== 0))) {
						    (localctx as ArithmeticBinaryContext)._operator = this._errHandler.recoverInline(this);
						}
						else {
							this._errHandler.reportMatch(this);
						    this.consume();
						}
						this.state = 851;
						(localctx as ArithmeticBinaryContext)._right = this.operatorExpression(3);
						}
						break;
					case 2:
						{
						localctx = new ArithmeticBinaryContext(this, new OperatorExpressionContext(this, _parentctx, _parentState));
						(localctx as ArithmeticBinaryContext)._left = _prevctx;
						this.pushNewRecursionContext(localctx, _startState, esql_parser.RULE_operatorExpression);
						this.state = 852;
						if (!(this.precpred(this._ctx, 1))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 1)");
						}
						this.state = 853;
						(localctx as ArithmeticBinaryContext)._operator = this._input.LT(1);
						_la = this._input.LA(1);
						if(!(_la===89 || _la===90)) {
						    (localctx as ArithmeticBinaryContext)._operator = this._errHandler.recoverInline(this);
						}
						else {
							this._errHandler.reportMatch(this);
						    this.consume();
						}
						this.state = 854;
						(localctx as ArithmeticBinaryContext)._right = this.operatorExpression(2);
						}
						break;
					}
					}
				}
				this.state = 859;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 75, this._ctx);
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
		let _startState: number = 164;
		this.enterRecursionRule(localctx, 164, esql_parser.RULE_primaryExpression, _p);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 868;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 76, this._ctx) ) {
			case 1:
				{
				localctx = new ConstantDefaultContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;

				this.state = 861;
				this.constant();
				}
				break;
			case 2:
				{
				localctx = new DereferenceContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 862;
				this.qualifiedName();
				}
				break;
			case 3:
				{
				localctx = new FunctionContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 863;
				this.functionExpression();
				}
				break;
			case 4:
				{
				localctx = new ParenthesizedExpressionContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 864;
				this.match(esql_parser.LP);
				this.state = 865;
				this.booleanExpression(0);
				this.state = 866;
				this.match(esql_parser.RP);
				}
				break;
			}
			this._ctx.stop = this._input.LT(-1);
			this.state = 875;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 77, this._ctx);
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
					this.state = 870;
					if (!(this.precpred(this._ctx, 1))) {
						throw this.createFailedPredicateException("this.precpred(this._ctx, 1)");
					}
					this.state = 871;
					this.match(esql_parser.CAST_OP);
					this.state = 872;
					this.dataType();
					}
					}
				}
				this.state = 877;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 77, this._ctx);
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
		this.enterRule(localctx, 166, esql_parser.RULE_functionExpression);
		let _la: number;
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 878;
			this.functionName();
			this.state = 879;
			this.match(esql_parser.LP);
			this.state = 893;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 80, this._ctx) ) {
			case 1:
				{
				this.state = 880;
				this.match(esql_parser.ASTERISK);
				}
				break;
			case 2:
				{
				{
				this.state = 881;
				this.booleanExpression(0);
				this.state = 886;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 78, this._ctx);
				while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
					if (_alt === 1) {
						{
						{
						this.state = 882;
						this.match(esql_parser.COMMA);
						this.state = 883;
						this.booleanExpression(0);
						}
						}
					}
					this.state = 888;
					this._errHandler.sync(this);
					_alt = this._interp.adaptivePredict(this._input, 78, this._ctx);
				}
				this.state = 891;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===64) {
					{
					this.state = 889;
					this.match(esql_parser.COMMA);
					this.state = 890;
					this.mapExpression();
					}
				}

				}
				}
				break;
			}
			this.state = 895;
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
		this.enterRule(localctx, 168, esql_parser.RULE_functionName);
		try {
			this.state = 900;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 78:
			case 96:
			case 97:
			case 98:
			case 103:
			case 104:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 897;
				this.identifierOrParameter();
				}
				break;
			case 68:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 898;
				this.match(esql_parser.FIRST);
				}
				break;
			case 71:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 899;
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
		this.enterRule(localctx, 170, esql_parser.RULE_mapExpression);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 902;
			this.match(esql_parser.LEFT_BRACES);
			this.state = 911;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===53) {
				{
				this.state = 903;
				this.entryExpression();
				this.state = 908;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===64) {
					{
					{
					this.state = 904;
					this.match(esql_parser.COMMA);
					this.state = 905;
					this.entryExpression();
					}
					}
					this.state = 910;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				}
			}

			this.state = 913;
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
		this.enterRule(localctx, 172, esql_parser.RULE_entryExpression);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 915;
			localctx._key = this.string_();
			this.state = 916;
			this.match(esql_parser.COLON);
			this.state = 917;
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
		this.enterRule(localctx, 174, esql_parser.RULE_mapValue);
		try {
			this.state = 921;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 53:
			case 54:
			case 55:
			case 67:
			case 74:
			case 78:
			case 80:
			case 89:
			case 90:
			case 97:
			case 99:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 919;
				this.constant();
				}
				break;
			case 94:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 920;
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
		this.enterRule(localctx, 176, esql_parser.RULE_constant);
		let _la: number;
		try {
			this.state = 965;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 88, this._ctx) ) {
			case 1:
				localctx = new NullLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 923;
				this.match(esql_parser.NULL);
				}
				break;
			case 2:
				localctx = new QualifiedIntegerLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 924;
				this.integerValue();
				this.state = 925;
				this.match(esql_parser.UNQUOTED_IDENTIFIER);
				}
				break;
			case 3:
				localctx = new DecimalLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 927;
				this.decimalValue();
				}
				break;
			case 4:
				localctx = new IntegerLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 928;
				this.integerValue();
				}
				break;
			case 5:
				localctx = new BooleanLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 5);
				{
				this.state = 929;
				this.booleanValue();
				}
				break;
			case 6:
				localctx = new InputParameterContext(this, localctx);
				this.enterOuterAlt(localctx, 6);
				{
				this.state = 930;
				this.parameter();
				}
				break;
			case 7:
				localctx = new StringLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 7);
				{
				this.state = 931;
				this.string_();
				}
				break;
			case 8:
				localctx = new NumericArrayLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 8);
				{
				this.state = 932;
				this.match(esql_parser.OPENING_BRACKET);
				this.state = 933;
				this.numericValue();
				this.state = 938;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===64) {
					{
					{
					this.state = 934;
					this.match(esql_parser.COMMA);
					this.state = 935;
					this.numericValue();
					}
					}
					this.state = 940;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 941;
				this.match(esql_parser.CLOSING_BRACKET);
				}
				break;
			case 9:
				localctx = new BooleanArrayLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 9);
				{
				this.state = 943;
				this.match(esql_parser.OPENING_BRACKET);
				this.state = 944;
				this.booleanValue();
				this.state = 949;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===64) {
					{
					{
					this.state = 945;
					this.match(esql_parser.COMMA);
					this.state = 946;
					this.booleanValue();
					}
					}
					this.state = 951;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 952;
				this.match(esql_parser.CLOSING_BRACKET);
				}
				break;
			case 10:
				localctx = new StringArrayLiteralContext(this, localctx);
				this.enterOuterAlt(localctx, 10);
				{
				this.state = 954;
				this.match(esql_parser.OPENING_BRACKET);
				this.state = 955;
				this.string_();
				this.state = 960;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===64) {
					{
					{
					this.state = 956;
					this.match(esql_parser.COMMA);
					this.state = 957;
					this.string_();
					}
					}
					this.state = 962;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 963;
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
		this.enterRule(localctx, 178, esql_parser.RULE_booleanValue);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 967;
			_la = this._input.LA(1);
			if(!(_la===67 || _la===80)) {
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
		this.enterRule(localctx, 180, esql_parser.RULE_numericValue);
		try {
			this.state = 971;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 89, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 969;
				this.decimalValue();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 970;
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
		this.enterRule(localctx, 182, esql_parser.RULE_decimalValue);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 974;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===89 || _la===90) {
				{
				this.state = 973;
				_la = this._input.LA(1);
				if(!(_la===89 || _la===90)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				}
			}

			this.state = 976;
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
		this.enterRule(localctx, 184, esql_parser.RULE_integerValue);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 979;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===89 || _la===90) {
				{
				this.state = 978;
				_la = this._input.LA(1);
				if(!(_la===89 || _la===90)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				}
			}

			this.state = 981;
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
		this.enterRule(localctx, 186, esql_parser.RULE_string);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 983;
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
		this.enterRule(localctx, 188, esql_parser.RULE_comparisonOperator);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 985;
			_la = this._input.LA(1);
			if(!(((((_la - 82)) & ~0x1F) === 0 && ((1 << (_la - 82)) & 125) !== 0))) {
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
		this.enterRule(localctx, 190, esql_parser.RULE_joinCommand);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 987;
			localctx._type_ = this._input.LT(1);
			_la = this._input.LA(1);
			if(!((((_la) & ~0x1F) === 0 && ((1 << _la) & 436207616) !== 0))) {
			    localctx._type_ = this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
			this.state = 988;
			this.match(esql_parser.JOIN);
			this.state = 989;
			this.joinTarget();
			this.state = 990;
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
		this.enterRule(localctx, 192, esql_parser.RULE_joinTarget);
		let _la: number;
		try {
			this.state = 1000;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 93, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 992;
				if (!(this.isDevVersion())) {
					throw this.createFailedPredicateException("this.isDevVersion()");
				}
				this.state = 993;
				localctx._index = this.indexPattern();
				this.state = 995;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===57) {
					{
					this.state = 994;
					this.match(esql_parser.AS);
					}
				}

				this.state = 997;
				localctx._qualifier = this.match(esql_parser.UNQUOTED_SOURCE);
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 999;
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
		this.enterRule(localctx, 194, esql_parser.RULE_joinCondition);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1002;
			this.match(esql_parser.ON);
			this.state = 1003;
			this.booleanExpression(0);
			this.state = 1008;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 94, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 1004;
					this.match(esql_parser.COMMA);
					this.state = 1005;
					this.booleanExpression(0);
					}
					}
				}
				this.state = 1010;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 94, this._ctx);
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
		this.enterRule(localctx, 196, esql_parser.RULE_promqlCommand);
		let _la: number;
		try {
			let _alt: number;
			this.state = 1043;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 100, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 1011;
				this.match(esql_parser.DEV_PROMQL);
				this.state = 1015;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 95, this._ctx);
				while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
					if (_alt === 1) {
						{
						{
						this.state = 1012;
						this.promqlParam();
						}
						}
					}
					this.state = 1017;
					this._errHandler.sync(this);
					_alt = this._interp.adaptivePredict(this._input, 95, this._ctx);
				}
				this.state = 1021;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===103 || _la===104) {
					{
					this.state = 1018;
					this.valueName();
					this.state = 1019;
					this.match(esql_parser.ASSIGN);
					}
				}

				this.state = 1023;
				this.match(esql_parser.LP);
				this.state = 1025;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				do {
					{
					{
					this.state = 1024;
					this.promqlQueryPart();
					}
					}
					this.state = 1027;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				} while (((((_la - 53)) & ~0x1F) === 0 && ((1 << (_la - 53)) & 2881) !== 0) || ((((_la - 97)) & ~0x1F) === 0 && ((1 << (_la - 97)) & 4305) !== 0) || ((((_la - 147)) & ~0x1F) === 0 && ((1 << (_la - 147)) & 7) !== 0));
				this.state = 1029;
				this.match(esql_parser.RP);
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 1031;
				this.match(esql_parser.DEV_PROMQL);
				this.state = 1035;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 98, this._ctx);
				while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
					if (_alt === 1) {
						{
						{
						this.state = 1032;
						this.promqlParam();
						}
						}
					}
					this.state = 1037;
					this._errHandler.sync(this);
					_alt = this._interp.adaptivePredict(this._input, 98, this._ctx);
				}
				this.state = 1039;
				this._errHandler.sync(this);
				_alt = 1;
				do {
					switch (_alt) {
					case 1:
						{
						{
						this.state = 1038;
						this.promqlQueryPart();
						}
						}
						break;
					default:
						throw new NoViableAltException(this);
					}
					this.state = 1041;
					this._errHandler.sync(this);
					_alt = this._interp.adaptivePredict(this._input, 99, this._ctx);
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
		this.enterRule(localctx, 198, esql_parser.RULE_valueName);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1045;
			_la = this._input.LA(1);
			if(!(_la===103 || _la===104)) {
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
		this.enterRule(localctx, 200, esql_parser.RULE_promqlParam);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1047;
			localctx._name = this.promqlParamName();
			this.state = 1048;
			this.match(esql_parser.ASSIGN);
			this.state = 1049;
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
		this.enterRule(localctx, 202, esql_parser.RULE_promqlParamName);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1051;
			_la = this._input.LA(1);
			if(!(_la===53 || ((((_la - 97)) & ~0x1F) === 0 && ((1 << (_la - 97)) & 193) !== 0))) {
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
		this.enterRule(localctx, 204, esql_parser.RULE_promqlParamValue);
		try {
			let _alt: number;
			this.state = 1063;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 53:
			case 103:
			case 109:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 1053;
				this.promqlIndexPattern();
				this.state = 1058;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 101, this._ctx);
				while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
					if (_alt === 1) {
						{
						{
						this.state = 1054;
						this.match(esql_parser.COMMA);
						this.state = 1055;
						this.promqlIndexPattern();
						}
						}
					}
					this.state = 1060;
					this._errHandler.sync(this);
					_alt = this._interp.adaptivePredict(this._input, 101, this._ctx);
				}
				}
				break;
			case 104:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 1061;
				this.match(esql_parser.QUOTED_IDENTIFIER);
				}
				break;
			case 97:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 1062;
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
		this.enterRule(localctx, 206, esql_parser.RULE_promqlQueryContent);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1065;
			_la = this._input.LA(1);
			if(!(((((_la - 53)) & ~0x1F) === 0 && ((1 << (_la - 53)) & 2881) !== 0) || ((((_la - 97)) & ~0x1F) === 0 && ((1 << (_la - 97)) & 4289) !== 0) || ((((_la - 147)) & ~0x1F) === 0 && ((1 << (_la - 147)) & 7) !== 0))) {
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
		this.enterRule(localctx, 208, esql_parser.RULE_promqlQueryPart);
		let _la: number;
		try {
			let _alt: number;
			this.state = 1080;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 53:
			case 59:
			case 61:
			case 62:
			case 64:
			case 97:
			case 103:
			case 104:
			case 109:
			case 147:
			case 148:
			case 149:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 1068;
				this._errHandler.sync(this);
				_alt = 1;
				do {
					switch (_alt) {
					case 1:
						{
						{
						this.state = 1067;
						this.promqlQueryContent();
						}
						}
						break;
					default:
						throw new NoViableAltException(this);
					}
					this.state = 1070;
					this._errHandler.sync(this);
					_alt = this._interp.adaptivePredict(this._input, 103, this._ctx);
				} while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER);
				}
				break;
			case 101:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 1072;
				this.match(esql_parser.LP);
				this.state = 1076;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (((((_la - 53)) & ~0x1F) === 0 && ((1 << (_la - 53)) & 2881) !== 0) || ((((_la - 97)) & ~0x1F) === 0 && ((1 << (_la - 97)) & 4305) !== 0) || ((((_la - 147)) & ~0x1F) === 0 && ((1 << (_la - 147)) & 7) !== 0)) {
					{
					{
					this.state = 1073;
					this.promqlQueryPart();
					}
					}
					this.state = 1078;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 1079;
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
		this.enterRule(localctx, 210, esql_parser.RULE_promqlIndexPattern);
		try {
			this.state = 1091;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 106, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 1082;
				this.promqlClusterString();
				this.state = 1083;
				this.match(esql_parser.COLON);
				this.state = 1084;
				this.promqlUnquotedIndexString();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 1086;
				this.promqlUnquotedIndexString();
				this.state = 1087;
				this.match(esql_parser.CAST_OP);
				this.state = 1088;
				this.promqlSelectorString();
				}
				break;
			case 3:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 1090;
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
		this.enterRule(localctx, 212, esql_parser.RULE_promqlClusterString);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1093;
			_la = this._input.LA(1);
			if(!(_la===103 || _la===109)) {
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
		this.enterRule(localctx, 214, esql_parser.RULE_promqlSelectorString);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1095;
			_la = this._input.LA(1);
			if(!(_la===103 || _la===109)) {
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
		this.enterRule(localctx, 216, esql_parser.RULE_promqlUnquotedIndexString);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1097;
			_la = this._input.LA(1);
			if(!(_la===103 || _la===109)) {
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
		this.enterRule(localctx, 218, esql_parser.RULE_promqlIndexString);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 1099;
			_la = this._input.LA(1);
			if(!(_la===53 || _la===103 || _la===109)) {
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
		case 77:
			return this.booleanExpression_sempred(localctx as BooleanExpressionContext, predIndex);
		case 81:
			return this.operatorExpression_sempred(localctx as OperatorExpressionContext, predIndex);
		case 82:
			return this.primaryExpression_sempred(localctx as PrimaryExpressionContext, predIndex);
		case 96:
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

	public static readonly _serializedATN: number[] = [4,1,159,1102,2,0,7,0,
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
	7,103,2,104,7,104,2,105,7,105,2,106,7,106,2,107,7,107,2,108,7,108,2,109,
	7,109,1,0,5,0,222,8,0,10,0,12,0,225,9,0,1,0,1,0,1,0,1,1,1,1,1,1,1,2,1,2,
	1,2,1,2,1,2,1,2,5,2,239,8,2,10,2,12,2,242,9,2,1,3,1,3,1,3,1,3,1,3,1,3,1,
	3,1,3,3,3,252,8,3,1,4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,1,
	4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,3,4,279,8,4,1,5,1,5,1,5,1,
	6,1,6,1,7,1,7,1,7,1,8,1,8,1,8,5,8,292,8,8,10,8,12,8,295,9,8,1,9,1,9,1,9,
	3,9,300,8,9,1,9,1,9,1,10,1,10,1,10,5,10,307,8,10,10,10,12,10,310,9,10,1,
	11,1,11,1,11,3,11,315,8,11,1,12,1,12,1,12,1,13,1,13,1,13,1,14,1,14,1,14,
	5,14,326,8,14,10,14,12,14,329,9,14,1,14,3,14,332,8,14,1,15,1,15,1,15,3,
	15,337,8,15,1,16,1,16,1,16,1,16,5,16,343,8,16,10,16,12,16,346,9,16,1,16,
	1,16,1,17,1,17,1,17,1,17,1,17,1,17,1,17,1,17,1,17,3,17,359,8,17,1,18,1,
	18,1,19,1,19,1,20,1,20,1,21,1,21,1,22,1,22,1,22,1,22,5,22,373,8,22,10,22,
	12,22,376,9,22,1,23,1,23,1,23,1,24,1,24,3,24,383,8,24,1,24,1,24,3,24,387,
	8,24,1,25,1,25,1,25,5,25,392,8,25,10,25,12,25,395,9,25,1,26,1,26,1,26,3,
	26,400,8,26,1,27,1,27,1,27,3,27,405,8,27,1,27,1,27,1,27,1,27,1,27,1,27,
	1,27,3,27,414,8,27,1,28,1,28,1,28,5,28,419,8,28,10,28,12,28,422,9,28,1,
	29,1,29,1,29,3,29,427,8,29,1,29,1,29,1,29,1,29,1,29,1,29,1,29,3,29,436,
	8,29,1,30,1,30,1,30,5,30,441,8,30,10,30,12,30,444,9,30,1,31,1,31,1,31,5,
	31,449,8,31,10,31,12,31,452,9,31,1,32,1,32,1,33,1,33,1,33,3,33,459,8,33,
	1,34,1,34,3,34,463,8,34,1,35,1,35,3,35,467,8,35,1,36,1,36,1,36,3,36,472,
	8,36,1,37,1,37,3,37,476,8,37,1,38,1,38,1,38,1,39,1,39,1,39,1,39,5,39,485,
	8,39,10,39,12,39,488,9,39,1,40,1,40,3,40,492,8,40,1,40,1,40,3,40,496,8,
	40,1,41,1,41,1,41,1,42,1,42,1,42,1,43,1,43,1,43,1,43,5,43,508,8,43,10,43,
	12,43,511,9,43,1,44,1,44,1,44,1,44,1,44,1,44,1,44,1,44,3,44,521,8,44,1,
	45,1,45,1,45,1,45,3,45,527,8,45,1,46,1,46,1,46,5,46,532,8,46,10,46,12,46,
	535,9,46,1,47,1,47,1,47,1,47,1,48,1,48,3,48,543,8,48,1,49,1,49,1,49,1,49,
	1,49,5,49,550,8,49,10,49,12,49,553,9,49,1,50,1,50,1,50,1,51,1,51,1,51,1,
	52,1,52,1,52,1,52,1,53,1,53,1,53,1,54,1,54,1,54,1,54,3,54,572,8,54,1,54,
	1,54,1,54,1,54,5,54,578,8,54,10,54,12,54,581,9,54,3,54,583,8,54,1,55,1,
	55,1,56,1,56,1,56,3,56,590,8,56,1,56,1,56,1,57,1,57,1,57,1,58,1,58,1,58,
	1,58,3,58,601,8,58,1,58,1,58,1,58,1,58,1,58,3,58,608,8,58,1,59,1,59,1,59,
	1,60,4,60,614,8,60,11,60,12,60,615,1,61,1,61,1,61,1,61,1,62,1,62,1,62,1,
	62,1,62,1,62,5,62,628,8,62,10,62,12,62,631,9,62,1,63,1,63,1,64,1,64,1,64,
	1,64,3,64,639,8,64,1,64,1,64,1,64,1,64,1,64,1,65,1,65,1,65,1,65,3,65,650,
	8,65,1,65,1,65,1,65,1,66,1,66,1,66,1,66,1,66,1,66,1,66,1,66,3,66,663,8,
	66,1,67,1,67,1,67,5,67,668,8,67,10,67,12,67,671,9,67,1,68,1,68,1,68,1,68,
	1,69,1,69,1,69,1,69,1,69,3,69,682,8,69,1,69,1,69,1,69,1,69,3,69,688,8,69,
	3,69,690,8,69,1,70,1,70,3,70,694,8,70,1,70,5,70,697,8,70,10,70,12,70,700,
	9,70,1,71,1,71,1,71,1,71,1,71,1,71,1,71,1,71,1,71,1,71,1,71,3,71,713,8,
	71,1,72,1,72,1,72,5,72,718,8,72,10,72,12,72,721,9,72,1,73,1,73,1,73,1,73,
	1,73,1,74,1,74,1,74,1,75,1,75,1,75,1,75,1,76,1,76,1,76,1,76,1,77,1,77,1,
	77,1,77,1,77,1,77,1,77,3,77,746,8,77,1,77,1,77,1,77,1,77,1,77,5,77,753,
	8,77,10,77,12,77,756,9,77,1,77,1,77,1,77,1,77,1,77,3,77,763,8,77,1,77,1,
	77,1,77,3,77,768,8,77,1,77,1,77,1,77,1,77,1,77,1,77,5,77,776,8,77,10,77,
	12,77,779,9,77,1,78,1,78,3,78,783,8,78,1,78,1,78,1,78,1,78,1,78,3,78,790,
	8,78,1,78,1,78,1,78,1,78,1,78,3,78,797,8,78,1,78,1,78,1,78,1,78,1,78,5,
	78,804,8,78,10,78,12,78,807,9,78,1,78,1,78,1,78,1,78,3,78,813,8,78,1,78,
	1,78,1,78,1,78,1,78,5,78,820,8,78,10,78,12,78,823,9,78,1,78,1,78,3,78,827,
	8,78,1,79,1,79,1,79,3,79,832,8,79,1,79,1,79,1,79,1,80,1,80,1,80,1,80,1,
	80,3,80,842,8,80,1,81,1,81,1,81,1,81,3,81,848,8,81,1,81,1,81,1,81,1,81,
	1,81,1,81,5,81,856,8,81,10,81,12,81,859,9,81,1,82,1,82,1,82,1,82,1,82,1,
	82,1,82,1,82,3,82,869,8,82,1,82,1,82,1,82,5,82,874,8,82,10,82,12,82,877,
	9,82,1,83,1,83,1,83,1,83,1,83,1,83,5,83,885,8,83,10,83,12,83,888,9,83,1,
	83,1,83,3,83,892,8,83,3,83,894,8,83,1,83,1,83,1,84,1,84,1,84,3,84,901,8,
	84,1,85,1,85,1,85,1,85,5,85,907,8,85,10,85,12,85,910,9,85,3,85,912,8,85,
	1,85,1,85,1,86,1,86,1,86,1,86,1,87,1,87,3,87,922,8,87,1,88,1,88,1,88,1,
	88,1,88,1,88,1,88,1,88,1,88,1,88,1,88,1,88,1,88,5,88,937,8,88,10,88,12,
	88,940,9,88,1,88,1,88,1,88,1,88,1,88,1,88,5,88,948,8,88,10,88,12,88,951,
	9,88,1,88,1,88,1,88,1,88,1,88,1,88,5,88,959,8,88,10,88,12,88,962,9,88,1,
	88,1,88,3,88,966,8,88,1,89,1,89,1,90,1,90,3,90,972,8,90,1,91,3,91,975,8,
	91,1,91,1,91,1,92,3,92,980,8,92,1,92,1,92,1,93,1,93,1,94,1,94,1,95,1,95,
	1,95,1,95,1,95,1,96,1,96,1,96,3,96,996,8,96,1,96,1,96,1,96,3,96,1001,8,
	96,1,97,1,97,1,97,1,97,5,97,1007,8,97,10,97,12,97,1010,9,97,1,98,1,98,5,
	98,1014,8,98,10,98,12,98,1017,9,98,1,98,1,98,1,98,3,98,1022,8,98,1,98,1,
	98,4,98,1026,8,98,11,98,12,98,1027,1,98,1,98,1,98,1,98,5,98,1034,8,98,10,
	98,12,98,1037,9,98,1,98,4,98,1040,8,98,11,98,12,98,1041,3,98,1044,8,98,
	1,99,1,99,1,100,1,100,1,100,1,100,1,101,1,101,1,102,1,102,1,102,5,102,1057,
	8,102,10,102,12,102,1060,9,102,1,102,1,102,3,102,1064,8,102,1,103,1,103,
	1,104,4,104,1069,8,104,11,104,12,104,1070,1,104,1,104,5,104,1075,8,104,
	10,104,12,104,1078,9,104,1,104,3,104,1081,8,104,1,105,1,105,1,105,1,105,
	1,105,1,105,1,105,1,105,1,105,3,105,1092,8,105,1,106,1,106,1,107,1,107,
	1,108,1,108,1,109,1,109,1,109,0,5,4,124,154,162,164,110,0,2,4,6,8,10,12,
	14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,46,48,50,52,54,56,58,60,
	62,64,66,68,70,72,74,76,78,80,82,84,86,88,90,92,94,96,98,100,102,104,106,
	108,110,112,114,116,118,120,122,124,126,128,130,132,134,136,138,140,142,
	144,146,148,150,152,154,156,158,160,162,164,166,168,170,172,174,176,178,
	180,182,184,186,188,190,192,194,196,198,200,202,204,206,208,210,212,214,
	216,218,0,14,2,0,53,53,109,109,1,0,103,104,2,0,58,58,65,65,2,0,68,68,71,
	71,2,0,42,42,53,53,1,0,89,90,1,0,91,93,2,0,67,67,80,80,2,0,82,82,84,88,
	2,0,25,25,27,28,3,0,53,53,97,97,103,104,8,0,53,53,59,59,61,62,64,64,97,
	97,103,104,109,109,147,149,2,0,103,103,109,109,3,0,53,53,103,103,109,109,
	1148,0,223,1,0,0,0,2,229,1,0,0,0,4,232,1,0,0,0,6,251,1,0,0,0,8,278,1,0,
	0,0,10,280,1,0,0,0,12,283,1,0,0,0,14,285,1,0,0,0,16,288,1,0,0,0,18,299,
	1,0,0,0,20,303,1,0,0,0,22,311,1,0,0,0,24,316,1,0,0,0,26,319,1,0,0,0,28,
	322,1,0,0,0,30,336,1,0,0,0,32,338,1,0,0,0,34,358,1,0,0,0,36,360,1,0,0,0,
	38,362,1,0,0,0,40,364,1,0,0,0,42,366,1,0,0,0,44,368,1,0,0,0,46,377,1,0,
	0,0,48,380,1,0,0,0,50,388,1,0,0,0,52,396,1,0,0,0,54,413,1,0,0,0,56,415,
	1,0,0,0,58,435,1,0,0,0,60,437,1,0,0,0,62,445,1,0,0,0,64,453,1,0,0,0,66,
	458,1,0,0,0,68,462,1,0,0,0,70,466,1,0,0,0,72,471,1,0,0,0,74,475,1,0,0,0,
	76,477,1,0,0,0,78,480,1,0,0,0,80,489,1,0,0,0,82,497,1,0,0,0,84,500,1,0,
	0,0,86,503,1,0,0,0,88,520,1,0,0,0,90,522,1,0,0,0,92,528,1,0,0,0,94,536,
	1,0,0,0,96,542,1,0,0,0,98,544,1,0,0,0,100,554,1,0,0,0,102,557,1,0,0,0,104,
	560,1,0,0,0,106,564,1,0,0,0,108,567,1,0,0,0,110,584,1,0,0,0,112,589,1,0,
	0,0,114,593,1,0,0,0,116,596,1,0,0,0,118,609,1,0,0,0,120,613,1,0,0,0,122,
	617,1,0,0,0,124,621,1,0,0,0,126,632,1,0,0,0,128,634,1,0,0,0,130,645,1,0,
	0,0,132,654,1,0,0,0,134,664,1,0,0,0,136,672,1,0,0,0,138,689,1,0,0,0,140,
	691,1,0,0,0,142,712,1,0,0,0,144,714,1,0,0,0,146,722,1,0,0,0,148,727,1,0,
	0,0,150,730,1,0,0,0,152,734,1,0,0,0,154,767,1,0,0,0,156,826,1,0,0,0,158,
	828,1,0,0,0,160,841,1,0,0,0,162,847,1,0,0,0,164,868,1,0,0,0,166,878,1,0,
	0,0,168,900,1,0,0,0,170,902,1,0,0,0,172,915,1,0,0,0,174,921,1,0,0,0,176,
	965,1,0,0,0,178,967,1,0,0,0,180,971,1,0,0,0,182,974,1,0,0,0,184,979,1,0,
	0,0,186,983,1,0,0,0,188,985,1,0,0,0,190,987,1,0,0,0,192,1000,1,0,0,0,194,
	1002,1,0,0,0,196,1043,1,0,0,0,198,1045,1,0,0,0,200,1047,1,0,0,0,202,1051,
	1,0,0,0,204,1063,1,0,0,0,206,1065,1,0,0,0,208,1080,1,0,0,0,210,1091,1,0,
	0,0,212,1093,1,0,0,0,214,1095,1,0,0,0,216,1097,1,0,0,0,218,1099,1,0,0,0,
	220,222,3,150,75,0,221,220,1,0,0,0,222,225,1,0,0,0,223,221,1,0,0,0,223,
	224,1,0,0,0,224,226,1,0,0,0,225,223,1,0,0,0,226,227,3,2,1,0,227,228,5,0,
	0,1,228,1,1,0,0,0,229,230,3,4,2,0,230,231,5,0,0,1,231,3,1,0,0,0,232,233,
	6,2,-1,0,233,234,3,6,3,0,234,240,1,0,0,0,235,236,10,1,0,0,236,237,5,52,
	0,0,237,239,3,8,4,0,238,235,1,0,0,0,239,242,1,0,0,0,240,238,1,0,0,0,240,
	241,1,0,0,0,241,5,1,0,0,0,242,240,1,0,0,0,243,252,3,24,12,0,244,252,3,14,
	7,0,245,252,3,106,53,0,246,252,3,26,13,0,247,248,4,3,1,0,248,252,3,102,
	51,0,249,250,4,3,2,0,250,252,3,196,98,0,251,243,1,0,0,0,251,244,1,0,0,0,
	251,245,1,0,0,0,251,246,1,0,0,0,251,247,1,0,0,0,251,249,1,0,0,0,252,7,1,
	0,0,0,253,279,3,46,23,0,254,279,3,10,5,0,255,279,3,82,41,0,256,279,3,76,
	38,0,257,279,3,48,24,0,258,279,3,78,39,0,259,279,3,84,42,0,260,279,3,86,
	43,0,261,279,3,90,45,0,262,279,3,98,49,0,263,279,3,108,54,0,264,279,3,100,
	50,0,265,279,3,190,95,0,266,279,3,116,58,0,267,279,3,130,65,0,268,279,3,
	132,66,0,269,279,3,114,57,0,270,279,3,118,59,0,271,279,3,128,64,0,272,279,
	3,138,69,0,273,279,3,140,70,0,274,275,4,4,3,0,275,279,3,146,73,0,276,277,
	4,4,4,0,277,279,3,148,74,0,278,253,1,0,0,0,278,254,1,0,0,0,278,255,1,0,
	0,0,278,256,1,0,0,0,278,257,1,0,0,0,278,258,1,0,0,0,278,259,1,0,0,0,278,
	260,1,0,0,0,278,261,1,0,0,0,278,262,1,0,0,0,278,263,1,0,0,0,278,264,1,0,
	0,0,278,265,1,0,0,0,278,266,1,0,0,0,278,267,1,0,0,0,278,268,1,0,0,0,278,
	269,1,0,0,0,278,270,1,0,0,0,278,271,1,0,0,0,278,272,1,0,0,0,278,273,1,0,
	0,0,278,274,1,0,0,0,278,276,1,0,0,0,279,9,1,0,0,0,280,281,5,18,0,0,281,
	282,3,154,77,0,282,11,1,0,0,0,283,284,3,64,32,0,284,13,1,0,0,0,285,286,
	5,14,0,0,286,287,3,16,8,0,287,15,1,0,0,0,288,293,3,18,9,0,289,290,5,64,
	0,0,290,292,3,18,9,0,291,289,1,0,0,0,292,295,1,0,0,0,293,291,1,0,0,0,293,
	294,1,0,0,0,294,17,1,0,0,0,295,293,1,0,0,0,296,297,3,54,27,0,297,298,5,
	59,0,0,298,300,1,0,0,0,299,296,1,0,0,0,299,300,1,0,0,0,300,301,1,0,0,0,
	301,302,3,154,77,0,302,19,1,0,0,0,303,308,3,22,11,0,304,305,5,64,0,0,305,
	307,3,22,11,0,306,304,1,0,0,0,307,310,1,0,0,0,308,306,1,0,0,0,308,309,1,
	0,0,0,309,21,1,0,0,0,310,308,1,0,0,0,311,314,3,54,27,0,312,313,5,59,0,0,
	313,315,3,154,77,0,314,312,1,0,0,0,314,315,1,0,0,0,315,23,1,0,0,0,316,317,
	5,19,0,0,317,318,3,28,14,0,318,25,1,0,0,0,319,320,5,20,0,0,320,321,3,28,
	14,0,321,27,1,0,0,0,322,327,3,30,15,0,323,324,5,64,0,0,324,326,3,30,15,
	0,325,323,1,0,0,0,326,329,1,0,0,0,327,325,1,0,0,0,327,328,1,0,0,0,328,331,
	1,0,0,0,329,327,1,0,0,0,330,332,3,44,22,0,331,330,1,0,0,0,331,332,1,0,0,
	0,332,29,1,0,0,0,333,337,3,34,17,0,334,335,4,15,5,0,335,337,3,32,16,0,336,
	333,1,0,0,0,336,334,1,0,0,0,337,31,1,0,0,0,338,339,5,101,0,0,339,344,3,
	24,12,0,340,341,5,52,0,0,341,343,3,8,4,0,342,340,1,0,0,0,343,346,1,0,0,
	0,344,342,1,0,0,0,344,345,1,0,0,0,345,347,1,0,0,0,346,344,1,0,0,0,347,348,
	5,102,0,0,348,33,1,0,0,0,349,350,3,36,18,0,350,351,5,62,0,0,351,352,3,40,
	20,0,352,359,1,0,0,0,353,354,3,40,20,0,354,355,5,61,0,0,355,356,3,38,19,
	0,356,359,1,0,0,0,357,359,3,42,21,0,358,349,1,0,0,0,358,353,1,0,0,0,358,
	357,1,0,0,0,359,35,1,0,0,0,360,361,5,109,0,0,361,37,1,0,0,0,362,363,5,109,
	0,0,363,39,1,0,0,0,364,365,5,109,0,0,365,41,1,0,0,0,366,367,7,0,0,0,367,
	43,1,0,0,0,368,369,5,108,0,0,369,374,5,109,0,0,370,371,5,64,0,0,371,373,
	5,109,0,0,372,370,1,0,0,0,373,376,1,0,0,0,374,372,1,0,0,0,374,375,1,0,0,
	0,375,45,1,0,0,0,376,374,1,0,0,0,377,378,5,10,0,0,378,379,3,16,8,0,379,
	47,1,0,0,0,380,382,5,17,0,0,381,383,3,50,25,0,382,381,1,0,0,0,382,383,1,
	0,0,0,383,386,1,0,0,0,384,385,5,60,0,0,385,387,3,16,8,0,386,384,1,0,0,0,
	386,387,1,0,0,0,387,49,1,0,0,0,388,393,3,52,26,0,389,390,5,64,0,0,390,392,
	3,52,26,0,391,389,1,0,0,0,392,395,1,0,0,0,393,391,1,0,0,0,393,394,1,0,0,
	0,394,51,1,0,0,0,395,393,1,0,0,0,396,399,3,18,9,0,397,398,5,18,0,0,398,
	400,3,154,77,0,399,397,1,0,0,0,399,400,1,0,0,0,400,53,1,0,0,0,401,402,4,
	27,6,0,402,404,5,99,0,0,403,405,5,103,0,0,404,403,1,0,0,0,404,405,1,0,0,
	0,405,406,1,0,0,0,406,407,5,100,0,0,407,408,5,66,0,0,408,409,5,99,0,0,409,
	410,3,56,28,0,410,411,5,100,0,0,411,414,1,0,0,0,412,414,3,56,28,0,413,401,
	1,0,0,0,413,412,1,0,0,0,414,55,1,0,0,0,415,420,3,72,36,0,416,417,5,66,0,
	0,417,419,3,72,36,0,418,416,1,0,0,0,419,422,1,0,0,0,420,418,1,0,0,0,420,
	421,1,0,0,0,421,57,1,0,0,0,422,420,1,0,0,0,423,424,4,29,7,0,424,426,5,99,
	0,0,425,427,5,140,0,0,426,425,1,0,0,0,426,427,1,0,0,0,427,428,1,0,0,0,428,
	429,5,100,0,0,429,430,5,66,0,0,430,431,5,99,0,0,431,432,3,60,30,0,432,433,
	5,100,0,0,433,436,1,0,0,0,434,436,3,60,30,0,435,423,1,0,0,0,435,434,1,0,
	0,0,436,59,1,0,0,0,437,442,3,66,33,0,438,439,5,66,0,0,439,441,3,66,33,0,
	440,438,1,0,0,0,441,444,1,0,0,0,442,440,1,0,0,0,442,443,1,0,0,0,443,61,
	1,0,0,0,444,442,1,0,0,0,445,450,3,58,29,0,446,447,5,64,0,0,447,449,3,58,
	29,0,448,446,1,0,0,0,449,452,1,0,0,0,450,448,1,0,0,0,450,451,1,0,0,0,451,
	63,1,0,0,0,452,450,1,0,0,0,453,454,7,1,0,0,454,65,1,0,0,0,455,459,5,140,
	0,0,456,459,3,68,34,0,457,459,3,70,35,0,458,455,1,0,0,0,458,456,1,0,0,0,
	458,457,1,0,0,0,459,67,1,0,0,0,460,463,5,78,0,0,461,463,5,97,0,0,462,460,
	1,0,0,0,462,461,1,0,0,0,463,69,1,0,0,0,464,467,5,96,0,0,465,467,5,98,0,
	0,466,464,1,0,0,0,466,465,1,0,0,0,467,71,1,0,0,0,468,472,3,64,32,0,469,
	472,3,68,34,0,470,472,3,70,35,0,471,468,1,0,0,0,471,469,1,0,0,0,471,470,
	1,0,0,0,472,73,1,0,0,0,473,476,3,186,93,0,474,476,3,68,34,0,475,473,1,0,
	0,0,475,474,1,0,0,0,476,75,1,0,0,0,477,478,5,12,0,0,478,479,3,176,88,0,
	479,77,1,0,0,0,480,481,5,16,0,0,481,486,3,80,40,0,482,483,5,64,0,0,483,
	485,3,80,40,0,484,482,1,0,0,0,485,488,1,0,0,0,486,484,1,0,0,0,486,487,1,
	0,0,0,487,79,1,0,0,0,488,486,1,0,0,0,489,491,3,154,77,0,490,492,7,2,0,0,
	491,490,1,0,0,0,491,492,1,0,0,0,492,495,1,0,0,0,493,494,5,75,0,0,494,496,
	7,3,0,0,495,493,1,0,0,0,495,496,1,0,0,0,496,81,1,0,0,0,497,498,5,32,0,0,
	498,499,3,62,31,0,499,83,1,0,0,0,500,501,5,31,0,0,501,502,3,62,31,0,502,
	85,1,0,0,0,503,504,5,35,0,0,504,509,3,88,44,0,505,506,5,64,0,0,506,508,
	3,88,44,0,507,505,1,0,0,0,508,511,1,0,0,0,509,507,1,0,0,0,509,510,1,0,0,
	0,510,87,1,0,0,0,511,509,1,0,0,0,512,513,3,58,29,0,513,514,5,57,0,0,514,
	515,3,58,29,0,515,521,1,0,0,0,516,517,3,58,29,0,517,518,5,59,0,0,518,519,
	3,58,29,0,519,521,1,0,0,0,520,512,1,0,0,0,520,516,1,0,0,0,521,89,1,0,0,
	0,522,523,5,9,0,0,523,524,3,164,82,0,524,526,3,186,93,0,525,527,3,92,46,
	0,526,525,1,0,0,0,526,527,1,0,0,0,527,91,1,0,0,0,528,533,3,94,47,0,529,
	530,5,64,0,0,530,532,3,94,47,0,531,529,1,0,0,0,532,535,1,0,0,0,533,531,
	1,0,0,0,533,534,1,0,0,0,534,93,1,0,0,0,535,533,1,0,0,0,536,537,3,64,32,
	0,537,538,5,59,0,0,538,539,3,176,88,0,539,95,1,0,0,0,540,541,5,81,0,0,541,
	543,3,170,85,0,542,540,1,0,0,0,542,543,1,0,0,0,543,97,1,0,0,0,544,545,5,
	11,0,0,545,546,3,164,82,0,546,551,3,186,93,0,547,548,5,64,0,0,548,550,3,
	186,93,0,549,547,1,0,0,0,550,553,1,0,0,0,551,549,1,0,0,0,551,552,1,0,0,
	0,552,99,1,0,0,0,553,551,1,0,0,0,554,555,5,30,0,0,555,556,3,54,27,0,556,
	101,1,0,0,0,557,558,5,6,0,0,558,559,3,104,52,0,559,103,1,0,0,0,560,561,
	5,101,0,0,561,562,3,4,2,0,562,563,5,102,0,0,563,105,1,0,0,0,564,565,5,37,
	0,0,565,566,5,156,0,0,566,107,1,0,0,0,567,568,5,5,0,0,568,571,3,110,55,
	0,569,570,5,76,0,0,570,572,3,58,29,0,571,569,1,0,0,0,571,572,1,0,0,0,572,
	582,1,0,0,0,573,574,5,81,0,0,574,579,3,112,56,0,575,576,5,64,0,0,576,578,
	3,112,56,0,577,575,1,0,0,0,578,581,1,0,0,0,579,577,1,0,0,0,579,580,1,0,
	0,0,580,583,1,0,0,0,581,579,1,0,0,0,582,573,1,0,0,0,582,583,1,0,0,0,583,
	109,1,0,0,0,584,585,7,4,0,0,585,111,1,0,0,0,586,587,3,58,29,0,587,588,5,
	59,0,0,588,590,1,0,0,0,589,586,1,0,0,0,589,590,1,0,0,0,590,591,1,0,0,0,
	591,592,3,58,29,0,592,113,1,0,0,0,593,594,5,15,0,0,594,595,3,176,88,0,595,
	115,1,0,0,0,596,597,5,4,0,0,597,600,3,54,27,0,598,599,5,76,0,0,599,601,
	3,54,27,0,600,598,1,0,0,0,600,601,1,0,0,0,601,607,1,0,0,0,602,603,5,57,
	0,0,603,604,3,54,27,0,604,605,5,64,0,0,605,606,3,54,27,0,606,608,1,0,0,
	0,607,602,1,0,0,0,607,608,1,0,0,0,608,117,1,0,0,0,609,610,5,21,0,0,610,
	611,3,120,60,0,611,119,1,0,0,0,612,614,3,122,61,0,613,612,1,0,0,0,614,615,
	1,0,0,0,615,613,1,0,0,0,615,616,1,0,0,0,616,121,1,0,0,0,617,618,5,101,0,
	0,618,619,3,124,62,0,619,620,5,102,0,0,620,123,1,0,0,0,621,622,6,62,-1,
	0,622,623,3,126,63,0,623,629,1,0,0,0,624,625,10,1,0,0,625,626,5,52,0,0,
	626,628,3,126,63,0,627,624,1,0,0,0,628,631,1,0,0,0,629,627,1,0,0,0,629,
	630,1,0,0,0,630,125,1,0,0,0,631,629,1,0,0,0,632,633,3,8,4,0,633,127,1,0,
	0,0,634,638,5,13,0,0,635,636,3,54,27,0,636,637,5,59,0,0,637,639,1,0,0,0,
	638,635,1,0,0,0,638,639,1,0,0,0,639,640,1,0,0,0,640,641,3,176,88,0,641,
	642,5,76,0,0,642,643,3,20,10,0,643,644,3,96,48,0,644,129,1,0,0,0,645,649,
	5,7,0,0,646,647,3,54,27,0,647,648,5,59,0,0,648,650,1,0,0,0,649,646,1,0,
	0,0,649,650,1,0,0,0,650,651,1,0,0,0,651,652,3,164,82,0,652,653,3,96,48,
	0,653,131,1,0,0,0,654,655,5,8,0,0,655,656,3,186,93,0,656,657,5,81,0,0,657,
	658,5,101,0,0,658,659,3,134,67,0,659,662,5,102,0,0,660,661,5,57,0,0,661,
	663,3,54,27,0,662,660,1,0,0,0,662,663,1,0,0,0,663,133,1,0,0,0,664,669,3,
	136,68,0,665,666,5,64,0,0,666,668,3,136,68,0,667,665,1,0,0,0,668,671,1,
	0,0,0,669,667,1,0,0,0,669,670,1,0,0,0,670,135,1,0,0,0,671,669,1,0,0,0,672,
	673,3,64,32,0,673,674,5,59,0,0,674,675,3,164,82,0,675,137,1,0,0,0,676,677,
	5,23,0,0,677,678,5,122,0,0,678,681,3,50,25,0,679,680,5,60,0,0,680,682,3,
	16,8,0,681,679,1,0,0,0,681,682,1,0,0,0,682,690,1,0,0,0,683,684,5,24,0,0,
	684,687,3,50,25,0,685,686,5,60,0,0,686,688,3,16,8,0,687,685,1,0,0,0,687,
	688,1,0,0,0,688,690,1,0,0,0,689,676,1,0,0,0,689,683,1,0,0,0,690,139,1,0,
	0,0,691,693,5,22,0,0,692,694,3,64,32,0,693,692,1,0,0,0,693,694,1,0,0,0,
	694,698,1,0,0,0,695,697,3,142,71,0,696,695,1,0,0,0,697,700,1,0,0,0,698,
	696,1,0,0,0,698,699,1,0,0,0,699,141,1,0,0,0,700,698,1,0,0,0,701,702,5,117,
	0,0,702,703,5,60,0,0,703,713,3,54,27,0,704,705,5,118,0,0,705,706,5,60,0,
	0,706,713,3,144,72,0,707,708,5,116,0,0,708,709,5,60,0,0,709,713,3,54,27,
	0,710,711,5,81,0,0,711,713,3,170,85,0,712,701,1,0,0,0,712,704,1,0,0,0,712,
	707,1,0,0,0,712,710,1,0,0,0,713,143,1,0,0,0,714,719,3,54,27,0,715,716,5,
	64,0,0,716,718,3,54,27,0,717,715,1,0,0,0,718,721,1,0,0,0,719,717,1,0,0,
	0,719,720,1,0,0,0,720,145,1,0,0,0,721,719,1,0,0,0,722,723,5,29,0,0,723,
	724,3,34,17,0,724,725,5,76,0,0,725,726,3,62,31,0,726,147,1,0,0,0,727,728,
	5,33,0,0,728,729,3,62,31,0,729,149,1,0,0,0,730,731,5,36,0,0,731,732,3,152,
	76,0,732,733,5,63,0,0,733,151,1,0,0,0,734,735,3,64,32,0,735,736,5,59,0,
	0,736,737,3,176,88,0,737,153,1,0,0,0,738,739,6,77,-1,0,739,740,5,73,0,0,
	740,768,3,154,77,8,741,768,3,160,80,0,742,768,3,156,78,0,743,745,3,160,
	80,0,744,746,5,73,0,0,745,744,1,0,0,0,745,746,1,0,0,0,746,747,1,0,0,0,747,
	748,5,69,0,0,748,749,5,101,0,0,749,754,3,160,80,0,750,751,5,64,0,0,751,
	753,3,160,80,0,752,750,1,0,0,0,753,756,1,0,0,0,754,752,1,0,0,0,754,755,
	1,0,0,0,755,757,1,0,0,0,756,754,1,0,0,0,757,758,5,102,0,0,758,768,1,0,0,
	0,759,760,3,160,80,0,760,762,5,70,0,0,761,763,5,73,0,0,762,761,1,0,0,0,
	762,763,1,0,0,0,763,764,1,0,0,0,764,765,5,74,0,0,765,768,1,0,0,0,766,768,
	3,158,79,0,767,738,1,0,0,0,767,741,1,0,0,0,767,742,1,0,0,0,767,743,1,0,
	0,0,767,759,1,0,0,0,767,766,1,0,0,0,768,777,1,0,0,0,769,770,10,5,0,0,770,
	771,5,56,0,0,771,776,3,154,77,6,772,773,10,4,0,0,773,774,5,77,0,0,774,776,
	3,154,77,5,775,769,1,0,0,0,775,772,1,0,0,0,776,779,1,0,0,0,777,775,1,0,
	0,0,777,778,1,0,0,0,778,155,1,0,0,0,779,777,1,0,0,0,780,782,3,160,80,0,
	781,783,5,73,0,0,782,781,1,0,0,0,782,783,1,0,0,0,783,784,1,0,0,0,784,785,
	5,72,0,0,785,786,3,74,37,0,786,827,1,0,0,0,787,789,3,160,80,0,788,790,5,
	73,0,0,789,788,1,0,0,0,789,790,1,0,0,0,790,791,1,0,0,0,791,792,5,79,0,0,
	792,793,3,74,37,0,793,827,1,0,0,0,794,796,3,160,80,0,795,797,5,73,0,0,796,
	795,1,0,0,0,796,797,1,0,0,0,797,798,1,0,0,0,798,799,5,72,0,0,799,800,5,
	101,0,0,800,805,3,74,37,0,801,802,5,64,0,0,802,804,3,74,37,0,803,801,1,
	0,0,0,804,807,1,0,0,0,805,803,1,0,0,0,805,806,1,0,0,0,806,808,1,0,0,0,807,
	805,1,0,0,0,808,809,5,102,0,0,809,827,1,0,0,0,810,812,3,160,80,0,811,813,
	5,73,0,0,812,811,1,0,0,0,812,813,1,0,0,0,813,814,1,0,0,0,814,815,5,79,0,
	0,815,816,5,101,0,0,816,821,3,74,37,0,817,818,5,64,0,0,818,820,3,74,37,
	0,819,817,1,0,0,0,820,823,1,0,0,0,821,819,1,0,0,0,821,822,1,0,0,0,822,824,
	1,0,0,0,823,821,1,0,0,0,824,825,5,102,0,0,825,827,1,0,0,0,826,780,1,0,0,
	0,826,787,1,0,0,0,826,794,1,0,0,0,826,810,1,0,0,0,827,157,1,0,0,0,828,831,
	3,54,27,0,829,830,5,61,0,0,830,832,3,12,6,0,831,829,1,0,0,0,831,832,1,0,
	0,0,832,833,1,0,0,0,833,834,5,62,0,0,834,835,3,176,88,0,835,159,1,0,0,0,
	836,842,3,162,81,0,837,838,3,162,81,0,838,839,3,188,94,0,839,840,3,162,
	81,0,840,842,1,0,0,0,841,836,1,0,0,0,841,837,1,0,0,0,842,161,1,0,0,0,843,
	844,6,81,-1,0,844,848,3,164,82,0,845,846,7,5,0,0,846,848,3,162,81,3,847,
	843,1,0,0,0,847,845,1,0,0,0,848,857,1,0,0,0,849,850,10,2,0,0,850,851,7,
	6,0,0,851,856,3,162,81,3,852,853,10,1,0,0,853,854,7,5,0,0,854,856,3,162,
	81,2,855,849,1,0,0,0,855,852,1,0,0,0,856,859,1,0,0,0,857,855,1,0,0,0,857,
	858,1,0,0,0,858,163,1,0,0,0,859,857,1,0,0,0,860,861,6,82,-1,0,861,869,3,
	176,88,0,862,869,3,54,27,0,863,869,3,166,83,0,864,865,5,101,0,0,865,866,
	3,154,77,0,866,867,5,102,0,0,867,869,1,0,0,0,868,860,1,0,0,0,868,862,1,
	0,0,0,868,863,1,0,0,0,868,864,1,0,0,0,869,875,1,0,0,0,870,871,10,1,0,0,
	871,872,5,61,0,0,872,874,3,12,6,0,873,870,1,0,0,0,874,877,1,0,0,0,875,873,
	1,0,0,0,875,876,1,0,0,0,876,165,1,0,0,0,877,875,1,0,0,0,878,879,3,168,84,
	0,879,893,5,101,0,0,880,894,5,91,0,0,881,886,3,154,77,0,882,883,5,64,0,
	0,883,885,3,154,77,0,884,882,1,0,0,0,885,888,1,0,0,0,886,884,1,0,0,0,886,
	887,1,0,0,0,887,891,1,0,0,0,888,886,1,0,0,0,889,890,5,64,0,0,890,892,3,
	170,85,0,891,889,1,0,0,0,891,892,1,0,0,0,892,894,1,0,0,0,893,880,1,0,0,
	0,893,881,1,0,0,0,893,894,1,0,0,0,894,895,1,0,0,0,895,896,5,102,0,0,896,
	167,1,0,0,0,897,901,3,72,36,0,898,901,5,68,0,0,899,901,5,71,0,0,900,897,
	1,0,0,0,900,898,1,0,0,0,900,899,1,0,0,0,901,169,1,0,0,0,902,911,5,94,0,
	0,903,908,3,172,86,0,904,905,5,64,0,0,905,907,3,172,86,0,906,904,1,0,0,
	0,907,910,1,0,0,0,908,906,1,0,0,0,908,909,1,0,0,0,909,912,1,0,0,0,910,908,
	1,0,0,0,911,903,1,0,0,0,911,912,1,0,0,0,912,913,1,0,0,0,913,914,5,95,0,
	0,914,171,1,0,0,0,915,916,3,186,93,0,916,917,5,62,0,0,917,918,3,174,87,
	0,918,173,1,0,0,0,919,922,3,176,88,0,920,922,3,170,85,0,921,919,1,0,0,0,
	921,920,1,0,0,0,922,175,1,0,0,0,923,966,5,74,0,0,924,925,3,184,92,0,925,
	926,5,103,0,0,926,966,1,0,0,0,927,966,3,182,91,0,928,966,3,184,92,0,929,
	966,3,178,89,0,930,966,3,68,34,0,931,966,3,186,93,0,932,933,5,99,0,0,933,
	938,3,180,90,0,934,935,5,64,0,0,935,937,3,180,90,0,936,934,1,0,0,0,937,
	940,1,0,0,0,938,936,1,0,0,0,938,939,1,0,0,0,939,941,1,0,0,0,940,938,1,0,
	0,0,941,942,5,100,0,0,942,966,1,0,0,0,943,944,5,99,0,0,944,949,3,178,89,
	0,945,946,5,64,0,0,946,948,3,178,89,0,947,945,1,0,0,0,948,951,1,0,0,0,949,
	947,1,0,0,0,949,950,1,0,0,0,950,952,1,0,0,0,951,949,1,0,0,0,952,953,5,100,
	0,0,953,966,1,0,0,0,954,955,5,99,0,0,955,960,3,186,93,0,956,957,5,64,0,
	0,957,959,3,186,93,0,958,956,1,0,0,0,959,962,1,0,0,0,960,958,1,0,0,0,960,
	961,1,0,0,0,961,963,1,0,0,0,962,960,1,0,0,0,963,964,5,100,0,0,964,966,1,
	0,0,0,965,923,1,0,0,0,965,924,1,0,0,0,965,927,1,0,0,0,965,928,1,0,0,0,965,
	929,1,0,0,0,965,930,1,0,0,0,965,931,1,0,0,0,965,932,1,0,0,0,965,943,1,0,
	0,0,965,954,1,0,0,0,966,177,1,0,0,0,967,968,7,7,0,0,968,179,1,0,0,0,969,
	972,3,182,91,0,970,972,3,184,92,0,971,969,1,0,0,0,971,970,1,0,0,0,972,181,
	1,0,0,0,973,975,7,5,0,0,974,973,1,0,0,0,974,975,1,0,0,0,975,976,1,0,0,0,
	976,977,5,55,0,0,977,183,1,0,0,0,978,980,7,5,0,0,979,978,1,0,0,0,979,980,
	1,0,0,0,980,981,1,0,0,0,981,982,5,54,0,0,982,185,1,0,0,0,983,984,5,53,0,
	0,984,187,1,0,0,0,985,986,7,8,0,0,986,189,1,0,0,0,987,988,7,9,0,0,988,989,
	5,126,0,0,989,990,3,192,96,0,990,991,3,194,97,0,991,191,1,0,0,0,992,993,
	4,96,14,0,993,995,3,34,17,0,994,996,5,57,0,0,995,994,1,0,0,0,995,996,1,
	0,0,0,996,997,1,0,0,0,997,998,5,109,0,0,998,1001,1,0,0,0,999,1001,3,34,
	17,0,1000,992,1,0,0,0,1000,999,1,0,0,0,1001,193,1,0,0,0,1002,1003,5,76,
	0,0,1003,1008,3,154,77,0,1004,1005,5,64,0,0,1005,1007,3,154,77,0,1006,1004,
	1,0,0,0,1007,1010,1,0,0,0,1008,1006,1,0,0,0,1008,1009,1,0,0,0,1009,195,
	1,0,0,0,1010,1008,1,0,0,0,1011,1015,5,34,0,0,1012,1014,3,200,100,0,1013,
	1012,1,0,0,0,1014,1017,1,0,0,0,1015,1013,1,0,0,0,1015,1016,1,0,0,0,1016,
	1021,1,0,0,0,1017,1015,1,0,0,0,1018,1019,3,198,99,0,1019,1020,5,59,0,0,
	1020,1022,1,0,0,0,1021,1018,1,0,0,0,1021,1022,1,0,0,0,1022,1023,1,0,0,0,
	1023,1025,5,101,0,0,1024,1026,3,208,104,0,1025,1024,1,0,0,0,1026,1027,1,
	0,0,0,1027,1025,1,0,0,0,1027,1028,1,0,0,0,1028,1029,1,0,0,0,1029,1030,5,
	102,0,0,1030,1044,1,0,0,0,1031,1035,5,34,0,0,1032,1034,3,200,100,0,1033,
	1032,1,0,0,0,1034,1037,1,0,0,0,1035,1033,1,0,0,0,1035,1036,1,0,0,0,1036,
	1039,1,0,0,0,1037,1035,1,0,0,0,1038,1040,3,208,104,0,1039,1038,1,0,0,0,
	1040,1041,1,0,0,0,1041,1039,1,0,0,0,1041,1042,1,0,0,0,1042,1044,1,0,0,0,
	1043,1011,1,0,0,0,1043,1031,1,0,0,0,1044,197,1,0,0,0,1045,1046,7,1,0,0,
	1046,199,1,0,0,0,1047,1048,3,202,101,0,1048,1049,5,59,0,0,1049,1050,3,204,
	102,0,1050,201,1,0,0,0,1051,1052,7,10,0,0,1052,203,1,0,0,0,1053,1058,3,
	210,105,0,1054,1055,5,64,0,0,1055,1057,3,210,105,0,1056,1054,1,0,0,0,1057,
	1060,1,0,0,0,1058,1056,1,0,0,0,1058,1059,1,0,0,0,1059,1064,1,0,0,0,1060,
	1058,1,0,0,0,1061,1064,5,104,0,0,1062,1064,5,97,0,0,1063,1053,1,0,0,0,1063,
	1061,1,0,0,0,1063,1062,1,0,0,0,1064,205,1,0,0,0,1065,1066,7,11,0,0,1066,
	207,1,0,0,0,1067,1069,3,206,103,0,1068,1067,1,0,0,0,1069,1070,1,0,0,0,1070,
	1068,1,0,0,0,1070,1071,1,0,0,0,1071,1081,1,0,0,0,1072,1076,5,101,0,0,1073,
	1075,3,208,104,0,1074,1073,1,0,0,0,1075,1078,1,0,0,0,1076,1074,1,0,0,0,
	1076,1077,1,0,0,0,1077,1079,1,0,0,0,1078,1076,1,0,0,0,1079,1081,5,102,0,
	0,1080,1068,1,0,0,0,1080,1072,1,0,0,0,1081,209,1,0,0,0,1082,1083,3,212,
	106,0,1083,1084,5,62,0,0,1084,1085,3,216,108,0,1085,1092,1,0,0,0,1086,1087,
	3,216,108,0,1087,1088,5,61,0,0,1088,1089,3,214,107,0,1089,1092,1,0,0,0,
	1090,1092,3,218,109,0,1091,1082,1,0,0,0,1091,1086,1,0,0,0,1091,1090,1,0,
	0,0,1092,211,1,0,0,0,1093,1094,7,12,0,0,1094,213,1,0,0,0,1095,1096,7,12,
	0,0,1096,215,1,0,0,0,1097,1098,7,12,0,0,1098,217,1,0,0,0,1099,1100,7,13,
	0,0,1100,219,1,0,0,0,107,223,240,251,278,293,299,308,314,327,331,336,344,
	358,374,382,386,393,399,404,413,420,426,435,442,450,458,462,466,471,475,
	486,491,495,509,520,526,533,542,551,571,579,582,589,600,607,615,629,638,
	649,662,669,681,687,689,693,698,712,719,745,754,762,767,775,777,782,789,
	796,805,812,821,826,831,841,847,855,857,868,875,886,891,893,900,908,911,
	921,938,949,960,965,971,974,979,995,1000,1008,1015,1021,1027,1035,1041,
	1043,1058,1063,1070,1076,1080,1091];

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
	public workflowCommand(): WorkflowCommandContext {
		return this.getTypedRuleContext(WorkflowCommandContext, 0) as WorkflowCommandContext;
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


export class WorkflowCommandContext extends ParserRuleContext {
	public _workflowId!: StringContext;
	public _targetField!: QualifiedNameContext;
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public WORKFLOW(): TerminalNode {
		return this.getToken(esql_parser.WORKFLOW, 0);
	}
	public WITH(): TerminalNode {
		return this.getToken(esql_parser.WITH, 0);
	}
	public LP(): TerminalNode {
		return this.getToken(esql_parser.LP, 0);
	}
	public workflowInputs(): WorkflowInputsContext {
		return this.getTypedRuleContext(WorkflowInputsContext, 0) as WorkflowInputsContext;
	}
	public RP(): TerminalNode {
		return this.getToken(esql_parser.RP, 0);
	}
	public string_(): StringContext {
		return this.getTypedRuleContext(StringContext, 0) as StringContext;
	}
	public AS(): TerminalNode {
		return this.getToken(esql_parser.AS, 0);
	}
	public qualifiedName(): QualifiedNameContext {
		return this.getTypedRuleContext(QualifiedNameContext, 0) as QualifiedNameContext;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_workflowCommand;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterWorkflowCommand) {
	 		listener.enterWorkflowCommand(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitWorkflowCommand) {
	 		listener.exitWorkflowCommand(this);
		}
	}
}


export class WorkflowInputsContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public workflowInput_list(): WorkflowInputContext[] {
		return this.getTypedRuleContexts(WorkflowInputContext) as WorkflowInputContext[];
	}
	public workflowInput(i: number): WorkflowInputContext {
		return this.getTypedRuleContext(WorkflowInputContext, i) as WorkflowInputContext;
	}
	public COMMA_list(): TerminalNode[] {
	    	return this.getTokens(esql_parser.COMMA);
	}
	public COMMA(i: number): TerminalNode {
		return this.getToken(esql_parser.COMMA, i);
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_workflowInputs;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterWorkflowInputs) {
	 		listener.enterWorkflowInputs(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitWorkflowInputs) {
	 		listener.exitWorkflowInputs(this);
		}
	}
}


export class WorkflowInputContext extends ParserRuleContext {
	public _name!: IdentifierContext;
	public _value!: PrimaryExpressionContext;
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public ASSIGN(): TerminalNode {
		return this.getToken(esql_parser.ASSIGN, 0);
	}
	public identifier(): IdentifierContext {
		return this.getTypedRuleContext(IdentifierContext, 0) as IdentifierContext;
	}
	public primaryExpression(): PrimaryExpressionContext {
		return this.getTypedRuleContext(PrimaryExpressionContext, 0) as PrimaryExpressionContext;
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_workflowInput;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterWorkflowInput) {
	 		listener.enterWorkflowInput(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitWorkflowInput) {
	 		listener.exitWorkflowInput(this);
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
	public _key!: FuseKeyByFieldsContext;
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
	public fuseKeyByFields(): FuseKeyByFieldsContext {
		return this.getTypedRuleContext(FuseKeyByFieldsContext, 0) as FuseKeyByFieldsContext;
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


export class FuseKeyByFieldsContext extends ParserRuleContext {
	constructor(parser?: esql_parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public qualifiedName_list(): QualifiedNameContext[] {
		return this.getTypedRuleContexts(QualifiedNameContext) as QualifiedNameContext[];
	}
	public qualifiedName(i: number): QualifiedNameContext {
		return this.getTypedRuleContext(QualifiedNameContext, i) as QualifiedNameContext;
	}
	public COMMA_list(): TerminalNode[] {
	    	return this.getTokens(esql_parser.COMMA);
	}
	public COMMA(i: number): TerminalNode {
		return this.getToken(esql_parser.COMMA, i);
	}
    public get ruleIndex(): number {
    	return esql_parser.RULE_fuseKeyByFields;
	}
	public enterRule(listener: esql_parserListener): void {
	    if(listener.enterFuseKeyByFields) {
	 		listener.enterFuseKeyByFields(this);
		}
	}
	public exitRule(listener: esql_parserListener): void {
	    if(listener.exitFuseKeyByFields) {
	 		listener.exitFuseKeyByFields(this);
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
