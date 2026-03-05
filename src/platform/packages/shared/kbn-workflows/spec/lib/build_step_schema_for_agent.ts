/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { ConnectorContractUnion } from '../..';
import { getShape } from '../../common/utils/zod/get_shape';
import { getZodSchemaType } from '../../common/utils/zod/get_zod_schema_type';
import { StepWithIfConditionSchema, TimeoutPropSchema } from '../schema';
import type { BaseStepDefinition } from '../step_definition_types';
import { StepCategory } from '../step_definition_types';

/**
 * Build a simplified step YAML schema from a ConnectorContractUnion.
 *
 * Produces the complete object shape an AI agent would write in workflow YAML:
 * `name`, `type`, `with` (params), `connector-id`, config fields, and common
 * optional step properties (`if`, `timeout`).
 *
 * This is a simplified, non-recursive variant of `generateStepSchemaForConnector`
 * (which builds the full recursive schema used for validation). It intentionally
 * omits `on-failure` recursion so the result can be safely converted to JSON Schema
 * without infinite references.
 */
export function buildConnectorStepSchema(connector: ConnectorContractUnion): z.ZodType {
  const props: Record<string, z.ZodType> = {
    name: z.string().describe('Unique step name within the workflow'),
    type: connector.description
      ? z.literal(connector.type).describe(connector.description)
      : z.literal(connector.type),
    with: connector.paramsSchema,
    ...StepWithIfConditionSchema.shape,
    ...TimeoutPropSchema.shape,
  };

  if (connector.hasConnectorId === 'required') {
    props['connector-id'] = z.string().describe('ID of the connector instance to use');
  } else if (connector.hasConnectorId === 'optional') {
    props['connector-id'] = z
      .string()
      .optional()
      .describe('Optional connector instance ID (omit to use the system connector)');
  }

  const configShape = connector.configSchema ? getShape(connector.configSchema) : undefined;
  if (configShape && Object.keys(configShape).length > 0) {
    Object.assign(props, configShape);
  }

  return z.object(props);
}

/**
 * Build a simplified step YAML schema from a BaseStepDefinition (built-in steps).
 *
 * For flow-control steps (if, foreach), the `configSchema` fields (`condition`,
 * `steps`, `else`, `foreach`) become top-level step properties. Common optional
 * properties (`if`, `timeout`) are added for non-flow-control steps only.
 */
export function buildBuiltInStepSchema(step: BaseStepDefinition): z.ZodType {
  const props: Record<string, z.ZodType> = {
    name: z.string().describe('Unique step name within the workflow'),
    type: z.literal(step.id).describe(step.description),
  };

  const inputShape = getShape(step.inputSchema);
  if (Object.keys(inputShape).length > 0) {
    props.with = step.inputSchema;
  }

  if (step.configSchema) {
    const configShape = getShape(step.configSchema);
    if (Object.keys(configShape).length > 0) {
      Object.assign(props, configShape);
    }
  }

  if (step.category !== StepCategory.FlowControl) {
    Object.assign(props, StepWithIfConditionSchema.shape, TimeoutPropSchema.shape);
  }

  return z.object(props);
}

/**
 * Compact representation of a single step parameter for the AI agent.
 */
export interface StepParamSummary {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

/**
 * Unwrap wrappers (optional, nullable, default, etc.) to get the
 * underlying schema and whether it was optional.
 */
function unwrapSchema(schema: z.ZodType): { inner: z.ZodType; optional: boolean } {
  let current = schema;
  let optional = false;

  const MAX_DEPTH = 10;
  for (let i = 0; i < MAX_DEPTH; i++) {
    if (current instanceof z.ZodOptional) {
      optional = true;
      current = current.unwrap() as z.ZodType;
    } else if (current instanceof z.ZodNullable) {
      current = current.unwrap() as z.ZodType;
    } else if (current instanceof z.ZodDefault) {
      optional = true;
      current = current.def.innerType as z.ZodType;
    } else {
      break;
    }
  }

  return { inner: current, optional };
}

/**
 * Derive a human-readable type label from a Zod schema (top-level only).
 */
function describeZodType(schema: z.ZodType): string {
  const { inner } = unwrapSchema(schema);
  const kind = getZodSchemaType(inner);

  switch (kind) {
    case 'string':
      return 'string';
    case 'number':
    case 'int':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array':
      return 'array';
    case 'object':
      return 'object';
    case 'literal': {
      const val = (inner as z.ZodLiteral<string>).def.values;
      return `literal(${JSON.stringify(val)})`;
    }
    case 'enum': {
      const values = (inner as z.ZodEnum).def.entries;
      if (Array.isArray(values)) {
        return `enum(${values.join(',')})`;
      }
      return `enum(${Object.values(values as Record<string, string>).join(',')})`;
    }
    case 'union': {
      const opts = (inner as z.ZodUnion).options as z.ZodType[];
      const labels = opts.map(describeZodType);
      const unique = [...new Set(labels)];
      return unique.length === 1 ? unique[0] : unique.join(' | ');
    }
    case 'record':
      return 'object';
    default:
      return kind ?? 'unknown';
  }
}

const MAX_PARAM_DESCRIPTION_LENGTH = 120;

/**
 * Build a compact list of top-level parameters from a Zod object schema.
 * Only walks one level deep -- nested object details are omitted.
 */
export function buildStepParamsSummary(schema: z.ZodType): StepParamSummary[] {
  const shape = getShape(schema);
  return Object.entries(shape).map(([name, fieldSchema]) => {
    const { optional } = unwrapSchema(fieldSchema);
    let description = fieldSchema.description ?? undefined;
    if (description && description.length > MAX_PARAM_DESCRIPTION_LENGTH) {
      description = description.slice(0, MAX_PARAM_DESCRIPTION_LENGTH) + '...';
    }
    return {
      name,
      type: describeZodType(fieldSchema),
      required: !optional,
      ...(description ? { description } : {}),
    };
  });
}

/**
 * Produce a one-line summary of an output schema, e.g.
 * `"object with: took (number), errors (boolean), items (array)"`.
 */
export function buildOutputSummary(schema: z.ZodType): string {
  const { inner } = unwrapSchema(schema);
  const kind = getZodSchemaType(inner);

  if (kind === 'object' && inner instanceof z.ZodObject) {
    const keys = Object.entries(inner.shape as Record<string, z.ZodType>);
    if (keys.length === 0) return 'object';
    const fields = keys
      .slice(0, 12)
      .map(([k, v]) => `${k} (${describeZodType(v)})`)
      .join(', ');
    const suffix = keys.length > 12 ? `, ... +${keys.length - 12} more` : '';
    return `object with: ${fields}${suffix}`;
  }

  if (kind === 'array') {
    return 'array';
  }

  return describeZodType(inner);
}
