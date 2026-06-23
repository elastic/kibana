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
 * Lazy barrel for Kibana API definitions.
 *
 * Importing this file is cheap: only `kbApiManifest` (metadata-only) is loaded.
 * The per-namespace files under ./apis/ are NOT pulled in transitively.
 * Callers that need the full `KbApiDefinition` for a single endpoint must go
 * through `loadKbApi()` or `loadKbApisInFile()`, which dynamic-import exactly
 * one namespace file.
 *
 * See elastic/cli#251 for the memory context.
 */

import type { KbApiDefinition } from './types';
import type { KbApiMeta } from './api-manifest';

export { kbApiManifest } from './api-manifest';
export type { KbApiMeta } from './api-manifest';

/** Memoised module cache so repeated calls do not re-import the same namespace file. */
const moduleCache = new Map<string, Promise<KbApiDefinition[]>>();

/** Converts a kebab-case file stem to the camelCase export name used in namespace files. */
function toCamelCase(stem: string): string {
  return stem.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Dynamic-imports the namespace file identified by `namespaceFile` and returns
 * all `KbApiDefinition`s it exports.
 */
export async function loadKbApisInFile(namespaceFile: string): Promise<KbApiDefinition[]> {
  let cached = moduleCache.get(namespaceFile);
  if (cached != null) return cached;
  cached = (async (): Promise<KbApiDefinition[]> => {
    const mod = (await import(`./apis/${namespaceFile}.ts`)) as Record<string, KbApiDefinition[]>;
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

/**
 * Locates a single `KbApiDefinition` by its manifest entry.
 *
 * Only the lookup keys are needed, so any structurally-compatible meta works
 * (e.g. the unified `ApiRegistryMeta`, whose `namespace` may be `null`); a full
 * `KbApiMeta` is not required.
 */
export async function loadKbApi(
  meta: Pick<KbApiMeta, 'name' | 'namespaceFile'> & { readonly namespace: string | null }
): Promise<KbApiDefinition> {
  const defs = await loadKbApisInFile(meta.namespaceFile);
  const found = defs.find((d) => d.name === meta.name && d.namespace === meta.namespace);
  if (found == null) {
    throw new Error(
      `internal error: manifest entry "${meta.namespace} ${meta.name}" has no match in ./apis/${meta.namespaceFile}.ts`
    );
  }
  return found;
}
