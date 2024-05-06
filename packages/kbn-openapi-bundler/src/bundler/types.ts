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
 * Should remove processor controls whether a node and all its descendants
 * should be omitted from the further processing and result document.
 *
 * When result is
 *
 * - `true` - omit the node
 * - `false` - keep the node
 *
 */
export type ShouldRemoveNodeProcessorFn = (
  node: Readonly<DocumentNode>,
  context: TraverseDocumentEntryContext
) => boolean;

export type OnNodeEntryProcessorFn = (
  node: Readonly<DocumentNode>,
  context: TraverseDocumentEntryContext
) => void;

export type OnNodeLeaveProcessorFn = (node: DocumentNode, context: TraverseDocumentContext) => void;

export type OnRefNodeLeaveProcessorFn = (
  node: RefNode,
  resolvedRef: ResolvedRef,
  context: TraverseDocumentContext
) => void;

/**
 * OpenAPI tree is traversed in two phases
 *
 * 1. Diving from root to leaves.
 *    Allows to analyze unprocessed nodes and calculate any metrics if necessary.
 *
 * 2. Post order traversal from leaves to root.
 *    Mostly to transform the OpenAPI document.
 *
 * Document or document node processor gives flexibility in modifying OpenAPI specs and/or collect some metrics.
 * For convenience there are following node processors supported
 *
 * 1st phase
 *
 * - `onNodeEnter` - Callback function is invoked at the first phase (diving from root to leaves) while
 *             traversing the document. It can be considered in a similar way events dive in DOM during
 *             capture phase. In the other words it means entering a subtree. It allows to analyze
 *             unprocessed nodes.
 *
 * - `shouldRemove` - Callback function is invoked at the first phase (diving from root to leaves) while
 *             traversing the document. It controls whether the node will be excluded from further processing
 *             and the result document eventually. Returning `true` excluded the node while returning `false`
 *             passes the node untouched.
 *
 * 2nd phase
 *
 * - `onNodeLeave` - Callback function is invoked upon leaving any type of node. It give an opportunity to
 *             modify the document like inline references or remove unwanted properties. It can be considered
 *             in a similar way event bubble in DOM during bubble phase. In the other words it means leaving
 *             a subtree.
 *
 * - `onRefNodeLeave` - Callback function is invoked upon leaving a reference node (a node having `$ref` key)
 *
 */
export interface DocumentNodeProcessor {
  shouldRemove?: ShouldRemoveNodeProcessorFn;
  onNodeEnter?: OnNodeEntryProcessorFn;
  onNodeLeave?: OnNodeLeaveProcessorFn;
  onRefNodeLeave?: OnRefNodeLeaveProcessorFn;
}
