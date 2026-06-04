/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console */

import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';

export type ESDocsKeywordType = 'functions' | 'operators' | 'commands' | 'settings';
type FileType = 'definition' | 'docs';
type Language = 'esql' | 'promql';

export interface ReadDefinitionsOptions {
  pathToElasticsearch: string;
  language: Language;
  keywordType: ESDocsKeywordType;
}

export interface ListDefinitionDirectoriesOptions {
  pathToElasticsearch: string;
  keywordType: ESDocsKeywordType;
  language: Language;
  fileType: FileType;
}

export const ELASTICSEARCH_ESQL_KIBANA_ROOT = 'docs/reference/query-languages/esql/kibana';
export const ELASTICSEARCH_PROMQL_KIBANA_ROOT = 'docs/reference/query-languages/promql/kibana';

/** Minimum shape of JSON definition objects from Elasticsearch; `name` is required for merge/sort. */
export interface ElasticsearchJsonDefinition {
  name: string;
}

export function readElasticsearchDefinitions<T extends ElasticsearchJsonDefinition>(
  options: ReadDefinitionsOptions
): T[] {
  const { pathToElasticsearch, keywordType: definitionType, language } = options;

  if (!pathToElasticsearch) {
    console.error('Error: Path to Elasticsearch is required.');
    console.error('Usage: yarn make:defs <path/to/elasticsearch>');
    process.exit(1);
  }

  const definitionFilePaths = listDocDefinitionFiles({
    pathToElasticsearch,
    keywordType: definitionType,
    language,
    fileType: 'definition',
  });

  const definitions = mergeJsonDefinitionsFromFiles<T>(definitionFilePaths, definitionType);

  if (definitions.length === 0) {
    console.log(`No ${definitionType} definitions found.`);
    process.exit(0);
  }

  return definitions;
}

/**
 * Parses all `.json` paths and merges them into a single array of definitions.
 * This array is sorted by definition name.
 * @param definitionFilePaths absolute paths to JSON definition files (non-`.json` paths are ignored)
 * @param definitionType used only for error messages
 */
export function mergeJsonDefinitionsFromFiles<T extends ElasticsearchJsonDefinition>(
  definitionFilePaths: string[],
  definitionType: ESDocsKeywordType
): T[] {
  const definitions: T[] = [];

  try {
    for (const filePath of definitionFilePaths) {
      if (!filePath.endsWith('.json')) {
        continue;
      }

      const fileContent = readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(fileContent);
      const { comment, ...rest } = parsed;
      definitions.push(rest);
    }
  } catch (error) {
    const errorMessage = `An error occurred while merging ${definitionType} definitions: ${error.message}`;
    console.warn(`Warning: ${errorMessage} \n Skipping ${definitionType} definitions generation.`);
    process.exit(0);
  }

  return definitions.sort((definitionA, definitionB) =>
    definitionA.name.localeCompare(definitionB.name)
  );
}

/**
 * Returns the list of project names in the generated directory.
 */
function listProjectNames(generatedRoot: string): string[] {
  return readdirSync(generatedRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

/**
 * Finds `.../kibana/generated/<project>/<fileType>/<keywordType>/` for each project,
 * then returns every **file** path in those directories (not subdirectories).
 */
export function listDocDefinitionFiles({
  pathToElasticsearch,
  keywordType,
  language,
  fileType,
}: ListDefinitionDirectoriesOptions): string[] {
  const kibanaRoot =
    language === 'esql' ? ELASTICSEARCH_ESQL_KIBANA_ROOT : ELASTICSEARCH_PROMQL_KIBANA_ROOT;
  const generatedRoot = join(pathToElasticsearch, kibanaRoot, 'generated');

  const filePaths: string[] = [];

  if (existsSync(generatedRoot)) {
    for (const projectName of listProjectNames(generatedRoot)) {
      const dir = join(generatedRoot, projectName, fileType, keywordType);
      if (!existsSync(dir) || !statSync(dir).isDirectory()) {
        continue;
      }

      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isFile()) {
          filePaths.push(join(dir, entry.name));
        }
      }
    }
  }

  return filePaths.sort();
}
