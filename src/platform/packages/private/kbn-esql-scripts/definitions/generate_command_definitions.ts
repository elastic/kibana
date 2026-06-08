/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ElasticsearchCommandDefinition } from '@kbn/esql-language';
import { readElasticsearchDefinitions } from '../lib/elasticsearch_definitions';

const GENERATED_COMMANDS_BASE_PATH = join(
  REPO_ROOT,
  'src/platform/packages/shared/kbn-esql-language/src/commands/definitions/generated/commands'
);

async function generateElasticsearchCommandDefinitions(): Promise<void> {
  const pathToElasticsearch = process.argv[2];

  const esCommandDefinitions = readElasticsearchDefinitions<ElasticsearchCommandDefinition>({
    pathToElasticsearch,
    keywordType: 'commands',
    language: 'esql',
  });

  const outputCommandsDir = GENERATED_COMMANDS_BASE_PATH;
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

  const commandEnum = `export enum EsqlCommandNames {
${esCommandDefinitions
  .map((command) => `  ${command.name.toUpperCase()} = '${command.name}',`)
  .join('\n')}
}`;

  const outputTsPath = join(outputCommandsDir, 'commands.ts');
  const tsContent = `
// This file is auto-generated. Do not edit it manually.

export const commandsMetadata: Record<string, unknown> = ${JSON.stringify(
    commandsMetadata,
    null,
    2
  )};

${commandEnum}
`;

  await writeFile(outputTsPath, tsContent);

  console.log(`Successfully generated commands metadata to: ${outputTsPath}`);
}

generateElasticsearchCommandDefinitions().catch((error) => {
  console.error('An unhandled error occurred:', error);
  process.exit(1);
});
