/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dirname } from 'path';
import { IRefResolver } from '../ref_resolver/ref_resolver';
import { ResolvedDocument } from '../ref_resolver/resolved_document';
import { parseRef } from '../../utils/parse_ref';
import { toAbsolutePath } from '../../utils/to_absolute_path';
import { isPlainObjectType } from '../../utils/is_plain_object_type';
import { isChildContext } from './is_child_context';
import { TraverseItem } from './traverse_item';
import { createNodeContext } from './transform_traverse_item_to_node_context';
import { DocumentNodeProcessor } from './document_processors/types/document_node_processor';
import { DocumentNode, PlainObjectNode, RefNode } from './types/node';
import { TraverseDocumentContext } from './types/context';

export async function processDocument(
  resolvedDocument: ResolvedDocument,
  refResolver: IRefResolver,
  processors: DocumentNodeProcessor[]
): Promise<void> {
  const nodesToVisit: TraverseItem[] = [
    {
      node: resolvedDocument.document,
      context: {
        resolvedDocument,
      },
      visitedDocumentNodes: new Set(),
      parentNode: resolvedDocument.document,
      parentKey: '',
    },
  ];
  const postOrderTraversalStack: TraverseItem[] = [];

  while (nodesToVisit.length > 0) {
    const traverseItem = nodesToVisit.pop() as TraverseItem;

    if (!isTraversableNode(traverseItem.node)) {
      continue;
    }

    if (traverseItem.visitedDocumentNodes.has(traverseItem.node)) {
      // Circular reference in the current document detected
      continue;
    }

    traverseItem.visitedDocumentNodes.add(traverseItem.node);

    if (shouldRemoveSubTree(traverseItem, processors)) {
      removeNode(traverseItem);
      continue;
    }

    applyEnterProcessors(traverseItem, processors);

    postOrderTraversalStack.push(traverseItem);

    if (isRefNode(traverseItem.node)) {
      const currentDocument = isChildContext(traverseItem.context)
        ? traverseItem.context.resolvedRef
        : traverseItem.context.resolvedDocument;
      const { path, pointer } = parseRef(traverseItem.node.$ref);
      const refAbsolutePath = path
        ? toAbsolutePath(path, dirname(currentDocument.absolutePath))
        : currentDocument.absolutePath;
      const absoluteRef = `${refAbsolutePath}#${pointer}`;

      if (isCircularRef(absoluteRef, traverseItem.context)) {
        continue;
      }

      const resolvedRef = await refResolver.resolveRef(refAbsolutePath, pointer);
      const childContext = {
        resolvedRef,
        parentContext: traverseItem.context,
        followedRef: absoluteRef,
      } as const;

      traverseItem.resolvedRef = resolvedRef;

      nodesToVisit.push({
        node: resolvedRef.refNode,
        context: childContext,
        visitedDocumentNodes: new Set(),
        parentNode: traverseItem.parentNode,
        parentKey: traverseItem.parentKey,
      });

      continue;
    }

    if (Array.isArray(traverseItem.node)) {
      for (let i = 0; i < traverseItem.node.length; ++i) {
        const nodeItem = traverseItem.node[i];

        nodesToVisit.push({
          node: nodeItem as DocumentNode,
          context: traverseItem.context,
          visitedDocumentNodes: traverseItem.visitedDocumentNodes,
          parentNode: traverseItem.node,
          parentKey: i,
        });
      }
    }

    if (isPlainObjectType(traverseItem.node)) {
      for (const key of Object.keys(traverseItem.node)) {
        const value = traverseItem.node[key];

        nodesToVisit.push({
          node: value as DocumentNode,
          context: traverseItem.context,
          visitedDocumentNodes: traverseItem.visitedDocumentNodes,
          parentNode: traverseItem.node,
          parentKey: key,
        });
      }
    }
  }

  for (let i = postOrderTraversalStack.length - 1; i >= 0; --i) {
    const traverseItem = postOrderTraversalStack[i];

    for (const processor of processors) {
      const context = createNodeContext(traverseItem);

      // If ref has been inlined by one of the processors it's not a ref node anymore
      // so we can skip the following processors
      if (isRefNode(traverseItem.node) && traverseItem.resolvedRef) {
        processor.onRefNodeLeave?.(traverseItem.node as RefNode, traverseItem.resolvedRef, context);
      }

      processor.onNodeLeave?.(traverseItem.node, context);
    }
  }
}

function isTraversableNode(maybeTraversableNode: unknown): boolean {
  // We need to process only objects and arrays. Scalars pass through as is.
  return typeof maybeTraversableNode === 'object' && maybeTraversableNode !== null;
}

export function isRefNode(node: unknown): node is { $ref: string } {
  return isPlainObjectType(node) && '$ref' in node;
}

function applyEnterProcessors(
  traverseItem: TraverseItem,
  processors: DocumentNodeProcessor[]
): void {
  const context = createNodeContext(traverseItem);

  for (const processor of processors) {
    processor.onNodeEnter?.(traverseItem.node, context);
  }
}

/**
 * Removes a node with its subtree
 */
function shouldRemoveSubTree(
  traverseItem: TraverseItem,
  processors: DocumentNodeProcessor[]
): boolean {
  const context = createNodeContext(traverseItem);

  return processors.some((p) => p.shouldRemove?.(traverseItem.node, context));
}

function removeNode(traverseItem: TraverseItem): void {
  if (Array.isArray(traverseItem.parentNode) && typeof traverseItem.parentKey === 'number') {
    traverseItem.parentNode.splice(traverseItem.parentKey, 1);
    return;
  }

  delete (traverseItem.parentNode as PlainObjectNode)[traverseItem.parentKey];
}

function isCircularRef(absoluteRef: string, context: TraverseDocumentContext): boolean {
  let nextContext: TraverseDocumentContext | undefined = context;

  if (!isChildContext(nextContext)) {
    return false;
  }

  do {
    if (nextContext.followedRef === absoluteRef) {
      return true;
    }

    nextContext = nextContext.parentContext;
  } while (nextContext);

  return false;
}
