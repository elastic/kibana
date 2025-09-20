/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Logger utilities
export { createMockLogger } from './logger_fixtures';

// File system mocking utilities
export { setupFileSystemMocks } from './file_system_fixtures';
export type { FileSystemScenario } from './file_system_fixtures';

// Package.json test data
export {
  rootPackageJsonStandard,
  rootPackageJsonCircular,
  rootPackageJsonExternal,
  rootPackageJsonFiltered,
  rootPackageJsonNoTsconfig,
  rootPackageJsonDepth,
} from './package_json_fixtures';

// Tsconfig.json test data and helpers
export {
  tsconfigStandard,
  tsconfigCircular,
  tsconfigExternal,
  tsconfigFiltered,
  tsconfigDepth,
  defaultTsconfig,
  createTsconfigMockImplementation,
} from './tsconfig_fixtures';

// Dependency tree test data
export {
  simpleTestTree,
  simpleTreeWithChild,
  treeWithPaths,
  circularTree,
  externalTree,
  noTsconfigTree,
} from './dependency_tree_fixtures';
