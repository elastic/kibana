/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual } from 'lodash';
import type { OpenAPIV3 } from 'openapi-types';

const ISSUE_URL = 'https://github.com/elastic/kibana/issues/271809';

/**
 * Shared schemas are stripped of transient internal annotations before registration.
 */
export const schemasMatch = isEqual;

const propertyNames = (schema: OpenAPIV3.SchemaObject): string[] => {
  return schema.properties ? Object.keys(schema.properties).sort() : [];
};

const sortedDifference = (a: readonly string[], b: readonly string[]): string[] => {
  const bSet = new Set(b);
  return a.filter((key) => !bSet.has(key));
};

const formatKeyList = (keys: readonly string[]): string => {
  if (keys.length === 0) return '(none)';
  return keys.map((key) => `\`${key}\``).join(', ');
};

/**
 * Build the human-readable diagnostic for a shared-schema id collision.
 *
 * Two shapes are considered colliding when they share an id but differ
 * in any way (deep-equal mismatch). The diagnostic lists property-key
 * differences first because that is the dominant failure mode driven by
 * `Base.extends({...})` patterns inheriting `meta.id` from the base.
 */
export const describeSchemaCollision = (
  id: string,
  previous: OpenAPIV3.SchemaObject,
  next: OpenAPIV3.SchemaObject
): string => {
  const previousKeys = propertyNames(previous);
  const nextKeys = propertyNames(next);
  const onlyInPrevious = sortedDifference(previousKeys, nextKeys);
  const onlyInNext = sortedDifference(nextKeys, previousKeys);

  const lines = [
    `OAS shared schema collision for id "${id}": the same id was registered with two different shapes.`,
  ];

  if (onlyInPrevious.length > 0 || onlyInNext.length > 0) {
    lines.push(
      `  properties only in the first registration: ${formatKeyList(onlyInPrevious)}`,
      `  properties only in the second registration: ${formatKeyList(onlyInNext)}`
    );
  } else {
    lines.push('  property key sets match; the shapes differ in property definitions or metadata.');
  }

  lines.push(
    'This usually means a `Base.extends({...})` call inherited `meta.id` from its base, ' +
      'or two unrelated schemas accidentally chose the same id string. ' +
      "Pass `{ meta: { id: 'distinct_id' } }` as the second argument to `extends()` " +
      `to give the derived schema its own component name. See ${ISSUE_URL}.`
  );

  return lines.join('\n');
};

/**
 * Thrown by the OAS converter when a shared schema id is registered with two
 * different shapes within a single generation pass.
 */
export class OasSchemaCollisionError extends Error {
  public readonly schemaId: string;
  constructor(message: string, schemaId: string) {
    super(message);
    this.name = 'OasSchemaCollisionError';
    this.schemaId = schemaId;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
