/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isAbsolute } from 'path';
import { RefResolver } from './ref_resolver';
import { processDocument } from './process_document';
import { createDereferenceConditionallyProcessor } from './document_processors/dereference_conditionally';
import { createSkipNodeWithInternalPropProcessor } from './document_processors/skip_node_with_internal_prop';
import { createModifyPartialProcessor } from './document_processors/modify_partial';
import { createSkipInternalPathProcessor } from './document_processors/skip_internal_path';
import { ResolvedDocument } from './types';
import { createRemovePropsProcessor } from './document_processors/remove_props';
import {
  X_CODEGEN_ENABLED,
  X_INTERNAL,
  X_MODIFY,
} from './document_processors/lib/known_custom_props';
import { createModifyRequiredProcessor } from './document_processors/modify_required';

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
export async function bundleDocument(absoluteDocumentPath: string): Promise<ResolvedDocument> {
  if (!isAbsolute(absoluteDocumentPath)) {
    throw new Error(
      `bundleDocument expects an absolute document path but got "${absoluteDocumentPath}"`
    );
  }

  const refResolver = new RefResolver();
  const resolvedDocument = await refResolver.resolveDocument(absoluteDocumentPath);
  const shareBasePointerInlineRegEx = /Shared|Base/;

  if (!hasPaths(resolvedDocument.document as MaybeObjectWithPaths)) {
    // Specs without paths defined are usually considered as shared. Such specs have `components` defined
    // and referenced by the specs with paths defined. In this case the shared specs have been
    // handled already and must be skipped.
    //
    // An additional case when it's a rogue spec. Rogue specs are skipped as well as they don't contribute
    // to the API endpoints.
    throw new SkipException(resolvedDocument.absolutePath, 'Document has no paths defined');
  }

  await processDocument(resolvedDocument, refResolver, [
    createSkipNodeWithInternalPropProcessor(X_INTERNAL),
    createSkipInternalPathProcessor('/internal'),
    createDereferenceConditionallyProcessor((_, resolvedRef) =>
      shareBasePointerInlineRegEx.test(resolvedRef.pointer)
    ),
    createModifyPartialProcessor(),
    createModifyRequiredProcessor(),
    createRemovePropsProcessor([X_MODIFY, X_CODEGEN_ENABLED]),
  ]);

  // If document.paths were removed by processors skip the document
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
