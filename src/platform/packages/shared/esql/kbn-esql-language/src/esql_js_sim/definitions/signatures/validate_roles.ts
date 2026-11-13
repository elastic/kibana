/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ENTITY_TYPES } from '../entities/entity_facts';
import type { RoleKind } from './types';

/**
 * The shape of the signature data, for checking it at runtime. The types check the roles
 * written in this package; this checks roles that arrive as data, as JSON from another
 * package would. Every field a role may have is listed, so an unknown field is an error.
 */

type FieldCheck = (value: unknown, path: string) => string[];

const oneOf =
  (values: readonly string[]): FieldCheck =>
  (value, path) =>
    typeof value === 'string' && values.includes(value)
      ? []
      : [`${path}: expected one of ${values.join(', ')}`];

const ofType =
  (type: 'string' | 'boolean' | 'number'): FieldCheck =>
  (value, path) =>
    typeof value === type ? [] : [`${path}: expected a ${type}`];

const listOf =
  (check: FieldCheck): FieldCheck =>
  (value, path) =>
    Array.isArray(value)
      ? value.flatMap((item, index) => check(item, `${path}[${index}]`))
      : [`${path}: expected a list`];

const recordOf =
  (check: FieldCheck): FieldCheck =>
  (value, path) =>
    isRecord(value)
      ? Object.entries(value).flatMap(([key, item]) => check(item, `${path}.${key}`))
      : [`${path}: expected an object`];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

interface Shape {
  required: Record<string, FieldCheck>;
  optional: Record<string, FieldCheck>;
}

/** Checks an object against a shape: its required fields, its optional fields, and no other. */
const shaped =
  ({ required, optional }: Shape): FieldCheck =>
  (value, path) => {
    if (!isRecord(value)) {
      return [`${path}: expected an object`];
    }

    const known = { ...required, ...optional };

    return [
      ...Object.keys(required)
        .filter((field) => value[field] === undefined)
        .map((field) => `${path}.${field}: missing`),
      ...Object.keys(value)
        .filter((field) => !(field in known))
        .map((field) => `${path}.${field}: unknown field`),
      ...Object.entries(value).flatMap(([field, item]) =>
        field in known && item !== undefined ? known[field](item, `${path}.${field}`) : []
      ),
    ];
  };

const string = ofType('string');
const boolean = ofType('boolean');
const number = ofType('number');
const strings = listOf(string);
const entityType = oneOf(ENTITY_TYPES);
const valueFormat = oneOf([
  'llm_prompt',
  'search_query',
  'dissect_pattern',
  'grok_pattern',
  'separator',
  'highlight_text',
]);

// A role may hold roles (the roles of a dependent value), so the check refers to itself.
const role: FieldCheck = (value, path) => checkRole(value, path);

// One shape per kind of role: a kind the schema adds without a shape does not compile.
const ROLE_SHAPES: Record<RoleKind, Shape> = {
  column: {
    required: {},
    optional: {
      types: strings,
      wildcard: oneOf(['pattern', 'alone']),
      unique: boolean,
      matches: shaped({ required: { argument: string, property: string }, optional: {} }),
    },
  },
  new_name: { required: { of: oneOf(['column', 'subquery', 'qualifier']) }, optional: {} },
  entity: {
    required: { entityType },
    optional: {
      indexMode: oneOf(['time_series']),
      subqueries: boolean,
      dependsOn: string,
      unique: boolean,
    },
  },
  constant: {
    required: {
      valueType: oneOf([
        'any',
        'integer',
        'double',
        'string',
        'boolean',
        'date',
        'duration',
        'identifier',
      ]),
    },
    optional: {
      allowedValues: strings,
      default: string,
      format: valueFormat,
      range: shaped({ required: {}, optional: { min: number, max: number, exclusive: boolean } }),
    },
  },
  option_name: {
    required: {
      options: recordOf(
        shaped({ required: {}, optional: { conflictsWith: strings, requires: strings } })
      ),
    },
    optional: {},
  },
  map: {
    required: {
      parameters: recordOf(
        shaped({
          required: { type: string },
          optional: {
            list: boolean,
            values: strings,
            default: string,
            entityType,
            taskType: string,
            when: recordOf(strings),
          },
        })
      ),
    },
    optional: {},
  },
  expression: {
    required: {
      mode: oneOf(['scalar', 'aggregation', 'grouping', 'filter', 'constant', 'full_text']),
    },
    optional: {
      types: strings,
      completeAs: oneOf(['boolean']),
      subqueries: boolean,
      fullTextOnlyIn: string,
      columnsOf: string,
      format: valueFormat,
    },
  },
  dependent_value: {
    required: { on: string },
    optional: { roles: recordOf(role), definedBy: entityType },
  },
  parameter: { required: {}, optional: {} },
  sublanguage: { required: { language: oneOf(['promql']) }, optional: {} },
};

const checkRole = (value: unknown, path: string): string[] => {
  if (!isRecord(value) || typeof value.kind !== 'string') {
    return [`${path}: expected a role with a kind`];
  }

  if (!(value.kind in ROLE_SHAPES)) {
    return [`${path}.kind: unknown kind ${value.kind}`];
  }

  const shape = ROLE_SHAPES[value.kind as RoleKind];

  const { kind, ...fields } = value;

  return shaped(shape)(fields, path);
};

/** The kinds of role the schema has. */
export const ROLE_KINDS = Object.keys(ROLE_SHAPES) as RoleKind[];

/**
 * Checks a table of argument roles that arrives as data. Returns what is wrong with it, one
 * line per problem; an empty list means the table fits the schema.
 */
export const validateArgumentRoles = (roles: unknown): string[] =>
  isRecord(roles)
    ? Object.entries(roles).flatMap(([id, value]) => checkRole(value, id))
    : ['expected a table of roles by call site'];
