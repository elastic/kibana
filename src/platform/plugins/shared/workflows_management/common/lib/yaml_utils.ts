/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows/spec/schema';
import type { z } from '@kbn/zod';
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

/**
 * Custom error message formatter for Zod validation errors
 * Transforms overwhelming error messages into user-friendly ones and creates a new ZodError
 */
export function formatValidationError(error: any): { message: string; formattedError: any } {
  // If it's not a Zod error structure, return as-is
  if (!error?.issues || !Array.isArray(error.issues)) {
    const message = error?.message || String(error);
    return { message, formattedError: error };
  }

  const formattedIssues = error.issues.map((issue: any) => {
    let formattedMessage: string;

    // Handle discriminated union errors for type field
    if (issue.code === 'invalid_union_discriminator' && issue.path?.includes('type')) {
      formattedMessage = 'Invalid connector type. Use Ctrl+Space to see available options.';
    }
    // Handle literal type errors for type field (avoid listing all 1000+ options)
    else if (issue.code === 'invalid_literal' && issue.path?.includes('type')) {
      const receivedValue = issue.received;
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
    message: formattedIssues.map((i) => i.message).join(', '),
  };

  return {
    message: formattedError.message,
    formattedError,
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
      let childNode = null;

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
          if (
            item &&
            targetNode &&
            'range' in item &&
            'range' in targetNode &&
            item.range &&
            targetNode.range
          ) {
            return targetNode.range[0] >= item.range[0] && targetNode.range[1] <= item.range[2];
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
          if (
            item &&
            childNode &&
            'range' in item &&
            'range' in childNode &&
            item.range &&
            childNode.range
          ) {
            return item.range[0] === childNode.range[0] && item.range[1] === childNode.range[1];
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

      const isInSteps = path.length >= 3 && path[path.length - 3] === 'steps';

      if (isValueMatch && isInSteps) {
        stepNode = ancestors[ancestors.length - 2] as YAMLMap;

        return visit.BREAK;
      }
    },
  });
  return stepNode;
}
