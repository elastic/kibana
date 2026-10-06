/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ErrorObject } from 'ajv';
import { resolveObject } from './json_pointer';
import { getSchemaValidator } from './schema_compiler';
import { isRecord } from './schema_walk';
import type { ContractOperation, OpenApiDocument, SpecSchema, Violation } from './types';

export type Direction = 'request' | 'response';

export interface ValueContext {
  readonly path: readonly string[];
  /** Names the value in messages, e.g. `Request query parameter limit`. */
  readonly subject: string;
  readonly direction: Direction;
}

// OpenAPI exempts required readOnly properties from requests and writeOnly ones from responses.
const EXEMPT_FLAG = { request: 'readOnly', response: 'writeOnly' } as const;

const isExemptRequired = (
  { keyword, params, parentSchema }: ErrorObject,
  document: OpenApiDocument,
  direction: Direction
): boolean => {
  if (keyword !== 'required' || !isRecord(parentSchema) || !isRecord(parentSchema.properties)) {
    return false;
  }
  const property = parentSchema.properties[String(params.missingProperty)];
  const flag = EXEMPT_FLAG[direction];
  return (
    isRecord(property) &&
    (property[flag] === true || resolveObject(document, property, '').value[flag] === true)
  );
};

const toTokens = (instancePath: string): string[] =>
  instancePath
    .split('/')
    .slice(1)
    .map((token) => token.replace(/~1/g, '/').replace(/~0/g, '~'));

const describeError = ({ keyword, message = 'is invalid', params }: ErrorObject): string =>
  keyword === 'additionalProperties' ? `${message}: ${params.additionalProperty}` : message;

const toViolation = (error: ErrorObject, { path, subject }: ValueContext): Violation => ({
  path: [...path, ...toTokens(error.instancePath)],
  code: error.keyword,
  message: `${subject}${error.instancePath ? ` at ${error.instancePath}` : ''} ${describeError(
    error
  )}`,
});

/** Validates a value against a schema of an operation, mapping Ajv errors to violations. */
export const validateValue = (
  { spec }: ContractOperation,
  schema: SpecSchema | undefined,
  value: unknown,
  context: ValueContext
): Violation[] => {
  if (!schema) {
    return [];
  }
  const validate = getSchemaValidator(spec, schema);
  if (validate(value)) {
    return [];
  }
  return (validate.errors ?? [])
    .filter((error) => !isExemptRequired(error, spec.document, context.direction))
    .map((error) => toViolation(error, context));
};
