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
export type Language = 'esql' | 'promql';

export interface ReadDefinitionsOptions {
  pathToElasticsearch: string;
  language: Language;
  definitionType: EsqlDefinitionType;
}

export const ELASTICSEARCH_ESQL_KIBANA_ROOT = 'docs/reference/query-languages/esql/kibana';
export const ELASTICSEARCH_PROMQL_KIBANA_ROOT = 'docs/reference/query-languages/promql/kibana';

export function readElasticsearchDefinitions<T extends Record<string, any>>(
  options: ReadDefinitionsOptions
): T[] {
  const { pathToElasticsearch, definitionType, language } = options;

  if (!pathToElasticsearch) {
    console.error('Error: Path to Elasticsearch is required.');
    console.error('Usage: yarn make:defs <path/to/elasticsearch>');
    process.exit(1);
  }

  const definitionDirectories = listEsqlDefinitionDirectories(
    pathToElasticsearch,
    definitionType,
    language
  );

  let definitions: T[] = [];

  try {
    definitions = mergeJsonDefinitionsFromDirectories<T>(definitionDirectories, definitionType);
  } catch (error) {
    const errorMessage = `An error occurred while reading ${definitionType} definitions: ${error.message}`;

    console.warn(`Warning: ${errorMessage} \n Skipping ${definitionType} definitions generation.`);
    process.exit(0);
  }

  if (definitions.length === 0) {
    console.log(`No ${definitionType} definitions found.`);
    process.exit(0);
  }

  return definitions;
}

/**
 * Gets all JSON files from the given directories and merges them into a single array of definitions.
 * This array is sorted by definition name.
 * @param definitionDirectories
 * @param definitionCategory
 * @returns
 */
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
 * Returns the list of directories that contains JSON definitions for a given definition type.
 * Searching on all projects: `.../esql/kibana/generated/<project>/definition/<definitionType>/`
 */
export function listEsqlDefinitionDirectories(
  pathToElasticsearch: string,
  definitionType: EsqlDefinitionType,
  language: Language
): string[] {
  const kibanaRoot =
    language === 'esql' ? ELASTICSEARCH_ESQL_KIBANA_ROOT : ELASTICSEARCH_PROMQL_KIBANA_ROOT;
  const generatedRoot = join(pathToElasticsearch, kibanaRoot, 'generated');

  if (existsSync(generatedRoot)) {
    const directories: string[] = [];
    for (const projectName of listProjectNames(generatedRoot)) {
      const dir = join(generatedRoot, projectName, 'definition', definitionType);
      if (existsSync(dir) && statSync(dir).isDirectory()) {
        directories.push(dir);
      }
    }
    return directories;
  }

  return [];
}
