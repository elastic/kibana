/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows/spec/schema';
import type { ZodError } from '@kbn/zod';
import { z } from '@kbn/zod';
import type { Node, Pair, Scalar, YAMLMap } from 'yaml';
import {
  Document,
  isAlias,
  isCollection,
  isDocument,
  isMap,
  isPair,
  isScalar,
  isSeq,
  parseDocument,
  visit,
} from 'yaml';
import { InvalidYamlSchemaError, InvalidYamlSyntaxError } from './errors';
import type { FormattedZodError, MockZodError } from './errors/invalid_yaml_schema';

interface FormatValidationErrorResult {
  message: string;
  formattedError: FormattedZodError;
}

/**
 * Cache for analyzed union schemas to avoid re-analysis
 */
const UNION_ANALYSIS_CACHE = new Map<string, any>();

/**
 * Cache for schema name mappings extracted from generated schemas
 */
let SCHEMA_NAME_CACHE: Map<string, string> | null = null;

/**
 * Extracts schema names from the generated schemas file to provide better error messages
 */
async function extractSchemaNames(): Promise<Map<string, string>> {
  if (SCHEMA_NAME_CACHE) {
    return SCHEMA_NAME_CACHE;
  }
  
  const schemaNames = new Map<string, string>();
  
  try {
    // Try to dynamically import the generated schemas
    const schemas = await import('@kbn/workflows/common/generated_kibana_schemas');
    
    // Extract schema names and their patterns
    for (const [exportName, schema] of Object.entries(schemas)) {
      if (exportName.startsWith('Cases_connector_properties_')) {
        const connectorType = exportName.replace('Cases_connector_properties_', '');
        schemaNames.set(connectorType, exportName);
      }
    }
  } catch (error) {
    // If we can't import the schemas, we'll work with what we have
    console.warn('Could not load schema names for enhanced error messages:', error);
  }
  
  SCHEMA_NAME_CACHE = schemaNames;
  return schemaNames;
}

/**
 * Dynamically analyzes a Zod union schema to extract user-friendly option descriptions
 */
function analyzeUnionSchema(unionSchema: z.ZodUnion<any>): Array<{ name: string; description: string }> {
  const options: Array<{ name: string; description: string }> = [];
  
  for (const option of unionSchema._def.options) {
    let name = 'unknown';
    let description = 'unknown option';
    
    if (option instanceof z.ZodObject) {
      const shape = option._def.shape();
      
      // Look for discriminator fields (like 'type')
      const discriminator = findDiscriminatorInShape(shape);
      if (discriminator) {
        name = `${discriminator.key}_${discriminator.value.replace(/[^a-zA-Z0-9]/g, '_')}`;
        
        // Get other required properties
        const otherProps = Object.keys(shape)
          .filter(key => key !== discriminator.key && !isOptionalSchema(shape[key]))
          .sort();
        
        const propsText = otherProps.length > 0 ? `, other props: ${otherProps.join(', ')}` : '';
        description = `${discriminator.key}: "${discriminator.value}"${propsText}`;
      } else {
        // No discriminator, list all required properties
        const requiredProps = Object.keys(shape)
          .filter(key => !isOptionalSchema(shape[key]))
          .sort();
        
        if (requiredProps.length > 0) {
          name = `object_with_${requiredProps.join('_')}`;
          description = `props: ${requiredProps.join(', ')}`;
        }
      }
    } else if (option instanceof z.ZodLiteral) {
      name = `literal_${String(option._def.value).replace(/[^a-zA-Z0-9]/g, '_')}`;
      description = `literal value: ${JSON.stringify(option._def.value)}`;
    } else if (option instanceof z.ZodString) {
      name = 'string';
      description = 'string value';
    } else if (option instanceof z.ZodNumber) {
      name = 'number';
      description = 'number value';
    } else if (option instanceof z.ZodBoolean) {
      name = 'boolean';
      description = 'boolean value';
    } else {
      // Try to get type information from the schema
      const typeName = getSchemaTypeName(option);
      name = typeName || 'unknown';
      description = `${typeName || 'unknown'} type`;
    }
    
    options.push({ name, description });
  }
  
  return options;
}

/**
 * Finds discriminator field and value in a Zod object shape
 */
function findDiscriminatorInShape(shape: Record<string, z.ZodType>): { key: string; value: any } | null {
  for (const [key, schema] of Object.entries(shape)) {
    if (schema instanceof z.ZodLiteral) {
      return { key, value: schema._def.value };
    }
  }
  return null;
}

/**
 * Checks if a Zod schema is optional
 */
function isOptionalSchema(schema: z.ZodType): boolean {
  return schema instanceof z.ZodOptional || 
         schema instanceof z.ZodNullable ||
         (schema instanceof z.ZodDefault);
}

/**
 * Gets a human-readable type name from a Zod schema
 */
function getSchemaTypeName(schema: z.ZodType): string | null {
  if (schema instanceof z.ZodString) return 'string';
  if (schema instanceof z.ZodNumber) return 'number';
  if (schema instanceof z.ZodBoolean) return 'boolean';
  if (schema instanceof z.ZodArray) return 'array';
  if (schema instanceof z.ZodObject) return 'object';
  if (schema instanceof z.ZodUnion) return 'union';
  if (schema instanceof z.ZodLiteral) return 'literal';
  if (schema instanceof z.ZodEnum) return 'enum';
  
  // Try to extract from constructor name
  const constructorName = schema.constructor.name;
  if (constructorName.startsWith('Zod')) {
    return constructorName.slice(3).toLowerCase();
  }
  
  return null;
}

/**
 * Dynamically generates a user-friendly error message for union validation failures
 * This analyzes the actual union schema from the error context
 */
function getDynamicUnionErrorMessage(issue: any): string | null {
  if (issue.code !== 'invalid_union' || !issue.unionErrors || !Array.isArray(issue.unionErrors)) {
    return null;
  }
  
  // Try to reconstruct the union schema from the error information
  const fieldName = issue.path && issue.path.length > 0 ? issue.path[issue.path.length - 1] : 'field';
  
  // Analyze the union errors to extract option information
  const options: Array<{ name: string; description: string }> = [];
  
  for (const unionError of issue.unionErrors) {
    if (unionError.issues && Array.isArray(unionError.issues)) {
      // Analyze each union option's validation errors to understand the expected structure
      const optionInfo = analyzeUnionErrorForOption(unionError.issues);
      if (optionInfo) {
        options.push(optionInfo);
      }
    }
  }
  
  if (options.length === 0) {
    return null;
  }
  
  // Generate user-friendly message
  const optionDescriptions = options
    .map((option, index) => `  - ${option.description}`)
    .join('\n');
  
  return `${fieldName} should be oneOf:\n${optionDescriptions}`;
}

/**
 * Analyzes union error issues to understand what option was expected
 */
function analyzeUnionErrorForOption(issues: any[]): { name: string; description: string } | null {
  const requiredFields: string[] = [];
  let discriminatorInfo: { key: string; value: any } | null = null;
  
  for (const issue of issues) {
    if (issue.code === 'invalid_literal' && issue.path && issue.path.length > 0) {
      const fieldName = issue.path[issue.path.length - 1];
      const expectedValue = issue.expected;
      discriminatorInfo = { key: fieldName, value: expectedValue };
    } else if (issue.code === 'invalid_type' && issue.path && issue.path.length > 0) {
      const fieldName = issue.path[issue.path.length - 1];
      if (!requiredFields.includes(fieldName)) {
        requiredFields.push(fieldName);
      }
    }
  }
  
  if (discriminatorInfo) {
    const otherProps = requiredFields.filter(field => field !== discriminatorInfo!.key).sort();
    const propsText = otherProps.length > 0 ? `, other props: ${otherProps.join(', ')}` : '';
    
    // Try to get a better schema name if this looks like a connector type
    let schemaName = `${discriminatorInfo.key}_${String(discriminatorInfo.value).replace(/[^a-zA-Z0-9]/g, '_')}`;
    if (discriminatorInfo.key === 'type' && String(discriminatorInfo.value).startsWith('.')) {
      const connectorType = String(discriminatorInfo.value).substring(1); // Remove the leading dot
      schemaName = `Cases_connector_properties_${connectorType.replace(/-/g, '_')}`;
    }
    
    return {
      name: schemaName,
      description: `${schemaName}\n    ${discriminatorInfo.key}: "${discriminatorInfo.value}"${propsText}`
    };
  } else if (requiredFields.length > 0) {
    return {
      name: `object_with_${requiredFields.join('_')}`,
      description: `props: ${requiredFields.sort().join(', ')}`
    };
  }
  
  return null;
}

/**
 * Main function to get a user-friendly union error message
 * This tries multiple approaches to generate the best possible message
 */
function getGenericUnionErrorMessage(issue: any): string | null {
  if (issue.code !== 'invalid_union') {
    return null;
  }
  
  // Try custom handlers first
  const customMessage = checkCustomUnionHandlers(issue);
  if (customMessage) {
    return customMessage;
  }
  
  // Try dynamic analysis
  const dynamicMessage = getDynamicUnionErrorMessage(issue);
  if (dynamicMessage) {
    return dynamicMessage;
  }
  
  // Fallback: if we can't analyze dynamically, provide a generic helpful message
  const fieldName = issue.path && issue.path.length > 0 ? issue.path[issue.path.length - 1] : 'field';
  return `${fieldName} has an invalid value. Please check the expected format for this field.`;
}

/**
 * Enhanced union error message generator that can be extended for specific patterns
 * This function can be called to register custom union error handlers
 */
export function createUnionErrorHandler(
  pathPattern: string | RegExp,
  handler: (issue: any) => string | null
): void {
  // Store custom handlers for future use
  // This allows plugins or other parts of the system to register custom union error handling
  if (!globalThis.__unionErrorHandlers) {
    globalThis.__unionErrorHandlers = new Map();
  }
  globalThis.__unionErrorHandlers.set(pathPattern, handler);
}

/**
 * Checks custom union error handlers for a match
 */
function checkCustomUnionHandlers(issue: any): string | null {
  if (!globalThis.__unionErrorHandlers || !issue.path) {
    return null;
  }
  
  const pathString = issue.path.join('.');
  
  for (const [pattern, handler] of globalThis.__unionErrorHandlers.entries()) {
    let matches = false;
    
    if (typeof pattern === 'string') {
      matches = pathString === pattern || pathString.endsWith(pattern);
    } else if (pattern instanceof RegExp) {
      matches = pattern.test(pathString);
    }
    
    if (matches) {
      try {
        const result = handler(issue);
        if (result) {
          return result;
        }
      } catch (error) {
        console.warn('Custom union error handler failed:', error);
      }
    }
  }
  
  return null;
}

/**
 * Custom error message formatter for Zod validation errors
 * Transforms overwhelming error messages into user-friendly ones and creates a new ZodError
 */
export function formatValidationError(error: ZodError | MockZodError): FormatValidationErrorResult {
  // If it's not a Zod error structure, return as-is
  if (!error?.issues || !Array.isArray(error.issues)) {
    const message = error?.message || String(error);
    return { message, formattedError: error };
  }

  const formattedIssues = error.issues.map((issue) => {
    let formattedMessage: string;

    // Try generic union error message first
    const genericUnionMessage = getGenericUnionErrorMessage(issue);
    if (genericUnionMessage) {
      formattedMessage = genericUnionMessage;
    }
    // Handle discriminated union errors for type field
    else if (issue.code === 'invalid_union_discriminator' && issue.path?.includes('triggers')) {
      formattedMessage = `Invalid trigger type. Available: manual, alert, scheduled`;
    } else if (issue.code === 'invalid_union_discriminator' && issue.path?.includes('type')) {
      formattedMessage = 'Invalid connector type. Use Ctrl+Space to see available options.';
    }
    // Handle literal type errors for type field (avoid listing all 1000+ options)
    else if (issue.code === 'invalid_literal' && issue.path?.includes('type')) {
      const receivedValue = issue.received as string;
      if (receivedValue?.startsWith?.('elasticsearch.')) {
        formattedMessage = `Unknown Elasticsearch API: "${receivedValue}". Use autocomplete to see valid elasticsearch.* APIs.`;
      } else if (receivedValue?.startsWith?.('kibana.')) {
        formattedMessage = `Unknown Kibana API: "${receivedValue}". Use autocomplete to see valid kibana.* APIs.`;
      } else {
        formattedMessage = `Unknown connector type: "${receivedValue}". Available: elasticsearch.*, kibana.*, slack, http, console, wait, inference.*`;
      }
    }
    // Handle union errors with too many options
    else if (issue.code === 'invalid_union' && issue.path?.includes('type')) {
      formattedMessage = 'Invalid connector type. Use Ctrl+Space to see available options.';
    }
    // Handle connector field validation errors with numeric enum values
    else if (
      issue.code === 'invalid_type' &&
      issue.path?.includes('connector') &&
      issue.message?.includes('Expected "0 | 1 | 2 | 3 | 4 | 5 | 6"')
    ) {
      formattedMessage = 'Incorrect type. Expected ".none" | ".cases-webhook" | ".jira" | ".resilient" | ".servicenow" | ".servicenow-sir" | ".swimlane".';
    }
    // Handle the specific "unknown" code error with numeric enum values (this is the tooltip error)
    else if (
      issue.code === 'unknown' &&
      issue.message?.includes('Expected "0 | 1 | 2 | 3 | 4 | 5 | 6"')
    ) {
      formattedMessage = 'Incorrect type. Expected ".none" | ".cases-webhook" | ".jira" | ".resilient" | ".servicenow" | ".servicenow-sir" | ".swimlane".';
    }
    // Handle connector union validation errors (when passing number instead of object)
    else if (
      issue.code === 'invalid_union' &&
      issue.path?.includes('connector') &&
      (issue.received === 'number' || 
       (issue.unionErrors && issue.unionErrors.some((err: any) => 
         err.issues?.some((nestedIssue: any) => 
           nestedIssue.message?.includes('Expected object, received number')
         )
       )))
    ) {
      formattedMessage = 'Invalid connector value. Expected connector object with type ".none" | ".cases-webhook" | ".jira" | ".resilient" | ".servicenow" | ".servicenow-sir" | ".swimlane".';
    }
    // Handle other connector union validation errors
    else if (
      issue.code === 'invalid_union' &&
      issue.path?.includes('connector') &&
      (issue.message?.includes('0 | 1 | 2 | 3 | 4 | 5 | 6') || issue.message?.includes('Expected "0"'))
    ) {
      formattedMessage = 'Invalid connector configuration. Expected ".none" | ".cases-webhook" | ".jira" | ".resilient" | ".servicenow" | ".servicenow-sir" | ".swimlane".';
    } else if (
      issue.code === 'invalid_type' &&
      issue.path.length === 1 &&
      issue.path[0] === 'triggers'
    ) {
      formattedMessage = `No triggers found. Add at least one trigger.`;
    } else if (
      issue.code === 'invalid_type' &&
      issue.path.length === 1 &&
      issue.path[0] === 'steps'
    ) {
      formattedMessage = `No steps found. Add at least one step.`;
    }
    // Return original message for other errors
    else {
      formattedMessage = issue.message;
    }

    // Return a new issue object with the formatted message
    return {
      ...issue,
      message: formattedMessage,
    };
  });

  // Create a new ZodError-like object with formatted issues
  const formattedError = {
    ...error,
    issues: formattedIssues,
    message: formattedIssues.map((i: { message: string }) => i.message).join(', '),
  };

  return {
    message: formattedError.message,
    formattedError: formattedError as FormattedZodError,
  };
}

const YAML_STRINGIFY_OPTIONS = {
  indent: 2,
  lineWidth: -1,
};

const WORKFLOW_DEFINITION_KEYS_ORDER: Array<keyof WorkflowYaml> = [
  'name',
  'description',
  'enabled',
  'tags',
  'settings',
  'triggers',
  'inputs',
  'consts',
  'steps',
];

function _getDiagnosticMessage(workflowDefinition: Record<string, any>) {
  try {
    const serialized = JSON.stringify(workflowDefinition);
    return serialized.length > 300 ? serialized.substring(0, 300) + '...' : serialized;
  } catch {
    return `[object ${workflowDefinition?.constructor?.name ?? typeof workflowDefinition}]`;
  }
}

/**
 * Stringify the workflow definition to a YAML string.
 * @param workflowDefinition - The workflow definition as a JSON object.
 * @param sortKeys - Whether to sort the keys of the workflow definition.
 * @returns The YAML string of the workflow definition.
 */
export function stringifyWorkflowDefinition(
  workflowDefinition: Record<string, any>,
  sortKeys: boolean = true
) {
  const doc = new Document(workflowDefinition);
  if (sortKeys) {
    if (!doc.contents || !isMap(doc.contents)) {
      throw new Error(
        `Expected doc.contents to be a YAML map when sorting keys, but got type '${typeof doc.contents}'. ` +
          `This usually means the input workflowDefinition is not a plain object. Received: ${_getDiagnosticMessage(
            workflowDefinition
          )}`
      );
    }
    const map = doc.contents as YAMLMap;
    map.items.sort((a, b) => {
      if (!isScalar(a.key) || !isScalar(b.key)) {
        return 0;
      }
      const aIndex = WORKFLOW_DEFINITION_KEYS_ORDER.indexOf(a.key.value as keyof WorkflowYaml);
      const bIndex = WORKFLOW_DEFINITION_KEYS_ORDER.indexOf(b.key.value as keyof WorkflowYaml);
      return aIndex - bIndex;
    });
  }
  return doc.toString(YAML_STRINGIFY_OPTIONS);
}

export function parseWorkflowYamlToJSON<T extends z.ZodSchema>(
  yamlString: string,
  schema: T
): z.SafeParseReturnType<z.input<T>, z.output<T>> | { success: false; error: Error } {
  try {
    let error: Error | undefined;
    const doc = parseDocument(yamlString);

    if (doc.errors.length > 0) {
      return {
        success: false,
        error: new InvalidYamlSyntaxError(doc.errors.map((err) => err.message).join(', ')),
      };
    }

    // Visit all pairs, and check if there're any non-scalar keys
    // TODO: replace with parseDocument(yamlString, { stringKeys: true }) when 'yaml' package updated to 2.6.1
    visit(doc, {
      Pair(_, pair) {
        if (isScalar(pair.key)) {
          return;
        }
        let actualType = 'unknown';
        const range = (pair.key as Node)?.range;
        if (isMap(pair.key)) {
          actualType = 'map';
        } else if (isSeq(pair.key)) {
          actualType = 'seq';
        } else if (isAlias(pair.key)) {
          actualType = 'alias';
        } else if (isDocument(pair.key)) {
          actualType = 'document';
        } else if (isPair(pair.key)) {
          actualType = 'pair';
        } else if (isCollection(pair.key)) {
          actualType = 'collection';
        }
        error = new InvalidYamlSyntaxError(
          `Invalid key type: ${actualType} in ${range ? `range ${range}` : ''}`
        );

        return visit.BREAK;
      },
    });

    if (error) {
      return {
        success: false,
        error,
      };
    }

    const json = doc.toJSON();
    const result = schema.safeParse(json);
    if (!result.success) {
      // Use custom error formatter for better user experience
      const { message, formattedError } = formatValidationError(result.error);
      return {
        success: false,
        error: new InvalidYamlSchemaError(message, formattedError),
      };
    }
    return result;
  } catch (error) {
    return {
      success: false,
      error,
    };
  }
}

export function getPathFromAncestors(
  ancestors: readonly (Node | Document<Node, true> | Pair<unknown, unknown>)[],
  targetNode?: Node
) {
  const path: Array<string | number> = [];

  // Create a new array to store path components
  for (let index = 0; index < ancestors.length; index++) {
    const ancestor = ancestors[index];

    if (isPair(ancestor)) {
      path.push((ancestor.key as Scalar).value as string);
    } else if (isSeq(ancestor)) {
      // If ancestor is a Sequence, we need to find the index of the child item
      let childNode: any = null;

      // Look for the next ancestor that would be contained within this sequence
      for (let i = index + 1; i < ancestors.length; i++) {
        const nextAncestor = ancestors[i];
        if (!isSeq(nextAncestor)) {
          childNode = nextAncestor;
          break;
        }
      }

      // Special case: if this is the last sequence in the ancestors chain,
      // and we have a target node, find which sequence item contains the target
      if (!childNode && index === ancestors.length - 1 && targetNode) {
        const seqIndex = ancestor.items.findIndex((item) => {
          // Check if this sequence item contains our target node
          if (item === targetNode) return true;

          // Check if the target node is contained within this sequence item
          // Avoid using 'in' operator on possibly primitive values
          const itemHasRange =
            typeof item === 'object' &&
            item !== null &&
            Object.prototype.hasOwnProperty.call(item, 'range');
          const targetNodeHasRange =
            typeof targetNode === 'object' &&
            targetNode !== null &&
            Object.prototype.hasOwnProperty.call(targetNode, 'range');
          if (
            item &&
            targetNode &&
            itemHasRange &&
            targetNodeHasRange &&
            (item as any).range &&
            (targetNode as any).range
          ) {
            return (
              (targetNode as any).range[0] >= (item as any).range[0] &&
              (targetNode as any).range[1] <= (item as any).range[2]
            );
          }

          return false;
        });

        if (seqIndex !== -1) {
          path.push(seqIndex);
        }
        continue;
      }

      if (childNode) {
        // Find which index in the sequence this child corresponds to
        const seqIndex = ancestor.items.findIndex((item) => {
          // For debugging: let's be more thorough in our comparison
          if (item === childNode) return true;

          // Sometimes the nodes might not be exactly the same reference
          // but represent the same YAML node - let's check ranges if available
          const itemHasRange =
            typeof item === 'object' &&
            item !== null &&
            Object.prototype.hasOwnProperty.call(item, 'range');
          const childNodeHasRange =
            typeof childNode === 'object' &&
            childNode !== null &&
            Object.prototype.hasOwnProperty.call(childNode, 'range');
          if (
            item &&
            childNode &&
            itemHasRange &&
            childNodeHasRange &&
            (item as any).range &&
            (childNode as any).range
          ) {
            return (
              (item as any).range[0] === (childNode as any).range[0] &&
              (item as any).range[1] === (childNode as any).range[1]
            );
          }

          return false;
        });

        if (seqIndex !== -1) {
          path.push(seqIndex);
        }
      }
    }
  }

  return path;
}

export function getCurrentPath(document: Document, absolutePosition: number) {
  let path: Array<string | number> = [];

  if (!document.contents) return [];

  visit(document, {
    Scalar(key, node, ancestors) {
      if (!node.range) return;
      if (absolutePosition >= node.range[0] && absolutePosition <= node.range[2]) {
        path = getPathFromAncestors(ancestors, node);

        return visit.BREAK;
      }
    },
  });

  return path;
}

export function getStepNode(document: Document, stepName: string): YAMLMap | null {
  let stepNode: YAMLMap | null = null;
  visit(document, {
    Scalar(key, node, ancestors) {
      if (!node.range) {
        return;
      }
      const lastAncestor = ancestors?.[ancestors.length - 1];

      const isNameProp =
        isPair(lastAncestor) && isScalar(lastAncestor.key) && lastAncestor.key.value === 'name';

      const isValueMatch = isNameProp && node.value === stepName;

      const path = getPathFromAncestors(ancestors);

      const isInSteps =
        path.length >= 3 && (path[path.length - 3] === 'steps' || path[path.length - 3] === 'else');

      if (isValueMatch && isInSteps) {
        stepNode = ancestors[ancestors.length - 2] as YAMLMap;

        return visit.BREAK;
      }
    },
  });
  return stepNode;
}

export function getStepNodeAtPosition(
  document: Document,
  absolutePosition: number
): YAMLMap | null {
  let stepNode: YAMLMap | null = null;
  visit(document, {
    Map(key, node, ancestors) {
      if (!node.range) {
        return;
      }
      const path = getPathFromAncestors(ancestors);

      const hasTypeProp = typeof node.get('type') === 'string';

      if (!hasTypeProp) {
        return;
      }

      const isInSteps = path.includes('steps') || path.includes('else');

      if (isInSteps && absolutePosition >= node.range[0] && absolutePosition <= node.range[2]) {
        // assign first found node
        stepNode = node;
        // but continue to find the deepest node
      }
    },
  });
  return stepNode;
}

export function getTriggerNodes(
  yamlDocument: Document
): Array<{ node: any; triggerType: string; typePair: any }> {
  const triggerNodes: Array<{ node: any; triggerType: string; typePair: any }> = [];

  if (!yamlDocument?.contents) return triggerNodes;

  visit(yamlDocument, {
    Pair(key, pair, ancestors) {
      if (!pair.key || !isScalar(pair.key) || pair.key.value !== 'type') {
        return;
      }

      // Check if this is a type field within a trigger
      const path = ancestors.slice();
      let isTriggerType = false;

      // Walk up the ancestors to see if we're in a triggers array
      for (let i = path.length - 1; i >= 0; i--) {
        const ancestor = path[i];
        if (isPair(ancestor) && isScalar(ancestor.key) && ancestor.key.value === 'triggers') {
          isTriggerType = true;
          break;
        }
      }

      if (isTriggerType && isScalar(pair.value)) {
        const triggerType = pair.value.value as string;
        // Find the parent map node that contains this trigger
        const triggerMapNode = ancestors[ancestors.length - 1];
        triggerNodes.push({
          node: triggerMapNode,
          triggerType,
          typePair: pair, // Store the actual type pair for precise positioning
        });
      }
    },
  });

  return triggerNodes;
}

export function getStepNodesWithType(yamlDocument: Document): YAMLMap[] {
  const stepNodes: YAMLMap[] = [];

  if (!yamlDocument?.contents) {
    return stepNodes;
  }

  visit(yamlDocument, {
    Pair(key, pair, ancestors) {
      if (!pair.key || !isScalar(pair.key) || pair.key.value !== 'type') {
        return;
      }

      // Check if this is a type field within a step (not nested inside 'with' or other blocks)
      const path = ancestors.slice();
      let isMainStepType = false;

      // Walk up the ancestors to see if we're in a steps array
      // and ensure this type field is a direct child of a step, not nested in 'with'
      for (let i = path.length - 1; i >= 0; i--) {
        const ancestor = path[i];

        // If we encounter a 'with' field before finding 'steps', this is a nested type
        if (isPair(ancestor) && isScalar(ancestor.key) && ancestor.key.value === 'with') {
          return; // Skip this type field - it's inside a 'with' block
        }

        // If we find 'steps', this could be a main step type
        if (isPair(ancestor) && isScalar(ancestor.key) && ancestor.key.value === 'steps') {
          isMainStepType = true;
          break;
        }
      }

      if (isMainStepType && isScalar(pair.value)) {
        // Find the step node (parent containing the type) - should be the immediate parent map
        const immediateParent = ancestors[ancestors.length - 1];
        if (isMap(immediateParent) && 'items' in immediateParent && immediateParent.items) {
          // Ensure this is a step node by checking it has both 'name' and 'type' fields
          const hasName = immediateParent.items.some(
            (item: any) => isPair(item) && isScalar(item.key) && item.key.value === 'name'
          );
          const hasType = immediateParent.items.some(
            (item: any) => isPair(item) && isScalar(item.key) && item.key.value === 'type'
          );

          if (hasName && hasType) {
            stepNodes.push(immediateParent);
          }
        }
      }
    },
  });

  return stepNodes;
}

export function getTriggerNodesWithType(yamlDocument: Document): YAMLMap[] {
  const triggerNodes: YAMLMap[] = [];

  if (!yamlDocument?.contents) return triggerNodes;

  visit(yamlDocument, {
    Pair(key, pair, ancestors) {
      if (!pair.key || !isScalar(pair.key) || pair.key.value !== 'type') {
        return;
      }

      // Check if this is a type field within a trigger
      const path = ancestors.slice();
      let isTriggerType = false;

      // Walk up the ancestors to see if we're in a triggers array
      for (let i = path.length - 1; i >= 0; i--) {
        const ancestor = path[i];
        if (isPair(ancestor) && isScalar(ancestor.key) && ancestor.key.value === 'triggers') {
          isTriggerType = true;
          break;
        }
      }

      if (isTriggerType && isScalar(pair.value)) {
        // Find the trigger node (parent containing the type)
        for (let i = path.length - 1; i >= 0; i--) {
          const ancestor = path[i];
          if (isMap(ancestor) && 'items' in ancestor && ancestor.items) {
            // Check if this map contains a type field
            const hasType = ancestor.items.some(
              (item: any) => isPair(item) && isScalar(item.key) && item.key.value === 'type'
            );
            if (hasType) {
              triggerNodes.push(ancestor);
              break;
            }
          }
        }
      }
    },
  });

  return triggerNodes;
}
