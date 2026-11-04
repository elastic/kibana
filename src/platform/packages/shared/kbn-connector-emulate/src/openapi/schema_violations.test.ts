/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loadContractOperations } from '.';
import type { Direction } from './schema_violations';
import { validateValue } from './schema_violations';

const [operation] = loadContractOperations({
  openapi: '3.0.3',
  info: { title: 'Test', version: '1' },
  paths: {
    '/items': {
      get: {
        responses: {
          '200': {
            description: 'ok',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Item' } } },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Item: {
        type: 'object',
        required: ['id', 'secret'],
        additionalProperties: false,
        properties: {
          id: { $ref: '#/components/schemas/Id' },
          secret: { type: 'string', writeOnly: true },
          owner: { allOf: [{ $ref: '#/components/schemas/Owner' }], nullable: true },
          badge: {
            oneOf: [
              { type: 'object', properties: { label: { type: 'string' } } },
              { type: 'object', properties: { icon: { type: 'string' } } },
            ],
          },
        },
      },
      Id: { type: 'integer', readOnly: true },
      Owner: { type: 'object', required: ['login'], properties: { login: { type: 'string' } } },
    },
  },
});

const [{ schema }] = operation.responses[0].contents;

const validate = (value: unknown, direction: Direction = 'response') =>
  validateValue(operation, schema, value, { path: ['body'], subject: 'Body', direction });

const messages = (value: unknown, direction?: Direction) =>
  validate(value, direction).map(({ message }) => message);

describe('validateValue', () => {
  it('exempts required readOnly properties in requests and writeOnly ones in responses', () => {
    expect(messages({ secret: 's' }, 'request')).toEqual([]);
    expect(messages({ id: 1 }, 'response')).toEqual([]);
    expect(messages({}, 'request')).toEqual([
      'Body: Instance does not have required property "secret".',
    ]);
  });

  it('reports the errors of the union variant that matches the value type', () => {
    expect(messages({ id: 1, owner: null })).toEqual([]);
    expect(validate({ id: 1, owner: { login: 1 } })).toEqual([
      {
        path: ['body', 'owner', 'login'],
        code: 'type',
        message: 'Body at /owner/login: Instance type "number" is invalid. Expected "string".',
      },
    ]);
    expect(messages({ id: 1, owner: 'octocat' })).toEqual([
      'Body at /owner: Instance does not match any subschemas.',
    ]);
  });

  it('reports a value that matches more than one oneOf variant without variant errors', () => {
    expect(messages({ id: 1, badge: { label: 'a' } })).toEqual([
      'Body at /badge: Instance does not match exactly one subschema (2 matches).',
    ]);
  });

  it('reports undeclared properties once, and not for declared ones that fail', () => {
    expect(validate({ id: 'a', extra: true })).toEqual([
      {
        path: ['body', 'id'],
        code: 'type',
        message: 'Body at /id: Instance type "string" is invalid. Expected "integer".',
      },
      {
        path: ['body'],
        code: 'additionalProperties',
        message: 'Body: Property "extra" does not match additional properties schema.',
      },
    ]);
  });

  it('ignores absent values', () => {
    expect(validate(undefined)).toEqual([]);
  });
});
