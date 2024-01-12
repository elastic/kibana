/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * A plain object node not containing `$ref` property
 */
export type PlainObjectNode = Record<string, unknown>;

/**
 * An array node
 */
export type ArrayNode = unknown[];

/**
 * A ref node containing `$ref` property besides the others
 */
export interface RefNode extends PlainObjectNode {
  $ref: string;
}

/**
 * An abstract OpenAPI entry node. Content besides $ref isn't important.
 */
export type DocumentNode = PlainObjectNode | ArrayNode | RefNode;

/**
 * Document abstraction. We don't mind OpenAPI `3.0` and `3.1` differences.
 */
export type Document = Record<string, unknown>;

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

export type TraverseDocumentEntryContext = TraverseDocumentContext & {
  parentNode: DocumentNode;
  parentKey: string | number;
};

/**
 * Entry processor controls when a node should be omitted from the result document.
 *
 * When result is `true` - omit the node.
 */
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
