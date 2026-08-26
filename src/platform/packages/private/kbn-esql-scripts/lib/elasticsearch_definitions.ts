/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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

const getKibanaRoot = (language: Language): string =>
  language === 'esql' ? ELASTICSEARCH_ESQL_KIBANA_ROOT : ELASTICSEARCH_PROMQL_KIBANA_ROOT;

/** Minimum shape of JSON definition objects from Elasticsearch; `name` is required for merge/sort. */
export interface ElasticsearchJsonDefinition {
  name: string;
}

export function readElasticsearchDefinitions<T extends ElasticsearchJsonDefinition>(
  options: ReadDefinitionsOptions
): T[] {
  const { pathToElasticsearch, keywordType: definitionType, language } = options;

  if (!pathToElasticsearch) {
    throw new Error(
      'Path to Elasticsearch is required. Usage: yarn make:defs <path/to/elasticsearch>'
    );
  }

  const definitionFilePaths = listDocDefinitionFiles({
    pathToElasticsearch,
    keywordType: definitionType,
    language,
    fileType: 'definition',
  });

  const definitions = mergeJsonDefinitionsFromFiles<T>(definitionFilePaths, definitionType);

  if (definitions.length === 0) {
    throw new Error(
      `No ${language} ${definitionType} definitions found under ${join(
        pathToElasticsearch,
        getKibanaRoot(language),
        'generated'
      )}. The Elasticsearch definitions layout may have changed.`
    );
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

  for (const filePath of definitionFilePaths) {
    if (!filePath.endsWith('.json')) {
      continue;
    }

    try {
      const fileContent = readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(fileContent);
      const { comment, ...rest } = parsed;
      definitions.push(rest);
    } catch (error) {
      throw new Error(
        `Failed to read ${definitionType} definition file ${filePath}: ${error.message}`
      );
    }
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
 * Resolves `.../kibana/generated` for a language, throwing a clear error when it is missing
 * (e.g. the Elasticsearch documentation layout changed).
 */
function resolveGeneratedRoot(pathToElasticsearch: string, language: Language): string {
  const generatedRoot = join(pathToElasticsearch, getKibanaRoot(language), 'generated');

  if (!existsSync(generatedRoot)) {
    throw new Error(
      `Could not find the Elasticsearch generated definitions directory at ${generatedRoot}. The Elasticsearch definitions layout may have changed.`
    );
  }

  return generatedRoot;
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
  const generatedRoot = resolveGeneratedRoot(pathToElasticsearch, language);

  const filePaths: string[] = [];

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

  return filePaths.sort();
}

/**
 * Recursively searches `dir` for the first file whose name matches `fileName`.
 * Returns the absolute path, or `undefined` if not found.
 */
function findFileRecursively(dir: string, fileName: string): string | undefined {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const entryPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      const found = findFileRecursively(entryPath, fileName);
      if (found) {
        return found;
      }
    } else if (entry.isFile() && entry.name === fileName) {
      return entryPath;
    }
  }

  return undefined;
}

export interface FindDefinitionFileOptions {
  pathToElasticsearch: string;
  language: Language;
  fileName: string;
}

/**
 * Locates a single named definition file (e.g. `inline_cast.json`) anywhere under
 * `.../kibana/generated`, regardless of which project directory holds it. Throws a clear
 * error if the generated root or the file cannot be found.
 */
export function findDefinitionFileByName({
  pathToElasticsearch,
  language,
  fileName,
}: FindDefinitionFileOptions): string {
  const generatedRoot = resolveGeneratedRoot(pathToElasticsearch, language);

  const filePath = findFileRecursively(generatedRoot, fileName);

  if (!filePath) {
    throw new Error(
      `Could not find "${fileName}" under ${generatedRoot}. The Elasticsearch definitions layout may have changed.`
    );
  }

  return filePath;
}
