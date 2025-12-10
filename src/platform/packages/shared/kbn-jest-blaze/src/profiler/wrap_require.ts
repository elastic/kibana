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

import Path from 'path';
import { isCore } from 'resolve';
import { jestProfilerRuntime } from './runtime';

export function wrapRequire(origRequire: NodeJS.Require, parentFilename: string): NodeJS.Require {
  const wrapped = function wrappedRequire(id: string) {
    // skip profiling for core modules or already instrumented modules
    if (isCore(id)) {
      return origRequire(id);
    }

    const resolved = require.resolve(id, {
      paths: [Path.dirname(parentFilename)],
    });

    return jestProfilerRuntime.require(resolved, function () {
      return origRequire(id);
    });
  } as unknown as NodeJS.Require;

  // mirror common props so libraries that inspect require don’t break
  Object.defineProperty(wrapped, 'length', { value: 1 });
  for (const key of ['resolve', 'cache', 'main', 'extensions'] as const) {
    if (Object.prototype.hasOwnProperty.call(origRequire, key) || key in origRequire) {
      Object.assign(wrapped, { [key]: origRequire[key] });
    }
  }

  return wrapped;
}
