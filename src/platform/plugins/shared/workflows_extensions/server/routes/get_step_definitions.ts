/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter } from '@kbn/core/server';
import { createSHA256Hash } from '@kbn/crypto';
import { z } from '@kbn/zod/v4';
import type { StepDocMetadata } from '../../common/step_registry/types';
import type { ServerStepRegistry } from '../step_registry';

const ROUTE_PATH = '/internal/workflows_extensions/step_definitions';

/** One schema property for docs (required/optional, type, optional description). */
export interface SchemaProperty {
  name: string;
  required: boolean;
  type: string;
  description?: string;
}

function getJsonSchemaType(prop: Record<string, unknown>): string {
  if (typeof prop.type === 'string') {
    return prop.type;
  }
  const anyOf = prop.anyOf as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(anyOf)) {
    const first = anyOf.find((s) => s.type !== 'null');
    return first && typeof first.type === 'string' ? first.type : 'unknown';
  }
  const oneOf = prop.oneOf as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(oneOf)) {
    const first = oneOf.find((s) => s.type !== 'null');
    return first && typeof first.type === 'string' ? first.type : 'unknown';
  }
  return 'unknown';
}

function jsonSchemaToProperties(jsonSchema: Record<string, unknown>): SchemaProperty[] | null {
  const properties = jsonSchema.properties as Record<string, Record<string, unknown>> | undefined;
  if (typeof properties !== 'object' || properties === null) {
    return null;
  }
  const required = new Set<string>(
    Array.isArray(jsonSchema.required) ? (jsonSchema.required as string[]) : []
  );
  const schemaProperties = Object.entries(properties).map(([name, prop]) => {
    const propObj = typeof prop === 'object' && prop !== null ? prop : {};
    return {
      name,
      required: required.has(name),
      type: getJsonSchemaType(propObj),
      description:
        typeof propObj.description === 'string' ? (propObj.description as string) : undefined,
    };
  });
  return schemaProperties.sort((a, b) => a.name.localeCompare(b.name, 'en'));
}

function schemaToProperties(schema: z.ZodType): SchemaProperty[] | null {
  try {
    const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
    return jsonSchemaToProperties(jsonSchema);
  } catch {
    return null;
  }
}

/**
 * Response shape for one step: id and handlerHash (for approval tests), plus optional doc metadata and input/config/output tables (for docs generator).
 */
export interface StepDefinitionResponseItem {
  id: string;
  handlerHash: string;
  /** Grouping for documentation (matches `StepCategory` in step definitions). Present only when step doc metadata has been pushed. */
  stepCategory?: string;
  label?: string;
  description?: string;
  documentation?: StepDocMetadata['documentation'];
  input?: SchemaProperty[];
  config?: SchemaProperty[];
  output?: SchemaProperty[];
}

/**
 * Registers the route to get all registered step definitions.
 * This endpoint is used by Scout tests to validate that new step registrations
 * are approved by the workflows-eng team.
 */
export function registerGetStepDefinitionsRoute(
  router: IRouter,
  registry: ServerStepRegistry,
  docMetadataStore: Map<string, StepDocMetadata>
): void {
  router.get(
    {
      path: ROUTE_PATH,
      options: {
        access: 'internal',
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route is used for testing purposes only. No sensitive data is exposed.',
        },
      },
      validate: false,
    },
    async (_context, _request, response) => {
      const allStepDefinitions = registry.getAll();
      const steps: StepDefinitionResponseItem[] = allStepDefinitions
        .map((step) => {
          const { id, handler, inputSchema, outputSchema, configSchema } = step;
          const doc = docMetadataStore.get(id);
          const item: StepDefinitionResponseItem = {
            id,
            handlerHash: createSHA256Hash(handler.toString()),
          };
          if (doc) {
            item.stepCategory = step.category;
            item.label = doc.label;
            item.description = doc.description;
            if (doc.documentation) item.documentation = doc.documentation;
          }
          const inputProps = schemaToProperties(inputSchema);
          if (inputProps !== null && inputProps.length > 0) {
            item.input = inputProps;
          }
          const configProps = configSchema ? schemaToProperties(configSchema) : null;
          if (configProps !== null && configProps.length > 0) {
            item.config = configProps;
          }
          const outputProps = schemaToProperties(outputSchema);
          if (outputProps !== null && outputProps.length > 0) {
            item.output = outputProps;
          }
          return item;
        })
        .sort((a, b) => a.id.localeCompare(b.id));

      return response.ok({ body: { steps } });
    }
  );
}
