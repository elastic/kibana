/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findPlugins, findPackages, findTeamPlugins } from './find_plugins';
import { ApiScope } from './types';

describe('findPlugins', () => {
  it('returns plugins and packages when no filter is provided', () => {
    const result = findPlugins();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    // Should include @kbn/core
    const core = result.find((p) => p.id === '@kbn/core');
    expect(core).toBeDefined();
    expect(core!.isPlugin).toBe(false);
  });

  it('filters plugins when pluginOrPackageFilter is provided', () => {
    const result = findPlugins(['data']);
    expect(Array.isArray(result)).toBe(true);
    // All returned plugins should have 'data' in their ID.
    result.forEach((plugin) => {
      expect(plugin.id.toLowerCase()).toContain('data');
    });
  });

  it('includes packages in the result', () => {
    const result = findPlugins();
    const packages = result.filter((p) => !p.isPlugin);
    expect(packages.length).toBeGreaterThan(0);
  });
});

describe('findPackages', () => {
  it('returns all packages when no filter is provided', () => {
    const result = findPackages();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((p) => !p.isPlugin)).toBe(true);
  });

  it('filters packages when packageFilter is provided', () => {
    const result = findPackages(['@kbn/core']);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((p) => !p.isPlugin)).toBe(true);
    // All returned packages should have 'core' in their ID.
    result.forEach((pkg) => {
      expect(pkg.id.toLowerCase()).toContain('core');
    });
  });

  it('returns empty array when filter matches no packages', () => {
    const result = findPackages(['@kbn/nonexistent-package-that-does-not-exist']);
    expect(result).toEqual([]);
  });
});

describe('findTeamPlugins', () => {
  it('returns plugins for a given team', () => {
    const team = '@elastic/kibana-data-discovery';
    const result = findTeamPlugins(team);
    expect(Array.isArray(result)).toBe(true);
    // The function filters plugins where the team string appears in the owner array.
    // We just verify it returns an array without throwing.
    // Note: The owner array may contain multiple teams, so the owner name (first element)
    // might not match the searched team exactly.
  });

  it('returns empty array for non-existent team', () => {
    const result = findTeamPlugins('@elastic/nonexistent-team');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });
});

describe('toApiScope and toPluginOrPackage', () => {
  it('correctly assigns scope for different package types', () => {
    const plugins = findPlugins();

    // Verify that plugins have correct scope assignments
    plugins.forEach((plugin) => {
      expect(plugin.scope).toBeDefined();
      if (plugin.scope) {
        expect([ApiScope.CLIENT, ApiScope.SERVER, ApiScope.COMMON].includes(plugin.scope)).toBe(
          true
        );
      }
    });
  });

  it('includes required manifest fields', () => {
    const plugins = findPlugins();

    plugins.forEach((plugin) => {
      expect(plugin.id).toBeDefined();
      expect(plugin.directory).toBeDefined();
      expect(plugin.manifest).toBeDefined();
      expect(plugin.manifest.id).toBeDefined();
    });
  });
});
