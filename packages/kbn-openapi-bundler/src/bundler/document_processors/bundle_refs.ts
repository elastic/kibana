/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Document, ResolvedRef, TraverseDocumentContext, RefNode, DocumentNode } from '../types';
import { hasProp } from '../../utils/has_prop';
import { isChildContext } from '../is_child_context';
import { insertRefByPointer } from '../../utils/insert_by_json_pointer';
import { inlineRef } from './utils/inline_ref';

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
  private refs = new Map<string, ResolvedRef>();
  private nodesToInline = new Set<Readonly<DocumentNode>>();

  constructor(private inliningPropName: string) {}

  enter(node: Readonly<DocumentNode>): boolean {
    if (hasProp(node, this.inliningPropName, true)) {
      this.nodesToInline.add(node);
    }

    return false;
  }

  ref(node: RefNode, resolvedRef: ResolvedRef, context: TraverseDocumentContext): void {
    if (!resolvedRef.pointer.startsWith('/components/schemas')) {
      throw new Error(`$ref pointer must start with "/components/schemas"`);
    }

    if (this.nodesToInline.has(node) || this.nodesToInline.has(resolvedRef.refNode)) {
      inlineRef(node, resolvedRef);
    } else {
      const rootDocument = this.extractRootDocument(context);

      if (!rootDocument.components) {
        rootDocument.components = {};
      }

      node.$ref = this.saveComponent(
        resolvedRef,
        rootDocument.components as Record<string, unknown>
      );

      const refKey = `${resolvedRef.absolutePath}#${resolvedRef.pointer}`;

      if (!this.refs.has(refKey)) {
        this.refs.set(refKey, resolvedRef);
      }
    }
  }

  getBundledRefs(): IterableIterator<ResolvedRef> {
    return this.refs.values();
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
