/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  DocumentNode,
  DocumentNodeProcessor,
  ResolvedRef,
  TraverseDocumentContext,
} from '../types';
import { inlineRef } from './lib/inline_ref';
import { X_SOURCE_FILE_PATH } from './lib/known_custom_props';

export type DereferenceConditionallyInliningPredicate = (
  node: DocumentNode,
  resolvedRef: ResolvedRef,
  context: TraverseDocumentContext
) => boolean;

export function createDereferenceConditionallyProcessor(
  inliningPredicate?: DereferenceConditionallyInliningPredicate
): DocumentNodeProcessor {
  return {
    ref(node, resolvedRef, context) {
      if (!resolvedRef.pointer.startsWith('/components')) {
        throw new Error(`$ref pointer must start with "/components"`);
      }

      if (inliningPredicate?.(node, resolvedRef, context)) {
        inlineRef(node, resolvedRef);
      } else {
        if (!context.rootDocument.document.components) {
          context.rootDocument.document.components = {};
        }

        node.$ref = saveComponent(
          resolvedRef,
          context.rootDocument.document.components as Record<string, unknown>
        );
      }
    },
  };
}

function saveComponent(ref: ResolvedRef, components: Record<string, unknown>): string {
  const segments = ref.pointer.split('/').slice(2);
  let target = components;

  while (segments.length > 0) {
    const segment = segments.shift() as string;

    if (!target[segment]) {
      target[segment] = {};
    }

    target = target[segment] as Record<string, unknown>;
  }

  Object.assign(target, ref.refNode);

  target[X_SOURCE_FILE_PATH] = ref.absolutePath;

  return `#${ref.pointer}`;
}
