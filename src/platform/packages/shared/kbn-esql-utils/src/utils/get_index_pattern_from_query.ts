/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { Parser, getIndexFromPromQLParams, isSubQuery } from '@kbn/esql-language';
import type { ESQLSource, ESQLCommand, ESQLAstPromqlCommand } from '@kbn/esql-language';

function getPromQLSourcesFromAst(commands: ESQLCommand[]): string[] {
  const promqlCommand = commands.find(({ name }) => name === 'promql');
  if (!promqlCommand) {
    return [];
  }

  const index = getIndexFromPromQLParams(promqlCommand as ESQLAstPromqlCommand);
  return index ? [index] : [];
}

function getSourcesFromAst(commands: ESQLCommand[]): string[] {
  const sourceCommand = commands.find(({ name }) => ['from', 'ts'].includes(name));
  if (!sourceCommand) {
    return [];
  }

  const args = sourceCommand.args as ESQLSource[];
  return args
    .filter((arg): arg is ESQLSource => arg.sourceType === 'index')
    .map((index) => index.name);
}

function extractSubquerySources(sourceCommand: ESQLCommand): string[] {
  const subqueryArgs = sourceCommand.args.filter(isSubQuery);
  const subquerySources: string[] = [];

  for (const subquery of subqueryArgs) {
    const sources = getSourcesFromAst(subquery.child.commands);
    subquerySources.push(...sources);
  }

  return subquerySources;
}

/**
 * Retrieves the index pattern from an ES|QL query using AST parsing.
 * Handles both main queries and subqueries within FROM/TS commands.
 *
 * @param esql - The ES|QL query string to parse
 * @returns Comma-separated string of unique index names, or empty string if no sources found
 */
export function getIndexPatternFromESQLQuery(esql?: string): string {
  if (!esql?.trim()) {
    return '';
  }

  const { root } = Parser.parse(esql);
  const allSources: string[] = [];

  // Get sources from main query
  const mainSources = getSourcesFromAst(root.commands);
  const promqlSources = getPromQLSourcesFromAst(root.commands);
  allSources.push(...mainSources, ...promqlSources);

  // Get sources from subqueries
  const sourceCommand = root.commands.find(({ name }) => ['from', 'ts'].includes(name));
  if (sourceCommand) {
    const subquerySources = extractSubquerySources(sourceCommand);
    allSources.push(...subquerySources);
  }

  // Remove duplicates
  const uniqueSources = [...new Set(allSources)];

  return uniqueSources.join(',');
}
