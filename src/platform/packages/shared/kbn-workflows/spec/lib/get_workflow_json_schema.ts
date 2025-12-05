/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { getOrResolveObject } from '../../common/utils';

export function getWorkflowJsonSchema(zodSchema: z.ZodType): z.core.JSONSchema.JSONSchema | null {
  try {
    return z.toJSONSchema(zodSchema, {
      target: 'draft-7',
      unrepresentable: 'any', // do not throw an error for unrepresentable types
      reused: 'ref', // using ref reduces the size of the schema 4x
      override: (ctx) => {
        filterRequiredFields(ctx);
        removeAdditionalPropertiesFromAllOfItems(ctx);
        setMarkdownDescriptionIfSyntaxDetected(ctx);
      },
    });
  } catch (error) {
    // console.error('Error generating JSON schema from YAML schema:', error);
    return null;
  }
}

// this function MODIFIES the jsonSchema in place
function filterRequiredFields(ctx: {
  zodSchema: z.core.$ZodTypes;
  jsonSchema: z.core.JSONSchema.BaseSchema;
  path: (string | number)[];
}) {
  // Adjust the 'required' array on object schemas because we validating user input not the result of safeParse.
  // we'd love to use 'io:input' but it results in memory leak currently
  if (ctx.jsonSchema.required && ctx.jsonSchema.required.length > 0) {
    const newRequired = ctx.jsonSchema.required.filter((field) => {
      const fieldObject = ctx.jsonSchema.properties?.[field];
      if (!fieldObject) {
        // field is not defined in the schema, weird, skipping
        return false;
      }
      const fieldSchema = getOrResolveObject(
        fieldObject as z.core.JSONSchema.JSONSchema,
        ctx.jsonSchema
      );
      // filter out from 'required' array, if field has default or optional
      return (
        fieldSchema &&
        typeof fieldSchema === 'object' &&
        !('default' in fieldSchema) &&
        !('optional' in fieldSchema)
      );
    });
    ctx.jsonSchema.required = newRequired.length > 0 ? newRequired : undefined;
  }
}

function removeAdditionalPropertiesFromAllOfItems(ctx: {
  zodSchema: z.core.$ZodTypes;
  jsonSchema: z.core.JSONSchema.BaseSchema;
  path: (string | number)[];
}) {
  const lastPathPart = ctx.path[ctx.path.length - 1];
  const secondLastPathPart = ctx.path[ctx.path.length - 2];
  // if we are inside an item of an allOf array, we need to remove additionalProperties
  if (
    typeof lastPathPart === 'number' &&
    typeof secondLastPathPart === 'string' &&
    secondLastPathPart === 'allOf'
  ) {
    ctx.jsonSchema.additionalProperties = undefined;
  }
}

function setMarkdownDescriptionIfSyntaxDetected(ctx: {
  zodSchema: z.core.$ZodTypes;
  jsonSchema: z.core.JSONSchema.BaseSchema;
  path: (string | number)[];
}) {
  const description = ctx.jsonSchema.description;
  if (!description) {
    return;
  }
  const isMarkdown = /[\\`*_{}[\]()#+\-.!]/g.test(description);
  if (!isMarkdown) {
    return;
  }
  ctx.jsonSchema.markdownDescription = description;
}
