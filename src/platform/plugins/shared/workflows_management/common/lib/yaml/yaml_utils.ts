/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Node, Pair, Scalar, YAMLMap } from 'yaml';
import { Document, isMap, isPair, isScalar, isSeq, visit } from 'yaml';
import type { WorkflowYaml } from '@kbn/workflows/spec/schema';

// TODO: Remove this eslint-disable once we have a better way to handle any types
/* eslint-disable @typescript-eslint/no-explicit-any */

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
    return serialized.length > 300 ? `${serialized.substring(0, 300)}...` : serialized;
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
        // eslint-disable-next-line no-continue
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
