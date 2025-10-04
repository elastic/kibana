/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

interface DependencyNode {
  id: string;
  tsconfigPath?: string;
  packagePath?: string;
  dependencies?: DependencyNode[];
  circular?: boolean;
  external?: boolean;
  noTsconfig?: boolean;
}

export const simpleTestTree: DependencyNode = {
  id: '@kbn/test-package',
  dependencies: [],
};

export const simpleTreeWithChild: DependencyNode = {
  id: '@kbn/test-package',
  dependencies: [{ id: '@kbn/child-package' }],
};

export const treeWithPaths: DependencyNode = {
  id: '@kbn/test-package',
  packagePath: 'packages/kbn-test-package',
  dependencies: [
    {
      id: '@kbn/child-package',
      packagePath: 'packages/kbn-child-package',
    },
  ],
};

export const circularTree: DependencyNode = {
  id: '@kbn/test-package',
  dependencies: [{ id: '@kbn/circular-package', circular: true }],
};

export const externalTree: DependencyNode = {
  id: '@kbn/test-package',
  dependencies: [{ id: '@kbn/external-package', external: true }],
};

export const noTsconfigTree: DependencyNode = {
  id: '@kbn/test-package',
  dependencies: [{ id: '@kbn/no-tsconfig-package', noTsconfig: true }],
};
