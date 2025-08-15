/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isZod, z } from '@kbn/zod';
import { isPassThroughAny } from '@kbn/zod-helpers';
import type { OpenAPIV3 } from 'openapi-types';
import { toOpenAPI30Nullability } from './open_api_compat/nullability';

import { KnownParameters, OpenAPIConverter } from '../../type';
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
  json = toOpenAPI30Nullability(json);

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

  let customOpenApiMetadata: z.core.JSONSchema.BaseSchema | undefined;
  const json = z.toJSONSchema(schema, {
    io: 'input',
    target: 'draft-7',
    unrepresentable: 'any',
    override: (ctx) => {
      ctx.jsonSchema = coerceUnrepresentableTypeIfNeeded(
        ctx.zodSchema,
        ctx.jsonSchema as z.core.JSONSchema.BaseSchema
      );

      customOpenApiMetadata = getCustomOpenApiMetadata(ctx.zodSchema);
    },
  });

  // If the schema has custom OpenAPI metadata, return it directly
  if (customOpenApiMetadata) {
    return {
      json: customOpenApiMetadata,
      definitions: {},
    };
  }

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
 * Checks if a Zod schema represents a fundamental JSON primitive.
 */
function isJsonPrimitive(schema: z.ZodType): boolean {
  const inner = getZodInnerType(schema);
  return (
    inner instanceof z.ZodString ||
    inner instanceof z.ZodNumber ||
    inner instanceof z.ZodBoolean ||
    inner instanceof z.ZodBigInt ||
    inner instanceof z.ZodDate ||
    inner instanceof z.ZodLiteral || // A literal of a primitive is still a primitive
    inner instanceof z.ZodEnum // An enum of primitive values
  );
}

/**
 * Checks if a Zod schema is suitable for a Path Parameter in OpenAPI.
 * Path parameters must be simple primitives or arrays of primitives.
 * Returns `false` for objects and complex arrays as they are not valid in OpenAPI path parameters.
 */
function isValidOpenApiPathParameterSchema(unwrappedShape: z.ZodType): boolean {
  if (isJsonPrimitive(unwrappedShape)) {
    return true;
  }

  // Path parameters can technically be arrays of primitives (e.g., path: /items/{ids})
  if (unwrappedShape instanceof z.ZodArray) {
    const arrayElement = unwrappedShape.unwrap();
    assertZodType(arrayElement, z.ZodType, 'Expected array element to be a Zod type');
    return isJsonPrimitive(arrayElement);
  }

  // Unions for path parameters are tricky but sometimes allowed if all options are primitive.
  // OpenAPI parameters support 'anyOf', so we check if all members are path-compatible.
  if (unwrappedShape instanceof z.ZodUnion || unwrappedShape instanceof z.ZodDiscriminatedUnion) {
    return unwrappedShape.options.every((option) => {
      assertZodType(option, z.ZodType, 'Expected union options to be Zod types');
      return isValidOpenApiPathParameterSchema(option);
    });
  }

  return false;
}

/**
 * Checks if a Zod schema is suitable for a Query Parameter in OpenAPI.
 * Query parameters can be primitives, arrays of primitives, or simple objects.
 * Deeper nesting in objects is generally discouraged but technically possible.
 */
function isValidOpenApiQueryParameterSchema(unwrappedShape: z.ZodType): boolean {
  // If it's valid for a path parameter, it's also valid for a query parameter
  if (isValidOpenApiPathParameterSchema(unwrappedShape)) {
    return true;
  }

  // Query parameters can include objects. We allow ZodObject here.
  // Note: OpenAPI serializes objects in queries using 'style' and 'explode' (e.g., form, deepObject).
  if (unwrappedShape instanceof z.ZodObject) {
    // Check if any property is non primitive or complex.
    const hasComplexProperties = Object.values(unwrappedShape.shape).some(
      (subSchema) => !isValidOpenApiQueryParameterSchema(subSchema)
    );

    // If all properties are valid for query parameters, return true.
    if (!hasComplexProperties) {
      return true;
    }

    // Complex objects could be allowed but Kibana may not deserialize them correctly.
    return false;
  }

  // Arrays of objects are also possible in queries if serialization is defined.
  if (unwrappedShape instanceof z.ZodArray) {
    assertZodType(unwrappedShape.element, z.ZodType, 'Expected array element to be a Zod type');
    return isValidOpenApiQueryParameterSchema(unwrappedShape.element);
  }

  // Unions are allowed (via OpenAPI 'anyOf' / 'oneOf' on parameters).
  // All union members must conform to query parameter rules.
  if (unwrappedShape instanceof z.ZodUnion || unwrappedShape instanceof z.ZodDiscriminatedUnion) {
    return unwrappedShape.options.every((option) => {
      assertZodType(option, z.ZodType, 'Expected union options to be Zod types');
      isValidOpenApiQueryParameterSchema(option);
    });
  }

  // Allow ZodCustom types if they have custom OpenAPI metadata.
  if (unwrappedShape instanceof z.ZodCustom) {
    return !!getCustomOpenApiMetadata(unwrappedShape);
  }

  // Other complex types like Maps, Sets are generally not directly mapped well to query strings.
  return false;
}

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

const convertObjectMembersToParameterObjects = (
  schema: z.ZodObject,
  isPathParameter = false
): OpenAPIV3.ParameterObject[] => {
  return Object.entries(schema.shape).map(([shapeKey, subShape]) => {
    assertZodType(subShape, z.ZodType, `Expected schema for ${shapeKey} to be a Zod type`);
    const unwrappedShape = subShape;

    if (isPathParameter) {
      assertZodType(unwrappedShape, z.ZodType, `Path parameter ${shapeKey} must be a Zod type`);
      if (!isValidOpenApiPathParameterSchema(unwrappedShape)) {
        throw createError(
          `Path parameter ${shapeKey} is not a valid OpenAPI path parameter schema`
        );
      }
    } else {
      assertZodType(unwrappedShape, z.ZodType, `Query parameter ${shapeKey} must be a Zod type`);
      if (!isValidOpenApiQueryParameterSchema(unwrappedShape)) {
        throw createError(
          `Query parameter ${shapeKey} is not a valid OpenAPI query parameter schema`
        );
      }
    }

    const isOptional = !subShape.safeParse(undefined).success;
    const { description: schemaDescription, ...json } = toJSON(subShape);

    return {
      name: shapeKey,
      in: isPathParameter ? 'path' : 'query',
      required: isPathParameter || isOptional,
      schema: json as OpenAPIV3.SchemaObject,
      description: schemaDescription ?? subShape.description,
    };
  });
};

/**
 * Returns a z.ZodObject with keys from knownParameters respecting their optionality.
 */
const getPassThroughParamObject = (knownParameters: KnownParameters, isPathParameter = false) => {
  const shape = Object.entries(knownParameters).reduce((acc, [key, { optional }]) => {
    (acc as any)[key] = !isPathParameter && optional ? z.string().optional() : z.string();
    return acc;
  }, {} as z.ZodRawShape);
  return z.object(shape);
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

  const unwrapped = isPassThroughAny(schema)
    ? getPassThroughParamObject({}, false)
    : getZodInnerType(schema);

  assertZodType(unwrapped, z.ZodObject, 'Expected unwrapped schema to be a ZodObject');

  return {
    query: convertObjectMembersToParameterObjects(unwrapped, false),
    shared: {},
  };
};

export const convertPathParameters = (schema: unknown, knownParameters: KnownParameters) => {
  assertZodType(schema, z.ZodType, 'Expected schema to be an instance of Zod');

  const paramKeys = Object.keys(knownParameters);
  const paramsCount = paramKeys.length;

  if (paramsCount === 0 && isZodEmptyType(schema)) {
    return { params: [], shared: {} };
  }

  const unwrapped = isPassThroughAny(schema)
    ? getPassThroughParamObject(knownParameters, true)
    : getZodInnerType(schema);

  assertZodType(unwrapped, z.ZodObject, 'Parameters schema must be an _object_ schema validator!');
  const schemaKeys = Object.keys(unwrapped.shape);
  validatePathParameters(paramKeys, schemaKeys);

  return {
    params: convertObjectMembersToParameterObjects(unwrapped, true),
    shared: {},
  };
};

export const convert = (schema: z.ZodType): ReturnType<OpenAPIConverter['convert']> => {
  assertZodType(schema, z.ZodType, 'Expected schema to be an instance of Zod');
  if (!isAllowedAsRequestBodyOrResponseSchema(schema)) {
    throw createError('Schema is not allowed as a request body or response schema');
  }

  let convertionOutput: ReturnType<typeof toJSON>;

  try {
    convertionOutput = toJSON(schema);
  } catch (e) {
    // Use custom OpenAPI metadata if available, or fallback to a generic pass-through object
    convertionOutput =
      getCustomOpenApiMetadata(schema) ??
      toJSON(
        getPassThroughBodyObject(
          'Could not convert the schema to OpenAPI equivalent, passing through as any.'
        )
      );
  }

  return {
    shared,
    schema: convertionOutput as OpenAPIV3.SchemaObject,
  };
};
