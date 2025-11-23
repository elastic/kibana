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
import { normalizeInputsToJsonSchema } from '@kbn/workflows/spec/lib/input_conversion';
import { convertJsonSchemaToZod } from '../../../../common/lib/json_schema_to_zod';
import { getPathFromAncestors } from '../../../../common/lib/yaml';
import type { YamlValidationResult } from '../model/types';

/**
 * Resolves $ref references within the inputs schema
 */
function resolveRef(
  ref: string,
  inputsSchema: ReturnType<typeof normalizeInputsToJsonSchema>
): JSONSchema7 | null {
  if (!ref.startsWith('#/')) {
    return null;
  }

  const path = ref.slice(2).split('/'); // Remove '#/' and split
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = inputsSchema;

  for (const segment of path) {
    if (current && typeof current === 'object') {
      current = current[segment];
    } else {
      return null;
    }
  }

  return current as JSONSchema7 | null;
}

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

  // Try to get inputs from workflowDefinition first, then from YAML document
  let inputs = workflowDefinition?.inputs;
  if (!inputs) {
    try {
      const yamlJson = yamlDocument.toJSON();
      if (yamlJson && typeof yamlJson === 'object' && 'inputs' in yamlJson) {
        inputs = (yamlJson as Record<string, unknown>).inputs as WorkflowYaml['inputs'];
      }
    } catch (e) {
      // Ignore errors when extracting from YAML
    }
  }

  if (!inputs) {
    return errors;
  }

  // Normalize inputs to JSON Schema format
  const normalizedInputs = normalizeInputsToJsonSchema(inputs);
  if (!normalizedInputs?.properties) {
    return errors;
  }

  // Build a map of property paths to their schemas for quick lookup
  // This includes resolving $ref references
  const propertySchemas = new Map<string, { schema: JSONSchema7; fullPath: string[] }>();

  function buildPropertyMap(properties: Record<string, JSONSchema7>, path: string[] = []): void {
    for (const [propName, propSchema] of Object.entries(properties)) {
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
        buildPropertyMap(resolvedSchema.properties, fullPath);
      }
    }
  }

  buildPropertyMap(normalizedInputs.properties, ['inputs', 'properties']);

  // Also build a map for definitions (for $ref schemas)
  if (normalizedInputs.definitions || normalizedInputs.$defs) {
    const definitions = normalizedInputs.definitions || normalizedInputs.$defs || {};
    buildPropertyMap(definitions as Record<string, JSONSchema7>, ['inputs', 'definitions']);
  }

  // Visit all scalar nodes in the YAML document to find default values

  visit(yamlDocument, {
    Scalar(key, node, ancestors) {
      if (!node.range || !isPair(ancestors?.[ancestors.length - 1])) {
        return;
      }

      const pair = ancestors[ancestors.length - 1];
      if (!isScalar(pair.key) || pair.key.value !== 'default') {
        return;
      }

      // Check if this is the value of a default key (not the key itself)
      if (pair.value !== node) {
        return;
      }

      // Get the path to this default value
      const path = getPathFromAncestors(ancestors, node);

      // Check if this is within inputs.properties or inputs.definitions
      if (path.length < 4 || path[0] !== 'inputs') {
        return;
      }

      const isInProperties = path[1] === 'properties';
      const isInDefinitions = path[1] === 'definitions' || path[1] === '$defs';

      if (!isInProperties && !isInDefinitions) {
        return;
      }

      // Extract the property path
      // For properties: ['inputs', 'properties', 'email', 'default'] -> 'email'
      // For nested: ['inputs', 'properties', 'analyst', 'properties', 'name', 'default'] -> 'analyst.name'
      // For definitions: ['inputs', 'definitions', 'UserSchema', 'properties', 'email', 'default'] -> 'definitions.UserSchema.properties.email'
      let propertyKey: string;
      let propertyName: string;

      if (isInProperties) {
        // Remove 'inputs', 'properties', and 'default' from the path
        // Also remove intermediate 'properties' keys for nested objects
        // Path example: ['inputs', 'properties', 'analyst', 'properties', 'name', 'default']
        // After slice(2, -1): ['analyst', 'properties', 'name']
        // After filter: ['analyst', 'name']
        const propertyPath = path.slice(2, -1); // ['analyst', 'properties', 'name'] or ['email']

        // Filter out 'properties' keys (they're structural, not part of the property name)
        const filteredPath = propertyPath.filter((segment) => segment !== 'properties');
        // Match the key format used in buildPropertyMap: 'inputs.properties.analyst.name'
        propertyKey = filteredPath.length > 0 ? `inputs.properties.${filteredPath.join('.')}` : '';
        propertyName = filteredPath[filteredPath.length - 1] as string;
      } else {
        // For definitions, we need to find which property references this definition
        // The path is: ['inputs', 'definitions', 'UserSchema', 'properties', 'email', 'default']
        const definitionName = path[2];
        const propertyPath = path.slice(4, -1); // Remove 'inputs', 'definitions', definitionName, 'properties', and 'default'
        // Filter out 'properties' keys for nested objects in definitions
        const filteredPath = propertyPath.filter((segment) => segment !== 'properties');
        propertyKey = `inputs.definitions.${definitionName}.${filteredPath.join('.')}`;
        propertyName = filteredPath[filteredPath.length - 1] || definitionName;
      }

      let propertyInfo = propertySchemas.get(propertyKey);

      // If not found, try to find by matching the end of the path
      // This handles cases where the path extraction might be slightly off
      if (!propertyInfo && propertyKey.includes('.')) {
        const pathSegments = propertyKey.split('.');
        // Try matching from the end: 'analyst.email' -> 'inputs.properties.analyst.email'
        for (let i = pathSegments.length - 1; i >= 0; i--) {
          const candidateKey = pathSegments.slice(i).join('.');
          // Try with and without the 'inputs.properties' prefix
          const candidates = [`inputs.properties.${candidateKey}`, candidateKey];
          for (const candidate of candidates) {
            propertyInfo = propertySchemas.get(candidate);
            if (propertyInfo) {
              break;
            }
          }
          if (propertyInfo) {
            break;
          }
        }
      }

      // Last resort: search all map entries for a property that ends with the same segments
      // This handles edge cases where path extraction might be completely off
      if (!propertyInfo && filteredPath.length > 0) {
        const searchKey = filteredPath[filteredPath.length - 1]; // Last segment (e.g., 'email')
        for (const [mapKey, mapValue] of propertySchemas.entries()) {
          // Check if the key ends with the property name and has the right structure
          if (mapKey.endsWith(`.${searchKey}`) || mapKey === searchKey) {
            // Verify this is the right property by checking if the path segments match
            const keySegments = mapKey.split('.');
            if (keySegments.length >= filteredPath.length) {
              const keyEndSegments = keySegments.slice(-filteredPath.length);
              if (keyEndSegments.join('.') === filteredPath.join('.')) {
                propertyInfo = mapValue;
                break;
              }
            }
          }
        }
      }

      if (!propertyInfo) {
        return;
      }

      // Validate the default value against the property schema
      const zodSchema = convertJsonSchemaToZod(propertyInfo.schema);
      const result = zodSchema.safeParse(node.value);

      if (!result.success) {
        // Convert byte offsets to line/column
        // Use Monaco's model.getPositionAt if available for accurate conversion
        // Otherwise fall back to manual calculation
        const [startOffset, endOffset] = node.range;
        let startLine: number;
        let startCol: number;
        let endLine: number;
        let endCol: number;

        if (model) {
          // Use Monaco's built-in conversion for accuracy
          const startPos = model.getPositionAt(startOffset);
          const endPos = model.getPositionAt(endOffset);
          startLine = startPos.lineNumber;
          startCol = startPos.column;
          endLine = endPos.lineNumber;
          endCol = endPos.column;
        } else {
          // Fallback to manual calculation
          const text = yamlDocument.toString();
          let line = 1;
          let column = 1;
          startLine = 1;
          startCol = 1;
          endLine = 1;
          endCol = 1;

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
        }

        const errorMessage = result.error.issues.map((issue) => issue.message).join(', ');
        const schema = propertyInfo.schema;

        errors.push({
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
        });
      }
    },
  });

  return errors;
}
