/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const tsconfigStandard = {
  'kbn-test-package': '{"kbn_references": ["@kbn/another-package"]}',
  'kbn-another-package': '{"kbn_references": []}',
  'kbn-dev-package': '{"kbn_references": []}',
};

export const tsconfigCircular = {
  'kbn-test-package': '{"kbn_references": ["@kbn/another-package"]}',
  'kbn-another-package': '{"kbn_references": ["@kbn/test-package"]}',
};

export const tsconfigExternal = {
  'kbn-test-package': '{"kbn_references": ["@kbn/external-package"]}',
};

export const tsconfigFiltered = {
  'kbn-test-package':
    '{"kbn_references": ["@kbn/another-package", "@kbn/dev-package", "@kbn/filtered-out"]}',
};

export const tsconfigDepth = {
  'kbn-test-package': '{"kbn_references": ["@kbn/another-package"]}',
  'kbn-another-package': '{"kbn_references": ["@kbn/dev-package"]}',
  'kbn-dev-package': '{"kbn_references": []}',
};

export const defaultTsconfig = '{}';

export function createTsconfigMockImplementation(scenario: typeof tsconfigStandard) {
  return (filePath: string | number | Buffer | URL) => {
    if (filePath === 'package.json') {
      throw new Error('This function is only for tsconfig.json files');
    }

    if (typeof filePath === 'string' && filePath.includes('tsconfig.json')) {
      for (const [packageName, content] of Object.entries(scenario)) {
        if (filePath.includes(packageName)) {
          return content;
        }
      }
    }
    return defaultTsconfig;
  };
}
