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
import { PackageItem } from './types';

export function listPackages({
  excludePlugins,
  owner,
}: {
  excludePlugins?: boolean;
  owner?: string;
}) {
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

  const filteredItems = owner
    ? items.filter((item) => {
        return fromExternalVariant(item).value.owner.includes(owner);
      })
    : items;

  const [pkgs, plugins] = partition(
    filteredItems,
    (item): item is { package: PackageItem } => 'package' in item
  );

  return {
    packages: pkgs.map((pkg) => pkg.package),
    ...(excludePlugins ? {} : { plugins: plugins.map((pkg) => pkg.plugin) }),
  };
}
