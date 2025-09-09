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
      return {
        success: false,
        error: new InvalidYamlSchemaError(result.error.message, result.error),
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
  ancestors: readonly (Node | Document<Node, true> | Pair<unknown, unknown>)[]
) {
  const path: Array<string | number> = [];

  // Create a new array to store path components
  ancestors.forEach((ancestor, index) => {
    if (isPair(ancestor)) {
      path.push((ancestor.key as Scalar).value as string);
    } else if (isSeq(ancestor)) {
      // If ancestor is a Sequence, we need to find the index of the child item
      const childNode = ancestors[index + 1]; // Get the child node
      const seqIndex = ancestor.items.findIndex((item) => item === childNode);
      if (seqIndex !== -1) {
        path.push(seqIndex);
      }
    }
  });

  return path;
}

export function getCurrentPath(document: Document, absolutePosition: number) {
  let path: Array<string | number> = [];

  if (!document.contents) return [];

  visit(document, {
    Scalar(key, node, ancestors) {
      if (!node.range) return;
      if (absolutePosition >= node.range[0] && absolutePosition <= node.range[2]) {
        path = getPathFromAncestors(ancestors);
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
