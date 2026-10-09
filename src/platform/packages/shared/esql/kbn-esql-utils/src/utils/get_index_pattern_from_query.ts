/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { BasicPrettyPrinter, Parser, isSource, isSubQuery, synth } from '@elastic/esql';
import { esqlCommandRegistry, getIndexFromPromQLParams } from '@kbn/esql-language';
import type { ESQLSource, ESQLCommand, ESQLAstPromqlCommand } from '@elastic/esql/types';

const INDEX_SOURCE_COMMANDS = new Set(['FROM', 'TS']);
const ALL_SOURCE_COMMANDS = new Set(
  esqlCommandRegistry.getSourceCommandNames().map((commandName) => commandName.toUpperCase())
);
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
 * @param supportedSourceCommands - Source command set to match, defaults to FROM and TS
 * @returns The source command name, or an empty string if not found
 */
export function getSourceCommandFromESQLQuery(
  esql: string | undefined,
  supportedSourceCommands: Set<string> = INDEX_SOURCE_COMMANDS
): string {
  if (!esql?.trim()) {
    return '';
  }

  const { root } = Parser.parse(esql);
  const sourceCommand = root.commands.find(({ name }) =>
    supportedSourceCommands.has(name.toUpperCase())
  );

  return sourceCommand?.name.toUpperCase() ?? '';
}

// A DSL filter applies to every source's documents before a subquery's own commands,
// so a subquery contributes the fields of its source command.
const reduceSubqueriesToSource = (command: ESQLCommand): ESQLCommand => ({
  ...command,
  args: command.args.map((arg) => {
    if (!isSubQuery(arg)) {
      return arg;
    }
    const [subquerySource] = arg.child.commands;
    return {
      ...arg,
      child: {
        ...arg.child,
        commands: subquerySource ? [reduceSubqueriesToSource(subquerySource)] : [],
      },
    };
  }),
});

/**
 * Returns the FROM or TS command alone (with METADATA, and each subquery reduced to its source
 * command), whose columns are the schema of the queried dataset; for PROMQL, `FROM <index>` of
 * its index parameter. `SET project_routing` is left out, so the text matches the ES|QL editor's
 * fields query; pass the routing separately. Empty string if there is no such command.
 */
export function getSourceCommandQueryFromESQLQuery(esql: string | undefined): string {
  if (!esql?.trim()) {
    return '';
  }

  const { root } = Parser.parse(esql);
  const sourceCommand = root.commands.find(({ name }) =>
    INDEX_SOURCE_COMMANDS.has(name.toUpperCase())
  );

  if (sourceCommand) {
    // Nothing to describe yet, e.g. `FROM ` while typing.
    const hasSources = sourceCommand.args.some((arg) => isSource(arg) || isSubQuery(arg));
    return hasSources ? BasicPrettyPrinter.command(reduceSubqueriesToSource(sourceCommand)) : '';
  }

  const [promqlIndex] = getPromQLSources(root.commands);
  return promqlIndex ? synth.cmd`FROM ${promqlIndex}`.toString() : '';
}

/**
 * Retrieves the source command name from an ES|QL query,
 * matching any source command (FROM, TS, PROMQL, etc.)
 * @param esql - The ES|QL query string to parse
 * @returns The source command name, or an empty string if not found
 */
export function getAnySourceCommandFromESQLQuery(esql?: string): string {
  return getSourceCommandFromESQLQuery(esql, ALL_SOURCE_COMMANDS);
}
