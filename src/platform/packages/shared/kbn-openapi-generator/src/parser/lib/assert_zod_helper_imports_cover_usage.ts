/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const ZOD_HELPER_EXPORTS = [
  'isValidDateMath',
  'isNonEmptyString',
  'ArrayFromString',
  'BooleanFromString',
] as const;

/**
 * Asserts every `@kbn/zod-helpers/v4` symbol used in generated source appears in the
 * corresponding import list. Intended for tests / optional CI checks on `*.gen.ts` output.
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
  for (const name of ZOD_HELPER_EXPORTS) {
    if (new RegExp(`\\b${name}\\b`).test(afterImport) && !imported.includes(name)) {
      throw new Error(
        `Source uses @kbn/zod-helpers/v4 symbol "${name}" but it is not listed in the import`
      );
    }
  }
}
