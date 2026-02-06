/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import execa from 'execa';
import { REPO_ROOT } from '@kbn/repo-info';

import type { ToolDefinition } from '../types';

const generatePackageInputSchema = z.object({
  name: z.string().describe('The name of the package. Must start with @kbn/ and contain no spaces'),
  owner: z
    .string()
    .describe(
      'The owning Github team of the package. Use list_teams before this to find the appropriate owner'
    ),
  group: z.enum(['workplaceai', 'search', 'observability', 'security', 'platform']),
});

async function generatePackage(input: z.infer<typeof generatePackageInputSchema>): Promise<string> {
  const { stdout } = await execa.command(
    `node scripts/generate.js package ${input.name} \
      --owner ${input.owner} \
      --group ${input.group} \
      --visibility shared \
      --license x-pack`,
    {
      cwd: REPO_ROOT,
    }
  );

  return stdout;
}

export const generateKibanaPackageTool: ToolDefinition<typeof generatePackageInputSchema> = {
  name: 'generate_kibana_package',
  description: 'Generate a Kibana package',
  inputSchema: generatePackageInputSchema,
  handler: async (input) => {
    const result = await generatePackage(input);
    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  },
};
