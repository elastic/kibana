/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import Path from 'path';
import { OPENAPI_TS_OUTPUT_FILENAME, OPENAPI_TS_OUTPUT_FOLDER_PATH } from './constants';

const source = fs.readFileSync(
  Path.resolve(OPENAPI_TS_OUTPUT_FOLDER_PATH, `${OPENAPI_TS_OUTPUT_FILENAME}.gen.ts`),
  'utf8'
);

describe('generated Elasticsearch zod schemas', () => {
  it('import zod from @kbn/zod/v4', () => {
    expect(source).toContain("import { z } from '@kbn/zod/v4';");
  });

  // Open records (`.and(z.record(...))`) merge the parsed object with the raw input. When a schema
  // under one changes a value, zod throws "Unmergable intersection" instead of returning an issue.
  it('have no schema that changes values, which open records cannot merge', () => {
    expect(source).toContain('.and(z.record(z.string(), z.unknown()))');
    expect(source).not.toMatch(
      /\.transform\(|z\.coerce\.|\.pipe\(|\.preprocess\(|\.overwrite\(|\.trim\(|\.toLowerCase\(|\.toUpperCase\(|\.normalize\(/
    );
  });
});
