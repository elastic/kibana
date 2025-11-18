/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TODO: Remove the eslint-disable comments to use the proper types.
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { JSONSchema7 } from 'json-schema';
import { useMemo } from 'react';
import { getJsonSchemaFromYamlSchema } from '@kbn/workflows';
import { getWorkflowZodSchema, getWorkflowZodSchemaLoose } from '../../../../common/schema';
import { useAvailableConnectors } from '../../../entities/connectors/model/use_available_connectors';

const WorkflowSchemaUriStrict = 'file:///workflow-schema.json';
const WorkflowSchemaUriStrictWithDynamicConnectors =
  'file:///workflow-schema-strict-with-dynamic-connectors.json';
const WorkflowSchemaUriLoose = 'file:///workflow-schema-loose.json';
const WorkflowSchemaUriLooseWithDynamicConnectors =
  'file:///workflow-schema-loose-with-dynamic-connectors.json';

interface UseWorkflowJsonSchemaOptions {
  /**
   * @deprecated use WorkflowSchemaForAutocomplete instead
   */
  loose?: boolean;
}

interface UseWorkflowJsonSchemaResult {
  jsonSchema: JSONSchema7 | null;
  uri: string | null;
}

export const useWorkflowJsonSchema = ({
  loose = false,
}: UseWorkflowJsonSchemaOptions = {}): UseWorkflowJsonSchemaResult => {
  const connectorsData = useAvailableConnectors();

  // TODO: download from server instead of generating on client

  // Generate JSON schema dynamically to include all current connectors (static + dynamic)
  // Now uses lazy loading to keep large generated files out of main bundle
  return useMemo(() => {
    try {
      let uri = loose ? WorkflowSchemaUriLoose : WorkflowSchemaUriStrict;
      if (connectorsData?.connectorTypes) {
        uri = loose
          ? WorkflowSchemaUriLooseWithDynamicConnectors
          : WorkflowSchemaUriStrictWithDynamicConnectors;
      }

      const zodSchema = loose
        ? getWorkflowZodSchemaLoose(connectorsData?.connectorTypes ?? {})
        : getWorkflowZodSchema(connectorsData?.connectorTypes ?? {}); // TODO: remove this once we move the schema generation up to detail page or some wrapper component
      const jsonSchema = getJsonSchemaFromYamlSchema(zodSchema);

      // Debug: Log schema generation (only in development)
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('[Workflow Schema] Schema generated, checking version field...', {
          uri,
          hasDefinitions: !!jsonSchema?.definitions,
          hasWorkflowSchema: !!jsonSchema?.definitions?.WorkflowSchema,
          requiredBeforeFix: jsonSchema?.definitions?.WorkflowSchema?.required || [],
        });
      }

      // Post-process to improve validation messages and add display names for connectors
      const processedSchema = improveTypeFieldDescriptions(jsonSchema, connectorsData);

      // Ensure inputs schema doesn't have array format (fix after all post-processing)
      ensureInputsSchemaIsObjectFormat(processedSchema);

      // Ensure steps schema is always an array type (fix after all post-processing)
      ensureStepsSchemaIsArrayFormat(processedSchema);

      // CRITICAL: Ensure version field is optional AFTER all other processing
      // This must be done after improveTypeFieldDescriptions which might modify the schema
      ensureVersionIsOptional(processedSchema);

      // Deep clone the schema to ensure React sees it as a new object
      // This forces Monaco to re-register the schema when it changes
      const clonedSchema = JSON.parse(JSON.stringify(processedSchema));

      // Double-check that version is not in required after cloning (safety net)
      ensureVersionIsOptional(clonedSchema);

      // Final verification: ensure version is definitely not in required
      // This is a last-ditch effort to catch any edge cases
      const workflowSchemaFinal = clonedSchema?.definitions?.WorkflowSchema;
      if (workflowSchemaFinal?.required && Array.isArray(workflowSchemaFinal.required)) {
        const hasVersion = workflowSchemaFinal.required.includes('version');
        if (hasVersion) {
          // This should never happen, but if it does, remove it
          workflowSchemaFinal.required = workflowSchemaFinal.required.filter(
            (field: string) => field !== 'version'
          );
          if (workflowSchemaFinal.required.length === 0) {
            delete workflowSchemaFinal.required;
          }
          // eslint-disable-next-line no-console
          console.warn('[Workflow Schema] Removed version from required array (should not happen)');
        }
      }

      // Debug: Verify version is not in required (only in development)
      if (process.env.NODE_ENV === 'development') {
        const finalRequired = workflowSchemaFinal?.required || [];
        // eslint-disable-next-line no-console
        console.log('[Workflow Schema] Final schema check:', {
          uri,
          requiredFields: finalRequired,
          hasVersion: finalRequired.includes('version'),
          hasVersionProperty: !!workflowSchemaFinal?.properties?.version,
          versionSchemaType: workflowSchemaFinal?.properties?.version?.type,
          versionSchemaAnyOf: !!workflowSchemaFinal?.properties?.version?.anyOf,
          allProperties: Object.keys(workflowSchemaFinal?.properties || {}),
          schemaHasRef: !!clonedSchema?.$ref,
          refTarget: clonedSchema?.$ref,
        });
        if (finalRequired.includes('version')) {
          // eslint-disable-next-line no-console
          console.error('[Workflow Schema] ERROR: version is still in required array!', {
            required: finalRequired,
            hasVersionProperty: !!workflowSchemaFinal?.properties?.version,
            schemaStructure: JSON.stringify(workflowSchemaFinal, null, 2).substring(0, 500),
          });
        }
      }

      // Debug: Log the actual schema structure being passed to Monaco (only in development)
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('[Workflow Schema] Schema being passed to Monaco:', {
          uri,
          hasRef: !!clonedSchema?.$ref,
          refTarget: clonedSchema?.$ref,
          hasDefinitions: !!clonedSchema?.definitions,
          workflowSchemaRequired: clonedSchema?.definitions?.WorkflowSchema?.required || [],
          workflowSchemaProperties: Object.keys(
            clonedSchema?.definitions?.WorkflowSchema?.properties || {}
          ),
          fullSchemaStructure: JSON.stringify(clonedSchema, null, 2).substring(0, 1000),
        });
      }

      // Return the schema with the original URI (no query parameters)
      // The schema is provided inline, so Monaco doesn't need to fetch it
      // The deep clone ensures React detects changes and updates Monaco
      return {
        jsonSchema: clonedSchema ?? null,
        uri,
      };
    } catch (error) {
      // console.error('🚨 Schema generation failed:', error);
      return {
        jsonSchema: null,
        uri: null,
      };
    }
  }, [connectorsData, loose]);
};

/**
 * Enhance the JSON schema to show display names for connector types
 * This improves the Monaco YAML autocompletion experience
 */
function improveTypeFieldDescriptions(schema: any, connectorsData?: any): any {
  if (!schema || !connectorsData?.connectorTypes) {
    return schema;
  }

  // Create a mapping from actionTypeId to display name
  const typeToDisplayName: Record<string, string> = {};
  Object.values(connectorsData.connectorTypes).forEach((connector: any) => {
    typeToDisplayName[connector.actionTypeId] = connector.displayName;
  });

  // Recursively enhance the schema to add titles for connector types
  function enhanceSchema(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(enhanceSchema);
    }

    const enhanced = { ...obj };

    // Look for discriminated union schemas with connector types
    if (enhanced.anyOf || enhanced.oneOf) {
      const unionArray = enhanced.anyOf || enhanced.oneOf;
      const enhancedUnion = unionArray.map((item: any) => {
        if (item.properties?.type?.const && typeToDisplayName[item.properties.type.const]) {
          return {
            ...item,
            title: typeToDisplayName[item.properties.type.const],
            properties: {
              ...item.properties,
              type: {
                ...item.properties.type,
                title: typeToDisplayName[item.properties.type.const],
                description: `${typeToDisplayName[item.properties.type.const]} connector`,
              },
            },
          };
        }
        return enhanceSchema(item);
      });

      if (enhanced.anyOf) {
        enhanced.anyOf = enhancedUnion;
      } else {
        enhanced.oneOf = enhancedUnion;
      }
    }

    // Recursively enhance nested objects
    Object.keys(enhanced).forEach((key) => {
      if (key !== 'anyOf' && key !== 'oneOf') {
        enhanced[key] = enhanceSchema(enhanced[key]);
      }
    });

    return enhanced;
  }

  return enhanceSchema(schema);
}

/**
 * Ensure the inputs schema properly handles both array and object formats
 * This ensures backward compatibility - we keep both formats in the schema
 * so Monaco accepts both, while the Zod schema transforms array to object
 */
function ensureInputsSchemaIsObjectFormat(schema: any): void {
  if (!schema?.definitions?.WorkflowSchema?.properties?.inputs) {
    return;
  }

  const inputsSchema = schema.definitions.WorkflowSchema.properties.inputs;

  // We need to keep both array and object formats for backward compatibility
  // The Zod schema will transform array to object during parsing
  // But Monaco needs to accept both formats during validation

  // If inputs has anyOf, ensure both formats are properly represented
  if (inputsSchema.anyOf && Array.isArray(inputsSchema.anyOf)) {
    // Fix object schemas to have proper structure

    inputsSchema.anyOf.forEach((subSchema: any) => {
      // Keep array schemas (legacy format) - don't filter them out!
      // Only fix object schemas to ensure proper structure
      if (subSchema?.type === 'object' && subSchema?.properties?.properties?.type === 'array') {
        subSchema.properties.properties.type = 'object';
        if (!subSchema.properties.properties.additionalProperties) {
          subSchema.properties.properties.additionalProperties = true;
        }
      }
    });
  } else {
    // Not wrapped in anyOf, check directly
    if (inputsSchema.properties?.properties?.type === 'array') {
      inputsSchema.properties.properties.type = 'object';
      if (!inputsSchema.properties.properties.additionalProperties) {
        inputsSchema.properties.properties.additionalProperties = true;
      }
    }
  }
}

/**
 * Ensure the version field is optional in the Monaco schema
 * This allows workflows without an explicit version field (backward compatibility)
 * This function is called multiple times as a safety net to ensure version is always optional
 */
function ensureVersionIsOptional(schema: any): void {
  if (!schema || typeof schema !== 'object') {
    return;
  }

  // Check both definitions.WorkflowSchema and direct properties (in case schema structure varies)
  const workflowSchema = schema?.definitions?.WorkflowSchema || schema;
  if (!workflowSchema || typeof workflowSchema !== 'object') {
    return;
  }

  // CRITICAL: Handle allOf structure (zod-to-json-schema creates allOf for piped schemas)
  // The properties and required fields are inside allOf[0], not directly in workflowSchema
  if (workflowSchema.allOf && Array.isArray(workflowSchema.allOf)) {
    // Process each item in allOf array
    workflowSchema.allOf.forEach((allOfItem: any) => {
      if (!allOfItem || typeof allOfItem !== 'object') {
        return;
      }

      // Remove version from required array in allOf item
      if (allOfItem.required && Array.isArray(allOfItem.required)) {
        const originalLength = allOfItem.required.length;
        allOfItem.required = allOfItem.required.filter((field: string) => field !== 'version');
        // If we removed version, ensure the array is still valid (or delete if empty)
        if (allOfItem.required.length === 0 && originalLength > 0) {
          delete allOfItem.required;
        }
      }

      // Make version property optional in allOf item
      const versionSchema = allOfItem.properties?.version;
      if (versionSchema && typeof versionSchema === 'object') {
        // If version is not wrapped in anyOf, wrap it to make it optional
        if (!versionSchema.anyOf || !Array.isArray(versionSchema.anyOf)) {
          const originalSchema = { ...versionSchema };
          versionSchema.anyOf = [originalSchema, { type: 'undefined' }];
          // Remove the direct properties since we're using anyOf now
          delete versionSchema.type;
          delete versionSchema.const;
          delete versionSchema.default;
        } else {
          // If already wrapped in anyOf, ensure undefined option exists
          const hasUndefinedOption = versionSchema.anyOf.some(
            (subSchema: any) =>
              subSchema &&
              typeof subSchema === 'object' &&
              (subSchema.type === 'null' || subSchema.type === 'undefined')
          );
          if (!hasUndefinedOption) {
            versionSchema.anyOf.push({ type: 'undefined' });
          }
        }
      }
    });
  } else {
    // Fallback: Handle direct properties structure (if allOf doesn't exist)
    // CRITICAL: Always ensure version is not in the required array
    // This is the most important fix - if version is in required, Monaco will show the error
    if (workflowSchema.required && Array.isArray(workflowSchema.required)) {
      const originalLength = workflowSchema.required.length;
      workflowSchema.required = workflowSchema.required.filter(
        (field: string) => field !== 'version'
      );
      // If we removed version, ensure the array is still valid (or delete if empty)
      if (workflowSchema.required.length === 0 && originalLength > 0) {
        delete workflowSchema.required;
      }
    }

    // If version property exists, make it optional
    const versionSchema = workflowSchema.properties?.version;
    if (versionSchema && typeof versionSchema === 'object') {
      // If version is wrapped in anyOf (for optional), ensure it's truly optional
      if (versionSchema.anyOf && Array.isArray(versionSchema.anyOf)) {
        // Check if there's already a null/undefined option
        const hasNullOption = versionSchema.anyOf.some(
          (subSchema: any) =>
            subSchema &&
            typeof subSchema === 'object' &&
            (subSchema.type === 'null' || subSchema.type === 'undefined')
        );

        // If not, add undefined option to make it truly optional
        if (!hasNullOption) {
          versionSchema.anyOf.push({ type: 'undefined' });
        }
      } else {
        // If version is not wrapped in anyOf, wrap it to make it optional
        // Keep the original schema and add undefined option
        const originalSchema = { ...versionSchema };
        versionSchema.anyOf = [originalSchema, { type: 'undefined' }];
        // Remove the direct properties since we're using anyOf now
        delete versionSchema.type;
        delete versionSchema.const;
        delete versionSchema.default;
      }
    }
  }
}

/**
 * Ensure the steps schema is always an array type for Monaco editor
 * This is a safety net that runs after all other post-processing
 * to ensure steps schema is correctly recognized as an array type
 */
function ensureStepsSchemaIsArrayFormat(schema: any): void {
  if (!schema?.definitions?.WorkflowSchema?.properties?.steps) {
    return;
  }

  const stepsSchema = schema.definitions.WorkflowSchema.properties.steps;

  // Helper to fix a single steps schema object

  const fixStepsSchemaObject = (schemaObj: any): void => {
    if (!schemaObj || typeof schemaObj !== 'object') {
      return;
    }

    // Ensure it's an array type
    if (schemaObj.type && schemaObj.type !== 'array') {
      schemaObj.type = 'array';
    }

    // Ensure items exists and is an object (not an array)
    // The items should be the step schema (an object), not an array
    if (schemaObj.type === 'array') {
      if (!schemaObj.items) {
        schemaObj.items = { type: 'object' };
      } else if (Array.isArray(schemaObj.items)) {
        // If items is an array, convert it to an object (shouldn't happen, but fix it)
        schemaObj.items = { type: 'object' };
      } else if (schemaObj.items.type === 'array') {
        // If items.type is array, that's wrong - items should be the step object schema
        schemaObj.items.type = 'object';
      }
    }
  };

  // If steps is wrapped in anyOf (due to being optional), ensure the non-null schema is an array
  if (stepsSchema.anyOf && Array.isArray(stepsSchema.anyOf)) {
    stepsSchema.anyOf.forEach((subSchema: any) => {
      if (subSchema && subSchema.type !== 'null' && subSchema.type !== 'undefined') {
        fixStepsSchemaObject(subSchema);
      }
    });
  } else {
    // Not wrapped in anyOf, fix directly
    fixStepsSchemaObject(stepsSchema);
  }
}
