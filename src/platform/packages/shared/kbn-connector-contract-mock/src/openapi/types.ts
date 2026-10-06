/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IHttpOperation } from '@stoplight/types';
import type { JSONSchema7 } from 'json-schema';

/** A parsed OpenAPI 3.x or Swagger 2.0 document. */
export type OpenApiDocument = Record<string, unknown>;

/** Component schemas shared by every operation of a spec, keyed by component name. */
export type SchemaBundle = Record<string, JSONSchema7>;

/** An operation whose schema refs point into the shared bundle, in the shape Prism expects. */
export type ContractOperation = IHttpOperation & { __bundled__: SchemaBundle };

/** A schema of an operation, with a human-readable location such as `query.limit`. */
export interface LocatedSchema {
  readonly kind: 'parameter' | 'request' | 'response';
  readonly location: string;
  readonly schema: JSONSchema7;
}
