/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
// TODO: refactor this file to be more composable, easier to read and test

import moment from 'moment-timezone';
import type { Document, Node, Pair, Scalar } from 'yaml';
import { isMap, isPair, isScalar, parseDocument, visit, YAMLParseError } from 'yaml';
import { monaco } from '@kbn/monaco';
import type { BuiltInStepType, ConnectorTypeInfo, TriggerType } from '@kbn/workflows';
import {
  AlertRuleTriggerSchema,
  ForEachStepSchema,
  HttpStepSchema,
  IfStepSchema,
  ManualTriggerSchema,
  MergeStepSchema,
  ParallelStepSchema,
  ScheduledTriggerSchema,
  WaitStepSchema,
} from '@kbn/workflows';
import { WorkflowGraph } from '@kbn/workflows/graph';
import { z } from '@kbn/zod';
import { getCachedAllConnectors } from './connectors_cache';
import { generateBuiltInStepSnippet } from './snippets/generate_builtin_step_snippet';
import {
  connectorTypeRequiresConnectorId,
  generateConnectorSnippet,
  getConnectorIdSuggestions,
  getConnectorInstancesForType,
  getConnectorTypeFromContext,
  getEnhancedTypeInfo,
  getExistingParametersInWithBlock,
} from './snippets/generate_connector_snippet';
import {
  generateRRuleTriggerSnippet,
  generateTriggerSnippet,
} from './snippets/generate_trigger_snippet';
import {
  createLiquidFilterCompletions,
  createLiquidSyntaxCompletions,
  createLiquidBlockKeywordCompletions,
} from './liquid_completions';
import {
  LIQUID_FILTER_REGEX,
  LIQUID_BLOCK_FILTER_REGEX,
  LIQUID_BLOCK_KEYWORD_REGEX,
  LIQUID_BLOCK_START_REGEX,
  LIQUID_BLOCK_END_REGEX,
  VARIABLE_REGEX_GLOBAL,
  PROPERTY_PATH_REGEX,
  UNFINISHED_VARIABLE_REGEX_GLOBAL,
} from '../../../../common/lib/regex';
import { getCurrentPath, parseWorkflowYamlToJSON } from '../../../../common/lib/yaml_utils';
import { getDetailedTypeDescription, getSchemaAtPath, parsePath } from '../../../../common/lib/zod';
import { getCachedDynamicConnectorTypes } from '../../../../common/schema';
import { getContextSchemaForPath } from '../../../features/workflow_context/lib/get_context_for_path';

// Cache for built-in step types extracted from schema
let builtInStepTypesCache: Array<{
  type: string;
  description: string;
  icon: monaco.languages.CompletionItemKind;
}> | null = null;

const TIMEZONE_NAMES_SORTED = moment.tz.names().sort();

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
function isInTriggersContext(path: (string | number)[]): boolean {
  // Check if the path includes 'triggers' at any level
  // Examples: ['triggers'], ['triggers', 0], ['triggers', 0, 'with'], etc.
  return path.length > 0 && path[0] === 'triggers';
}

/**
 * Detect if we're in a scheduled trigger's with block
 */
function isInScheduledTriggerWithBlock(yamlDocument: Document, absolutePosition: number): boolean {
  let result = false;

  visit(yamlDocument, {
    Map(key, node, ancestors) {
      if (!node.range) {
        return;
      }
      if (node.get('type') !== 'scheduled') {
        return;
      }

      // Check if we're inside this trigger's range
      if (absolutePosition < node.range[0] || absolutePosition > node.range[2]) {
        return;
      }

      // Find the 'with' property node within this trigger
      const withPair = node.items.find(
        (item) => isPair(item) && isScalar(item.key) && item.key.value === 'with'
      ) as Pair<Scalar, Node> | undefined;

      if (withPair?.value?.range) {
        // Check if the current position is within the with block's range
        if (
          absolutePosition >= withPair.value.range[0] &&
          absolutePosition <= withPair.value.range[2]
        ) {
          // Check if there's already an existing rrule or every configuration
          if (hasExistingScheduleConfiguration(withPair.value)) {
            // Don't show rrule suggestions if there's already a schedule configuration
            result = false;
            return visit.BREAK;
          }

          result = true;
          return visit.BREAK;
        }
      }
    },
  });

  return result;
}

/**
 * Check if there's already an existing schedule configuration (rrule or every) in the with block
 */
function hasExistingScheduleConfiguration(withNode: Node): boolean {
  if (!withNode || !isMap(withNode)) {
    return false;
  }

  // Check for existing 'rrule' or 'every' properties
  const items = withNode.items || [];

  for (const item of items) {
    if (isPair(item) && isScalar(item.key)) {
      const keyValue = item.key.value;
      if (keyValue === 'rrule' || keyValue === 'every') {
        return true;
      }
    }
  }

  return false;
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
    | 'liquid-filter'
    | 'liquid-block-filter'
    | 'liquid-syntax'
    | 'liquid-block-keyword'
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

/**
 * Checks if the current position is inside a liquid block by looking for {%- liquid ... -%} tags
 *
 * A position is considered "inside" a liquid block when:
 * - The cursor is positioned after a `{%- liquid` (or `{% liquid`) opening tag
 * - AND before the corresponding `-%}` (or `%}`) closing tag
 *
 * Examples:
 * ```
 * {%- liquid
 *   assign x = 1  <-- INSIDE (cursor here shows liquid block keywords)
 *   echo x        <-- INSIDE
 * -%}
 * regular text    <-- OUTSIDE (no liquid block keywords)
 * ```
 *
 * Note: This implementation uses simple counting (openings > closings)
 */
function isInsideLiquidBlock(fullText: string, position: monaco.Position): boolean {
  // Get text from start to cursor position
  const textUpToPosition =
    fullText.split('\n').slice(0, position.lineNumber).join('\n') +
    fullText.split('\n')[position.lineNumber - 1].substring(0, position.column - 1);

  // Reset regex lastIndex to ensure fresh matching
  LIQUID_BLOCK_START_REGEX.lastIndex = 0;
  LIQUID_BLOCK_END_REGEX.lastIndex = 0;

  // Count opening and closing liquid blocks - simple and effective
  const openingMatches = Array.from(textUpToPosition.matchAll(LIQUID_BLOCK_START_REGEX));
  const closingMatches = Array.from(textUpToPosition.matchAll(LIQUID_BLOCK_END_REGEX));

  // If we have more openings than closings, we're inside a liquid block
  return openingMatches.length > closingMatches.length;
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

  // Check for Liquid filter completion FIRST (e.g., "{{ variable | fil")
  const liquidFilterMatch = lineUpToCursor.match(LIQUID_FILTER_REGEX);
  if (liquidFilterMatch) {
    const filterPrefix = liquidFilterMatch[1] || '';
    return {
      fullKey: filterPrefix,
      pathSegments: null,
      matchType: 'liquid-filter',
      match: liquidFilterMatch,
    };
  }

  // Check for Liquid block filter completion (e.g., "assign variable = value | fil")
  const liquidBlockFilterMatch = lineUpToCursor.match(LIQUID_BLOCK_FILTER_REGEX);
  if (liquidBlockFilterMatch) {
    const filterPrefix = liquidBlockFilterMatch[1] || '';
    return {
      fullKey: filterPrefix,
      pathSegments: null,
      matchType: 'liquid-block-filter',
      match: liquidBlockFilterMatch,
    };
  }

  // Check for Liquid block keyword completion (e.g., "  assign" or "  cas")
  const liquidBlockKeywordMatch = lineUpToCursor.match(LIQUID_BLOCK_KEYWORD_REGEX);
  if (liquidBlockKeywordMatch) {
    const keywordPrefix = liquidBlockKeywordMatch[1] || '';
    return {
      fullKey: keywordPrefix,
      pathSegments: null,
      matchType: 'liquid-block-keyword',
      match: liquidBlockKeywordMatch,
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

  // Check for Liquid syntax completion (e.g., "{% ")
  if (lineUpToCursor.match(/\{\%\s*\w*$/)) {
    return {
      fullKey: lastWordBeforeCursor || '',
      pathSegments: null,
      matchType: 'liquid-syntax',
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
 * Get appropriate Monaco completion kind for different connector types
 */
function getConnectorCompletionKind(connectorType: string): monaco.languages.CompletionItemKind {
  if (connectorType.startsWith('elasticsearch')) {
    return monaco.languages.CompletionItemKind.Struct; // Will use custom Elasticsearch logo
  }
  if (connectorType.startsWith('kibana')) {
    return monaco.languages.CompletionItemKind.Module; // Will use custom Kibana logo
  }
  if (connectorType === 'console') {
    return monaco.languages.CompletionItemKind.Variable; // Will use custom Console icon
  }
  return monaco.languages.CompletionItemKind.Function;
}

/**
 * Get the specific connector's parameter schema for autocomplete
 */
// Cache for connector schemas to avoid repeated processing
const connectorSchemaCache = new Map<string, Record<string, z.ZodType> | null>();

// Cache for connector type suggestions to avoid recalculating on every keystroke
const connectorTypeSuggestionsCache = new Map<string, monaco.languages.CompletionItem[]>();

function getConnectorParamsSchema(
  connectorType: string,
  dynamicConnectorTypes?: Record<string, ConnectorTypeInfo>
): Record<string, z.ZodType> | null {
  // Check cache first
  if (connectorSchemaCache.has(connectorType)) {
    return connectorSchemaCache.get(connectorType)!;
  }

  try {
    const allConnectors = getCachedAllConnectors(dynamicConnectorTypes);
    const connector = allConnectors.find((c) => c.type === connectorType);

    if (!connector || !connector.paramsSchema) {
      // No paramsSchema found for connector
      connectorSchemaCache.set(connectorType, null);
      return null;
    }

    // Handle function-generated schemas (like the complex union schemas)
    let actualSchema = connector.paramsSchema;
    if (typeof connector.paramsSchema === 'function') {
      try {
        actualSchema = (connector.paramsSchema as Function)();
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
      const commonProperties: Record<string, z.ZodType> = {};

      // Helper function to extract properties from any schema type
      const extractPropertiesFromSchema = (schema: z.ZodType): Record<string, z.ZodType> => {
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
          const existsInAll = unionOptions.every((option: z.ZodType) => {
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
      const extractPropertiesFromSchema = (schema: z.ZodType): Record<string, z.ZodType> => {
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
      const commonProperties: Record<string, z.ZodType> = {};

      // Helper function to extract properties from any schema type (reuse from above)
      const extractPropertiesFromSchema = (schema: z.ZodType): Record<string, z.ZodType> => {
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
        const firstOptionProps = extractPropertiesFromSchema(unionOptions[0] as z.ZodType);

        // Check each property in the first option
        for (const [key, schema] of Object.entries(firstOptionProps)) {
          // Check if this property exists in ALL other options
          const existsInAll = unionOptions.every((option) => {
            const optionProps = extractPropertiesFromSchema(option as z.ZodType);
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
 * Get connector type suggestions with better grouping and filtering
 */
function getConnectorTypeSuggestions(
  typePrefix: string,
  range: monaco.IRange,
  context: monaco.languages.CompletionContext,
  scalarType: Scalar.Type | null,
  shouldBeQuoted: boolean,
  dynamicConnectorTypes?: Record<string, ConnectorTypeInfo>
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
  const allConnectors = getCachedAllConnectors(dynamicConnectorTypes);

  // Helper function to create a suggestion with snippet
  const createSnippetSuggestion = (connectorType: string): monaco.languages.CompletionItem => {
    const snippetText = generateConnectorSnippet(connectorType, {}, dynamicConnectorTypes);

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
    const connector = allConnectors.find((c) => c.type === connectorType);

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
      .filter((c) => c.type.startsWith(namespacePrefix))
      .map((c) => c.type)
      .filter((api) => api.toLowerCase().includes(typePrefix.toLowerCase()));

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
      .map((c) => c.type)
      .filter((connectorType) => {
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

/**
 * Get RRule scheduling pattern suggestions
 */
function getRRuleSchedulingSuggestions(range: monaco.IRange): monaco.languages.CompletionItem[] {
  const suggestions: monaco.languages.CompletionItem[] = [];

  const rrulePatterns = [
    {
      label: 'Daily at 9 AM',
      description: 'Run daily at 9:00 AM UTC',
      pattern: 'daily' as const,
    },
    {
      label: 'Business hours (weekdays 8 AM & 5 PM)',
      description: 'Run on weekdays at 8 AM and 5 PM EST',
      pattern: 'weekly' as const,
    },
    {
      label: 'Monthly on 1st and 15th',
      description: 'Run monthly on 1st and 15th at 10:30 AM UTC',
      pattern: 'monthly' as const,
    },
    {
      label: 'Custom RRule',
      description: 'Create a custom RRule configuration with all options',
      pattern: 'custom' as const,
    },
  ];

  rrulePatterns.forEach(({ label, description, pattern }) => {
    const snippetText = generateRRuleTriggerSnippet(pattern, {
      monacoSuggestionFormat: true,
    });

    // Extended range for multi-line insertion
    const extendedRange = {
      startLineNumber: range.startLineNumber,
      endLineNumber: range.endLineNumber,
      startColumn: range.startColumn,
      endColumn: Math.max(range.endColumn, 1000),
    };

    suggestions.push({
      label,
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: snippetText,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range: extendedRange,
      documentation: description,
      filterText: label,
      sortText: `!rrule-${pattern}`, // Priority prefix for RRule suggestions
      detail: 'RRule scheduling pattern',
      preselect: false,
    });
  });

  return suggestions;
}

/**
 * Get timezone suggestions for tzid field
 */
function getTimezoneSuggestions(
  range: monaco.IRange,
  prefix: string = ''
): monaco.languages.CompletionItem[] {
  const suggestions: monaco.languages.CompletionItem[] = [];

  const filteredTimezones = prefix
    ? TIMEZONE_NAMES_SORTED.filter((tz) => tz.toLowerCase().includes(prefix.toLowerCase()))
    : TIMEZONE_NAMES_SORTED;

  // Limit to 25 suggestions for performance
  const limitedTimezones = filteredTimezones.slice(0, 25);

  limitedTimezones.forEach((timezone) => {
    const offset = moment.tz(timezone).format('Z');
    const offsetText = moment.tz(timezone).format('z');

    suggestions.push({
      label: timezone,
      kind: monaco.languages.CompletionItemKind.EnumMember,
      insertText: timezone,
      range,
      documentation: {
        value: `**${timezone}**\n\nOffset: ${offset} (${offsetText})\n\nTimezone identifier for RRule scheduling.`,
      },
      filterText: timezone,
      sortText: timezone.startsWith('UTC') ? `!${timezone}` : timezone, // Prioritize UTC timezones
      detail: `Timezone: ${offset}`,
      preselect: timezone === 'UTC',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, // Ensure full replacement
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
    detail: `${type}${description ? `: ${description}` : ''}`,
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
  dynamicConnectorTypes?: Record<string, ConnectorTypeInfo>
): monaco.languages.CompletionItemProvider {
  return {
    // Trigger characters for completion:
    // '@' - variable references
    // '.' - property access within variables
    // ' ' - space, used for separating tokens in Liquid syntax
    // '|' - Liquid filters (e.g., {{ variable | filter }})
    // '{' - start of Liquid blocks (e.g., {{ ... }})
    triggerCharacters: ['@', '.', ' ', '|', '{'],
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

        let range: monaco.IRange;

        if (completionContext.triggerCharacter === ' ') {
          // When triggered by space, set range to start at current position
          // This tells Monaco there's no prefix to filter against
          range = {
            startLineNumber: lineNumber,
            endLineNumber: lineNumber,
            startColumn: position.column,
            endColumn: position.column,
          };
        } else {
          // Normal range calculation
          range = {
            startLineNumber: lineNumber,
            endLineNumber: lineNumber,
            startColumn,
            endColumn,
          };
        }

        const absolutePosition = model.getOffsetAt(position);
        const suggestions: monaco.languages.CompletionItem[] = [];
        const value = model.getValue();

        const yamlDocument = parseDocument(value);
        // TODO: use the yaml document from the store
        // const yamlDocument = useSelector(selectYamlDocument);

        // Try to parse with the strict schema first
        const result = parseWorkflowYamlToJSON(value, workflowYamlSchema);

        // If strict parsing fails, try with a more lenient approach for completion
        let workflowData = 'success' in result && result.success ? result.data : null;
        if (result.error) {
          // Try to parse the YAML as-is without strict schema validation
          try {
            const parsedYaml = yamlDocument.toJS();

            // If we have basic workflow structure, use it for completion context
            if (
              parsedYaml &&
              typeof parsedYaml === 'object' &&
              ('steps' in parsedYaml || 'triggers' in parsedYaml)
            ) {
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

        const workflowGraph =
          workflowData && workflowData.steps
            ? WorkflowGraph.fromWorkflowDefinition(workflowData)
            : null;
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
          context = getContextSchemaForPath(workflowData, workflowGraph!, path);
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
          (parseResult.matchType === 'variable-unfinished' ||
            parseResult.matchType === 'at' ||
            parseResult.matchType === 'foreach-variable') &&
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
              incomplete: true,
            };
          }
        }
        // SPECIAL CASE: Liquid filter completion
        if (parseResult.matchType === 'liquid-filter') {
          const filterPrefix = parseResult.fullKey;
          const liquidFilterSuggestions = createLiquidFilterCompletions(range, filterPrefix);

          return {
            suggestions: liquidFilterSuggestions,
            incomplete: false,
          };
        }

        // SPECIAL CASE: Liquid block filter completion (pipe within liquid blocks)
        if (parseResult.matchType === 'liquid-block-filter') {
          // Check if we're actually inside a liquid block
          const isInLiquidBlock = isInsideLiquidBlock(model.getValue(), position);

          if (isInLiquidBlock) {
            const filterPrefix = parseResult.fullKey;
            const liquidFilterSuggestions = createLiquidFilterCompletions(range, filterPrefix);

            return {
              suggestions: liquidFilterSuggestions,
              incomplete: false,
            };
          }
        }

        // SPECIAL CASE: Liquid syntax completion ({% %})
        if (parseResult.matchType === 'liquid-syntax') {
          const syntaxSuggestions = createLiquidSyntaxCompletions(range);

          return {
            suggestions: syntaxSuggestions,
            incomplete: false,
          };
        }

        // SPECIAL CASE: Liquid block keyword completion (inside {%- liquid ... -%})
        if (parseResult.matchType === 'liquid-block-keyword') {
          // Check if we're actually inside a liquid block
          const isInLiquidBlock = isInsideLiquidBlock(model.getValue(), position);

          if (isInLiquidBlock) {
            const keywordSuggestions = createLiquidBlockKeywordCompletions(
              range,
              parseResult.fullKey
            );

            return {
              suggestions: keywordSuggestions,
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
            typeSuggestions = getConnectorTypeSuggestions(
              typePrefix,
              adjustedRange,
              completionContext,
              scalarType,
              shouldBeQuoted,
              currentDynamicConnectorTypes
            );
          }

          // console.log('typeSuggestions[0]', typeSuggestions[0]);

          return {
            suggestions: typeSuggestions,
            incomplete: true, // Prevent other providers from adding suggestions
          };
        }

        // 🔍 SPECIAL CASE: Check if we're inside a connector's 'with' block
        // Checking if we're inside a connector's 'with' block

        // First check if we're in a connector's with block (using enhanced detection)
        let connectorType = getConnectorTypeFromContext(yamlDocument, path, model, position);
        // Detected connector type

        // Check if we're editing a timezone field (tzid or timezone) - works in any context
        const timezoneLine = model.getLineContent(position.lineNumber);
        const tzidLineUpToCursor = timezoneLine.substring(0, position.column - 1);
        const timezoneFieldMatch = tzidLineUpToCursor.match(/^\s*(?:tzid|timezone)\s*:\s*(.*)$/);

        if (timezoneFieldMatch) {
          const prefix = timezoneFieldMatch[1].trim();

          const tzidValueStart =
            timezoneFieldMatch.index! + timezoneFieldMatch[0].indexOf(timezoneFieldMatch[1]);
          const tzidValueRange = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: tzidValueStart + 1,
            endColumn: position.column,
          };

          const timezoneSuggestions = getTimezoneSuggestions(tzidValueRange, prefix);

          return {
            suggestions: timezoneSuggestions,
            incomplete: true,
          };
        }

        // Check if we're in a scheduled trigger's with block for RRule suggestions
        if (isInScheduledTriggerWithBlock(yamlDocument, absolutePosition)) {
          // We're in a scheduled trigger's with block - provide RRule suggestions
          const rruleSuggestions = getRRuleSchedulingSuggestions(range);

          return {
            suggestions: rruleSuggestions,
            incomplete: false,
          };
        }

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
                      const stepNode = yamlDocument.getIn(stepPath, true);
                      if (stepNode && isMap(stepNode) && !stepNode.has('connector-id')) {
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
          const { connectorType: connectorTypeFromSuggestConnectorId } = shouldSuggestConnectorId;
          connectorType = connectorTypeFromSuggestConnectorId;
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
                typeSuggestions = getTriggerTypeSuggestions(typePrefix, adjustedRange);
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
