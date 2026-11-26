/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Vitest leaves `require()` to Node, which can't load Kibana's TypeScript packages (no `main`,
// `index.ts` entry). Some sources still require them lazily (e.g. `require('@kbn/interpreter')`),
// so compile them through @kbn/swc-register like `node scripts/*` do. Those modules are separate
// instances that `vi.mock()` does not intercept, which matches `jest.requireActual`'s behavior
// rather than Jest's `require()`: tests that mock a module loaded this way need `vi.mock` on an
// `import` instead.

import { createRequire } from 'module';

const nodeRequire = createRequire(import.meta.url);

// swc-register installs source-map-support, which replaces Error.prepareStackTrace; keep Vitest's,
// which inline snapshots and error locations rely on.
const vitestPrepareStackTrace = Error.prepareStackTrace;
// lmdb (swc-register's transform cache) locates its native addon from `document.baseURI` when a
// `document` exists, which under jsdom is http://localhost/; hide it while the cache loads.
const { document } = global;
global.document = undefined;
try {
  nodeRequire('@kbn/swc-register').install();
} finally {
  global.document = document;
  Error.prepareStackTrace = vitestPrepareStackTrace;
}
