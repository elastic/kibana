/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { run } from '@kbn/dev-cli-runner';
import { z } from '@kbn/zod';
import { listPackages } from '../tools/list_packages';
import { generatePackage } from '../tools/generate_package';
import { listTeams } from '../tools/list_teams';

run(async () => {
  const server = new McpServer({ name: 'demo-server', version: '1.0.0' });

  server.registerTool(
    'list_kibana_packages',
    {
      description: 'List Kibana packages and Kibana application plugins',
      inputSchema: {
        excludePlugins: z
          .boolean()
          .optional()
          .default(false)
          .describe('Exclude all plugins. Defaults to false'),
        owner: z
          .string()
          .optional()
          .default('')
          .describe(
            'Optional: only include packages/plugins from the specified Kibana Github team. Use list_teams to get the teams if needed'
          ),
      },
    },
    ({ excludePlugins }) => {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(listPackages({ excludePlugins })),
          },
        ],
      };
    }
  );

  server.registerTool(
    'generate_kibana_package',
    {
      description: 'Generate a Kibana package',
      inputSchema: {
        name: z
          .string()
          .describe('The name of the package. Must start with @kbn/ and contain no spaces'),
        owner: z
          .string()
          .describe(
            'The owning Github team of the package. Use list_teams before this to find the appropriate owner'
          ),
        group: z.enum(['chat', 'search', 'observability', 'security', 'platform']),
      },
    },
    async ({ name, owner, group }) => {
      return {
        content: [
          {
            type: 'text',
            text: await generatePackage({
              name,
              owner,
              group,
            }),
          },
        ],
      };
    }
  );

  server.registerTool(
    'list_kibana_teams',
    {
      description: 'List Kibana Github teams',
    },
    () => {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(listTeams()),
          },
        ],
      };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
});
