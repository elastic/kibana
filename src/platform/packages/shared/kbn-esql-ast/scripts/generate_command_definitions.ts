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
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import type { ElasticsearchCommandDefinition } from '../src/definitions/types';

const GENERATED_COMMANDS_BASE_PATH = '../src/definitions/generated/commands';
const ELASTICSEARCH_COMMANDS_PATH =
  '/docs/reference/query-languages/esql/kibana/definition/commands';

async function generateElasticsearchCommandDefinitions(): Promise<void> {
  const pathToElasticsearch = process.argv[2];

  if (!pathToElasticsearch) {
    console.error('Error: Path to Elasticsearch is required.');
    console.error('Usage: yarn make:defs <path/to/elasticsearch>');
    process.exit(1);
  }

  const esCommandsDirectory = join(pathToElasticsearch, ELASTICSEARCH_COMMANDS_PATH);
  let esCommandDefinitions: ElasticsearchCommandDefinition[] = [];

  try {
    // Read and parse all Elasticsearch command definition files
    esCommandDefinitions = readdirSync(esCommandsDirectory)
      .map((fileName) => {
        const filePath = join(esCommandsDirectory, fileName);
        const fileContent = readFileSync(filePath, 'utf-8');

        return JSON.parse(fileContent);
      })
      .map(({ comment, ...rest }) => rest);
  } catch (error) {
    const errorMessage =
      error.code === 'ENOENT'
        ? `Commands directory not found at "${esCommandsDirectory}".`
        : `An error occurred while reading command definitions from "${esCommandsDirectory}": ${error.message}`;

    console.warn(`Warning: ${errorMessage} Skipping command definitions generation.`);
    process.exit(0);
  }

  if (esCommandDefinitions.length === 0) {
    console.log(`No command definitions found in "${esCommandsDirectory}".`);
    process.exit(0);
  }

  const outputCommandsDir = join(__dirname, GENERATED_COMMANDS_BASE_PATH);
  await mkdir(outputCommandsDir, { recursive: true });

  const commandsMetadata: Record<string, ElasticsearchCommandDefinition> = {};

  // Populate the metadata object without the comment field
  esCommandDefinitions.forEach((command) => {
    // Normalize the license field to lowercase, to agree with the licensing types
    const updatedComand = {
      ...command,
      license: command.license?.toLowerCase() as typeof command.license,
    };
    commandsMetadata[command.name] = updatedComand;
  });

  const outputTsPath = join(outputCommandsDir, 'commands.ts');
  const tsContent = `
// This file is auto-generated. Do not edit it manually.

export const commandsMetadata: Record<string, unknown> = ${JSON.stringify(
    commandsMetadata,
    null,
    2
  )};
`;

  await writeFile(outputTsPath, tsContent);

  console.log(`Successfully generated commands metadata to: ${outputTsPath}`);
}

generateElasticsearchCommandDefinitions().catch((error) => {
  console.error('An unhandled error occurred:', error);
  process.exit(1);
});
