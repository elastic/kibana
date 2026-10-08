/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OutputUnit } from '@cfworker/json-schema';
import { getSchemaValidator, resolveSchemaRef } from './schema_validator';
import { isRecord } from './schema_walk';
import type { ContractOperation, ContractSpec, SpecSchema, Violation } from './types';

export type Direction = 'request' | 'response';

export interface ValueContext {
  readonly path: readonly string[];
  /** Names the value in messages, e.g. `Request query parameter limit`. */
  readonly subject: string;
  readonly direction: Direction;
}

// Errors that only report that a subschema failed; the subschema's own errors follow them.
const WRAPPER_KEYWORDS = new Set([
  '$recursiveRef',
  '$ref',
  'additionalItems',
  'allOf',
  'items',
  'patternProperties',
  'prefixItems',
  'properties',
  'unevaluatedItems',
]);

// These report the offending property themselves; the `false` schema error that follows adds nothing.
const PROPERTY_SCHEMA_KEYWORDS = new Set(['additionalProperties', 'unevaluatedProperties']);

// OpenAPI exempts required readOnly properties from requests and writeOnly ones from responses.
const EXEMPT_FLAG = { request: 'readOnly', response: 'writeOnly' } as const;

const REQUIRED_PROPERTY = /^Instance does not have required property "(.*)"\.$/;
const ADDITIONAL_PROPERTY = /^Property "(.*)" does not match additional properties schema\.$/;

const toTokens = (location: string): string[] =>
  location
    .split('/')
    .slice(1)
    .map((token) => decodeURI(token).replace(/~1/g, '/').replace(/~0/g, '~'));

const isAtOrBelow = (location: string, ancestor: string): boolean =>
  location === ancestor || location.startsWith(`${ancestor}/`);

// A `false` schema reports its instance location as its keyword location.
const isWithin = (error: OutputUnit, parent: OutputUnit): boolean =>
  error.keywordLocation.startsWith(`${parent.keywordLocation}/`) ||
  (error.keyword === 'false' && isAtOrBelow(error.instanceLocation, parent.instanceLocation));

/** Returns the schema at an evaluation path such as `#/$ref/properties/owner`, following refs. */
const resolveEvaluationPath = (spec: ContractSpec, root: unknown, location: string): unknown =>
  toTokens(location).reduce<unknown>((node, token) => {
    if (token === '$ref' && isRecord(node) && typeof node.$ref === 'string') {
      return resolveSchemaRef(spec, node.$ref);
    }
    return isRecord(node) ? node[token] : Array.isArray(node) ? node[Number(token)] : undefined;
  }, root);

interface SimplifyContext {
  readonly spec: ContractSpec;
  readonly root: unknown;
}

const isTypeMismatch = (errors: readonly OutputUnit[], { instanceLocation }: OutputUnit) =>
  errors.every((error) => error.keyword === 'type' && error.instanceLocation === instanceLocation);

/**
 * Keeps the errors of the one `anyOf`/`oneOf` variant that matches the value's type, so a value
 * that breaks e.g. the object branch of a nullable union reports why. Otherwise reports only that
 * no variant (or more than one `oneOf` variant) matched.
 */
const simplifyCombinator = (
  combinator: OutputUnit,
  descendants: readonly OutputUnit[],
  context: SimplifyContext
): OutputUnit[] => {
  const variants = resolveEvaluationPath(context.spec, context.root, combinator.keywordLocation);
  const prefix = `${combinator.keywordLocation}/`;
  const failing = new Map<string, OutputUnit[]>();
  let current = '';
  for (const error of descendants) {
    if (error.keywordLocation.startsWith(prefix)) {
      [current] = error.keywordLocation.slice(prefix.length).split('/');
    }
    failing.set(current, [...(failing.get(current) ?? []), error]);
  }
  const allFailed = Array.isArray(variants) && failing.size === variants.length;
  const candidates = [...failing.values()]
    .map((errors) => simplifyErrors(errors, context))
    .filter((errors) => !isTypeMismatch(errors, combinator));
  return allFailed && candidates.length === 1 ? candidates[0] : [combinator];
};

// cfworker also applies `additionalProperties` to declared properties whose own schema failed.
const isDeclaredProperty = (
  { keyword, keywordLocation, error }: OutputUnit,
  { spec, root }: SimplifyContext
): boolean => {
  const [, name] = (keyword === 'additionalProperties' && ADDITIONAL_PROPERTY.exec(error)) || [];
  if (name === undefined) {
    return false;
  }
  const schema = resolveEvaluationPath(
    spec,
    root,
    keywordLocation.replace(/\/additionalProperties$/, '')
  );
  if (!isRecord(schema)) {
    return false;
  }
  const { properties, patternProperties } = schema;
  return (
    (isRecord(properties) && Object.hasOwn(properties, name)) ||
    (isRecord(patternProperties) &&
      Object.keys(patternProperties).some((pattern) => new RegExp(pattern, 'u').test(name)))
  );
};

const simplifyErrors = (errors: readonly OutputUnit[], context: SimplifyContext): OutputUnit[] => {
  const result: OutputUnit[] = [];
  for (let index = 0; index < errors.length; index++) {
    const error = errors[index];
    const isCombinator = error.keyword === 'anyOf' || error.keyword === 'oneOf';
    if (isCombinator || isDeclaredProperty(error, context)) {
      let end = index + 1;
      while (end < errors.length && isWithin(errors[end], error)) {
        end++;
      }
      if (isCombinator) {
        result.push(...simplifyCombinator(error, errors.slice(index + 1, end), context));
      }
      index = end - 1;
    } else if (
      !WRAPPER_KEYWORDS.has(error.keyword) &&
      !(error.keyword === 'false' && PROPERTY_SCHEMA_KEYWORDS.has(errors[index - 1]?.keyword))
    ) {
      result.push(error);
    }
  }
  return result;
};

const isExemptRequired = (
  { keyword, keywordLocation, error }: OutputUnit,
  { spec, root }: SimplifyContext,
  direction: Direction
): boolean => {
  const [, name] = (keyword === 'required' && REQUIRED_PROPERTY.exec(error)) || [];
  if (name === undefined) {
    return false;
  }
  const schema = resolveEvaluationPath(spec, root, keywordLocation.replace(/\/required$/, ''));
  const property = isRecord(schema) && isRecord(schema.properties) && schema.properties[name];
  const resolved =
    isRecord(property) && typeof property.$ref === 'string'
      ? resolveSchemaRef(spec, property.$ref)
      : property;
  const flag = EXEMPT_FLAG[direction];
  return (
    isRecord(property) &&
    (property[flag] === true || (isRecord(resolved) && resolved[flag] === true))
  );
};

const toViolation = (
  { keyword, instanceLocation, error }: OutputUnit,
  { path, subject }: ValueContext
): Violation => {
  const pointer = decodeURI(instanceLocation.slice(1));
  const at = pointer ? ` at ${pointer}` : '';
  return {
    path: [...path, ...toTokens(instanceLocation)],
    code: keyword,
    message: `${subject}${at}: ${keyword === 'false' ? 'Value is not allowed.' : error}`,
  };
};

/** Validates a value against a schema of an operation, mapping schema errors to violations. */
export const validateValue = (
  { spec }: ContractOperation,
  schema: SpecSchema | undefined,
  value: unknown,
  context: ValueContext
): Violation[] => {
  if (!schema || value === undefined) {
    return [];
  }
  const errors = getSchemaValidator(spec, schema)(value);
  if (errors.length === 0) {
    return [];
  }
  const simplifyContext = { spec, root: schema.schema };
  return simplifyErrors(errors, simplifyContext)
    .filter((error) => !isExemptRequired(error, simplifyContext, context.direction))
    .map((error) => toViolation(error, context));
};
