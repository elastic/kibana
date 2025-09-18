/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Scalar } from 'yaml';
import { YAMLParseError, isScalar, parseDocument } from 'yaml';
import { monaco } from '@kbn/monaco';
import { z } from '@kbn/zod';
import {
  ForEachStepSchema,
  IfStepSchema,
  ParallelStepSchema,
  MergeStepSchema,
  HttpStepSchema,
  WaitStepSchema,
  AlertRuleTriggerSchema,
  ScheduledTriggerSchema,
  ManualTriggerSchema,
} from '@kbn/workflows';
import { getWorkflowGraph } from '../../../entities/workflows/lib/get_workflow_graph';
import { getCurrentPath, parseWorkflowYamlToJSON } from '../../../../common/lib/yaml_utils';
import { getContextSchemaForPath } from '../../../features/workflow_context/lib/get_context_for_path';
import {
  getAllConnectors,
  getAllConnectorsWithDynamic,
  getCachedDynamicConnectorTypes,
} from '../../../../common/schema';
import {
  VARIABLE_REGEX_GLOBAL,
  PROPERTY_PATH_REGEX,
  UNFINISHED_VARIABLE_REGEX_GLOBAL,
} from '../../../../common/lib/regex';
import { getSchemaAtPath, getZodTypeName, parsePath } from '../../../../common/lib/zod_utils';

// Use the provided dynamic connectors or fall back to global cache
function getCachedAllConnectors(dynamicConnectorTypes?: Record<string, any>): any[] {
  if (dynamicConnectorTypes) {
    // Use the same function that generates the schema to ensure consistency
    return getAllConnectorsWithDynamic(dynamicConnectorTypes);
  }
  return getAllConnectors();
}

// Cache for built-in step types extracted from schema
let builtInStepTypesCache: Array<{
  type: string;
  description: string;
  icon: monaco.languages.CompletionItemKind;
}> | null = null;

/**
 * Extract built-in step types from the workflow schema (single source of truth)
 */
function getBuiltInStepTypesFromSchema(): Array<{
  type: string;
  description: string;
  icon: monaco.languages.CompletionItemKind;
}> {
  if (builtInStepTypesCache !== null) {
    return builtInStepTypesCache;
  }

  // Extract step types from the actual schema definitions
  // This ensures we get all step types defined in the schema automatically
  const stepSchemas = [
    {
      schema: ForEachStepSchema,
      description: 'Execute steps for each item in a collection',
      icon: monaco.languages.CompletionItemKind.Method,
    },
    {
      schema: IfStepSchema,
      description: 'Execute steps conditionally based on a condition',
      icon: monaco.languages.CompletionItemKind.Keyword,
    },
    {
      schema: ParallelStepSchema,
      description: 'Execute multiple branches in parallel',
      icon: monaco.languages.CompletionItemKind.Class,
    },
    {
      schema: MergeStepSchema,
      description: 'Merge results from multiple sources',
      icon: monaco.languages.CompletionItemKind.Interface,
    },
    {
      schema: HttpStepSchema,
      description: 'Make HTTP requests',
      icon: monaco.languages.CompletionItemKind.Reference,
    },
    {
      schema: WaitStepSchema,
      description: 'Wait for a specified duration',
      icon: monaco.languages.CompletionItemKind.Constant,
    },
  ];

  const stepTypes = stepSchemas.map(({ schema, description, icon }) => {
    // Extract the literal type value from the Zod schema
    const typeField = schema.shape.type;
    const stepType = typeField._def.value; // Get the literal value from z.literal()

    return {
      type: stepType,
      description,
      icon,
    };
  });

  builtInStepTypesCache = stepTypes;
  return stepTypes;
}

// Cache for built-in trigger types extracted from schema
let builtInTriggerTypesCache: Array<{
  type: string;
  description: string;
  icon: monaco.languages.CompletionItemKind;
}> | null = null;

/**
 * Extract built-in trigger types from the workflow schema (single source of truth)
 */
function getBuiltInTriggerTypesFromSchema(): Array<{
  type: string;
  description: string;
  icon: monaco.languages.CompletionItemKind;
}> {
  if (builtInTriggerTypesCache !== null) {
    return builtInTriggerTypesCache;
  }

  // Extract trigger types from the actual schema definitions
  const triggerSchemas = [
    {
      schema: AlertRuleTriggerSchema,
      description: 'Trigger workflow when an alert rule fires',
      icon: monaco.languages.CompletionItemKind.Customcolor, // Alert/event icon
    },
    {
      schema: ScheduledTriggerSchema,
      description: 'Trigger workflow on a schedule (cron or interval)',
      icon: monaco.languages.CompletionItemKind.Operator, // Schedule/operator icon
    },
    {
      schema: ManualTriggerSchema,
      description: 'Trigger workflow manually',
      icon: monaco.languages.CompletionItemKind.TypeParameter, // Manual/keyword icon
    },
  ];

  const triggerTypes = triggerSchemas.map(({ schema, description, icon }) => {
    // Extract the literal type value from the Zod schema
    const typeField = schema.shape.type;
    const triggerType = typeField._def.value; // Get the literal value from z.literal()

    return {
      type: triggerType,
      description,
      icon,
    };
  });

  builtInTriggerTypesCache = triggerTypes;
  return triggerTypes;
}

/**
 * Detect if the current cursor position is inside a triggers block
 */
function isInTriggersContext(path: any[]): boolean {
  // Check if the path includes 'triggers' at any level
  // Examples: ['triggers'], ['triggers', 0], ['triggers', 0, 'with'], etc.
  return path.length > 0 && path[0] === 'triggers';
}

/**
 * Generate a snippet template for trigger types with appropriate parameters
 */
function generateTriggerSnippet(triggerType: string, shouldBeQuoted: boolean): string {
  const quotedType = shouldBeQuoted ? `"${triggerType}"` : triggerType;

  // Generate appropriate snippets based on trigger type
  switch (triggerType) {
    case 'alert':
      return `${quotedType}`;

    case 'scheduled':
      return `${quotedType}\n  with:\n    every: "\${1:5}"\n    unit: "\${2|second,minute,hour,day,week,month,year|}"`;

    case 'manual':
      return `${quotedType}`;

    default:
      return `${quotedType}`;
  }
}

export interface LineParseResult {
  fullKey: string;
  pathSegments: string[] | null;
  matchType: 'at' | 'bracket-unfinished' | 'variable-complete' | 'variable-unfinished' | null;
  match: RegExpMatchArray | null;
}

function cleanKey(key: string) {
  if (key === '.') {
    // special expression in mustache for current object
    return key;
  }
  // remove trailing dot if it exists
  return key.endsWith('.') ? key.slice(0, -1) : key;
}

export function parseLineForCompletion(lineUpToCursor: string): LineParseResult {
  // Try @ trigger first (e.g., "@const" or "@steps.step1")
  const atMatch = [...lineUpToCursor.matchAll(/@(?<key>\S+?)?\.?(?=\s|$)/g)].pop();
  if (atMatch) {
    const fullKey = cleanKey(atMatch.groups?.key ?? '');
    return {
      fullKey,
      pathSegments: parsePath(fullKey),
      matchType: 'at',
      match: atMatch,
    };
  }

  // Try unfinished mustache (e.g., "{{ consts.api" at end of line)
  const unfinishedMatch = [...lineUpToCursor.matchAll(UNFINISHED_VARIABLE_REGEX_GLOBAL)].pop();
  if (unfinishedMatch) {
    const fullKey = cleanKey(unfinishedMatch.groups?.key ?? '');
    return {
      fullKey,
      pathSegments: parsePath(fullKey),
      matchType: 'variable-unfinished',
      match: unfinishedMatch,
    };
  }

  // Try complete mustache (e.g., "{{ consts.apiUrl }}")
  const completeMatch = [...lineUpToCursor.matchAll(VARIABLE_REGEX_GLOBAL)].pop();
  if (completeMatch) {
    const fullKey = cleanKey(completeMatch.groups?.key ?? '');
    return {
      fullKey,
      pathSegments: parsePath(fullKey),
      matchType: 'variable-complete',
      match: completeMatch,
    };
  }

  return {
    fullKey: '',
    pathSegments: [],
    matchType: null,
    match: null,
  };
}

/**
 * Generate a snippet template for a connector type with required parameters
 */
function generateConnectorSnippet(
  connectorType: string,
  shouldBeQuoted: boolean,
  dynamicConnectorTypes?: Record<string, any>
): string {
  const quotedType = shouldBeQuoted ? `"${connectorType}"` : connectorType;

  let snippet = quotedType;

  // Add connector-id if required
  if (connectorTypeRequiresConnectorId(connectorType, dynamicConnectorTypes)) {
    const instances = getConnectorInstancesForType(connectorType, dynamicConnectorTypes);

    if (instances.length > 0) {
      // Use the first non-deprecated instance as default, or first instance if all are deprecated
      const defaultInstance = instances.find((i) => !i.isDeprecated) || instances[0];
      snippet += `\nconnector-id: ${defaultInstance.id}`;
    } else {
      // No instances configured, add placeholder
      snippet += `\nconnector-id: # Enter connector ID here`;
    }
  }

  // Get required parameters for this connector type
  const requiredParams = getRequiredParamsForConnector(connectorType, dynamicConnectorTypes);

  if (requiredParams.length === 0) {
    // No required params, just add empty with block with a placeholder
    snippet += `\nwith:\n  # Add parameters here. Click Ctrl+Space (Ctrl+I on Mac) to see all available options`;
    return snippet;
  }

  // Create with block with required parameters as placeholders
  snippet += `\nwith:`;
  requiredParams.forEach((param) => {
    const placeholder = param.example || param.defaultValue || '';

    // Handle complex objects (like body) by formatting as YAML
    if (typeof placeholder === 'object' && placeholder !== null) {
      const yamlContent = formatObjectAsYaml(placeholder, 2);
      snippet += `\n  ${param.name}:\n${yamlContent}`;
    } else {
      snippet += `\n  ${param.name}: ${placeholder}`;
    }
  });

  return snippet;
}

/**
 * Generate a snippet template for built-in step types
 */
function generateBuiltInStepSnippet(stepType: string, shouldBeQuoted: boolean): string {
  const quotedType = shouldBeQuoted ? `"${stepType}"` : stepType;

  // Generate appropriate snippets based on step type
  switch (stepType) {
    case 'foreach':
      return `${quotedType}\nforeach: "{{ context.items }}"\nsteps:\n  - name: "process-item"\n    type: # Add step type here`;

    case 'if':
      return `${quotedType}\ncondition: "{{ context.condition }}"\nsteps:\n  - name: "then-step"\n    type: # Add step type here\nelse:\n  - name: "else-step"\n    type: # Add step type here`;

    case 'parallel':
      return `${quotedType}\nbranches:\n  - name: "branch-1"\n    steps:\n      - name: "step-1"\n        type: # Add step type here\n  - name: "branch-2"\n    steps:\n      - name: "step-2"\n        type: # Add step type here`;

    case 'merge':
      return `${quotedType}\nsources:\n  - "branch-1"\n  - "branch-2"\nsteps:\n  - name: "merge-step"\n    type: # Add step type here`;

    case 'http':
      return `${quotedType}\nwith:\n  url: "https://api.example.com"\n  method: "GET"`;

    case 'wait':
      return `${quotedType}\nwith:\n  duration: "5s"`;

    default:
      return `${quotedType}\nwith:\n  # Add parameters here`;
  }
}

/**
 * Check if a connector type requires a connector-id field
 */
function connectorTypeRequiresConnectorId(
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
function getConnectorIdSuggestions(
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
    const displayLabel = `${instance.id} • ${connectorName}`;

    suggestions.push({
      label: displayLabel, // Show both connector ID and name
      kind: monaco.languages.CompletionItemKind.Value, // Use generic value kind
      insertText: instance.id, // Still insert only the ID
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
 * Format an object as YAML with proper indentation
 */
function formatObjectAsYaml(obj: any, indentLevel: number = 0): string {
  const indent = '  '.repeat(indentLevel);
  const lines: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      lines.push(`${indent}${key}:`);
      lines.push(formatObjectAsYaml(value, indentLevel + 1));
    } else if (Array.isArray(value)) {
      lines.push(`${indent}${key}:`);
      value.forEach((item) => {
        if (typeof item === 'string') {
          lines.push(`${indent}  - "${item}"`);
        } else {
          lines.push(`${indent}  - ${item}`);
        }
      });
    } else if (typeof value === 'string') {
      lines.push(`${indent}${key}: "${value}"`);
    } else {
      lines.push(`${indent}${key}: ${value}`);
    }
  }

  return lines.join('\n');
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
      if (lineIndent < currentIndent) {
        // We are INSIDE with block
        return true;
      } else if (lineNumber === currentLineNumber) {
        // We are ON the with: line itself
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
    if (lineIndent < currentIndent && line.trim() !== '' && !line.includes('with:')) {
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
 * Get the indentation level (number of spaces) for a line
 */
function getIndentLevel(line: string): number {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

/**
 * Get enhanced type information for better completion suggestions
 */
function getEnhancedTypeInfo(schema: z.ZodType): {
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
function getExistingParametersInWithBlock(model: any, position: any): Set<string> {
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
  const expectedParamIndent = withIndent + 2; // Parameters should be indented 2 spaces from with:

  for (let lineNumber = withLineNumber + 1; lineNumber <= model.getLineCount(); lineNumber++) {
    const line = model.getLineContent(lineNumber);
    const lineIndent = getIndentLevel(line);

    // Stop if we've gone past the with block (less indentation) or hit another major structure
    if (line.trim() !== '' && lineIndent <= withIndent) {
      // Exited with block due to indentation
      break;
    }

    // Look for parameters at the expected indentation level
    if (lineIndent === expectedParamIndent) {
      const paramMatch = line.match(/^\s*(\w+):/);
      if (paramMatch) {
        const paramName = paramMatch[1];
        existingParams.add(paramName);
        // Found existing parameter
      }
    }

    // Stop if we hit another step
    if (line.match(/^\s*-\s+name:/)) {
      // Hit next step
      break;
    }
  }

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

/**
 * Get the specific connector's parameter schema for autocomplete
 */
// Cache for connector schemas to avoid repeated processing
const connectorSchemaCache = new Map<string, Record<string, any> | null>();

// Cache for connector type suggestions to avoid recalculating on every keystroke
const connectorTypeSuggestionsCache = new Map<string, monaco.languages.CompletionItem[]>();

function getConnectorParamsSchema(
  connectorType: string,
  dynamicConnectorTypes?: Record<string, any>
): Record<string, any> | null {
  // Check cache first
  if (connectorSchemaCache.has(connectorType)) {
    return connectorSchemaCache.get(connectorType)!;
  }

  try {
    const allConnectors = getCachedAllConnectors(dynamicConnectorTypes);
    const connector = allConnectors.find((c: any) => c.type === connectorType);

    if (!connector || !connector.paramsSchema) {
      // No paramsSchema found for connector
      connectorSchemaCache.set(connectorType, null);
      return null;
    }

    // Extract the shape from the Zod schema
    if (connector.paramsSchema instanceof z.ZodObject) {
      // Found paramsSchema for connector
      const result = connector.paramsSchema.shape;
      connectorSchemaCache.set(connectorType, result);
      return result;
    }

    connectorSchemaCache.set(connectorType, null);
    return null;
  } catch (error) {
    // Error getting connector params schema
    connectorSchemaCache.set(connectorType, null);
    return null;
  }
}

/**
 * Extract example for body parameter based on its schema
 */
function extractBodyExample(bodySchema: z.ZodType): any {
  try {
    // Handle ZodOptional wrapper
    let schema = bodySchema;
    if (bodySchema instanceof z.ZodOptional) {
      schema = bodySchema._def.innerType;
    }

    // If it's a ZodObject, try to extract its shape and build YAML-compatible example
    if (schema instanceof z.ZodObject) {
      const shape = schema._def.shape();
      const example: any = {};

      // Extract examples from each field
      for (const [key, fieldSchema] of Object.entries(shape)) {
        const field = fieldSchema as z.ZodType;
        const description = (field as any)?._def?.description || '';

        // Extract example from description if available
        const stringExampleMatch = description.match(/e\.g\.,?\s*"([^"]+)"/);
        const objectExampleMatch = description.match(/e\.g\.,?\s*(\{[^}]+\})/);

        if (stringExampleMatch) {
          example[key] = stringExampleMatch[1];
        } else if (objectExampleMatch) {
          try {
            example[key] = JSON.parse(objectExampleMatch[1]);
          } catch {
            // If JSON parse fails, use as string
            example[key] = objectExampleMatch[1];
          }
        }
        // No fallback - only use examples explicitly defined in enhanced connectors
      }

      if (Object.keys(example).length > 0) {
        return example; // Return object, not JSON string
      }
    }
  } catch (error) {
    // Fallback to empty object
  }

  return {};
}

/**
 * Extract required parameters from a Zod schema
 */
function extractRequiredParamsFromSchema(
  schema: z.ZodType
): Array<{ name: string; example?: string; defaultValue?: string; required: boolean }> {
  const params: Array<{
    name: string;
    example?: string;
    defaultValue?: string;
    required: boolean;
  }> = [];

  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    for (const [key, fieldSchema] of Object.entries(shape)) {
      const zodField = fieldSchema as z.ZodType;

      // Skip common non-parameter fields
      if (['pretty', 'human', 'error_trace', 'source', 'filter_path'].includes(key)) {
        continue;
      }

      // Check if field is required (not optional)
      const isOptional = zodField instanceof z.ZodOptional;
      const isRequired = !isOptional;

      // Extract description for examples
      let description = '';
      let example = '';

      if ('description' in zodField && typeof zodField.description === 'string') {
        description = zodField.description;
        // Try to extract example from description
        const exampleMatch = description.match(
          /example[:\s]+['"]*([^'"]+)['"]*|default[:\s]+['"]*([^'"]+)['"]*/i
        );
        if (exampleMatch) {
          example = exampleMatch[1] || exampleMatch[2] || '';
        }
      }

      // Add some default examples based on common parameter names
      if (!example) {
        if (key === 'index') {
          example = 'my-index';
        } else if (key === 'id') {
          example = 'doc-id';
        } else if (key === 'body') {
          // Try to extract body structure from schema
          example = extractBodyExample(zodField);
        } else if (key === 'query') {
          example = '{}';
        } else if (key.includes('name')) {
          example = 'my-name';
        }
      }

      // Only include required parameters or very common ones
      if (isRequired || ['index', 'id', 'body'].includes(key)) {
        params.push({
          name: key,
          example,
          required: isRequired,
        });
      }
    }
  }

  return params;
}

/**
 * Get required parameters for a connector type from generated schemas
 */
function getRequiredParamsForConnector(
  connectorType: string,
  dynamicConnectorTypes?: Record<string, any>
): Array<{ name: string; example?: string; defaultValue?: string }> {
  // Get all connectors (both static and generated)
  const allConnectors = getCachedAllConnectors(dynamicConnectorTypes);

  // Find the connector by type
  const connector = allConnectors.find((c: any) => c.type === connectorType);

  if (connector && connector.paramsSchema) {
    try {
      // Check if this connector has enhanced examples
      const hasEnhancedExamples = (connector as any).examples?.params;

      // Processing enhanced examples for connector

      if (hasEnhancedExamples) {
        // Use examples directly from enhanced connector
        const exampleParams = (connector as any).examples.params;
        // Using enhanced examples
        const result: Array<{ name: string; example?: any; defaultValue?: string }> = [];

        for (const [key, value] of Object.entries(exampleParams)) {
          // Include common important parameters for ES APIs
          if (
            [
              'index',
              'id',
              'body',
              'query',
              'size',
              'from',
              'sort',
              'aggs',
              'aggregations',
              'format',
            ].includes(key)
          ) {
            result.push({ name: key, example: value });
            // Added enhanced example
          }
        }

        if (result.length > 0) {
          // Returning enhanced examples
          return result;
        }
      }

      // Fallback to extracting from schema
      const params = extractRequiredParamsFromSchema(connector.paramsSchema);

      // Return only required parameters, or most important ones if no required ones
      const requiredParams = params.filter((p) => p.required);
      if (requiredParams.length > 0) {
        return requiredParams.map((p) => ({ name: p.name, example: p.example }));
      }

      // If no required params, return the most important ones for ES APIs
      const importantParams = params.filter((p) =>
        [
          'index',
          'id',
          'body',
          'query',
          'size',
          'from',
          'sort',
          'aggs',
          'aggregations',
          'format',
        ].includes(p.name)
      );
      if (importantParams.length > 0) {
        return importantParams.slice(0, 3).map((p) => ({ name: p.name, example: p.example }));
      }
    } catch (error) {
      // Silently continue with fallback parameters
    }
  }

  // Fallback to basic hardcoded ones for non-ES connectors
  const basicConnectorParams: Record<string, Array<{ name: string; example?: string }>> = {
    console: [{ name: 'message', example: 'Hello World' }],
    slack: [{ name: 'message', example: 'Hello Slack' }],
    http: [
      { name: 'url', example: 'https://api.example.com' },
      { name: 'method', example: 'GET' },
    ],
    wait: [{ name: 'duration', example: '5s' }],
  };

  return basicConnectorParams[connectorType] || [];
}

/**
 * Get appropriate Monaco completion kind for different connector types
 */
function getConnectorCompletionKind(connectorType: string): monaco.languages.CompletionItemKind {
  // Map specific connector types to appropriate icons
  if (connectorType === 'slack') {
    return monaco.languages.CompletionItemKind.Event; // Will use custom Slack logo
  }
  if (connectorType.startsWith('elasticsearch')) {
    return monaco.languages.CompletionItemKind.Struct; // Will use custom Elasticsearch logo
  }
  if (connectorType.startsWith('kibana')) {
    return monaco.languages.CompletionItemKind.Module; // Will use custom Kibana logo
  }
  if (connectorType === 'console') {
    return monaco.languages.CompletionItemKind.Variable; // Will use custom Console icon
  }
  if (connectorType === 'http') {
    return monaco.languages.CompletionItemKind.Reference; // Will use custom HTTP icon
  }
  return monaco.languages.CompletionItemKind.Function;
}

/**
 * Get connector type suggestions with better grouping and filtering
 */
function getConnectorTypeSuggestions(
  typePrefix: string,
  range: monaco.IRange,
  context: monaco.languages.CompletionContext,
  scalarType: Scalar.Type | null,
  shouldBeQuoted: boolean,
  dynamicConnectorTypes?: Record<string, any>
): monaco.languages.CompletionItem[] {
  // Create a cache key based on the type prefix and context
  const cacheKey = `${typePrefix}|${shouldBeQuoted}|${JSON.stringify(range)}`;

  // Check cache first
  if (connectorTypeSuggestionsCache.has(cacheKey)) {
    return connectorTypeSuggestionsCache.get(cacheKey)!;
  }

  const suggestions: monaco.languages.CompletionItem[] = [];

  // Get built-in step types from the schema (single source of truth)
  const builtInStepTypes = getBuiltInStepTypesFromSchema();

  // Get all connectors
  const allConnectors = getCachedAllConnectors(dynamicConnectorTypes);

  // Helper function to create a suggestion with snippet
  const createSnippetSuggestion = (connectorType: string): monaco.languages.CompletionItem => {
    const snippetText = generateConnectorSnippet(
      connectorType,
      shouldBeQuoted,
      dynamicConnectorTypes
    );

    // For YAML, we insert the actual text without snippet placeholders
    const simpleText = snippetText;

    // Extended range for multi-line insertion
    const extendedRange = {
      startLineNumber: range.startLineNumber,
      endLineNumber: range.endLineNumber,
      startColumn: range.startColumn,
      endColumn: Math.max(range.endColumn, 1000),
    };

    // Find display name for this connector type - only for dynamic connectors
    const connector = allConnectors.find((c: any) => c.type === connectorType);

    // Only use display names for dynamic connectors (not elasticsearch.* or kibana.*)
    const isDynamicConnector =
      !connectorType.startsWith('elasticsearch.') && !connectorType.startsWith('kibana.');
    const displayName =
      isDynamicConnector && connector?.description
        ? connector.description.replace(' connector', '').replace(' (no instances configured)', '')
        : connectorType;

    return {
      label: displayName, // Show display name for dynamic connectors, technical name for ES/Kibana
      kind: getConnectorCompletionKind(connectorType), // Use appropriate kind for icons
      insertText: simpleText, // Still insert the actual actionTypeId
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range: extendedRange,
      detail: connectorType, // Show the actual type as detail
      documentation: connectorType.startsWith('elasticsearch.')
        ? `Elasticsearch API - ${connectorType.replace('elasticsearch.', '')}`
        : connectorType.startsWith('kibana.')
        ? `Kibana API - ${connectorType.replace('kibana.', '')}`
        : connector?.description || `Workflow connector - ${connectorType}`,
      filterText: connectorType,
      sortText: `!${connectorType}`, // Priority prefix to sort before default suggestions
      preselect: false,
    };
  };

  // If user is typing a prefix like "elasticsearch.", show filtered suggestions
  if (typePrefix.includes('.')) {
    const [namespace] = typePrefix.split('.');
    const namespacePrefix = `${namespace}.`;

    const apis = allConnectors
      .filter((c: any) => c.type.startsWith(namespacePrefix))
      .map((c: any) => c.type)
      .filter((api: string) => api.toLowerCase().includes(typePrefix.toLowerCase()));
    //      .slice(0, 50); // Limit for performance

    apis.forEach((api) => {
      suggestions.push(createSnippetSuggestion(api));
    });
  } else {
    // First, add built-in step types that match the prefix
    const matchingBuiltInTypes = builtInStepTypes.filter((stepType) =>
      stepType.type.toLowerCase().includes(typePrefix.toLowerCase())
    );

    matchingBuiltInTypes.forEach((stepType) => {
      const snippetText = generateBuiltInStepSnippet(stepType.type, shouldBeQuoted);
      const extendedRange = {
        startLineNumber: range.startLineNumber,
        endLineNumber: range.endLineNumber,
        startColumn: range.startColumn,
        endColumn: Math.max(range.endColumn, 1000),
      };

      suggestions.push({
        label: stepType.type,
        kind: stepType.icon,
        insertText: snippetText,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range: extendedRange,
        documentation: stepType.description,
        filterText: stepType.type,
        sortText: `!${stepType.type}`, // Priority prefix to sort before connector suggestions
        detail: 'Built-in workflow step',
        preselect: false,
      });
    });

    // Then add matching connectors
    const matchingConnectors = allConnectors
      .map((c: any) => c.type)
      .filter((connectorType: string) => {
        const lowerType = connectorType.toLowerCase();
        const lowerPrefix = typePrefix.toLowerCase();

        // Match if the full type contains the prefix
        const fullMatch = lowerType.includes(lowerPrefix);

        // For elasticsearch connectors, also match if the part after "elasticsearch." starts with the prefix
        let elasticsearchMatch = false;
        if (connectorType.startsWith('elasticsearch.')) {
          const afterPrefix = connectorType.substring('elasticsearch.'.length);
          elasticsearchMatch = afterPrefix.toLowerCase().startsWith(lowerPrefix);
        }

        return fullMatch || elasticsearchMatch;
      });

    matchingConnectors.forEach((connectorType) => {
      suggestions.push(createSnippetSuggestion(connectorType));
    });
  }

  // Cache the result before returning
  connectorTypeSuggestionsCache.set(cacheKey, suggestions);

  return suggestions;
}

/**
 * Get trigger type suggestions with snippets
 */
function getTriggerTypeSuggestions(
  typePrefix: string,
  range: monaco.IRange,
  context: monaco.languages.CompletionContext,
  scalarType: Scalar.Type | null,
  shouldBeQuoted: boolean
): monaco.languages.CompletionItem[] {
  const suggestions: monaco.languages.CompletionItem[] = [];

  // Get built-in trigger types from the schema (single source of truth)
  const builtInTriggerTypes = getBuiltInTriggerTypesFromSchema();

  // Filter trigger types that match the prefix
  const matchingTriggerTypes = builtInTriggerTypes.filter((triggerType) =>
    triggerType.type.toLowerCase().includes(typePrefix.toLowerCase())
  );

  matchingTriggerTypes.forEach((triggerType) => {
    const snippetText = generateTriggerSnippet(triggerType.type, shouldBeQuoted);

    // Extended range for multi-line insertion
    const extendedRange = {
      startLineNumber: range.startLineNumber,
      endLineNumber: range.endLineNumber,
      startColumn: range.startColumn,
      endColumn: Math.max(range.endColumn, 1000),
    };

    suggestions.push({
      label: triggerType.type,
      kind: triggerType.icon,
      insertText: snippetText,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range: extendedRange,
      documentation: triggerType.description,
      filterText: triggerType.type,
      sortText: `!${triggerType.type}`, // Priority prefix to sort before other suggestions
      detail: 'Workflow trigger',
      preselect: false,
    });
  });

  return suggestions;
}

export function getSuggestion(
  key: string,
  context: monaco.languages.CompletionContext,
  range: monaco.IRange,
  scalarType: Scalar.Type | null,
  shouldBeQuoted: boolean,
  type: string,
  description?: string
): monaco.languages.CompletionItem {
  let keyToInsert = key;
  const isAt = context.triggerCharacter === '@';
  const keyCouldAccessedByDot = PROPERTY_PATH_REGEX.test(key);
  const removeDot = isAt || !keyCouldAccessedByDot;

  if (!keyCouldAccessedByDot) {
    // we need to use opposite quote type if we are in a string
    const q = scalarType === 'QUOTE_DOUBLE' ? "'" : '"';
    keyToInsert = `[${q}${key}${q}]`;
  }

  let insertText = keyToInsert;
  let insertTextRules = monaco.languages.CompletionItemInsertTextRule.None;
  if (isAt) {
    insertText = `{{ ${key}$0 }}`;
    insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
  }
  if (shouldBeQuoted) {
    insertText = `"${insertText}"`;
  }
  // $0 is the cursor position
  return {
    label: key,
    kind: monaco.languages.CompletionItemKind.Field,
    range,
    insertText,
    detail: `${type}` + (description ? `: ${description}` : ''),
    insertTextRules,
    additionalTextEdits: removeDot
      ? [
          {
            // remove the @
            range: {
              startLineNumber: range.startLineNumber,
              endLineNumber: range.endLineNumber,
              startColumn: range.startColumn - 1,
              endColumn: range.endColumn,
            },
            text: '',
          },
        ]
      : [],
  };
}

export function getCompletionItemProvider(
  workflowYamlSchema: z.ZodSchema,
  dynamicConnectorTypes?: Record<string, any>
): monaco.languages.CompletionItemProvider {
  return {
    triggerCharacters: ['@', '.', ' '],
    provideCompletionItems: (model, position, completionContext) => {
      try {
        // Get the latest connector data from cache instead of relying on closure
        const currentDynamicConnectorTypes =
          getCachedDynamicConnectorTypes() || dynamicConnectorTypes;

        const { lineNumber } = position;
        const line = model.getLineContent(lineNumber);
        const wordUntil = model.getWordUntilPosition(position);
        const word = model.getWordAtPosition(position) || wordUntil;
        const { startColumn, endColumn } = word;

        const range = {
          startLineNumber: lineNumber,
          endLineNumber: lineNumber,
          startColumn,
          endColumn,
        };
        const absolutePosition = model.getOffsetAt(position);
        const suggestions: monaco.languages.CompletionItem[] = [];
        const value = model.getValue();

        const yamlDocument = parseDocument(value);

        // Try to parse with the strict schema first
        const result = parseWorkflowYamlToJSON(value, workflowYamlSchema);

        // If strict parsing fails, try with a more lenient approach for completion
        let workflowData = 'success' in result && result.success ? result.data : null;
        if (result.error) {
          // Try to parse the YAML as-is without strict schema validation
          try {
            const parsedYaml = yamlDocument.toJS();

            // If we have basic workflow structure, use it for completion context
            if (parsedYaml && typeof parsedYaml === 'object' && 'steps' in parsedYaml) {
              workflowData = parsedYaml;
            } else {
              return {
                suggestions: [],
                incomplete: false,
              };
            }
          } catch (yamlError) {
            return {
              suggestions: [],
              incomplete: false,
            };
          }
        }

        const workflowGraph = getWorkflowGraph(workflowData);
        const path = getCurrentPath(yamlDocument, absolutePosition);
        const yamlNode = yamlDocument.getIn(path, true);
        const scalarType = isScalar(yamlNode) ? yamlNode.type ?? null : null;

        // if we are in a plain scalar which starts with { or @, we need to add quotes otherwise template expression will break yaml
        const shouldBeQuoted =
          isScalar(yamlNode) &&
          scalarType === 'PLAIN' &&
          ((yamlNode?.value as string)?.startsWith('{') ||
            (yamlNode?.value as string)?.startsWith('@'));

        let context: z.ZodType;
        try {
          context = getContextSchemaForPath(workflowData, workflowGraph, path);
        } catch (contextError) {
          // Fallback to the main workflow schema if context detection fails
          context = workflowYamlSchema;
        }

        const lineUpToCursor = line.substring(0, position.column - 1);
        const parseResult = parseLineForCompletion(lineUpToCursor);
        const lastPathSegment = lineUpToCursor.endsWith('.')
          ? null
          : parseResult.pathSegments?.pop() ?? null;

        if (parseResult.fullKey) {
          const schemaAtPath = getSchemaAtPath(context, parseResult.fullKey, { partial: true });
          if (schemaAtPath) {
            context = schemaAtPath;
          }
        }

        // SPECIAL CASE: Connector-ID completion (must come before variable expression completion)
        // Check if we're trying to complete a connector-id field value
        const connectorIdCompletionMatch = lineUpToCursor.match(/^\s*connector-id:\s*(.*)$/i);

        if (
          connectorIdCompletionMatch &&
          completionContext.triggerKind === monaco.languages.CompletionTriggerKind.Invoke
        ) {
          // Find the connector type for this step
          const stepConnectorType = getConnectorTypeFromContext(
            yamlDocument,
            path,
            model,
            position
          );

          if (stepConnectorType) {
            // For connector-id values, we replace from the start of the value to the end of the line
            // Find the position right after "connector-id: "
            const connectorIdFieldMatch = lineUpToCursor.match(/^(\s*connector-id:\s*)/i);
            const valueStartColumn = connectorIdFieldMatch
              ? connectorIdFieldMatch[1].length + 1
              : position.column;
            const adjustedRange = {
              startLineNumber: range.startLineNumber,
              endLineNumber: range.endLineNumber,
              startColumn: valueStartColumn,
              endColumn: line.length + 1,
            };

            const connectorIdSuggestions = getConnectorIdSuggestions(
              stepConnectorType,
              adjustedRange,
              currentDynamicConnectorTypes
            );

            return {
              suggestions: connectorIdSuggestions,
              incomplete: false,
            };
          }
        }

        // SPECIAL CASE: Variable expression completion
        // Handle completions inside {{ }} or after @ triggers
        // BUT NOT when we're completing connector-id values
        const isConnectorIdCompletion = lineUpToCursor.match(/^\s*connector-id:\s*(.*)$/i);
        if (
          (parseResult.matchType === 'variable-unfinished' || parseResult.matchType === 'at') &&
          !isConnectorIdCompletion
        ) {
          // We're inside a variable expression, provide context-based completions
          if (context instanceof z.ZodObject) {
            const contextKeys = Object.keys(context.shape);

            // Filter based on what the user has typed so far
            const filteredKeys = lastPathSegment
              ? contextKeys.filter((key) => key.startsWith(lastPathSegment))
              : contextKeys;

            for (const key of filteredKeys) {
              const keySchema = context.shape[key];
              const propertyTypeName = getZodTypeName(keySchema);

              suggestions.push(
                getSuggestion(
                  key,
                  completionContext,
                  range,
                  scalarType,
                  shouldBeQuoted,
                  propertyTypeName,
                  keySchema?.description
                )
              );
            }

            // Return early for variable expressions to prevent other completions
            return {
              suggestions,
              incomplete: false,
            };
          }
        }

        // SPECIAL CASE: Direct type completion - context-aware
        // Check if we're trying to complete a type field, regardless of schema validation
        const typeCompletionMatch = lineUpToCursor.match(
          /^\s*-?\s*(?:name:\s*\w+\s*)?type:\s*(.*)$/i
        );

        if (typeCompletionMatch) {
          const typePrefix = typeCompletionMatch[1].replace(/['"]/g, '').trim();

          // For snippets, we need to replace from the start of the type value to the end of the line
          const typeValueStartColumn = lineUpToCursor.indexOf(typeCompletionMatch[1]) + 1;
          const adjustedRange = {
            startLineNumber: range.startLineNumber,
            endLineNumber: range.endLineNumber,
            startColumn: typeValueStartColumn,
            endColumn: line.length + 1, // Go to end of line to allow multi-line insertion
          };

          // Detect context: are we in triggers or steps?
          const inTriggersContext = isInTriggersContext(path);

          let typeSuggestions: monaco.languages.CompletionItem[];

          if (inTriggersContext) {
            // We're in triggers context - suggest trigger types
            typeSuggestions = getTriggerTypeSuggestions(
              typePrefix,
              adjustedRange,
              completionContext,
              scalarType,
              shouldBeQuoted
            );
          } else {
            // We're in steps context - suggest connector/step types
            typeSuggestions = getConnectorTypeSuggestions(
              typePrefix,
              adjustedRange,
              completionContext,
              scalarType,
              shouldBeQuoted,
              currentDynamicConnectorTypes
            );
          }

          return {
            suggestions: typeSuggestions,
            incomplete: false, // Prevent other providers from adding suggestions
          };
        }

        // 🔍 SPECIAL CASE: Check if we're inside a connector's 'with' block
        // Checking if we're inside a connector's 'with' block

        // First check if we're in a connector's with block (using enhanced detection)
        const connectorType = getConnectorTypeFromContext(yamlDocument, path, model, position);
        // Detected connector type

        // If we're in a connector with block, prioritize connector-specific suggestions
        if (connectorType) {
          // First check if we're inside an array item - if so, don't show parameter suggestions
          const isInArrayItem = lineUpToCursor.match(/^\s*-\s+/) !== null;

          if (isInArrayItem) {
            // We're in an array item, don't show connector parameter suggestions
            // Instead, return empty suggestions or appropriate array value suggestions
            return {
              suggestions: [],
              incomplete: false,
            };
          }

          // Check if we're typing a value (after colon with content)
          const colonIndex = lineUpToCursor.lastIndexOf(':');

          // More precise detection: are we actually in a value position?
          // We are in value position if:
          // 1. There's a colon in the line
          // 2. There's non-whitespace content after the colon (we're editing a value)
          // 3. OR if the cursor is right after ": " (ready to type value)
          const isInValuePosition =
            colonIndex !== -1 &&
            // Pattern 1: "key: value" where cursor is in/after value
            (/:\s+\S/.test(lineUpToCursor) ||
              // Pattern 2: "key: " where cursor is right after the space (about to type value)
              lineUpToCursor.endsWith(': ') ||
              // Pattern 3: "key:" where cursor is right after colon
              lineUpToCursor.endsWith(':'));

          // Analyzing cursor position

          if (isInValuePosition) {
            // Typing value after colon, not suggesting parameter names

            // Extract the parameter name more carefully
            // Get everything before the colon, remove leading whitespace and dashes
            const beforeColon = lineUpToCursor.substring(0, colonIndex);
            const paramName = beforeColon.replace(/^\s*-?\s*/, '').trim();
            // Parameter name extracted

            // Only provide value suggestions if we have a valid parameter name
            if (paramName && !paramName.includes(' ')) {
              // Provide basic value suggestions based on common parameter patterns
              const valueSuggestions: monaco.languages.CompletionItem[] = [];

              if (
                paramName.includes('enabled') ||
                paramName.includes('disabled') ||
                paramName.endsWith('Stream')
              ) {
                valueSuggestions.push(
                  {
                    label: 'true',
                    kind: monaco.languages.CompletionItemKind.Value,
                    insertText: 'true',
                    range,
                    documentation: 'Boolean true value',
                  },
                  {
                    label: 'false',
                    kind: monaco.languages.CompletionItemKind.Value,
                    insertText: 'false',
                    range,
                    documentation: 'Boolean false value',
                  }
                );
              } else if (
                paramName.includes('size') ||
                paramName.includes('count') ||
                paramName.includes('limit')
              ) {
                valueSuggestions.push({
                  label: '10',
                  kind: monaco.languages.CompletionItemKind.Value,
                  insertText: '10',
                  range,
                  documentation: 'Numeric value',
                });
              } else {
                // Generic string placeholder
                valueSuggestions.push({
                  label: '""',
                  kind: monaco.languages.CompletionItemKind.Value,
                  insertText: '""',
                  range,
                  documentation: 'String value',
                  command: {
                    id: 'cursorMove',
                    title: 'Move cursor left',
                    arguments: ['cursorMove', { to: 'left' }],
                  },
                });
              }

              return {
                suggestions: valueSuggestions,
                incomplete: false,
              };
            }

            // If we can't determine a valid parameter name, don't show any suggestions
            return {
              suggestions: [],
              incomplete: false,
            };
          }

          // Continue to show connector parameters for manual triggers or when typing parameter names
          // Will show connector parameters
        }

        // Get connector schema if we detected a connector type
        let schemaToUse: Record<string, z.ZodType> | null = null;

        if (connectorType) {
          schemaToUse = getConnectorParamsSchema(connectorType, currentDynamicConnectorTypes);
          // Schema lookup for connector type

          // Connector registry lookup

          if (schemaToUse) {
            // Using connector-specific schema

            // Get existing parameters in the with block to avoid duplicates using Monaco
            const existingParams = getExistingParametersInWithBlock(model, position);
            // Found existing parameters in with block

            // Use the connector's specific parameter schema instead of the generic schema
            for (const [key, currentSchema] of Object.entries(schemaToUse) as [
              string,
              z.ZodType
            ][]) {
              // Skip if parameter already exists (unless it's an empty value)
              if (existingParams.has(key)) {
                // Skipping existing parameter
                continue;
              }

              // If manually triggered (Ctrl+Space) or no filter, show all parameters
              const isManualTrigger =
                completionContext.triggerKind === monaco.languages.CompletionTriggerKind.Invoke;
              const shouldSkip =
                lastPathSegment && !key.startsWith(lastPathSegment) && !isManualTrigger;

              if (shouldSkip) {
                continue;
              }

              // Get enhanced type information
              const typeInfo = getEnhancedTypeInfo(currentSchema);

              // Create a YAML key-value snippet suggestion with cursor positioning
              let insertText = `${key}: `;
              let insertTextRules = monaco.languages.CompletionItemInsertTextRule.None;

              // Smart default values based on type and parameter name
              // Check array types first to avoid conflicts with name-based matching
              if (typeInfo.type.includes('[]')) {
                // Array type - provide proper array structure
                const elementType = typeInfo.type.replace('[]', '');
                if (elementType === 'string') {
                  insertText = `${key}:\n  - "\${1:}"`;
                } else {
                  insertText = `${key}:\n  - \${1:}`;
                }
                insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
              } else if (
                typeInfo.type === 'boolean' ||
                key.includes('enabled') ||
                key.includes('disabled') ||
                key.endsWith('Stream')
              ) {
                insertText = `${key}: \${1:true}`;
                insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
              } else if (
                typeInfo.type === 'number' ||
                key.includes('size') ||
                key.includes('count') ||
                key.includes('limit')
              ) {
                const defaultValue = typeInfo.example || '10';
                insertText = `${key}: \${1:${defaultValue}}`;
                insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
              } else if (
                typeInfo.type === 'string' ||
                key.includes('message') ||
                key.includes('text') ||
                key.includes('content')
              ) {
                const placeholder = typeInfo.example || '';
                insertText = `${key}: "\${1:${placeholder}}"`;
                insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
              } else if (typeInfo.type === 'object') {
                // Object type
                insertText = `${key}:\n  \${1:}`;
                insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
              } else if (typeInfo.example) {
                // Use example if available
                insertText = `${key}: \${1:${typeInfo.example}}`;
                insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
              } else {
                // Generic case - just add colon and space, then trigger suggestions
                insertText = `${key}: `;
              }

              // If it's kbn-xsrf, skip it since we don't need to suggest it
              if (key === 'kbn-xsrf') {
                continue;
              }

              // Create enhanced detail with type and required status
              const requiredIndicator = typeInfo.isRequired ? '(required)' : '(optional)';
              const detail = `${typeInfo.type} ${requiredIndicator}`;

              // Create rich documentation
              let documentation = `**${connectorType} Parameter: ${key}**\n\n`;
              documentation += `**Type:** \`${typeInfo.type}\`\n`;
              documentation += `**Required:** ${typeInfo.isRequired ? 'Yes' : 'No'}\n`;

              if (typeInfo.description) {
                documentation += `\n**Description:** ${typeInfo.description}\n`;
              }

              if (typeInfo.example) {
                documentation += `\n**Example:** \`${typeInfo.example}\`\n`;
              }

              documentation += `\n*This parameter is specific to the ${connectorType} connector.*`;

              const suggestion: monaco.languages.CompletionItem = {
                label: key,
                kind: monaco.languages.CompletionItemKind.Variable,
                insertText,
                insertTextRules,
                range,
                sortText: `!${key}`, // High priority sorting
                detail,
                documentation: {
                  value: documentation,
                },
                preselect: true,
                // Trigger autocomplete for value suggestions if no snippet placeholders
                command:
                  insertTextRules === monaco.languages.CompletionItemInsertTextRule.None
                    ? {
                        id: 'editor.action.triggerSuggest',
                        title: 'Trigger Suggest',
                      }
                    : undefined,
              };

              suggestions.push(suggestion);
            }

            // Returning connector-specific suggestions

            // 🎯 CONNECTOR-SPECIFIC MODE: Only return our suggestions, ignore others
            // CONNECTOR-SPECIFIC MODE: Returning only connector parameters

            // 🎯 SUCCESS: We found connector-specific suggestions and will return only these

            // Return the connector-specific suggestions
            return {
              suggestions,
              incomplete: false,
            };
          } else {
            // No schema found for connector type
          }
        } else {
          // Not inside a connector with block
        }

        // Note: Generic schema completions for 'with' blocks are now prevented
        // by the schema modification in improveTypeFieldDescriptions() which removes
        // all properties from 'with' objects, leaving only our custom provider

        // currently, we only suggest properties for objects
        if (!(context instanceof z.ZodObject)) {
          return {
            suggestions: [],
            incomplete: false,
          };
        }

        // Check if we should suggest connector-id field for the current step
        // Only do this expensive check when manually triggered (Cmd+I/Ctrl+I)
        const shouldSuggestConnectorId =
          completionContext.triggerKind === monaco.languages.CompletionTriggerKind.Invoke
            ? (() => {
                // Only suggest in steps context, not triggers
                if (isInTriggersContext(path)) {
                  return false;
                }

                // Try to find the connector type for this step
                const stepConnectorType = getConnectorTypeFromContext(
                  yamlDocument,
                  path,
                  model,
                  position
                );

                if (
                  stepConnectorType &&
                  connectorTypeRequiresConnectorId(stepConnectorType, currentDynamicConnectorTypes)
                ) {
                  // Check if connector-id already exists in this step
                  const stepPath = path.slice(
                    0,
                    path.findIndex((segment) => segment === 'with') || path.length
                  );
                  if (stepPath.length >= 2 && stepPath[0] === 'steps') {
                    try {
                      const stepNode = yamlDocument.getIn(stepPath, true) as any;
                      if (
                        stepNode &&
                        stepNode.has &&
                        typeof stepNode.has === 'function' &&
                        !stepNode.has('connector-id')
                      ) {
                        return { connectorType: stepConnectorType, stepNode };
                      }
                    } catch (error) {
                      // Ignore errors when checking for existing connector-id
                    }
                  }
                }

                return false;
              })()
            : false;

        // Add connector-id suggestion if appropriate
        if (shouldSuggestConnectorId && typeof shouldSuggestConnectorId === 'object') {
          const { connectorType } = shouldSuggestConnectorId;
          const instances = getConnectorInstancesForType(
            connectorType,
            currentDynamicConnectorTypes
          );

          let insertText = 'connector-id: ';
          const insertTextRules = monaco.languages.CompletionItemInsertTextRule.None;

          if (instances.length > 0) {
            const defaultInstance = instances.find((i) => !i.isDeprecated) || instances[0];
            insertText = `connector-id: ${defaultInstance.id}`;
          } else {
            insertText = 'connector-id: ';
          }

          const connectorIdSuggestion: monaco.languages.CompletionItem = {
            label: 'connector-id',
            kind: monaco.languages.CompletionItemKind.Field,
            insertText,
            insertTextRules,
            range,
            sortText: '!connector-id', // High priority, after type
            detail: `string (required for ${connectorType})`,
            documentation: {
              value: `**Connector ID**\n\nSpecifies which connector instance to use for this ${connectorType} step.\n\n${
                instances.length > 0
                  ? `**Available instances:**\n${instances
                      .map((i) => `- ${i.name} (${i.id})${i.isDeprecated ? ' - deprecated' : ''}`)
                      .join('\n')}`
                  : 'No instances are currently configured for this connector type.'
              }`,
            },
            preselect: true,
            command:
              instances.length === 0
                ? {
                    id: 'editor.action.triggerSuggest',
                    title: 'Trigger Suggest',
                  }
                : undefined,
          };

          suggestions.push(connectorIdSuggestion);
        }

        for (const [key, currentSchema] of Object.entries(context.shape) as [string, z.ZodType][]) {
          // Check if manually triggered (Cmd+I/Ctrl+I) to show all suggestions
          const isManualTrigger =
            completionContext.triggerKind === monaco.languages.CompletionTriggerKind.Invoke;

          if (lastPathSegment && !key.startsWith(lastPathSegment) && !isManualTrigger) {
            continue;
          }

          // Special handling for the 'type' field to provide context-aware suggestions
          if (key === 'type') {
            // Check if we're completing the value after "type: "
            const typeValueMatch = lineUpToCursor.match(/type:\s*(.*)$/i);

            if (typeValueMatch) {
              const typePrefix = typeValueMatch[1].replace(/['"]/g, '').trim();

              // Adjust range to replace the entire value after "type: "
              const adjustedRange = {
                startLineNumber: range.startLineNumber,
                endLineNumber: range.endLineNumber,
                startColumn: lineUpToCursor.indexOf(typeValueMatch[1]) + 1,
                endColumn: line.length + 1, // Extended to allow multi-line
              };

              // Detect context: are we in triggers or steps?
              const inTriggersContext = isInTriggersContext(path);

              let typeSuggestions: monaco.languages.CompletionItem[];

              if (inTriggersContext) {
                // We're in triggers context - suggest trigger types
                typeSuggestions = getTriggerTypeSuggestions(
                  typePrefix,
                  adjustedRange,
                  completionContext,
                  scalarType,
                  shouldBeQuoted
                );
              } else {
                // We're in steps context - suggest connector/step types
                typeSuggestions = getConnectorTypeSuggestions(
                  typePrefix,
                  adjustedRange,
                  completionContext,
                  scalarType,
                  shouldBeQuoted,
                  currentDynamicConnectorTypes
                );
              }

              // Return immediately to prevent schema-based literal completions
              return {
                suggestions: typeSuggestions,
                incomplete: false,
              };
            } else {
              // For key completion, provide a custom "type:" completion that triggers snippet completion
              const propertyTypeName = getZodTypeName(currentSchema);
              const typeKeySuggestion = getSuggestion(
                key,
                completionContext,
                range,
                scalarType,
                shouldBeQuoted,
                propertyTypeName,
                'Connector type - choose from available connectors'
              );

              // Override the completion to trigger suggest after insertion
              typeKeySuggestion.command = {
                id: 'editor.action.triggerSuggest',
                title: 'Trigger Suggest',
              };

              suggestions.push(typeKeySuggestion);
            }
          } else {
            // Enhanced type information for generic suggestions
            const typeInfo = getEnhancedTypeInfo(currentSchema);
            const enhancedSuggestion = getSuggestion(
              key,
              completionContext,
              range,
              scalarType,
              shouldBeQuoted,
              typeInfo.type,
              typeInfo.description
            );

            // Enhance the suggestion with better detail and documentation
            const requiredIndicator = typeInfo.isRequired ? '(required)' : '(optional)';
            enhancedSuggestion.detail = `${typeInfo.type} ${requiredIndicator}`;

            if (typeInfo.description || typeInfo.example) {
              let documentation = `**Type:** \`${typeInfo.type}\`\n`;
              documentation += `**Required:** ${typeInfo.isRequired ? 'Yes' : 'No'}\n`;

              if (typeInfo.description) {
                documentation += `\n**Description:** ${typeInfo.description}\n`;
              }

              if (typeInfo.example) {
                documentation += `\n**Example:** \`${typeInfo.example}\`\n`;
              }

              enhancedSuggestion.documentation = {
                value: documentation,
              };
            }

            suggestions.push(enhancedSuggestion);
          }
        }

        // Remove duplicates, keeping the ones with better sort priority
        const uniqueSuggestions = suggestions.reduce((acc, curr) => {
          const existingIndex = acc.findIndex((s) => s.label === curr.label);
          if (existingIndex === -1) {
            return [...acc, curr];
          }
          // Keep the one with better sort priority (starts with !)
          if (curr.sortText && curr.sortText.startsWith('!')) {
            acc[existingIndex] = curr;
          }
          return acc;
        }, [] as monaco.languages.CompletionItem[]);

        return {
          suggestions: uniqueSuggestions,
          incomplete: false, // Prevent other providers from adding when we handle type field
        };
      } catch (error) {
        if (error instanceof YAMLParseError) {
          // Failed to parse YAML, skip suggestions
          return {
            suggestions: [],
            incomplete: false,
          };
        }
        throw error;
      }
    },
  };
}
