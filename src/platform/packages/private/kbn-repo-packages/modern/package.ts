/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inspect } from 'util';
import Path from 'path';

import { readPackageJson } from './parse_package_json';
import { PLUGIN_CATEGORY } from './plugin_category_info';
import { readPackageManifest } from './parse_package_manifest';

/**
 * Normalize a path for operating systems which use backslashes
 * @param {string} path
 */
const normalize = (path: string): string => (Path.sep !== '/' ? path.split('\\').join('/') : path);

/**
 * @type {import('@kbn/projects-solutions-groups').KibanaSolution[]}
 */
const KIBANA_SOLUTIONS = ['search', 'security', 'observability', 'workplaceai'];

/**
 * Representation of a Package in the Kibana repository
 * @class
 */
class Package {
  /** Absolute path to this package directory */
  readonly directory: string;
  /** repo relative path to the root of the package */
  readonly normalizedRepoRelativeDir: string;
  /**
   * copy of the parsed kibana.jsonc manifest of the package
   * @deprecated rather than accessing this directly the necessary information about the package should be reflected on the Package class.
   */
  readonly manifest: any;
  /**
   * copy of the parsed package.json file in the package
   * @deprecated rather than accessing this directly the necessary information about the package should be reflected on the Package class.
   */
  readonly pkg: any;
  /** the name/import id of the package */
  readonly name: string;
  /** the name/import id of the package */
  readonly id: string;
  /** the group to which this package belongs */
  readonly group: any;
  /** the visibility of this package, i.e. whether it can be accessed by everybody or only modules in the same group */
  readonly visibility: any;

  /**
   * Create a Package object from a package directory. Reads some files from the package and returns
   * a Promise for a Package instance.
   * @param {string} repoRoot
   * @param {string} path
   */
  static fromManifest(repoRoot: string, path: string): Package {
    const manifest = readPackageManifest(repoRoot, path);
    const dir = Path.dirname(path);

    return new Package(repoRoot, dir, manifest, readPackageJson(Path.resolve(dir, 'package.json')));
  }

  /**
   * Sort an array of packages
   * @param {Package} a
   * @param {Package} b
   */
  static sorter(a: Package, b: Package): number {
    return a.manifest.id.localeCompare(b.manifest.id, 'en');
  }

  /**
   * @internal
   */
  constructor(
    /**
     * Absolute path to the root of the repository
     * @type {string}
     */
    repoRoot: string,
    /**
     * Absolute path to the package directory
     * @type {string}
     */
    dir: string,
    /**
     * Parsed kibana.jsonc manifest from the package
     * @type {import('./types').KibanaPackageManifest}
     */
    manifest: any,
    /**
     * Parsed package.json file from the package
     * @type {import('./types').ParsedPackageJson | undefined}
     */
    pkg: any
  ) {
    this.directory = dir;
    this.normalizedRepoRelativeDir = normalize(Path.relative(repoRoot, dir));
    this.manifest = manifest;
    this.pkg = pkg;
    this.name = manifest.id;
    this.id = manifest.id;

    const { group, visibility } = this.determineGroupAndVisibility();
    this.group = group;
    this.visibility = visibility;
  }

  /**
   * Is this package highlighted as a "dev only" package? If so it will always
   * be listed in the devDependencies and will never end up in the build
   * @returns {boolean}
   */
  isDevOnly(): boolean {
    return (
      !!this.manifest.devOnly ||
      this.manifest.type === 'functional-tests' ||
      this.manifest.type === 'test-helper'
    );
  }

  /**
   * Does this package expose a plugin, is it of one of the plugin types?
   * @readonly
   * @returns {this is import('./types').PluginPackage}
   */
  isPlugin(): boolean {
    return this.manifest.type === 'plugin';
  }

  /**
   * Returns the group to which this package belongs
   * @readonly
   * @returns {import('@kbn/projects-solutions-groups').ModuleGroup}
   */
  getGroup(): any {
    return this.group;
  }

  /**
   * Returns the package visibility, i.e. whether it can be accessed by everybody or only packages in the same group
   * @readonly
   * @returns {import('@kbn/projects-solutions-groups').ModuleVisibility}
   */
  getVisibility(): any {
    return this.visibility;
  }

  /**
   * Returns true if the package represents some type of plugin
   * @returns {import('./types').PluginCategoryInfo}
   */
  getPluginCategories(): any {
    if (!this.isPlugin()) {
      throw new Error('package is not a plugin, check pkg.isPlugin before calling this method');
    }

    const preCalculated = this.manifest.plugin[PLUGIN_CATEGORY];
    if (preCalculated) {
      return { ...preCalculated };
    }

    const dir = this.normalizedRepoRelativeDir;
    const oss = !dir.startsWith('x-pack/');
    const example = dir.startsWith('examples/') || dir.startsWith('x-pack/examples/');
    const testPlugin =
      dir.startsWith('src/platform/test/') ||
      dir.startsWith('x-pack/platform/test/') ||
      dir.startsWith('x-pack/solutions/search/test/') ||
      dir.startsWith('x-pack/solutions/observability/test/') ||
      dir.startsWith('x-pack/solutions/security/test/');
    return {
      oss,
      example,
      testPlugin,
    };
  }

  determineGroupAndVisibility(): { group: any; visibility: any } {
    const dir = this.normalizedRepoRelativeDir;

    /** @type {import('@kbn/projects-solutions-groups').ModuleGroup} */
    let group: any = 'common';
    /** @type {import('@kbn/projects-solutions-groups').ModuleVisibility} */
    let visibility: any = 'shared';

    // the following checks will only work in dev mode, as production builds create NPM packages under 'node_modules/@kbn-...'
    if (dir.startsWith('src/platform/') || dir.startsWith('x-pack/platform/')) {
      group = 'platform';
      visibility =
        /src\/platform\/[^\/]+\/shared/.test(dir) || /x-pack\/platform\/[^\/]+\/shared/.test(dir)
          ? 'shared'
          : 'private';
      // BOOKMARK - List of Kibana solutions
    } else if (dir.startsWith('x-pack/solutions/search/')) {
      group = 'search';
      visibility = 'private';
    } else if (dir.startsWith('x-pack/solutions/security/')) {
      group = 'security';
      visibility = 'private';
    } else if (dir.startsWith('x-pack/solutions/observability/')) {
      group = 'observability';
      visibility = 'private';
    } else if (dir.startsWith('x-pack/solutions/workplaceai/')) {
      group = 'workplaceai';
      visibility = 'private';
    } else {
      // this conditional branch is the only one that applies in production
      group = this.manifest.group ?? 'common';
      // if the group is 'private-only', enforce it
      // KIBANA_SOLUTIONS - List of Kibana solutions
      const isSolution = Boolean(KIBANA_SOLUTIONS.find((solution) => solution === group));
      if (!isSolution && !['platform', 'common'].includes(group)) {
        throw new Error(
          `Detected unknown group: ${group}, this module's definition of KIBANA_SOLUTIONS is probably outdated.`
        );
      }
      visibility = isSolution ? 'private' : this.manifest.visibility ?? 'shared';
    }

    return { group, visibility };
  }

  /**
   * Custom inspect handler
   */
  [inspect.custom](): string {
    return `${this.isPlugin() ? `PluginPackage` : `Package`}<${this.normalizedRepoRelativeDir}>`;
  }
}

export { Package };
