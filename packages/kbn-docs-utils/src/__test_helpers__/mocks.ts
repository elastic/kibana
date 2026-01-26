/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ApiDeclaration,
  ApiReference,
  ApiStats,
  PluginApi,
  PluginMetaInfo,
  PluginOrPackage,
} from '../types';
import { TypeKind } from '../types';

/**
 * Creates a mock `ApiDeclaration` for testing purposes.
 */
export const createMockApiDeclaration = (
  overrides: Partial<ApiDeclaration> = {}
): ApiDeclaration => ({
  id: 'testApi',
  label: 'testApi',
  type: TypeKind.FunctionKind,
  path: 'src/plugins/test/public/index.ts',
  parentPluginId: 'testPlugin',
  ...overrides,
});

/**
 * Creates a mock `ApiReference` for testing purposes.
 */
export const createMockReference = (overrides: Partial<ApiReference> = {}): ApiReference => ({
  plugin: 'referencingPlugin',
  path: 'src/plugins/referencing/public/file.ts',
  ...overrides,
});

/**
 * Creates a mock `PluginOrPackage` for testing purposes.
 */
export const createMockPlugin = (overrides: Partial<PluginOrPackage> = {}): PluginOrPackage => ({
  id: 'testPlugin',
  manifest: {
    id: 'testPlugin',
    description: 'A test plugin',
    owner: { name: 'Test Team', githubTeam: 'test-team' },
    serviceFolders: [],
  },
  isPlugin: true,
  directory: 'src/plugins/test',
  manifestPath: 'src/plugins/test/kibana.jsonc',
  ...overrides,
});

/**
 * Creates a mock `ApiStats` for testing purposes.
 */
export const createMockPluginStats = (overrides: Partial<ApiStats> = {}): ApiStats => ({
  apiCount: 10,
  missingComments: [],
  isAnyType: [],
  noReferences: [],
  missingExports: 0,
  deprecatedAPIsReferencedCount: 0,
  unreferencedDeprecatedApisCount: 0,
  adoptionTrackedAPIs: [],
  adoptionTrackedAPIsCount: 0,
  adoptionTrackedAPIsUnreferencedCount: 0,
  ...overrides,
});

/**
 * Creates a mock `PluginApi` for testing purposes.
 */
export const createMockPluginApi = (overrides: Partial<PluginApi> = {}): PluginApi => ({
  id: 'testPlugin',
  client: [],
  server: [],
  common: [],
  ...overrides,
});

/**
 * Creates a mock `PluginMetaInfo` for testing purposes.
 */
export const createMockPluginMetaInfo = (
  overrides: Partial<PluginMetaInfo> = {}
): PluginMetaInfo => ({
  apiCount: 10,
  missingComments: [],
  isAnyType: [],
  noReferences: [],
  missingExports: 0,
  deprecatedAPIsReferencedCount: 0,
  unreferencedDeprecatedApisCount: 0,
  adoptionTrackedAPIs: [],
  adoptionTrackedAPIsCount: 0,
  adoptionTrackedAPIsUnreferencedCount: 0,
  owner: { name: 'Test Team', githubTeam: 'test-team' },
  description: 'A test plugin',
  isPlugin: true,
  ...overrides,
});
