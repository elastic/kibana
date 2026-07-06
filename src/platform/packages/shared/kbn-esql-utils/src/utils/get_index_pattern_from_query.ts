/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { Parser, isSubQuery } from '@elastic/esql';
import { esqlCommandRegistry, getIndexFromPromQLParams } from '@kbn/esql-language';
import type { ESQLSource, ESQLCommand, ESQLAstPromqlCommand } from '@elastic/esql/types';

const INDEX_SOURCE_COMMANDS = new Set(['FROM', 'TS']);
const ALL_SOURCE_COMMANDS = new Set(
  esqlCommandRegistry.getSourceCommandNames().map((commandName) => commandName.toUpperCase())
);
const SOURCE_SELECTOR_SEPARATOR = '::';
const UNKNOWN_DATA_SOURCE_CATEGORY = 'unknown';
const DATA_SOURCE_CATEGORIES = ['logs', 'metrics', 'traces'] as const;

export type ESQLDataSourceCategory =
  | (typeof DATA_SOURCE_CATEGORIES)[number]
  | typeof UNKNOWN_DATA_SOURCE_CATEGORY;

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

function stripSourceSelector(sourceName: string): string {
  return sourceName.split(SOURCE_SELECTOR_SEPARATOR)[0];
}

function stripSourceQuotes(sourceName: string): string {
  if (sourceName.startsWith('"') && sourceName.endsWith('"')) {
    return sourceName.slice(1, -1);
  }

  return sourceName;
}

function stripRemoteClusterPrefix(sourceName: string): string {
  const remoteClusterSeparatorIndex = sourceName.lastIndexOf(':');

  return remoteClusterSeparatorIndex === -1
    ? sourceName
    : sourceName.slice(remoteClusterSeparatorIndex + 1);
}

function getCategoryForSourceName(sourceName: string): ESQLDataSourceCategory {
  const normalizedSourceName = stripRemoteClusterPrefix(
    stripSourceSelector(stripSourceQuotes(sourceName))
  ).toLowerCase();
  const category = DATA_SOURCE_CATEGORIES.find(
    (candidate) =>
      normalizedSourceName === candidate ||
      normalizedSourceName.startsWith(`${candidate}-`) ||
      normalizedSourceName.startsWith(`${candidate}.`)
  );

  return category ?? UNKNOWN_DATA_SOURCE_CATEGORY;
}

function getIndexPatternsFromCommands(commands: ESQLCommand[]): ESQLIndexPatterns {
  const indexSources = getIndexSources(commands);
  const promqlSources = getPromQLSources(commands);

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

export function getIndexPatternsFromESQLQuery(esql?: string): ESQLIndexPatterns {
  if (!esql?.trim()) {
    return { indexPattern: '', indexPatternWithoutRemoteClusterPrefix: '' };
  }

  const { root } = Parser.parse(esql);
  return getIndexPatternsFromCommands(root.commands);
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
 * @param supportedSourceCommands - Source command set to match, or '*' to match all registered source commands
 * @returns The source command name, or an empty string if not found
 */
export function getSourceCommandFromESQLQuery(
  esql: string | undefined,
  supportedSourceCommands: Set<string> | '*' = INDEX_SOURCE_COMMANDS
): string {
  if (!esql?.trim()) {
    return '';
  }

  try {
    const { root, errors } = Parser.parse(esql);
    if (errors.length > 0) {
      return '';
    }

    const sourceCommandNames =
      supportedSourceCommands === '*' ? ALL_SOURCE_COMMANDS : supportedSourceCommands;
    const sourceCommand = root.commands.find(({ name }) =>
      sourceCommandNames.has(name.toUpperCase())
    );

    return sourceCommand?.name.toUpperCase() ?? '';
  } catch {
    return '';
  }
}

export function getDataSourceCategoryFromESQLQuery(esql?: string): ESQLDataSourceCategory {
  let indexPatterns: ESQLIndexPatterns;
  try {
    if (!esql?.trim()) {
      return UNKNOWN_DATA_SOURCE_CATEGORY;
    }

    const { root, errors } = Parser.parse(esql);
    if (errors.length > 0) {
      return UNKNOWN_DATA_SOURCE_CATEGORY;
    }

    indexPatterns = getIndexPatternsFromCommands(root.commands);
  } catch {
    return UNKNOWN_DATA_SOURCE_CATEGORY;
  }

  const sourceNames = indexPatterns.indexPatternWithoutRemoteClusterPrefix
    .split(',')
    .map((sourceName) => sourceName.trim())
    .filter(Boolean);

  if (sourceNames.length === 0) {
    return UNKNOWN_DATA_SOURCE_CATEGORY;
  }

  const categories = new Set(sourceNames.map(getCategoryForSourceName));

  return categories.size === 1
    ? categories.values().next().value ?? UNKNOWN_DATA_SOURCE_CATEGORY
    : UNKNOWN_DATA_SOURCE_CATEGORY;
}
