/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LicenseType } from '@kbn/licensing-types';
import type { ICommand } from './registry';

import { commandsMetadata } from '../definitions/generated/commands/commands';
import type { ElasticsearchCommandDefinition } from '../definitions/types';

function mapCommandNameToElasticsearchName(commandName: string): string {
  const nameMapping: Record<string, string> = {
    'inline stats': 'inline_stats',
  };

  return nameMapping[commandName] || commandName;
}

export function mergeCommandWithGeneratedCommandData(command: ICommand): ICommand {
  const elasticsearchCommandName = mapCommandNameToElasticsearchName(command.name);
  const generatedMetadata = (commandsMetadata as Record<string, ElasticsearchCommandDefinition>)[
    elasticsearchCommandName
  ];

  if (!generatedMetadata || Object.keys(generatedMetadata).length === 0) {
    return command;
  }

  return {
    ...command,
    metadata: {
      ...command.metadata,
      ...(generatedMetadata.license && {
        license: generatedMetadata.license as LicenseType,
      }),
      ...(generatedMetadata.observability_tier && {
        observabilityTier: generatedMetadata.observability_tier,
      }),
    },
  };
}
