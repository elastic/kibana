/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { dirname } from 'path';
import { isPlainObject } from 'lodash';
import { IRefResolver } from './ref_resolver';
import {
  DocumentNode,
  ResolvedDocument,
  TraverseDocumentContext,
  ResolvedRef,
  DocumentNodeProcessor,
  RefNode,
  PlainObjectNode,
} from './types';
import { parseRef } from '../utils/parse_ref';
import { toAbsolutePath } from '../utils/to_absolute_path';
import { isPlainObjectType } from '../utils/is_plain_object_type';
import { isChildContext } from './is_child_context';

interface TraverseItem {
  node: DocumentNode;
  context: TraverseDocumentContext;
  /**
   * Keeps track of visited nodes to be able to detect circular references
   */
  visitedDocumentNodes: Set<DocumentNode>;
  parentNode: DocumentNode;
  parentKey: string | number;
  resolvedRef?: ResolvedRef;
}

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

    if (shouldSkipNode(traverseItem, processors)) {
      removeNode(traverseItem);
      continue;
    }

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
      };

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
      // If ref has been inlined by one of the processors it's not a ref node anymore
      // so we can skip the following processors
      if (isRefNode(traverseItem.node) && traverseItem.resolvedRef) {
        processor.ref?.(
          traverseItem.node as RefNode,
          traverseItem.resolvedRef,
          traverseItem.context
        );
      }

      processor.leave?.(traverseItem.node, traverseItem.context);
    }
  }
}

function isTraversableNode(maybeTraversableNode: unknown): boolean {
  // We need to process only objects and arrays. Scalars pass through as is.
  return typeof maybeTraversableNode === 'object' && maybeTraversableNode !== null;
}

export function isRefNode(node: DocumentNode): node is { $ref: string } {
  return isPlainObject(node) && '$ref' in node;
}

function shouldSkipNode(traverseItem: TraverseItem, processors: DocumentNodeProcessor[]): boolean {
  return processors?.some((p) =>
    p.enter?.(traverseItem.node, {
      ...traverseItem.context,
      parentNode: traverseItem.parentNode,
      parentKey: traverseItem.parentKey,
    })
  );
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
