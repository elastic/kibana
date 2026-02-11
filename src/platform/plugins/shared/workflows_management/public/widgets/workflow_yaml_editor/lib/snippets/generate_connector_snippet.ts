/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stringify, type ToStringOptions } from 'yaml';
import { isMac } from '@kbn/shared-ux-utility';
import type { ConnectorTypeInfo } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import { getZodTypeName } from '../../../../../common/lib/zod';
import { getConnectorInstancesForType } from '../autocomplete/suggestions/connector_id/get_connector_id_suggestions_items';
import { getCachedAllConnectors } from '../connectors_cache';
import { getRequiredParamsForConnector } from '../get_required_params_for_connector';

interface GenerateConnectorSnippetOptions {
  full?: boolean;
  withStepsSection?: boolean;
}

/**
 * Generates a YAML snippet for a workflow connector step based on the specified type.
 * @param connectorType - The type of connector to generate a snippet for
 * @param options - Configuration options for snippet generation
 * @param options.full - Whether to include the full YAML structure with step name and type prefix
 * @param options.withStepsSection - Whether to include the "steps:" section
 * @returns The formatted YAML connector snippet with required parameters as placeholders
 */
export function generateConnectorSnippet(
  connectorType: string,
  { full, withStepsSection }: GenerateConnectorSnippetOptions = {},
  dynamicConnectorTypes?: Record<string, ConnectorTypeInfo>
): string {
  const stringifyOptions: ToStringOptions = { indent: 2 };
  let parameters: Record<string, unknown>;

  const isConnectorIdRequired = getCachedAllConnectors(dynamicConnectorTypes).find(
    (c) => c.type === connectorType
  )?.connectorIdRequired;

  // Generate smart connector-id value based on available instances
  let connectorIdValue: string | undefined;
  if (isConnectorIdRequired) {
    const instances = getConnectorInstancesForType(connectorType, dynamicConnectorTypes);
    if (instances.length > 0) {
      // Use the first non-deprecated instance as default, or first instance if all are deprecated
      const defaultInstance = instances.find((i) => !i.isDeprecated) || instances[0];
      connectorIdValue = defaultInstance.id; // Use UUID
    } else {
      // No instances configured, add placeholder comment
      connectorIdValue = '# Enter connector UUID here';
    }
  }

  // Get required parameters for this connector type
  const requiredParams = getRequiredParamsForConnector(connectorType, dynamicConnectorTypes);

  if (requiredParams.length === 0) {
    // No required params, just add empty with block with a placeholder comment
    parameters = {
      'connector-id': connectorIdValue,
      with: {},
    };
    // We'll add the comment manually after YAML serialization
  } else {
    // Create with block with required parameters as placeholders
    const withParams: Record<string, unknown> = {};
    requiredParams.forEach((param) => {
      const placeholder = param.example || param.defaultValue || '';
      withParams[param.name] = placeholder;
    });
    parameters = { 'connector-id': connectorIdValue, with: withParams };
  }

  if (full) {
    // if the full snippet is requested, return the whole step node as a sequence item
    // - name: ${stepType}_step
    //   type: ${stepType}
    //   ...parameters

    const step = [
      {
        name: `${connectorType.replaceAll('.', '_')}_step`,
        type: connectorType,
        'connector-id': connectorIdValue,
        ...parameters,
      },
    ];

    let result: string;
    if (withStepsSection) {
      result = stringify({ steps: step }, stringifyOptions);
    } else {
      result = stringify(step, stringifyOptions);
    }

    // If there are no required params, add a comment inside the empty with block
    if (requiredParams.length === 0) {
      const shortcut = isMac ? '⌘+I' : 'Ctrl+Space';
      const comment = `# Add parameters here. Press ${shortcut} to see all available options`;
      // Replace the empty with block with comment and cursor positioned for parameters (2 spaces for step context)
      result = result.replace('with: {}', `with:\n  ${comment}\n  $0`);
    }

    return result;
  }

  // otherwise, the "type:" is already present, so we just return the type value and parameters
  // (type:)${stepType}
  // ...parameters
  const yamlString = stringify(parameters, stringifyOptions);

  // If there are no required params, add a comment inside the empty with block
  if (requiredParams.length === 0) {
    const shortcut = isMac ? '⌘+I' : 'Ctrl+Space';
    const comment = `# Add parameters here. Press ${shortcut} to see all available options`;
    // Replace the empty with block with one that has a comment (2 spaces for proper indentation)
    const withComment = yamlString.replace('with: {}', `with:\n  ${comment}\n  $0`);
    return `${connectorType}\n${withComment}`;
  }

  return `${connectorType}\n${yamlString}`;
}

/**
 * Check if a connector type requires a connector-id field
 */
export function connectorTypeRequiresConnectorId(
  connectorType: string,
  dynamicConnectorTypes?: Record<string, unknown>
): boolean {
  // Built-in step types don't need connector-id
  const builtInStepTypes = ['foreach', 'if', 'parallel', 'merge', 'http', 'wait'];
  if (builtInStepTypes.includes(connectorType)) {
    return false;
  }

  // elasticsearch.request and kibana.request don't need connector-id
  if (connectorType === 'elasticsearch.request' || connectorType === 'kibana.request') {
    return false;
  }

  // All other connector types require connector-id
  return true;
}

/**
 * Get enhanced type information for better completion suggestions
 */
export function getEnhancedTypeInfo(schema: z.ZodType): {
  type: string;
  isRequired: boolean;
  isOptional: boolean;
  description?: string;
  example?: string;
} {
  let currentSchema = schema;
  let isOptional = false;

  // Unwrap ZodOptional
  if (currentSchema instanceof z.ZodOptional) {
    isOptional = true;
    currentSchema = currentSchema.unwrap() as z.ZodType;
  }

  const baseType = getZodTypeName(currentSchema);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const description = (currentSchema as any)?._def?.description || '';

  // Extract example from description if available
  let example = '';
  const exampleMatch = description.match(
    /e\.g\.,?\s*['"]*([^'"]+)['"]*|example[:\s]+['"]*([^'"]+)['"]*/i
  );
  if (exampleMatch) {
    example = exampleMatch[1] || exampleMatch[2] || '';
  }

  // Enhanced type information based on schema type
  let enhancedType = baseType;
  if (currentSchema instanceof z.ZodArray) {
    const elementType = getZodTypeName(currentSchema.unwrap() as z.ZodType);
    enhancedType = `${elementType}[]`;
  } else if (currentSchema instanceof z.ZodUnion) {
    const options = currentSchema._def.options;
    const unionTypes = options.map((opt) => getZodTypeName(opt as z.ZodType)).join(' | ');
    enhancedType = unionTypes;
  } else if (currentSchema instanceof z.ZodEnum) {
    const values = currentSchema.options;
    enhancedType = `enum: ${values.slice(0, 3).join(' | ')}${values.length > 3 ? '...' : ''}`;
  } else if (currentSchema instanceof z.ZodLiteral) {
    enhancedType = `"${currentSchema.value}"`;
  }

  return {
    type: enhancedType,
    isRequired: !isOptional,
    isOptional,
    description: description || undefined,
    example: example || undefined,
  };
}
