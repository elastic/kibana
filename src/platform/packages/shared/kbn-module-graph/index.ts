/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { FileWalker } from './src/file_walker';
export { ChangeTracker } from './src/change_tracker';

export type { ResolveFilePath } from './src/common/types';

export { getDependencyTraverseOptions } from './src/traverse/get_dependency_traverse_options';
export type {
  CommonJSExportAssignmentExpression,
  DependencyTraverseOptions,
  DynamicImportDeclaration,
  DynamicImportExpression,
  RequireDeclaration,
  RequireExpression,
  RequireLikeCallExpression,
  RequireLikeDeclaration,
  JestMockExpression,
} from './src/traverse/types';
