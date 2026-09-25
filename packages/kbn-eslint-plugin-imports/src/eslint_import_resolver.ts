/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import type { ImportResolver } from '@kbn/import-resolver';

export interface EslintImportResolution {
  found: boolean;
  /** absolute path of the resolved file, `null` for node built-ins */
  path?: string | null;
}

/**
 * Extensions `eslint-import-resolver-node` probes. Anything else (notably `.ts`/`.tsx`, i.e.
 * every repo package and relative TS import) was unresolvable for `import/*` before, so the
 * rules skipped it. We keep that contract: enabling those checks is a separate decision
 * (`import/no-extraneous-dependencies` alone reports ~190 new violations against `@kbn/*`).
 */
const LEGACY_EXTENSIONS: Record<string, true> = {
  '.mjs': true,
  '.js': true,
  '.json': true,
  '.node': true,
};

/**
 * Adapt `@kbn/import-resolver` to the `eslint-plugin-import` resolver interface (v2) so
 * `import/*` rules share one resolver (and its stat/readFile caches) with `@kbn/imports/*`,
 * while reporting exactly the set of files the previous `eslint-import-resolver-node` setup
 * could resolve.
 */
export function resolveForEslintImport(
  resolver: ImportResolver,
  source: string,
  file: string
): EslintImportResolution {
  const result = resolver.resolve(source, Path.dirname(file));

  if (!result) {
    return { found: false };
  }

  if (result.type === 'built-in') {
    return { found: true, path: null };
  }

  if (result.type !== 'file' || result.viaExportsMap) {
    // '@types', 'ignore', 'optional-and-missing' and "exports"-map hits have no file the old
    // resolver would have found
    return { found: false };
  }

  const { absolute } = result;
  const ext = Path.extname(absolute);
  if (!LEGACY_EXTENSIONS[ext] && !source.endsWith(ext)) {
    return { found: false };
  }

  return { found: true, path: absolute };
}
