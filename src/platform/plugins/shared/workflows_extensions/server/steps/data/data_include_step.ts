/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';

import {
  dataIncludeStepCommonDefinition,
  type DataIncludeStepOutputSchema,
} from '../../../common/steps/data';
import { createServerStepDefinition } from '../../step_registry/types';

type DataIncludeOutput = z.infer<DataIncludeStepOutputSchema>;

type FieldsSpec = Record<string, unknown>;

export const dataIncludeStepDefinition = createServerStepDefinition({
  ...dataIncludeStepCommonDefinition,
  handler: async (context) => {
    try {
      const item = context.contextManager.renderInputTemplate(context.config.item);
      const fieldsSpec = context.input.fields as FieldsSpec;

      const validationError = validateInput(item, fieldsSpec);
      if (validationError) {
        context.logger.error(validationError.message);
        return { error: validationError };
      }

      const isArray = Array.isArray(item);
      const shouldReturnObject = !isArray;
      const itemsArray = isArray ? item : [item];

      if (itemsArray.length === 0) {
        return { output: [] as DataIncludeOutput };
      }

      const included = itemsArray.map((itemInArray) => applyInclude(itemInArray, fieldsSpec));
      const output: DataIncludeOutput = shouldReturnObject
        ? (included[0] as Record<string, unknown>)
        : (included as Array<Record<string, unknown>>);
      return { output };
    } catch (error) {
      context.logger.error('Failed to include fields', error);
      return {
        error: new Error(error instanceof Error ? error.message : 'Failed to include fields'),
      };
    }
  },
});

/* ------------------
  Utility functions
   ------------------ */

/**
 * Validates item and fieldsSpec. Returns an Error if invalid, null if valid.
 */
function validateInput(item: unknown, fieldsSpec: unknown): Error | null {
  if (item == null) {
    return new Error(
      'Item cannot be null or undefined. Please provide an array or object to include fields from.'
    );
  }
  const isArray = Array.isArray(item);
  if (!isArray && typeof item !== 'object') {
    return new Error(
      `Expected item to be an array or object, but received ${typeof item}. Please provide an array or object.`
    );
  }
  if (typeof fieldsSpec !== 'object' || fieldsSpec === null || Array.isArray(fieldsSpec)) {
    return new Error('Fields must be an object defining the set of fields to include.');
  }
  return null;
}

function isNestedSpec(value: unknown): value is FieldsSpec {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value as object).length > 0
  );
}

/**
 * Applies the include (field projection) to a value. For arrays, applies the
 * same spec to each element. For objects, keeps only keys present in the spec;
 * if the spec value is a nested object, recurses into that branch.
 */
function applyInclude(value: unknown, fieldsSpec: FieldsSpec | null | undefined): unknown {
  if (fieldsSpec == null || typeof fieldsSpec !== 'object' || Array.isArray(fieldsSpec)) {
    return value;
  }

  const spec = fieldsSpec as FieldsSpec;

  if (Array.isArray(value)) {
    return value.map((item) => applyInclude(item, spec));
  }

  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(spec)) {
      if (key in obj) {
        const childSpec = spec[key];
        const childValue = obj[key];
        result[key] = isNestedSpec(childSpec)
          ? applyInclude(childValue, childSpec as FieldsSpec)
          : childValue;
      }
    }
    return result;
  }

  return value;
}
