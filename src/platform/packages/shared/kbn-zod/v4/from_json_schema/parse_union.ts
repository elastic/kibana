/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from 'zod/v4';
import type { JsonSchema } from './types';

type JsonSchemaParser = (schema: JsonSchema) => z.ZodType;

/**
 * Finds a common discriminator property across union options.
 *
 * A discriminator is a property that:
 * 1. Exists in all options
 * 2. Has a const value in each option
 * 3. Has unique const values across options (for multi-option unions)
 *
 * For single-option unions, we detect a discriminator if ANY property has a const value.
 */
function findDiscriminator(options: JsonSchema[]): string | null {
  if (options.length === 0) return null;

  // Get all property keys from the first option
  const firstProps = options[0].properties || {};
  const candidateKeys = Object.keys(firstProps);

  for (const key of candidateKeys) {
    // Check if this key has a const value in the first option
    const firstProp = firstProps[key];
    if (!('const' in firstProp)) continue;

    // For single-option unions, finding any const property is enough
    if (options.length === 1) {
      return key;
    }

    // For multi-option unions, check if all options have this key with a const value
    const allHaveConst = options.every((opt) => {
      const prop = opt.properties?.[key];
      return prop && 'const' in prop;
    });

    if (allHaveConst) {
      // Verify all const values are unique
      const constValues = options.map((opt) => opt.properties?.[key]?.const);
      const uniqueValues = new Set(constValues);
      if (uniqueValues.size === options.length) {
        return key;
      }
    }
  }

  return null;
}

/**
 * Parses a JSON Schema anyOf/oneOf into a Zod union or discriminated union.
 *
 * If a discriminator property is found, uses z.discriminatedUnion for better error messages.
 * This includes single-option unions where a discriminator is present.
 *
 * @param schema - JSON Schema with anyOf or oneOf
 * @param parseJsonSchema - Recursive parser for option schemas
 * @returns Zod union schema
 */
export function parseUnion(schema: JsonSchema, parseJsonSchema: JsonSchemaParser): z.ZodType {
  const options = schema.anyOf || schema.oneOf || [];

  if (options.length === 0) {
    return z.never();
  }

  const zodOptions = options.map((opt) => parseJsonSchema(opt));
  const discriminator = findDiscriminator(options);

  if (discriminator) {
    return z.discriminatedUnion(discriminator, zodOptions as any);
  }

  // z.union() requires at least 2 options, so unwrap single-option unions
  if (options.length === 1) {
    return zodOptions[0];
  }

  // Fall back to regular union which will attempt to validate against each option in sequence
  return z.union(zodOptions as [z.ZodType, z.ZodType, ...z.ZodType[]]);
}
