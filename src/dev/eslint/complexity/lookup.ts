/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve } from 'path';
import { discoverBazelPackages } from '@kbn/bazel-packages';
import { getPluginSearchPaths, simpleKibanaPlatformPluginDiscovery } from '@kbn/plugin-discovery';
import { REPO_ROOT } from '@kbn/utils';

enum LookupType {
  Package = 'package',
  Plugin = 'plugin',
}

interface LookupResult {
  type: LookupType;
  name: string;
  owner: string[];
  path: string;
}

interface LookupFilter {
  package: string[];
  plugin: string[];
  owner: string[];
}

export class Lookup {
  private static createFilter(filter: Partial<LookupFilter>) {
    return ({ name, owner, type }: LookupResult) =>
      (type === LookupType.Package && filter.package?.includes(name)) ||
      (type === LookupType.Plugin && filter.plugin?.includes(name)) ||
      owner.some((item) => filter.owner?.includes(item));
  }

  private static async lookupPackages() {
    const packages = await discoverBazelPackages(REPO_ROOT);

    return packages.map<LookupResult>(({ manifest, normalizedRepoRelativeDir }) => ({
      type: LookupType.Package,
      name: manifest.id,
      owner: manifest.owner,
      path: resolve(REPO_ROOT, normalizedRepoRelativeDir),
    }));
  }

  private static lookupPlugins() {
    return simpleKibanaPlatformPluginDiscovery(
      getPluginSearchPaths({
        rootDir: REPO_ROOT,
        oss: false,
        examples: false,
      }),
      [resolve(REPO_ROOT, 'src/core')]
    ).map<LookupResult>(({ directory, manifest }) => ({
      type: LookupType.Plugin,
      name: manifest.id,
      owner: [manifest.owner.name],
      path: directory,
    }));
  }

  private cache?: LookupResult[];

  async lookup(filter?: Partial<LookupFilter>): Promise<LookupResult[]> {
    if (!this.cache) {
      this.cache = [...(await Lookup.lookupPackages()), ...Lookup.lookupPlugins()];
    }

    if (!filter) {
      return this.cache;
    }

    return this.cache.filter(Lookup.createFilter(filter));
  }
}
