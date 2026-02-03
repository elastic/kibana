/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Document } from 'yaml';
import { getSchemaAtPath } from '@kbn/workflows/common/utils/zod';
import type { ZodError } from '@kbn/zod/v4';
import { z } from '@kbn/zod/v4';
import { getCompactTypeDescription, getDetailedTypeDescription } from './zod_type_description';
import { getAllConnectors } from '../../schema';
import type { FormattedZodError, MockZodError } from '../errors/invalid_yaml_schema';

interface FormatZodErrorResult {
  message: string;
  formattedError: FormattedZodError;
}

export function formatZodError(
  error: ZodError | MockZodError,
  schema?: z.ZodType,
  yamlDocument?: Document
): FormatZodErrorResult {
  // If it's not a Zod error structure, return as-is
  if (!error?.issues || !Array.isArray(error.issues)) {
    const message = error?.message || String(error);
    return { message, formattedError: error };
  }

  // eslint-disable-next-line complexity
  const formattedIssues = error.issues.map((issue) => {
    let formattedMessage: string;

    // Try to generate dynamic union error message first if schema is provided
    if (schema && issue.path && issue.path.length > 0) {
      const fieldName = issue.path[issue.path.length - 1] || 'field';
      const dynamicUnionMessage = generateUnionErrorMessage(
        schema,
        issue.path,
        String(fieldName),
        yamlDocument
      );
      if (dynamicUnionMessage) {
        formattedMessage = dynamicUnionMessage;
      }
      // Try generic union error message as fallback
      else {
        const genericUnionMessage = getGenericUnionErrorMessage(issue);
        // Handle discriminated union errors for type field
        if (issue.code === 'invalid_union' && issue.path.includes('triggers')) {
          formattedMessage = `Invalid trigger type. Available: manual, alert, scheduled`;
        } else if (issue.code === 'invalid_union' && issue.path.includes('type')) {
          formattedMessage = 'Invalid connector type. Use Ctrl+Space to see available options.';
        } else if (genericUnionMessage) {
          formattedMessage = genericUnionMessage;
        }
        // Handle literal type errors for type field (avoid listing all 1000+ options)
        else if (issue.code === 'invalid_literal' && issue.path?.includes('type')) {
          const receivedValue = issue.received as string;
          if (receivedValue?.startsWith?.('elasticsearch.')) {
            formattedMessage = `Unknown Elasticsearch API: "${receivedValue}". Use autocomplete to see valid elasticsearch.* APIs.`;
          } else if (receivedValue?.startsWith?.('kibana.')) {
            formattedMessage = `Unknown Kibana API: "${receivedValue}". Use autocomplete to see valid kibana.* APIs.`;
          } else {
            formattedMessage = `Unknown connector type: "${receivedValue}". Available: elasticsearch.*, kibana.*, slack, http, console, wait, inference.*`;
          }
        }
        // Handle union errors with too many options
        else if (issue.code === 'invalid_union' && issue.path?.includes('type')) {
          formattedMessage = 'Invalid connector type. Use Ctrl+Space to see available options.';
        }
        // Note: Removed hardcoded connector-specific fallbacks since we now have dynamic union detection
        else if (
          issue.code === 'invalid_type' &&
          issue.path.length === 1 &&
          issue.path[0] === 'triggers'
        ) {
          formattedMessage = `No triggers found. Add at least one trigger.`;
        } else if (
          issue.code === 'invalid_type' &&
          issue.path.length === 1 &&
          issue.path[0] === 'steps'
        ) {
          formattedMessage = `No steps found. Add at least one step.`;
        }
        // Return original message for other errors
        else {
          formattedMessage = `${issue.message} at ${issue.path.join('.')}`;
        }
      }
    }
    // Fallback when no schema is provided - use existing logic
    else {
      // Try generic union error message first
      const genericUnionMessage = getGenericUnionErrorMessage(issue);
      // Handle discriminated union errors for type field
      if (issue.code === 'invalid_union' && issue.path.includes('triggers')) {
        formattedMessage = `Invalid trigger type. Available: manual, alert, scheduled`;
      } else if (issue.code === 'invalid_union' && issue.path.includes('type')) {
        formattedMessage = 'Invalid connector type. Use Ctrl+Space to see available options.';
      } else if (genericUnionMessage) {
        formattedMessage = genericUnionMessage;
      }
      // Handle literal type errors for type field (avoid listing all 1000+ options)
      else if (issue.code === 'invalid_literal' && issue.path?.includes('type')) {
        const receivedValue = issue.received as string;
        if (receivedValue?.startsWith?.('elasticsearch.')) {
          formattedMessage = `Unknown Elasticsearch API: "${receivedValue}". Use autocomplete to see valid elasticsearch.* APIs.`;
        } else if (receivedValue?.startsWith?.('kibana.')) {
          formattedMessage = `Unknown Kibana API: "${receivedValue}". Use autocomplete to see valid kibana.* APIs.`;
        } else {
          formattedMessage = `Unknown connector type: "${receivedValue}". Available: elasticsearch.*, kibana.*, slack, http, console, wait, inference.*`;
        }
      }
      // Handle union errors with too many options
      else if (issue.code === 'invalid_union' && issue.path?.includes('type')) {
        formattedMessage = 'Invalid connector type. Use Ctrl+Space to see available options.';
      }
      // Note: Removed hardcoded connector-specific fallbacks since we now have dynamic union detection
      else if (
        issue.code === 'invalid_type' &&
        issue.path.length === 1 &&
        issue.path[0] === 'triggers'
      ) {
        formattedMessage = `No triggers found. Add at least one trigger.`;
      } else if (
        issue.code === 'invalid_type' &&
        issue.path.length === 1 &&
        issue.path[0] === 'steps'
      ) {
        formattedMessage = `No steps found. Add at least one step.`;
      }
      // Return original message for other errors
      else {
        formattedMessage = `${issue.message} at ${issue.path.join('.')}`;
      }
    }

    // Return a new issue object with the formatted message
    return {
      ...issue,
      message: formattedMessage,
    };
  });

  // Create a new ZodError-like object with formatted issues
  const formattedError = {
    ...error,
    issues: formattedIssues,
    message: formattedIssues.map((i: { message: string }) => i.message).join(', '),
  };

  return {
    message: formattedError.message,
    formattedError: formattedError as FormattedZodError,
  };
}

/**
 * Main function to get a user-friendly union error message
 * This tries multiple approaches to generate the best possible message
 */
function getGenericUnionErrorMessage(issue: any): string | null {
  if (issue.code !== 'invalid_union') {
    return null;
  }

  // Note: Custom handlers removed for simplicity

  // Try dynamic analysis
  const dynamicMessage = getDynamicUnionErrorMessage(issue);
  if (dynamicMessage) {
    return dynamicMessage;
  }

  // Fallback: if we can't analyze dynamically, provide a generic helpful message
  const fieldName =
    issue.path && issue.path.length > 0 ? issue.path[issue.path.length - 1] : 'field';
  return `${fieldName} has an invalid value. Please check the expected format for this field.`;
}

// Cache for schema lookups to avoid repeated computation
const schemaCache = new Map<string, any>();

/**
 * Generates a detailed union error message by analyzing the schema at the given path
 * or by looking up the connector schema directly
 */
function generateUnionErrorMessage(
  schema: z.ZodType,
  path: PropertyKey[],
  fieldName: string,
  yamlDocument?: any
): string | null {
  try {
    // Create cache key for this lookup
    const cacheKey = `${path.join('.')}-${fieldName}`;
    if (schemaCache.has(cacheKey)) {
      return schemaCache.get(cacheKey);
    }

    let result: string | null = null;

    // First, try to get the connector type from the path to look up the schema directly
    const connectorUnionSchema = getConnectorUnionSchemaFromPath(path, yamlDocument);
    if (connectorUnionSchema) {
      const unionOptions = analyzeUnionSchema(connectorUnionSchema);

      if (unionOptions.length > 0) {
        const optionsList = unionOptions.map((option) => `  - ${option.description}`).join('\n');

        result = `${fieldName} should be oneOf:\n${optionsList}`;
      }
    }

    // If not a union, try to get a better error message for the field schema
    if (!result) {
      result = getBetterFieldErrorMessage(path, fieldName, yamlDocument);
    }

    // Fallback: try the original path-based approach
    if (!result) {
      const pathString = path
        .map((segment) => (typeof segment === 'number' ? `[${segment}]` : segment))
        .join('.')
        .replace(/\.\[/g, '['); // Fix array notation

      const schemaAtPath = getSchemaAtPath(schema, pathString);

      if (schemaAtPath && schemaAtPath.schema) {
        // Check if it's a union schema (might be wrapped in optional, nullable, etc.)
        let unionSchema = schemaAtPath.schema;

        // Unwrap optional, nullable, default wrappers to find the underlying union
        while (unionSchema && !(unionSchema instanceof z.ZodUnion)) {
          if (unionSchema instanceof z.ZodOptional) {
            unionSchema = unionSchema.unwrap() as z.ZodType;
          } else if (unionSchema instanceof z.ZodNullable) {
            unionSchema = unionSchema.unwrap() as z.ZodType;
          } else if (unionSchema instanceof z.ZodDefault) {
            unionSchema = unionSchema.unwrap() as z.ZodType;
          } else {
            break;
          }
        }

        if (unionSchema instanceof z.ZodUnion) {
          const unionOptions = analyzeUnionSchema(unionSchema);

          if (unionOptions.length > 0) {
            const optionsList = unionOptions
              .map((option) => `  - ${option.description}`)
              .join('\n');

            result = `${fieldName} should be oneOf:\n${optionsList}`;
          }
        }
      }
    }

    // Cache the result (even if null)
    schemaCache.set(cacheKey, result);
    return result;
  } catch (error) {
    // If anything goes wrong, return null to fall back to default behavior
    return null;
  }
}

/**
 * Generates a better error message for non-union field types (like objects)
 */
function getBetterFieldErrorMessage(
  path: PropertyKey[],
  fieldName: string,
  yamlDocument?: any
): string | null {
  try {
    // Check if this is a field in a step's 'with' block
    if (
      path.length >= 4 &&
      path[0] === 'steps' &&
      typeof path[1] === 'number' &&
      path[2] === 'with'
    ) {
      const stepIndex = path[1];
      const fieldNameStr = String(fieldName);

      // Get the step type from the YAML document
      const stepType = getStepTypeFromYaml(yamlDocument, stepIndex);
      if (!stepType) {
        return null;
      }

      // Look up the connector definition for this step type
      const connectorSchema = getConnectorParamsSchema(stepType);
      if (!connectorSchema) {
        return null;
      }

      // Extract the field schema from the connector params schema
      const fieldSchema = getFieldSchemaFromConnectorParams(connectorSchema, fieldNameStr);
      if (!fieldSchema) {
        return null;
      }

      // Generate a better error message based on the schema type
      return generateFieldTypeErrorMessage(fieldNameStr, fieldSchema);
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Dynamically analyzes a Zod union schema to extract user-friendly option descriptions
 */
function analyzeUnionSchema(
  unionSchema: z.ZodUnion<any>
): Array<{ name: string; description: string }> {
  const options: Array<{ name: string; description: string }> = [];

  for (const option of unionSchema._def.options) {
    let name = 'unknown';
    let description = 'unknown option';

    if (option instanceof z.ZodObject) {
      const shape = option.def.shape;

      // Look for discriminator fields (like 'type')
      const discriminator = findDiscriminatorInShape(shape);
      if (discriminator) {
        // Get other required properties
        const otherProps = Object.keys(shape)
          .filter((key) => key !== discriminator.key && !isOptionalSchema(shape[key]))
          .sort();

        // Format according to test expectations
        description = `type: "${discriminator.value}"`;
        if (otherProps.length > 0) {
          description += `\n    other props: ${otherProps.join(', ')}`;
        }
      } else {
        // No discriminator, list all required properties
        const requiredProps = Object.keys(shape)
          .filter((key) => !isOptionalSchema(shape[key]))
          .sort();

        if (requiredProps.length > 0) {
          name = `object_with_${requiredProps.join('_')}`;
          description = `props: ${requiredProps.join(', ')}`;
        }
      }
    } else if (option instanceof z.ZodLiteral) {
      name = `literal_${String(option.value).replace(/[^a-zA-Z0-9]/g, '_')}`;
      description = `literal value: ${JSON.stringify(option.value)}`;
    } else if (option instanceof z.ZodString) {
      name = 'string';
      description = 'string value';
    } else if (option instanceof z.ZodNumber) {
      name = 'number';
      description = 'number value';
    } else if (option instanceof z.ZodBoolean) {
      name = 'boolean';
      description = 'boolean value';
    } else {
      // Try to get type information from the schema
      const typeName = getSchemaTypeName(option);
      name = typeName || 'unknown';
      description = `${typeName || 'unknown'} type`;
    }

    options.push({ name, description });
  }

  return options;
}

/**
 * Finds discriminator field and value in a Zod object shape
 */
function findDiscriminatorInShape(
  shape: Record<string, z.ZodType>
): { key: string; value: any } | null {
  for (const [key, schema] of Object.entries(shape)) {
    if (schema instanceof z.ZodLiteral) {
      // TODO: fix multiple values case
      return { key, value: schema.value };
    }
  }
  return null;
}

/**
 * Checks if a Zod schema is optional
 */
function isOptionalSchema(schema: z.ZodType): boolean {
  return (
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodNullable ||
    schema instanceof z.ZodDefault
  );
}

/**
 * Gets a human-readable type name from a Zod schema
 * Uses the existing zod_type_description utility for consistency
 */
function getSchemaTypeName(schema: z.ZodType): string | null {
  try {
    return getCompactTypeDescription(schema);
  } catch {
    return null;
  }
}

/**
 * Dynamically generates a user-friendly error message for union validation failures
 * This analyzes the actual union schema from the error context
 */
function getDynamicUnionErrorMessage(issue: any): string | null {
  if (issue.code !== 'invalid_union' || !issue.unionErrors || !Array.isArray(issue.unionErrors)) {
    return null;
  }

  // Try to reconstruct the union schema from the error information
  const fieldName =
    issue.path && issue.path.length > 0 ? issue.path[issue.path.length - 1] : 'field';

  // Analyze the union errors to extract option information
  const options: Array<{ name: string; description: string }> = [];

  for (const unionError of issue.unionErrors) {
    if (unionError.issues && Array.isArray(unionError.issues)) {
      // Analyze each union option's validation errors to understand the expected structure
      const optionInfo = analyzeUnionErrorForOption(unionError.issues);
      if (optionInfo) {
        options.push(optionInfo);
      }
    }
  }

  if (options.length === 0) {
    return null;
  }

  // Generate user-friendly message
  const optionDescriptions = options.map((option, index) => `  - ${option.description}`).join('\n');

  return `${fieldName} should be oneOf:\n${optionDescriptions}`;
}

/**
 * Analyzes union error issues to understand what option was expected
 */
function analyzeUnionErrorForOption(issues: any[]): { name: string; description: string } | null {
  const requiredFields: string[] = [];
  let discriminatorInfo: { key: string; value: any } | null = null;

  for (const issue of issues) {
    if (issue.code === 'invalid_literal' && issue.path && issue.path.length > 0) {
      const fieldName = issue.path[issue.path.length - 1];
      const expectedValue = issue.expected;
      discriminatorInfo = { key: fieldName, value: expectedValue };
    } else if (issue.code === 'invalid_type' && issue.path && issue.path.length > 0) {
      const fieldName = issue.path[issue.path.length - 1];
      if (!requiredFields.includes(fieldName)) {
        requiredFields.push(fieldName);
      }
    }
  }

  if (discriminatorInfo) {
    const otherProps = requiredFields.filter((field) => field !== discriminatorInfo.key).sort();
    const propsText = otherProps.length > 0 ? `, other props: ${otherProps.join(', ')}` : '';

    // Try to get a better schema name if this looks like a connector type
    let schemaName = `${discriminatorInfo.key}_${String(discriminatorInfo.value).replace(
      /[^a-zA-Z0-9]/g,
      '_'
    )}`;
    if (discriminatorInfo.key === 'type' && String(discriminatorInfo.value).startsWith('.')) {
      const connectorType = String(discriminatorInfo.value).substring(1); // Remove the leading dot
      schemaName = `Cases_connector_properties_${connectorType.replace(/-/g, '_')}`;
    }

    return {
      name: schemaName,
      description: `${schemaName}\n    ${discriminatorInfo.key}: "${discriminatorInfo.value}"${propsText}`,
    };
  } else if (requiredFields.length > 0) {
    return {
      name: `object_with_${requiredFields.join('_')}`,
      description: `props: ${requiredFields.sort().join(', ')}`,
    };
  }

  return null;
}

/**
 * Generates a descriptive error message based on the field schema type
 * Uses the existing zod_type_description utility for consistency
 */
function generateFieldTypeErrorMessage(fieldName: string, fieldSchema: z.ZodType): string | null {
  try {
    // Handle ZodObject specially to show structure
    if (fieldSchema.constructor.name === 'ZodObject') {
      const objectStructure = getObjectStructureDescription(fieldSchema);
      if (objectStructure) {
        return `${fieldName} should be an object with structure:\n${objectStructure}`;
      }
      return `${fieldName} should be an object, not a primitive value`;
    }

    // For all other types, use the compact type description
    const expectedType = getCompactTypeDescription(fieldSchema);
    return `${fieldName} should be ${expectedType}`;
  } catch {
    return null;
  }
}

/**
 * Gets a description of an object's expected structure
 */
function getObjectStructureDescription(objectSchema: z.ZodType): string | null {
  try {
    return getDetailedTypeDescription(objectSchema, {
      detailed: true,
      maxDepth: 2,
      showOptional: true,
      includeDescriptions: false,
      singleLine: false,
      indentSpacesNumber: 2,
    });
  } catch {
    return null;
  }
}

/**
 * Attempts to get the union schema directly by looking up the connector definition
 * This works for any connector type and field, not just Cases connectors
 */
function getConnectorUnionSchemaFromPath(
  path: PropertyKey[],
  yamlDocument?: any
): z.ZodUnion<any> | null {
  try {
    // Check if this is a field in a step's 'with' block
    // Path should be like: ['steps', stepIndex, 'with', fieldName]
    if (
      path.length >= 4 &&
      path[0] === 'steps' &&
      typeof path[1] === 'number' &&
      path[2] === 'with'
    ) {
      const stepIndex = path[1];
      const fieldName = path[3];

      // Get the step type from the YAML document
      const stepType = getStepTypeFromYaml(yamlDocument, stepIndex);
      if (!stepType) {
        return null;
      }

      // Look up the connector definition for this step type
      const connectorSchema = getConnectorParamsSchema(stepType);
      if (!connectorSchema) {
        return null;
      }

      // Extract the field schema from the connector params schema
      const fieldSchema = getFieldSchemaFromConnectorParams(connectorSchema, String(fieldName));
      if (!fieldSchema) {
        return null;
      }

      // Check if the field schema is a union (possibly wrapped)
      const unionSchema = unwrapToUnion(fieldSchema);
      if (unionSchema) {
        return unionSchema;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Extracts the step type from the YAML document at the given step index
 */
function getStepTypeFromYaml(yamlDocument: any, stepIndex: number): string | null {
  try {
    if (!yamlDocument || !yamlDocument.contents) {
      return null;
    }

    const contents = yamlDocument.contents;
    if (!contents.items) {
      return null;
    }

    // Find the 'steps' field
    const stepsItem = contents.items.find((item: any) => item.key && item.key.value === 'steps');

    if (!stepsItem || !stepsItem.value || !stepsItem.value.items) {
      return null;
    }

    // Get the step at the specified index
    const step = stepsItem.value.items[stepIndex];
    if (!step || !step.items) {
      return null;
    }

    // Find the 'type' field in the step
    const typeItem = step.items.find((item: any) => item.key && item.key.value === 'type');

    if (!typeItem || !typeItem.value) {
      return null;
    }

    return typeItem.value.value;
  } catch (error) {
    return null;
  }
}

/**
 * Gets the params schema for a given connector/step type
 */
function getConnectorParamsSchema(stepType: string): z.ZodType | null {
  try {
    const allConnectors = getAllConnectors();

    // Find the connector definition for this step type
    const connector = allConnectors.find((c: any) => c.type === stepType);
    if (!connector) {
      return null;
    }

    return connector.paramsSchema;
  } catch (error) {
    return null;
  }
}

/**
 * Extracts a field schema from a connector params schema
 */
function getFieldSchemaFromConnectorParams(
  paramsSchema: z.ZodType,
  fieldName: string
): z.ZodType | null {
  try {
    // Check if it's a ZodObject with a shape
    if (
      paramsSchema &&
      typeof paramsSchema === 'object' &&
      (paramsSchema as any)._def &&
      typeof (paramsSchema as any)._def.shape === 'function'
    ) {
      const shape = (paramsSchema as any)._def.shape();
      return shape[fieldName] || null;
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Unwraps a schema to find the underlying union, handling optional/nullable/default wrappers
 */
function unwrapToUnion(schema: z.ZodType): z.ZodUnion<any> | null {
  let current = schema;

  // Unwrap optional, nullable, default wrappers to find the underlying union
  while (current && current.constructor.name !== 'ZodUnion') {
    if ((current as any)._def) {
      if (
        current.constructor.name === 'ZodOptional' ||
        current.constructor.name === 'ZodNullable' ||
        current.constructor.name === 'ZodDefault'
      ) {
        current = ((current as any)._def as any).innerType;
      } else {
        break;
      }
    } else {
      break;
    }
  }

  // Check if we found a ZodUnion
  if (
    current &&
    current.constructor.name === 'ZodUnion' &&
    (current as any)._def &&
    Array.isArray(((current as any)._def as any).options)
  ) {
    return current as z.ZodUnion<any>;
  }

  return null;
}
