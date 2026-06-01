/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';

const SUPPORTED_TYPES = new Set(['string', 'number', 'boolean', 'array']);
const UNSUPPORTED_KEYS = ['oneOf', 'anyOf', 'allOf', '$ref', 'definitions'];

/**
 * Returns true iff SchemaForm from @kbn/workflows-hitl-form can render every
 * property in the given JSON Schema. SchemaForm supports only the Phase-0
 * subset: string, number, boolean, single-select enum, and array-of-enum.
 * Anything outside that set (nested objects, oneOf, anyOf, $ref, etc.) falls
 * back to the Monaco JSON editor modal.
 */
export const canRenderWithSchemaForm = (
  schema: JsonModelSchemaType | null | undefined
): boolean => {
  if (!schema) return false;

  const properties = schema.properties;
  if (!properties || Object.keys(properties).length === 0) return false;

  for (const key of UNSUPPORTED_KEYS) {
    if (key in schema) return false;
  }

  for (const [, field] of Object.entries(properties)) {
    const { type } = field as { type?: string; items?: { enum?: unknown[] }; properties?: unknown };

    if (!type || !SUPPORTED_TYPES.has(type)) return false;

    if (type === 'array') {
      const items = (field as { items?: { type?: string; enum?: unknown[] } }).items;
      if (!items?.enum || items.enum.length === 0) return false;
    }

    // Nested objects are not renderable
    if ((field as { properties?: unknown }).properties) return false;
  }

  return true;
};
