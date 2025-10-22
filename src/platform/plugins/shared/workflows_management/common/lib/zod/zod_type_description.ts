/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ZodFirstPartySchemaTypes } from '@kbn/zod';
import { z } from '@kbn/zod';

export interface TypeDescriptionOptions {
  /** Maximum depth for nested objects */
  maxDepth: number;
  /** Include optional field markers */
  showOptional: boolean;
  /** Include descriptions from schema */
  includeDescriptions: boolean;
  /** Single line description */
  singleLine: boolean;
  /** Indent spaces number */
  indentSpacesNumber: number;
}

interface GenerateDetailedDescriptionOptions extends TypeDescriptionOptions {
  detailed: boolean;
}

/**
 * Generate a detailed human-readable type description from a Zod schema
 */
export function getDetailedTypeDescription(
  schema: z.ZodType,
  options: Partial<GenerateDetailedDescriptionOptions> = {}
): string {
  const {
    detailed = true,
    maxDepth = 6,
    showOptional = true,
    includeDescriptions = true,
    singleLine = false,
    indentSpacesNumber = 2,
  } = options;

  if (detailed) {
    return generateDetailedDescription(schema, 0, {
      maxDepth,
      showOptional,
      includeDescriptions,
      singleLine,
      indentSpacesNumber,
    });
  } else {
    return getBasicTypeName(schema);
  }
}

/**
 * Get a simple type name (similar to existing getZodTypeName)
 */
function getBasicTypeName(schema: z.ZodType): string {
  const typedSchema = schema as ZodFirstPartySchemaTypes;
  const def = typedSchema._def;

  switch (def.typeName) {
    case 'ZodString':
      return 'string';
    case 'ZodNumber':
      return 'number';
    case 'ZodBoolean':
      return 'boolean';
    case 'ZodArray':
      const arrayElement = (schema as z.ZodArray<z.ZodType>).element;
      return `${getBasicTypeName(arrayElement)}[]`;
    case 'ZodObject':
      return 'object';
    case 'ZodUnion':
      const unionTypes = (schema as z.ZodUnion<[z.ZodType, ...z.ZodType[]]>).options;
      const unionString = unionTypes.map((t: z.ZodType) => getBasicTypeName(t)).join(' | ');
      return `(${unionString})`;
    case 'ZodOptional':
      const optionalInner = (schema as z.ZodOptional<z.ZodType>).unwrap();
      return `${getBasicTypeName(optionalInner)}?`;
    case 'ZodDate':
      return 'date';
    case 'ZodLiteral':
      const literalValue = (schema as z.ZodLiteral<unknown>).value;
      return typeof literalValue === 'string' ? `"${literalValue}"` : String(literalValue);
    case 'ZodEnum':
      const enumValues = (schema as z.ZodEnum<[string, ...string[]]>).options;
      return enumValues.map((v: string) => `"${v}"`).join(' | ');
    case 'ZodAny':
      return 'any';
    case 'ZodNull':
      return 'null';
    case 'ZodUndefined':
      return 'undefined';
    case 'ZodUnknown':
      return 'unknown';
    case 'ZodRecord':
      const recordSchema = schema as z.ZodRecord<z.ZodType, z.ZodType>;
      const keyType = getBasicTypeName(recordSchema.keySchema || z.any());
      const valueType = getBasicTypeName(recordSchema.valueSchema || z.any());
      return `Record<${keyType}, ${valueType}>`;
    default:
      return 'unknown';
  }
}

/**
 * Generate detailed type description with structure
 */
function generateDetailedDescription(
  schema: z.ZodType,
  currentDepth: number,
  opts: TypeDescriptionOptions
): string {
  const {
    maxDepth,
    showOptional,
    includeDescriptions,
    indentSpacesNumber = 2,
    singleLine = false,
  } = opts;
  if (currentDepth >= maxDepth) {
    return getBasicTypeName(schema);
  }

  const nl = singleLine ? '' : '\n';

  const typedSchema = schema as ZodFirstPartySchemaTypes;
  const def = typedSchema._def;

  // Extract description if available
  const description =
    includeDescriptions && 'description' in schema
      ? (schema as unknown as { description?: string }).description ?? null
      : null;

  const descriptionSuffix = description ? ` // ${description}` : '';

  switch (def.typeName) {
    case 'ZodObject': {
      const objectSchema = schema as z.ZodObject<Record<string, z.ZodType>>;
      const shape = objectSchema.shape;
      const properties: string[] = [];

      for (const [key, fieldSchema] of Object.entries(shape)) {
        const isOptional = (fieldSchema as z.ZodType) instanceof z.ZodOptional;
        // If field is optional, we need to unwrap it and process the inner type
        const actualFieldSchema = isOptional
          ? (fieldSchema as z.ZodOptional<z.ZodType>).unwrap()
          : (fieldSchema as z.ZodType);
        const fieldType = generateDetailedDescription(actualFieldSchema, currentDepth + 1, {
          maxDepth,
          showOptional, // Pass showOptional for nested structures
          includeDescriptions,
          indentSpacesNumber,
          singleLine,
        });

        const optionalMarker = showOptional && isOptional ? '?' : '';

        // Add proper indentation - always use 2 spaces per level
        const indent = ' '.repeat(indentSpacesNumber);
        properties.push(`${indent}${key}${optionalMarker}: ${fieldType}`);
      }

      const objectBody = properties.length > 0 ? `{${nl}${properties.join(`;${nl}`)}${nl}}` : '{}';

      return `${objectBody}${descriptionSuffix}`;
    }

    case 'ZodArray': {
      const arraySchema = schema as z.ZodArray<z.ZodType>;
      const elementType = generateDetailedDescription(arraySchema.element, currentDepth + 1, {
        maxDepth,
        showOptional,
        includeDescriptions,
        indentSpacesNumber,
        singleLine,
      });
      return `${elementType}[]${descriptionSuffix}`;
    }

    case 'ZodUnion': {
      const unionSchema = schema as z.ZodUnion<[z.ZodType, ...z.ZodType[]]>;
      const unionTypes = unionSchema.options.map((option: z.ZodType) =>
        generateDetailedDescription(option, currentDepth + 1, {
          maxDepth,
          showOptional,
          includeDescriptions,
          indentSpacesNumber,
          singleLine,
        })
      );
      return `(${unionTypes.join(' | ')})${descriptionSuffix}`;
    }

    case 'ZodOptional': {
      const optionalSchema = schema as z.ZodOptional<z.ZodType>;
      const innerType = generateDetailedDescription(optionalSchema.unwrap(), currentDepth, {
        maxDepth,
        showOptional: false, // Don't show optional for inner type since we're handling it here
        includeDescriptions,
        indentSpacesNumber,
        singleLine,
      });
      // Only add ? if showOptional is true
      return showOptional ? `${innerType}?` : innerType;
    }

    case 'ZodDiscriminatedUnion': {
      const discriminatedSchema = schema as z.ZodDiscriminatedUnion<
        string,
        z.ZodDiscriminatedUnionOption<string>[]
      >;
      const discriminator = discriminatedSchema.discriminator;
      const options = discriminatedSchema.options;

      const unionTypes = options.map((option: z.ZodType) =>
        generateDetailedDescription(option, currentDepth + 1, {
          maxDepth,
          showOptional,
          includeDescriptions,
          indentSpacesNumber,
          singleLine,
        })
      );

      return `discriminatedUnion<${discriminator}>(${unionTypes.join(' | ')})${descriptionSuffix}`;
    }

    case 'ZodRecord': {
      const recordSchema = schema as z.ZodRecord<z.ZodType, z.ZodType>;
      const valueType = generateDetailedDescription(
        recordSchema.valueSchema || z.any(),
        currentDepth + 1,
        {
          maxDepth,
          showOptional,
          includeDescriptions,
          indentSpacesNumber,
          singleLine,
        }
      );
      return `Record<string, ${valueType}>${descriptionSuffix}`;
    }

    default:
      return `${getBasicTypeName(schema)}${descriptionSuffix}`;
  }
}

/**
 * Convert Zod schema to JSON Schema for maximum detail
 */
export function getJsonSchemaDescription(schema: z.ZodType): object {
  return zodToJsonSchema(schema, {
    target: 'jsonSchema7',
    errorMessages: true,
    markdownDescription: true,
    definitions: {},
  });
}

/**
 * Get a TypeScript-like type string from Zod schema
 */
export function getTypeScriptLikeDescription(schema: z.ZodType): string {
  return getDetailedTypeDescription(schema, {
    detailed: true,
    maxDepth: 5,
    showOptional: true,
    includeDescriptions: false,
  });
}

/**
 * Get a compact type description suitable for tooltips
 */
export function getCompactTypeDescription(schema: z.ZodType): string {
  return getDetailedTypeDescription(schema, {
    detailed: false,
    maxDepth: 1,
    showOptional: false,
    includeDescriptions: false,
  });
}
