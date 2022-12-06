/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import type { RootSchema, SchemaArray, SchemaObject, SchemaValue } from '../types';
import { excess } from './excess';

/**
 * Is it a tuple of t.Mixed?
 * @param schemas Array of io-ts schemas
 */
function isOneOfCandidate(schemas: t.Mixed[]): schemas is [t.Mixed, t.Mixed] {
  return schemas.length === 2;
}

/**
 * Converts each {@link SchemaValue} to the io-ts equivalent
 * @param value The {@link SchemaValue} to parse
 */
function schemaValueToIoTs<Value>(value: SchemaValue<Value>): t.Mixed {
  // We need to check the pass_through type on top of everything
  if ((value as { type: 'pass_through' }).type === 'pass_through') {
    return t.unknown;
  }

  if ('properties' in value) {
    const { DYNAMIC_KEY, ...properties } = value.properties as SchemaObject<Value>['properties'] & {
      DYNAMIC_KEY?: SchemaValue<unknown>;
    };
    const schemas: t.Mixed[] = [schemaObjectToIoTs<Record<string, unknown>>({ properties })];
    if (DYNAMIC_KEY) {
      schemas.push(t.record(t.string, schemaValueToIoTs(DYNAMIC_KEY)));
    }
    return isOneOfCandidate(schemas) ? t.union(schemas) : schemas[0];
  } else {
    const valueType = value.type; // Copied in here because of TS reasons, it's not available in the `default` case
    switch (valueType) {
      case 'boolean':
        return t.boolean;
      case 'keyword':
      case 'text':
      case 'date':
        return t.string;
      case 'byte':
      case 'double':
      case 'float':
      case 'integer':
      case 'long':
      case 'short':
        return t.number;
      case 'array':
        if ('items' in value) {
          return t.array(schemaValueToIoTs((value as SchemaArray<unknown, unknown>).items));
        }
        throw new Error(`Schema type must include the "items" declaration.`);
      default:
        throw new Error(`Unsupported schema type ${valueType}.`);
    }
  }
}

/**
 * Loops through a list of [key, SchemaValue] tuples to convert them into a valid io-ts parameter to define objects.
 * @param entries Array of tuples [key, {@link SchemaValue}]. Typically, coming from Object.entries(SchemaObject).
 */
function entriesToObjectIoTs<Value>(
  entries: Array<[string, SchemaValue<Value>]>
): Record<string, t.Mixed> {
  return Object.fromEntries(
    entries.map(([key, value]) => {
      try {
        return [key, schemaValueToIoTs(value)];
      } catch (err) {
        err.failedKey = [key, ...(err.failedKey || [])];
        throw err;
      }
    })
  );
}

/**
 * Converts a {@link SchemaObject} to the io-ts equivalent.
 * @param schemaObject The {@link SchemaObject} to parse.
 */
function schemaObjectToIoTs<Value>(
  schemaObject: SchemaObject<Value>
): t.Type<Record<string, unknown>> {
  const objectEntries: Array<[string, SchemaValue<unknown>]> = Object.entries(
    schemaObject.properties
  );

  const requiredFields = objectEntries.filter(([key, { _meta }]) => _meta?.optional !== true);
  const optionalFields = objectEntries.filter(([key, { _meta }]) => _meta?.optional === true);

  return excess(
    t.intersection([
      t.interface(entriesToObjectIoTs(requiredFields)),
      t.partial(entriesToObjectIoTs(optionalFields)),
    ])
  );
}

/**
 * Converts a {@link RootSchema} to an io-ts validation object.
 * @param rootSchema The {@link RootSchema} to be parsed.
 */
export function schemaToIoTs<Base>(rootSchema: RootSchema<Base>): t.Type<Record<string, unknown>> {
  try {
    return schemaObjectToIoTs({ properties: rootSchema });
  } catch (err) {
    if (err.failedKey) {
      err.message = `Malformed schema for key [${err.failedKey.join('.')}]: ${err.message}`;
    }
    throw err;
  }
}
