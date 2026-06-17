/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { Parser, isSubQuery } from '@elastic/esql';
import { getIndexFromPromQLParams } from '@kbn/esql-language';
import type { ESQLSource, ESQLCommand, ESQLAstPromqlCommand } from '@elastic/esql/types';

const INDEX_SOURCE_COMMANDS = new Set(['FROM', 'TS']);
const SOURCE_SELECTOR_SEPARATOR = '::';

export interface ESQLIndexPatterns {
  indexPattern: string;
  indexPatternWithoutRemoteClusterPrefix: string;
}

function getPromQLSources(commands: ESQLCommand[]): string[] {
  const promqlCommand = commands.find(({ name }) => name === 'promql');
  if (!promqlCommand) {
    return [];
  }

  const index = getIndexFromPromQLParams(promqlCommand as ESQLAstPromqlCommand);
  return index ? [index] : [];
}

function getDirectIndexSources(commands: ESQLCommand[]): ESQLSource[] {
  const sourceCommand = commands.find(({ name }) => INDEX_SOURCE_COMMANDS.has(name.toUpperCase()));
  if (!sourceCommand) {
    return [];
  }

  return (sourceCommand.args as ESQLSource[]).filter(
    (arg): arg is ESQLSource => arg.sourceType === 'index'
  );
}

function getIndexSources(commands: ESQLCommand[]): ESQLSource[] {
  const sourceCommand = commands.find(({ name }) => INDEX_SOURCE_COMMANDS.has(name.toUpperCase()));
  if (!sourceCommand) {
    return [];
  }

  const directSources = (sourceCommand.args as ESQLSource[]).filter(
    (arg): arg is ESQLSource => arg.sourceType === 'index'
  );

  const subquerySources = sourceCommand.args
    .filter(isSubQuery)
    .flatMap((subquery) => getDirectIndexSources(subquery.child.commands));

  return [...directSources, ...subquerySources];
}

function getSourceNameWithoutRemoteClusterPrefix(source: ESQLSource): string {
  if (!source.prefix || !source.index) {
    return source.name;
  }

  const selector = source.selector ? `${SOURCE_SELECTOR_SEPARATOR}${source.selector.value}` : '';

  return `${source.index.value}${selector}`;
}

export function getIndexPatternsFromESQLQuery(esql?: string): ESQLIndexPatterns {
  if (!esql?.trim()) {
    return { indexPattern: '', indexPatternWithoutRemoteClusterPrefix: '' };
  }

  const { root } = Parser.parse(esql);
  const indexSources = getIndexSources(root.commands);
  const promqlSources = getPromQLSources(root.commands);

  const indexPattern = [...indexSources.map((source) => source.name), ...promqlSources];
  const indexPatternWithoutRemoteClusterPrefix = [
    ...indexSources.map(getSourceNameWithoutRemoteClusterPrefix),
    ...promqlSources,
  ];

  return {
    indexPattern: [...new Set(indexPattern)].join(','),
    indexPatternWithoutRemoteClusterPrefix: [
      ...new Set(indexPatternWithoutRemoteClusterPrefix),
    ].join(','),
  };
}

/**
 * Retrieves the index pattern from an ES|QL query using AST parsing.
 * Handles both main queries and subqueries within FROM/TS commands.
 *
 * @param esql - The ES|QL query string to parse
 * @returns Comma-separated string of unique index names, or empty string if no sources found
 */
export function getIndexPatternFromESQLQuery(esql?: string): string {
  return getIndexPatternsFromESQLQuery(esql).indexPattern;
}

/**
 * @param esql - The ES|QL query string to parse
 * @returns The source command name, or an empty string if not found
 */
export function getSourceCommandFromESQLQuery(esql?: string): string {
  if (!esql?.trim()) {
    return '';
  }

  const { root } = Parser.parse(esql);
  const sourceCommand = root.commands.find(({ name }) =>
    INDEX_SOURCE_COMMANDS.has(name.toUpperCase())
  );

  return sourceCommand?.name.toUpperCase() ?? '';
}
