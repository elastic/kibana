/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { type ConnectorTypeInfo, isInternalConnector } from '@kbn/workflows';
import { unwrapSchema } from '@kbn/workflows/common/utils/zod';
import { z } from '@kbn/zod/v4';
import { getCachedAllConnectors } from './connectors_cache';

export interface RequiredParamForConnector {
  name: string;
  // `example` holds a type-aware placeholder value, not only strings: a primitive
  // (string/number/boolean), an enum/literal value, a structured object/array — e.g. body
  // example objects from `extractBodyExample` — or a discriminated-union scaffold like
  // `{ type: '' }`. The downstream YAML stringifier renders any of these shapes.
  example?: unknown;
  defaultValue?: string;
}

/**
 * Get required parameters for a connector type from generated schemas
 */
export function getRequiredParamsForConnector(
  connectorType: string,
  dynamicConnectorTypes?: Record<string, ConnectorTypeInfo>
): RequiredParamForConnector[] {
  // Get all connectors (both static and generated)
  const allConnectors = getCachedAllConnectors(dynamicConnectorTypes);

  // Find the connector by type
  const connector = allConnectors.find((c) => c.type === connectorType);

  if (connector && connector.paramsSchema) {
    try {
      if (isInternalConnector(connector) && connector.examples && connector.examples.params) {
        // Use examples directly from enhanced connector
        const exampleParams = connector.examples.params;
        // Using enhanced examples
        const result: RequiredParamForConnector[] = [];

        for (const [key, value] of Object.entries(exampleParams)) {
          // Include common important parameters for ES APIs
          if (
            [
              'index',
              'id',
              'body',
              'query',
              'size',
              'from',
              'sort',
              'aggs',
              'aggregations',
              'format',
            ].includes(key)
          ) {
            result.push({ name: key, example: value });
            // Added enhanced example
          }
        }

        if (result.length > 0) {
          // Returning enhanced examples
          return result;
        }
      }

      // Fallback to extracting from schema
      const params = extractRequiredParamsFromSchema(connector.paramsSchema);

      // Return only required parameters, or most important ones if no required ones
      const requiredParams = params.filter((p) => p.required);
      if (requiredParams.length > 0) {
        return requiredParams.map((p) => ({ name: p.name, example: p.example }));
      }

      // If no required params, return the most important ones for ES APIs
      const importantParams = params.filter((p) =>
        [
          'index',
          'id',
          'body',
          'query',
          'size',
          'from',
          'sort',
          'aggs',
          'aggregations',
          'format',
        ].includes(p.name)
      );
      if (importantParams.length > 0) {
        return importantParams.slice(0, 3).map((p) => ({ name: p.name, example: p.example }));
      }
    } catch (error) {
      // Silently continue with fallback parameters
    }
  }

  // Fallback to basic hardcoded ones for non-ES connectors
  const basicConnectorParams: Record<string, Array<{ name: string; example?: string }>> = {
    console: [{ name: 'message', example: 'Hello World' }],
    slack: [{ name: 'message', example: 'Hello Slack' }],
    http: [
      { name: 'url', example: 'https://api.example.com' },
      { name: 'method', example: 'GET' },
    ],
    wait: [{ name: 'duration', example: '5s' }],
    waitForInput: [{ name: 'message', example: 'Please approve before continuing' }],
    waitForApproval: [{ name: 'message', example: 'Your approval is required to continue' }],
  };

  return basicConnectorParams[connectorType] || [];
}

interface ExtractedParam {
  name: string;
  example?: unknown;
  defaultValue?: string;
  required: boolean;
}

// Fields that are transport/formatting concerns rather than meaningful step parameters.
const NON_PARAMETER_FIELDS = ['pretty', 'human', 'error_trace', 'source', 'filter_path'];

function isFieldRequired(fieldSchema: z.ZodType): boolean {
  // A field is optional when `undefined` is a valid value for it.
  return !fieldSchema.safeParse(undefined).success;
}

function getObjectShape(schema: z.ZodType): Record<string, z.ZodType> | null {
  const unwrapped = unwrapSchema(schema);
  if (unwrapped instanceof z.ZodObject) {
    return unwrapped.shape as Record<string, z.ZodType>;
  }
  return null;
}

/**
 * Build a YAML-friendly placeholder value that matches the field's zod type, so the snippet renders
 * e.g. `ids: [""]` (array), `status: acknowledged` (enum/literal) rather than everything as `""`.
 */
function getPlaceholderForSchema(schema: z.ZodType, depth = 0): unknown {
  const s = unwrapSchema(schema);

  if (depth > 3) {
    return '';
  }
  if (s instanceof z.ZodString) {
    return '';
  }
  if (s instanceof z.ZodNumber) {
    return 0;
  }
  if (s instanceof z.ZodBoolean) {
    return false;
  }
  if (s instanceof z.ZodLiteral) {
    return s.value;
  }
  if (s instanceof z.ZodEnum) {
    return s.options[0];
  }
  if (s instanceof z.ZodArray) {
    return [getPlaceholderForSchema(s.element as z.ZodType, depth + 1)];
  }
  if (s instanceof z.ZodUnion) {
    const options = s.options as z.ZodType[];
    // For `id | id[]` style unions (common in the security bulk-update steps) prefer the array member
    // so the snippet communicates that a list is accepted; otherwise fall back to the first member.
    const arrayMember = options.find((option) => unwrapSchema(option) instanceof z.ZodArray);
    return getPlaceholderForSchema(arrayMember ?? options[0], depth + 1);
  }
  if (s instanceof z.ZodObject) {
    // Keep nested objects shallow to avoid noisy placeholders.
    return {};
  }
  return '';
}

/**
 * Turn a single object field into a parameter descriptor, deriving an example from (in order):
 * the field description, common ES parameter-name heuristics, a discriminated-union scaffold, then a
 * type-aware placeholder.
 */
function buildParamFromField(key: string, fieldSchema: z.ZodType): ExtractedParam {
  const required = isFieldRequired(fieldSchema);

  let example: unknown = '';

  if ('description' in fieldSchema && typeof fieldSchema.description === 'string') {
    const description = fieldSchema.description;
    const exampleMatch = description.match(
      /example[:\s]+['"]*([^'"]+)['"]*|default[:\s]+['"]*([^'"]+)['"]*/i
    );
    if (exampleMatch) {
      example = exampleMatch[1] || exampleMatch[2] || '';
    }
  }

  if (example === '') {
    if (key === 'index') {
      example = 'my-index';
    } else if (key === 'id') {
      example = 'doc-id';
    } else if (key === 'body') {
      example = extractBodyExample(fieldSchema);
    } else if (key === 'query') {
      example = '{}';
    } else if (key.includes('name')) {
      example = 'my-name';
    }
  }

  // Discriminated-union fields (or arrays of them): scaffold the discriminator key so authors can
  // immediately narrow to a specific member (e.g. `attachment: { type: '' }`). This must run before
  // the generic placeholder because a discriminated union also matches `ZodUnion`, which would
  // otherwise collapse it to `{}`.
  if (example === '') {
    const discriminatorStub = extractDiscriminatorStub(fieldSchema);
    if (discriminatorStub) {
      example = discriminatorStub;
    }
  }

  // Fall back to a type-aware placeholder only when no example was derived above.
  if (example === '') {
    example = getPlaceholderForSchema(fieldSchema);
  }

  return { name: key, example, required };
}

/**
 * Extract required parameters from a Zod schema.
 *
 * Handles plain objects as well as (discriminated) unions used by steps whose input schema is not a
 * top-level `z.object(...)` — e.g. the `security.*` alert/attack steps.
 */
function extractRequiredParamsFromSchema(schema: z.ZodType): ExtractedParam[] {
  const normalized = unwrapSchema(schema);

  if (normalized instanceof z.ZodObject) {
    return extractFromObject(normalized);
  }

  if (normalized instanceof z.ZodDiscriminatedUnion) {
    return extractFromDiscriminatedUnion(normalized);
  }

  if (normalized instanceof z.ZodUnion) {
    return extractFromUnion(normalized);
  }

  return [];
}

function extractFromObject(schema: z.ZodObject): ExtractedParam[] {
  const params: ExtractedParam[] = [];
  const shape = schema.shape as Record<string, z.ZodType>;

  for (const [key, fieldSchema] of Object.entries(shape)) {
    if (NON_PARAMETER_FIELDS.includes(key)) {
      // eslint-disable-next-line no-continue
      continue;
    }

    const param = buildParamFromField(key, fieldSchema);

    // Only include required parameters or the most common ES fields.
    if (param.required || ['index', 'id', 'body'].includes(key)) {
      params.push(param);
    }
  }

  return params;
}

/**
 * For a discriminated union, surface the discriminator (with a valid example from the first variant)
 * plus the intersection of fields that are required in *every* variant, so the emitted params always
 * apply regardless of which discriminator value the user ultimately picks. Field order follows the
 * first variant's declaration order.
 */
function extractFromDiscriminatedUnion(schema: z.ZodType): ExtractedParam[] {
  const options = (schema as z.ZodDiscriminatedUnion).options as z.ZodType[];
  const shapes = options.map(getObjectShape);
  const firstShape = shapes[0];

  if (!firstShape || shapes.some((shape) => shape === null)) {
    return [];
  }

  const params: ExtractedParam[] = [];
  for (const [key, fieldSchema] of Object.entries(firstShape)) {
    if (NON_PARAMETER_FIELDS.includes(key)) {
      // eslint-disable-next-line no-continue
      continue;
    }

    const requiredInEveryVariant = shapes.every(
      (shape) => shape !== null && shape[key] !== undefined && isFieldRequired(shape[key])
    );

    if (requiredInEveryVariant) {
      params.push(buildParamFromField(key, fieldSchema));
    }
  }

  return params;
}

/**
 * For a non-discriminated union there is no shared discriminator to key off, so fall back to the
 * required fields of the first object member. This is a heuristic: it produces a valid single variant
 * (e.g. the `tags_to_add` branch of `security.setAlertTags`) rather than an empty placeholder.
 */
function extractFromUnion(schema: z.ZodUnion): ExtractedParam[] {
  const options = schema.options as z.ZodType[];
  const firstShape = getObjectShape(options[0]);

  if (!firstShape) {
    return [];
  }

  const params: ExtractedParam[] = [];
  for (const [key, fieldSchema] of Object.entries(firstShape)) {
    if (NON_PARAMETER_FIELDS.includes(key)) {
      // eslint-disable-next-line no-continue
      continue;
    }

    if (isFieldRequired(fieldSchema)) {
      params.push(buildParamFromField(key, fieldSchema));
    }
  }

  return params;
}

/**
 * Returns a placeholder shape that surfaces the discriminator key for a
 * `ZodDiscriminatedUnion` field, or an array containing one such shape for
 * `ZodArray<ZodDiscriminatedUnion>`. Unwraps optional/default/nullable/lazy wrappers first.
 *
 * Examples:
 *   z.discriminatedUnion('type', [...])              -> { type: '' }
 *   z.array(z.discriminatedUnion('type', [...]))     -> [{ type: '' }]
 *
 * Returns `undefined` for any other shape so callers can fall back.
 */
function extractDiscriminatorStub(fieldSchema: z.ZodType): unknown {
  const inner = unwrapSchema(fieldSchema);

  if (inner instanceof z.ZodDiscriminatedUnion) {
    const key = getDiscriminatorKey(inner);
    return key ? { [key]: '' } : undefined;
  }

  if (inner instanceof z.ZodArray) {
    const element = unwrapSchema(inner.element as z.ZodType);
    if (element instanceof z.ZodDiscriminatedUnion) {
      const key = getDiscriminatorKey(element);
      return key ? [{ [key]: '' }] : undefined;
    }
  }

  return undefined;
}

function getDiscriminatorKey(union: z.ZodDiscriminatedUnion): string | undefined {
  // Zod v4 exposes the discriminator on `def.discriminator`. Fall back to scanning
  // the first member's shape for a literal field if the API ever changes.
  const fromDef = (union as unknown as { def?: { discriminator?: unknown } }).def?.discriminator;
  if (typeof fromDef === 'string') {
    return fromDef;
  }

  const options = (union as unknown as { def?: { options?: z.ZodType[] } }).def?.options;
  const first = options?.[0];
  if (first instanceof z.ZodObject) {
    for (const [key, value] of Object.entries(first.shape)) {
      if (value instanceof z.ZodLiteral) {
        return key;
      }
    }
  }
  return undefined;
}

/**
 * Extract example for body parameter based on its schema
 */
function extractBodyExample(bodySchema: z.ZodType): any {
  try {
    const schema = unwrapSchema(bodySchema);

    // If it's a ZodObject, try to extract its shape and build YAML-compatible example
    if (schema instanceof z.ZodObject) {
      const shape = schema.shape;
      const example: any = {};

      // Extract examples from each field
      for (const [key, fieldSchema] of Object.entries(shape)) {
        const field = fieldSchema as z.ZodType;
        const description = (field as any)?._def?.description || '';

        // Extract example from description if available
        const stringExampleMatch = description.match(/e\.g\.,?\s*"([^"]+)"/);
        const objectExampleMatch = description.match(/e\.g\.,?\s*(\{[^}]+\})/);

        if (stringExampleMatch) {
          example[key] = stringExampleMatch[1];
        } else if (objectExampleMatch) {
          try {
            example[key] = JSON.parse(objectExampleMatch[1]);
          } catch {
            // If JSON parse fails, use as string
            example[key] = objectExampleMatch[1];
          }
        }
        // No fallback - only use examples explicitly defined in enhanced connectors
      }

      if (Object.keys(example).length > 0) {
        return example; // Return object, not JSON string
      }
    }
  } catch (error) {
    // Fallback to empty object
  }

  return {};
}
