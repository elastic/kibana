/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getPropertyNames, getSchemaTypes } from './coerce_value';
import type { ParameterInput } from './read_parameters';
import { isExplodedFormObject, readParameters } from './read_parameters';
import { validateValue } from './schema_violations';
import type { ContractOperation, OperationParameter, Violation } from './types';
import { validateContent } from './validate_content';

/** The query parameter that selects the page in opaque next-page URLs the mock issues. */
export const MOCK_PAGE_PARAM = 'contract-mock-page';

export interface RequestInput extends ParameterInput {
  /** Parsed JSON, or the raw text for other media types. */
  readonly body?: unknown;
  /** Why a body sent as JSON didn't parse. */
  readonly bodyError?: string;
}

// A parameter described by `content` instead of `schema` carries a value serialized as its
// media type, such as `?filter={"state":"open"}` for JSON.
const checkContentParameter = (
  operation: ContractOperation,
  { content }: OperationParameter,
  value: unknown,
  path: string[],
  subject: string
): Violation[] => {
  if (!content?.schema) {
    return [];
  }
  let parsed = value;
  if (typeof value === 'string' && /[/+]json$/.test(content.mediaType.split(';')[0].trim())) {
    try {
      parsed = JSON.parse(value);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return [{ path, code: 'syntax', message: `${subject} is not JSON: ${reason}` }];
    }
  }
  return validateValue(operation, content.schema, parsed, { path, subject, direction: 'request' });
};

const checkParameters = (operation: ContractOperation, input: RequestInput): Violation[] =>
  readParameters(operation, input).flatMap(({ parameter, value }) => {
    const { in: location, name, required, schema, content } = parameter;
    const path = [location, name];
    const subject = `Request ${location} parameter ${name}`;
    if (value === undefined) {
      return required ? [{ path, code: 'required', message: `${subject} is required` }] : [];
    }
    if (!schema && content) {
      return checkContentParameter(operation, parameter, value, path, subject);
    }
    return validateValue(operation, schema, value, { path, subject, direction: 'request' });
  });

// Schemas can't express these, but vendors reject such query strings.
const checkQueryEncoding = (
  { parameters, security, spec: { document } }: ContractOperation,
  { query }: RequestInput
): Violation[] => {
  const declared = parameters.filter((parameter) => parameter.in === 'query');
  // Exploded form-style objects send each property as its own key, `?min=1&max=5`.
  const objectProperties = new Set(
    declared.flatMap((parameter) => {
      const schema = parameter.schema?.schema;
      return isExplodedFormObject(parameter, getSchemaTypes(schema, document))
        ? [...getPropertyNames(schema, document)]
        : [];
    })
  );
  // API keys sent in the query are declared by security schemes, not as parameters.
  const credentials = new Set(
    security
      .flat()
      .flatMap(({ credential }) => (credential?.in === 'query' ? [credential.name] : []))
  );
  const undeclared = Object.keys(query)
    .filter(
      (key) =>
        key !== MOCK_PAGE_PARAM &&
        !credentials.has(key) &&
        !objectProperties.has(key) &&
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

const checkBody = (
  operation: ContractOperation,
  { headers, body, bodyError }: RequestInput
): Violation[] => {
  // Malformed JSON could otherwise pass a string schema as the raw text.
  if (bodyError !== undefined) {
    return [{ path: ['body'], code: 'syntax', message: `Request body is not JSON: ${bodyError}` }];
  }
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
