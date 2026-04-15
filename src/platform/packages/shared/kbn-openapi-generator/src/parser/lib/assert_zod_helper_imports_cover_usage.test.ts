/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { assertZodHelperImportsCoverUsage } from './assert_zod_helper_imports_cover_usage';

describe('assertZodHelperImportsCoverUsage', () => {
  it('passes when every used helper is imported', () => {
    const src = `
import { z } from '@kbn/zod/v4';
import { ArrayFromString } from '@kbn/zod-helpers/v4';
export const Q = z.object({ x: ArrayFromString(z.string()) });
`;
    expect(() => assertZodHelperImportsCoverUsage(src)).not.toThrow();
  });

  it('no-ops when there is no zod-helpers import', () => {
    const src = `import { z } from '@kbn/zod/v4'; export const x = z.string();`;
    expect(() => assertZodHelperImportsCoverUsage(src)).not.toThrow();
  });

  it('throws when a helper is used but not imported', () => {
    const src = `
import { z } from '@kbn/zod/v4';
import { ArrayFromString } from '@kbn/zod-helpers/v4';
export const Q = z.object({ a: BooleanFromString });
`;
    expect(() => assertZodHelperImportsCoverUsage(src)).toThrow(/BooleanFromString/);
  });
});
