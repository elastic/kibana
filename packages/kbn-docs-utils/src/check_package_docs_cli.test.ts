/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getValidationResults } from './check_package_docs_cli';
import {
  TypeKind,
  type ApiDeclaration,
  type PluginOrPackage,
  type MissingApiItemMap,
} from './types';
import type { AllPluginStats } from './cli/types';

const createApiDeclaration = (id: string, parentPluginId: string): ApiDeclaration => ({
  id,
  label: id,
  type: TypeKind.FunctionKind,
  path: `path/${id}`,
  parentPluginId,
});

const createPlugin = (id: string, isPlugin = true): PluginOrPackage => ({
  id,
  manifest: {
    id,
    description: `${id} description`,
    owner: { name: 'team' },
    serviceFolders: [],
  },
  isPlugin,
  directory: `/tmp/${id}`,
  manifestPath: `/tmp/${id}/kibana.json`,
});

const createBaseStats = (pluginId: string): AllPluginStats => ({
  [pluginId]: {
    missingComments: [],
    missingComplexTypeInfo: [],
    isAnyType: [],
    noReferences: [],
    paramDocMismatches: [],
    apiCount: 0,
    missingExports: 0,
    deprecatedAPIsReferencedCount: 0,
    unreferencedDeprecatedApisCount: 0,
    adoptionTrackedAPIs: [],
    adoptionTrackedAPIsCount: 0,
    adoptionTrackedAPIsUnreferencedCount: 0,
    owner: { name: 'team' },
    description: `${pluginId} description`,
    isPlugin: true,
    eslintDisableFileCount: 0,
    eslintDisableLineCount: 0,
    enzymeImportCount: 0,
  },
});

describe('getValidationResults', () => {
  it('passes plugins without issues', () => {
    const pluginId = 'plugin-a';
    const plugins = [createPlugin(pluginId)];
    const missingApiItems: MissingApiItemMap = {};
    const allPluginStats = createBaseStats(pluginId);

    const results = getValidationResults(
      plugins,
      missingApiItems,
      ['any', 'comments', 'exports'],
      undefined,
      undefined,
      allPluginStats
    );

    expect(results).toEqual([{ pluginId, passed: true }]);
  });

  it('fails plugins with selected validation issues', () => {
    const pluginId = 'plugin-b';
    const plugins = [createPlugin(pluginId)];
    const missingApiItems: MissingApiItemMap = {
      [pluginId]: { 'src/path.ts': ['ref'] },
    };
    const allPluginStats = {
      ...createBaseStats(pluginId),
      [pluginId]: {
        ...createBaseStats(pluginId)[pluginId],
        isAnyType: [createApiDeclaration('anyIssue', pluginId)],
        missingComments: [createApiDeclaration('commentIssue', pluginId)],
      },
    };

    const results = getValidationResults(
      plugins,
      missingApiItems,
      ['any', 'exports'],
      undefined,
      undefined,
      allPluginStats
    );

    expect(results).toEqual([{ pluginId, passed: false }]);
  });

  it('applies plugin filters', () => {
    const plugins = [createPlugin('plugin-a'), createPlugin('plugin-b')];
    const missingApiItems: MissingApiItemMap = {
      'plugin-b': { 'src/path.ts': ['ref'] },
    };
    const allPluginStats: AllPluginStats = {
      ...createBaseStats('plugin-a'),
      ...createBaseStats('plugin-b'),
    };

    const results = getValidationResults(
      plugins,
      missingApiItems,
      ['exports'],
      ['plugin-a'],
      undefined,
      allPluginStats
    );

    expect(results).toEqual([{ pluginId: 'plugin-a', passed: true }]);
  });
});
