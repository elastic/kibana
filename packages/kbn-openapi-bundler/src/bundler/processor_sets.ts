/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { X_CODEGEN_ENABLED, X_INLINE, X_INTERNAL, X_LABELS, X_MODIFY } from './known_custom_props';
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
import { DocumentNodeProcessor } from './process_document/document_processors/types/document_node_processor';
import { createIncludeLabelsProcessor } from './process_document/document_processors/include_labels';
import { createNamespaceComponentsProcessor } from './process_document/document_processors/namespace_components';

/**
 * Document modification includes the following
 * - skips nodes with `x-internal: true` property
 * - skips paths started with `/internal`
 * - modifies nodes having `x-modify`
 */
export const DEFAULT_BUNDLING_PROCESSORS: Readonly<DocumentNodeProcessor[]> = [
  createSkipNodeWithInternalPropProcessor(X_INTERNAL),
  createSkipInternalPathProcessor('/internal'),
  createModifyPartialProcessor(),
  createModifyRequiredProcessor(),
  createRemovePropsProcessor([X_INLINE, X_MODIFY, X_CODEGEN_ENABLED, X_LABELS]),
  createFlattenFoldedAllOfItemsProcessor(),
  createMergeNonConflictingAllOfItemsProcessor(),
  createUnfoldSingleAllOfItemProcessor(),
];

/**
 * Adds createIncludeLabelsProcessor processor, see createIncludeLabelsProcessor description
 * for more details
 */
export function withIncludeLabelsProcessor(
  processors: Readonly<DocumentNodeProcessor[]>,
  includeLabels: string[]
): Readonly<DocumentNodeProcessor[]> {
  return [...processors, createIncludeLabelsProcessor(includeLabels)];
}

export function withNamespaceComponentsProcessor(
  processors: Readonly<DocumentNodeProcessor[]>,
  namespacePointer: string
): Readonly<DocumentNodeProcessor[]> {
  return [...processors, createNamespaceComponentsProcessor(namespacePointer)];
}
