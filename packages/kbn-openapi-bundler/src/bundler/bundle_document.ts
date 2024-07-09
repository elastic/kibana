/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isAbsolute } from 'path';
import { RefResolver } from './ref_resolver/ref_resolver';
import { processDocument } from './process_document/process_document';
import { X_CODEGEN_ENABLED, X_INLINE, X_INTERNAL, X_LABELS, X_MODIFY } from './known_custom_props';
import { isPlainObjectType } from '../utils/is_plain_object_type';
import { ResolvedDocument } from './ref_resolver/resolved_document';
import { ResolvedRef } from './ref_resolver/resolved_ref';
import { createSkipNodeWithInternalPropProcessor } from './process_document/document_processors/skip_node_with_internal_prop';
import { createSkipInternalPathProcessor } from './process_document/document_processors/skip_internal_path';
import { createModifyPartialProcessor } from './process_document/document_processors/modify_partial';
import { createModifyRequiredProcessor } from './process_document/document_processors/modify_required';
import { createRemovePropsProcessor } from './process_document/document_processors/remove_props';
import {
  createFlattenFoldedAllOfItemsProcessor,
  createMergeNonConflictingAllOfItemsProcessor,
  createUnfoldSingleAllOfItemProcessor,
} from './process_document/document_processors/reduce_all_of_items';
import { createIncludeLabelsProcessor } from './process_document/document_processors/include_labels';
import { BundleRefProcessor } from './process_document/document_processors/bundle_refs';
import { RemoveUnusedComponentsProcessor } from './process_document/document_processors/remove_unused_components';

export class SkipException extends Error {
  constructor(public documentPath: string, message: string) {
    super(message);
  }
}

export interface BundledDocument extends ResolvedDocument {
  bundledRefs: ResolvedRef[];
}

interface BundleDocumentOptions {
  includeLabels?: string[];
}

/**
 * Bundles document into one file and performs appropriate document modifications.
 *
 * Bundling assumes external references defined via `$ref` are included into the result document.
 * Some of the references get inlined.
 *
 * Document modification includes the following
 * - skips nodes with `x-internal: true` property
 * - skips paths started with `/internal`
 * - modifies nodes having `x-modify`
 *
 * @param absoluteDocumentPath document's absolute path
 * @returns bundled document
 */
export async function bundleDocument(
  absoluteDocumentPath: string,
  options?: BundleDocumentOptions
): Promise<BundledDocument> {
  if (!isAbsolute(absoluteDocumentPath)) {
    throw new Error(
      `bundleDocument expects an absolute document path but got "${absoluteDocumentPath}"`
    );
  }

  const refResolver = new RefResolver();
  const resolvedDocument = await refResolver.resolveDocument(absoluteDocumentPath);

  if (!hasPaths(resolvedDocument.document as MaybeObjectWithPaths)) {
    // Specs without paths defined are usually considered as shared. Such specs have `components` defined
    // and referenced by the specs with paths defined. In this case the shared specs have been
    // handled already and must be skipped.
    //
    // An additional case when it's a rogue spec. Rogue specs are skipped as well as they don't contribute
    // to the API endpoints.
    throw new SkipException(resolvedDocument.absolutePath, 'Document has no paths defined');
  }

  const defaultProcessors = [
    createSkipNodeWithInternalPropProcessor(X_INTERNAL),
    createSkipInternalPathProcessor('/internal'),
    createModifyPartialProcessor(),
    createModifyRequiredProcessor(),
    createRemovePropsProcessor([X_INLINE, X_MODIFY, X_CODEGEN_ENABLED, X_LABELS]),
    createFlattenFoldedAllOfItemsProcessor(),
    createMergeNonConflictingAllOfItemsProcessor(),
    createUnfoldSingleAllOfItemProcessor(),
  ];

  if (options?.includeLabels) {
    defaultProcessors.push(createIncludeLabelsProcessor(options?.includeLabels));
  }

  const bundleRefsProcessor = new BundleRefProcessor(X_INLINE);
  const removeUnusedComponentsProcessor = new RemoveUnusedComponentsProcessor();

  await processDocument(resolvedDocument, refResolver, [
    ...defaultProcessors,
    bundleRefsProcessor,
    removeUnusedComponentsProcessor,
  ]);

  if (isPlainObjectType(resolvedDocument.document.components)) {
    removeUnusedComponentsProcessor.removeUnusedComponents(resolvedDocument.document.components);
  }

  // If document.paths was removed by processors skip the document
  if (!hasPaths(resolvedDocument.document as MaybeObjectWithPaths)) {
    throw new SkipException(
      resolvedDocument.absolutePath,
      'Document has no paths after processing the document'
    );
  }

  return { ...resolvedDocument, bundledRefs: Array.from(bundleRefsProcessor.getBundledRefs()) };
}

interface MaybeObjectWithPaths {
  paths?: unknown;
}

function hasPaths(document: MaybeObjectWithPaths): boolean {
  return (
    typeof document.paths === 'object' &&
    document.paths !== null &&
    Object.keys(document.paths).length > 0
  );
}
