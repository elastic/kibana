/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isZod, z } from '@kbn/zod';
import type { OpenAPIV3 } from 'openapi-types';
import { toOpenAPI30Nullable } from './post_process_mutations/nullable';

import type { KnownParameters, OpenAPIConverter } from '../../type';
import { validatePathParameters } from '../common';

export const is = isZod;

const createError = (message: string): Error => {
  return new Error(`[Zod converter] ${message}`);
};

/**
 * Asserts that the provided schema is an instance of provided Zod type
 * or else throws an error with the provided message.
 */
function assertZodType<T extends z.ZodType>(
  schema: unknown,
  type: new (...args: any[]) => T,
  message: string
): asserts schema is T {
  if (!(schema instanceof type)) {
    throw createError(message);
  }
}

type JSONSchema = z.core.JSONSchema.BaseSchema;
/**
 * Asserts that the provided schema is an instance of provided Zod type
 * or else throws an error with the provided message.
 */
const assertJSONSchemaType = (
  schema: JSONSchema,
  type: NonNullable<JSONSchema['type']>,
  message: string
): asserts schema => {
  if (schema.type !== type) {
    throw createError(message);
  }
};

// Keeps tracks of shared schemas that are used across multiple OpenAPI components.
const openApiRefPathPrefix = '#/components/schemas/';
const zodRefPathPrefix = '#/definitions/';
type SharedSchemas = ReturnType<OpenAPIConverter['convert']>['shared'];
let sharedSchemaKeyCounter = 0;
const shared: SharedSchemas = {};
const stringifiedSnapshots = new Map<string, string>(); // Keep a copy for performance

function postProcessJsonOutput(json: z.core.JSONSchema.BaseSchema) {
  if (!json || typeof json !== 'object') {
    return json;
  }

  // Remove the $schema property if it exists
  if (typeof json.$schema !== 'undefined') {
    delete json.$schema;
  }

  // Convert to string once for all processing
  let jsonString = JSON.stringify(json, (key, value) => {
    // Remove the `const` property, not supported in OpenAPI 3.0
    if (key === 'const') {
      return undefined; // Remove the const property
    }
    return value;
  });

  // Process shared schemas if definitions exist
  if (json.definitions) {
    Object.entries(json.definitions).forEach(([defKey, defValue]) => {
      // Check if the stringified defValue is already in shared schemas
      const valueString = JSON.stringify(defValue);

      // Look for existing matching schema by stringified content
      const existingKey = stringifiedSnapshots.get(valueString);

      if (existingKey) {
        // Schema already exists, replace references with existing defKey
        const oldRef = `${zodRefPathPrefix}${defKey}`;
        const newRef = `${openApiRefPathPrefix}${existingKey}`;
        jsonString = jsonString.replaceAll(`"${oldRef}"`, `"${newRef}"`);
      } else {
        // Schema doesn't exist, create new entry
        const newKey = `__schema${sharedSchemaKeyCounter++}`;
        const newRef = `${openApiRefPathPrefix}${newKey}`;

        // Process the schema defValue to replace any internal references
        let processedValue = defValue;
        const valueJsonString = JSON.stringify(defValue);

        // Replace any internal zod references in the schema defValue itself
        const updatedValueString = valueJsonString.replaceAll(
          `"${zodRefPathPrefix}`,
          `"${openApiRefPathPrefix}`
        );
        if (updatedValueString !== valueJsonString) {
          processedValue = JSON.parse(updatedValueString);
        }

        // Store in shared schemas and stringified snapshots
        shared[newKey] = processedValue;
        stringifiedSnapshots.set(valueString, newKey);

        // Replace references with new defKey
        const oldRef = `${zodRefPathPrefix}${defKey}`;
        jsonString = jsonString.replaceAll(`"${oldRef}"`, `"${newRef}"`);
      }
    });
  }

  // Parse back to object once
  json = JSON.parse(jsonString);

  // Remove definitions after processing
  if (json.definitions) {
    delete json.definitions;
  }

  // Convert Zod nullability (OpenAPI 3.1) to OpenAPI 3.0 nullability
  json = toOpenAPI30Nullable(json);

  return json;
}

function getCustomOpenApiMetadata(schema: z.core.$ZodType) {
  // If the schema has a custom OpenAPI metadata method, apply it
  if (typeof (schema as any).getOpenAPIMetadata === 'function') {
    const openAPIMetadata = (schema as any).getOpenAPIMetadata();
    if (openAPIMetadata && typeof openAPIMetadata === 'object') {
      // Apply all OpenAPI metadata properties to ensure nothing is lost
      return openAPIMetadata;
    }
  }
  return undefined;
}

function toJSON(schema: z.ZodType) {
  // If no wrapper is found, this is considered the innermost type.
  // Check for unsupported types that should be coerced.

  console.log(JSON.stringify(schema._zod.def, null, 2));

  // let customOpenApiMetadata: z.core.JSONSchema.BaseSchema | undefined;
  const json = z.toJSONSchema(schema, {
    io: 'input',
    target: 'draft-4',
    unrepresentable: 'any',
    override: (ctx) => {
      // Check for custom OpenAPI metadata first
      // const openApiMetadata = getCustomOpenApiMetadata(ctx.zodSchema);
      // if (openApiMetadata) {
      //   // Use the custom OpenAPI metadata directly as the JSON schema
      //   ctx.jsonSchema = openApiMetadata;
      //   // customOpenApiMetadata = openApiMetadata;
      //   return;
      // }

      // Apply coercion for unrepresentable types if no custom metadata
      ctx.jsonSchema = coerceUnrepresentableTypeIfNeeded(
        ctx.zodSchema,
        ctx.jsonSchema as z.core.JSONSchema.BaseSchema
      );
    },
  });

  console.log(JSON.stringify(json, null, 2));

  // // If the schema has custom OpenAPI metadata, return it directly
  // if (customOpenApiMetadata) {
  //   return {
  //     json: customOpenApiMetadata,
  //     definitions: {},
  //   };
  // }

  return postProcessJsonOutput(json);
}

function isZodEmptyType(type: z.ZodType): type is z.ZodVoid | z.ZodUndefined | z.ZodNever {
  return type instanceof z.ZodVoid || type instanceof z.ZodUndefined || type instanceof z.ZodNever;
}

export function isUndefined(type: z.ZodType): type is z.ZodUndefined | z.ZodVoid {
  return isZodEmptyType(type) || type.isOmittedFromOpenAPI();
}

/**
 * Recursively unwraps a Zod schema to get the innermost, or "starting," type.
 *
 * @param schema The Zod schema to unwrap.
 * @returns The innermost Zod schema that is not a wrapper.
 */
export function getZodInnerType(schema: z.ZodType): z.ZodType {
  if (schema instanceof z.ZodPipe) {
    return getZodInnerType(schema.in as z.ZodType);
  }

  // If schema has `unwrap` method, recursively unwrap it.
  if ('unwrap' in schema && typeof schema.unwrap === 'function') {
    return getZodInnerType(schema.unwrap());
  }

  return schema;
}

/**
 * Coerces unrepresentable Zod types to a cloned JSON Schema type.
 */
function coerceUnrepresentableTypeIfNeeded(
  schema: z.core.$ZodType,
  json: z.core.JSONSchema.BaseSchema
): z.core.JSONSchema.BaseSchema {
  if (schema instanceof z.ZodDate) {
    json.type = 'string';
    json.format = 'date';
  }

  if (schema instanceof z.ZodBigInt) {
    json.type = 'string';
    json.format = 'bigint';
  }

  return json;
}

/**
 * Remove
 */
const removePropertyNames = (json: z.core.JSONSchema.BaseSchema): z.core.JSONSchema.BaseSchema => {
  if (json.jsonSchema.propertyNames) {
    delete json.jsonSchema.propertyNames;
  }
};

/**
 * Checks if a Zod schema is suitable for a Request Body or Response Body in OpenAPI.
 * These can generally represent any valid JSON structure.
 */
export function isAllowedAsRequestBodyOrResponseSchema(schema: z.ZodType): boolean {
  const inner = getZodInnerType(schema);

  // Zod types which are typically "unrepresentable" in OpenAPI
  return !(
    inner instanceof z.ZodSymbol ||
    inner instanceof z.ZodUndefined ||
    inner instanceof z.ZodVoid ||
    inner instanceof z.ZodNever ||
    inner instanceof z.ZodNaN ||
    inner instanceof z.ZodPromise
  );
}

const convertJsonSchemaToOpenAPIParam = (
  schema: JSONSchema,
  isPathParameter = false
): OpenAPIV3.ParameterObject[] => {
  assertJSONSchemaType(schema, 'object', 'Expected schema to be an object');
  return Object.entries(schema.properties).map(([shapeKey, subShape]) => {
    const isOptional = schema.required?.includes(shapeKey);
    const { description, examples, ...json } = subShape;

    return {
      name: shapeKey,
      in: isPathParameter ? 'path' : 'query',
      required: isPathParameter || isOptional,
      schema: json as OpenAPIV3.SchemaObject,
      ...(description !== undefined ? { description } : {}),
      ...(examples !== undefined ? { examples } : {}),
    };
  });
};

/**
 * Returns a loose object with a custom description for pass-through payload.
 * @param description
 */
const getPassThroughBodyObject = (description: string) => {
  return z.looseObject({}).describe(description);
};

export const convertQuery = (schema: unknown) => {
  assertZodType(schema, z.ZodType, 'Expected schema to be an instance of Zod');
  assertZodType(schema, z.ZodObject, 'Query schema must be an _object_ schema validator!');

  const jsonSchema = toJSON(schema);

  return {
    query: convertJsonSchemaToOpenAPIParam(jsonSchema, false),
    shared: {},
  };
};

export const convertPathParameters = (schema: unknown, knownParameters: KnownParameters) => {
  assertZodType(schema, z.ZodType, 'Expected schema to be an instance of Zod');

  const paramKeys = Object.keys(knownParameters);
  const jsonSchema = toJSON(schema);
  const schemaKeys = Object.keys(jsonSchema.properties ?? {});
  validatePathParameters(paramKeys, schemaKeys);

  return {
    params: convertJsonSchemaToOpenAPIParam(jsonSchema, true),
    shared: {},
  };
};

export const convert = (schema: z.ZodType): ReturnType<OpenAPIConverter['convert']> => {
  assertZodType(schema, z.ZodType, 'Expected schema to be an instance of Zod');
  if (!isAllowedAsRequestBodyOrResponseSchema(schema)) {
    throw createError('Schema is not allowed as a request body or response schema');
  }

  const convertionOutput = toJSON(schema);

  return {
    shared: toOpenAPI30Nullable(shared),
    schema: convertionOutput as OpenAPIV3.SchemaObject,
  };
};
