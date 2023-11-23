/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OpenAPIV3 } from 'openapi-types';

export type PlainObjectNode = Record<string, unknown>;

export type ArrayNode = unknown[];

export interface RefNode {
  $ref: string;
  [key: string]: unknown;
}

/**
 * An abstract OpenAPI entry node. Content besides $ref isn't important.
 */
export type DocumentNode = PlainObjectNode | ArrayNode | RefNode;

export type Document = OpenAPIV3.Document<Record<string, unknown>>;

export interface ResolvedDocument {
  /**
   * Document's absolute path
   */
  absolutePath: string;
  /**
   * Document's root
   */
  document: Document;
}

export interface ResolvedRef extends ResolvedDocument {
  /**
   * Parsed pointer without leading hash symbol (e.g. `/components/schemas/MySchema`)
   */
  pointer: string;

  /**
   * Resolved ref's node pointer points to
   */
  refNode: DocumentNode;
}

export interface TraverseDocumentContext {
  /**
   * Root document the spec started parsing from
   */
  rootDocument: ResolvedDocument;

  /**
   * Current document. Can be root document or referenced document when followed $ref properties.
   */
  currentDocument: ResolvedDocument | ResolvedRef;
}

export interface TraverseDocumentEntryContext extends TraverseDocumentContext {
  parentNode: DocumentNode;
  parentKey: string | number;
}

export type EntryProcessorFn = (
  node: Readonly<DocumentNode>,
  context: TraverseDocumentEntryContext
) => boolean;

export type LeaveProcessorFn = (node: DocumentNode, context: TraverseDocumentContext) => void;

export type RefProcessorFn = (
  node: RefNode,
  resolvedRef: ResolvedRef,
  context: TraverseDocumentContext
) => void;

/**
 * Document or document node processor gives flexibility in modifying OpenAPI specs and/or collect some metrics.
 * For convenience it defined handlers invoked upon action or specific node type.
 *
 * Currently the following node types supported
 *
 * - ref - Callback function is invoked upon leaving ref node (a node having `$ref` key)
 *
 * and the following actions
 *
 * - enter - Callback function is invoked upon entering any type of node element including ref nodes. It doesn't allow
 *           to modify node's content but provides an ability to remove the element by returning `true`.
 *
 * - leave - Callback function is invoked upon leaving any type of node.  It give an opportunity to modify the document like
 *           dereference refs or remove unwanted properties.
 */
export interface DocumentNodeProcessor {
  enter?: EntryProcessorFn;
  leave?: LeaveProcessorFn;
  ref?: RefProcessorFn;
}
