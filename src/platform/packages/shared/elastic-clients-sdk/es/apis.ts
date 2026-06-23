/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 * Lazy barrel for Elasticsearch API definitions.
 *
 * Importing this file is cheap: only `apiManifest` (metadata-only) is loaded.
 * The per-endpoint Zod schemas emitted under `./apis/schemas/*.ts` are NOT
 * pulled in transitively - each carries a multi-MB inlined type closure and
 * loading all 294 of them at once allocates several gigabytes of heap.
 *
 * Callers that need the full `EsApiDefinition` (with its Zod `input` schema)
 * for a single endpoint must go through `loadEsApi()` or `loadEsApisInFile()`,
 * which dynamic-import exactly one namespace file (and only its schema closure).
 *
 * See elastic/cli#171 for the memory context, and
 * elastic/elastic-client-generator-js#161 / PR #164 for the upstream work
 * that made per-endpoint isolation possible.
 */

import type { EsApiDefinition } from './types';
import type { EsApiMeta } from './api-manifest';

export { apiManifest } from './api-manifest';
export type { EsApiMeta } from './api-manifest';

/** Camel-case a snake_case file stem, matching the generator's export naming rule. */
function toCamelCase(stem: string): string {
  return stem.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

/** Memoised module cache so repeated calls don't re-import the same namespace file. */
const moduleCache = new Map<string, Promise<EsApiDefinition[]>>();

/**
 * Dynamic-imports the namespace file identified by `namespaceFile` and returns
 * all `EsApiDefinition`s it exports. Subsequent calls for the same file return
 * the cached promise.
 *
 * Triggers loading of every per-endpoint Zod schema referenced by the file.
 */
export async function loadEsApisInFile(namespaceFile: string): Promise<EsApiDefinition[]> {
  let cached = moduleCache.get(namespaceFile);
  if (cached != null) return cached;
  cached = (async (): Promise<EsApiDefinition[]> => {
    const mod = (await import(`./apis/${namespaceFile}.ts`)) as Record<string, EsApiDefinition[]>;
    const exportName = `${toCamelCase(namespaceFile)}Apis`;
    const arr = mod[exportName];
    if (!Array.isArray(arr)) {
      throw new Error(`internal error: ./apis/${namespaceFile}.ts did not export ${exportName}`);
    }
    return arr;
  })();
  moduleCache.set(namespaceFile, cached);
  return cached;
}

/** Locates a single `EsApiDefinition` by its manifest entry. */
export async function loadEsApi(meta: EsApiMeta): Promise<EsApiDefinition> {
  const defs = await loadEsApisInFile(meta.namespaceFile);
  const found = defs.find((d) => d.name === meta.name && (d.namespace ?? null) === meta.namespace);
  if (found == null) {
    const label = meta.namespace != null ? `${meta.namespace} ${meta.name}` : meta.name;
    throw new Error(
      `internal error: manifest entry "${label}" has no match in ./apis/${meta.namespaceFile}.ts`
    );
  }
  return found;
}
