/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JSONSchema7 } from 'json-schema';
import type { Document } from 'yaml';
import { isPair, isScalar, visit } from 'yaml';
import type { monaco } from '@kbn/monaco';
import type { WorkflowYaml } from '@kbn/workflows';
import { normalizeInputsToJsonSchema, resolveRef } from '@kbn/workflows/spec/lib/input_conversion';
import { convertJsonSchemaToZod } from '../../../../common/lib/json_schema_to_zod';
import { getPathFromAncestors } from '../../../../common/lib/yaml';
import type { YamlValidationResult } from '../model/types';

/**
 * Validates that default values in JSON Schema inputs match their property constraints
 */
export function validateJsonSchemaDefaults(
  yamlDocument: Document | null,
  workflowDefinition: WorkflowYaml,
  model?: monaco.editor.ITextModel
): YamlValidationResult[] {
  const errors: YamlValidationResult[] = [];

  if (!yamlDocument) {
    return errors;
  }

  // Get inputs from workflowDefinition or extract from YAML as fallback
  const inputs =
    workflowDefinition?.inputs ??
    (() => {
      try {
        const yamlJson = yamlDocument.toJSON();
        return (
          yamlJson && typeof yamlJson === 'object' && 'inputs' in yamlJson
            ? (yamlJson as Record<string, unknown>).inputs
            : undefined
        ) as WorkflowYaml['inputs'] | undefined;
      } catch {
        return undefined;
      }
    })();

  if (!inputs) {
    return errors;
  }

  // Normalize inputs to JSON Schema format
  const normalizedInputs = normalizeInputsToJsonSchema(inputs);
  // Defensive check: ensure normalizedInputs has valid properties object
  if (
    !normalizedInputs ||
    !normalizedInputs.properties ||
    typeof normalizedInputs.properties !== 'object' ||
    normalizedInputs.properties === null ||
    Array.isArray(normalizedInputs.properties)
  ) {
    return errors;
  }

  // Build a map of property paths to their schemas for quick lookup
  // This includes resolving $ref references
  const propertySchemas = new Map<string, { schema: JSONSchema7; fullPath: string[] }>();

  function buildPropertyMap(properties: Record<string, JSONSchema7>, path: string[] = []): void {
    // Defensive check: ensure properties is a valid object
    if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
      return;
    }

    for (const [propName, propSchema] of Object.entries(properties)) {
      // Skip null/undefined schemas (can happen when YAML is partially parsed)
      if (propSchema && typeof propSchema === 'object' && !Array.isArray(propSchema)) {
        const fullPath = [...path, propName];

        // Resolve $ref if present
        let resolvedSchema = propSchema;
        if (propSchema.$ref) {
          const resolved = resolveRef(propSchema.$ref, normalizedInputs);
          if (resolved) {
            resolvedSchema = resolved;
          }
        }

        // Store the resolved schema for validation
        // For nested properties, we need to validate against the property's own schema, not the parent
        propertySchemas.set(fullPath.join('.'), { schema: resolvedSchema, fullPath });

        // Recursively handle nested properties (including in resolved $ref schemas)
        // When we recurse, we pass the fullPath so nested properties get keys like 'inputs.properties.analyst.name'
        if (resolvedSchema.type === 'object' && resolvedSchema.properties) {
          // Filter out boolean values (JSONSchema7Definition can be JSONSchema7 | boolean)
          const filteredProperties: Record<string, JSONSchema7> = {};
          for (const [key, schema] of Object.entries(resolvedSchema.properties)) {
            if (typeof schema === 'object' && schema !== null) {
              filteredProperties[key] = schema as JSONSchema7;
            }
          }
          buildPropertyMap(filteredProperties, fullPath);
        }
      }
    }
  }

  // Only build property map if properties exist and is a valid object (not array, not null)
  // Note: normalizeInputsToJsonSchema already converts legacy array format to JSON Schema format,
  // so normalizedInputs.properties contains all properties regardless of input format
  if (
    normalizedInputs.properties &&
    typeof normalizedInputs.properties === 'object' &&
    normalizedInputs.properties !== null &&
    !Array.isArray(normalizedInputs.properties)
  ) {
    buildPropertyMap(normalizedInputs.properties, ['inputs', 'properties']);
  }

  // Also build a map for definitions (for $ref schemas)
  if (normalizedInputs.definitions || normalizedInputs.$defs) {
    const definitions = normalizedInputs.definitions || normalizedInputs.$defs || {};
    buildPropertyMap(definitions as Record<string, JSONSchema7>, ['inputs', 'definitions']);
  }

  /**
   * Extracts property key and name from a YAML path
   * Handles both new JSON Schema format (inputs.properties.*) and legacy array format (inputs[0].*)
   */
  function extractPropertyPath(
    path: Array<string | number>
  ): { propertyKey: string; propertyName: string } | null {
    const isInProperties = path[1] === 'properties';
    const isInDefinitions = path[1] === 'definitions' || path[1] === '$defs';
    const isLegacyArray = typeof path[1] === 'number' && path[0] === 'inputs';

    if (!isInProperties && !isInDefinitions && !isLegacyArray) {
      return null;
    }

    let propertyKey: string;
    let propertyName: string;
    let filteredPath: string[];

    if (isInProperties) {
      const propertyPath = path.slice(2, -1);
      filteredPath = propertyPath
        .filter((segment) => segment !== 'properties')
        .map((segment) => String(segment));
      propertyKey = filteredPath.length > 0 ? `inputs.properties.${filteredPath.join('.')}` : '';
      propertyName = filteredPath[filteredPath.length - 1] as string;
    } else if (isLegacyArray) {
      // Legacy array format: inputs[0].default -> find the input name and map to normalized property
      const arrayIndex = path[1] as number;
      if (
        Array.isArray(inputs) &&
        inputs[arrayIndex] &&
        typeof inputs[arrayIndex] === 'object' &&
        'name' in inputs[arrayIndex]
      ) {
        const inputName = String(inputs[arrayIndex].name);
        propertyName = inputName;
        propertyKey = `inputs.properties.${inputName}`;
      } else {
        return null;
      }
    } else {
      const definitionName = String(path[2]);
      const propertyPath = path.slice(4, -1);
      filteredPath = propertyPath
        .filter((segment) => segment !== 'properties')
        .map((segment) => String(segment));
      propertyKey = `inputs.definitions.${definitionName}.${filteredPath.join('.')}`;
      propertyName = filteredPath[filteredPath.length - 1] || definitionName;
    }

    return { propertyKey, propertyName };
  }

  /**
   * Finds property info by key or name fallback
   */
  function findPropertyInfo(
    propertyKey: string,
    propertyName: string
  ): { schema: JSONSchema7; fullPath: string[] } | null {
    let propertyInfo = propertySchemas.get(propertyKey);

    // Fallback: try matching by property name if exact path not found
    if (!propertyInfo) {
      for (const [mapKey, mapValue] of propertySchemas.entries()) {
        if (mapKey.endsWith(`.${propertyName}`) || mapKey === propertyName) {
          propertyInfo = mapValue;
          break;
        }
      }
    }

    return propertyInfo || null;
  }

  /**
   * Calculates line/column positions from byte offsets
   */
  function calculatePosition(
    startOffset: number,
    endOffset: number,
    doc: Document
  ): { startLine: number; startCol: number; endLine: number; endCol: number } {
    if (model) {
      const startPos = model.getPositionAt(startOffset);
      const endPos = model.getPositionAt(endOffset);
      return {
        startLine: startPos.lineNumber,
        startCol: startPos.column,
        endLine: endPos.lineNumber,
        endCol: endPos.column,
      };
    }

    // Fallback to manual calculation
    const text = doc.toString();
    let line = 1;
    let column = 1;
    let startLine = 1;
    let startCol = 1;
    let endLine = 1;
    let endCol = 1;

    for (let i = 0; i < text.length; i++) {
      if (i === startOffset) {
        startLine = line;
        startCol = column;
      }
      if (i === endOffset) {
        endLine = line;
        endCol = column;
        break;
      }
      if (text[i] === '\n') {
        line++;
        column = 1;
      } else {
        column++;
      }
    }

    return { startLine, startCol, endLine, endCol };
  }

  /**
   * Creates a validation error for an invalid default value
   */
  function createValidationError(
    propertyKey: string,
    propertyName: string,
    schema: JSONSchema7,
    errorMessage: string,
    startLine: number,
    startCol: number,
    endLine: number,
    endCol: number
  ): YamlValidationResult {
    return {
      id: `default-${propertyKey}-${startLine}-${startCol}`,
      startLineNumber: startLine,
      startColumn: startCol,
      endLineNumber: endLine,
      endColumn: endCol,
      message: `Invalid default value for ${propertyName}: ${errorMessage}`,
      severity: 'error',
      owner: 'json-schema-default-validation',
      hoverMessage: `Default value does not match the property's constraints (type: ${
        schema.type
      }, format: ${schema.format || 'none'}, pattern: ${schema.pattern || 'none'})`,
    };
  }

  // Visit all scalar nodes in the YAML document to find default values
  visit(yamlDocument, {
    Scalar(key, node, ancestors) {
      if (!node.range) {
        return;
      }

      const lastAncestor = ancestors?.[ancestors.length - 1];
      if (!isPair(lastAncestor)) {
        return;
      }

      const pair = lastAncestor;
      if (!isScalar(pair.key) || pair.key.value !== 'default') {
        return;
      }

      // Check if this is the value of a default key (not the key itself)
      if (pair.value !== node) {
        return;
      }

      // Get the path to this default value
      const path = getPathFromAncestors(ancestors, node);

      // Check if this is within inputs (either properties/definitions format or legacy array format)
      // New format: ['inputs', 'properties', 'greeting', 'default'] - length 4
      // Legacy format: ['inputs', 0, 'default'] - length 3
      if (path.length < 3 || path[0] !== 'inputs') {
        return;
      }

      const pathInfo = extractPropertyPath(path);
      if (!pathInfo) {
        return;
      }

      const { propertyKey, propertyName } = pathInfo;
      const propertyInfo = findPropertyInfo(propertyKey, propertyName);
      if (!propertyInfo) {
        return;
      }

      // Validate the default value against the property schema
      const zodSchema = convertJsonSchemaToZod(propertyInfo.schema);
      const result = zodSchema.safeParse(node.value);

      if (!result.success) {
        const [startOffset, endOffset] = node.range;
        const { startLine, startCol, endLine, endCol } = calculatePosition(
          startOffset,
          endOffset,
          yamlDocument
        );
        const errorMessage = result.error.issues.map((issue) => issue.message).join(', ');

        errors.push(
          createValidationError(
            propertyKey,
            propertyName,
            propertyInfo.schema,
            errorMessage,
            startLine,
            startCol,
            endLine,
            endCol
          )
        );
      }
    },
  });

  return errors;
}
