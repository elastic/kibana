/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DocumentNodeProcessor, ResolvedRef } from '../types';
import { hasProp } from '../../utils/has_prop';
import { inlineRef } from './utils/inline_ref';
import { X_SOURCE_FILE_PATH } from '../known_custom_props';

/**
 * Creates a node processor to bundle and conditionally dereference document references.
 *
 * Bundling means all external references like `../../some_file.schema.yaml#/components/schemas/SomeSchema` saved
 * to the result document under corresponding path `components` -> `schemas` -> `SomeSchema` and `$ref` property's
 * values is updated to `#/components/schemas/SomeSchema`.
 *
 * Conditional dereference means inlining references when `inliningPredicate()` returns `true`. If `inliningPredicate`
 * is not passed only bundling happens.
 */
export function createBundleRefsProcessor(inliningPropName: string): DocumentNodeProcessor {
  return {
    ref(node, resolvedRef, context) {
      if (!resolvedRef.pointer.startsWith('/components')) {
        throw new Error(`$ref pointer must start with "/components"`);
      }

      if (
        hasProp(node, inliningPropName, true) ||
        hasProp(resolvedRef.refNode, inliningPropName, true)
      ) {
        inlineRef(node, resolvedRef);

        delete node[inliningPropName];
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
