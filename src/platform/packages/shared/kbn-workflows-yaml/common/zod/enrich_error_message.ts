/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document } from 'yaml';
import YAML from 'yaml';
import { getSchemaAtPath } from '@kbn/workflows/common/utils/zod';
import { z } from '@kbn/zod/v4';
import { getDetailedTypeDescription } from './zod_type_description';

export type ConnectorParamsSchemaResolver = (stepType: string) => z.ZodType | null;

export interface ErrorContext {
  schema?: z.ZodType;
  yamlDocument?: Document;
  /**
   * Optional resolver that returns the params schema for a given connector/step
   * type. When omitted, connector-specific error enrichment is skipped and
   * enrichment falls back to the workflow schema.
   */
  connectorParamsSchemaResolver?: ConnectorParamsSchemaResolver;
}

export interface EnrichmentResult {
  message: string;
  enriched: boolean;
}

interface StepInfo {
  stepType: string;
  pathWithinWith: string[];
}

const enrichmentCache = new Map<string, EnrichmentResult>();

export function clearEnrichmentCache(): void {
  enrichmentCache.clear();
}

export function enrichErrorMessage(
  path: PropertyKey[],
  originalMessage: string,
  errorCode: string,
  context: ErrorContext
): EnrichmentResult {
  const { schema, yamlDocument, connectorParamsSchemaResolver } = context;
  const fieldName = path.length > 0 ? String(path[path.length - 1]) : 'field';
  const stepInfo = findStepInfoFromPath(path, yamlDocument);

  const cacheKey = `${path.join('.')}|${errorCode}|${originalMessage}|${
    stepInfo?.stepType ?? 'unknown'
  }|${schema ? 'schema' : 'noschema'}|${connectorParamsSchemaResolver ? 'conn' : 'noconn'}`;

  const cached = enrichmentCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const result = computeEnrichment(
    path,
    originalMessage,
    errorCode,
    fieldName,
    schema,
    stepInfo,
    connectorParamsSchemaResolver
  );
  enrichmentCache.set(cacheKey, result);
  return result;
}

function computeEnrichment(
  path: PropertyKey[],
  originalMessage: string,
  errorCode: string,
  fieldName: string,
  schema: z.ZodType | undefined,
  stepInfo: StepInfo | null,
  connectorParamsSchemaResolver: ConnectorParamsSchemaResolver | undefined
): EnrichmentResult {
  const domainEnriched = tryDomainSpecificEnrichment(path, errorCode, originalMessage);
  if (domainEnriched) {
    return { message: domainEnriched, enriched: true };
  }

  if (path.length > 0) {
    const schemaEnriched = trySchemaAwareEnrichment(
      path,
      fieldName,
      schema,
      stepInfo,
      connectorParamsSchemaResolver
    );
    if (schemaEnriched) {
      return { message: schemaEnriched, enriched: true };
    }
  }

  const genericEnriched = tryGenericFallbackEnrichment(path, fieldName, errorCode);
  if (genericEnriched) {
    return { message: genericEnriched, enriched: true };
  }

  const fallbackMessage =
    path.length > 0 ? `${originalMessage} at ${path.join('.')}` : originalMessage;
  return { message: fallbackMessage, enriched: false };
}

function trySchemaAwareEnrichment(
  path: PropertyKey[],
  fieldName: string,
  schema: z.ZodType | undefined,
  stepInfo: StepInfo | null,
  connectorParamsSchemaResolver: ConnectorParamsSchemaResolver | undefined
): string | null {
  const connectorEnriched =
    stepInfo && connectorParamsSchemaResolver
      ? tryConnectorSchemaEnrichment(fieldName, stepInfo, connectorParamsSchemaResolver)
      : null;
  if (connectorEnriched) {
    return connectorEnriched;
  }

  if (schema) {
    return tryWorkflowSchemaEnrichment(path, fieldName, schema);
  }

  return null;
}

function tryConnectorSchemaEnrichment(
  fieldName: string,
  stepInfo: StepInfo,
  connectorParamsSchemaResolver: ConnectorParamsSchemaResolver
): string | null {
  const { stepType, pathWithinWith } = stepInfo;

  const paramsSchema = connectorParamsSchemaResolver(stepType);
  if (!paramsSchema) {
    return null;
  }

  const fieldSchema =
    pathWithinWith.length === 0
      ? paramsSchema
      : getSchemaAtPath(paramsSchema, pathWithinWith.join('.'))?.schema;

  if (!fieldSchema) {
    return null;
  }

  return generateSchemaErrorMessage(fieldName, fieldSchema);
}

function tryWorkflowSchemaEnrichment(
  path: PropertyKey[],
  fieldName: string,
  schema: z.ZodType
): string | null {
  const pathString = path
    .map((segment) => (typeof segment === 'number' ? `[${segment}]` : segment))
    .join('.')
    .replace(/\.\[/g, '[');

  const schemaAtPath = getSchemaAtPath(schema, pathString);
  if (!schemaAtPath?.schema) {
    return null;
  }

  return generateSchemaErrorMessage(fieldName, schemaAtPath.schema);
}

function tryDomainSpecificEnrichment(
  path: PropertyKey[],
  errorCode: string,
  originalMessage: string
): string | null {
  if (errorCode === 'invalid_union' && path[0] === 'steps' && path.includes('type')) {
    return 'Invalid step type. Use Ctrl+Space to see available options.';
  }

  if (errorCode === 'invalid_literal' && path.includes('type')) {
    const receivedMatch = originalMessage.match(/received[:\s]+"?([^"]+)"?/i);
    const receivedValue = receivedMatch?.[1] || '';

    if (receivedValue.startsWith('elasticsearch.')) {
      return `Unknown Elasticsearch API: "${receivedValue}". Use autocomplete to see valid elasticsearch.* APIs.`;
    }
    if (receivedValue.startsWith('kibana.')) {
      return `Unknown Kibana API: "${receivedValue}". Use autocomplete to see valid kibana.* APIs.`;
    }
    return `Unknown step type: "${receivedValue}". Available: elasticsearch.*, kibana.*, slack, http, console, wait, ai.*`;
  }

  if (errorCode === 'invalid_type' && path.length === 1 && path[0] === 'triggers') {
    return 'No triggers found. Add at least one trigger.';
  }

  if (errorCode === 'invalid_type' && path.length === 1 && path[0] === 'steps') {
    return 'No steps found. Add at least one step.';
  }

  return null;
}

function tryGenericFallbackEnrichment(
  path: PropertyKey[],
  fieldName: string,
  errorCode: string
): string | null {
  if (errorCode === 'invalid_union' && path.length > 0) {
    return `${fieldName} has an invalid value. Please check the expected format for this field.`;
  }

  return null;
}

function findStepInfoFromPath(path: PropertyKey[], yamlDocument?: Document): StepInfo | null {
  if (!yamlDocument?.contents || !YAML.isMap(yamlDocument.contents)) {
    return null;
  }

  const withIndex = path.indexOf('with');
  if (withIndex === -1) {
    return null;
  }

  const pathToStep = path.slice(0, withIndex);
  const pathWithinWith = path.slice(withIndex + 1);

  const stepType = getStepTypeAtYamlPath(pathToStep, yamlDocument);
  if (!stepType) {
    return null;
  }

  return { stepType, pathWithinWith: pathWithinWith.map(String) };
}

function getStepTypeAtYamlPath(pathToStep: PropertyKey[], yamlDocument: Document): string | null {
  try {
    let current: unknown = yamlDocument.contents;

    for (let i = 0; i < pathToStep.length; i++) {
      const segment = pathToStep[i];

      if (YAML.isMap(current)) {
        const item = current.items.find(
          (pair) => YAML.isScalar(pair.key) && pair.key.value === segment
        );
        if (!item) {
          return null;
        }
        current = item.value;
      } else if (YAML.isSeq(current)) {
        const index = typeof segment === 'number' ? segment : Number.parseInt(String(segment), 10);
        if (Number.isNaN(index) || index < 0 || index >= current.items.length) {
          return null;
        }
        current = current.items[index];
      } else {
        return null;
      }
    }

    if (YAML.isMap(current)) {
      const typeItem = current.items.find(
        (pair) => YAML.isScalar(pair.key) && pair.key.value === 'type'
      );
      if (typeItem && YAML.isScalar(typeItem.value)) {
        return String(typeItem.value.value);
      }
    }

    return null;
  } catch {
    return null;
  }
}

function analyzeUnionSchema(unionSchema: z.ZodUnion<any>): string[] {
  return unionSchema.def.options.map((option: z.ZodType) => analyzeUnionOption(option));
}

function analyzeUnionOption(option: z.ZodType): string {
  if (option instanceof z.ZodObject) {
    const shape = option.def.shape;
    const discriminator = findDiscriminatorInShape(shape);

    if (discriminator) {
      const otherProps = Object.keys(shape)
        .filter((key) => key !== discriminator.key && !isOptionalSchema(shape[key]))
        .sort();

      let description = `type: "${discriminator.value}"`;
      if (otherProps.length > 0) {
        description += `\n    other props: ${otherProps.join(', ')}`;
      }
      return description;
    }

    const requiredProps = Object.keys(shape)
      .filter((key) => !isOptionalSchema(shape[key]))
      .sort();

    if (requiredProps.length > 0) {
      return `object with: ${requiredProps.join(', ')}`;
    }

    const allProps = Object.keys(shape).sort();
    if (allProps.length > 0) {
      return `object (optional: ${allProps.join(', ')})`;
    }

    return 'an object';
  }

  if (option instanceof z.ZodRecord) {
    return 'a key-value mapping';
  }

  if (option instanceof z.ZodLiteral) {
    return `literal value: ${JSON.stringify(option.value)}`;
  }

  if (option instanceof z.ZodString) {
    return 'a string';
  }
  if (option instanceof z.ZodNumber) {
    return 'a number';
  }
  if (option instanceof z.ZodBoolean) {
    return 'a boolean';
  }

  return getTypeDescriptionForError(option);
}

function findDiscriminatorInShape(
  shape: Record<string, z.ZodType>
): { key: string; value: unknown } | null {
  for (const [key, schema] of Object.entries(shape)) {
    if (schema instanceof z.ZodLiteral) {
      return { key, value: schema.value };
    }
  }
  return null;
}

function isOptionalSchema(schema: z.ZodType): boolean {
  return (
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodNullable ||
    schema instanceof z.ZodDefault
  );
}

function generateSchemaErrorMessage(fieldName: string, schema: z.ZodType): string | null {
  try {
    const unwrappedSchema = unwrapSchema(schema);

    if (unwrappedSchema instanceof z.ZodUnion) {
      return generateUnionErrorMessage(fieldName, unwrappedSchema);
    }

    if (unwrappedSchema instanceof z.ZodObject) {
      return `${fieldName} expects ${getObjectPropertiesDescription(unwrappedSchema)}`;
    }

    if (unwrappedSchema instanceof z.ZodArray) {
      return generateArrayErrorMessage(fieldName, unwrappedSchema);
    }

    const expectedType = getTypeDescriptionForError(unwrappedSchema);
    return `${fieldName} expects ${expectedType}`;
  } catch {
    return null;
  }
}

function generateUnionErrorMessage(fieldName: string, unionSchema: z.ZodUnion<any>): string | null {
  const optionDescriptions = analyzeUnionSchema(unionSchema);
  if (optionDescriptions.length === 0) {
    return null;
  }

  const optionsList = optionDescriptions.map((description) => `  - ${description}`).join('\n');
  return `${fieldName} must be one of:\n${optionsList}`;
}

function generateArrayErrorMessage(fieldName: string, arraySchema: z.ZodArray<any>): string {
  const elementSchema = unwrapSchema(arraySchema.element);

  if (elementSchema instanceof z.ZodObject) {
    return `${fieldName} expects a list of ${getObjectPropertiesDescription(elementSchema)}`;
  }

  if (elementSchema instanceof z.ZodUnion) {
    const unionMsg = generateUnionErrorMessage('each item', elementSchema);
    if (unionMsg) {
      return `${fieldName} expects a list, ${unionMsg}`;
    }
  }

  const elementType = getTypeDescriptionForError(elementSchema);
  return `${fieldName} expects a list of ${elementType}`;
}

function unwrapSchema(schema: z.ZodType): z.ZodType {
  let current = schema;

  while (true) {
    if (current instanceof z.ZodOptional) {
      current = current.unwrap() as z.ZodType;
    } else if (current instanceof z.ZodNullable) {
      current = current.unwrap() as z.ZodType;
    } else if (current instanceof z.ZodDefault) {
      current = current.unwrap() as z.ZodType;
    } else {
      break;
    }
  }

  return current;
}

function getObjectPropertiesDescription(
  fieldSchema: z.ZodObject,
  maxProperties: number = 5
): string {
  const requiredProperties = Object.entries(fieldSchema.def.shape)
    .filter(([, schema]) => !isOptionalSchema(schema as z.ZodType))
    .map(([propertyName]) => propertyName);

  if (requiredProperties.length === 0) {
    return 'an object';
  }

  const propsText = requiredProperties.slice(0, maxProperties).join(', ');
  const suffix = requiredProperties.length > maxProperties ? '...' : '';
  return `an object with: ${propsText}${suffix}`;
}

function getTypeDescriptionForError(schema: z.ZodType): string {
  return getDetailedTypeDescription(schema, {
    detailed: true,
    maxDepth: 3,
    showOptional: false,
    includeDescriptions: false,
  });
}
