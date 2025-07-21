/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v 3.0 only", or the "Server Side Public License, v 1".
 */

import { PROFILER_RUNTIME_KEY } from './runtime';

export function wrapFileContents(filename: string, contents: string) {
  const profilerRuntimePath = require.resolve('./index.cjs');
  const header = `
const __profiler = globalThis.${PROFILER_RUNTIME_KEY} || require(${JSON.stringify(
    profilerRuntimePath
  )});
const __topThis = this;
__profiler.execute(${JSON.stringify(filename)}, require, function (require) {
  (function () {
`;
  const footer = `
  }).call(__topThis);
});
`;
  contents = header + contents + '\n' + footer;
  return contents;
}
