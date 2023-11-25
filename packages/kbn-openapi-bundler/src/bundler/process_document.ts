/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { dirname } from 'path';
import { isPlainObject } from 'lodash';
import { RefResolver } from './ref_resolver';
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

interface TraverseItem {
  node: DocumentNode;
  context: TraverseDocumentContext;
  parentNode: DocumentNode;
  parentKey: string | number;
  resolvedRef?: ResolvedRef;
}

export async function processDocument(
  resolvedDocument: ResolvedDocument,
  refResolver: RefResolver,
  processors: DocumentNodeProcessor[]
): Promise<void> {
  const nodesToVisit: TraverseItem[] = [
    {
      // DocumentNode is a general abstraction simplifying logic in this file.
      // OpenAPIV3.Document can't be casted directly to DocumentNode.
      node: resolvedDocument.document as unknown as DocumentNode,
      context: {
        rootDocument: resolvedDocument,
        currentDocument: resolvedDocument,
      },
      parentNode: resolvedDocument.document as unknown as DocumentNode,
      parentKey: '',
    },
  ];
  const postOrderTraversalStack: TraverseItem[] = [];

  while (nodesToVisit.length > 0) {
    const traverseItem = nodesToVisit.pop() as TraverseItem;

    if (!isTraversableNode(traverseItem.node)) {
      continue;
    }

    if (shouldSkipNode(traverseItem, processors)) {
      removeNode(traverseItem);
      continue;
    }

    postOrderTraversalStack.push(traverseItem);

    if (isRefNode(traverseItem.node)) {
      const { path, pointer } = parseRef(traverseItem.node.$ref);
      const refAbsolutePath = path
        ? toAbsolutePath(path, dirname(traverseItem.context.currentDocument.absolutePath))
        : traverseItem.context.currentDocument.absolutePath;

      const resolvedRef = await refResolver.resolveRef(refAbsolutePath, pointer);

      traverseItem.resolvedRef = resolvedRef;

      nodesToVisit.push({
        node: resolvedRef.refNode,
        context: {
          rootDocument: traverseItem.context.rootDocument,
          currentDocument: resolvedRef,
        },
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
          parentNode: traverseItem.node,
          parentKey: key,
        });
      }
    }
  }

  for (let i = postOrderTraversalStack.length - 1; i >= 0; --i) {
    const traverseItem = postOrderTraversalStack[i];

    for (const processor of processors) {
      if (traverseItem.resolvedRef) {
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
