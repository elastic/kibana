/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coerceValue } from './coerce_value';
import { validateValue } from './schema_violations';
import type { ContractOperation, OperationResponse, Violation } from './types';
import { isRecord } from './schema_walk';
import { validateContent } from './validate_content';

export interface ResponseInput {
  readonly statusCode: number;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: unknown;
}

/** Finds the response a status code falls under: its own entry, its range (`4XX`), or `default`. */
export const findResponse = (
  responses: readonly OperationResponse[],
  statusCode: number
): OperationResponse | undefined => {
  const code = String(statusCode);
  return [code, `${code[0]}XX`, 'DEFAULT']
    .map((candidate) => responses.find((response) => response.code.toUpperCase() === candidate))
    .find(Boolean);
};

const checkHeaders = (
  operation: ContractOperation,
  { headers }: OperationResponse,
  values: Readonly<Record<string, string>>
): Violation[] =>
  // OpenAPI ignores a declared Content-Type header; the content map describes it.
  headers
    .filter(({ name }) => name.toLowerCase() !== 'content-type')
    .flatMap(({ name, required, schema }) => {
      const path = ['header', name];
      const subject = `Response header ${name}`;
      const value = values[name.toLowerCase()];
      if (value === undefined) {
        return required ? [{ path, code: 'required', message: `${subject} is required` }] : [];
      }
      // Headers carry arrays comma-separated (`style: simple`).
      const isArray = isRecord(schema?.schema) && schema?.schema.type === 'array';
      const coerced = coerceValue(
        isArray ? value.split(',').map((item) => item.trim()) : value,
        schema?.schema,
        operation.spec.document
      );
      return validateValue(operation, schema, coerced, { path, subject, direction: 'response' });
    });

/** Lists every way a response breaks the operation's declared status codes, headers and bodies. */
export const validateResponse = (
  operation: ContractOperation,
  { statusCode, headers = {}, body }: ResponseInput
): Violation[] => {
  const response = findResponse(operation.responses, statusCode);
  if (!response) {
    return [
      {
        path: ['status'],
        code: 'status',
        message: `Response status ${statusCode} is not declared by the operation`,
      },
    ];
  }
  const values = Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value])
  );
  return [
    ...checkHeaders(operation, response, values),
    // Payloads are often optional, so an empty body is a body left out.
    ...(body === undefined || body === '' || response.contents.length === 0
      ? []
      : validateContent(operation, response.contents, {
          contentType: values['content-type'],
          body,
          direction: 'response',
        })),
  ];
};
