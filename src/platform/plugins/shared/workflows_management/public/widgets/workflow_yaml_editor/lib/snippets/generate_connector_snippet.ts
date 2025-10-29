/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stringify, type ToStringOptions } from 'yaml';
import { monaco } from '@kbn/monaco';
import { z } from '@kbn/zod';
import type { ConnectorTypeInfo } from '@kbn/workflows';
import { isMac } from '../../../../shared/utils/is_mac';
import { getRequiredParamsForConnector } from '../get_required_params_for_connector';
import { getCachedAllConnectors } from '../connectors_cache';
import { getIndentLevel } from '../get_indent_level';
import { getZodTypeName } from '../../../../../common/lib/zod';

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
  let parameters: Record<string, any>;

  const isConnectorIdRequired = getCachedAllConnectors().find(
    (c) => c.type === connectorType
  )?.connectorIdRequired;

  // Generate smart connector-id value based on available instances
  let connectorIdValue: string | undefined;
  if (isConnectorIdRequired) {
    const instances = getConnectorInstancesForType(connectorType, dynamicConnectorTypes);
    if (instances.length > 0) {
      // Use the first non-deprecated instance as default, or first instance if all are deprecated
      const defaultInstance = instances.find((i) => !i.isDeprecated) || instances[0];
      connectorIdValue = defaultInstance.name;
    } else {
      // No instances configured, add placeholder comment
      connectorIdValue = '# Enter connector ID here';
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
    parameters = {
      'connector-id': connectorIdValue,
      with: {},
    };
    requiredParams.forEach((param) => {
      const placeholder = param.example || param.defaultValue || '';
      parameters.with[param.name] = placeholder;
    });
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
      const shortcut = isMac() ? '⌘+I' : 'Ctrl+Space';
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
    const shortcut = isMac() ? '⌘+I' : 'Ctrl+Space';
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
  dynamicConnectorTypes?: Record<string, any>
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
 * Get connector instances for a specific connector type
 */
export function getConnectorInstancesForType(
  connectorType: string,
  dynamicConnectorTypes?: Record<string, any>
): Array<{
  id: string;
  name: string;
  isPreconfigured: boolean;
  isDeprecated: boolean;
}> {
  if (!dynamicConnectorTypes) {
    return [];
  }

  // For sub-action connectors (e.g., "inference.completion"), get the base type
  const baseConnectorType = connectorType.includes('.')
    ? connectorType.split('.')[0]
    : connectorType;

  // Try multiple lookup strategies to find the connector type
  const lookupCandidates = [
    connectorType, // Direct match (e.g., "slack")
    `.${connectorType}`, // With dot prefix (e.g., ".slack")
    baseConnectorType, // Base type for sub-actions (e.g., "inference" from "inference.completion")
    `.${baseConnectorType}`, // Base type with dot prefix (e.g., ".inference")
  ];

  for (const candidate of lookupCandidates) {
    const connectorTypeInfo = dynamicConnectorTypes[candidate];

    if (connectorTypeInfo?.instances?.length > 0) {
      return connectorTypeInfo.instances;
    }
  }

  return [];
}

/**
 * Generate connector-id suggestions for a specific connector type
 */
export function getConnectorIdSuggestions(
  connectorType: string,
  range: monaco.IRange,
  dynamicConnectorTypes?: Record<string, any>
): monaco.languages.CompletionItem[] {
  const suggestions: monaco.languages.CompletionItem[] = [];

  const instances = getConnectorInstancesForType(connectorType, dynamicConnectorTypes);

  instances.forEach((instance) => {
    let connectorName = instance.name;

    // Add status indicators to connector name
    if (instance.isDeprecated) {
      connectorName += ' (deprecated)';
    }
    if (instance.isPreconfigured) {
      connectorName += ' (preconfigured)';
    }

    // Create a label that shows both ID and name for better visibility
    const displayLabel = `${connectorName} • ${instance.id}`;

    suggestions.push({
      label: displayLabel, // Show both connector ID and name
      kind: monaco.languages.CompletionItemKind.Value, // Use generic value kind
      insertText: instance.name,
      range,
      detail: connectorType, // Show connector type as detail - this is what CSS targets
      documentation: `Connector ID: ${instance.id}\nName: ${
        instance.name
      }\nType: ${connectorType}\nStatus: ${instance.isDeprecated ? 'Deprecated' : 'Active'}${
        instance.isPreconfigured ? ', Preconfigured' : ''
      }`,
      sortText: `${instance.isDeprecated ? 'z' : 'a'}_${instance.name}`, // Sort deprecated items last
      preselect: !instance.isDeprecated, // Don't preselect deprecated connectors
      // Add custom attributes for better CSS targeting
      filterText: `${instance.id} ${connectorName} ${connectorType}`, // Enhanced filter text for better targeting
    });
  });

  // If no instances are configured, still allow manual input
  if (instances.length === 0) {
    suggestions.push({
      label: 'Enter connector ID manually',
      kind: monaco.languages.CompletionItemKind.Text,
      insertText: '',
      range,
      detail: 'No configured instances found',
      documentation: `No instances of ${connectorType} are currently configured. You can enter a connector ID manually.`,
      sortText: 'z_manual',
    });
  }

  return suggestions;
}

/**
 * Detect if the current cursor position is inside a connector's 'with' block
 * and return the connector type
 */
/**
 * Enhanced function to detect connector type from context, including when path is empty
 */
export function getConnectorTypeFromContext(
  yamlDocument: any,
  path: any[],
  model: any,
  position: any
): string | null {
  try {
    // SPECIAL CASE: If we're directly on a connector-id field, get the step's type
    if (path.length >= 3 && path[0] === 'steps' && path[2] === 'connector-id') {
      const stepPath = [path[0], path[1]]; // ["steps", stepIndex]
      const stepNode = yamlDocument.getIn(stepPath, true) as any;

      if (stepNode && stepNode.has && typeof stepNode.has === 'function' && stepNode.has('type')) {
        const typeNode = stepNode.get('type', true) as any;
        if (typeNode && typeNode.value) {
          const connectorType = typeNode.value;
          return connectorType;
        }
      }
    }

    // ADDITIONAL CASE: If we're in a step context but not in a 'with' block, also try to get the step's type
    // This handles cases like shadow text where we need the connector type from any field in the step
    if (
      path.length >= 2 &&
      path[0] === 'steps' &&
      typeof path[1] === 'number' &&
      !path.includes('with')
    ) {
      const stepPath = [path[0], path[1]]; // ["steps", stepIndex]
      const stepNode = yamlDocument.getIn(stepPath, true) as any;

      if (stepNode && stepNode.has && typeof stepNode.has === 'function' && stepNode.has('type')) {
        const typeNode = stepNode.get('type', true) as any;
        if (typeNode && typeNode.value) {
          const connectorType = typeNode.value;
          return connectorType;
        }
      }
    }

    // First try the existing path-based detection
    const pathBasedType = getConnectorTypeFromWithBlock(yamlDocument, path);
    if (pathBasedType) {
      return pathBasedType;
    }

    // If path is empty or detection failed, try position-based detection
    // This handles cases where cursor is right after "with:"
    if (path.length === 0 || !path.includes('with')) {
      const positionBasedType = getConnectorTypeFromPosition(model, position);
      return positionBasedType;
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Detect connector type by analyzing YAML structure around the cursor position using Monaco
 */
function getConnectorTypeFromPosition(model: any, position: any): string | null {
  try {
    const currentLineNumber = position.lineNumber;
    // Position analysis

    // Check if we're inside a "with" block by analyzing indentation and structure
    const isInWithBlock = detectIfInWithBlock(model, currentLineNumber);

    if (isInWithBlock) {
      // Detected cursor is inside a "with" block

      // Look backwards to find the type field for this step
      const connectorType = findConnectorTypeInStep(model, currentLineNumber);
      if (connectorType) {
        return connectorType;
      }
    }

    // No connector type found via position analysis
    return null;
  } catch (error) {
    // Error in getConnectorTypeFromPosition
    return null;
  }
}

/**
 * Detect if the current line is inside a "with" block by analyzing YAML structure
 */
function detectIfInWithBlock(model: any, currentLineNumber: number): boolean {
  const currentLine = model.getLineContent(currentLineNumber);
  const currentIndent = getIndentLevel(currentLine);

  // Detecting if in with block

  // Special handling for comment lines - they should be treated as if they're at the same level as parameters

  // Look backwards to find a "with:" line
  for (let lineNumber = currentLineNumber; lineNumber >= 1; lineNumber--) {
    const line = model.getLineContent(lineNumber);
    const lineIndent = getIndentLevel(line);

    // Checking line

    // Found a "with:" line
    if (line.trim() === 'with:' || line.trim().endsWith('with:')) {
      // Found "with:" at line

      // We're in the with block if:
      // 1. The with: line has LESS indentation than current line (we're inside the block)
      // 2. OR if we're on the with: line itself
      // 3. OR if current line is a comment and has reasonable indentation relative to with:
      if (lineIndent < currentIndent) {
        // We are INSIDE with block
        return true;
      } else if (lineNumber === currentLineNumber) {
        // We are ON the with: line itself
        return true;
      } else if (currentLine.trim().startsWith('#') && currentIndent > lineIndent) {
        // Current line is a comment with more indentation than with: - likely inside the block
        return true;
      } else {
        // with: line has same/more indentation, we are NOT inside this with block
        return false;
      }
    }

    // Stop if we hit a step boundary (this ensures we don't go into other steps)
    if (line.match(/^\s*-\s+name:/) || line.match(/^\s*steps:/)) {
      // Hit step/structural boundary
      break;
    }

    // Stop if we encounter a line with significantly less indentation (other major structure)
    // But be more lenient with comment lines
    if (
      lineIndent < currentIndent &&
      line.trim() !== '' &&
      !line.includes('with:') &&
      !currentLine.trim().startsWith('#')
    ) {
      // Hit major structure boundary
      break;
    }
  }

  // Not inside any with block
  return false;
}

/**
 * Find the connector type by looking for the "type:" field in the current step
 */
function findConnectorTypeInStep(model: any, currentLineNumber: number): string | null {
  // Look backwards for the type field, staying within the same step
  for (let lineNumber = currentLineNumber - 1; lineNumber >= 1; lineNumber--) {
    const line = model.getLineContent(lineNumber);

    // Look for type field at the step level (same indentation as name field)
    const typeMatch = line.match(/^\s*type:\s*(.+)$/);
    if (typeMatch) {
      const connectorType = typeMatch[1].trim().replace(/['"]/g, '');
      // Found connector type
      return connectorType;
    }

    // Stop if we hit another step or the steps boundary
    if (line.match(/^\s*-\s+name:/) || line.match(/^\s*steps:/)) {
      // Hit step boundary, stopping type search
      break;
    }
  }

  return null;
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
    currentSchema = currentSchema._def.innerType;
  }

  const baseType = getZodTypeName(currentSchema);
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
    const elementType = getZodTypeName(currentSchema._def.type);
    enhancedType = `${elementType}[]`;
  } else if (currentSchema instanceof z.ZodUnion) {
    const options = currentSchema._def.options;
    const unionTypes = options.map((opt: z.ZodType) => getZodTypeName(opt)).join(' | ');
    enhancedType = unionTypes;
  } else if (currentSchema instanceof z.ZodEnum) {
    const values = currentSchema._def.values;
    enhancedType = `enum: ${values.slice(0, 3).join(' | ')}${values.length > 3 ? '...' : ''}`;
  } else if (currentSchema instanceof z.ZodLiteral) {
    enhancedType = `"${currentSchema._def.value}"`;
  }

  return {
    type: enhancedType,
    isRequired: !isOptional,
    isOptional,
    description: description || undefined,
    example: example || undefined,
  };
}

/**
 * Get existing parameters in the current with block to avoid suggesting duplicates
 */
export function getExistingParametersInWithBlock(model: any, position: any): Set<string> {
  const existingParams = new Set<string>();
  const currentLineNumber = position.lineNumber;
  const currentLine = model.getLineContent(currentLineNumber);
  const currentIndent = getIndentLevel(currentLine);

  // Finding existing parameters in with block

  // First, find the start of the with block
  let withLineNumber = -1;
  let withIndent = -1;

  for (let lineNumber = currentLineNumber; lineNumber >= 1; lineNumber--) {
    const line = model.getLineContent(lineNumber);
    const lineIndent = getIndentLevel(line);

    if (line.trim() === 'with:' || line.trim().endsWith('with:')) {
      // Make sure this with: is at a level that makes sense for our current position
      if (
        lineIndent < currentIndent ||
        (lineIndent === currentIndent && lineNumber < currentLineNumber)
      ) {
        withLineNumber = lineNumber;
        withIndent = lineIndent;
        // Found with block start
        break;
      }
    }

    // Stop if we hit a step boundary
    if (line.match(/^\s*-\s+name:/) || line.match(/^\s*steps:/)) {
      break;
    }
  }

  if (withLineNumber === -1) {
    // No with block found
    return existingParams;
  }

  // Now scan from the with line forward to collect existing parameters
  // Be more flexible with indentation - parameters should be indented MORE than with:

  for (let lineNumber = withLineNumber + 1; lineNumber <= model.getLineCount(); lineNumber++) {
    const line = model.getLineContent(lineNumber);
    const lineIndent = getIndentLevel(line);

    // Stop if we've gone past the with block (less or equal indentation to with:)
    if (line.trim() !== '' && lineIndent <= withIndent) {
      // Exited with block due to indentation
      break;
    }

    // Look for parameters at any indentation level greater than with:
    // This handles both 2-space and 4-space indentation styles
    if (lineIndent > withIndent && line.trim() !== '') {
      // More flexible regex that handles various parameter name formats
      const paramMatch = line.match(/^\s*([a-zA-Z_][a-zA-Z0-9_-]*)\s*:/);
      if (paramMatch) {
        const paramName = paramMatch[1];
        existingParams.add(paramName);
        // console.log(`Found existing parameter: ${paramName} at line ${lineNumber}`);
      }
    }

    // Stop if we hit another step
    if (line.match(/^\s*-\s+name:/)) {
      // Hit next step
      break;
    }
  }

  // console.log('Existing parameters found:', Array.from(existingParams));
  return existingParams;
}

function getConnectorTypeFromWithBlock(yamlDocument: any, path: any[]): string | null {
  try {
    // Getting connector type from with block

    // Look for a pattern like: steps[n].with.<param>
    // We need to find the step containing this 'with' block and get its 'type'

    if (path.length < 2) {
      // Path too short, returning null
      return null;
    }

    // Check if we're in a path that includes 'with'
    const withIndex = path.findIndex((segment) => segment === 'with');
    // Finding with index in path

    // Also handle case where we're directly in a with block (path ends with 'with')
    const isInWithBlock = withIndex !== -1 || path[path.length - 1] === 'with';

    if (!isInWithBlock) {
      // No "with" in path, returning null
      return null;
    }

    // Get the step path (should be something like ['steps', stepIndex])
    let stepPath: any[];
    if (withIndex !== -1) {
      stepPath = path.slice(0, withIndex);
    } else {
      // We're directly in the with block, so step path is everything except 'with'
      stepPath = path.slice(0, -1);
    }

    // Step path determined

    if (stepPath.length < 2 || stepPath[0] !== 'steps') {
      // Invalid step path, returning null
      return null;
    }

    // Get the step node to find its type
    const stepNode = yamlDocument.getIn(stepPath, true);
    // Getting step node
    if (!stepNode || !stepNode.has || typeof stepNode.has !== 'function') {
      // Invalid step node, returning null
      return null;
    }

    const typeNode = stepNode.has('type') ? stepNode.get('type', true) : null;
    // Getting type node
    if (!typeNode || !typeNode.value) {
      // No type value, returning null
      return null;
    }

    const connectorType = typeNode.value;
    // Detected connector type in with block
    return connectorType;
  } catch (error) {
    // Error detecting connector type from with block
    return null;
  }
}
