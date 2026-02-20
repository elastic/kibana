/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getPackages } from '@kbn/repo-packages';
import { REPO_ROOT } from '@kbn/repo-info';
import { partition } from 'lodash';
import { fromExternalVariant } from '@kbn/std';

interface PackageItem {
  name: string;
  directory: string;
  description: string;
  owner: string[];
}

function listPackages(input: { excludePlugins: boolean; owner: string }) {
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

function main() {
  const args = process.argv.slice(2);
  let owner = '';
  let excludePlugins = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--team' && args[i + 1]) {
      owner = args[i + 1];
      i++;
    } else if (args[i] === '--exclude-plugins') {
      excludePlugins = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log('Usage: node -r @kbn/setup-node-env list_packages.ts [--team <team>] [--exclude-plugins]');
      console.log('');
      console.log('Options:');
      console.log('  --team <team>        Filter by owning GitHub team');
      console.log('  --exclude-plugins    Exclude plugins, show only packages');
      process.exit(0);
    }
  }

  const result = listPackages({ excludePlugins, owner });
  console.log(JSON.stringify(result, null, 2));
}

main();
