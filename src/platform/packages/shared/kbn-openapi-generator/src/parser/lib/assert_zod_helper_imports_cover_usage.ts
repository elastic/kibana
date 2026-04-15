/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ZOD_HELPERS_ORDER } from './zod_helpers_order';

/**
 * Asserts every `@kbn/zod-helpers/v4` symbol used in generated source appears in the
 * corresponding import list. Intended for tests / optional CI checks on `*.gen.ts` output.
 *
 * Detection is text-based (word-boundary regex), not an AST walk — a helper name appearing
 * in a comment or string literal in the file body would count as "used". This is acceptable
 * for generated `*.gen.ts` files where such false positives are extremely unlikely.
 *
 * @throws Error when a helper is referenced in the file body but missing from imports.
 */
export function assertZodHelperImportsCoverUsage(source: string): void {
  const importMatch = source.match(/import\s*\{([^}]+)\}\s*from\s*['"]@kbn\/zod-helpers\/v4['"]/);
  if (!importMatch) {
    return;
  }
  const imported = importMatch[1]
    .split(',')
    .map((s) => s.trim().split(/\s+/)[0])
    .filter(Boolean);
  const afterImport = source.slice((importMatch.index ?? 0) + importMatch[0].length);
  for (const name of ZOD_HELPERS_ORDER) {
    if (new RegExp(`\\b${name}\\b`).test(afterImport) && !imported.includes(name)) {
      throw new Error(
        `Source uses @kbn/zod-helpers/v4 symbol "${name}" but it is not listed in the import`
      );
    }
  }
}
