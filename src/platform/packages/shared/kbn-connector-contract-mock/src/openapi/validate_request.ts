/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ParameterInput } from './read_parameters';
import { readParameters } from './read_parameters';
import { validateValue } from './schema_violations';
import type { ContractOperation, Violation } from './types';
import { validateContent } from './validate_content';

export interface RequestInput extends ParameterInput {
  /** Parsed JSON, or the raw text for other media types. */
  readonly body?: unknown;
}

const checkParameters = (operation: ContractOperation, input: RequestInput): Violation[] =>
  readParameters(operation, input).flatMap(
    ({ parameter: { in: location, name, ...parameter }, value }) => {
      const path = [location, name];
      const subject = `Request ${location} parameter ${name}`;
      if (value === undefined) {
        return parameter.required
          ? [{ path, code: 'required', message: `${subject} is required` }]
          : [];
      }
      return validateValue(operation, parameter.schema, value, {
        path,
        subject,
        direction: 'request',
      });
    }
  );

// Schemas can't express these, but vendors reject such query strings.
const checkQueryEncoding = (
  { parameters }: ContractOperation,
  { query }: RequestInput
): Violation[] => {
  const declared = parameters.filter((parameter) => parameter.in === 'query');
  const undeclared = Object.keys(query)
    .filter(
      (key) =>
        !declared.some(
          ({ name, style }) =>
            key === name || (style === 'deepObject' && key.startsWith(`${name}[`))
        )
    )
    .map((key) => ({
      path: ['query', key],
      code: 'undeclared',
      message: `Request query parameter ${key} is not declared by the operation`,
    }));
  const repeated = declared
    .filter(
      ({ name, style, explode }) => style === 'form' && !explode && Array.isArray(query[name])
    )
    .map(({ name }) => ({
      path: ['query', name],
      code: 'explode',
      message: `Request query parameter ${name} must be comma-separated (explode: false), not repeated`,
    }));
  return [...undeclared, ...repeated];
};

const checkBody = (operation: ContractOperation, { headers, body }: RequestInput): Violation[] => {
  const { requestBody } = operation;
  if (!requestBody || requestBody.contents.length === 0) {
    return [];
  }
  if (body === undefined) {
    return requestBody.required
      ? [{ path: ['body'], code: 'required', message: 'Request body is required' }]
      : [];
  }
  return validateContent(operation, requestBody.contents, {
    contentType: headers['content-type'],
    body,
    direction: 'request',
  });
};

/** Lists every way a request breaks the operation's parameters and request body. */
export const validateRequest = (operation: ContractOperation, input: RequestInput): Violation[] => [
  ...checkParameters(operation, input),
  ...checkQueryEncoding(operation, input),
  ...checkBody(operation, input),
];
