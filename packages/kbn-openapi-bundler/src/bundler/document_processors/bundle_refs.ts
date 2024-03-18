/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Document, ResolvedRef, TraverseDocumentContext, RefNode } from '../types';
import { hasProp } from '../../utils/has_prop';
import { isChildContext } from '../is_child_context';
import { inlineRef } from './utils/inline_ref';
import { insertRefByPointer } from '../../utils/insert_by_json_pointer';

/**
 * Node processor to bundle and conditionally dereference document references.
 *
 * Bundling means all external references like `../../some_file.schema.yaml#/components/schemas/SomeSchema` saved
 * to the result document under corresponding path `components` -> `schemas` -> `SomeSchema` and `$ref` property's
 * values is updated to `#/components/schemas/SomeSchema`.
 *
 * Conditional dereference means inlining references when `inliningPredicate()` returns `true`. If `inliningPredicate`
 * is not passed only bundling happens.
 */
export class BundleRefProcessor {
  private refs: ResolvedRef[] = [];

  constructor(private inliningPropName: string) {}

  ref(node: RefNode, resolvedRef: ResolvedRef, context: TraverseDocumentContext): void {
    if (!resolvedRef.pointer.startsWith('/components/schemas')) {
      throw new Error(`$ref pointer must start with "/components/schemas"`);
    }

    if (
      hasProp(node, this.inliningPropName, true) ||
      hasProp(resolvedRef.refNode, this.inliningPropName, true)
    ) {
      inlineRef(node, resolvedRef);

      delete node[this.inliningPropName];
    } else {
      const rootDocument = this.extractRootDocument(context);

      if (!rootDocument.components) {
        rootDocument.components = {};
      }

      node.$ref = this.saveComponent(
        resolvedRef,
        rootDocument.components as Record<string, unknown>
      );
      this.refs.push(resolvedRef);
    }
  }

  getBundledRefs(): ResolvedRef[] {
    return this.refs;
  }

  private saveComponent(ref: ResolvedRef, components: Record<string, unknown>): string {
    insertRefByPointer(ref.pointer, ref.refNode, components);

    return `#${ref.pointer}`;
  }

  private extractRootDocument(context: TraverseDocumentContext): Document {
    while (isChildContext(context)) {
      context = context.parentContext;
    }

    return context.resolvedDocument.document;
  }
}
