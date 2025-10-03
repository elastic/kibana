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
import type { BuiltInStepType, TriggerType } from '@kbn/workflows';
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
import { WorkflowGraph } from '@kbn/workflows/graph';
import { getDetailedTypeDescription, getSchemaAtPath, parsePath } from '../../../../common/lib/zod';
import { getCurrentPath, parseWorkflowYamlToJSON } from '../../../../common/lib/yaml_utils';
import { getContextSchemaForPath } from '../../../features/workflow_context/lib/get_context_for_path';
import {
  VARIABLE_REGEX_GLOBAL,
  PROPERTY_PATH_REGEX,
  UNFINISHED_VARIABLE_REGEX_GLOBAL,
} from '../../../../common/lib/regex';
import { generateConnectorSnippet } from './snippets/generate_connector_snippet';
import { generateBuiltInStepSnippet } from './snippets/generate_builtin_step_snippet';
import { generateTriggerSnippet } from './snippets/generate_trigger_snippet';
import { getCachedAllConnectors } from './connectors_cache';
import { getIndentLevel } from './get_indent_level';

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

export interface LineParseResult {
  fullKey: string;
  pathSegments: string[] | null;
  matchType:
    | 'at'
    | 'bracket-unfinished'
    | 'variable-complete'
    | 'variable-unfinished'
    | 'foreach-variable'
    | null;
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

  const lastWordBeforeCursor = lineUpToCursor.split(' ').pop();
  if (lineUpToCursor.includes('foreach:')) {
    const fullKey = cleanKey(lastWordBeforeCursor ?? '');
    return {
      fullKey,
      pathSegments: parsePath(fullKey),
      matchType: 'foreach-variable',
      match: null,
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
 * Detect if the current cursor position is inside a connector's 'with' block
 * and return the connector type
 */
/**
 * Enhanced function to detect connector type from context, including when path is empty
 */
function getConnectorTypeFromContext(
  yamlDocument: any,
  path: any[],
  model: any,
  position: any
): string | null {
  try {
    // Detecting connector type from context

    // First try the existing path-based detection
    const pathBasedType = getConnectorTypeFromWithBlock(yamlDocument, path);
    if (pathBasedType) {
      return pathBasedType;
    }

    // If path is empty or detection failed, try position-based detection
    // This handles cases where cursor is right after "with:"
    if (path.length === 0 || !path.includes('with')) {
      // Path empty or no "with", trying position-based detection
      return getConnectorTypeFromPosition(model, position);
    }

    return null;
  } catch (error) {
    // Error in getConnectorTypeFromContext
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

/**
 * Get the specific connector's parameter schema for autocomplete
 */
// Cache for connector schemas to avoid repeated processing
const connectorSchemaCache = new Map<string, Record<string, any> | null>();

// Cache for connector type suggestions to avoid recalculating on every keystroke
const connectorTypeSuggestionsCache = new Map<string, monaco.languages.CompletionItem[]>();

function getConnectorParamsSchema(connectorType: string): Record<string, any> | null {
  // Check cache first
  if (connectorSchemaCache.has(connectorType)) {
    return connectorSchemaCache.get(connectorType)!;
  }

  try {
    const allConnectors = getCachedAllConnectors();
    const connector = allConnectors.find((c: any) => c.type === connectorType);

    if (!connector || !connector.paramsSchema) {
      // No paramsSchema found for connector
      connectorSchemaCache.set(connectorType, null);
      return null;
    }

    // Handle function-generated schemas (like the complex union schemas)
    let actualSchema = connector.paramsSchema;
    if (typeof connector.paramsSchema === 'function') {
      try {
        actualSchema = (connector.paramsSchema as any)();
      } catch (error) {
        // If function execution fails, cache null and return
        connectorSchemaCache.set(connectorType, null);
        return null;
      }
    }

    // Extract the shape from the Zod schema
    if (actualSchema instanceof z.ZodObject) {
      // Found paramsSchema for connector (simple object)
      const result = actualSchema.shape;
      connectorSchemaCache.set(connectorType, result);
      return result;
    }

    // Handle ZodUnion schemas (from our generic intersection fix)
    if (actualSchema instanceof z.ZodUnion) {
      // For union schemas, extract common properties from all options
      const unionOptions = actualSchema._def.options;
      const commonProperties: Record<string, any> = {};

      // Helper function to extract properties from any schema type
      const extractPropertiesFromSchema = (schema: any): Record<string, any> => {
        if (schema instanceof z.ZodObject) {
          return schema.shape;
        } else if (schema instanceof z.ZodIntersection) {
          // For intersections, merge properties from both sides
          const leftProps = extractPropertiesFromSchema(schema._def.left);
          const rightProps = extractPropertiesFromSchema(schema._def.right);
          return { ...leftProps, ...rightProps };
        }
        return {};
      };

      // Get properties that exist in ALL union options
      if (unionOptions.length > 0) {
        const firstOptionProps = extractPropertiesFromSchema(unionOptions[0]);

        // Check each property in the first option
        for (const [key, schema] of Object.entries(firstOptionProps)) {
          // Check if this property exists in ALL other options
          const existsInAll = unionOptions.every((option: any) => {
            const optionProps = extractPropertiesFromSchema(option);
            return optionProps[key];
          });

          if (existsInAll) {
            commonProperties[key] = schema;
          }
        }
      }

      if (Object.keys(commonProperties).length > 0) {
        // Found common properties in union schema
        connectorSchemaCache.set(connectorType, commonProperties);
        return commonProperties;
      }
    }

    // Handle ZodIntersection schemas (from complex union handling)
    if (actualSchema instanceof z.ZodIntersection) {
      // Helper function to extract properties from any schema type (reuse from above)
      const extractPropertiesFromSchema = (schema: any): Record<string, any> => {
        if (schema instanceof z.ZodObject) {
          return schema.shape;
        } else if (schema instanceof z.ZodIntersection) {
          // For intersections, merge properties from both sides
          const leftProps = extractPropertiesFromSchema(schema._def.left);
          const rightProps = extractPropertiesFromSchema(schema._def.right);
          return { ...leftProps, ...rightProps };
        }
        return {};
      };

      // For intersection schemas, extract properties from both sides
      const allProperties = extractPropertiesFromSchema(actualSchema);

      if (Object.keys(allProperties).length > 0) {
        connectorSchemaCache.set(connectorType, allProperties);
        return allProperties;
      }
    }

    // Handle discriminated unions
    if (actualSchema instanceof z.ZodDiscriminatedUnion) {
      // For discriminated unions, extract common properties from all options
      const unionOptions = Array.from(actualSchema._def.options.values());
      const commonProperties: Record<string, any> = {};

      // Helper function to extract properties from any schema type (reuse from above)
      const extractPropertiesFromSchema = (schema: any): Record<string, any> => {
        if (schema instanceof z.ZodObject) {
          return schema.shape;
        } else if (schema instanceof z.ZodIntersection) {
          // For intersections, merge properties from both sides
          const leftProps = extractPropertiesFromSchema(schema._def.left);
          const rightProps = extractPropertiesFromSchema(schema._def.right);
          return { ...leftProps, ...rightProps };
        }
        return {};
      };

      if (unionOptions.length > 0) {
        const firstOptionProps = extractPropertiesFromSchema(unionOptions[0]);

        // Check each property in the first option
        for (const [key, schema] of Object.entries(firstOptionProps)) {
          // Check if this property exists in ALL other options
          const existsInAll = unionOptions.every((option: any) => {
            const optionProps = extractPropertiesFromSchema(option);
            return optionProps[key];
          });

          if (existsInAll) {
            commonProperties[key] = schema;
          }
        }
      }

      if (Object.keys(commonProperties).length > 0) {
        connectorSchemaCache.set(connectorType, commonProperties);
        return commonProperties;
      }
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

  if (connectorType.startsWith('inference')) {
    return monaco.languages.CompletionItemKind.Snippet; // Will use custom HTTP icon
  }

  if (connectorType === 'http') {
    return monaco.languages.CompletionItemKind.Reference; // Will use custom HTTP icon
  }

  if (connectorType === 'console') {
    return monaco.languages.CompletionItemKind.Variable; // Will use custom console icon
  }

  // Default fallback
  return monaco.languages.CompletionItemKind.Function;
}

/**
 * Get connector type suggestions with better grouping and filtering
 */
function getConnectorTypeSuggestions(
  typePrefix: string,
  range: monaco.IRange
): monaco.languages.CompletionItem[] {
  // Create a cache key based on the type prefix and context
  const cacheKey = `${typePrefix}|${JSON.stringify(range)}`;

  // Check cache first
  if (connectorTypeSuggestionsCache.has(cacheKey)) {
    return connectorTypeSuggestionsCache.get(cacheKey)!;
  }

  const suggestions: monaco.languages.CompletionItem[] = [];

  // Get built-in step types from the schema (single source of truth)
  const builtInStepTypes = getBuiltInStepTypesFromSchema();

  // Get all connectors
  const allConnectors = getCachedAllConnectors();

  // Helper function to create a suggestion with snippet
  const createSnippetSuggestion = (connectorType: string): monaco.languages.CompletionItem => {
    const snippetText = generateConnectorSnippet(connectorType);

    // For YAML, we insert the actual text without snippet placeholders
    const simpleText = snippetText;

    // Extended range for multi-line insertion
    const extendedRange = {
      startLineNumber: range.startLineNumber,
      endLineNumber: range.endLineNumber,
      startColumn: range.startColumn,
      endColumn: Math.max(range.endColumn, 1000),
    };

    return {
      label: connectorType,
      kind: getConnectorCompletionKind(connectorType), // Use custom icon mapping
      insertText: simpleText,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range: extendedRange,
      documentation: connectorType.startsWith('elasticsearch.')
        ? `Elasticsearch API - ${connectorType.replace('elasticsearch.', '')}`
        : connectorType.startsWith('kibana.')
        ? `Kibana API - ${connectorType.replace('kibana.', '')}`
        : `Workflow connector - ${connectorType}`,
      filterText: connectorType,
      sortText: `!${connectorType}`, // Priority prefix to sort before default suggestions
      detail: 'Insert connector with parameters',
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
      const snippetText = generateBuiltInStepSnippet(stepType.type as BuiltInStepType);
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
  range: monaco.IRange
): monaco.languages.CompletionItem[] {
  const suggestions: monaco.languages.CompletionItem[] = [];

  // Get built-in trigger types from the schema (single source of truth)
  const builtInTriggerTypes = getBuiltInTriggerTypesFromSchema();

  // Filter trigger types that match the prefix
  const matchingTriggerTypes = builtInTriggerTypes.filter((triggerType) =>
    triggerType.type.toLowerCase().includes(typePrefix.toLowerCase())
  );

  matchingTriggerTypes.forEach((triggerType) => {
    const snippetText = generateTriggerSnippet(triggerType.type as TriggerType);

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
  workflowYamlSchema: z.ZodSchema
): monaco.languages.CompletionItemProvider {
  return {
    triggerCharacters: ['@', '.', ' '],
    provideCompletionItems: (model, position, completionContext) => {
      try {
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

        const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowData);
        const path = getCurrentPath(yamlDocument, absolutePosition);
        const yamlNode = yamlDocument.getIn(path, true);
        const scalarType = isScalar(yamlNode) ? yamlNode.type ?? null : null;

        // if we are in a plain scalar which starts with { or @, we need to add quotes otherwise template expression will break yaml
        const shouldBeQuoted =
          isScalar(yamlNode) &&
          scalarType === 'PLAIN' &&
          typeof yamlNode?.value === 'string' &&
          (yamlNode?.value?.startsWith('{') || yamlNode?.value?.startsWith('@'));

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

        // SPECIAL CASE: Variable expression completion
        // Handle completions inside {{ }} or after @ triggers
        if (
          parseResult.matchType === 'variable-unfinished' ||
          parseResult.matchType === 'at' ||
          parseResult.matchType === 'foreach-variable'
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
              const propertyTypeName = getDetailedTypeDescription(keySchema, { singleLine: true });

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
            typeSuggestions = getTriggerTypeSuggestions(typePrefix, adjustedRange);
          } else {
            // We're in steps context - suggest connector/step types
            typeSuggestions = getConnectorTypeSuggestions(typePrefix, adjustedRange);
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
          // Special case: if we're on a comment line in a with block, skip value detection
          // and go straight to showing connector parameters
          const currentLine = model.getLineContent(lineNumber);
          const isOnCommentLine = currentLine.trim().startsWith('#');

          if (isOnCommentLine) {
            // We're on a comment line in a with block - show connector parameters
            // Skip the value position detection and go straight to parameter suggestions
            // This will fall through to the connector parameter suggestions below
          } else {
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
                } else if (lineUpToCursor.match(/:\s*$/)) {
                  // Generic string placeholder only if the value is still empty
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
          }

          // Continue to show connector parameters for manual triggers or when typing parameter names
          // Will show connector parameters
        }

        // Get connector schema if we detected a connector type
        let schemaToUse: Record<string, z.ZodType> | null = null;

        if (connectorType) {
          schemaToUse = getConnectorParamsSchema(connectorType);
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

              const propertyTypeName = getDetailedTypeDescription(currentSchema, {
                singleLine: true,
              });

              // Create a YAML key-value snippet suggestion with cursor positioning
              let insertText = `${key}: `;
              let insertTextRules = monaco.languages.CompletionItemInsertTextRule.None;

              // For boolean-like parameters, provide default values with cursor positioning
              if (key.includes('enabled') || key.includes('disabled') || key.endsWith('Stream')) {
                insertText = `${key}: \${1:true}`;
                insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
              } else if (key.includes('size') || key.includes('count') || key.includes('limit')) {
                insertText = `${key}: \${1:10}`;
                insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
              } else if (
                key.includes('message') ||
                key.includes('text') ||
                key.includes('content')
              ) {
                insertText = `${key}: "\${1:}"`;
                insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
              } else {
                // Generic case - just add colon and space, then trigger suggestions
                insertText = `${key}: `;
              }

              // If it's kbn-xsrf, skip it since we don't need to suggest it
              if (key === 'kbn-xsrf') {
                continue;
              }

              const suggestion: monaco.languages.CompletionItem = {
                label: key,
                kind: monaco.languages.CompletionItemKind.Variable,
                insertText,
                insertTextRules,
                range,
                sortText: `!${key}`, // High priority sorting
                detail: `🎯 ${connectorType} parameter`,
                documentation: {
                  value: `**${connectorType} Parameter**\n\nType: ${propertyTypeName}\n\nThis parameter is specific to the ${connectorType} connector.`,
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

        for (const [key, currentSchema] of Object.entries(context.shape) as [string, z.ZodType][]) {
          if (lastPathSegment && !key.startsWith(lastPathSegment)) {
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
                typeSuggestions = getTriggerTypeSuggestions(typePrefix, adjustedRange);
              } else {
                // We're in steps context - suggest connector/step types
                typeSuggestions = getConnectorTypeSuggestions(typePrefix, adjustedRange);
              }

              // Return immediately to prevent schema-based literal completions
              return {
                suggestions: typeSuggestions,
                incomplete: false,
              };
            } else {
              // For key completion, provide a custom "type:" completion that triggers snippet completion
              const propertyTypeName = getDetailedTypeDescription(currentSchema, {
                singleLine: true,
              });
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
            const propertyTypeName = getDetailedTypeDescription(currentSchema, {
              singleLine: true,
            });
            suggestions.push(
              getSuggestion(
                key,
                completionContext,
                range,
                scalarType,
                shouldBeQuoted,
                propertyTypeName,
                currentSchema?.description
              )
            );
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
