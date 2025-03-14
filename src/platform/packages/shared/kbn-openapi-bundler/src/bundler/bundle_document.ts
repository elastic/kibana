/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isAbsolute } from 'path';
import { RefResolver } from './ref_resolver/ref_resolver';
import { processDocument } from './process_document/process_document';
import { X_INLINE } from './known_custom_props';
import { isPlainObjectType } from '../utils/is_plain_object_type';
import { ResolvedDocument } from './ref_resolver/resolved_document';
import { BundleRefProcessor } from './process_document/document_processors/bundle_refs';
import { RemoveUnusedComponentsProcessor } from './process_document/document_processors/remove_unused_components';
import { DocumentNodeProcessor } from './process_document/document_processors/types/document_node_processor';

export class SkipException extends Error {
  constructor(public documentPath: string, message: string) {
    super(message);
  }
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
  processors: Readonly<DocumentNodeProcessor[]> = []
): Promise<ResolvedDocument> {
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

  const bundleRefsProcessor = new BundleRefProcessor(X_INLINE);
  const removeUnusedComponentsProcessor = new RemoveUnusedComponentsProcessor();

  await processDocument(resolvedDocument, refResolver, [
    ...processors,
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

  return resolvedDocument;
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
