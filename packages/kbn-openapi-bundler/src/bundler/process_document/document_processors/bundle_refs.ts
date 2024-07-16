/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import deepEqual from 'fast-deep-equal';
import chalk from 'chalk';
import { hasProp } from '../../../utils/has_prop';
import { isChildContext } from '../is_child_context';
import { insertRefByPointer } from '../../../utils/insert_by_json_pointer';
import { inlineRef } from './utils/inline_ref';
import { ResolvedRef } from '../../ref_resolver/resolved_ref';
import { Document } from '../../document';
import { DocumentNode, RefNode } from '../types/node';
import { TraverseDocumentContext, TraverseRootDocumentContext } from '../types/context';
import { DocumentNodeProcessor } from './types/document_node_processor';
import { TraverseDocumentNodeContext } from './types/traverse_document_node_context';

/**
 * Node processor to bundle and conditionally dereference document references.
 *
 * Bundling means all external references like `../../some_file.schema.yaml#/components/schemas/SomeSchema` saved
 * to the result document under corresponding path `components` -> `schemas` -> `SomeSchema` and `$ref` property's
 * values are updated to be local e.g. `#/components/schemas/SomeSchema`.
 *
 * Some references get inlined based on a condition (conditional dereference). It's controlled by inlining
 * property whose value should be `true`. `inliningPropName` specifies inlining property name e.g. `x-inline`.
 * Nodes having `x-inline: true` will be inlined.
 */
export class BundleRefProcessor implements DocumentNodeProcessor {
  private refs = new Map<string, ResolvedRef>();
  private nodesToInline = new Set<Readonly<DocumentNode>>();

  constructor(private inliningPropName: string) {}

  onNodeEnter(node: Readonly<DocumentNode>): void {
    if (hasProp(node, this.inliningPropName, true)) {
      this.nodesToInline.add(node);
    }
  }

  onRefNodeLeave(
    node: RefNode,
    resolvedRef: ResolvedRef,
    context: TraverseDocumentNodeContext
  ): void {
    if (!resolvedRef.pointer.startsWith('/components')) {
      throw new Error(
        `$ref pointer ${chalk.yellow(
          resolvedRef.pointer
        )} must start with "/components" at ${chalk.bold(resolvedRef.absolutePath)}`
      );
    }

    if (this.nodesToInline.has(node) || this.nodesToInline.has(resolvedRef.refNode)) {
      inlineRef(node, resolvedRef);
    } else {
      const rootDocument = this.extractRootDocument(context);

      if (!rootDocument.components) {
        rootDocument.components = {};
      }

      const ref = this.refs.get(resolvedRef.pointer);

      if (ref && !deepEqual(ref.refNode, resolvedRef.refNode)) {
        const documentAbsolutePath =
          this.extractParentContext(context).resolvedDocument.absolutePath;

        throw new Error(
          `❌  Unable to bundle ${chalk.bold(
            documentAbsolutePath
          )} due to conflicts in references. Schema ${chalk.yellow(
            ref.pointer
          )} is defined in ${chalk.blue(ref.absolutePath)} and in ${chalk.magenta(
            resolvedRef.absolutePath
          )} but has not matching definitions.`
        );
      }

      node.$ref = this.saveComponent(
        resolvedRef,
        rootDocument.components as Record<string, unknown>
      );

      this.refs.set(resolvedRef.pointer, resolvedRef);
    }
  }

  getBundledRefs(): IterableIterator<ResolvedRef> {
    return this.refs.values();
  }

  private saveComponent(ref: ResolvedRef, components: Record<string, unknown>): string {
    insertRefByPointer(ref.pointer, ref.refNode, components);

    return `#${ref.pointer}`;
  }

  private extractParentContext(context: TraverseDocumentContext): TraverseRootDocumentContext {
    while (isChildContext(context)) {
      context = context.parentContext;
    }

    return context;
  }

  private extractRootDocument(context: TraverseDocumentContext): Document {
    return this.extractParentContext(context).resolvedDocument.document;
  }
}
