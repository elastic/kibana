/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const rootPackageJsonStandard = {
  dependencies: {
    '@kbn/test-package': 'link:packages/kbn-test-package',
    '@kbn/another-package': 'link:packages/kbn-another-package',
  },
  devDependencies: {
    '@kbn/dev-package': 'link:packages/kbn-dev-package',
  },
};

export const rootPackageJsonCircular = {
  dependencies: {
    '@kbn/test-package': 'link:packages/kbn-test-package',
    '@kbn/another-package': 'link:packages/kbn-another-package',
  },
};

export const rootPackageJsonExternal = {
  dependencies: {
    '@kbn/test-package': 'link:packages/kbn-test-package',
    // Note: @kbn/external-package is NOT included here, making it external
  },
};

export const rootPackageJsonFiltered = {
  dependencies: {
    '@kbn/test-package': 'link:packages/kbn-test-package',
    '@kbn/another-package': 'link:packages/kbn-another-package',
    '@kbn/dev-package': 'link:packages/kbn-dev-package',
    '@kbn/filtered-out': 'link:packages/kbn-filtered-out',
  },
};

export const rootPackageJsonNoTsconfig = {
  dependencies: {
    '@kbn/test-package': 'link:packages/kbn-test-package',
    '@kbn/another-package': 'link:packages/kbn-another-package',
  },
};

export const rootPackageJsonDepth = {
  dependencies: {
    '@kbn/test-package': 'link:packages/kbn-test-package',
    '@kbn/another-package': 'link:packages/kbn-another-package',
    '@kbn/dev-package': 'link:packages/kbn-dev-package',
  },
};
