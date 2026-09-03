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
import { commandDefinitions } from '@elastic/esql-definitions/commands';

const GENERATED_COMMANDS_BASE_PATH = join(
  REPO_ROOT,
  'src/platform/packages/shared/kbn-esql-language/src/commands/definitions/generated/commands'
);

async function generateElasticsearchCommandDefinitions(): Promise<void> {
  const outputCommandsDir = GENERATED_COMMANDS_BASE_PATH;
  await mkdir(outputCommandsDir, { recursive: true });

  const commandsMetadata: Record<string, ElasticsearchCommandDefinition> = {};

  for (const command of commandDefinitions) {
    commandsMetadata[command.name] = {
      type: 'command',
      name: command.name,
      ...(command.license && {
        license: command.license.toLowerCase() as ElasticsearchCommandDefinition['license'],
      }),
      ...(command.observabilityTier && { observability_tier: command.observabilityTier }),
      ...(command.output && { output: command.output }),
    };
  }

  const commandEnum = `export enum EsqlCommandNames {
${commandDefinitions
  .map((command) => `  ${command.name.toUpperCase()} = '${command.name}',`)
  .join('\n')}
}`;

  const outputTsPath = join(outputCommandsDir, 'commands.ts');
  const tsContent = `
// This file is auto-generated. Do not edit it manually.

import type { ElasticsearchCommandDefinition } from '@kbn/esql-language';

export const commandsMetadata: Record<string, ElasticsearchCommandDefinition> = ${JSON.stringify(
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
