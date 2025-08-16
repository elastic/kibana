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
import { partition } from 'lodash';
import { fromExternalVariant } from '@kbn/std';

import type { ToolDefinition } from '../types';

interface PackageItem {
  name: string;
  directory: string;
  description: string;
  owner: string[];
}

const listPackagesInputSchema = z.object({
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
});

function listPackages(input: z.infer<typeof listPackagesInputSchema>) {
  const packages = getPackages(REPO_ROOT);

  const items = packages.map((pkg): { plugin: PackageItem } | { package: PackageItem } => {
    const { directory, name } = pkg;

    const item: PackageItem = {
      name,
      directory,
      description: pkg.manifest.description ?? '',
      owner: pkg.manifest.owner,
    };

    if (pkg.isPlugin()) {
      return {
        plugin: item,
      };
    }

    return {
      package: item,
    };
  });

  const filteredItems = input.owner
    ? items.filter((item) => {
        return fromExternalVariant(item).value.owner.includes(input.owner);
      })
    : items;

  const [pkgs, plugins] = partition(
    filteredItems,
    (item): item is { package: PackageItem } => 'package' in item
  );

  return {
    packages: pkgs.map((pkg) => pkg.package),
    ...(input.excludePlugins ? {} : { plugins: plugins.map((pkg) => pkg.plugin) }),
  };
}

export const listKibanaPackagesTool: ToolDefinition<typeof listPackagesInputSchema> = {
  name: 'list_kibana_packages',
  description: 'List Kibana packages and Kibana application plugins',
  inputSchema: listPackagesInputSchema,
  handler: async (input) => {
    const result = listPackages(input);
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
