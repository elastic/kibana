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
import { getWorkflowGraph } from '../../../entities/workflows/lib/get_workflow_graph';
import { getCurrentPath, parseWorkflowYamlToJSON } from '../../../../common/lib/yaml_utils';
import { getContextSchemaForPath } from '../../../features/workflow_context/lib/get_context_for_path';
import { getAllConnectors } from '../../../../common/schema';
import {
  VARIABLE_REGEX_GLOBAL,
  PROPERTY_PATH_REGEX,
  UNFINISHED_VARIABLE_REGEX_GLOBAL,
} from '../../../../common/lib/regex';
import { getSchemaAtPath, getZodTypeName, parsePath } from '../../../../common/lib/zod_utils';

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
function generateConnectorSnippet(connectorType: string, shouldBeQuoted: boolean): string {
  const quotedType = shouldBeQuoted ? `"${connectorType}"` : connectorType;

  // Get required parameters for this connector type
  const requiredParams = getRequiredParamsForConnector(connectorType);

  if (requiredParams.length === 0) {
    // No required params, just add empty with block with a placeholder
    const snippet = `${quotedType}\nwith:\n  # Add parameters here. Click Ctrl+Space (Ctrl+I on Mac) to see all available options\n  `;
    return snippet;
  }

  // Create with block with required parameters as placeholders
  let withBlock = `${quotedType}\nwith:`;
  requiredParams.forEach((param) => {
    const placeholder = param.example || param.defaultValue || '';
    
    // Handle complex objects (like body) by formatting as YAML
    if (typeof placeholder === 'object' && placeholder !== null) {
      const yamlContent = formatObjectAsYaml(placeholder, 2);
      withBlock += `\n  ${param.name}:\n${yamlContent}`;
    } else {
      withBlock += `\n  ${param.name}: ${placeholder}`;
    }
  });

  return withBlock;
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
      value.forEach(item => {
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
function getConnectorTypeFromContext(yamlDocument: any, path: any[], model: any, position: any): string | null {
  try {
    console.log('🐛 DEBUG getConnectorTypeFromContext: path =', path);
    console.log('🐛 DEBUG getConnectorTypeFromContext: path.length =', path.length);
    console.log('🐛 DEBUG getConnectorTypeFromContext: position =', position);
    
    // First try the existing path-based detection
    const pathBasedType = getConnectorTypeFromWithBlock(yamlDocument, path);
    if (pathBasedType) {
      return pathBasedType;
    }
    
    // If path is empty or detection failed, try position-based detection
    // This handles cases where cursor is right after "with:" 
    if (path.length === 0 || !path.includes('with')) {
      console.log('🐛 DEBUG: Path empty or no "with", trying position-based detection');
      return getConnectorTypeFromPosition(model, position);
    }
    
    return null;
  } catch (error) {
    console.warn('🐛 ERROR in getConnectorTypeFromContext:', error);
    return null;
  }
}

/**
 * Detect connector type by analyzing YAML structure around the cursor position using Monaco
 */
function getConnectorTypeFromPosition(model: any, position: any): string | null {
  try {
    const currentLineNumber = position.lineNumber;
    const currentLine = model.getLineContent(currentLineNumber);
    
    console.log('🐛 DEBUG: Position analysis - line', currentLineNumber, 'content:', JSON.stringify(currentLine));
    
    // Check if we're inside a "with" block by analyzing indentation and structure
    const isInWithBlock = detectIfInWithBlock(model, currentLineNumber);
    
    if (isInWithBlock) {
      console.log('🐛 DEBUG: Detected cursor is inside a "with" block');
      
      // Look backwards to find the type field for this step
      const connectorType = findConnectorTypeInStep(model, currentLineNumber);
      if (connectorType) {
        console.log('🔍 Found connector type via position:', connectorType);
        return connectorType;
      }
    }
    
    console.log('🐛 DEBUG: No connector type found via position analysis');
    return null;
  } catch (error) {
    console.warn('🐛 ERROR in getConnectorTypeFromPosition:', error);
    return null;
  }
}

/**
 * Detect if the current line is inside a "with" block by analyzing YAML structure
 */
function detectIfInWithBlock(model: any, currentLineNumber: number): boolean {
  const currentLine = model.getLineContent(currentLineNumber);
  const currentIndent = getIndentLevel(currentLine);
  
  console.log('🐛 DEBUG: detectIfInWithBlock - line', currentLineNumber, 'content:', JSON.stringify(currentLine), 'indent:', currentIndent);
  
  // Look backwards to find a "with:" line
  for (let lineNumber = currentLineNumber; lineNumber >= 1; lineNumber--) {
    const line = model.getLineContent(lineNumber);
    const lineIndent = getIndentLevel(line);
    
    console.log('🐛 DEBUG: Checking line', lineNumber, 'indent:', lineIndent, 'content:', JSON.stringify(line.trim()));
    
    // Found a "with:" line
    if (line.trim() === 'with:' || line.trim().endsWith('with:')) {
      console.log('🐛 DEBUG: Found "with:" at line', lineNumber, 'with indent', lineIndent);
      
      // We're in the with block if:
      // 1. The with: line has LESS indentation than current line (we're inside the block)
      // 2. OR if we're on the with: line itself
      if (lineIndent < currentIndent) {
        console.log('🐛 DEBUG: We are INSIDE with block (with indent', lineIndent, '< current indent', currentIndent, ')');
        return true;
      } else if (lineNumber === currentLineNumber) {
        console.log('🐛 DEBUG: We are ON the with: line itself');
        return true;
      } else {
        console.log('🐛 DEBUG: with: line has same/more indentation, we are NOT inside this with block');
        return false;
      }
    }
    
    // Stop if we hit a step boundary (this ensures we don't go into other steps)
    if (line.match(/^\s*-\s+name:/) || line.match(/^\s*steps:/)) {
      console.log('🐛 DEBUG: Hit step/structural boundary at line', lineNumber, 'stopping search');
      break;
    }
    
    // Stop if we encounter a line with significantly less indentation (other major structure)
    if (lineIndent < currentIndent && line.trim() !== '' && !line.includes('with:')) {
      console.log('🐛 DEBUG: Hit major structure boundary at line', lineNumber, 'stopping search');
      break;
    }
  }
  
  console.log('🐛 DEBUG: Not inside any with block');
  return false;
}

/**
 * Find the connector type by looking for the "type:" field in the current step
 */
function findConnectorTypeInStep(model: any, currentLineNumber: number): string | null {
  const currentLine = model.getLineContent(currentLineNumber);
  const currentIndent = getIndentLevel(currentLine);
  
  // Look backwards for the type field, staying within the same step
  for (let lineNumber = currentLineNumber - 1; lineNumber >= 1; lineNumber--) {
    const line = model.getLineContent(lineNumber);
    const lineIndent = getIndentLevel(line);
    
    // Look for type field at the step level (same indentation as name field)
    const typeMatch = line.match(/^\s*type:\s*(.+)$/);
    if (typeMatch) {
      const connectorType = typeMatch[1].trim().replace(/['"]/g, '');
      console.log('🔍 Found connector type:', connectorType, 'at line', lineNumber);
      return connectorType;
    }
    
    // Stop if we hit another step or the steps boundary
    if (line.match(/^\s*-\s+name:/) || line.match(/^\s*steps:/)) {
      console.log('🐛 DEBUG: Hit step boundary, stopping type search at line', lineNumber);
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
 * Get existing parameters in the current with block to avoid suggesting duplicates
 */
function getExistingParametersInWithBlock(model: any, position: any): Set<string> {
  const existingParams = new Set<string>();
  const currentLineNumber = position.lineNumber;
  const currentLine = model.getLineContent(currentLineNumber);
  const currentIndent = getIndentLevel(currentLine);
  
  console.log('🔍 getExistingParametersInWithBlock: line', currentLineNumber, 'indent:', currentIndent);
  
  // First, find the start of the with block
  let withLineNumber = -1;
  let withIndent = -1;
  
  for (let lineNumber = currentLineNumber; lineNumber >= 1; lineNumber--) {
    const line = model.getLineContent(lineNumber);
    const lineIndent = getIndentLevel(line);
    
    if (line.trim() === 'with:' || line.trim().endsWith('with:')) {
      // Make sure this with: is at a level that makes sense for our current position
      if (lineIndent < currentIndent || (lineIndent === currentIndent && lineNumber < currentLineNumber)) {
        withLineNumber = lineNumber;
        withIndent = lineIndent;
        console.log('🔍 Found with block start at line', lineNumber, 'with indent', lineIndent);
        break;
      }
    }
    
    // Stop if we hit a step boundary
    if (line.match(/^\s*-\s+name:/) || line.match(/^\s*steps:/)) {
      break;
    }
  }
  
  if (withLineNumber === -1) {
    console.log('🔍 No with block found');
    return existingParams;
  }
  
  // Now scan from the with line forward to collect existing parameters
  const expectedParamIndent = withIndent + 2; // Parameters should be indented 2 spaces from with:
  
  for (let lineNumber = withLineNumber + 1; lineNumber <= model.getLineCount(); lineNumber++) {
    const line = model.getLineContent(lineNumber);
    const lineIndent = getIndentLevel(line);
    
    // Stop if we've gone past the with block (less indentation) or hit another major structure
    if (line.trim() !== '' && lineIndent <= withIndent) {
      console.log('🔍 Exited with block at line', lineNumber, 'due to indentation');
      break;
    }
    
    // Look for parameters at the expected indentation level
    if (lineIndent === expectedParamIndent) {
      const paramMatch = line.match(/^\s*(\w+):/);
      if (paramMatch) {
        const paramName = paramMatch[1];
        existingParams.add(paramName);
        console.log('🔍 Found existing parameter:', paramName);
      }
    }
    
    // Stop if we hit another step
    if (line.match(/^\s*-\s+name:/)) {
      console.log('🔍 Hit next step at line', lineNumber);
      break;
    }
  }
  
  return existingParams;
}

function getConnectorTypeFromWithBlock(yamlDocument: any, path: any[]): string | null {
  try {
    console.log('🐛 DEBUG getConnectorTypeFromWithBlock: path =', path);
    console.log('🐛 DEBUG getConnectorTypeFromWithBlock: path.length =', path.length);
    
    // Look for a pattern like: steps[n].with.<param> 
    // We need to find the step containing this 'with' block and get its 'type'
    
    if (path.length < 2) {
      console.log('🐛 DEBUG: Path too short, returning null');
      return null;
    }
    
    // Check if we're in a path that includes 'with'
    const withIndex = path.findIndex(segment => segment === 'with');
    console.log('🐛 DEBUG: withIndex =', withIndex);
    
    // Also handle case where we're directly in a with block (path ends with 'with')
    const isInWithBlock = withIndex !== -1 || path[path.length - 1] === 'with';
    
    if (!isInWithBlock) {
      console.log('🐛 DEBUG: No "with" in path, returning null');
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
    
    console.log('🐛 DEBUG: stepPath =', stepPath);
    
    if (stepPath.length < 2 || stepPath[0] !== 'steps') {
      console.log('🐛 DEBUG: Invalid step path, returning null');
      return null;
    }
    
    // Get the step node to find its type
    const stepNode = yamlDocument.getIn(stepPath, true);
    console.log('🐛 DEBUG: stepNode =', stepNode);
    if (!stepNode || !stepNode.has || typeof stepNode.has !== 'function') {
      console.log('🐛 DEBUG: Invalid step node, returning null');
      return null;
    }
    
    const typeNode = stepNode.has('type') ? stepNode.get('type', true) : null;
    console.log('🐛 DEBUG: typeNode =', typeNode);
    if (!typeNode || !typeNode.value) {
      console.log('🐛 DEBUG: No type value, returning null');
      return null;
    }
    
    const connectorType = typeNode.value;
    console.log('🔍 Detected connector type in with block:', connectorType);
    return connectorType;
  } catch (error) {
    console.warn('🐛 ERROR detecting connector type from with block:', error);
    return null;
  }
}

/**
 * Get the specific connector's parameter schema for autocomplete
 */
function getConnectorParamsSchema(connectorType: string): Record<string, any> | null {
  try {
    const allConnectors = getAllConnectors();
    const connector = allConnectors.find((c: any) => c.type === connectorType);
    
    if (!connector || !connector.paramsSchema) {
      console.log('🚫 No paramsSchema found for connector:', connectorType);
      return null;
    }
    
    // Extract the shape from the Zod schema
    if (connector.paramsSchema instanceof z.ZodObject) {
      console.log('✅ Found paramsSchema for connector:', connectorType);
      console.log('📋 Schema keys:', Object.keys(connector.paramsSchema.shape));
      return connector.paramsSchema.shape;
    }
    
    return null;
  } catch (error) {
    console.warn('Error getting connector params schema:', error);
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
  connectorType: string
): Array<{ name: string; example?: string; defaultValue?: string }> {
  // Get all connectors (both static and generated)
  const allConnectors = getAllConnectors();

  // Find the connector by type
  const connector = allConnectors.find((c: any) => c.type === connectorType);

  if (connector && connector.paramsSchema) {
    try {
      // Check if this connector has enhanced examples
      const hasEnhancedExamples = (connector as any).examples?.params;
      
      console.log(`DEBUG getRequiredParamsForConnector - ${connectorType}`);
      console.log('Has enhanced examples:', hasEnhancedExamples);
      console.log('Connector examples:', (connector as any).examples);
      
      if (hasEnhancedExamples) {
        // Use examples directly from enhanced connector
        const exampleParams = (connector as any).examples.params;
        console.log('Using enhanced examples:', exampleParams);
        const result: Array<{ name: string; example?: any; defaultValue?: string }> = [];
        
        for (const [key, value] of Object.entries(exampleParams)) {
          // Include common important parameters for ES APIs
          if (['index', 'id', 'body', 'query', 'size', 'from', 'sort', 'aggs', 'aggregations', 'format'].includes(key)) {
            result.push({ name: key, example: value });
            console.log(`Added enhanced example: ${key} =`, value);
          }
        }
        
        if (result.length > 0) {
          console.log('Returning enhanced examples:', result);
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
      const importantParams = params.filter((p) => ['index', 'id', 'body', 'query', 'size', 'from', 'sort', 'aggs', 'aggregations', 'format'].includes(p.name));
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
  range: monaco.IRange,
  context: monaco.languages.CompletionContext,
  scalarType: Scalar.Type | null,
  shouldBeQuoted: boolean
): monaco.languages.CompletionItem[] {
  const suggestions: monaco.languages.CompletionItem[] = [];

  // Get all connectors
  const allConnectors = getAllConnectors();

  // Helper function to create a suggestion with snippet
  const createSnippetSuggestion = (connectorType: string): monaco.languages.CompletionItem => {
    const snippetText = generateConnectorSnippet(connectorType, shouldBeQuoted);

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
    // Show all matching connectors
    // console.log('Debug autocomplete: typePrefix =', JSON.stringify(typePrefix));
    // console.log('Debug autocomplete: allConnectors count =', allConnectors.length);
    // console.log('Debug autocomplete: sample connector types =', allConnectors.slice(0, 5).map((c: any) => c.type));

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

        const matches = fullMatch || elasticsearchMatch;

        // if (typePrefix === 'e' && connectorType.startsWith('elasticsearch.e')) {
        //   console.log('Debug autocomplete: checking', connectorType, 'fullMatch:', fullMatch, 'elasticsearchMatch:', elasticsearchMatch, 'matches:', matches);
        // }

        return matches;
      });
    //      .slice(0, 50);

    // console.log('Debug autocomplete: matchingConnectors count =', matchingConnectors.length);
    // console.log('Debug autocomplete: first 10 matching =', matchingConnectors.slice(0, 10));

    matchingConnectors.forEach((connectorType) => {
      suggestions.push(createSnippetSuggestion(connectorType));
    });
  }

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

        // SPECIAL CASE: Direct type completion in steps
        // Check if we're trying to complete a type field in a step, regardless of schema validation
        const typeCompletionMatch = lineUpToCursor.match(
          /^\s*-?\s*(?:name:\s*\w+\s*)?type:\s*(.*)$/i
        );

        // console.log('Debug autocomplete: lineUpToCursor =', JSON.stringify(lineUpToCursor));
        // console.log('Debug autocomplete: typeCompletionMatch =', typeCompletionMatch);

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

          const typeSuggestions = getConnectorTypeSuggestions(
            typePrefix,
            adjustedRange,
            completionContext,
            scalarType,
            shouldBeQuoted
          );

          return {
            suggestions: typeSuggestions,
            incomplete: false, // Prevent other providers from adding suggestions
          };
        }

        // 🔍 SPECIAL CASE: Check if we're inside a connector's 'with' block
        console.log('🐛 DEBUG: Current path:', path);
        console.log('🐛 DEBUG: Line up to cursor:', JSON.stringify(lineUpToCursor));
        console.log('🐛 DEBUG: Completion trigger kind:', completionContext.triggerKind);
        console.log('🐛 DEBUG: Is manual trigger (Ctrl+I):', completionContext.triggerKind === monaco.languages.CompletionTriggerKind.Invoke);
        
        // First check if we're in a connector's with block (using enhanced detection)
        const connectorType = getConnectorTypeFromContext(yamlDocument, path, model, position);
        console.log('🐛 DEBUG: Detected connector type:', connectorType);
        
        // If we're in a connector with block, prioritize connector-specific suggestions
        if (connectorType) {
          // Check if we're typing a value (after colon with content)
          const colonIndex = lineUpToCursor.lastIndexOf(':');
          
          // More precise detection: are we actually in a value position?
          // We are in value position if:
          // 1. There's a colon in the line
          // 2. There's non-whitespace content after the colon (we're editing a value)
          // 3. OR if the cursor is right after ": " (ready to type value)
          const isInValuePosition = colonIndex !== -1 && (
            // Pattern 1: "key: value" where cursor is in/after value
            /:\s+\S/.test(lineUpToCursor) ||
            // Pattern 2: "key: " where cursor is right after the space (about to type value)
            lineUpToCursor.endsWith(': ') ||
            // Pattern 3: "key:" where cursor is right after colon
            lineUpToCursor.endsWith(':')
          );
          
          console.log('🐛 DEBUG: colonIndex:', colonIndex, 'isInValuePosition:', isInValuePosition);
          console.log('🐛 DEBUG: lineUpToCursor:', JSON.stringify(lineUpToCursor));
          
          if (isInValuePosition) {
            console.log('🚫 Typing value after colon, not suggesting parameter names');
            
            // Extract the parameter name more carefully
            // Get everything before the colon, remove leading whitespace and dashes
            const beforeColon = lineUpToCursor.substring(0, colonIndex);
            const paramName = beforeColon.replace(/^\s*-?\s*/, '').trim();
            console.log('🎯 Parameter name:', paramName);
            
            // Only provide value suggestions if we have a valid parameter name
            if (paramName && !paramName.includes(' ')) {
              // Provide basic value suggestions based on common parameter patterns
              const valueSuggestions: monaco.languages.CompletionItem[] = [];
              
              if (paramName.includes('enabled') || paramName.includes('disabled') || paramName.endsWith('Stream')) {
                valueSuggestions.push(
                  {
                    label: 'true',
                    kind: monaco.languages.CompletionItemKind.Value,
                    insertText: 'true',
                    range,
                    documentation: 'Boolean true value'
                  },
                  {
                    label: 'false', 
                    kind: monaco.languages.CompletionItemKind.Value,
                    insertText: 'false',
                    range,
                    documentation: 'Boolean false value'
                  }
                );
              } else if (paramName.includes('size') || paramName.includes('count') || paramName.includes('limit')) {
                valueSuggestions.push({
                  label: '10',
                  kind: monaco.languages.CompletionItemKind.Value,
                  insertText: '10',
                  range,
                  documentation: 'Numeric value'
                });
              } else {
                // Generic string placeholder
                valueSuggestions.push({
                  label: '""',
                  kind: monaco.languages.CompletionItemKind.Value,
                  insertText: '""',
                  range,
                  documentation: 'String value',
                  command: { id: 'cursorMove', title: 'Move cursor left', arguments: ['cursorMove', { to: 'left' }] }
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
          console.log('🎯 Will show connector parameters for:', connectorType);
        }
        
        // Get connector schema if we detected a connector type
        let schemaToUse: Record<string, z.ZodType> | null = null;
        
        if (connectorType) {
          schemaToUse = getConnectorParamsSchema(connectorType);
          console.log('🐛 DEBUG: Schema found:', !!schemaToUse);
          console.log('🐛 DEBUG: Searching for connector type:', connectorType);
          
          // Debug: Check if connector exists in the registry
          const allConnectors = getAllConnectors();
          const foundConnector = allConnectors.find((c: any) => c.type === connectorType);
          console.log('🐛 DEBUG: Connector found in registry:', !!foundConnector);
          if (foundConnector) {
            console.log('🐛 DEBUG: Connector details:', foundConnector);
          } else {
            console.log('🐛 DEBUG: Available connector types:', allConnectors.slice(0, 10).map((c: any) => c.type));
          }
          
          if (schemaToUse) {
            console.log('🎯 Using connector-specific schema for:', connectorType);
            console.log('📋 Available parameters:', Object.keys(schemaToUse));
            
            // Get existing parameters in the with block to avoid duplicates using Monaco
            const existingParams = getExistingParametersInWithBlock(model, position);
            console.log('🔍 Existing parameters in with block:', Array.from(existingParams));
            
            // Use the connector's specific parameter schema instead of the generic schema
            for (const [key, currentSchema] of Object.entries(schemaToUse) as [string, z.ZodType][]) {
              // Skip if parameter already exists (unless it's an empty value)
              if (existingParams.has(key)) {
                console.log(`🚫 Skipping existing parameter: ${key}`);
                continue;
              }
              
              // If manually triggered (Ctrl+Space) or no filter, show all parameters
              const isManualTrigger = completionContext.triggerKind === monaco.languages.CompletionTriggerKind.Invoke;
              const shouldSkip = lastPathSegment && !key.startsWith(lastPathSegment) && !isManualTrigger;
              
              if (shouldSkip) {
                continue;
              }

              const propertyTypeName = getZodTypeName(currentSchema);
              
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
              } else if (key.includes('message') || key.includes('text') || key.includes('content')) {
                insertText = `${key}: "\${1:}"`;
                insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
              } else {
                // Generic case - just add colon and space, then trigger suggestions
                insertText = `${key}: `;
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
                  value: `**${connectorType} Parameter**\n\nType: ${propertyTypeName}\n\nThis parameter is specific to the ${connectorType} connector.`
                },
                preselect: true,
                // Trigger autocomplete for value suggestions if no snippet placeholders
                command: insertTextRules === monaco.languages.CompletionItemInsertTextRule.None ? {
                  id: 'editor.action.triggerSuggest',
                  title: 'Trigger Suggest'
                } : undefined
              };
              
              suggestions.push(suggestion);
            }
            
            console.log('🐛 DEBUG: Returning', suggestions.length, 'connector-specific suggestions');
            console.log('🐛 DEBUG: Suggestion labels:', suggestions.map(s => s.label));
            
            // 🎯 CONNECTOR-SPECIFIC MODE: Only return our suggestions, ignore others
            console.log('🎯 CONNECTOR-SPECIFIC MODE: Returning only connector parameters');
            
            // 🎯 SUCCESS: We found connector-specific suggestions and will return only these
            
            // Return the connector-specific suggestions
            return {
              suggestions,
              incomplete: false,
            };
          } else {
            console.log('🐛 DEBUG: No schema found for connector type:', connectorType);
          }
        } else {
          console.log('🐛 DEBUG: Not inside a connector with block');
          console.log('🐛 DEBUG: Path analysis:', {
            fullPath: path,
            hasWithInPath: path.includes('with'),
            pathJoined: path.join('.'),
            isManualTrigger: completionContext.triggerKind === monaco.languages.CompletionTriggerKind.Invoke
          });
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

          // Special handling for the 'type' field to provide better suggestions
          if (key === 'type' && path.length > 0 && path[path.length - 1] === 'steps') {
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

              const typeSuggestions = getConnectorTypeSuggestions(
                typePrefix,
                adjustedRange,
                completionContext,
                scalarType,
                shouldBeQuoted
              );

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
            const propertyTypeName = getZodTypeName(currentSchema);
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
