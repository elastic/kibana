/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';
import { SeverityMapping, severity_mapping } from '../severity_mapping';

/**
 * Types the DefaultStringArray as:
 *   - If null or undefined, then a default severity_mapping array will be set
 */
export const DefaultSeverityMappingArray = new t.Type<
  SeverityMapping,
  SeverityMapping | undefined,
  unknown
>(
  'DefaultSeverityMappingArray',
  severity_mapping.is,
  (input, context): Either<t.Errors, SeverityMapping> =>
    input == null ? t.success([]) : severity_mapping.validate(input, context),
  t.identity
);
