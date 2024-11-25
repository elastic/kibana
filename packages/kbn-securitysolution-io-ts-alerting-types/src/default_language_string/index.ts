/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';
import { language } from '../language';

/**
 * Types the DefaultLanguageString as:
 *   - If null or undefined, then a default of the string "kuery" will be used
 */
export const DefaultLanguageString = new t.Type<string, string | undefined, unknown>(
  'DefaultLanguageString',
  t.string.is,
  (input, context): Either<t.Errors, string> =>
    input == null ? t.success('kuery') : language.validate(input, context),
  t.identity
);
