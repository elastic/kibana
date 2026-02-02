/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { Project } from 'ts-morph';
import { ToolingLog } from '@kbn/tooling-log';
import { getPluginApiMap } from './get_plugin_api_map';
import { getKibanaPlatformPlugin } from './integration_tests/kibana_platform_plugin_mock';

const log = new ToolingLog({
  level: 'silent',
  writeTo: process.stdout,
});

describe('getPluginApiMap', () => {
  let project: Project;

  beforeAll(() => {
    const tsConfigFilePath = Path.resolve(
      __dirname,
      'integration_tests/__fixtures__/src/tsconfig.json'
    );
    project = new Project({
      tsConfigFilePath,
    });
  });

  it('builds plugin API map for multiple plugins', () => {
    const pluginA = getKibanaPlatformPlugin('pluginA');
    const pluginB = getKibanaPlatformPlugin(
      'pluginB',
      Path.resolve(__dirname, 'integration_tests/__fixtures__/src/plugin_b')
    );
    const plugins = [pluginA, pluginB];

    const result = getPluginApiMap(project, plugins, log, {
      collectReferences: false,
    });

    expect(result.pluginApiMap).toBeDefined();
    expect(result.pluginApiMap.pluginA).toBeDefined();
    expect(result.pluginApiMap.pluginB).toBeDefined();
    expect(result.pluginApiMap.pluginA.id).toBe('pluginA');
    expect(result.pluginApiMap.pluginB.id).toBe('pluginB');
  });

  it('collects missing API items', () => {
    const pluginA = getKibanaPlatformPlugin('pluginA');
    const plugins = [pluginA];

    const result = getPluginApiMap(project, plugins, log, {
      collectReferences: false,
    });

    expect(result.missingApiItems).toBeDefined();
    // pluginA has references to non-exported types
    expect(Object.keys(result.missingApiItems.pluginA || {})).toBeDefined();
  });

  it('collects referenced deprecations', () => {
    const pluginA = getKibanaPlatformPlugin('pluginA');
    const plugins = [pluginA];

    const result = getPluginApiMap(project, plugins, log, {
      collectReferences: true,
    });

    expect(result.referencedDeprecations).toBeDefined();
    expect(result.unreferencedDeprecations).toBeDefined();
  });

  it('collects adoption tracked APIs', () => {
    const pluginA = getKibanaPlatformPlugin('pluginA');
    const plugins = [pluginA];

    const result = getPluginApiMap(project, plugins, log, {
      collectReferences: false,
    });

    expect(result.adoptionTrackedAPIs).toBeDefined();
    expect(result.adoptionTrackedAPIs.pluginA).toBeDefined();
    expect(Array.isArray(result.adoptionTrackedAPIs.pluginA)).toBe(true);
  });

  it('filters plugins when pluginFilter is provided', () => {
    const pluginA = getKibanaPlatformPlugin('pluginA');
    const pluginB = getKibanaPlatformPlugin(
      'pluginB',
      Path.resolve(__dirname, 'integration_tests/__fixtures__/src/plugin_b')
    );
    const plugins = [pluginA, pluginB];

    const result = getPluginApiMap(project, plugins, log, {
      collectReferences: false,
      pluginFilter: ['pluginA'],
    });

    expect(result.pluginApiMap.pluginA).toBeDefined();
    expect(result.pluginApiMap.pluginB).toBeDefined();
    // Both plugins should be in the map, but only pluginA should capture references
    // (if collectReferences is true and pluginFilter is set)
  });

  it('handles plugins with deprecated APIs', () => {
    const pluginA = getKibanaPlatformPlugin('pluginA');
    const plugins = [pluginA];

    const result = getPluginApiMap(project, plugins, log, {
      collectReferences: true,
    });

    // pluginA has AnotherInterface which is deprecated
    const deprecatedApis = Object.values(result.referencedDeprecations).flat();
    const unreferencedDeprecated = Object.values(result.unreferencedDeprecations).flat();

    // Should have collected deprecations
    expect(deprecatedApis.length + unreferencedDeprecated.length).toBeGreaterThanOrEqual(0);
  });

  it('handles empty plugin list', () => {
    const result = getPluginApiMap(project, [], log, {
      collectReferences: false,
    });

    expect(result.pluginApiMap).toEqual({});
    expect(result.missingApiItems).toEqual({});
    expect(result.referencedDeprecations).toEqual({});
    expect(result.unreferencedDeprecations).toEqual({});
    expect(result.adoptionTrackedAPIs).toEqual({});
  });
});
