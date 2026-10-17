/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JsonObject, JsonValue } from './types';
import { isObject, resolveLocalRef, resolveTopLevelUnion, unwrapTemplate } from './schema_helpers';

/**
 * Collect string literals from a discriminator `type` node: a bare `const`, an
 * `enum`, or any of those nested inside `anyOf`/`oneOf`/`allOf`.
 */
const collectTypeLiterals = (typeNode: JsonValue | undefined, out: Set<string>): void => {
  const node = unwrapTemplate(typeNode);
  if (!isObject(node)) {
    return;
  }
  if (typeof node.const === 'string') {
    out.add(node.const);
  }
  if (Array.isArray(node.enum)) {
    for (const value of node.enum) {
      if (typeof value === 'string') {
        out.add(value);
      }
    }
  }
  for (const key of ['anyOf', 'oneOf', 'allOf'] as const) {
    const branches = node[key];
    if (Array.isArray(branches)) {
      branches.forEach((branch) => collectTypeLiterals(branch, out));
    }
  }
};

/**
 * Walk the direct members of a discriminated union and collect each member's
 * `properties.type` discriminator literal(s). Deliberately does NOT descend into
 * member `properties`/`items` bodies, so unrelated inner schemas that happen to
 * have a `type` property (e.g. a step parameter named `type`) are not counted.
 * `$ref`s are resolved with a cycle guard; composition keywords are followed so
 * `allOf`/nested-union members are reached.
 */
const collectUnionDiscriminators = (
  root: JsonObject,
  unionNode: JsonValue | undefined
): string[] => {
  const out = new Set<string>();
  const seenRefs = new Set<string>();

  const visitMember = (node: JsonValue | undefined): void => {
    let resolved = unwrapTemplate(node);
    if (isObject(resolved) && typeof resolved.$ref === 'string') {
      if (seenRefs.has(resolved.$ref)) {
        return;
      }
      seenRefs.add(resolved.$ref);
      resolved = resolveLocalRef(root, resolved.$ref) ?? resolved;
    }
    if (!isObject(resolved)) {
      return;
    }
    for (const key of ['anyOf', 'oneOf', 'allOf'] as const) {
      const branches = resolved[key];
      if (Array.isArray(branches)) {
        branches.forEach(visitMember);
      }
    }
    if (isObject(resolved.properties) && resolved.properties.type !== undefined) {
      collectTypeLiterals(resolved.properties.type, out);
    }
  };

  visitMember(unionNode);
  return [...out].sort();
};

/**
 * Extract the sorted, de-duplicated `type` discriminators of the union backing a
 * top-level array property. Throws (rather than silently returning `[]`) when the
 * union cannot be located or yields no discriminators, so an unexpected composed
 * schema shape fails loudly instead of producing a plausible-but-empty artifact.
 */
const extractUnionTypes = (schema: JsonObject, propertyName: string): string[] => {
  const union = resolveTopLevelUnion(schema, propertyName);
  if (!isObject(union)) {
    throw new Error(
      `Could not locate the "${propertyName}" union in the composed schema. ` +
        `The schema shape was not recognized; refusing to emit an empty type list.`
    );
  }
  const discriminators = collectUnionDiscriminators(schema, union);
  if (discriminators.length === 0) {
    throw new Error(
      `Resolved the "${propertyName}" union but found no "type" discriminators. ` +
        `The schema shape was not recognized; refusing to emit an empty type list.`
    );
  }
  return discriminators;
};

/** Sorted, de-duplicated list of step `type` discriminators in the schema. */
export const extractStepTypes = (schema: JsonObject): string[] =>
  extractUnionTypes(schema, 'steps');

/** Sorted, de-duplicated list of trigger `type` discriminators in the schema. */
export const extractTriggerTypes = (schema: JsonObject): string[] =>
  extractUnionTypes(schema, 'triggers');
