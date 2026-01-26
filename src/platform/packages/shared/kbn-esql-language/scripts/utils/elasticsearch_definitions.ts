/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console */

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

export interface ReadDefinitionsOptions {
  pathToElasticsearch: string;
  definitionsPath: string;
  definitionType: string;
}

export function readElasticsearchDefinitions<T extends Record<string, any>>(
  options: ReadDefinitionsOptions
): T[] {
  const { pathToElasticsearch, definitionsPath, definitionType } = options;

  if (!pathToElasticsearch) {
    console.error('Error: Path to Elasticsearch is required.');
    console.error('Usage: yarn make:defs <path/to/elasticsearch>');
    process.exit(1);
  }

  const esDirectory = join(pathToElasticsearch, definitionsPath);
  let definitions: T[] = [];

  try {
    // Read and parse all Elasticsearch definition files
    definitions = readdirSync(esDirectory)
      .map((fileName) => {
        const filePath = join(esDirectory, fileName);
        const fileContent = readFileSync(filePath, 'utf-8');
        return JSON.parse(fileContent);
      })
      .map(({ comment, ...rest }) => rest);
  } catch (error: any) {
    const errorMessage =
      error.code === 'ENOENT'
        ? `${definitionType} directory not found at "${esDirectory}".`
        : `An error occurred while reading ${definitionType.toLowerCase()} definitions from "${esDirectory}": ${
            error.message
          }`;

    console.warn(
      `Warning: ${errorMessage} Skipping ${definitionType.toLowerCase()} definitions generation.`
    );
    process.exit(0);
  }

  if (definitions.length === 0) {
    console.log(`No ${definitionType.toLowerCase()} definitions found.`);
    process.exit(0);
  }

  return definitions;
}
