/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ArgumentRole, CallSiteId, MapParameter } from './types';

const STRING_TYPES = ['keyword', 'text'] as const;

const NUMBER_TYPES = [
  'integer',
  'counter_integer',
  'double',
  'unsigned_long',
  'long',
  'counter_long',
  'counter_double',
] as const;

/** The `WITH` parameters of the commands that call an inference endpoint for a task. */
const inferenceParameters = (taskType: string): Record<string, MapParameter> => ({
  inference_id: { type: 'keyword', entityType: 'inference_endpoint', taskType },
});

const newColumn: ArgumentRole = { kind: 'new_name', of: 'column' };
const stringColumn: ArgumentRole = { kind: 'column', types: STRING_TYPES };
const columnList: ArgumentRole = { kind: 'column', wildcard: 'pattern', unique: true };

const POLICY: CallSiteId = 'enrichCommand.policyName';
const FUSE_TYPE: CallSiteId = 'fuseCommand.fuseType';
const SETTING: CallSiteId = 'setField>identifier';
const PROMQL_PARAM: CallSiteId = 'promqlParam.name';

/**
 * The role of each command argument, by the call site that takes it. A role on a call site
 * applies to everything below it that has no role of its own.
 */
export const ARGUMENT_ROLES: Readonly<Record<CallSiteId, ArgumentRole>> = {
  // Column lists.
  'keepCommand>qualifiedNamePatterns': columnList,
  'dropCommand>qualifiedNamePatterns': columnList,
  'mvExpandCommand>qualifiedName': { kind: 'column' },
  'renameClause.oldName': { kind: 'column' },
  'renameClause.newName': newColumn,

  // Expressions.
  // A filter is complete only as a whole boolean. It may hold subqueries, as
  // `a IN (FROM b | KEEP a)`.
  'whereCommand>booleanExpression': {
    kind: 'expression',
    mode: 'filter',
    types: ['boolean'],
    completeAs: 'boolean',
    subqueries: true,
  },
  // `name = expression` in a field list (EVAL, ROW, STATS, RERANK's ON): the name is a new column.
  'field>qualifiedName': newColumn,
  // EVAL's values may hold subqueries; full-text functions only inside SCORE.
  'evalCommand>fields': {
    kind: 'expression',
    mode: 'scalar',
    subqueries: true,
    fullTextOnlyIn: 'score',
  },
  // ROW has no input, so its values are literals, parameters and functions of them.
  'rowCommand>fields': { kind: 'expression', mode: 'constant' },
  'orderExpression>booleanExpression': { kind: 'expression', mode: 'scalar' },
  'limitCommand>constant': { kind: 'constant', valueType: 'integer', range: { min: 0 } },
  'limitByGroupKey>booleanExpression': { kind: 'expression', mode: 'scalar' },

  // Aggregations.
  'statsCommand.stats': { kind: 'expression', mode: 'aggregation' },
  'statsCommand.grouping': { kind: 'expression', mode: 'grouping' },
  'inlineStatsCommand.stats': { kind: 'expression', mode: 'aggregation' },
  'inlineStatsCommand.grouping': { kind: 'expression', mode: 'grouping' },
  // An aggregation's own filter, `AVG(a) WHERE b > 1`.
  'aggField>booleanExpression': {
    kind: 'expression',
    mode: 'filter',
    types: ['boolean'],
    completeAs: 'boolean',
    subqueries: true,
  },

  // Sources.
  'indexPatternOrSubquery>indexPattern': { kind: 'entity', entityType: 'source' },
  // FROM's sources may be subqueries, also nested, as `FROM a, (FROM b, (TS c))`.
  'fromCommand>indexPatternAndMetadataFields': {
    kind: 'entity',
    entityType: 'source',
    subqueries: true,
  },
  // TS reads time-series sources only.
  'timeSeriesCommand>indexPatternAndMetadataFields': {
    kind: 'entity',
    entityType: 'source',
    indexMode: 'time_series',
  },
  // Elasticsearch rejects a metadata field declared twice.
  'metadata>UNQUOTED_SOURCE': { kind: 'entity', entityType: 'metadata_field', unique: true },

  // Headers.
  // `SET <setting> = <value>;`: the value, a constant or a map, is what the setting defines.
  [SETTING]: { kind: 'entity', entityType: 'setting' },
  'setField>constant': { kind: 'dependent_value', on: SETTING, definedBy: 'setting' },
  'setField>mapExpression': { kind: 'dependent_value', on: SETTING, definedBy: 'setting' },
  // `LET <name> = (<subquery>);`: the name FROM reads the subquery by.
  'letBinding>UNQUOTED_IDENTIFIER': { kind: 'new_name', of: 'subquery' },

  // ENRICH.
  [POLICY]: { kind: 'entity', entityType: 'enrich_policy' },
  'enrichCommand.matchField': {
    kind: 'column',
    matches: { argument: POLICY, property: 'match_field' },
  },
  'enrichWithClause.newName': newColumn,
  'enrichWithClause.enrichField': {
    kind: 'entity',
    entityType: 'enrich_field',
    dependsOn: POLICY,
  },

  // JOIN.
  'joinTarget.index': { kind: 'entity', entityType: 'lookup_index' },
  'joinTarget>UNQUOTED_SOURCE': { kind: 'new_name', of: 'qualifier' },
  // A JOIN condition reads the columns of the input and of the lookup index.
  'joinCondition>booleanExpression': {
    kind: 'expression',
    mode: 'filter',
    types: ['boolean'],
    columnsOf: 'joinTarget.index',
  },

  // Extraction.
  'dissectCommand>primaryExpression': stringColumn,
  'dissectCommand>string': { kind: 'constant', valueType: 'string', format: 'dissect_pattern' },
  'dissectCommandOption>identifier': { kind: 'option_name', options: { APPEND_SEPARATOR: {} } },
  'dissectCommandOption>constant': { kind: 'constant', valueType: 'string', format: 'separator' },
  'grokCommand>primaryExpression': stringColumn,
  'grokCommand>string': { kind: 'constant', valueType: 'string', format: 'grok_pattern' },
  'uriPartsCommand>qualifiedName': newColumn,
  'uriPartsCommand>primaryExpression': stringColumn,
  'registeredDomainCommand>qualifiedName': newColumn,
  'registeredDomainCommand>primaryExpression': stringColumn,
  'userAgentCommand>qualifiedName': newColumn,
  'userAgentCommand>primaryExpression': { kind: 'expression', mode: 'scalar', types: STRING_TYPES },
  'userAgentCommand>commandNamedParameters': {
    kind: 'map',
    parameters: {
      regex_file: { type: 'keyword', default: '_default_' },
      extract_device_type: { type: 'boolean' },
      properties: { type: 'keyword', list: true, values: ['name', 'version', 'os', 'device'] },
    },
  },
  'ipLocationCommand>qualifiedName': newColumn,
  'ipLocationCommand>primaryExpression': {
    kind: 'expression',
    mode: 'scalar',
    types: ['ip', ...STRING_TYPES],
  },
  'ipLocationCommand>commandNamedParameters': {
    kind: 'map',
    parameters: {
      database_file: { type: 'keyword', default: 'GeoLite2-City.mmdb' },
      first_only: { type: 'boolean' },
      // The output columns of the database, which the command's output definition lists.
      properties: { type: 'keyword', list: true },
    },
  },

  // Sampling and change detection.
  'sampleCommand.probability': {
    kind: 'constant',
    valueType: 'double',
    range: { min: 0, max: 1, exclusive: true },
  },
  'changePointCommand.value': { kind: 'column', types: NUMBER_TYPES },
  'changePointCommand.key': { kind: 'column' },
  'changePointCommand.targetType': newColumn,
  'changePointCommand.targetPvalue': newColumn,
  'changePointCommand.booleanExpression': { kind: 'expression', mode: 'grouping' },

  // Inference.
  'completionCommand.targetField': newColumn,
  'completionCommand.prompt': {
    kind: 'expression',
    mode: 'scalar',
    types: STRING_TYPES,
    format: 'llm_prompt',
  },
  'completionCommand>commandNamedParameters': {
    kind: 'map',
    parameters: inferenceParameters('completion'),
  },
  'rerankCommand.targetField': newColumn,
  'rerankCommand.queryText': { kind: 'constant', valueType: 'string', format: 'search_query' },
  'rerankCommand.rerankFields': { kind: 'expression', mode: 'scalar', types: STRING_TYPES },
  'rerankCommand>commandNamedParameters': {
    kind: 'map',
    parameters: inferenceParameters('rerank'),
  },
  'denseVectorNaming.targetField': newColumn,
  'denseVectorNaming.suffixKeyword': { kind: 'option_name', options: { suffix: {} } },
  'denseVectorNaming.suffix': { kind: 'constant', valueType: 'string' },
  'denseVectorNaming.literalInput': { kind: 'constant', valueType: 'string' },
  'qualifiedNames>qualifiedName': stringColumn,
  'denseVectorCommand>commandNamedParameters': {
    kind: 'map',
    parameters: {
      // The multimodal step will make the task depend on `type`.
      ...inferenceParameters('text_embedding'),
      type: { type: 'keyword', values: ['text', 'image'], default: 'text' },
      timeout: { type: 'keyword', default: '30s' },
    },
  },

  // Search.
  // A vector the query compares rows with: a literal, a parameter or a function's result.
  'mmrCommand.queryVector': { kind: 'expression', mode: 'constant', types: ['dense_vector'] },
  'mmrCommand.diversifyField': { kind: 'column', types: ['dense_vector'] },
  'mmrCommand.limitValue': { kind: 'constant', valueType: 'integer' },
  'mmrCommand>commandNamedParameters': {
    kind: 'map',
    parameters: { lambda: { type: 'double', default: '0.5' } },
  },
  'highlightCommand.prefixKeyword': { kind: 'option_name', options: { prefix: {} } },
  'highlightCommand.prefix': { kind: 'constant', valueType: 'string', default: 'highlight_' },
  'highlightCommand.queryExpression': {
    kind: 'expression',
    mode: 'full_text',
    types: ['boolean'],
    format: 'highlight_text',
  },
  // `*` alone stands for every text and keyword column.
  'highlightCommand.highlightFields': { kind: 'column', types: STRING_TYPES, wildcard: 'alone' },
  'highlightCommand>commandNamedParameters': {
    kind: 'map',
    parameters: {
      analyzer: { type: 'keyword' },
      pre_tags: { type: 'keyword', default: '<em>' },
      post_tags: { type: 'keyword', default: '</em>' },
      number_of_fragments: { type: 'integer', default: '5' },
      fragment_size: { type: 'integer', default: '100' },
      encoder: { type: 'keyword', values: ['default', 'html'], default: 'default' },
      boundary_scanner: { type: 'keyword', values: ['sentence', 'word'], default: 'sentence' },
      boundary_scanner_locale: { type: 'keyword' },
      order: { type: 'keyword', values: ['none', 'score'], default: 'none' },
      no_match_size: { type: 'integer', default: '0' },
      max_analyzed_offset: { type: 'integer', default: '-1' },
    },
  },
  [FUSE_TYPE]: {
    kind: 'constant',
    valueType: 'identifier',
    allowedValues: ['linear', 'rrf'],
    default: 'rrf',
  },
  'fuseConfiguration.score': { kind: 'column', types: ['double'] },
  'fuseConfiguration.key': stringColumn,
  'fuseConfiguration.group': stringColumn,
  'fuseConfiguration.options': {
    kind: 'map',
    parameters: {
      rank_constant: { type: 'integer', default: '60', when: { [FUSE_TYPE]: ['rrf'] } },
      normalizer: {
        type: 'keyword',
        values: ['none', 'minmax'],
        when: { [FUSE_TYPE]: ['linear'] },
      },
      weights: { type: 'map', when: { [FUSE_TYPE]: ['rrf', 'linear'] } },
    },
  },

  // PROMQL: parameters, an optional name for the result, then the query in its own language.
  [PROMQL_PARAM]: {
    kind: 'option_name',
    options: {
      index: {},
      time: { conflictsWith: ['step', 'buckets', 'start', 'end'] },
      step: { conflictsWith: ['buckets', 'time'] },
      start: { conflictsWith: ['time'], requires: ['end'] },
      end: { conflictsWith: ['time'], requires: ['start'] },
      buckets: { conflictsWith: ['step', 'time'] },
      scrape_interval: {},
    },
  },
  'promqlParam.value': {
    kind: 'dependent_value',
    on: PROMQL_PARAM,
    roles: {
      index: { kind: 'entity', entityType: 'source', indexMode: 'time_series' },
      time: { kind: 'constant', valueType: 'date' },
      start: { kind: 'constant', valueType: 'date' },
      end: { kind: 'constant', valueType: 'date' },
      step: { kind: 'constant', valueType: 'duration' },
      scrape_interval: { kind: 'constant', valueType: 'duration' },
      buckets: { kind: 'constant', valueType: 'integer' },
    },
  },
  'promqlCommand>valueName': newColumn,
  'promqlCommand>promqlQueryPart': { kind: 'sublanguage', language: 'promql' },
  // The whole query given as a parameter.
  'promqlCommand>NAMED_OR_POSITIONAL_PARAM': { kind: 'parameter' },
};

/**
 * What a rule usually is, for a place no command signature covers. It makes a command that is
 * new in the grammar usable before anyone describes it; the description then refines it.
 */
export const DEFAULT_ROLES: Readonly<Record<string, ArgumentRole>> = {
  qualifiedName: { kind: 'column' },
  qualifiedNamePattern: { kind: 'column', wildcard: 'pattern' },
  constant: { kind: 'constant', valueType: 'any' },
  string: { kind: 'constant', valueType: 'string' },
  integerValue: { kind: 'constant', valueType: 'integer' },
  parameter: { kind: 'parameter' },
  indexPattern: { kind: 'entity', entityType: 'source' },
  enrichPolicyName: { kind: 'entity', entityType: 'enrich_policy' },
};

/** The default role of an expression, whatever rule it starts with. */
export const DEFAULT_EXPRESSION_ROLE: ArgumentRole = { kind: 'expression', mode: 'scalar' };
