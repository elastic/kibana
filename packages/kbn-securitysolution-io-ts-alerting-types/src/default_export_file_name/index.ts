/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

/**
 * Types the DefaultExportFileName as:
 *   - If null or undefined, then a default of "export.ndjson" will be used
 */
export const DefaultExportFileName = new t.Type<string, string | undefined, unknown>(
  'DefaultExportFileName',
  t.string.is,
  (input, context): Either<t.Errors, string> =>
    input == null ? t.success('export.ndjson') : t.string.validate(input, context),
  t.identity
);
