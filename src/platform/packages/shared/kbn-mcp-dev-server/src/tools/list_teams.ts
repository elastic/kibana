/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { getPackages } from '@kbn/repo-packages';
import { REPO_ROOT } from '@kbn/repo-info';
import { uniq } from 'lodash';

import type { ToolDefinition } from '../types';

const listTeamsInputSchema = z.object({});

function listTeams() {
  const packages = getPackages(REPO_ROOT);

  const teams = uniq(packages.flatMap((pkg) => pkg.manifest.owner));

  return {
    teams,
  };
}

export const listKibanaTeamsTool: ToolDefinition<typeof listTeamsInputSchema> = {
  name: 'list_kibana_teams',
  description: 'List Kibana Github teams',
  inputSchema: listTeamsInputSchema,
  handler: async () => {
    const result = await listTeams();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result),
        },
      ],
    };
  },
};
