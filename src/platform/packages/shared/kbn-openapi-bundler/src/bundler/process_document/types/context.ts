/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ResolvedDocument } from '../../ref_resolver/resolved_document';
import { ResolvedRef } from '../../ref_resolver/resolved_ref';

export interface TraverseRootDocumentContext {
  /**
   * Root document
   */
  resolvedDocument: ResolvedDocument;

  parentContext?: undefined;
  followedRef?: undefined;
}

export interface TraverseChildDocumentContext {
  /**
   * Current document after resolving $ref property
   */
  resolvedRef: ResolvedRef;

  /**
   * Context of the parent document the current one in `document` field was referenced via $ref. Empty if it's the root document.
   */
  parentContext: TraverseDocumentContext;

  /**
   * Reference used to resolve the current document
   */
  followedRef: string;
}

/**
 * Traverse context storing additional information related to the currently traversed node
 */
export type TraverseDocumentContext = TraverseRootDocumentContext | TraverseChildDocumentContext;
