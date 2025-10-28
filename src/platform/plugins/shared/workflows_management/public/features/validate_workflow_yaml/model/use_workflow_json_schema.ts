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
  loose: boolean;
}

interface UseWorkflowJsonSchemaResult {
  jsonSchema: JSONSchema7 | null;
  uri: string | null;
}

export const useWorkflowJsonSchema = (
  options: UseWorkflowJsonSchemaOptions
): UseWorkflowJsonSchemaResult => {
  const connectorsData = useAvailableConnectors();

  // TODO: download from server instead of generating on client

  // Generate JSON schema dynamically to include all current connectors (static + dynamic)
  // Now uses lazy loading to keep large generated files out of main bundle
  return useMemo(() => {
    try {
      let uri = options.loose ? WorkflowSchemaUriLoose : WorkflowSchemaUriStrict;
      if (connectorsData?.connectorTypes) {
        uri = options.loose
          ? WorkflowSchemaUriLooseWithDynamicConnectors
          : WorkflowSchemaUriStrictWithDynamicConnectors;
      }
      const zodSchema = options.loose
        ? getWorkflowZodSchemaLoose(connectorsData?.connectorTypes ?? {})
        : getWorkflowZodSchema(connectorsData?.connectorTypes ?? {}); // TODO: remove this once we move the schema generation up to detail page or some wrapper component
      const jsonSchema = getJsonSchemaFromYamlSchema(zodSchema);

      // Post-process to improve validation messages and add display names for connectors
      const processedSchema = improveTypeFieldDescriptions(jsonSchema, connectorsData);

      return {
        jsonSchema: processedSchema ?? null,
        uri,
      };
    } catch (error) {
      // console.error('🚨 Schema generation failed:', error);
      return {
        jsonSchema: null,
        uri: null,
      };
    }
  }, [connectorsData, options.loose]);
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
