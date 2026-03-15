/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

module.exports = {
  name: 'kbn-unified-field-list',
  runs: 5,
  benchmarks: [
    {
      kind: 'script',
      name: 'sidebar-render-benchmark',
      description:
        'Measures dense field list render/open cost with many multi-fields using a benchmark-only jest file',
      run: `node scripts/jest --watchman=false --runInBand --config src/platform/packages/shared/kbn-unified-field-list/jest.benchmark.config.js src/platform/packages/shared/kbn-unified-field-list/src/benchmarks/field_list_sidebar_render.bench.test.tsx`,
      compare: {
        missing: 'skip',
      },
    },
  ],
};
