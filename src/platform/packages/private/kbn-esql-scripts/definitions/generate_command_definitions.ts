/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join } from 'path';
import type { ElasticsearchCommandDefinition } from '@kbn/esql-language';
import { commandDefinitions } from '@elastic/esql-definitions/commands';
import type { GeneratedFile } from '../lib/generated_file';
import { GENERATED_DEFINITIONS_DIR } from './constants';

const GENERATED_COMMANDS_DIR = join(GENERATED_DEFINITIONS_DIR, 'commands');

/** Renders the command metadata and `EsqlCommandNames` consumed by `@kbn/esql-language`. */
export const renderCommandDefinitions = (): GeneratedFile[] => {
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

  // The output lives inside @kbn/esql-language, which should not import itself by its module ID
  const tsContent = `
// This file is auto-generated. Do not edit it manually.

import type { ElasticsearchCommandDefinition } from '../../../../..';

export const commandsMetadata: Record<string, ElasticsearchCommandDefinition> = ${JSON.stringify(
    commandsMetadata,
    null,
    2
  )};

${commandEnum}
`;

  return [{ path: join(GENERATED_COMMANDS_DIR, 'commands.ts'), content: tsContent }];
};
