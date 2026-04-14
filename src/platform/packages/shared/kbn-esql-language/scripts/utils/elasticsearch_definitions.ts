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

export type EsqlDefinitionType = 'functions' | 'operators' | 'commands' | 'settings';

export interface ReadDefinitionsOptions {
  pathToElasticsearch: string;
  definitionType: EsqlDefinitionType;
}

export const ELASTICSEARCH_ESQL_KIBANA_ROOT = 'docs/reference/query-languages/esql/kibana';

export function readElasticsearchDefinitions<T extends Record<string, any>>(
  options: ReadDefinitionsOptions
): T[] {
  const { pathToElasticsearch, definitionType: definitionCategory } = options;

  if (!pathToElasticsearch) {
    console.error('Error: Path to Elasticsearch is required.');
    console.error('Usage: yarn make:defs <path/to/elasticsearch>');
    process.exit(1);
  }

  const definitionDirectories = listEsqlDefinitionDirectories(
    pathToElasticsearch,
    definitionCategory
  );

  let definitions: T[] = [];

  try {
    definitions = mergeJsonDefinitionsFromDirectories<T>(definitionDirectories, definitionCategory);
  } catch (error) {
    const errorMessage = `An error occurred while reading ${definitionCategory} definitions: ${error.message}`;

    console.warn(
      `Warning: ${errorMessage} \n Skipping ${definitionCategory} definitions generation.`
    );
    process.exit(0);
  }

  if (definitions.length === 0) {
    console.log(`No ${definitionCategory} definitions found.`);
    process.exit(0);
  }

  return definitions;
}

export function mergeJsonDefinitionsFromDirectories<T extends Record<string, any>>(
  definitionDirectories: string[],
  definitionCategory: EsqlDefinitionType
): T[] {
  const definitions: T[] = [];

  try {
    for (const esDirectory of definitionDirectories) {
      const jsonFiles = readdirSync(esDirectory).filter((fileName) => fileName.endsWith('.json'));

      for (const fileName of jsonFiles) {
        const filePath = join(esDirectory, fileName);
        const fileContent = readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(fileContent);
        const { comment, ...rest } = parsed;
        definitions.push(rest);
      }
    }
  } catch (error) {
    const errorMessage = `An error occurred while merging ${definitionCategory} definitions: ${error.message}`;
    console.warn(
      `Warning: ${errorMessage} \n Skipping ${definitionCategory} definitions generation.`
    );
    process.exit(0);
  }

  return definitions;
}

/**
 * Returns the list of project names in the generated directory.
 */
function listSortedProjectNames(generatedRoot: string): string[] {
  return readdirSync(generatedRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

/**
 * Returns the list of directories that contains JSON definitions for a given category.
 * Searching on all projects: `.../esql/kibana/generated/<project>/definition/<category>/`
 */
export function listEsqlDefinitionDirectories(
  pathToElasticsearch: string,
  category: EsqlDefinitionType
): string[] {
  const generatedRoot = join(pathToElasticsearch, ELASTICSEARCH_ESQL_KIBANA_ROOT, 'generated');

  if (existsSync(generatedRoot)) {
    const directories: string[] = [];
    for (const projectName of listSortedProjectNames(generatedRoot)) {
      const dir = join(generatedRoot, projectName, 'definition', category);
      if (existsSync(dir) && statSync(dir).isDirectory()) {
        directories.push(dir);
      }
    }
    return directories;
  }

  return [];
}

/**
 * Absolute paths to `inline_cast.json` for every generated project that defines one (sorted by project name).
 */
export function listEsqlInlineCastJsonPaths(pathToElasticsearch: string): string[] {
  const generatedRoot = join(ELASTICSEARCH_ESQL_KIBANA_ROOT, 'generated');
  const paths: string[] = [];

  if (existsSync(generatedRoot)) {
    for (const projectName of listSortedProjectNames(generatedRoot)) {
      const candidate = join(generatedRoot, projectName, 'definition', 'inline_cast.json');
      if (existsSync(candidate) && statSync(candidate).isFile()) {
        paths.push(candidate);
      }
    }
    return paths;
  }

  const legacy = join(ELASTICSEARCH_ESQL_KIBANA_ROOT, 'definition', 'inline_cast.json');
  if (existsSync(legacy) && statSync(legacy).isFile()) {
    return [legacy];
  }

  return [];
}
