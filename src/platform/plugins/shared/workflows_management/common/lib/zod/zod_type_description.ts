/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { getLiteralDescription, getZodTypeName } from './get_zod_type_name';

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
    maxDepth = 10,
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
    return getZodTypeName(schema);
  }
}

/**
 * Handle ZodObject type description
 */
function handleZodObject(
  schema: z.ZodObject<Record<string, z.ZodType>>,
  currentDepth: number,
  opts: TypeDescriptionOptions,
  descriptionSuffix: string
): string {
  const { maxDepth, showOptional, includeDescriptions, indentSpacesNumber, singleLine } = opts;
  const shape = schema.shape;
  const properties: string[] = [];
  const nl = singleLine ? '' : '\n';
  const indent = singleLine ? ' ' : ' '.repeat(indentSpacesNumber * (currentDepth + 1));
  const closingIndent = singleLine ? ' ' : ' '.repeat(indentSpacesNumber * currentDepth);

  for (const [key, fieldSchema] of Object.entries(shape)) {
    const isOptional = (fieldSchema as z.ZodType) instanceof z.ZodOptional;
    const actualFieldSchema = isOptional
      ? (fieldSchema as z.ZodOptional<z.ZodType>).unwrap()
      : (fieldSchema as z.ZodType);
    const fieldType = generateDetailedDescription(actualFieldSchema, currentDepth + 1, {
      maxDepth,
      showOptional,
      includeDescriptions,
      indentSpacesNumber,
      singleLine,
    });

    const optionalMarker = showOptional && isOptional ? '?' : '';
    properties.push(`${indent}${key}${optionalMarker}: ${fieldType}`);
  }

  const objectBody =
    properties.length > 0 ? `{${nl}${properties.join(`;${nl}`)}${nl}${closingIndent}}` : '{}';
  return `${objectBody}${descriptionSuffix}`;
}

/**
 * Handle ZodUnion type description
 */
function handleZodUnion(
  schema: z.ZodUnion<[z.ZodType, ...z.ZodType[]]>,
  currentDepth: number,
  opts: TypeDescriptionOptions,
  descriptionSuffix: string
): string {
  const { maxDepth, showOptional, includeDescriptions, indentSpacesNumber, singleLine } = opts;
  const unionTypes = schema.options.map((option: z.ZodType) =>
    generateDetailedDescription(option, currentDepth, {
      maxDepth,
      showOptional,
      includeDescriptions,
      indentSpacesNumber,
      singleLine,
    })
  );
  return `(${unionTypes.join(' | ')})${descriptionSuffix}`;
}

function handleZodIntersection(
  schema: z.ZodIntersection<z.ZodType, z.ZodType>,
  currentDepth: number,
  opts: TypeDescriptionOptions,
  descriptionSuffix: string
): string {
  const intersectionTypes = [schema.def.left, schema.def.right].map((option: z.ZodType) =>
    generateDetailedDescription(option, currentDepth, opts)
  );
  return `(${intersectionTypes.join(' & ')})${descriptionSuffix}`;
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
    return getZodTypeName(schema);
  }

  const def = schema.def;

  const description =
    includeDescriptions && 'description' in schema
      ? (schema as unknown as { description?: string }).description ?? null
      : null;

  const descriptionSuffix = description ? ` // ${description}` : '';

  switch (def.type) {
    case 'literal': {
      return getLiteralDescription(schema as z.ZodLiteral);
    }
    case 'object':
      return handleZodObject(
        schema as z.ZodObject<Record<string, z.ZodType>>,
        currentDepth,
        opts,
        descriptionSuffix
      );

    case 'array': {
      const arraySchema = schema as z.ZodArray<z.ZodType>;
      const elementType = generateDetailedDescription(arraySchema.element, currentDepth, {
        maxDepth,
        showOptional,
        includeDescriptions,
        indentSpacesNumber,
        singleLine,
      });
      return `${elementType}[]${descriptionSuffix}`;
    }

    case 'union':
      return handleZodUnion(
        schema as z.ZodUnion<[z.ZodType, ...z.ZodType[]]>,
        currentDepth,
        opts,
        descriptionSuffix
      );

    case 'intersection':
      return handleZodIntersection(
        schema as z.ZodIntersection<z.ZodType, z.ZodType>,
        currentDepth,
        opts,
        descriptionSuffix
      );

    case 'optional': {
      const optionalSchema = schema as z.ZodOptional<z.ZodType>;
      const innerType = generateDetailedDescription(optionalSchema.unwrap(), currentDepth, {
        maxDepth,
        showOptional: false,
        includeDescriptions,
        indentSpacesNumber,
        singleLine,
      });
      return showOptional ? `${innerType}?` : innerType;
    }

    case 'lazy': {
      const lazySchema = schema as z.ZodLazy<z.ZodType>;
      return generateDetailedDescription(lazySchema.unwrap(), currentDepth, {
        maxDepth,
        showOptional,
        includeDescriptions,
        indentSpacesNumber,
        singleLine,
      });
    }

    case 'default': {
      const defaultSchema = schema as z.ZodDefault<z.ZodType>;
      const innerType = generateDetailedDescription(
        defaultSchema.unwrap() as z.ZodType,
        currentDepth,
        {
          maxDepth,
          showOptional,
          includeDescriptions,
          indentSpacesNumber,
          singleLine,
        }
      );
      return innerType;
    }

    case 'record': {
      const recordSchema = schema as z.ZodRecord;
      const valueType = generateDetailedDescription(
        (recordSchema.valueType as z.ZodType) || z.any(),
        currentDepth + 1,
        {
          maxDepth,
          showOptional,
          includeDescriptions,
          indentSpacesNumber,
          singleLine,
        }
      );
      return `record<string, ${valueType}>${descriptionSuffix}`;
    }

    default:
      return `${getZodTypeName(schema)}${descriptionSuffix}`;
  }
}

/**
 * Convert Zod schema to JSON Schema for maximum detail
 */
export function getJsonSchemaDescription(schema: z.ZodType): object {
  return z.toJSONSchema(schema, {
    target: 'draft-7',
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
